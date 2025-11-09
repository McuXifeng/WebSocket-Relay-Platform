/**
 * Ban Service
 * 处理用户封禁和端点禁用相关的业务逻辑
 * Epic 10 Story 10.3: 后端封禁API实现
 */

/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

import prisma from '../config/database.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import type { BanLogQuery, BanLogResponse } from '@websocket-relay/shared';

/**
 * 封禁用户
 *
 * @param userId - 目标用户ID
 * @param reason - 封禁原因(可选,最大255字符)
 * @param operatorId - 操作者ID(管理员ID)
 * @returns 更新后的用户信息
 * @throws {AppError} 404 - 用户不存在
 * @throws {AppError} 400 - 用户已被封禁
 */
export async function banUser(userId: string, reason: string | undefined, operatorId: string) {
  // 验证目标用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
  }

  // 检查用户是否已被封禁(防止重复操作)
  if (!user.is_active) {
    throw new AppError('USER_ALREADY_BANNED', '用户已被封禁', 400);
  }

  // 使用Prisma事务确保原子性
  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新User表:is_active=false, banned_at=now, banned_reason, banned_by
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        is_active: false,
        banned_at: new Date(),
        banned_reason: reason ?? null,
        banned_by: operatorId,
      },
    });

    // 2. 创建BanLog记录:target_type='user', action='ban'
    await tx.banLog.create({
      data: {
        target_type: 'user',
        target_id: userId,
        action: 'ban',
        reason: reason ?? null,
        operator_id: operatorId,
      },
    });

    return updatedUser;
  });

  return result;
}

/**
 * 解封用户
 *
 * @param userId - 目标用户ID
 * @param operatorId - 操作者ID(管理员ID)
 * @returns 更新后的用户信息
 * @throws {AppError} 404 - 用户不存在
 * @throws {AppError} 400 - 用户未被封禁
 */
export async function unbanUser(userId: string, operatorId: string) {
  // 验证目标用户是否存在
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
  }

  // 检查用户是否已激活(防止重复操作)
  if (user.is_active) {
    throw new AppError('USER_NOT_BANNED', '用户未被封禁', 400);
  }

  // 使用Prisma事务确保原子性
  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新User表:is_active=true, banned_at=null, banned_reason=null, banned_by=null
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        is_active: true,
        banned_at: null,
        banned_reason: null,
        banned_by: null,
      },
    });

    // 2. 创建BanLog记录:target_type='user', action='unban'
    await tx.banLog.create({
      data: {
        target_type: 'user',
        target_id: userId,
        action: 'unban',
        reason: null,
        operator_id: operatorId,
      },
    });

    return updatedUser;
  });

  return result;
}

/**
 * 禁用端点
 *
 * @param endpointId - 目标端点ID(UUID)
 * @param reason - 禁用原因(可选,最大255字符)
 * @param operatorId - 操作者ID(管理员ID)
 * @returns 更新后的端点信息
 * @throws {AppError} 404 - 端点不存在
 * @throws {AppError} 400 - 端点已被禁用
 */
export async function disableEndpoint(
  endpointId: string,
  reason: string | undefined,
  operatorId: string
) {
  // 验证目标端点是否存在
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    throw new AppError('ENDPOINT_NOT_FOUND', '端点不存在', 404);
  }

  // 检查端点是否已禁用(防止重复操作)
  if (endpoint.is_disabled) {
    throw new AppError('ENDPOINT_ALREADY_DISABLED', '端点已被禁用', 400);
  }

  // 使用Prisma事务确保原子性
  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新Endpoint表:is_disabled=true, disabled_at=now, disabled_reason, disabled_by
    const updatedEndpoint = await tx.endpoint.update({
      where: { id: endpointId },
      data: {
        is_disabled: true,
        disabled_at: new Date(),
        disabled_reason: reason ?? null,
        disabled_by: operatorId,
      },
    });

    // 2. 创建BanLog记录:target_type='endpoint', action='disable'
    await tx.banLog.create({
      data: {
        target_type: 'endpoint',
        target_id: endpointId,
        action: 'disable',
        reason: reason ?? null,
        operator_id: operatorId,
      },
    });

    return updatedEndpoint;
  });

  return result;
}

/**
 * 启用端点
 *
 * @param endpointId - 目标端点ID(UUID)
 * @param operatorId - 操作者ID(管理员ID)
 * @returns 更新后的端点信息
 * @throws {AppError} 404 - 端点不存在
 * @throws {AppError} 400 - 端点未被禁用
 */
export async function enableEndpoint(endpointId: string, operatorId: string) {
  // 验证目标端点是否存在
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    throw new AppError('ENDPOINT_NOT_FOUND', '端点不存在', 404);
  }

  // 检查端点是否已启用(防止重复操作)
  if (!endpoint.is_disabled) {
    throw new AppError('ENDPOINT_NOT_DISABLED', '端点未被禁用', 400);
  }

  // 使用Prisma事务确保原子性
  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新Endpoint表:is_disabled=false, disabled_at=null, disabled_reason=null, disabled_by=null
    const updatedEndpoint = await tx.endpoint.update({
      where: { id: endpointId },
      data: {
        is_disabled: false,
        disabled_at: null,
        disabled_reason: null,
        disabled_by: null,
      },
    });

    // 2. 创建BanLog记录:target_type='endpoint', action='enable'
    await tx.banLog.create({
      data: {
        target_type: 'endpoint',
        target_id: endpointId,
        action: 'enable',
        reason: null,
        operator_id: operatorId,
      },
    });

    return updatedEndpoint;
  });

  return result;
}

/**
 * 查询封禁日志
 *
 * @param query - 查询参数(支持按target_type, action, start_date, end_date, operator_id过滤,支持分页)
 * @returns 封禁日志列表和总数
 * @throws {AppError} 400 - 参数无效
 */
export async function getBanLogs(query: BanLogQuery): Promise<BanLogResponse> {
  // 解构查询参数
  const {
    target_type,
    action,
    start_date,
    end_date,
    operator_id,
    page = 1,
    page_size = 20,
  } = query;

  // 参数验证
  if (page < 1) {
    throw new AppError('INVALID_PARAMS', '页码必须大于0', 400);
  }

  if (page_size < 1 || page_size > 100) {
    throw new AppError('INVALID_PARAMS', '每页大小必须在1-100之间', 400);
  }

  // 构建查询条件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (target_type) {
    where.target_type = target_type;
  }

  if (action) {
    where.action = action;
  }

  if (operator_id) {
    where.operator_id = operator_id;
  }

  // 时间范围过滤
  if (start_date || end_date) {
    where.created_at = {};
    if (start_date) {
      where.created_at.gte = new Date(start_date);
    }
    if (end_date) {
      where.created_at.lte = new Date(end_date);
    }
  }

  // 计算分页偏移量
  const skip = (page - 1) * page_size;

  // 查询总数和日志列表(并行执行)
  const [total, prismaLogs] = await Promise.all([
    prisma.banLog.count({ where }),
    prisma.banLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: page_size,
    }),
  ]);

  // 转换Prisma日志为共享类型BanLog
  const logs = prismaLogs.map((log) => ({
    id: log.id,
    target_type: log.target_type as 'user' | 'endpoint',
    target_id: log.target_id,
    action: log.action as 'ban' | 'unban' | 'disable' | 'enable',
    reason: log.reason,
    operator_id: log.operator_id,
    created_at: log.created_at,
  }));

  return {
    logs,
    total,
  };
}
