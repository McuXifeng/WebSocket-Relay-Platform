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
 *
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export const authenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
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
