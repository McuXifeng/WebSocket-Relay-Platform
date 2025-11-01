/**
 * Alert Module TypeScript Types
 *
 * 职责：定义告警规则和告警历史的类型定义
 *
 * 关键规则：
 * - 所有类型定义必须与后端 Prisma 模型保持一致
 * - 枚举类型使用 TypeScript union types
 * - 所有可选字段使用 `?` 标记
 */

/**
 * 告警运算符类型
 */
export type AlertOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';

/**
 * 告警级别类型
 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/**
 * 告警历史状态类型
 */
export type AlertStatus = 'unread' | 'read' | 'processed';

/**
 * 告警规则完整数据结构 (对应 Prisma AlertRule 模型)
 */
export interface AlertRule {
  id: string;
  user_id: string;
  endpoint_id: string;
  device_id: string;
  rule_name: string;
  data_key: string;
  operator: AlertOperator;
  threshold: string;
  alert_level: AlertLevel;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 告警规则公开数据结构 (API 返回格式，包含关联数据)
 */
export interface AlertRuleWithDetails extends AlertRule {
  endpoint?: {
    id: string;
    name: string;
  };
  device?: {
    id: string;
    device_id: string;
    custom_name?: string;
  };
}

/**
 * 创建告警规则请求参数
 */
export interface CreateAlertRuleRequest {
  endpoint_id: string;
  device_id: string;
  rule_name: string;
  data_key: string;
  operator: AlertOperator;
  threshold: string;
  alert_level: AlertLevel;
  enabled?: boolean;
}

/**
 * 更新告警规则请求参数
 */
export interface UpdateAlertRuleRequest {
  rule_name?: string;
  data_key?: string;
  operator?: AlertOperator;
  threshold?: string;
  alert_level?: AlertLevel;
  enabled?: boolean;
}

/**
 * 获取告警规则列表响应
 */
export interface GetAlertRulesResponse {
  rules: AlertRuleWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * 创建告警规则响应
 */
export interface CreateAlertRuleResponse {
  rule: AlertRule;
}

/**
 * 告警历史完整数据结构 (对应 Prisma AlertHistory 模型)
 */
export interface AlertHistory {
  id: string;
  alert_rule_id: string;
  device_id: string;
  triggered_at: Date;
  data_key: string;
  triggered_value: string;
  threshold: string;
  alert_level: AlertLevel;
  status: AlertStatus;
  read_at?: Date;
  processed_at?: Date;
  notification_sent: boolean;
  email_sent: boolean;
}

/**
 * 告警历史公开数据结构 (API 返回格式，包含关联数据)
 */
export interface AlertHistoryWithDetails extends AlertHistory {
  alert_rule?: {
    id: string;
    rule_name: string;
  };
  device?: {
    id: string;
    device_id: string;
    custom_name?: string;
  };
}

/**
 * 获取告警历史列表响应
 */
export interface GetAlertHistoryResponse {
  data: AlertHistoryWithDetails[];
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 获取未读告警数量响应
 */
export interface GetUnreadCountResponse {
  count: number;
}

/**
 * 标记告警为已读请求参数
 */
export interface MarkAlertAsReadRequest {
  ids: string[];
}

/**
 * 标记告警为已处理请求参数
 */
export interface MarkAlertAsProcessedRequest {
  ids: string[];
}

/**
 * 批量删除告警历史请求参数
 */
export interface DeleteAlertHistoryRequest {
  ids: string[];
}

/**
 * WebSocket 告警通知消息格式
 */
export interface AlertNotificationMessage {
  type: 'alert';
  alertId: string;
  ruleId: string;
  ruleName: string;
  deviceId: string;
  deviceName: string;
  dataKey: string;
  triggeredValue: string;
  threshold: string;
  operator: AlertOperator;
  alertLevel: AlertLevel;
  triggeredAt: Date;
}
