/**
 * Mock implementation of auth.service for testing
 */
import type { LoginRequest, LoginResponse, RegisterRequest } from '@shared/types/auth.types';
import type { UserPublic } from '@shared/types/user.types';

/**
 * Mock 用户注册
 */
export function register(data: RegisterRequest): Promise<UserPublic> {
  // 模拟成功的注册响应
  return Promise.resolve({
    id: 'mock-user-id',
    username: data.username,
    email: data.email,
    is_admin: false,
    created_at: new Date(),
    is_active: true,
    banned_at: null,
    banned_reason: null,
    banned_by: null,
  });
}

/**
 * Mock 用户登录
 */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  // 模拟成功的登录响应
  return Promise.resolve({
    token: 'mock-jwt-token',
    user: {
      id: 'mock-user-id',
      username: credentials.username,
      email: `${credentials.username}@example.com`,
      is_admin: false,
      created_at: new Date(),
      is_active: true,
      banned_at: null,
      banned_reason: null,
      banned_by: null,
    },
  });
}

/**
 * Mock 获取当前用户信息
 */
export function getCurrentUser(): Promise<UserPublic> {
  // 模拟成功的用户信息响应
  return Promise.resolve({
    id: 'mock-user-id',
    username: 'testuser',
    email: 'testuser@example.com',
    is_admin: false,
    created_at: new Date(),
    is_active: true,
    banned_at: null,
    banned_reason: null,
    banned_by: null,
  });
}

/**
 * Mock 用户登出
 */
export async function logout(): Promise<void> {
  return Promise.resolve();
}
