// Endpoint types

/**
 * 转发模式枚举
 */
export enum ForwardingMode {
  DIRECT = 'DIRECT', // 直接转发原始消息
  JSON = 'JSON', // JSON 标准化转发
  CUSTOM_HEADER = 'CUSTOM_HEADER', // 自定义帧头转发
}

/**
 * 端点数据模型 (对应 Prisma Endpoint 模型)
 */
export interface Endpoint {
  id: string; // UUID 主键
  endpoint_id: string; // 8-12 位唯一 ID
  name: string; // 端点名称
  user_id: string; // 所属用户 ID
  forwarding_mode: ForwardingMode; // 转发模式
  custom_header: string | null; // 自定义帧头 (仅在 CUSTOM_HEADER 模式下使用)
  created_at: Date; // 创建时间
  last_active_at: Date | null; // 最后活跃时间
  // Epic 10 Story 10.2: 禁用功能字段
  is_disabled: boolean; // 端点禁用状态(true表示被禁用)
  disabled_at: Date | null; // 禁用时间
  disabled_reason: string | null; // 禁用原因
  disabled_by: string | null; // 禁用操作者ID
}

/**
 * 端点扩展类型 (包含 WebSocket URL)
 */
export interface EndpointWithUrl extends Endpoint {
  websocket_url: string; // 格式: wss://domain.com/ws/{endpoint_id}
}

/**
 * 创建端点请求
 */
export interface CreateEndpointRequest {
  name?: string; // 可选,默认"未命名端点"
  forwarding_mode?: ForwardingMode; // 可选,默认 JSON
  custom_header?: string; // 可选,自定义帧头 (仅在 CUSTOM_HEADER 模式下使用)
}

/**
 * 创建端点响应
 */
export interface CreateEndpointResponse {
  endpoint: EndpointWithUrl;
}

/**
 * 查询端点列表响应
 */
export interface GetEndpointsResponse {
  endpoints: EndpointWithUrl[];
}

/**
 * 端点统计数据响应类型
 */
export interface EndpointStatsResponse {
  current_connections: number; // 当前在线连接数
  total_connections: number; // 累计连接总数
  total_messages: number; // 累计消息总数
  last_active_at: Date | null; // 最后活跃时间
}
