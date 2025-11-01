/**
 * Device Data API 集成测试
 * 测试设备数据查询 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('Device Data API Tests', () => {
  let authToken: string;
  let userId: string;
  let endpointId: string;
  let deviceId: string;

  // 第二个用户用于权限测试
  let otherUserToken: string;
  let otherUserId: string;
  let otherEndpointId: string;
  let otherDeviceId: string;

  beforeAll(async () => {
    // 清理可能存在的旧测试数据
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ['device_data_testuser', 'device_data_otheruser'],
        },
      },
    });

    // 创建第一个测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'device_data_testuser',
        email: 'device_data_test@example.com',
        password_hash: 'hashed-password',
      },
    });
    userId = user.id;

    // 生成 JWT Token
    authToken = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 创建第二个测试用户（用于权限测试）
    const otherUser = await prisma.user.create({
      data: {
        username: 'device_data_otheruser',
        email: 'device_data_other@example.com',
        password_hash: 'hashed-password',
      },
    });
    otherUserId = otherUser.id;

    otherUserToken = jwt.sign(
      { userId: otherUser.id, username: otherUser.username, isAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'devdata01',
        name: 'Device Data Test Endpoint',
        user_id: userId,
      },
    });
    endpointId = endpoint.id;

    // 创建测试设备
    const device = await prisma.device.create({
      data: {
        endpoint_id: endpointId,
        device_id: 'dev-data-1',
        custom_name: 'Test Device for Data',
      },
    });
    deviceId = device.id;

    // 创建其他用户的测试端点和设备
    const otherEndpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'devdata02',
        name: 'Other User Endpoint',
        user_id: otherUserId,
      },
    });
    otherEndpointId = otherEndpoint.id;

    const otherDevice = await prisma.device.create({
      data: {
        endpoint_id: otherEndpointId,
        device_id: 'dev-data-2',
        custom_name: 'Other User Device',
      },
    });
    otherDeviceId = otherDevice.id;

    // 创建测试设备数据
    await prisma.deviceData.createMany({
      data: [
        // 温度数据（有多条记录）
        {
          device_id: deviceId,
          data_key: 'temperature',
          data_value: '24.0',
          data_type: 'number',
          unit: '°C',
          timestamp: new Date('2025-10-29T10:00:00Z'),
        },
        {
          device_id: deviceId,
          data_key: 'temperature',
          data_value: '25.5',
          data_type: 'number',
          unit: '°C',
          timestamp: new Date('2025-10-29T10:05:00Z'),
        },
        // 湿度数据
        {
          device_id: deviceId,
          data_key: 'humidity',
          data_value: '60',
          data_type: 'number',
          unit: '%',
          timestamp: new Date('2025-10-29T10:05:00Z'),
        },
        // 状态数据（字符串类型）
        {
          device_id: deviceId,
          data_key: 'status',
          data_value: 'online',
          data_type: 'string',
          unit: null,
          timestamp: new Date('2025-10-29T10:05:00Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    if (deviceId) {
      await prisma.deviceData.deleteMany({ where: { device_id: deviceId } });
      await prisma.device.deleteMany({ where: { id: deviceId } });
    }
    if (otherDeviceId) {
      await prisma.deviceData.deleteMany({
        where: { device_id: otherDeviceId },
      });
      await prisma.device.deleteMany({ where: { id: otherDeviceId } });
    }
    if (endpointId) {
      await prisma.endpoint.deleteMany({ where: { id: endpointId } });
    }
    if (otherEndpointId) {
      await prisma.endpoint.deleteMany({ where: { id: otherEndpointId } });
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => {
        // Ignore error if already deleted
      });
    }
    if (otherUserId) {
      await prisma.user.delete({ where: { id: otherUserId } }).catch(() => {
        // Ignore error if already deleted
      });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/endpoints/:endpointId/devices/:deviceId/data', () => {
    it('应该返回设备最新数据', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/${deviceId}/data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deviceId');
      expect(response.body).toHaveProperty('deviceName');
      expect(response.body).toHaveProperty('lastUpdate');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // 验证返回的数据字段
      const dataKeys = response.body.data.map((item: any) => item.key);
      expect(dataKeys).toContain('temperature');
      expect(dataKeys).toContain('humidity');
      expect(dataKeys).toContain('status');

      // 验证温度数据是最新的值（25.5而不是24.0）
      const tempData = response.body.data.find((item: any) => item.key === 'temperature');
      expect(tempData.value).toBe(25.5);
      expect(tempData.type).toBe('number');
      expect(tempData.unit).toBe('°C');
      expect(tempData).toHaveProperty('timestamp');
    });

    it('应该返回正确的数据类型', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/${deviceId}/data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const humidityData = response.body.data.find((item: any) => item.key === 'humidity');
      expect(humidityData.value).toBe(60);
      expect(humidityData.type).toBe('number');

      const statusData = response.body.data.find((item: any) => item.key === 'status');
      expect(statusData.value).toBe('online');
      expect(statusData.type).toBe('string');
    });

    it('应该验证端点权限（用户只能查询自己端点下的设备数据）', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/${deviceId}/data`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在端点不存在时返回404', async () => {
      const response = await request(app)
        .get(`/api/endpoints/non-existent-endpoint/devices/${deviceId}/data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在设备不存在时返回404', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/non-existent-device/data`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在未授权时返回401', async () => {
      const response = await request(app).get(
        `/api/endpoints/${endpointId}/devices/${deviceId}/data`
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/endpoints/:endpointId/devices/:deviceId/data-keys', () => {
    it('应该返回设备可用数据字段列表', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/${deviceId}/data-keys`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deviceId');
      expect(response.body).toHaveProperty('dataKeys');
      expect(Array.isArray(response.body.dataKeys)).toBe(true);
      expect(response.body.dataKeys).toHaveLength(3);

      // 验证返回的字段
      const keys = response.body.dataKeys.map((item: any) => item.key);
      expect(keys).toContain('temperature');
      expect(keys).toContain('humidity');
      expect(keys).toContain('status');
    }, 10000);

    it('应该返回字段的类型和单位信息', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/${deviceId}/data-keys`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const tempKey = response.body.dataKeys.find((item: any) => item.key === 'temperature');
      expect(tempKey.type).toBe('number');
      expect(tempKey.unit).toBe('°C');
      expect(tempKey).toHaveProperty('lastSeen');

      const statusKey = response.body.dataKeys.find((item: any) => item.key === 'status');
      expect(statusKey.type).toBe('string');
      expect(statusKey.unit).toBeNull();
    });

    it('应该验证端点和设备权限', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/${deviceId}/data-keys`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在端点不存在时返回404', async () => {
      const response = await request(app)
        .get(`/api/endpoints/non-existent-endpoint/devices/${deviceId}/data-keys`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在设备不存在时返回404', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}/devices/non-existent-device/data-keys`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('应该在未授权时返回401', async () => {
      const response = await request(app).get(
        `/api/endpoints/${endpointId}/devices/${deviceId}/data-keys`
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
