import { api } from './api';
import type { BanLogQuery, BanLogResponse, UserPublic, Endpoint } from '@websocket-relay/shared';

/**
 * 封禁管理服务
 *
 * 职责: 处理所有与封禁/禁用功能相关的 API 调用
 * Epic 10 Story 10.4: 前端管理员封禁界面
 */

/**
 * 封禁用户
 *
 * @param userId 用户ID
 * @param reason 封禁原因(可选,最大255字符)
 * @returns 封禁后的用户信息
 */
export async function banUser(userId: string, reason?: string): Promise<UserPublic> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: { message: '用户已封禁', user: UserPublic }
  // 拦截器返回: { message, user }
  const response = await api.post<{ message: string; user: UserPublic }>(
    `/admin/users/${userId}/ban`,
    { reason }
  );
  return response.user;
}

/**
 * 解封用户
 *
 * @param userId 用户ID
 * @returns 解封后的用户信息
 */
export async function unbanUser(userId: string): Promise<UserPublic> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: { message: '用户已解封', user: UserPublic }
  // 拦截器返回: { message, user }
  const response = await api.post<{ message: string; user: UserPublic }>(
    `/admin/users/${userId}/unban`
  );
  return response.user;
}

/**
 * 禁用端点
 *
 * @param endpointId 端点ID
 * @param reason 禁用原因(可选,最大255字符)
 * @returns 禁用后的端点信息
 */
export async function disableEndpoint(endpointId: string, reason?: string): Promise<Endpoint> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: { message: '端点已禁用', endpoint: Endpoint }
  // 拦截器返回: { message, endpoint }
  const response = await api.post<{ message: string; endpoint: Endpoint }>(
    `/admin/endpoints/${endpointId}/disable`,
    { reason }
  );
  return response.endpoint;
}

/**
 * 启用端点
 *
 * @param endpointId 端点ID
 * @returns 启用后的端点信息
 */
export async function enableEndpoint(endpointId: string): Promise<Endpoint> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: { message: '端点已启用', endpoint: Endpoint }
  // 拦截器返回: { message, endpoint }
  const response = await api.post<{ message: string; endpoint: Endpoint }>(
    `/admin/endpoints/${endpointId}/enable`
  );
  return response.endpoint;
}

/**
 * 查询封禁日志
 *
 * @param query 查询参数(目标类型、操作类型、时间范围、操作者ID、分页)
 * @returns 封禁日志列表和总数
 */
export async function getBanLogs(query: BanLogQuery): Promise<BanLogResponse> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: { logs: BanLog[], total: number }
  // 拦截器直接返回后端响应体,无需二次提取
  return await api.get<BanLogResponse>('/admin/ban-logs', { params: query });
}
