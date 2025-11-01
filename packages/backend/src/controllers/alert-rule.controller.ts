/**
 * Alert Rule Controller (Epic 6 Story 6.5)
 * 处理告警规则相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import * as alertRuleService from '../services/alert-rule.service';
import { AppError } from '../middleware/error-handler.middleware';

/**
 * 创建告警规则
 * @route POST /api/alert-rules
 */
export async function createAlertRule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从请求体提取告警规则数据（使用snake_case与前端API一致）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const {
      endpoint_id,
      device_id,
      rule_name,
      data_key,
      operator,
      threshold,
      alert_level,
      enabled = true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    } = req.body;

    // 参数验证
    if (
      !endpoint_id ||
      !device_id ||
      !rule_name ||
      !data_key ||
      !operator ||
      !threshold ||
      !alert_level
    ) {
      throw new AppError('VALIDATION_ERROR', '缺少必填参数', 400);
    }

    // 验证运算符
    const validOperators = ['>', '<', '>=', '<=', '==', '!='];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (!validOperators.includes(operator)) {
      throw new AppError('VALIDATION_ERROR', '无效的运算符', 400);
    }

    // 验证告警级别
    const validLevels = ['info', 'warning', 'critical'];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (!validLevels.includes(alert_level)) {
      throw new AppError('VALIDATION_ERROR', '无效的告警级别', 400);
    }

    // 调用 Service 层创建告警规则
    const rule = await alertRuleService.createAlertRule({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      endpointId: endpoint_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      deviceId: device_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ruleName: rule_name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dataKey: data_key,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      operator,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      threshold,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      alertLevel: alert_level,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      enabled,
    });

    res.status(201).json({
      data: rule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取用户的所有告警规则
 * @route GET /api/alert-rules
 */
export async function getAlertRules(
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

    // 从查询参数获取筛选条件
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { endpointId, enabled } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const rules = await alertRuleService.getAlertRules({
      userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      endpointId: endpointId as string | undefined,
      enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
    });

    res.status(200).json({
      data: rules,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取单个告警规则详情
 * @route GET /api/alert-rules/:ruleId
 */
export async function getAlertRuleById(
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

    const { ruleId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const rule = await alertRuleService.getAlertRuleById(ruleId, userId);

    res.status(200).json({
      data: rule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 更新告警规则
 * @route PUT /api/alert-rules/:ruleId
 */
export async function updateAlertRule(
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

    const { ruleId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { rule_name, data_key, operator, threshold, alert_level, enabled } = req.body;

    // 验证运算符（如果提供）
    if (operator) {
      const validOperators = ['>', '<', '>=', '<=', '==', '!='];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (!validOperators.includes(operator)) {
        throw new AppError('VALIDATION_ERROR', '无效的运算符', 400);
      }
    }

    // 验证告警级别（如果提供）
    if (alert_level) {
      const validLevels = ['info', 'warning', 'critical'];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (!validLevels.includes(alert_level)) {
        throw new AppError('VALIDATION_ERROR', '无效的告警级别', 400);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const rule = await alertRuleService.updateAlertRule(ruleId, userId, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ruleName: rule_name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      dataKey: data_key,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      operator,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      threshold,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      alertLevel: alert_level,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      enabled,
    });

    res.status(200).json({
      data: rule,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 删除告警规则
 * @route DELETE /api/alert-rules/:ruleId
 */
export async function deleteAlertRule(
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

    const { ruleId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await alertRuleService.deleteAlertRule(ruleId, userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * 启用/禁用告警规则
 * @route PATCH /api/alert-rules/:ruleId/toggle
 */
export async function toggleAlertRule(
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

    const { ruleId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', 'enabled 必须是布尔值', 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const rule = await alertRuleService.toggleAlertRule(ruleId, userId, enabled);

    res.status(200).json({
      data: rule,
    });
  } catch (error) {
    next(error);
  }
}
