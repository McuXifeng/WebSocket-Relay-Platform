/**
 * MessageRouter
 * 消息路由和广播逻辑
 * 负责将消息转发给同一端点的所有其他客户端
 */

import { WebSocket } from 'ws';
import { connectionManager } from './connection-manager';
import { updateEndpointStats } from '../services/stats.service';
import { saveMessageAsync } from '../services/message.service';
import { nanoid } from 'nanoid';

/**
 * 扩展 WebSocket 接口以包含连接标识和设备信息
 */
interface ExtendedWebSocket extends WebSocket {
  connectionId?: string;
  deviceId?: string; // 设备唯一标识
  customName?: string; // 设备自定义名称
}

/**
 * WebSocket 标准消息格式
 */
interface WebSocketMessage {
  type: 'message' | 'ping';
  data: unknown;
  timestamp: number;
}

/**
 * 获取发送者信息
 * @param socket - WebSocket 连接对象
 * @returns 发送者标识字符串
 *
 * 优先级：
 * 1. 设备自定义名称 (customName) - 如果设备已通过 identify 消息注册
 * 2. 连接 ID (connectionId) - 未注册设备的匿名标识
 */
function getSenderInfo(socket: WebSocket): string {
  const extSocket = socket as ExtendedWebSocket;

  // 优先返回设备自定义名称（如果已识别）
  if (extSocket.customName) {
    return extSocket.customName;
  }

  // 如果 socket 已有连接 ID,直接返回
  if (extSocket.connectionId) {
    return `连接ID: ${extSocket.connectionId}`;
  }

  // 否则生成新的连接 ID 并存储
  extSocket.connectionId = nanoid(8);
  return `连接ID: ${extSocket.connectionId}`;
}

/**
 * 标准化消息格式
 * 将任意格式的消息转换为标准的 WebSocketMessage 格式
 * @param rawMessage - 原始消息对象
 * @returns 标准化后的消息对象
 */
function normalizeMessage(rawMessage: unknown): WebSocketMessage {
  // 如果消息已经符合标准格式(包含 type 和 data 字段),直接返回
  if (
    typeof rawMessage === 'object' &&
    rawMessage !== null &&
    'type' in rawMessage &&
    'data' in rawMessage
  ) {
    const msg = rawMessage as { type: string; data: unknown; timestamp?: number };
    return {
      type: 'message',
      data: msg.data,
      timestamp: msg.timestamp || Date.now(),
    };
  }

  // 否则包装为标准格式
  return {
    type: 'message',
    data: rawMessage,
    timestamp: Date.now(),
  };
}

/**
 * 广播消息给指定端点的所有连接(排除发送者)
 * @param endpointId - 端点 ID
 * @param message - 要广播的消息对象
 * @param senderSocket - 发送者的 WebSocket 连接(会被排除在广播对象之外)
 * @param dbEndpointId - 端点的数据库 UUID (用于更新统计数据)
 */
export async function broadcastToEndpoint(
  endpointId: string,
  message: unknown,
  senderSocket: WebSocket,
  dbEndpointId: string
): Promise<void> {
  // 1. 获取该端点的所有连接
  const connections = connectionManager.getConnections(endpointId);

  // 2. 标准化消息格式
  const normalizedMessage = normalizeMessage(message);

  // 3. 序列化消息(在循环外部统一序列化,避免重复操作)
  const messageStr = JSON.stringify(normalizedMessage);

  // 4. 异步存储消息到数据库 (不阻塞广播)
  const senderInfo = getSenderInfo(senderSocket);
  saveMessageAsync(dbEndpointId, messageStr, senderInfo).catch((err) => {
    console.error('消息存储失败:', err);
  });

  // 5. 遍历所有连接,排除发送者
  connections.forEach((socket) => {
    // 排除发送者本身,确保不回显消息
    if (socket !== senderSocket) {
      try {
        // 发送消息给该客户端
        socket.send(messageStr);
      } catch (error) {
        // 记录错误但不中断循环,确保一个客户端失败不影响其他客户端
        console.error(
          `Failed to send message to client in endpoint ${endpointId}:`,
          error instanceof Error ? error.message : error
        );
      }
    }
  });

  // 6. 更新统计数据: 递增消息数和更新 last_active_at
  await updateEndpointStats(dbEndpointId, 'message');
}
