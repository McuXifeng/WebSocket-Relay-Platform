/**
 * Auth Controller
 * 处理认证相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import type {
  RegisterRequest,
  UserPublic,
  LoginRequest,
  LoginResponse,
} from '@websocket-relay/shared';
import { AppError } from '../middleware/error-handler.middleware.js';

/**
 * 用户注册控制器
 *
 * @route POST /api/auth/register
 * @param req - Express 请求对象，包含注册数据
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从请求体提取注册数据（已通过验证中间件验证）
    const registerData = req.body as RegisterRequest;

    // 调用 Service 层处理注册逻辑
    const user: UserPublic = await authService.registerUser(registerData);

    // 返回成功响应（201 Created）
    res.status(201).json({
      data: { user },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 用户登录控制器
 *
 * @route POST /api/auth/login
 * @param req - Express 请求对象，包含登录数据
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从请求体提取登录数据（已通过验证）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const loginData: LoginRequest = req.body;

    // 调用 Service 层处理登录逻辑
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result: LoginResponse = await authService.loginUser(loginData);

    // 返回成功响应（200 OK）
    res.status(200).json({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: result,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 获取当前用户信息控制器
 *
 * @route GET /api/auth/me
 * @param req - Express 请求对象（需要携带认证信息）
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId（由 authenticateToken 中间件附加）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 查询用户信息
    const prisma = (await import('../config/database.js')).default;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = await prisma.user.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      where: { id: userId },
    });

    if (!user) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    // 返回 UserPublic（不含 password_hash）
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
    };

    res.status(200).json({
      data: {
        user: userPublic,
      },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}
