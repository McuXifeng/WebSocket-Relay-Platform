/**
 * 授权码验证逻辑集成测试
 * 测试 validateInviteCode 函数的各种场景（使用真实数据库）
 */

import { validateInviteCode } from '@/services/auth.service';
import prisma from '@/config/database';
import { AppError } from '@/middleware/error-handler.middleware';

describe('validateInviteCode - 授权码验证集成测试', () => {
  const TEST_ADMIN_ID = 'test-admin-id';
  const TEST_USER_ID = 'test-user-123'; // 用于测试已使用授权码

  beforeAll(async () => {
    // 创建测试管理员用户
    await prisma.user.upsert({
      where: { id: TEST_ADMIN_ID },
      update: {},
      create: {
        id: TEST_ADMIN_ID,
        username: 'test-admin',
        email: 'test-admin@example.com',
        password_hash: 'dummy-hash',
        is_admin: true,
      },
    });

    // 创建测试普通用户（用于 used_by 外键）
    await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        username: 'test-user',
        email: 'test-user@example.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });
  });

  beforeEach(async () => {
    // 每个测试前清理授权码数据
    await prisma.inviteCode.deleteMany({});
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.inviteCode.deleteMany({});
    await prisma.user.deleteMany({ where: { id: TEST_ADMIN_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  describe('有效授权码验证', () => {
    it('应该成功验证有效授权码', async () => {
      // Arrange: 创建有效授权码
      await prisma.inviteCode.create({
        data: {
          code: 'VALID001', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          expires_at: null, // 永不过期
        },
      });

      // Act: 调用验证函数
      const result = await validateInviteCode('VALID001');

      // Assert: 验证返回结果
      expect(result).toBeDefined();
      expect(result.code).toBe('VALID001');
      expect(result.used_by).toBeNull();
      expect(result.expires_at).toBeNull();
    });

    it('应该成功验证未过期的授权码', async () => {
      // Arrange: 创建未过期授权码
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 天后过期

      await prisma.inviteCode.create({
        data: {
          code: 'NOTEXPIRED1', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          expires_at: futureDate,
        },
      });

      // Act: 调用验证函数
      const result = await validateInviteCode('NOTEXPIRED1');

      // Assert: 验证返回结果
      expect(result).toBeDefined();
      expect(result.code).toBe('NOTEXPIRED1');
      expect(result.used_by).toBeNull();
      expect(result.expires_at).toEqual(futureDate);
    });
  });

  describe('无效授权码被拒绝', () => {
    it('应该拒绝不存在的授权码', async () => {
      // Act & Assert: 验证抛出错误
      await expect(validateInviteCode('NOEXIST001')).rejects.toThrow(AppError);

      await expect(validateInviteCode('NOEXIST001')).rejects.toMatchObject({
        code: 'INVALID_INVITE_CODE',
        message: '授权码不存在',
        statusCode: 400,
      });
    });

    it('应该拒绝空字符串授权码', async () => {
      // Act & Assert: 验证抛出错误
      await expect(validateInviteCode('')).rejects.toThrow(AppError);

      await expect(validateInviteCode('')).rejects.toMatchObject({
        code: 'INVALID_INVITE_CODE',
        message: '授权码不存在',
        statusCode: 400,
      });
    });
  });

  describe('已使用授权码被拒绝', () => {
    it('应该拒绝已使用的授权码', async () => {
      // Arrange: 创建已使用授权码
      await prisma.inviteCode.create({
        data: {
          code: 'USED001', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          used_by: TEST_USER_ID, // 已被用户使用（使用已存在的用户 ID）
          used_at: new Date('2025-01-15'),
        },
      });

      // Act & Assert: 验证抛出错误
      await expect(validateInviteCode('USED001')).rejects.toThrow(AppError);

      await expect(validateInviteCode('USED001')).rejects.toMatchObject({
        code: 'INVALID_INVITE_CODE',
        message: '授权码已被使用',
        statusCode: 400,
      });
    });
  });

  describe('过期授权码被拒绝', () => {
    it('应该拒绝过期的授权码', async () => {
      // Arrange: 创建过期授权码
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 天前已过期

      await prisma.inviteCode.create({
        data: {
          code: 'EXPIRED001', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          expires_at: pastDate,
        },
      });

      // Act & Assert: 验证抛出错误
      await expect(validateInviteCode('EXPIRED001')).rejects.toThrow(AppError);

      await expect(validateInviteCode('EXPIRED001')).rejects.toMatchObject({
        code: 'INVALID_INVITE_CODE',
        message: '授权码已过期',
        statusCode: 400,
      });
    });

    it('应该拒绝刚刚过期的授权码（边界条件）', async () => {
      // Arrange: 创建刚刚过期的授权码（1 秒前）
      const justExpired = new Date(Date.now() - 1000);

      await prisma.inviteCode.create({
        data: {
          code: 'JSTEXPIRED1', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          expires_at: justExpired,
        },
      });

      // Act & Assert: 验证抛出错误
      await expect(validateInviteCode('JSTEXPIRED1')).rejects.toThrow(AppError);

      await expect(validateInviteCode('JSTEXPIRED1')).rejects.toMatchObject({
        code: 'INVALID_INVITE_CODE',
        message: '授权码已过期',
        statusCode: 400,
      });
    });

    it('应该正确处理 null expires_at（永不过期）', async () => {
      // Arrange: 创建 expires_at 为 null 的授权码
      await prisma.inviteCode.create({
        data: {
          code: 'NEVEREXP001', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          expires_at: null, // 明确测试 null 场景
        },
      });

      // Act: 调用验证函数
      const result = await validateInviteCode('NEVEREXP001');

      // Assert: 验证成功返回，不抛出过期错误
      expect(result).toBeDefined();
      expect(result.code).toBe('NEVEREXP001');
      expect(result.expires_at).toBeNull();
      expect(result.used_by).toBeNull();
    });
  });

  describe('边界条件和组合场景', () => {
    it('应该正确处理同时满足多个条件的有效授权码', async () => {
      // Arrange: 创建未使用且未过期的授权码
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await prisma.inviteCode.create({
        data: {
          code: 'VALIDMULTI1', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
          expires_at: futureDate,
          used_by: null,
        },
      });

      // Act: 调用验证函数
      const result = await validateInviteCode('VALIDMULTI1');

      // Assert: 验证成功
      expect(result).toBeDefined();
      expect(result.code).toBe('VALIDMULTI1');
    });

    it('应该处理特殊字符授权码', async () => {
      // Arrange: 创建包含特殊字符的授权码（最多 12 字符）
      await prisma.inviteCode.create({
        data: {
          code: 'CODE_DOT.123', // 最多 12 字符
          created_by: TEST_ADMIN_ID,
        },
      });

      // Act: 调用验证函数
      const result = await validateInviteCode('CODE_DOT.123');

      // Assert: 验证成功
      expect(result).toBeDefined();
      expect(result.code).toBe('CODE_DOT.123');
    });

    it('应该正确验证 12 字符长度的授权码（最大长度）', async () => {
      // Arrange: 创建 12 字符授权码（Schema 最大长度）
      await prisma.inviteCode.create({
        data: {
          code: '123456789012', // 正好 12 字符
          created_by: TEST_ADMIN_ID,
        },
      });

      // Act: 调用验证函数
      const result = await validateInviteCode('123456789012');

      // Assert: 验证成功
      expect(result).toBeDefined();
      expect(result.code).toBe('123456789012');
      expect(result.code.length).toBe(12);
    });
  });
});
