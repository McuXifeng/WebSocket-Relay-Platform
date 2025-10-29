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
import { PrismaClient } from '@prisma/client';

// 创建 Prisma 客户端
const prisma = new PrismaClient();

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

  // 2. 查询端点的转发模式和自定义帧头
  let endpoint;
  try {
    endpoint = await prisma.endpoint.findUnique({
      where: { id: dbEndpointId },
      select: { id: true, forwarding_mode: true, custom_header: true },
    });

    if (!endpoint) {
      console.error(`[消息路由] 端点不存在: ${endpointId} (${dbEndpointId})`);
      return;
    }
  } catch (error) {
    console.error(`[消息路由] 查询端点失败: ${endpointId}`, error);
    return;
  }

  // 3. 根据转发模式处理消息
  let processedMessage: unknown;
  let messageStr: string;

  switch (endpoint.forwarding_mode) {
    case 'DIRECT': {
      // 直接转发原始消息，不做任何处理
      processedMessage = message;
      // eslint-disable-next-line no-console
      console.log(`[消息路由] 转发模式: DIRECT, 端点: ${endpointId}`);

      // 对于 DIRECT 模式，需要特殊处理序列化
      if (typeof message === 'string') {
        messageStr = message;
      } else if (Buffer.isBuffer(message)) {
        messageStr = message.toString();
      } else {
        messageStr = JSON.stringify(message);
      }
      break;
    }

    case 'JSON': {
      // 使用现有的 normalizeMessage 逻辑
      processedMessage = normalizeMessage(message);
      messageStr = JSON.stringify(processedMessage);
      // eslint-disable-next-line no-console
      console.log(`[消息路由] 转发模式: JSON, 端点: ${endpointId}`);
      break;
    }

    case 'CUSTOM_HEADER': {
      // 简单字符串拼接：custom_header + 原始消息
      const customHeader = endpoint.custom_header || '';

      // 将原始消息转换为字符串
      let messageContent: string;
      if (typeof message === 'string') {
        messageContent = message;
      } else if (Buffer.isBuffer(message)) {
        messageContent = message.toString();
      } else {
        messageContent = JSON.stringify(message);
      }

      // 拼接帧头和消息内容
      messageStr = customHeader + messageContent;
      processedMessage = messageStr; // 保持一致性，虽然不会在广播中使用

      // eslint-disable-next-line no-console
      console.log(
        `[消息路由] 转发模式: CUSTOM_HEADER, 端点: ${endpointId}, 帧头: "${customHeader}", 原始消息: "${messageContent}", 转发消息: "${messageStr}"`
      );
      break;
    }

    default: {
      // 默认使用 JSON 模式（向后兼容）
      processedMessage = normalizeMessage(message);
      messageStr = JSON.stringify(processedMessage);
      console.warn(
        `[消息路由] 未知转发模式: ${String(endpoint.forwarding_mode)}, 使用默认 JSON 模式, 端点: ${endpointId}`
      );
      break;
    }
  }

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
