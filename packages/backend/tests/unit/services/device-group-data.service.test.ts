/**
 * Device Group Data Service Unit Tests
 * 测试设备分组数据聚合服务
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as deviceGroupDataService from '../../../src/services/device-group-data.service';
import { AppError } from '../../../src/middleware/error-handler.middleware';

const prisma = new PrismaClient();

describe('DeviceGroupDataService', () => {
  let testUserId: string;
  let testEndpointId: string;
  let testGroupId: string;
  let testDeviceIds: string[] = [];

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: `test_user_${Date.now()}`,
        password_hash: 'test_hash',
        email: `test_${Date.now()}@example.com`,
        is_admin: false,
      },
    });
    testUserId = user.id;

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: nanoid(12),
        user_id: testUserId,
        name: 'Test Endpoint',
      },
    });
    testEndpointId = endpoint.id;

    // 创建测试设备
    for (let i = 0; i < 3; i++) {
      const device = await prisma.device.create({
        data: {
          endpoint_id: testEndpointId,
          device_id: `test_device_${Date.now()}_${i}`,
          custom_name: `Test Device ${i}`,
        },
      });
      testDeviceIds.push(device.id);

      // 为每个设备创建测试数据
      await prisma.deviceData.create({
        data: {
          device_id: device.id,
          data_key: 'temperature',
          data_value: String(20 + i * 5), // 20, 25, 30
          data_type: 'number',
          unit: '°C',
          timestamp: new Date(),
        },
      });

      await prisma.deviceData.create({
        data: {
          device_id: device.id,
          data_key: 'humidity',
          data_value: String(50 + i * 10), // 50, 60, 70
          data_type: 'number',
          unit: '%',
          timestamp: new Date(),
        },
      });
    }

    // 创建测试设备分组
    const group = await prisma.deviceGroup.create({
      data: {
        user_id: testUserId,
        endpoint_id: testEndpointId,
        group_name: 'Test Data Group',
        description: 'Test group for data aggregation',
      },
    });
    testGroupId = group.id;

    // 添加设备到分组
    await prisma.deviceGroupMember.createMany({
      data: testDeviceIds.map((deviceId) => ({
        group_id: testGroupId,
        device_id: deviceId,
      })),
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.deviceData.deleteMany({
      where: { device_id: { in: testDeviceIds } },
    });
    await prisma.deviceGroupMember.deleteMany({
      where: { group_id: testGroupId },
    });
    await prisma.deviceGroup.deleteMany({
      where: { id: testGroupId },
    });
    await prisma.device.deleteMany({
      where: { id: { in: testDeviceIds } },
    });
    await prisma.endpoint.deleteMany({
      where: { id: testEndpointId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    await prisma.$disconnect();
  });

  describe('getGroupDataAggregation', () => {
    it('应该成功获取分组数据聚合', async () => {
      const result = await deviceGroupDataService.getGroupDataAggregation(testGroupId, testUserId);

      expect(result).toBeDefined();
      expect(result.group_id).toBe(testGroupId);
      expect(result.device_count).toBe(3);
      expect(result.aggregations).toBeInstanceOf(Array);
      expect(result.aggregations.length).toBeGreaterThan(0);

      // 验证聚合数据结构
      const tempAgg = result.aggregations.find((a: any) => a.data_key === 'temperature');
      expect(tempAgg).toBeDefined();
      expect(tempAgg.unit).toBe('°C');
      expect(tempAgg.average).toBeCloseTo(25, 0); // (20 + 25 + 30) / 3 = 25
      expect(tempAgg.max).toBe(30);
      expect(tempAgg.min).toBe(20);
      expect(tempAgg.sample_count).toBe(3);

      const humidAgg = result.aggregations.find((a: any) => a.data_key === 'humidity');
      expect(humidAgg).toBeDefined();
      expect(humidAgg.unit).toBe('%');
      expect(humidAgg.average).toBeCloseTo(60, 0); // (50 + 60 + 70) / 3 = 60
      expect(humidAgg.max).toBe(70);
      expect(humidAgg.min).toBe(50);
    });

    it('应该拒绝无权限访问的分组', async () => {
      const otherUser = await prisma.user.create({
        data: {
          username: `other_user_${Date.now()}`,
          password_hash: 'test_hash',
          email: `other_${Date.now()}@example.com`,
          is_admin: false,
        },
      });

      await expect(
        deviceGroupDataService.getGroupDataAggregation(testGroupId, otherUser.id)
      ).rejects.toThrow(AppError);

      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('应该拒绝不存在的分组', async () => {
      await expect(
        deviceGroupDataService.getGroupDataAggregation('nonexistent-group-id', testUserId)
      ).rejects.toThrow(AppError);
    });

    it('应该返回空聚合结果（分组无设备）', async () => {
      // 创建空分组
      const emptyGroup = await prisma.deviceGroup.create({
        data: {
          user_id: testUserId,
          endpoint_id: testEndpointId,
          group_name: 'Empty Group',
        },
      });

      const result = await deviceGroupDataService.getGroupDataAggregation(
        emptyGroup.id,
        testUserId
      );

      expect(result.group_id).toBe(emptyGroup.id);
      expect(result.device_count).toBe(0);
      expect(result.aggregations).toEqual([]);

      // 清理
      await prisma.deviceGroup.delete({ where: { id: emptyGroup.id } });
    });

    it('应该使用缓存（两次调用返回相同结果）', async () => {
      const result1 = await deviceGroupDataService.getGroupDataAggregation(testGroupId, testUserId);

      const result2 = await deviceGroupDataService.getGroupDataAggregation(testGroupId, testUserId);

      // 缓存的结果应该相同
      expect(result1.last_update).toBe(result2.last_update);
    });
  });
});
