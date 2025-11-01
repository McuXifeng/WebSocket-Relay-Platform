import { api } from './api';
import type {
  AlertRule,
  AlertRuleWithDetails,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  GetAlertRulesResponse,
  CreateAlertRuleResponse,
  AlertHistory,
  AlertHistoryWithDetails,
  GetAlertHistoryResponse,
  GetUnreadCountResponse,
  MarkAlertAsReadRequest,
  MarkAlertAsProcessedRequest,
  DeleteAlertHistoryRequest,
} from '@websocket-relay/shared';

/**
 * Alert API Service
 *
 * 职责：封装所有告警相关的 API 调用
 *
 * 关键规则：
 * - 前端永远通过 services/ 层调用 API，禁止直接使用 Axios
 * - 使用泛型确保类型安全
 * - Service 层不处理具体错误提示，将错误抛出给组件层处理
 */

/* ==================== Alert Rule APIs ==================== */

/**
 * 创建告警规则
 *
 * 调用 POST /api/alert-rules API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param data 创建告警规则请求数据
 * @returns Promise<AlertRule> 创建的告警规则信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function createAlertRule(data: CreateAlertRuleRequest): Promise<AlertRule> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { rule: {...} } }
  // 拦截器返回: { data: { rule: {...} } }
  const response = await api.post<{ data: CreateAlertRuleResponse }>('/alert-rules', data);
  return (response as unknown as { data: CreateAlertRuleResponse }).data.rule;
}

/**
 * 获取告警规则列表
 *
 * 调用 GET /api/alert-rules API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param params 查询参数 (endpoint_id, enabled, page, pageSize)
 * @returns Promise<GetAlertRulesResponse> 告警规则列表和分页信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function getAlertRules(params?: {
  endpoint_id?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<GetAlertRulesResponse> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { rules: [...], pagination: {...} } }
  // 拦截器返回: { rules: [...], pagination: {...} }
  const response = await api.get<{ data: GetAlertRulesResponse }>('/alert-rules', { params });
  return (response as unknown as { data: GetAlertRulesResponse }).data;
}

/**
 * 获取单个告警规则详情
 *
 * 调用 GET /api/alert-rules/:ruleId API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param ruleId 告警规则ID
 * @returns Promise<AlertRuleWithDetails> 告警规则详细信息
 * @throws {AxiosError} API 请求失败时抛出错误 (404: 规则不存在, 403: 无权访问)
 */
export async function getAlertRuleById(ruleId: string): Promise<AlertRuleWithDetails> {
  const response = await api.get<{ data: { rule: AlertRuleWithDetails } }>(
    `/alert-rules/${ruleId}`
  );
  return (response as unknown as { data: { rule: AlertRuleWithDetails } }).data.rule;
}

/**
 * 更新告警规则
 *
 * 调用 PUT /api/alert-rules/:ruleId API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param ruleId 告警规则ID
 * @param data 更新数据
 * @returns Promise<AlertRule> 更新后的告警规则信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function updateAlertRule(
  ruleId: string,
  data: UpdateAlertRuleRequest
): Promise<AlertRule> {
  const response = await api.put<{ data: { rule: AlertRule } }>(`/alert-rules/${ruleId}`, data);
  return (response as unknown as { data: { rule: AlertRule } }).data.rule;
}

/**
 * 删除告警规则
 *
 * 调用 DELETE /api/alert-rules/:ruleId API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param ruleId 告警规则ID
 * @returns Promise<void>
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function deleteAlertRule(ruleId: string): Promise<void> {
  await api.delete(`/alert-rules/${ruleId}`);
}

/**
 * 启用/禁用告警规则
 *
 * 调用 PATCH /api/alert-rules/:ruleId/toggle API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param ruleId 告警规则ID
 * @param enabled 是否启用
 * @returns Promise<AlertRule> 更新后的告警规则信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function toggleAlertRule(ruleId: string, enabled: boolean): Promise<AlertRule> {
  const response = await api.patch<{ data: { rule: AlertRule } }>(`/alert-rules/${ruleId}/toggle`, {
    enabled,
  });
  return (response as unknown as { data: { rule: AlertRule } }).data.rule;
}

/* ==================== Alert History APIs ==================== */

