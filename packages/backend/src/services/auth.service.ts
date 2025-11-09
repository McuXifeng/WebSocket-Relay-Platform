/**
 * Auth Service
 * 处理用户认证相关的业务逻辑
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isBefore } from 'date-fns';
import prisma from '../config/database.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { config } from '../config/env.js';
import type {
  RegisterRequest,
  UserPublic,
  LoginRequest,
  LoginResponse,
  JwtPayload,
} from '@websocket-relay/shared';

/**
 * 密码加密的 salt rounds（符合架构标准）
 */
const SALT_ROUNDS = 10;

/**
 * 验证授权码是否有效
 *
 * @param code - 授权码字符串
 * @returns 有效的授权码对象
 * @throws {AppError} 400 - 授权码不存在、已使用或已过期
 */
export async function validateInviteCode(code: string) {
  // 查询授权码
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
  });

  // 检查授权码是否存在
  if (!inviteCode) {
    throw new AppError('INVALID_INVITE_CODE', '授权码不存在', 400);
  }

  // 检查授权码是否已被使用
  if (inviteCode.used_by !== null) {
    throw new AppError('INVALID_INVITE_CODE', '授权码已被使用', 400);
  }

  // 检查授权码是否已过期
  // expires_at 为 null 表示永不过期
  if (inviteCode.expires_at !== null && isBefore(inviteCode.expires_at, new Date())) {
    throw new AppError('INVALID_INVITE_CODE', '授权码已过期', 400);
  }

  return inviteCode;
}

/**
 * 检查用户名或邮箱是否已存在
 *
 * @param username - 用户名
 * @param email - 邮箱地址
 * @throws {AppError} 409 - 用户名或邮箱已存在
 */
export async function checkUserExists(username: string, email: string): Promise<void> {
  // 查询是否存在相同用户名或邮箱的用户
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    // 判断是用户名重复还是邮箱重复
    if (existingUser.username === username) {
      throw new AppError('USER_EXISTS', '用户名已存在', 409);
    } else {
      throw new AppError('USER_EXISTS', '邮箱已存在', 409);
    }
  }
}

/**
 * 注册新用户
 *
 * @param data - 注册请求数据（包含授权码、用户名、邮箱、密码）
 * @returns 注册成功的用户公开信息（不含密码哈希）
 * @throws {AppError} 400 - 授权码无效
 * @throws {AppError} 409 - 用户名或邮箱已存在
 */
export async function registerUser(data: RegisterRequest): Promise<UserPublic> {
  // 解构注册数据
  const { inviteCode, username, email, password } = data;

  // 1. 验证授权码
  await validateInviteCode(inviteCode);

  // 2. 检查用户名和邮箱是否已存在
  await checkUserExists(username, email);

  // 3. 使用 bcrypt 加密密码
  const password_hash: string = await bcrypt.hash(password, SALT_ROUNDS);

  // 4. 使用事务创建用户并更新授权码（确保原子性）
  const user = await prisma.$transaction(async (tx) => {
    // 创建新用户
    const newUser = await tx.user.create({
      data: {
        username,
        email,
        password_hash,
      },
    });

    // 更新授权码为已使用状态
    await tx.inviteCode.update({
      where: { code: inviteCode },
      data: {
        used_by: newUser.id,
        used_at: new Date(),
      },
    });

    return newUser;
  });

  // 5. 返回 UserPublic 类型（不含 password_hash）
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_admin: user.is_admin,
    created_at: user.created_at,
    is_active: user.is_active,
    banned_at: user.banned_at,
    banned_reason: user.banned_reason,
    banned_by: user.banned_by,
  };
}

/**
 * 用户登录
 *
 * @param data - 登录请求数据（包含用户名和密码）
 * @returns 登录成功的 token 和用户公开信息
 * @throws {AppError} 401 - 用户名或密码错误
 */
export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { username, password } = data;

  // 1. 根据 username 查询用户
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const user = await prisma.user.findUnique({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    where: { username },
  });

  // 2. 如果用户不存在，抛出 401 错误（统一返回"用户名或密码错误"）
  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', '用户名或密码错误', 401);
  }

  // 3. 使用 bcrypt 验证密码
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  // 4. 如果密码错误，抛出 401 错误（统一返回"用户名或密码错误"）
  if (!isValidPassword) {
    throw new AppError('INVALID_CREDENTIALS', '用户名或密码错误', 401);
  }

  // 5. 生成 JWT Token
  const payload: JwtPayload = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    userId: user.id,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    username: user.username,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    isAdmin: user.is_admin,
  };

  const token = jwt.sign(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    payload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions // 7 天
  );

  // 6. 返回 token 和 UserPublic（不含 password_hash）
  const userPublic: UserPublic = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    id: user.id,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    username: user.username,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    email: user.email,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    is_admin: user.is_admin,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    created_at: user.created_at,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    is_active: user.is_active,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    banned_at: user.banned_at,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    banned_reason: user.banned_reason,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    banned_by: user.banned_by,
  };

  return {
    token,
    user: userPublic,
  };
}
