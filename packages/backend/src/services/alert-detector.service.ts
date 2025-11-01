/**
 * Alert Detector Service
 * 处理告警检测和触发相关的业务逻辑（Epic 6 Story 6.5）
 */

import type { Prisma } from '@prisma/client';
import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { alertLogger } from '../config/logger.js';

/**
 * 告警历史记录类型（包含关联数据）
 */
type TriggeredAlert = Prisma.AlertHistoryGetPayload<{
  include: {
    alert_rule: {
      select: {
        rule_name: true;
        user_id: true;
        user: {
          select: {
            email: true;
          };
        };
      };
    };
    device: {
      select: {
        device_id: true;
        custom_name: true;
      };
    };
  };
}>;

/**
 * 告警规则类型（包含关联数据）
 */
type AlertRuleWithRelations = Prisma.AlertRuleGetPayload<{
  include: {
    device: {
      select: {
        device_id: true;
        custom_name: true;
      };
    };
    user: {
      select: {
        id: true;
        username: true;
        email: true;
      };
    };
  };
}>;

/**
 * 告警防抖时间（毫秒）- 同一规则在此时间内不重复触发
 * 从环境变量读取，默认5分钟（300000ms）
 */
const ALERT_DEBOUNCE_TIME_MS = config.alertDebounceMinutes * 60 * 1000;

/**
 * 设备离线判定时间（毫秒）- 设备超过此时间无数据视为离线
 * 默认10分钟（600000ms）
 */
const DEVICE_OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * 比较运算符类型
 */
type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=';

/**
 * 评估告警规则是否触发
 *
 * @param value - 实际值（设备数据值）
 * @param operator - 比较运算符
 * @param threshold - 阈值
 * @returns 是否触发告警
 */
function evaluateCondition(value: string, operator: Operator, threshold: string): boolean {
  // 尝试将值转换为数字进行数值比较
  const numValue = parseFloat(value);
  const numThreshold = parseFloat(threshold);

  // 如果两个值都可以转换为数字，进行数值比较
  if (!isNaN(numValue) && !isNaN(numThreshold)) {
    switch (operator) {
      case '>':
        return numValue > numThreshold;
      case '<':
        return numValue < numThreshold;
      case '>=':
        return numValue >= numThreshold;
      case '<=':
        return numValue <= numThreshold;
      case '==':
        return numValue === numThreshold;
      case '!=':
        return numValue !== numThreshold;
      default:
        return false;
    }
  }

  // 否则进行字符串比较
  switch (operator) {
    case '==':
      return value === threshold;
    case '!=':
      return value !== threshold;
    default:
      // 字符串不支持大小比较运算符
      alertLogger.warn(`不支持的字符串比较运算符: ${operator}`, { value, threshold });
      return false;
  }
}

/**
 * 检查设备是否离线
 *
 * @param deviceId - 设备 ID
 * @returns 是否离线
 */
async function isDeviceOffline(deviceId: string): Promise<boolean> {
  // 查询设备最新数据的时间戳
  const latestData = await prisma.deviceData.findFirst({
    where: { device_id: deviceId },
    orderBy: { timestamp: 'desc' },
    select: { timestamp: true },
  });

  // 如果没有数据，视为离线
  if (!latestData) {
    return true;
  }

  // 计算时间差
  const now = new Date();
  const timeDiff = now.getTime() - latestData.timestamp.getTime();

  // 超过阈值视为离线
  return timeDiff > DEVICE_OFFLINE_THRESHOLD_MS;
}

/**
 * 检查告警防抖 - 同一规则在防抖时间内不重复触发
 *
 * @param ruleId - 告警规则 ID
 * @returns 是否处于防抖期（true表示需要跳过）
 */
async function shouldDebounce(ruleId: string): Promise<boolean> {
  // 查询该规则最近的告警记录
  const latestAlert = await prisma.alertHistory.findFirst({
    where: { alert_rule_id: ruleId },
    orderBy: { triggered_at: 'desc' },
    select: { triggered_at: true },
  });

  // 如果没有历史记录，不需要防抖
  if (!latestAlert) {
    return false;
  }

  // 计算时间差
  const now = new Date();
  const timeDiff = now.getTime() - latestAlert.triggered_at.getTime();

  // 如果在防抖时间内，跳过
  return timeDiff < ALERT_DEBOUNCE_TIME_MS;
}

/**
 * 获取设备最新数据值
 *
 * @param deviceId - 设备 ID
 * @param dataKey - 数据键
 * @returns 最新数据值，如果不存在返回 null
 */
async function getLatestDeviceData(deviceId: string, dataKey: string): Promise<string | null> {
  const latestData = await prisma.deviceData.findFirst({
    where: {
      device_id: deviceId,
      data_key: dataKey,
    },
    orderBy: { timestamp: 'desc' },
    select: { data_value: true },
  });

  return latestData?.data_value || null;
}

