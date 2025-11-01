/**
 * Alert Rule Service
 * 处理告警规则创建和管理相关的业务逻辑
 */

import prisma from '../config/database.js';
import { AppError } from '../middleware/error-handler.middleware.js';

/**
 * 每个用户最多创建的告警规则数量限制
 */
const MAX_ALERT_RULES_PER_USER = 50;

/**
 * 支持的比较运算符列表
 */
const VALID_OPERATORS = ['>', '<', '>=', '<=', '==', '!='] as const;
type Operator = (typeof VALID_OPERATORS)[number];

/**
 * 支持的告警级别列表
 */
const VALID_ALERT_LEVELS = ['info', 'warning', 'critical'] as const;
type AlertLevel = (typeof VALID_ALERT_LEVELS)[number];

/**
 * 创建告警规则请求参数
 */
export interface CreateAlertRuleParams {
  userId: string;
  endpointId: string;
  deviceId: string;
  ruleName: string;
  dataKey: string;
  operator: string;
  threshold: string;
  alertLevel: string;
  enabled?: boolean;
}

/**
 * 更新告警规则请求参数
 */
export interface UpdateAlertRuleParams {
  ruleName?: string;
  dataKey?: string;
  operator?: string;
  threshold?: string;
  alertLevel?: string;
  enabled?: boolean;
}

/**
 * 查询告警规则请求参数
 */
export interface GetAlertRulesParams {
  userId: string;
  endpointId?: string;
  deviceId?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * 验证运算符是否合法
 *
 * @param operator - 运算符字符串
 * @returns 是否合法
 */
function isValidOperator(operator: string): operator is Operator {
  return VALID_OPERATORS.includes(operator as Operator);
}

/**
 * 验证告警级别是否合法
 *
 * @param alertLevel - 告警级别字符串
 * @returns 是否合法
 */
function isValidAlertLevel(alertLevel: string): alertLevel is AlertLevel {
  return VALID_ALERT_LEVELS.includes(alertLevel as AlertLevel);
}

/**
 * 验证告警规则参数
 *
 * @param params - 创建或更新参数
 * @throws {AppError} 400 - 参数不合法
 */
function validateAlertRuleParams(params: CreateAlertRuleParams | UpdateAlertRuleParams): void {
  // 验证运算符
  if (params.operator && !isValidOperator(params.operator)) {
    throw new AppError(
      'INVALID_OPERATOR',
      `运算符不合法，支持的运算符: ${VALID_OPERATORS.join(', ')}`,
      400
    );
  }

  // 验证告警级别
  if (params.alertLevel && !isValidAlertLevel(params.alertLevel)) {
    throw new AppError(
      'INVALID_ALERT_LEVEL',
      `告警级别不合法，支持的级别: ${VALID_ALERT_LEVELS.join(', ')}`,
      400
    );
  }

  // 验证规则名称长度
  if (params.ruleName && params.ruleName.length > 100) {
    throw new AppError('INVALID_RULE_NAME', '规则名称长度不能超过100个字符', 400);
  }

  // 验证阈值长度
  if (params.threshold && params.threshold.length > 100) {
    throw new AppError('INVALID_THRESHOLD', '阈值长度不能超过100个字符', 400);
  }
}

/**
 * 检查用户告警规则数量是否超过限制
 *
 * @param userId - 用户 ID
 * @throws {AppError} 400 - 告警规则数量已达到上限
 */
async function checkAlertRuleLimit(userId: string): Promise<void> {
  const count = await prisma.alertRule.count({
    where: { user_id: userId },
  });

  if (count >= MAX_ALERT_RULES_PER_USER) {
    throw new AppError(
      'ALERT_RULE_LIMIT_REACHED',
      `已达到告警规则数量上限（${MAX_ALERT_RULES_PER_USER}条）`,
      400
    );
  }
}

/**
 * 验证端点是否属于用户
 *
 * @param endpointId - 端点 ID
 * @param userId - 用户 ID
 * @throws {AppError} 403 - 无权访问该端点
 * @throws {AppError} 404 - 端点不存在
 */
async function validateEndpointOwnership(endpointId: string, userId: string): Promise<void> {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { user_id: true },
  });

  if (!endpoint) {
    throw new AppError('ENDPOINT_NOT_FOUND', '端点不存在', 404);
  }

  if (endpoint.user_id !== userId) {
    throw new AppError('FORBIDDEN', '无权访问该端点', 403);
  }
}

/**
 * 验证设备是否存在且属于该端点
 *
 * @param deviceId - 设备 ID
 * @param endpointId - 端点 ID
 * @throws {AppError} 404 - 设备不存在或不属于该端点
 */
async function validateDeviceOwnership(deviceId: string, endpointId: string): Promise<void> {
  const device = await prisma.device.findFirst({
    where: {
      id: deviceId,
      endpoint_id: endpointId,
    },
  });

  if (!device) {
    throw new AppError('DEVICE_NOT_FOUND', '设备不存在或不属于该端点', 404);
  }
}

/**
 * 创建告警规则
 *
 * @param params - 创建参数
 * @returns 创建的告警规则
 * @throws {AppError} 400 - 参数不合法或数量超过限制
 * @throws {AppError} 403 - 无权访问该端点
 * @throws {AppError} 404 - 端点或设备不存在
 */
