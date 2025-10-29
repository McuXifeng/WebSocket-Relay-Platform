/**
 * Endpoint API 集成测试
 * 测试端点创建 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('POST /api/endpoints', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // 创建测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'endpoint_testuser',
        email: 'endpoint_test@example.com',
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
  });

  afterEach(async () => {
    // 清理测试端点数据（保留用户）
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('成功创建端点场景', () => {
    it('应该成功创建端点', async () => {
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '测试端点' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('endpoint');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoint } = response.body.data;

      // 验证返回的端点信息
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.name).toBe('测试端点');
      expect(endpoint).toHaveProperty('id');
      expect(endpoint).toHaveProperty('endpoint_id');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.endpoint_id).toHaveLength(10);
      expect(endpoint).toHaveProperty('websocket_url');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.websocket_url).toMatch(/^wss:\/\/.+\/ws\/.{10}$/);
      expect(endpoint).toHaveProperty('created_at');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.user_id).toBe(userId);
    });

    it('应该在未提供 name 时使用默认名称', async () => {
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(201);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data.endpoint.name).toBe('未命名端点');
    });

    it('应该在数据库中创建端点记录', async () => {
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '数据库测试端点' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const endpointId = response.body.data.endpoint.id;

      // 验证数据库中端点记录已创建
      const endpoint = await prisma.endpoint.findUnique({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: { id: endpointId },
      });

      expect(endpoint).not.toBeNull();
      expect(endpoint?.name).toBe('数据库测试端点');
      expect(endpoint?.user_id).toBe(userId);
      expect(endpoint?.endpoint_id).toHaveLength(10);
    });

    it('应该生成唯一的 endpoint_id', async () => {
      // 创建 3 个端点
      const responses = await Promise.all([
        request(app)
          .post('/api/endpoints')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '端点 1' }),
        request(app)
          .post('/api/endpoints')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '端点 2' }),
        request(app)
          .post('/api/endpoints')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: '端点 3' }),
      ]);

      // 提取所有 endpoint_id
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const endpointIds = responses.map((r) => r.body.data.endpoint.endpoint_id);

      // 验证所有 endpoint_id 唯一
      const uniqueIds = new Set(endpointIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('端点数量限制场景', () => {
    it('应该在超过端点数量限制时返回 400 错误', async () => {
      // 先创建 5 个端点
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/endpoints')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: `端点 ${i + 1}` });
      }

      // 尝试创建第 6 个端点
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '第 6 个端点' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('ENDPOINT_LIMIT_REACHED');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toBe('已达到端点数量上限');
    });

    it('应该正确统计用户的端点数量', async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          username: 'other_endpoint_user',
          email: 'other_endpoint@example.com',
          password_hash: 'hashed-password',
        },
      });

      // 为另一个用户创建 5 个端点
      await prisma.endpoint.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          endpoint_id: `other${i}xxx`,
          name: `其他用户端点 ${i + 1}`,
          user_id: otherUser.id,
        })),
      });

      // 当前用户应该仍然可以创建端点（不受其他用户影响）
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '当前用户端点' });

      expect(response.status).toBe(201);

      // 清理
      await prisma.endpoint.deleteMany({ where: { user_id: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('认证和授权场景', () => {
    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).post('/api/endpoints').send({ name: '测试端点' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('应该在使用无效 Token 时返回 401 错误', async () => {
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: '测试端点' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('应该在 Token 格式错误时返回 401 错误', async () => {
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', authToken) // 缺少 "Bearer " 前缀
        .send({ name: '测试端点' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('WebSocket URL 格式验证', () => {
    it('应该返回正确格式的 WebSocket URL', async () => {
      const response = await request(app)
        .post('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'URL 测试端点' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { websocket_url, endpoint_id } = response.body.data.endpoint;

      // 验证 URL 格式: wss://domain.com/ws/{endpoint_id}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(websocket_url).toMatch(/^wss:\/\/.+\/ws\/.{10}$/);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(websocket_url).toContain(endpoint_id);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(websocket_url).toMatch(new RegExp(`/ws/${endpoint_id}$`));
    });
  });
});

describe('GET /api/endpoints', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // 创建测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'get_endpoints_testuser',
        email: 'get_endpoints_test@example.com',
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
  });

  afterEach(async () => {
    // 清理测试端点数据（保留用户）
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('成功查询端点列表场景', () => {
    it('应该成功返回用户的端点列表', async () => {
      // 先创建两个端点
      await prisma.endpoint.createMany({
        data: [
          {
            endpoint_id: 'testep0001',
            name: '测试端点1',
            user_id: userId,
            created_at: new Date('2025-10-28T10:00:00.000Z'),
          },
          {
            endpoint_id: 'testep0002',
            name: '测试端点2',
            user_id: userId,
            created_at: new Date('2025-10-27T15:20:00.000Z'),
          },
        ],
      });

      const response = await request(app)
        .get('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('endpoints');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoints } = response.body.data;
      expect(endpoints).toHaveLength(2);

      // 验证第一个端点（应该是最新的）
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[0].name).toBe('测试端点1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[0].endpoint_id).toBe('testep0001');
      expect(endpoints[0]).toHaveProperty('id');
      expect(endpoints[0]).toHaveProperty('websocket_url');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[0].websocket_url).toMatch(/^wss:\/\/.+\/ws\/testep0001$/);
      expect(endpoints[0]).toHaveProperty('created_at');
      expect(endpoints[0]).toHaveProperty('last_active_at');

      // 验证第二个端点
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[1].name).toBe('测试端点2');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[1].endpoint_id).toBe('testep0002');
    });

    it('应该按创建时间倒序返回端点列表', async () => {
      // 创建 3 个端点,不同创建时间
      await prisma.endpoint.createMany({
        data: [
          {
            endpoint_id: 'oldest0001',
            name: '最旧端点',
            user_id: userId,
            created_at: new Date('2025-10-26T10:00:00.000Z'),
          },
          {
            endpoint_id: 'newest0001',
            name: '最新端点',
            user_id: userId,
            created_at: new Date('2025-10-28T10:00:00.000Z'),
          },
          {
            endpoint_id: 'middle0001',
            name: '中间端点',
            user_id: userId,
            created_at: new Date('2025-10-27T10:00:00.000Z'),
          },
        ],
      });

      const response = await request(app)
        .get('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoints } = response.body.data;

      // 验证顺序:最新 -> 中间 -> 最旧
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[0].name).toBe('最新端点');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[1].name).toBe('中间端点');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[2].name).toBe('最旧端点');
    });

    it('应该返回空数组如果用户没有端点', async () => {
      const response = await request(app)
        .get('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data.endpoints).toEqual([]);
    });

    it('应该为每个端点包含所有必需字段', async () => {
      // 创建一个端点
      await prisma.endpoint.create({
        data: {
          endpoint_id: 'fullfield1',
          name: '完整字段端点',
          user_id: userId,
          last_active_at: new Date('2025-10-28T12:30:00.000Z'),
        },
      });

      const response = await request(app)
        .get('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoints } = response.body.data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const endpoint = endpoints[0];

      // 验证所有必需字段存在
      expect(endpoint).toHaveProperty('id');
      expect(endpoint).toHaveProperty('endpoint_id');
      expect(endpoint).toHaveProperty('name');
      expect(endpoint).toHaveProperty('websocket_url');
      expect(endpoint).toHaveProperty('created_at');
      expect(endpoint).toHaveProperty('last_active_at');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.user_id).toBe(userId);
    });

    it('应该只返回当前用户的端点', async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          username: 'other_get_user',
          email: 'other_get@example.com',
          password_hash: 'hashed-password',
        },
      });

      // 为另一个用户创建端点
      await prisma.endpoint.create({
        data: {
          endpoint_id: 'otheruser1',
          name: '其他用户端点',
          user_id: otherUser.id,
        },
      });

      // 为当前用户创建端点
      await prisma.endpoint.create({
        data: {
          endpoint_id: 'currentuser',
          name: '当前用户端点',
          user_id: userId,
        },
      });

      const response = await request(app)
        .get('/api/endpoints')
        .set('Authorization', `Bearer ${authToken}`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoints } = response.body.data;

      // 应该只返回当前用户的 1 个端点
      expect(endpoints).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoints[0].name).toBe('当前用户端点');

      // 清理
      await prisma.endpoint.deleteMany({ where: { user_id: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('认证和授权场景', () => {
    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get('/api/endpoints');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('应该在使用无效 Token 时返回 401 错误', async () => {
      const response = await request(app)
        .get('/api/endpoints')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('应该在 Token 格式错误时返回 401 错误', async () => {
      const response = await request(app).get('/api/endpoints').set('Authorization', authToken); // 缺少 "Bearer " 前缀

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});

describe('GET /api/endpoints/:id', () => {
  let authToken: string;
  let userId: string;
  let endpointId: string;

  beforeAll(async () => {
    // 创建测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'get_endpoint_by_id_testuser',
        email: 'get_endpoint_by_id_test@example.com',
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

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        endpoint_id: 'testep0003',
        name: '查询测试端点',
        user_id: userId,
        last_active_at: new Date('2025-10-28T12:30:00.000Z'),
      },
    });
    endpointId = endpoint.id;
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('成功查询单个端点场景', () => {
    it('应该成功返回端点详情', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('endpoint');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoint } = response.body.data;

      // 验证端点详情
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.id).toBe(endpointId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.endpoint_id).toBe('testep0003');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.name).toBe('查询测试端点');
      expect(endpoint).toHaveProperty('websocket_url');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.websocket_url).toMatch(/^wss:\/\/.+\/ws\/testep0003$/);
      expect(endpoint).toHaveProperty('created_at');
      expect(endpoint).toHaveProperty('last_active_at');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(endpoint.user_id).toBe(userId);
    });

    it('应该包含所有必需字段', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { endpoint } = response.body.data;

      // 验证所有必需字段存在
      expect(endpoint).toHaveProperty('id');
      expect(endpoint).toHaveProperty('endpoint_id');
      expect(endpoint).toHaveProperty('name');
      expect(endpoint).toHaveProperty('websocket_url');
      expect(endpoint).toHaveProperty('created_at');
      expect(endpoint).toHaveProperty('last_active_at');
      expect(endpoint).toHaveProperty('user_id');
    });
  });

  describe('端点不存在场景', () => {
    it('应该返回 404 错误如果端点不存在', async () => {
      const response = await request(app)
        .get('/api/endpoints/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toBe('端点不存在');
    });
  });

  describe('无权访问场景', () => {
    it('应该返回 403 错误如果端点不属于当前用户', async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          username: 'other_endpoint_owner',
          email: 'other_endpoint_owner@example.com',
          password_hash: 'hashed-password',
        },
      });

      // 为另一个用户创建端点
      const otherEndpoint = await prisma.endpoint.create({
        data: {
          endpoint_id: 'otherepo1',
          name: '其他用户端点',
          user_id: otherUser.id,
        },
      });

      const response = await request(app)
        .get(`/api/endpoints/${otherEndpoint.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('FORBIDDEN');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toBe('无权访问此端点');

      // 清理
      await prisma.endpoint.delete({ where: { id: otherEndpoint.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('认证和授权场景', () => {
    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get(`/api/endpoints/${endpointId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('应该在使用无效 Token 时返回 401 错误', async () => {
      const response = await request(app)
        .get(`/api/endpoints/${endpointId}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});

describe('DELETE /api/endpoints/:id', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // 创建测试用户并生成 JWT Token
    const user = await prisma.user.create({
      data: {
        username: 'delete_endpoint_testuser',
        email: 'delete_endpoint_test@example.com',
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
  });

  afterEach(async () => {
    // 清理测试端点数据（保留用户）
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('成功删除端点场景', () => {
    it('应该成功删除端点', async () => {
      // 创建测试端点
      const endpoint = await prisma.endpoint.create({
        data: {
          endpoint_id: 'deleteme01',
          name: '待删除端点',
          user_id: userId,
        },
      });

      const response = await request(app)
        .delete(`/api/endpoints/${endpoint.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data.message).toBe('端点已删除');

      // 验证端点确实已从数据库删除
      const deletedEndpoint = await prisma.endpoint.findUnique({
        where: { id: endpoint.id },
      });
      expect(deletedEndpoint).toBeNull();
    });
  });

  describe('端点不存在场景', () => {
    it('应该返回 404 错误如果端点不存在', async () => {
      const response = await request(app)
        .delete('/api/endpoints/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toBe('端点不存在');
    });
  });

  describe('无权访问场景', () => {
    it('应该返回 403 错误如果端点不属于当前用户', async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          username: 'other_delete_user',
          email: 'other_delete@example.com',
          password_hash: 'hashed-password',
        },
      });

      // 为另一个用户创建端点
      const otherEndpoint = await prisma.endpoint.create({
        data: {
          endpoint_id: 'otherdel01',
          name: '其他用户端点',
          user_id: otherUser.id,
        },
      });

      const response = await request(app)
        .delete(`/api/endpoints/${otherEndpoint.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('FORBIDDEN');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toBe('无权访问此端点');

      // 验证端点没有被删除
      const stillExists = await prisma.endpoint.findUnique({
        where: { id: otherEndpoint.id },
      });
      expect(stillExists).not.toBeNull();

      // 清理
      await prisma.endpoint.delete({ where: { id: otherEndpoint.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('认证和授权场景', () => {
    it('应该在未认证时返回 401 错误', async () => {
      // 创建测试端点
      const endpoint = await prisma.endpoint.create({
        data: {
          endpoint_id: 'noauth0001',
          name: '无认证测试端点',
          user_id: userId,
        },
      });

      const response = await request(app).delete(`/api/endpoints/${endpoint.id}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');

      // 验证端点没有被删除
      const stillExists = await prisma.endpoint.findUnique({
        where: { id: endpoint.id },
      });
      expect(stillExists).not.toBeNull();
    });

    it('应该在使用无效 Token 时返回 401 错误', async () => {
      // 创建测试端点
      const endpoint = await prisma.endpoint.create({
        data: {
          endpoint_id: 'badtoken01',
          name: '无效Token测试端点',
          user_id: userId,
        },
      });

      const response = await request(app)
        .delete(`/api/endpoints/${endpoint.id}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
