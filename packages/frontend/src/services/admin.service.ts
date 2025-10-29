import { api } from './api';
import type {
  CreateInviteCodeRequest,
  CreateInviteCodeResponse,
  GetInviteCodesResponse,
} from '@websocket-relay/shared/types/invite-code.types';
import type { GetUsersResponse } from '@websocket-relay/shared/types/user.types';

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