/**
 * 触发告警 - 创建告警历史记录
 *
 * @param ruleId - 告警规则 ID
 * @param deviceId - 设备 ID
 * @param dataKey - 数据键
 * @param triggeredValue - 触发值
 * @param threshold - 阈值
 * @param alertLevel - 告警级别
 * @returns 创建的告警历史记录
 */
export async function triggerAlert(
  ruleId: string,
  deviceId: string,
  dataKey: string,
  triggeredValue: string,
  threshold: string,
  alertLevel: string
): Promise<TriggeredAlert> {
  const alertHistory = await prisma.alertHistory.create({
    data: {
      alert_rule_id: ruleId,
      device_id: deviceId,
      data_key: dataKey,
      triggered_value: triggeredValue,
      threshold,
      alert_level: alertLevel,
      status: 'unread',
      notification_sent: false,
      email_sent: false,
    },
    include: {
      alert_rule: {
        select: {
          rule_name: true,
          user_id: true,
          user: {
            select: {
              email: true, // 添加用户邮箱字段
            },
          },
        },
      },
      device: {
        select: {
          device_id: true,
          custom_name: true,
        },
      },
    },
  });

  alertLogger.info('告警触发成功', {
    ruleId,
    deviceId,
    dataKey,
    triggeredValue,
    threshold,
    alertLevel,
  });

  return alertHistory;
}

/**
 * 评估单个告警规则
 *
 * @param rule - 告警规则
 * @returns 是否触发告警，如果触发返回告警历史记录
 */
export async function evaluateRule(rule: AlertRuleWithRelations): Promise<TriggeredAlert | null> {
  try {
    // 1. 检查设备是否离线
    const offline = await isDeviceOffline(rule.device_id);
    if (offline) {
      // console.log(`设备离线，跳过告警检测: 规则=${rule.id}, 设备=${rule.device_id}`);
      return null;
    }

    // 2. 获取设备最新数据
    const latestValue = await getLatestDeviceData(rule.device_id, rule.data_key);
    if (latestValue === null) {
      alertLogger.warn('设备无对应数据键的记录，跳过告警检测', {
        ruleId: rule.id,
        deviceId: rule.device_id,
        dataKey: rule.data_key,
      });
      return null;
    }

    // 3. 评估规则条件
    const shouldTrigger = evaluateCondition(latestValue, rule.operator, rule.threshold);
    if (!shouldTrigger) {
      // console.log(`规则条件不满足，未触发告警: 规则=${rule.id}, 值=${latestValue}, 阈值=${rule.threshold}`);
      return null;
    }

    // 4. 检查告警防抖
    const debounce = await shouldDebounce(rule.id);
    if (debounce) {
      // console.log(`规则处于防抖期，跳过告警触发: 规则=${rule.id}`);
      return null;
    }

    // 5. 触发告警
    const alertHistory = await triggerAlert(
      rule.id,
      rule.device_id,
      rule.data_key,
      latestValue,
      rule.threshold,
      rule.alert_level
    );

    return alertHistory;
  } catch (error) {
    alertLogger.error('评估告警规则失败', error as Error, {
      ruleId: rule.id,
      ruleName: rule.rule_name,
      deviceId: rule.device_id,
    });
    return null;
  }
}

/**
 * 检查所有启用的告警规则
 *
 * @returns 触发的告警历史记录列表
 */
export async function checkAlerts(): Promise<TriggeredAlert[]> {
  const startTime = Date.now();

  try {
    alertLogger.debug('开始告警检测...');

    // 1. 查询所有启用的告警规则
    const enabledRules = await prisma.alertRule.findMany({
      where: { enabled: true },
      include: {
        device: {
          select: {
            device_id: true,
            custom_name: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true, // 添加邮箱字段，用于发送邮件通知
          },
        },
      },
    });

    alertLogger.info(`查询到 ${enabledRules.length} 条启用的告警规则`);

    // 2. 逐个评估规则
    const triggeredAlerts: TriggeredAlert[] = [];
    const errors: Array<{ ruleId: string; error: string }> = [];

    for (const rule of enabledRules) {
      try {
        const alertHistory = await evaluateRule(rule);
        if (alertHistory) {
          triggeredAlerts.push(alertHistory);
        }
      } catch (error) {
        // 记录单个规则的错误，但继续处理其他规则
        errors.push({
          ruleId: rule.id,
          error: (error as Error).message,
        });
        alertLogger.error('评估单个规则时发生错误', error as Error, {
          ruleId: rule.id,
          ruleName: rule.rule_name,
        });
      }
    }

    const duration = Date.now() - startTime;
    alertLogger.info('告警检测完成', {
      triggeredAlertsCount: triggeredAlerts.length,
      totalRulesChecked: enabledRules.length,
      errorsCount: errors.length,
      durationMs: duration,
    });

    // 如果有错误，记录详细错误信息
    if (errors.length > 0) {
      alertLogger.warn('部分告警规则检测失败', { errors });
    }

    return triggeredAlerts;
  } catch (error) {
    const duration = Date.now() - startTime;
    alertLogger.error('告警检测过程发生致命错误', error as Error, {
      durationMs: duration,
    });
    return [];
  }
}
