/**
 * Admin API 集成测试
 * 测试管理员授权码生成 API 的完整流程
 */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('POST /api/admin/invite-codes', () => {
  const TEST_ADMIN_ID = 'test-admin-id';
  const TEST_USER_ID = 'test-user-id';
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // 清理测试数据
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});

    // 创建管理员用户
    await prisma.user.create({
      data: {
        id: TEST_ADMIN_ID,
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'dummy-hash',
        is_admin: true,
      },
    });

    // 创建普通用户
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 生成管理员 JWT Token
    adminToken = jwt.sign(
      {
        userId: TEST_ADMIN_ID,
        username: 'admin',
        isAdmin: true,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 生成普通用户 JWT Token
    userToken = jwt.sign(
      {
        userId: TEST_USER_ID,
        username: 'testuser',
        isAdmin: false,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // 关闭数据库连接
    await prisma.$disconnect();
  });

  describe('成功创建授权码场景', () => {
    it('应该成功创建授权码（无过期时间）', async () => {
      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('created_at');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.expires_at).toBeNull();

      // 验证授权码长度在 8-12 位之间
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.code).toMatch(/^[A-Za-z0-9_-]{8,12}$/);
    });

    it('应该成功创建授权码（带过期时间 - Unix 时间戳）', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400; // 明天

      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expires_at: futureTimestamp,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('expires_at');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.expires_at).not.toBeNull();

      // 验证过期时间格式为 ISO 8601
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(new Date(response.body.expires_at as string).getTime()).toBeGreaterThan(Date.now());
    });

    it('应该成功创建授权码（带过期时间 - ISO 8601 字符串）', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 明天

      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expires_at: futureDate.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('expires_at');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.expires_at).not.toBeNull();

      // 验证过期时间格式为 ISO 8601
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(new Date(response.body.expires_at as string).getTime()).toBeGreaterThan(Date.now());
    });

    it('应该在数据库中创建授权码记录', async () => {
      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      // 验证数据库中授权码记录已创建
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const inviteCode = await prisma.inviteCode.findUnique({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where: { code: response.body.code as string },
      });

      expect(inviteCode).not.toBeNull();
      expect(inviteCode?.created_by).toBe(TEST_ADMIN_ID);
      expect(inviteCode?.used_by).toBeNull();
    });
  });

  describe('权限验证场景', () => {
    it('应该拒绝普通用户创建授权码（返回 403）', async () => {
      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('应该拒绝未认证用户创建授权码（返回 401）', async () => {
      const response = await request(app).post('/api/admin/invite-codes').send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('应该拒绝无效 Token 的请求（返回 401）', async () => {
      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', 'Bearer invalid-token')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('输入验证场景', () => {
    it('应该拒绝无效的过期时间格式（返回 400）', async () => {
      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expires_at: 'invalid-date',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_DATE');
    });

    it('应该拒绝无效数据类型的 expires_at（返回 400）', async () => {
      const response = await request(app)
        .post('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expires_at: { invalid: 'object' }, // 对象类型不被接受
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('授权码唯一性验证', () => {
    it('应该生成唯一的授权码（多次创建不重复）', async () => {
      const codes = new Set<string>();

      // 创建 10 个授权码
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/admin/invite-codes')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});

        expect(response.status).toBe(201);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        codes.add(response.body.code as string);
      }

      // 验证所有授权码都是唯一的
      expect(codes.size).toBe(10);
    });
  });
});

describe('GET /api/admin/invite-codes', () => {
  const TEST_ADMIN_ID = 'test-admin-id';
  const TEST_USER_ID = 'test-user-id';
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // 清理测试数据
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});

    // 创建管理员用户
    await prisma.user.create({
      data: {
        id: TEST_ADMIN_ID,
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'dummy-hash',
        is_admin: true,
      },
    });

    // 创建普通用户
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建测试授权码
    await prisma.inviteCode.create({
      data: {
        code: 'TEST-CODE-1',
        created_by: TEST_ADMIN_ID,
        expires_at: new Date(Date.now() + 86400000), // 明天过期
      },
    });

    await prisma.inviteCode.create({
      data: {
        code: 'TEST-CODE-2',
        created_by: TEST_ADMIN_ID,
        used_by: TEST_USER_ID,
        used_at: new Date(),
      },
    });

    // 生成管理员 JWT Token
    adminToken = jwt.sign(
      {
        userId: TEST_ADMIN_ID,
        username: 'admin',
        isAdmin: true,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 生成普通用户 JWT Token
    userToken = jwt.sign(
      {
        userId: TEST_USER_ID,
        username: 'testuser',
        isAdmin: false,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // 关闭数据库连接
    await prisma.$disconnect();
  });

  describe('成功获取授权码列表场景', () => {
    it('应该返回所有授权码列表（管理员）', async () => {
      const response = await request(app)
        .get('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.length).toBe(2);

      // 验证返回的授权码包含必需字段
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const firstCode = response.body[0];
      expect(firstCode).toHaveProperty('id');
      expect(firstCode).toHaveProperty('code');
      expect(firstCode).toHaveProperty('expires_at');
      expect(firstCode).toHaveProperty('used_by');
      expect(firstCode).toHaveProperty('used_by_username');
      expect(firstCode).toHaveProperty('used_at');
      expect(firstCode).toHaveProperty('created_by');
      expect(firstCode).toHaveProperty('created_by_username');
      expect(firstCode).toHaveProperty('created_at');
    });

    it('应该包含关联的用户名（used_by_username, created_by_username）', async () => {
      const response = await request(app)
        .get('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const codes = response.body as Array<{
        code: string;
        used_by_username: string | null;
        created_by_username: string;
      }>;

      // 找到已使用的授权码
      const usedCode = codes.find((c) => c.code === 'TEST-CODE-2');
      expect(usedCode).toBeDefined();
      expect(usedCode?.used_by_username).toBe('testuser');
      expect(usedCode?.created_by_username).toBe('admin');

      // 找到未使用的授权码
      const unusedCode = codes.find((c) => c.code === 'TEST-CODE-1');
      expect(unusedCode).toBeDefined();
      expect(unusedCode?.used_by_username).toBeNull();
      expect(unusedCode?.created_by_username).toBe('admin');
    });

    it('应该按创建时间倒序排列', async () => {
      // 再创建一个新的授权码
      await prisma.inviteCode.create({
        data: {
          code: 'TEST-CODE-3',
          created_by: TEST_ADMIN_ID,
        },
      });

      const response = await request(app)
        .get('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const codes = response.body as Array<{ created_at: string }>;

      // 验证按创建时间倒序排列
      for (let i = 0; i < codes.length - 1; i++) {
        const date1 = new Date(codes[i].created_at);
        const date2 = new Date(codes[i + 1].created_at);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('权限验证场景', () => {
    it('应该拒绝非管理员用户（返回 403）', async () => {
      const response = await request(app)
        .get('/api/admin/invite-codes')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('应该拒绝未认证用户（返回 401）', async () => {
      const response = await request(app).get('/api/admin/invite-codes');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});

describe('GET /api/admin/users', () => {
  const TEST_ADMIN_ID = 'test-admin-id';
  const TEST_USER_ID = 'test-user-id';
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // 清理测试数据
    await prisma.endpoint.deleteMany({});
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});

    // 创建管理员用户
    await prisma.user.create({
      data: {
        id: TEST_ADMIN_ID,
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'dummy-hash',
        is_admin: true,
      },
    });

    // 创建普通用户
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 为普通用户创建一些端点
    await prisma.endpoint.create({
      data: {
        id: 'endpoint-1',
        endpoint_id: 'TEST-EP-001',
        name: 'Test Endpoint 1',
        user_id: TEST_USER_ID,
      },
    });

    await prisma.endpoint.create({
      data: {
        id: 'endpoint-2',
        endpoint_id: 'TEST-EP-002',
        name: 'Test Endpoint 2',
        user_id: TEST_USER_ID,
      },
    });

    // 生成管理员 JWT Token
    adminToken = jwt.sign(
      {
        userId: TEST_ADMIN_ID,
        username: 'admin',
        isAdmin: true,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 生成普通用户 JWT Token
    userToken = jwt.sign(
      {
        userId: TEST_USER_ID,
        username: 'testuser',
        isAdmin: false,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.endpoint.deleteMany({});
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // 关闭数据库连接
    await prisma.$disconnect();
  });

  describe('成功获取用户列表场景', () => {
    it('应该返回所有用户列表（管理员）', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.length).toBe(2);

      // 验证返回的用户包含必需字段
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const firstUser = response.body[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('username');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('is_admin');
      expect(firstUser).toHaveProperty('created_at');
      expect(firstUser).toHaveProperty('endpoint_count');
    });

    it('应该包含 endpoint_count 字段并正确计算', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const users = response.body as Array<{
        username: string;
        endpoint_count: number;
      }>;

      // 验证普通用户的端点数量
      const testUser = users.find((u) => u.username === 'testuser');
      expect(testUser).toBeDefined();
      expect(testUser?.endpoint_count).toBe(2);

      // 验证管理员的端点数量
      const adminUser = users.find((u) => u.username === 'admin');
      expect(adminUser).toBeDefined();
      expect(adminUser?.endpoint_count).toBe(0);
    });

    it('应该不返回 password_hash 字段', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const users = response.body as Array<Record<string, unknown>>;

      users.forEach((user) => {
        expect(user).not.toHaveProperty('password_hash');
      });
    });

    it('应该按注册时间倒序排列', async () => {
      // 再创建一个新用户
      await prisma.user.create({
        data: {
          id: 'new-user-id',
          username: 'newuser',
          email: 'new@test.com',
          password_hash: 'dummy-hash',
          is_admin: false,
        },
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const users = response.body as Array<{ created_at: string }>;

      // 验证按注册时间倒序排列
      for (let i = 0; i < users.length - 1; i++) {
        const date1 = new Date(users[i].created_at);
        const date2 = new Date(users[i + 1].created_at);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('权限验证场景', () => {
    it('应该拒绝非管理员用户（返回 403）', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('应该拒绝未认证用户（返回 401）', async () => {
      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });
});
