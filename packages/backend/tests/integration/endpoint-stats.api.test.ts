/**
 * Endpoint Stats API 集成测试
 * 测试端点统计数据查询 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('GET /api/endpoints/:id/stats', () => {
  let authToken: string;
  let userId: string;
  let otherUserId: string;
  let testEndpointId: string;
  let otherUserEndpointId: string;

  beforeAll(async () => {
    // 创建测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'stats_testuser',
        email: 'stats_test@example.com',
        password_hash: 'hashed-password',
      },
    });
    userId = user.id;

    authToken = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 创建另一个用户测试权限验证
    const otherUser = await prisma.user.create({
      data: {
        username: 'stats_otheruser',
        email: 'stats_other@example.com',
        password_hash: 'hashed-password',
      },
    });
    otherUserId = otherUser.id;

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'test-ep-01',
        name: '统计测试端点',
        user_id: userId,
      },
    });
    testEndpointId = endpoint.id;

    // 创建另一个用户的端点
    const otherEndpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'test-ep-02',
        name: '其他用户端点',
        user_id: otherUserId,
      },
    });
    otherUserEndpointId = otherEndpoint.id;
  });

  afterEach(async () => {
    // 清理测试统计数据
    await prisma.endpointStats.deleteMany({
      where: {
        endpoint_id: {
          in: [testEndpointId, otherUserEndpointId],
        },
      },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.endpointStats.deleteMany({
      where: {
        endpoint_id: {
          in: [testEndpointId, otherUserEndpointId],
        },
      },
    });
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.endpoint.deleteMany({ where: { user_id: otherUserId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.user.delete({ where: { id: otherUserId } });
    await prisma.$disconnect();
  });

  describe('成功获取统计数据场景', () => {
    it('应该成功返回有统计数据的端点', async () => {
      // 创建统计数据
      await prisma.endpointStats.create({
        data: {
          endpoint_id: testEndpointId,
          current_connections: 2,
          total_connections: 15,
          total_messages: 48,
        },
      });

      // 更新端点的 last_active_at
      const lastActiveAt = new Date('2025-10-28T08:45:30.000Z');
      await prisma.endpoint.update({
        where: { id: testEndpointId },
        data: { last_active_at: lastActiveAt },
      });

      const response = await request(app)
        .get(`/api/endpoints/${testEndpointId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({
        current_connections: 2,
        total_connections: 15,
        total_messages: 48,
        last_active_at: lastActiveAt.toISOString(),
      });
    });

    it('应该在统计记录不存在时返回默认值', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${testEndpointId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toEqual({
        current_connections: 0,
        total_connections: 0,
        total_messages: 0,
        last_active_at: null,
      });
    });
  });

  describe('错误处理场景', () => {
    it('应该在未认证时返回 401', async () => {
      const response = await request(app).get(`/api/endpoints/${testEndpointId}/stats`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('应该在无权访问时返回 403', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${otherUserEndpointId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('应该在端点不存在时返回 404', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/endpoints/${nonExistentId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });
  });
});
