/**
 * 告警历史服务 (Epic 6 Story 6.5)
 * 负责告警历史记录的查询、状态更新和删除操作
 */

import prisma from '../config/database';
import { config } from '../config/env';
import { alertLogger } from '../config/logger';
import { AppError } from '../middleware/error-handler.middleware';

/**
 * 告警历史查询过滤条件
 */
export interface AlertHistoryFilter {
  alertLevel?: 'info' | 'warning' | 'critical'; // 告警级别筛选
  deviceId?: string; // 设备 ID 筛选
  status?: 'unread' | 'read' | 'processed'; // 状态筛选
  startDate?: Date; // 开始时间（触发时间范围）
  endDate?: Date; // 结束时间（触发时间范围）
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number; // 页码（默认 1）
  pageSize?: number; // 每页数量（默认 20）
}

/**
 * 查询告警历史记录（支持筛选和分页）
 * @param userId - 用户 ID
 * @param endpointId - 端点 ID (可选)
 * @param filter - 筛选条件
 * @param pagination - 分页参数
 * @returns 告警历史记录列表和总数
 */
export async function getAlertHistory(
  userId: string,
  endpointId?: string,
  filter?: AlertHistoryFilter,
  pagination?: PaginationParams
) {
  const page = pagination?.page || 1;
  const pageSize = pagination?.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // 构建查询条件
  const whereClause: Record<string, unknown> = {
    alert_rule: {
      user_id: userId,
      ...(endpointId && { endpoint_id: endpointId }),
    },
  };

  // 添加筛选条件
  if (filter?.alertLevel) {
    whereClause.alert_level = filter.alertLevel;
  }

  if (filter?.deviceId) {
    whereClause.device_id = filter.deviceId;
  }

  if (filter?.status) {
    whereClause.status = filter.status;
  }

  if (filter?.startDate || filter?.endDate) {
    whereClause.triggered_at = {};
    if (filter.startDate) {
      (whereClause.triggered_at as Record<string, unknown>).gte = filter.startDate;
    }
    if (filter.endDate) {
      (whereClause.triggered_at as Record<string, unknown>).lte = filter.endDate;
    }
  }

  // 查询总数
  const total = await prisma.alertHistory.count({ where: whereClause });

  // 查询分页数据
  const alertHistory = await prisma.alertHistory.findMany({
    where: whereClause,
    include: {
      alert_rule: {
        select: {
          rule_name: true,
          data_key: true,
          operator: true,
        },
      },
      device: {
        select: {
          device_id: true,
          custom_name: true,
        },
      },
    },
    orderBy: {
      triggered_at: 'desc', // 按触发时间倒序排列
    },
    skip,
    take: pageSize,
  });

  return {
    data: alertHistory,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 根据 alertId 查询单个告警详情
 * @param alertId - 告警历史 ID
 * @param userId - 用户 ID (用于权限验证)
 * @returns 告警详情
 */
export async function getAlertHistoryById(alertId: string, userId: string) {
  const alertHistory = await prisma.alertHistory.findFirst({
    where: {
      id: alertId,
      alert_rule: {
        user_id: userId,
      },
    },
    include: {
      alert_rule: {
        select: {
          rule_name: true,
          data_key: true,
          operator: true,
          threshold: true,
          alert_level: true,
        },
      },
      device: {
        select: {
          device_id: true,
          custom_name: true,
          endpoint_id: true,
        },
      },
    },
  });

  if (!alertHistory) {
    throw new AppError('NOT_FOUND', '告警历史记录不存在或无权访问', 404);
  }

  return alertHistory;
}

/**
 * 标记告警为"已读"
 * @param alertId - 告警历史 ID
 * @param userId - 用户 ID (用于权限验证)
 * @returns 更新后的告警记录
 */
export async function markAsRead(alertId: string, userId: string) {
  // 先验证权限
  const alertHistory = await prisma.alertHistory.findFirst({
    where: {
      id: alertId,
      alert_rule: {
        user_id: userId,
      },
    },
  });

  if (!alertHistory) {
    throw new AppError('NOT_FOUND', '告警历史记录不存在或无权访问', 404);
  }

  // 更新状态
  const updated = await prisma.alertHistory.update({
    where: { id: alertId },
    data: {
      status: 'read',
      read_at: new Date(),
    },
  });

  return updated;
}

/**
 * 标记告警为"已处理"
 * @param alertId - 告警历史 ID
 * @param userId - 用户 ID (用于权限验证)
 * @returns 更新后的告警记录
 */
export async function markAsProcessed(alertId: string, userId: string) {
  // 先验证权限
  const alertHistory = await prisma.alertHistory.findFirst({
    where: {
      id: alertId,
      alert_rule: {
        user_id: userId,
      },
    },
  });

  if (!alertHistory) {
    throw new AppError('NOT_FOUND', '告警历史记录不存在或无权访问', 404);
  }

  // 更新状态
  const updated = await prisma.alertHistory.update({
    where: { id: alertId },
    data: {
      status: 'processed',
      processed_at: new Date(),
    },
  });

  return updated;
}

/**
 * 删除告警历史记录
 * @param alertId - 告警历史 ID
 * @param userId - 用户 ID (用于权限验证)
 * @returns 删除的告警记录
 */
export async function deleteAlertHistory(alertId: string, userId: string) {
  // 先验证权限
  const alertHistory = await prisma.alertHistory.findFirst({
    where: {
      id: alertId,
      alert_rule: {
        user_id: userId,
      },
    },
  });

  if (!alertHistory) {
    throw new AppError('NOT_FOUND', '告警历史记录不存在或无权访问', 404);
  }

  // 删除记录
  const deleted = await prisma.alertHistory.delete({
    where: { id: alertId },
  });

  return deleted;
}

/**
 * 批量标记告警为已读
 * @param alertIds - 告警历史 ID 列表
 * @param userId - 用户 ID (用于权限验证)
 * @returns 更新的记录数量
 */
export async function markMultipleAsRead(alertIds: string[], userId: string) {
  const result = await prisma.alertHistory.updateMany({
    where: {
      id: { in: alertIds },
      alert_rule: {
        user_id: userId,
      },
    },
    data: {
      status: 'read',
      read_at: new Date(),
    },
  });

  return result.count;
}

/**
 * 批量删除告警历史记录
 * @param alertIds - 告警历史 ID 列表
 * @param userId - 用户 ID (用于权限验证)
 * @returns 删除的记录数量
 */
export async function deleteMultipleAlertHistory(alertIds: string[], userId: string) {
  const result = await prisma.alertHistory.deleteMany({
    where: {
      id: { in: alertIds },
      alert_rule: {
        user_id: userId,
      },
    },
  });

  return result.count;
}

/**
 * 获取用户未读告警数量
 * @param userId - 用户 ID
 * @param endpointId - 端点 ID (可选)
 * @returns 未读告警数量
 */
export async function getUnreadAlertCount(userId: string, endpointId?: string) {
  const whereClause: Record<string, unknown> = {
    status: 'unread',
    alert_rule: {
      user_id: userId,
      ...(endpointId && { endpoint_id: endpointId }),
    },
  };

  const count = await prisma.alertHistory.count({ where: whereClause });

  return count;
}

/**
 * 清理过期的告警历史记录
 * 删除超过保留天数的告警记录
 *
 * @returns 清理结果（删除的记录数、执行时间等）
 */
export async function cleanupAlertHistory() {
  const startTime = Date.now();

  try {
    alertLogger.info('开始清理过期告警历史记录', {
      retentionDays: config.alertRetentionDays,
    });

    // 计算保留期限的截止日期
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - config.alertRetentionDays);

    alertLogger.debug('清理告警历史记录', {
      cutoffDate: retentionDate.toISOString(),
    });

    // 删除超过保留天数的告警历史记录
    const result = await prisma.alertHistory.deleteMany({
      where: {
        triggered_at: {
          lt: retentionDate, // 触发时间早于截止日期
        },
      },
    });

    const duration = Date.now() - startTime;
    alertLogger.info('告警历史清理完成', {
      deletedCount: result.count,
      durationMs: duration,
      cutoffDate: retentionDate.toISOString(),
    });

    return {
      success: true,
      deletedCount: result.count,
      durationMs: duration,
      cutoffDate: retentionDate,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    alertLogger.error('清理告警历史记录失败', error as Error, {
      durationMs: duration,
      retentionDays: config.alertRetentionDays,
    });

    return {
      success: false,
      deletedCount: 0,
      durationMs: duration,
      error: (error as Error).message,
    };
  }
}