export async function createAlertRule(params: CreateAlertRuleParams) {
  // 1. 验证参数
  validateAlertRuleParams(params);

  // 2. 验证端点权限
  await validateEndpointOwnership(params.endpointId, params.userId);

  // 3. 验证设备存在性
  await validateDeviceOwnership(params.deviceId, params.endpointId);

  // 4. 检查规则数量限制
  await checkAlertRuleLimit(params.userId);

  // 5. 创建告警规则
  const alertRule = await prisma.alertRule.create({
    data: {
      user_id: params.userId,
      endpoint_id: params.endpointId,
      device_id: params.deviceId,
      rule_name: params.ruleName,
      data_key: params.dataKey,
      operator: params.operator,
      threshold: params.threshold,
      alert_level: params.alertLevel,
      enabled: params.enabled ?? true,
    },
    include: {
      device: {
        select: {
          device_id: true,
          custom_name: true,
        },
      },
    },
  });

  return alertRule;
}

/**
 * 获取告警规则列表
 *
 * @param params - 查询参数
 * @returns 告警规则列表和分页信息
 */
export async function getAlertRules(params: GetAlertRulesParams) {
  const { userId, endpointId, deviceId, enabled, page = 1, pageSize = 20 } = params;

  // 构建查询条件
  const where: {
    user_id: string;
    endpoint_id?: string;
    device_id?: string;
    enabled?: boolean;
  } = { user_id: userId };
  if (endpointId) where.endpoint_id = endpointId;
  if (deviceId) where.device_id = deviceId;
  if (enabled !== undefined) where.enabled = enabled;

  // 计算分页偏移量
  const skip = (page - 1) * pageSize;

  // 查询总数和规则列表
  const [total, rules] = await Promise.all([
    prisma.alertRule.count({ where }),
    prisma.alertRule.findMany({
      where,
      include: {
        device: {
          select: {
            device_id: true,
            custom_name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return {
    rules,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 根据 ID 获取告警规则详情
 *
 * @param ruleId - 告警规则 ID
 * @param userId - 用户 ID
 * @returns 告警规则详情
 * @throws {AppError} 404 - 告警规则不存在
 * @throws {AppError} 403 - 无权访问该告警规则
 */
export async function getAlertRuleById(ruleId: string, userId: string) {
  const rule = await prisma.alertRule.findUnique({
    where: { id: ruleId },
    include: {
      device: {
        select: {
          device_id: true,
          custom_name: true,
        },
      },
    },
  });

  if (!rule) {
    throw new AppError('ALERT_RULE_NOT_FOUND', '告警规则不存在', 404);
  }

  if (rule.user_id !== userId) {
    throw new AppError('FORBIDDEN', '无权访问该告警规则', 403);
  }

  return rule;
}

/**
 * 更新告警规则
 *
 * @param ruleId - 告警规则 ID
 * @param userId - 用户 ID
 * @param params - 更新参数
 * @returns 更新后的告警规则
 * @throws {AppError} 400 - 参数不合法
 * @throws {AppError} 403 - 无权访问该告警规则
 * @throws {AppError} 404 - 告警规则不存在
 */
export async function updateAlertRule(
  ruleId: string,
  userId: string,
  params: UpdateAlertRuleParams
) {
  // 1. 验证参数
  validateAlertRuleParams(params);

  // 2. 验证规则权限
  await getAlertRuleById(ruleId, userId);

  // 3. 更新告警规则
  const updatedRule = await prisma.alertRule.update({
    where: { id: ruleId },
    data: {
      rule_name: params.ruleName,
      data_key: params.dataKey,
      operator: params.operator,
      threshold: params.threshold,
      alert_level: params.alertLevel,
      enabled: params.enabled,
    },
    include: {
      device: {
        select: {
          device_id: true,
          custom_name: true,
        },
      },
    },
  });

  return updatedRule;
}

/**
 * 删除告警规则
 *
 * @param ruleId - 告警规则 ID
 * @param userId - 用户 ID
 * @throws {AppError} 403 - 无权访问该告警规则
 * @throws {AppError} 404 - 告警规则不存在
 */
export async function deleteAlertRule(ruleId: string, userId: string): Promise<void> {
  // 1. 验证规则权限
  await getAlertRuleById(ruleId, userId);

  // 2. 删除告警规则（级联删除告警历史）
  await prisma.alertRule.delete({
    where: { id: ruleId },
  });
}

/**
 * 启用/禁用告警规则
 *
 * @param ruleId - 告警规则 ID
 * @param userId - 用户 ID
 * @param enabled - 是否启用
 * @returns 更新后的告警规则
 * @throws {AppError} 403 - 无权访问该告警规则
 * @throws {AppError} 404 - 告警规则不存在
 */
export async function toggleAlertRule(ruleId: string, userId: string, enabled: boolean) {
  // 1. 验证规则权限
  await getAlertRuleById(ruleId, userId);

  // 2. 更新启用状态
  const updatedRule = await prisma.alertRule.update({
    where: { id: ruleId },
    data: { enabled },
    select: {
      id: true,
      enabled: true,
      updated_at: true,
    },
  });

  return updatedRule;
}