/**
 * 获取告警历史列表
 *
 * 调用 GET /api/alert-history API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param params 查询参数 (endpoint_id, device_id, alert_level, status, start_time, end_time, page, pageSize)
 * @returns Promise<GetAlertHistoryResponse> 告警历史列表和分页信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function getAlertHistory(params?: {
  endpoint_id?: string;
  device_id?: string;
  alert_level?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  pageSize?: number;
}): Promise<GetAlertHistoryResponse> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { data: [...], page, pageSize, total } }
  // 拦截器返回: { data: { data: [...], page, pageSize, total } }
  const response = await api.get<{ data: GetAlertHistoryResponse }>('/alert-history', { params });
  return (response as unknown as { data: GetAlertHistoryResponse }).data;
}

/**
 * 获取单个告警历史详情
 *
 * 调用 GET /api/alert-history/:alertId API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param alertId 告警历史ID
 * @returns Promise<AlertHistoryWithDetails> 告警历史详细信息
 * @throws {AxiosError} API 请求失败时抛出错误 (404: 告警不存在, 403: 无权访问)
 */
export async function getAlertHistoryById(alertId: string): Promise<AlertHistoryWithDetails> {
  const response = await api.get<{ data: { alert: AlertHistoryWithDetails } }>(
    `/alert-history/${alertId}`
  );
  return (response as unknown as { data: { alert: AlertHistoryWithDetails } }).data.alert;
}

/**
 * 标记告警为已读
 *
 * 调用 PATCH /api/alert-history/:alertId/read API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param alertId 告警历史ID
 * @returns Promise<AlertHistory> 更新后的告警历史信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function markAlertAsRead(alertId: string): Promise<AlertHistory> {
  const response = await api.patch<{ data: { alert: AlertHistory } }>(
    `/alert-history/${alertId}/read`
  );
  return (response as unknown as { data: { alert: AlertHistory } }).data.alert;
}

/**
 * 标记告警为已处理
 *
 * 调用 PATCH /api/alert-history/:alertId/processed API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param alertId 告警历史ID
 * @returns Promise<AlertHistory> 更新后的告警历史信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function markAlertAsProcessed(alertId: string): Promise<AlertHistory> {
  const response = await api.patch<{ data: { alert: AlertHistory } }>(
    `/alert-history/${alertId}/processed`
  );
  return (response as unknown as { data: { alert: AlertHistory } }).data.alert;
}

/**
 * 删除告警历史
 *
 * 调用 DELETE /api/alert-history/:alertId API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param alertId 告警历史ID
 * @returns Promise<void>
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function deleteAlertHistory(alertId: string): Promise<void> {
  await api.delete(`/alert-history/${alertId}`);
}

/**
 * 批量标记告警为已读
 *
 * 调用 POST /api/alert-history/batch/read API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param data 请求数据 (包含告警ID数组)
 * @returns Promise<{ updated: number }> 更新的数量
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function batchMarkAlertAsRead(
  data: MarkAlertAsReadRequest
): Promise<{ updated: number }> {
  const response = await api.post<{ data: { updated: number } }>('/alert-history/batch/read', data);
  return (response as unknown as { data: { updated: number } }).data;
}

/**
 * 批量标记告警为已处理
 *
 * 调用 POST /api/alert-history/batch/processed API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param data 请求数据 (包含告警ID数组)
 * @returns Promise<{ updated: number }> 更新的数量
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function batchMarkAlertAsProcessed(
  data: MarkAlertAsProcessedRequest
): Promise<{ updated: number }> {
  const response = await api.post<{ data: { updated: number } }>(
    '/alert-history/batch/processed',
    data
  );
  return (response as unknown as { data: { updated: number } }).data;
}

/**
 * 批量删除告警历史
 *
 * 调用 POST /api/alert-history/batch/delete API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param data 请求数据 (包含告警ID数组)
 * @returns Promise<{ deleted: number }> 删除的数量
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function batchDeleteAlertHistory(
  data: DeleteAlertHistoryRequest
): Promise<{ deleted: number }> {
  const response = await api.post<{ data: { deleted: number } }>(
    '/alert-history/batch/delete',
    data
  );
  return (response as unknown as { data: { deleted: number } }).data;
}

/**
 * 获取未读告警数量
 *
 * 调用 GET /api/alert-history/unread-count API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param endpointId 可选的端点ID (如果指定，则只统计该端点的未读告警)
 * @returns Promise<number> 未读告警数量
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function getUnreadAlertCount(endpointId?: string): Promise<number> {
  const params = endpointId ? { endpoint_id: endpointId } : undefined;
  const response = await api.get<{ data: GetUnreadCountResponse }>('/alert-history/unread-count', {
    params,
  });
  return (response as unknown as { data: GetUnreadCountResponse }).data.count;
}
