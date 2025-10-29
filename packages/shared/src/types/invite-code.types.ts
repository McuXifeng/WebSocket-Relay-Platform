/**
 * InviteCode 相关类型定义
 * 用于前后端共享
 */

/**
 * InviteCode 完整类型
 */
export interface InviteCode {
  id: string;
  code: string;
  expires_at: Date | null;
  used_by: string | null;
  used_at: Date | null;
  created_by: string;
  created_at: Date;
}

/**
 * InviteCode 公开类型
 * 用于前端展示（不包含创建者信息）
 */
export interface InviteCodePublic {
  id: string;
  code: string;
  expires_at: Date | null;
  is_used: boolean;
  used_at: Date | null;
  created_at: Date;
}

/**
 * 创建授权码请求
 * 支持 Unix 时间戳（秒）或 ISO 8601 字符串
 */
export interface CreateInviteCodeRequest {
  expires_at?: string | number;
}

/**
 * 创建授权码响应
 */
export interface CreateInviteCodeResponse {
  id: string;
  code: string;
  expires_at: string | null;
  created_at: string;
}

/**
 * 授权码验证响应
 */
export interface InviteCodeValidateResponse {
  valid: boolean;
  message?: string;
}

/**
 * 授权码列表项
 * 用于管理员查询授权码列表（包含关联的用户名）
 */
export interface InviteCodeListItem {
  id: string;
  code: string;
  expires_at: string | null;
  used_by: string | null;
  used_by_username: string | null;
  used_at: string | null;
  created_by: string;
  created_by_username: string;
  created_at: string;
}

/**
 * 获取授权码列表响应
 * 管理员专用 API：GET /api/admin/invite-codes
 */
export type GetInviteCodesResponse = InviteCodeListItem[];
