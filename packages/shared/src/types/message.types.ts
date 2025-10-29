/**
 * 消息相关类型定义
 * Story 3.10: 历史消息存储和展示功能
 */

/**
 * 消息实体
 */
export interface Message {
  /** 消息唯一标识 */
  id: string;
  /** 关联的端点 ID */
  endpoint_id: string;
  /** 消息内容 (最大 5000 字符) */
  content: string;
  /** 发送者信息 (IP、连接ID、设备名称等) */
  sender_info: string | null;
  /** 消息创建时间 (ISO 8601 格式) */
  created_at: string;
}

/**
 * 获取历史消息响应
 */
export interface GetMessagesResponse {
  /** 消息列表 (最新 50 条，按时间降序) */
  messages: Message[];
}
