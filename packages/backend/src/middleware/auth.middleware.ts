/**
 * Auth Middleware
 * JWT 认证中间件
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error-handler.middleware.js';
import { config } from '../config/env.js';
import type { JwtPayload } from '@websocket-relay/shared';

/**
 * JWT 认证中间件
 * 验证请求头中的 JWT Token 并将解码后的用户信息附加到 req.user
 * Epic 10 Story 10.3: 增加is_active状态检查
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export const authenticateToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从 Authorization 头提取 token (格式: "Bearer TOKEN")
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1]; // 提取 Bearer 后的 token

    // 如果没有 token,返回 401 错误
    if (!token) {
      throw new AppError('MISSING_TOKEN', '未提供认证令牌', 401);
    }

    // 验证 token
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Epic 10 Story 10.3: JWT验证通过后,从数据库查询用户is_active状态
    const prisma = (await import('../config/database.js')).default;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = await prisma.user.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { id: decoded.userId },
      select: {
        is_active: true,
        banned_at: true,
        banned_reason: true,
      },
    });

    // 如果用户不存在,返回401错误
    if (!user) {
      throw new AppError('INVALID_TOKEN', '用户不存在', 401);
    }

    // Epic 10 Story 10.3: 如果is_active=false,抛出USER_BANNED错误
    if (!user.is_active) {
      throw new AppError(
        'USER_BANNED',
        `账户已被封禁,原因: ${user.banned_reason ?? '无'}, 封禁时间: ${user.banned_at?.toISOString() ?? '未知'}`,
        403
      );
    }

    // 将解码后的 payload 附加到 req.user
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    req.user = decoded;

    // 继续处理请求
    next();
  } catch (error) {
    // 处理 JWT 验证错误
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('INVALID_TOKEN', '无效或过期的令牌', 401));
    } else {
      next(error);
    }
  }
};

/**
 * 管理员权限验证中间件
 * 检查当前用户是否具有管理员权限
 * 必须在 authenticateToken 中间件之后使用
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  // 检查 req.user 是否存在且为管理员
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (!req.user?.isAdmin) {
    throw new AppError('FORBIDDEN', '需要管理员权限', 403);
  }

  // 继续处理请求
  next();
};
