import { api } from './api';
import type {
  CreateInviteCodeRequest,
  CreateInviteCodeResponse,
  GetInviteCodesResponse,
  GetUsersResponse,
  EndpointWithUrl,
} from '@websocket-relay/shared';

/**
 * 管理员服务
 *
 * 职责: 处理所有与管理员功能相关的 API 调用
 */

/**
 * 创建授权码
 *
 * @param data 创建授权码请求数据(可选的过期时间)
 * @returns 创建授权码响应(包含授权码信息)
 */
export async function createInviteCode(
  data: CreateInviteCodeRequest
): Promise<CreateInviteCodeResponse> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: { id, code, expires_at, created_at }
  // 拦截器直接返回后端响应体，无需二次提取
  return await api.post<CreateInviteCodeResponse>('/admin/invite-codes', data);
}

/**
 * 获取授权码列表
 *
 * @returns 授权码列表(包含关联的用户名信息)
 */
export async function getInviteCodes(): Promise<GetInviteCodesResponse> {
  // apiClient 响应拦截器已提取 response.data 字段
  // 后端返回: [...] (授权码数组)
  // 拦截器直接返回后端响应体，无需二次提取
  return await api.get<GetInviteCodesResponse>('/admin/invite-codes');
}

/**
 * 获取用户列表
 *
 * @returns 用户列表(包含端点数量)
 */
export async function getUsers(): Promise<GetUsersResponse> {
  return await api.get<GetUsersResponse>('/admin/users');
}

/**
 * 获取指定用户的端点列表
 * Story 5.3: 用户管理页面 UI 优化
 *
 * @param userId 用户 ID
 * @returns 用户的端点列表
 */
export async function getUserEndpoints(userId: string): Promise<EndpointWithUrl[]> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { endpoints: [...] } }
  // 拦截器返回: { data: { endpoints: [...] } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: { endpoints: EndpointWithUrl[] } }>(
    `/admin/users/${userId}/endpoints`
  );
  return response.data.endpoints;
}
