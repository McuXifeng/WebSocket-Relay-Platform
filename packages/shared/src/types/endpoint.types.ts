// Endpoint types

/**
 * 端点数据模型 (对应 Prisma Endpoint 模型)
 */
export interface Endpoint {
  id: string; // UUID 主键
  endpoint_id: string; // 8-12 位唯一 ID
  name: string; // 端点名称
  user_id: string; // 所属用户 ID
  created_at: Date; // 创建时间
  last_active_at: Date | null; // 最后活跃时间
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
