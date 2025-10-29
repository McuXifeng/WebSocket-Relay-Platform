/**
 * Auth 相关类型定义
 * 用于前后端共享
 */

import { UserPublic } from './user.types';

/**
 * 用户注册请求
 */
export interface RegisterRequest {
  inviteCode: string; // 8-12 位授权码
  username: string; // 最大 30 字符
  email: string; // 有效邮箱格式
  password: string; // 最小 8 字符
}

/**
 * 用户注册响应
 */
export interface RegisterResponse {
  user: UserPublic;
}

/**
 * 用户登录请求
 */
export interface LoginRequest {
  username: string; // 用户名
  password: string; // 明文密码
}

/**
 * 用户登录响应
 */
export interface LoginResponse {
  token: string; // JWT Token
  user: UserPublic; // 用户公开信息(不含 password_hash)
}

/**
 * JWT Payload 结构
 */
export interface JwtPayload {
  userId: string; // 用户 ID
  username: string; // 用户名
  isAdmin: boolean; // 是否为管理员
  iat?: number; // issued at (自动生成)
  exp?: number; // expiration (自动生成)
}
