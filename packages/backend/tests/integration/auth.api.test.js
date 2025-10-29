/**
 * Auth API 集成测试
 * 测试注册 API 的完整流程
 */
import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
describe('POST /api/auth/register', () => {
  // 测试授权码（8-12 位）
  const TEST_INVITE_CODE = 'testcode01';
  const TEST_ADMIN_ID = 'admin-id-01';
  beforeEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({});
    await prisma.inviteCode.deleteMany({});
    // 先创建管理员用户（用于创建授权码）
    await prisma.user.create({
      data: {
        id: TEST_ADMIN_ID,
        username: 'admin',
        email: 'admin@test.com',
        password_hash: 'dummy-hash',
        is_admin: true,
      },
    });
    // 创建测试授权码
    await prisma.inviteCode.create({
      data: {
        code: TEST_INVITE_CODE,
        created_by: TEST_ADMIN_ID,
      },
    });
  });
  afterEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany({});
    await prisma.inviteCode.deleteMany({});
  });
  afterAll(async () => {
    // 关闭数据库连接
    await prisma.$disconnect();
  });
  describe('成功注册场景', () => {
    it('应该成功注册新用户', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.data).toHaveProperty('user');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const { user } = response.body.data;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(user.username).toBe('testuser');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(user.email).toBe('test@example.com');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(user.is_admin).toBe(false);
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('created_at');
      // 验证返回的用户信息不含 password_hash
      expect(user).not.toHaveProperty('password_hash');
    });
    it('应该在数据库中创建用户记录', async () => {
      await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      // 验证数据库中用户记录已创建
      const user = await prisma.user.findUnique({
        where: { username: 'testuser' },
      });
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
      expect(user?.password_hash).toBeDefined();
      expect(user?.password_hash).not.toBe('Password123'); // 密码应该被加密
    });
    it('应该将授权码标记为已使用', async () => {
      await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      // 验证授权码已被标记为使用
      const inviteCode = await prisma.inviteCode.findUnique({
        where: { code: TEST_INVITE_CODE },
      });
      expect(inviteCode?.used_by).not.toBeNull();
      expect(inviteCode?.used_at).not.toBeNull();
    });
  });
  describe('授权码验证失败场景', () => {
    it('不存在的授权码应返回 400', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: 'invalid-code',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_INVITE_CODE');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toContain('授权码');
    });
    it('已使用的授权码应返回 400', async () => {
      // 先注册一次，消耗授权码
      await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'firstuser',
        email: 'first@example.com',
        password: 'Password123',
      });
      // 尝试再次使用相同授权码
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'seconduser',
        email: 'second@example.com',
        password: 'Password123',
      });
      expect(response.status).toBe(400);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_INVITE_CODE');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toContain('已被使用');
    });
    it('已过期的授权码应返回 400', async () => {
      // 创建一个已过期的授权码（8-12 位）
      const EXPIRED_CODE = 'expired01';
      await prisma.inviteCode.create({
        data: {
          code: EXPIRED_CODE,
          created_by: TEST_ADMIN_ID,
          expires_at: new Date('2020-01-01'), // 已过期
        },
      });
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: EXPIRED_CODE,
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      expect(response.status).toBe(400);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('INVALID_INVITE_CODE');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toContain('过期');
    });
  });
  describe('用户名/邮箱重复场景', () => {
    beforeEach(async () => {
      // 先创建一个用户
      await prisma.user.create({
        data: {
          username: 'existinguser',
          email: 'existing@example.com',
          password_hash: 'dummy-hash',
        },
      });
    });
    it('重复的 username 应返回 409', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'existinguser', // 重复的用户名
        email: 'new@example.com',
        password: 'Password123',
      });
      expect(response.status).toBe(409);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('USER_EXISTS');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toContain('用户名');
    });
    it('重复的 email 应返回 409', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'newuser',
        email: 'existing@example.com', // 重复的邮箱
        password: 'Password123',
      });
      expect(response.status).toBe(409);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.code).toBe('USER_EXISTS');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(response.body.error.message).toContain('邮箱');
    });
  });
  describe('数据验证', () => {
    it('缺少 inviteCode 应返回错误', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      });
      // 没有请求体验证的情况下，应该因为授权码无效而返回 400
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
    it('缺少 username 应返回错误', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        email: 'test@example.com',
        password: 'Password123',
      });
      // Prisma 会因为缺少必填字段而抛出错误
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
    it('缺少 email 应返回错误', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'testuser',
        password: 'Password123',
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
    it('缺少 password 应返回错误', async () => {
      const response = await request(app).post('/api/auth/register').send({
        inviteCode: TEST_INVITE_CODE,
        username: 'testuser',
        email: 'test@example.com',
      });
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
//# sourceMappingURL=auth.api.test.js.map
