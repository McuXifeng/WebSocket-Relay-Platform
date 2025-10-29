/**
 * 数据库集成测试
 * 测试数据库连接、表结构和约束
 */
import prisma from '../../src/config/database';
describe('Database Schema Tests', () => {
  // 清理测试数据
  afterEach(async () => {
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({});
  });
  // 断开数据库连接
  afterAll(async () => {
    await prisma.$disconnect();
  });
  describe('Database Connection', () => {
    it('应该成功连接到数据库', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as result`;
      expect(result).toBeDefined();
    });
  });
  describe('User Table', () => {
    it('应该成功插入 User 记录', async () => {
      const user = await prisma.user.create({
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashed_password',
        },
      });
      expect(user.id).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.is_admin).toBe(false);
      expect(user.created_at).toBeInstanceOf(Date);
    });
    it('应该拒绝重复的 username', async () => {
      await prisma.user.create({
        data: {
          username: 'duplicate',
          email: 'user1@example.com',
          password_hash: 'hash1',
        },
      });
      await expect(
        prisma.user.create({
          data: {
            username: 'duplicate',
            email: 'user2@example.com',
            password_hash: 'hash2',
          },
        })
      ).rejects.toThrow();
    });
    it('应该拒绝重复的 email', async () => {
      await prisma.user.create({
        data: {
          username: 'user1',
          email: 'duplicate@example.com',
          password_hash: 'hash1',
        },
      });
      await expect(
        prisma.user.create({
          data: {
            username: 'user2',
            email: 'duplicate@example.com',
            password_hash: 'hash2',
          },
        })
      ).rejects.toThrow();
    });
  });
  describe('InviteCode Table', () => {
    let adminUser;
    beforeEach(async () => {
      // 创建管理员用户
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password_hash: 'admin_hash',
          is_admin: true,
        },
      });
    });
    it('应该成功插入 InviteCode 记录', async () => {
      const inviteCode = await prisma.inviteCode.create({
        data: {
          code: 'TEST12345678',
          created_by: adminUser.id,
        },
      });
      expect(inviteCode.id).toBeDefined();
      expect(inviteCode.code).toBe('TEST12345678');
      expect(inviteCode.created_by).toBe(adminUser.id);
      expect(inviteCode.used_by).toBeNull();
      expect(inviteCode.expires_at).toBeNull();
      expect(inviteCode.created_at).toBeInstanceOf(Date);
    });
    it('应该拒绝重复的 code', async () => {
      await prisma.inviteCode.create({
        data: {
          code: 'DUPLICATE123',
          created_by: adminUser.id,
        },
      });
      await expect(
        prisma.inviteCode.create({
          data: {
            code: 'DUPLICATE123',
            created_by: adminUser.id,
          },
        })
      ).rejects.toThrow();
    });
    it('应该支持可选的 expires_at 字段', async () => {
      const futureDate = new Date('2025-12-31');
      const inviteCode = await prisma.inviteCode.create({
        data: {
          code: 'EXPIRE123456',
          created_by: adminUser.id,
          expires_at: futureDate,
        },
      });
      expect(inviteCode.expires_at).toEqual(futureDate);
    });
  });
  describe('Foreign Key Relationships', () => {
    let adminUser;
    let regularUser;
    beforeEach(async () => {
      // 创建管理员用户
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: 'admin@example.com',
          password_hash: 'admin_hash',
          is_admin: true,
        },
      });
      // 创建普通用户
      regularUser = await prisma.user.create({
        data: {
          username: 'regular',
          email: 'regular@example.com',
          password_hash: 'regular_hash',
        },
      });
    });
    it('应该成功创建带有 creator 关系的 InviteCode', async () => {
      const inviteCode = await prisma.inviteCode.create({
        data: {
          code: 'RELATION1234',
          created_by: adminUser.id,
        },
        include: {
          creator: true,
        },
      });
      expect(inviteCode.creator.id).toBe(adminUser.id);
      expect(inviteCode.creator.username).toBe('admin');
    });
    it('删除创建者应该级联删除授权码 (CASCADE)', async () => {
      // 创建授权码
      await prisma.inviteCode.create({
        data: {
          code: 'CASCADE12345',
          created_by: adminUser.id,
        },
      });
      // 删除创建者
      await prisma.user.delete({
        where: { id: adminUser.id },
      });
      // 验证授权码也被删除
      const inviteCodes = await prisma.inviteCode.findMany({
        where: { code: 'CASCADE12345' },
      });
      expect(inviteCodes).toHaveLength(0);
    });
    it('删除使用者应该将 used_by 置为 null (SET NULL)', async () => {
      // 创建授权码并标记为已使用
      const inviteCode = await prisma.inviteCode.create({
        data: {
          code: 'SETNULL12345',
          created_by: adminUser.id,
          used_by: regularUser.id,
          used_at: new Date(),
        },
      });
      // 删除使用者
      await prisma.user.delete({
        where: { id: regularUser.id },
      });
      // 验证授权码的 used_by 被置为 null
      const updatedInviteCode = await prisma.inviteCode.findUnique({
        where: { id: inviteCode.id },
      });
      expect(updatedInviteCode).toBeDefined();
      expect(updatedInviteCode?.used_by).toBeNull();
      expect(updatedInviteCode?.code).toBe('SETNULL12345');
    });
    it('used_by 应该是唯一的（一个授权码只能被一个用户使用）', async () => {
      // 创建已使用的授权码
      await prisma.inviteCode.create({
        data: {
          code: 'UNIQUE123456',
          created_by: adminUser.id,
          used_by: regularUser.id,
        },
      });
      const inviteCode2 = await prisma.inviteCode.create({
        data: {
          code: 'UNIQUE234567',
          created_by: adminUser.id,
        },
      });
      // 尝试将第二个授权码也标记为被同一用户使用（应该失败）
      await expect(
        prisma.inviteCode.update({
          where: { id: inviteCode2.id },
          data: { used_by: regularUser.id },
        })
      ).rejects.toThrow();
    });
  });
});
//# sourceMappingURL=database.test.js.map
