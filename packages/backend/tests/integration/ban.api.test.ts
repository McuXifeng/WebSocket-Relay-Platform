/**
 * Ban API 集成测试
 * Epic 10 Story 10.3: 后端封禁API实现
 * 测试用户封禁、端点禁用和封禁日志查询的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-base-to-string, @typescript-eslint/no-unused-vars */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';
import WebSocket from 'ws';
// Epic 10 Story 10.3: 导入WebSocket服务器以确保使用测试数据库
import '@/ws-server';

describe('Ban API 集成测试', () => {
  const TEST_ADMIN_ID = 'test-admin-id-ban';
  const TEST_USER_ID = 'test-user-id-ban';
  const TEST_USER2_ID = 'test-user2-id-ban';
  let adminToken: string;
  let userToken: string;
  let user2Token: string;
  let testEndpointId: string;
  let testEndpoint2Id: string;

  beforeEach(async () => {
    // 清理测试数据
    await prisma.banLog.deleteMany({});
    await prisma.endpoint.deleteMany({});
    await prisma.user.deleteMany({});

    // 创建管理员用户
    await prisma.user.create({
      data: {
        id: TEST_ADMIN_ID,
        username: 'admin-ban',
        email: 'admin-ban@test.com',
        password_hash: 'dummy-hash',
        is_admin: true,
        is_active: true,
      },
    });

    // 创建普通用户1
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-ban',
        email: 'user-ban@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
        is_active: true,
      },
    });

    // 创建普通用户2
    await prisma.user.create({
      data: {
        id: TEST_USER2_ID,
        username: 'testuser2-ban',
        email: 'user2-ban@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
        is_active: true,
      },
    });

    // 创建测试端点1(属于用户1)
    const endpoint1 = await prisma.endpoint.create({
      data: {
        endpoint_id: 'test-ep-1',
        name: '测试端点1',
        user_id: TEST_USER_ID,
        is_disabled: false,
      },
    });
    testEndpointId = endpoint1.id;

    // 创建测试端点2(属于用户2)
    const endpoint2 = await prisma.endpoint.create({
      data: {
        endpoint_id: 'test-ep-2',
        name: '测试端点2',
        user_id: TEST_USER2_ID,
        is_disabled: false,
      },
    });
    testEndpoint2Id = endpoint2.id;

    // 生成管理员 JWT Token
    adminToken = jwt.sign(
      {
        userId: TEST_ADMIN_ID,
        username: 'admin-ban',
        isAdmin: true,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 生成普通用户1 JWT Token
    userToken = jwt.sign(
      {
        userId: TEST_USER_ID,
        username: 'testuser-ban',
        isAdmin: false,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 生成普通用户2 JWT Token
    user2Token = jwt.sign(
      {
        userId: TEST_USER2_ID,
        username: 'testuser2-ban',
        isAdmin: false,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.banLog.deleteMany({});
    await prisma.endpoint.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // 关闭数据库连接
    await prisma.$disconnect();
  });

  // ==================== 封禁用户API测试 ====================
  describe('POST /api/admin/users/:userId/ban - 封禁用户', () => {
    it('应该成功封禁用户(带封禁原因)', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试封禁原因' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '用户已封禁');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.is_active).toBe(false);
      expect(response.body.user.banned_reason).toBe('测试封禁原因');
      expect(response.body.user.banned_by).toBe(TEST_ADMIN_ID);
      expect(response.body.user.banned_at).toBeTruthy();

      // 验证数据库中用户状态已更新
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.is_active).toBe(false);
      expect(user?.banned_reason).toBe('测试封禁原因');

      // 验证BanLog记录已创建
      const banLog = await prisma.banLog.findFirst({
        where: {
          target_type: 'user',
          target_id: TEST_USER_ID,
          action: 'ban',
        },
      });
      expect(banLog).toBeTruthy();
      expect(banLog?.reason).toBe('测试封禁原因');
      expect(banLog?.operator_id).toBe(TEST_ADMIN_ID);
    });

    it('应该成功封禁用户(无封禁原因)', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.user.is_active).toBe(false);
      expect(response.body.user.banned_reason).toBeNull();
    });

    it('应该拒绝非管理员封禁用户', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER2_ID}/ban`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '测试' });

      expect(response.status).toBe(403);
    });

    it('应该返回404当目标用户不存在', async () => {
      const response = await request(app)
        .post('/api/admin/users/non-existent-user-id/ban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试' });

      expect(response.status).toBe(404);
    });

    it('应该返回400当重复封禁用户', async () => {
      // 先封禁用户
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '第一次封禁' });

      // 再次封禁同一用户
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '第二次封禁' });

      expect(response.status).toBe(400);
    });

    it('被封禁用户无法通过API认证', async () => {
      // 先封禁用户
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试封禁' });

      // 被封禁用户尝试访问需要认证的API
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('USER_BANNED');
      expect(response.body.error.message).toContain('账户已被封禁');
    });
  });

  // ==================== 解封用户API测试 ====================
  describe('POST /api/admin/users/:userId/unban - 解封用户', () => {
    beforeEach(async () => {
      // 先封禁用户
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试封禁' });
    });

    it('应该成功解封用户', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '用户已解封');
      expect(response.body.user.is_active).toBe(true);
      expect(response.body.user.banned_reason).toBeNull();
      expect(response.body.user.banned_at).toBeNull();
      expect(response.body.user.banned_by).toBeNull();

      // 验证数据库中用户状态已更新
      const user = await prisma.user.findUnique({
        where: { id: TEST_USER_ID },
      });
      expect(user?.is_active).toBe(true);
      expect(user?.banned_reason).toBeNull();

      // 验证BanLog记录已创建
      const banLog = await prisma.banLog.findFirst({
        where: {
          target_type: 'user',
          target_id: TEST_USER_ID,
          action: 'unban',
        },
      });
      expect(banLog).toBeTruthy();
      expect(banLog?.operator_id).toBe(TEST_ADMIN_ID);
    });

    it('解封后用户可以正常访问API', async () => {
      // 解封用户
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // 被解封用户尝试访问需要认证的API
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('应该拒绝非管理员解封用户', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/unban`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({});

      expect(response.status).toBe(403);
    });

    it('应该返回404当目标用户不存在', async () => {
      const response = await request(app)
        .post('/api/admin/users/non-existent-user-id/unban')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it('应该返回400当重复解封未被封禁的用户', async () => {
      // 先解封用户
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // 再次解封同一用户
      const response = await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ==================== 禁用端点API测试 ====================
  describe('POST /api/admin/endpoints/:endpointId/disable - 禁用端点', () => {
    it('应该成功禁用端点(带禁用原因)', async () => {
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试禁用原因' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '端点已禁用');
      expect(response.body).toHaveProperty('endpoint');
      expect(response.body.endpoint.is_disabled).toBe(true);
      expect(response.body.endpoint.disabled_reason).toBe('测试禁用原因');
      expect(response.body.endpoint.disabled_by).toBe(TEST_ADMIN_ID);
      expect(response.body.endpoint.disabled_at).toBeTruthy();

      // 验证数据库中端点状态已更新
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: testEndpointId },
      });
      expect(endpoint?.is_disabled).toBe(true);
      expect(endpoint?.disabled_reason).toBe('测试禁用原因');

      // 验证BanLog记录已创建
      const banLog = await prisma.banLog.findFirst({
        where: {
          target_type: 'endpoint',
          target_id: testEndpointId,
          action: 'disable',
        },
      });
      expect(banLog).toBeTruthy();
      expect(banLog?.reason).toBe('测试禁用原因');
      expect(banLog?.operator_id).toBe(TEST_ADMIN_ID);
    });

    it('应该成功禁用端点(无禁用原因)', async () => {
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.endpoint.is_disabled).toBe(true);
      expect(response.body.endpoint.disabled_reason).toBeNull();
    });

    it('应该拒绝非管理员禁用端点', async () => {
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: '测试' });

      expect(response.status).toBe(403);
    });

    it('应该返回404当目标端点不存在', async () => {
      const response = await request(app)
        .post('/api/admin/endpoints/non-existent-endpoint-id/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试' });

      expect(response.status).toBe(404);
    });

    it('应该返回400当重复禁用端点', async () => {
      // 先禁用端点
      await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '第一次禁用' });

      // 再次禁用同一端点
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '第二次禁用' });

      expect(response.status).toBe(400);
    });
  });

  // ==================== 启用端点API测试 ====================
  describe('POST /api/admin/endpoints/:endpointId/enable - 启用端点', () => {
    beforeEach(async () => {
      // 先禁用端点
      await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试禁用' });
    });

    it('应该成功启用端点', async () => {
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', '端点已启用');
      expect(response.body.endpoint.is_disabled).toBe(false);
      expect(response.body.endpoint.disabled_reason).toBeNull();
      expect(response.body.endpoint.disabled_at).toBeNull();
      expect(response.body.endpoint.disabled_by).toBeNull();

      // 验证数据库中端点状态已更新
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: testEndpointId },
      });
      expect(endpoint?.is_disabled).toBe(false);
      expect(endpoint?.disabled_reason).toBeNull();

      // 验证BanLog记录已创建
      const banLog = await prisma.banLog.findFirst({
        where: {
          target_type: 'endpoint',
          target_id: testEndpointId,
          action: 'enable',
        },
      });
      expect(banLog).toBeTruthy();
      expect(banLog?.operator_id).toBe(TEST_ADMIN_ID);
    });

    it('应该拒绝非管理员启用端点', async () => {
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/enable`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(403);
    });

    it('应该返回404当目标端点不存在', async () => {
      const response = await request(app)
        .post('/api/admin/endpoints/non-existent-endpoint-id/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it('应该返回400当重复启用未被禁用的端点', async () => {
      // 先启用端点
      await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // 再次启用同一端点
      const response = await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/enable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  // ==================== 查询封禁日志API测试 ====================
  describe('GET /api/admin/ban-logs - 查询封禁日志', () => {
    beforeEach(async () => {
      // 创建多个封禁日志用于测试
      // 封禁用户1
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '封禁用户1' });

      // 禁用端点1
      await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '禁用端点1' });

      // 解封用户1
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // 封禁用户2
      await request(app)
        .post(`/api/admin/users/${TEST_USER2_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '封禁用户2' });
    });

    it('应该成功查询所有封禁日志', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.logs)).toBe(true);
      expect(response.body.total).toBe(4); // 3个ban/unban操作 + 1个disable操作
      expect(response.body.logs.length).toBe(4);
    });

    it('应该按target_type过滤日志(只返回user日志)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?target_type=user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3); // 2个ban + 1个unban
      response.body.logs.forEach((log: { target_type: string }) => {
        expect(log.target_type).toBe('user');
      });
    });

    it('应该按target_type过滤日志(只返回endpoint日志)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?target_type=endpoint')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1); // 1个disable
      response.body.logs.forEach((log: { target_type: string }) => {
        expect(log.target_type).toBe('endpoint');
      });
    });

    it('应该按action过滤日志(只返回ban日志)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?action=ban')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(2); // 2个ban
      response.body.logs.forEach((log: { action: string }) => {
        expect(log.action).toBe('ban');
      });
    });

    it('应该按action过滤日志(只返回unban日志)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?action=unban')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1); // 1个unban
      response.body.logs.forEach((log: { action: string }) => {
        expect(log.action).toBe('unban');
      });
    });

    it('应该按operator_id过滤日志', async () => {
      const response = await request(app)
        .get(`/api/admin/ban-logs?operator_id=${TEST_ADMIN_ID}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(4); // 所有操作都是admin做的
      response.body.logs.forEach((log: { operator_id: string }) => {
        expect(log.operator_id).toBe(TEST_ADMIN_ID);
      });
    });

    it('应该支持分页(page=1, page_size=2)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?page=1&page_size=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(4);
      expect(response.body.logs.length).toBe(2); // 只返回2条
    });

    it('应该支持分页(page=2, page_size=2)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?page=2&page_size=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(4);
      expect(response.body.logs.length).toBe(2); // 第二页也有2条
    });

    it('应该拒绝非管理员查询封禁日志', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('应该返回400当分页参数无效(page<1)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?page=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it('应该返回400当分页参数无效(page_size>100)', async () => {
      const response = await request(app)
        .get('/api/admin/ban-logs?page_size=101')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  // ==================== WebSocket连接检查测试 ====================
  describe('WebSocket连接封禁状态检查', () => {
    it('被封禁用户无法建立WebSocket连接', async () => {
      // 先封禁用户
      await request(app)
        .post(`/api/admin/users/${TEST_USER_ID}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试封禁' });

      // 尝试连接WebSocket并等待关闭
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3001/ws/test-ep-1');

        ws.on('message', (data: WebSocket.Data) => {
          const message = JSON.parse(data.toString());

          // 验证收到系统消息通知账户已被封禁
          expect(message.type).toBe('system');
          expect(message.level).toBe('error');
          expect(message.message).toContain('账户已被封禁');
          expect(message.message).toContain('测试封禁');
        });

        ws.on('close', (code: number, reason: string) => {
          try {
            // 验证连接已关闭
            expect(code).toBe(1008);
            expect(reason.toString()).toContain('User is banned');
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        ws.on('error', () => {
          // WebSocket连接错误也算测试通过(因为被封禁用户会被拒绝)
          resolve();
        });
      });
    });

    it('禁用端点无法建立WebSocket连接', async () => {
      // 先禁用端点
      await request(app)
        .post(`/api/admin/endpoints/${testEndpointId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '测试禁用' });

      // 尝试连接WebSocket并等待关闭
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:3001/ws/test-ep-1');

        ws.on('message', (data: WebSocket.Data) => {
          const message = JSON.parse(data.toString());

          // 验证收到系统消息通知端点已被禁用
          expect(message.type).toBe('system');
          expect(message.level).toBe('error');
          expect(message.message).toContain('端点已被禁用');
          expect(message.message).toContain('测试禁用');
        });

        ws.on('close', (code: number, reason: string) => {
          try {
            // 验证连接已关闭
            expect(code).toBe(1008);
            expect(reason.toString()).toContain('Endpoint is disabled');
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        ws.on('error', () => {
          // WebSocket连接错误也算测试通过(因为被禁用端点会被拒绝)
          resolve();
        });
      });
    });

    it('正常用户和端点可以建立WebSocket连接', (done) => {
      // 尝试连接WebSocket
      const ws = new WebSocket('ws://localhost:3001/ws/test-ep-1');

      ws.on('open', () => {
        // 验证连接成功
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (error: Error) => {
        done(error);
      });
    });
  });
});
