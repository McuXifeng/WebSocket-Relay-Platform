/**
 * Alert History Controller (Epic 6 Story 6.5, Story 8.1)
 * 处理告警历史相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import * as alertHistoryService from '../services/alert-history.service';
import { AppError } from '../middleware/error-handler.middleware';
import { verifyMarkReadToken } from '../utils/token.util'; // Story 8.1
import { usedTokensService } from '../services/used-tokens.service'; // Story 8.1
import prisma from '../config/database'; // Story 8.1

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
      endpoint_id,
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
      endpoint_id as string | undefined,
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

    res.status(200).json({
      data: {
        alert: updated,
      },
    });
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

    res.status(200).json({
      data: {
        alert: updated,
      },
    });
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
 * @body ids - 可选，告警 ID 数组，为空时标记所有未读告警
 * @body endpoint_id - 可选，端点 ID，仅标记该端点的告警
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
    const { ids, endpoint_id } = req.body;

    // 验证 ids 参数（如果提供）
    if (ids !== undefined && !Array.isArray(ids)) {
      throw new AppError('VALIDATION_ERROR', 'ids 必须是数组', 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const count = await alertHistoryService.markMultipleAsRead(ids, userId, endpoint_id);

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

/**
 * 通过邮件 Token 标记告警为已读 (Story 8.1)
 * @route GET /api/alert/mark-read?token=xxx
 * @public 无需认证（通过 Token 验证）
 */
export async function markAsReadByToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError('VALIDATION_ERROR', '缺少 Token 参数', 400);
    }

    // 验证 Token 签名和过期时间
    let payload;
    try {
      payload = verifyMarkReadToken(token);
    } catch (error) {
      const errorMessage = (error as Error).message;

      // 根据错误类型返回不同的状态码
      if (errorMessage.includes('Invalid token signature')) {
        throw new AppError('UNAUTHORIZED', 'Token 签名无效', 401);
      } else if (errorMessage.includes('Token expired')) {
        throw new AppError('GONE', 'Token 已过期', 410);
      } else {
        throw new AppError('VALIDATION_ERROR', 'Token 格式无效', 400);
      }
    }

    // 检查 Token 是否已使用
    if (usedTokensService.isTokenUsed(token)) {
      throw new AppError('CONFLICT', 'Token 已使用', 409);
    }

    // 标记告警为已读（不需要用户认证，因为 Token 已验证）
    const alertId = payload.alertId;

    // 查询告警并获取关联的用户 ID
    const alert = await prisma.alertHistory.findUnique({
      where: { id: alertId },
      include: {
        alert_rule: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!alert) {
      throw new AppError('NOT_FOUND', '告警历史记录不存在', 404);
    }

    // 调用 service 层标记为已读
    await alertHistoryService.markAsRead(alertId, alert.alert_rule.user_id);

    // 标记 Token 为已使用
    usedTokensService.markTokenAsUsed(token);

    // 返回成功的 HTML 页面
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>操作成功</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh;">
  <div style="max-width: 400px; background-color: #ffffff; border-radius: 8px; padding: 40px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="font-size: 64px; color: #52c41a; margin-bottom: 20px;">✓</div>
    <h1 style="margin: 0 0 10px 0; color: #262626; font-size: 24px;">已成功标记为已读</h1>
    <p style="margin: 0; color: #8c8c8c; font-size: 14px;">
      告警已处理，您可以关闭此页面
    </p>
  </div>
</body>
</html>
    `.trim();

    res.status(200).type('html').send(successHtml);
  } catch (error) {
    next(error);
  }
}
