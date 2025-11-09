/**
 * Ban 相关类型定义
 * 用于前后端共享
 * Epic 10 Story 10.3: 后端封禁API实现
 */

/**
 * 封禁用户请求
 */
export interface BanUserRequest {
  reason?: string; // 封禁原因(可选,最大255字符)
}

/**
 * 禁用端点请求
 */
export interface DisableEndpointRequest {
  reason?: string; // 禁用原因(可选,最大255字符)
}

/**
 * 封禁日志查询参数
 */
export interface BanLogQuery {
  target_type?: 'user' | 'endpoint'; // 过滤目标类型
  action?: 'ban' | 'unban' | 'disable' | 'enable'; // 过滤操作类型
  start_date?: string; // 开始时间(ISO格式)
  end_date?: string; // 结束时间(ISO格式)
  operator_id?: string; // 过滤操作者ID
  page?: number; // 页码(默认1)
  page_size?: number; // 每页大小(默认20)
}

/**
 * 封禁日志
 */
export interface BanLog {
  id: string;
  target_type: 'user' | 'endpoint';
  target_id: string;
  action: 'ban' | 'unban' | 'disable' | 'enable';
  reason: string | null;
  operator_id: string;
  created_at: Date;
}

/**
 * 封禁日志响应(包含分页信息)
 */
export interface BanLogResponse {
  logs: BanLog[];
  total: number;
}

/**
 * 封禁日志展示(包含操作者和目标名称)
 */
export interface BanLogWithOperator extends BanLog {
  operator_username: string; // 操作者用户名
  target_name: string; // 用户名或端点名称
}
