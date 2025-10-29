import { api } from './api';
import type {
  EndpointWithUrl,
  GetEndpointsResponse,
  CreateEndpointRequest,
  CreateEndpointResponse,
  EndpointStatsResponse,
} from '@websocket-relay/shared/types/endpoint.types';
import type { GetMessagesResponse } from '@websocket-relay/shared/types/message.types';

/**
 * Endpoint API Service
 *
 * 职责：封装所有端点相关的 API 调用
 *
 * 关键规则：
 * - 前端永远通过 services/ 层调用 API，禁止直接使用 Axios
 * - 使用泛型确保类型安全
 * - Service 层不处理具体错误提示，将错误抛出给组件层处理
 */

/**
 * 获取当前用户的所有端点
 *
 * 调用 GET /api/endpoints API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @returns Promise<EndpointWithUrl[]> 端点列表
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function getEndpoints(): Promise<EndpointWithUrl[]> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { endpoints: [...] } }
  // 拦截器返回: { data: { endpoints: [...] } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: GetEndpointsResponse }>('/endpoints');
  return response.data.endpoints;
}

/**
 * 创建新端点 (预留给后续故事使用)
 *
 * 调用 POST /api/endpoints API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param data 创建端点请求数据
 * @returns Promise<EndpointWithUrl> 创建的端点信息
 * @throws {AxiosError} API 请求失败时抛出错误
 */
export async function createEndpoint(data: CreateEndpointRequest): Promise<EndpointWithUrl> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { endpoint: {...} } }
  // 拦截器返回: { data: { endpoint: {...} } }
  // 需要再提取一次 data 字段
  const response = await api.post<{ data: CreateEndpointResponse }>('/endpoints', data);
  return response.data.endpoint;
}

/**
 * 获取单个端点详情
 *
 * 调用 GET /api/endpoints/:id API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param id 端点的数据库主键 (UUID)
 * @returns Promise<EndpointWithUrl> 端点详细信息
 * @throws {AxiosError} API 请求失败时抛出错误 (404: 端点不存在, 403: 无权访问)
 */
export async function getEndpointById(id: string): Promise<EndpointWithUrl> {
  // CRITICAL: 必须正确提取嵌套的 data.endpoint 字段
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { endpoint: {...} } }
  // 拦截器返回: { data: { endpoint: {...} } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: { endpoint: EndpointWithUrl } }>(`/endpoints/${id}`);
  return response.data.endpoint;
}

/**
 * 删除端点
 *
 * 调用 DELETE /api/endpoints/:id API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param id 端点的数据库主键 (UUID)
 * @returns Promise<void> 删除成功后无返回值
 * @throws {AxiosError} API 请求失败时抛出错误 (404: 端点不存在, 403: 无权访问)
 */
export async function deleteEndpoint(id: string): Promise<void> {
  // 删除 API 返回 { data: { message: "端点已删除" } }
  // 但组件层不需要使用返回消息，直接返回 void
  await api.delete(`/endpoints/${id}`);
}

/**
 * 获取端点统计数据
 *
 * 调用 GET /api/endpoints/:id/stats API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param id 端点的数据库主键 (UUID)
 * @returns Promise<EndpointStatsResponse> 统计数据响应
 * @throws {AxiosError} API 请求失败时抛出错误 (404: 端点不存在, 403: 无权访问)
 */
export async function getEndpointStats(id: string): Promise<EndpointStatsResponse> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { current_connections: ..., total_connections: ..., ... } }
  // 拦截器返回: { data: { current_connections: ..., total_connections: ..., ... } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: EndpointStatsResponse }>(`/endpoints/${id}/stats`);
  return response.data;
}

/**
 * 获取端点历史消息
 * Story 3.10: 历史消息存储和展示功能
 *
 * 调用 GET /api/endpoints/:id/messages API
 * 需要 JWT 认证 (通过 apiClient 拦截器自动附加)
 *
 * @param id 端点的数据库主键 (UUID)
 * @returns Promise<GetMessagesResponse> 历史消息列表 (最新 50 条)
 * @throws {AxiosError} API 请求失败时抛出错误 (404: 端点不存在, 403: 无权访问)
 */
export async function getEndpointMessages(id: string): Promise<GetMessagesResponse> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { messages: [...] } }
  // 拦截器返回: { data: { messages: [...] } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: GetMessagesResponse }>(`/endpoints/${id}/messages`);
  return response.data;
}
