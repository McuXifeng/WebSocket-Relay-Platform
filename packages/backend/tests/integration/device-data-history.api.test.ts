/**
 * 设备历史数据查询API集成测试
 * 测试 GET /api/visualization/endpoints/:endpointId/devices/:deviceId/data/history
 */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('GET /api/visualization/endpoints/:endpointId/devices/:deviceId/data/history', () => {
  const TEST_USER_ID = 'test-user-history-api';
  const TEST_OTHER_USER_ID = 'test-other-user-history';
  const TEST_ENDPOINT_ID = 'test-endpoint-history-api';
  const TEST_DEVICE_ID = 'test-device-history-api';
  let authToken: string;
  let otherUserToken: string;

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-history-api',
        email: 'testhistoryapi@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建另一个用户（用于权限验证测试）
    await prisma.user.deleteMany({ where: { id: TEST_OTHER_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_OTHER_USER_ID,
        username: 'otheruser-history',
        email: 'otherhistory@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 生成JWT Token
    authToken = jwt.sign(
      { userId: TEST_USER_ID, username: 'testuser-history-api', isAdmin: false },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    otherUserToken = jwt.sign(
      { userId: TEST_OTHER_USER_ID, username: 'otheruser-history', isAdmin: false },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // 创建测试端点
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID,
        endpoint_id: 'ep-hist-001',
        name: 'Test Endpoint for History',
        user_id: TEST_USER_ID,
      },
    });

    // 创建测试设备
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: 'device-history-123',
        custom_name: 'Test Device',
      },
    });
  });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.deviceData.deleteMany({
      where: { device_id: TEST_DEVICE_ID },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.deviceData.deleteMany({
      where: { device_id: TEST_DEVICE_ID },
    });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_OTHER_USER_ID } });
    await prisma.$disconnect();
  });

  describe('成功场景', () => {
    beforeEach(async () => {
      // 插入测试数据（2小时范围，每10分钟一条）
      const startTime = new Date('2025-10-29T10:00:00Z');
      const testData = [];
      for (let i = 0; i <= 12; i++) {
        const timestamp = new Date(startTime.getTime() + i * 10 * 60 * 1000);
        testData.push({
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          data_value: (25 + i * 0.5).toString(),
          data_type: 'number',
          unit: '°C',
          timestamp,
        });
      }
      await prisma.deviceData.createMany({ data: testData });
    });

    it('应该成功返回历史数据（无聚合）', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.deviceId).toBe(TEST_DEVICE_ID);
      expect(response.body.dataKey).toBe('temperature');
      expect(response.body.records).toHaveLength(13);
      expect(response.body.records[0].value).toBe(25.0);
      expect(response.body.records[12].value).toBe(31.0);
    });

    it('应该正确应用时间范围过滤', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:30:00Z',
          endTime: '2025-10-29T11:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.records.length).toBeGreaterThan(0);
      expect(response.body.records.length).toBeLessThanOrEqual(4); // 30分钟内约3-4条数据
    });

    it('应该正确应用聚合参数（按分钟聚合）', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
          aggregation: 'minute',
        });

      expect(response.status).toBe(200);
      expect(response.body.aggregation).toBe('minute');
      expect(response.body.records.length).toBeGreaterThan(0);
      // 验证聚合数据包含count字段
      response.body.records.forEach((record: { count?: number }) => {
        expect(record.count).toBeDefined();
      });
    });

    it('应该正确应用聚合参数（按小时聚合）', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
          aggregation: 'hour',
        });

      expect(response.status).toBe(200);
      expect(response.body.aggregation).toBe('hour');
      expect(response.body.records.length).toBeGreaterThan(0);
      expect(response.body.records.length).toBeLessThanOrEqual(3);
    });

    it('应该正确应用聚合参数（按天聚合）', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
          aggregation: 'day',
        });

      expect(response.status).toBe(200);
      expect(response.body.aggregation).toBe('day');
      expect(response.body.records).toHaveLength(1); // 同一天聚合为1条
      expect(response.body.records[0].count).toBe(13);
    });

    it('应该正确应用limit参数', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
          limit: 5,
        });

      expect(response.status).toBe(200);
      expect(response.body.records.length).toBeLessThanOrEqual(5);
    });

    it('处理无数据情况（返回空数组）', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'non-existent-key',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.records).toEqual([]);
    });
  });

  describe('权限验证', () => {
    it('未登录用户应该返回401错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(401);
    });

    it('其他用户不能查询不属于自己的端点数据', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${otherUserToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('参数验证', () => {
    it('缺少dataKey参数应该返回400错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('缺少startTime参数应该返回400错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('缺少endTime参数应该返回400错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('无效的aggregation参数应该返回400错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
          aggregation: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('无效的时间格式应该返回400错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: 'invalid-date',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('资源不存在', () => {
    it('端点不存在应该返回404错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/non-existent-endpoint/devices/${TEST_DEVICE_ID}/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(404);
    });

    it('设备不存在应该返回404错误', async () => {
      const response = await request(app)
        .get(
          `/api/visualization/endpoints/${TEST_ENDPOINT_ID}/devices/non-existent-device/data/history`
        )
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dataKey: 'temperature',
          startTime: '2025-10-29T10:00:00Z',
          endTime: '2025-10-29T12:00:00Z',
        });

      expect(response.status).toBe(404);
    });
  });
});
