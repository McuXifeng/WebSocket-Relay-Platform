/**
 * User 相关类型定义
 * 用于前后端共享
 */

/**
 * User 完整类型（包含敏感字段）
 * 仅在后端使用
 */
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_admin: boolean;
  created_at: Date;
}

/**
 * User 公开类型（不包含敏感字段）
 * 用于前端展示和 API 响应
 */
export interface UserPublic {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: Date;
}

/**
 * 用户注册请求
 */
export interface UserRegisterRequest {
  username: string;
  email: string;
  password: string;
  invite_code: string;
}

/**
 * 用户登录请求
 */
export interface UserLoginRequest {
  username: string;
  password: string;
}

/**
 * 用户登录响应
 */
export interface UserLoginResponse {
  user: UserPublic;
  token: string;
}

/**
 * 用户列表项
 * 用于管理员查询用户列表（包含端点数量）
 */
export interface UserListItem {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  endpoint_count: number;
}

/**
 * 获取用户列表响应
 * 管理员专用 API：GET /api/admin/users
 */
export type GetUsersResponse = UserListItem[];
