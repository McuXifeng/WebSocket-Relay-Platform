/**
 * Ban Controller
 * 处理封禁相关的 HTTP 请求
 * Epic 10 Story 10.3: 后端封禁API实现
 */

import type { Request, Response, NextFunction } from 'express';
import * as banService from '../services/ban.service.js';
import type { BanUserRequest, DisableEndpointRequest, BanLogQuery } from '@websocket-relay/shared';

/**
 * 封禁用户控制器
 *
 * @route POST /api/admin/users/:userId/ban
 * @param req - Express 请求对象,包含userId参数和reason请求体
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从req.params提取userId
    const { userId } = req.params;

    // 从req.body提取reason(可选)
    const { reason } = req.body as BanUserRequest;

    // 从req.user提取operatorId(管理员ID)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const operatorId = req.user?.userId;

    if (!userId) {
      res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '用户ID不能为空' } });
      return;
    }

    if (!operatorId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户认证信息无效' } });
      return;
    }

    // 调用Service层处理封禁逻辑
    const user = await banService.banUser(userId, reason, operatorId);

    // 返回成功响应(200 OK)
    res.status(200).json({
      message: '用户已封禁',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        created_at: user.created_at,
        is_active: user.is_active,
        banned_at: user.banned_at,
        banned_reason: user.banned_reason,
        banned_by: user.banned_by,
      },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 解封用户控制器
 *
 * @route POST /api/admin/users/:userId/unban
 * @param req - Express 请求对象,包含userId参数
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function unbanUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从req.params提取userId
    const { userId } = req.params;

    // 从req.user提取operatorId(管理员ID)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const operatorId = req.user?.userId;

    if (!userId) {
      res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '用户ID不能为空' } });
      return;
    }

    if (!operatorId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户认证信息无效' } });
      return;
    }

    // 调用Service层处理解封逻辑
    const user = await banService.unbanUser(userId, operatorId);

    // 返回成功响应(200 OK)
    res.status(200).json({
      message: '用户已解封',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        created_at: user.created_at,
        is_active: user.is_active,
        banned_at: user.banned_at,
        banned_reason: user.banned_reason,
        banned_by: user.banned_by,
      },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 禁用端点控制器
 *
 * @route POST /api/admin/endpoints/:endpointId/disable
 * @param req - Express 请求对象,包含endpointId参数和reason请求体
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function disableEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从req.params提取endpointId
    const { endpointId } = req.params;

    // 从req.body提取reason(可选)
    const { reason } = req.body as DisableEndpointRequest;

    // 从req.user提取operatorId(管理员ID)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const operatorId = req.user?.userId;

    if (!endpointId) {
      res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '端点ID不能为空' } });
      return;
    }

    if (!operatorId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户认证信息无效' } });
      return;
    }

    // 调用Service层处理禁用逻辑
    const endpoint = await banService.disableEndpoint(endpointId, reason, operatorId);

    // 返回成功响应(200 OK)
    res.status(200).json({
      message: '端点已禁用',
      endpoint,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 启用端点控制器
 *
 * @route POST /api/admin/endpoints/:endpointId/enable
 * @param req - Express 请求对象,包含endpointId参数
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function enableEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从req.params提取endpointId
    const { endpointId } = req.params;

    // 从req.user提取operatorId(管理员ID)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const operatorId = req.user?.userId;

    if (!endpointId) {
      res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '端点ID不能为空' } });
      return;
    }

    if (!operatorId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户认证信息无效' } });
      return;
    }

    // 调用Service层处理启用逻辑
    const endpoint = await banService.enableEndpoint(endpointId, operatorId);

    // 返回成功响应(200 OK)
    res.status(200).json({
      message: '端点已启用',
      endpoint,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 查询封禁日志控制器
 *
 * @route GET /api/admin/ban-logs
 * @param req - Express 请求对象,包含查询参数
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getBanLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从req.query提取过滤参数和分页参数
    const query: BanLogQuery = {
      target_type: req.query.target_type as 'user' | 'endpoint' | undefined,
      action: req.query.action as 'ban' | 'unban' | 'disable' | 'enable' | undefined,
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      operator_id: req.query.operator_id as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      page_size: req.query.page_size ? parseInt(req.query.page_size as string, 10) : undefined,
    };

    // 调用Service层处理查询逻辑
    const result = await banService.getBanLogs(query);

    // 返回成功响应(200 OK)
    res.status(200).json(result);
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}
