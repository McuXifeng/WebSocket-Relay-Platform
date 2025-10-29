import { api } from './api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@shared/types/auth.types';
import type { UserPublic } from '@shared/types/user.types';

/**
 * 认证服务
 *
 * 职责：处理所有与用户认证相关的 API 调用
 */

/**
 * 用户注册
 *
 * @param data 注册信息（授权码、用户名、邮箱、密码）
 * @returns 注册响应（包含用户信息）
 */
export async function register(data: RegisterRequest): Promise<UserPublic> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { user: {...} } }
  // 拦截器返回: { data: { user: {...} } }
  // 需要再提取一次 data 字段
  const response = await api.post<{ data: RegisterResponse }>('/auth/register', data);
  return response.data.user;
}

/**
 * 用户登录
 *
 * @param credentials 登录凭据
 * @returns 登录响应（包含 token 和用户信息）
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { token, user } }
  // 拦截器返回: { data: { token, user } }
  // 需要再提取一次 data 字段
  const response = await api.post<{ data: LoginResponse }>('/auth/login', credentials);
  return response.data; // 正确提取嵌套的 data 字段
}

/**
 * 获取当前用户信息（验证 token）
 *
 * @returns 当前用户信息
 */
export async function getCurrentUser(): Promise<UserPublic> {
  // apiClient 响应拦截器已提取一层 data 字段
  // 后端返回: { data: { user: {...} } }
  // 拦截器返回: { data: { user: {...} } }
  // 需要再提取一次 data 字段
  const response = await api.get<{ data: { user: UserPublic } }>('/auth/me');
  return response.data.user;
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  // 后端可能有登出 API（例如清除刷新 token）
  // 目前只需清除本地状态
  return Promise.resolve();
}
