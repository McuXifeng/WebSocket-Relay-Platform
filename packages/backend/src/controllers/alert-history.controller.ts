/**
 * Alert History Controller (Epic 6 Story 6.5)
 * 处理告警历史相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import * as alertHistoryService from '../services/alert-history.service';
import { AppError } from '../middleware/error-handler.middleware';

/**
 * 获取告警历史记录（支持筛选和分页）
 * @route GET /api/alert-history
 */
export async function getAlertHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从查询参数获取筛选和分页条件（使用 snake_case 与前端 API 一致）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {
      endpoint_id: _endpoint_id, // 保留以便将来可能使用
      alert_level,
      device_id,
      status,
      start_time,
      end_time,
      page = '1',
      pageSize = '20',
    } = req.query;

    // 构建筛选条件
    const filter: alertHistoryService.AlertHistoryFilter = {};
    if (alert_level === 'info' || alert_level === 'warning' || alert_level === 'critical') {
      filter.alertLevel = alert_level;
    }
    if (device_id) {
      filter.deviceId = device_id as string;
    }
    if (status === 'unread' || status === 'read' || status === 'processed') {
      filter.status = status;
    }
    if (start_time) {
      filter.startDate = new Date(start_time as string);
    }
    if (end_time) {
      filter.endDate = new Date(end_time as string);
    }

    // 构建分页参数
    const pagination = {
      page: parseInt(page as string, 10),
      pageSize: parseInt(pageSize as string, 10),
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await alertHistoryService.getAlertHistory(
      userId,
      endpointId as string | undefined,
      filter,
      pagination
    );

    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取单个告警详情
 * @route GET /api/alert-history/:alertId
 */
export async function getAlertHistoryById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { alertId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const alertHistory = await alertHistoryService.getAlertHistoryById(alertId, userId);

    res.status(200).json({ data: alertHistory });
  } catch (error) {
    next(error);
  }
}

/**
 * 标记告警为已读
 * @route PATCH /api/alert-history/:alertId/read
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { alertId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const updated = await alertHistoryService.markAsRead(alertId, userId);

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * 标记告警为已处理
 * @route PATCH /api/alert-history/:alertId/processed
 */
export async function markAsProcessed(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { alertId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const updated = await alertHistoryService.markAsProcessed(alertId, userId);

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * 删除告警历史记录
 * @route DELETE /api/alert-history/:alertId
 */
export async function deleteAlertHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { alertId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await alertHistoryService.deleteAlertHistory(alertId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * 批量标记告警为已读
 * @route POST /api/alert-history/batch/read
 */
export async function markMultipleAsRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds)) {
      throw new AppError('VALIDATION_ERROR', 'alertIds 必须是数组', 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const count = await alertHistoryService.markMultipleAsRead(alertIds, userId);

    res.status(200).json({ data: { count } });
  } catch (error) {
    next(error);
  }
}

/**
 * 批量删除告警历史记录
 * @route POST /api/alert-history/batch/delete
 */
export async function deleteMultipleAlertHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds)) {
      throw new AppError('VALIDATION_ERROR', 'alertIds 必须是数组', 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const count = await alertHistoryService.deleteMultipleAlertHistory(alertIds, userId);

    res.status(200).json({ data: { count } });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取未读告警数量
 * @route GET /api/alert-history/unread/count
 */
export async function getUnreadAlertCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { endpointId } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const count = await alertHistoryService.getUnreadAlertCount(
      userId,
      endpointId as string | undefined
    );

    res.status(200).json({ data: { count } });
  } catch (error) {
    next(error);
  }
}
