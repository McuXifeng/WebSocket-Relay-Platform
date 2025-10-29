/**
 * Admin Controller
 * 处理管理员相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { AppError } from '../middleware/error-handler.middleware.js';
import type {
  CreateInviteCodeRequest,
  CreateInviteCodeResponse,
  GetInviteCodesResponse,
  GetUsersResponse,
  GetEndpointsResponse,
} from '@websocket-relay/shared';
import * as endpointService from '../services/endpoint.service.js';

/**
 * 创建授权码控制器
 *
 * @route POST /api/admin/invite-codes
 * @param req - Express 请求对象，包含授权码数据
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function createInviteCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从请求体提取数据
    const { expires_at } = req.body as CreateInviteCodeRequest;

    // 获取当前管理员用户 ID（由 authenticateToken 中间件附加）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 生成 10 位授权码
    const code = nanoid(10);

    // 解析 expires_at（支持 Unix 时间戳和 ISO 8601）
    let expiresAtDate: Date | null = null;
    if (expires_at !== undefined && expires_at !== null) {
      if (typeof expires_at === 'number') {
        // Unix 时间戳（秒）转换为毫秒
        expiresAtDate = new Date(expires_at * 1000);
      } else if (typeof expires_at === 'string') {
        // ISO 8601 字符串
        expiresAtDate = new Date(expires_at);
      } else {
        throw new AppError('INVALID_DATE', '无效的过期时间格式', 400);
      }

      // 验证日期是否有效
      if (isNaN(expiresAtDate.getTime())) {
        throw new AppError('INVALID_DATE', '无效的过期时间格式', 400);
      }
    }

    // 保存到数据库
    const prisma = (await import('../config/database.js')).default;
    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        expires_at: expiresAtDate,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        created_by: userId,
      },
    });

    // 构造响应
    const response: CreateInviteCodeResponse = {
      id: inviteCode.id,
      code: inviteCode.code,
      expires_at: inviteCode.expires_at?.toISOString() ?? null,
      created_at: inviteCode.created_at.toISOString(),
    };

    // 返回成功响应（201 Created）
    res.status(201).json(response);
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 获取授权码列表控制器
 *
 * @route GET /api/admin/invite-codes
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getInviteCodes(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 查询所有授权码，关联查询 used_by 和 created_by 用户信息
    const prisma = (await import('../config/database.js')).default;
    const inviteCodes = await prisma.inviteCode.findMany({
      include: {
        user: {
          select: { username: true }, // used_by 用户名
        },
        creator: {
          select: { username: true }, // created_by 用户名
        },
      },
      orderBy: {
        created_at: 'desc', // 按创建时间倒序
      },
    });

    // 格式化响应数据
    const response: GetInviteCodesResponse = inviteCodes.map((ic) => ({
      id: ic.id,
      code: ic.code,
      expires_at: ic.expires_at?.toISOString() ?? null,
      used_by: ic.used_by,
      used_by_username: ic.user?.username ?? null,
      used_at: ic.used_at?.toISOString() ?? null,
      created_by: ic.created_by,
      created_by_username: ic.creator.username,
      created_at: ic.created_at.toISOString(),
    }));

    // 返回成功响应
    res.json(response);
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 获取用户列表控制器
 *
 * @route GET /api/admin/users
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 查询所有用户,聚合查询端点数量
    const prisma = (await import('../config/database.js')).default;
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { endpoints: true }, // 聚合查询端点数量
        },
      },
      orderBy: {
        created_at: 'desc', // 按注册时间倒序
      },
    });

    // 格式化响应数据（排除敏感字段 password_hash）
    const response: GetUsersResponse = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      created_at: user.created_at.toISOString(),
      endpoint_count: user._count.endpoints,
    }));

    // 返回成功响应
    res.json(response);
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 获取指定用户的端点列表控制器
 * Story 5.3: 用户管理页面 UI 优化
 *
 * @route GET /api/admin/users/:userId/endpoints
 * @param req - Express 请求对象（包含 userId 路径参数）
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getUserEndpoints(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从路径参数获取 userId
    const { userId } = req.params;

    if (!userId) {
      throw new AppError('INVALID_REQUEST', '缺少用户 ID 参数', 400);
    }

    // 验证用户是否存在
    const prisma = (await import('../config/database.js')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    // 调用 Service 层查询该用户的端点列表
    const endpoints = await endpointService.getEndpointsByUserId(userId);

    // 构建响应数据
    const response: GetEndpointsResponse = {
      endpoints,
    };

    // 返回成功响应 (200 OK)
    res.status(200).json({
      data: response,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}
