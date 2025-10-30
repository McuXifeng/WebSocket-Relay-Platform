import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import url from 'url';
import { PrismaClient, Endpoint } from '@prisma/client';
import { connectionManager } from './connection-manager';
import { broadcastToEndpoint } from './message-router';

// 扩展 WebSocket 类型以包含自定义属性
interface ExtendedWebSocket extends WebSocket {
  endpointId?: string;
  endpoint?: Endpoint;
  deviceId?: string; // 设备唯一标识（device_id字段，如"micu"）
  dbDeviceId?: string; // 设备数据库主键ID（Device表的id字段，UUID格式）
  customName?: string; // 设备自定义名称
  isCleanedUp?: boolean; // 标记是否已清理，防止重复清理
  isAlive?: boolean; // 心跳检测标志
  pingInterval?: NodeJS.Timeout; // 心跳定时器
}

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// 创建 WebSocket 服务器,监听 3001 端口
const wss = new WebSocketServer({ port: 3001 });

/**
 * 处理设备标识消息
 */
async function handleIdentify(
  socket: ExtendedWebSocket,
  message: { deviceId: string; deviceName?: string }
): Promise<void> {
  const { deviceId, deviceName } = message;
  const endpointId = socket.endpointId;
  const endpoint = socket.endpoint;

  console.log('🔍 [handleIdentify] 收到标识消息:', {
    deviceId,
    deviceName,
    endpointId,
    hasEndpoint: !!endpoint,
  });

  if (!endpointId || !endpoint) {
    console.error('❌ [handleIdentify] socket没有endpointId或endpoint');
    return;
  }

  try {
    // 查找或创建设备记录
    const device = await prisma.device.upsert({
      where: {
        endpoint_id_device_id: {
          endpoint_id: endpoint.id,
          device_id: deviceId,
        },
      },
      update: {
        last_connected_at: new Date(),
      },
      create: {
        endpoint_id: endpoint.id,
        device_id: deviceId,
        custom_name: deviceName || `设备-${deviceId.substring(0, 4)}`,
        last_connected_at: new Date(),
      },
    });

    // 存储设备信息到 socket 对象
    socket.deviceId = deviceId;
    socket.dbDeviceId = device.id; // 保存数据库主键ID，用于设备数据存储
    socket.customName = device.custom_name;
    console.log('✅ [handleIdentify] 设备标识成功:', {
      socketDeviceId: socket.deviceId,
      dbDeviceId: device.id,
      savedToSocket: { deviceId: socket.deviceId, dbDeviceId: socket.dbDeviceId },
    });

    // 响应确认消息
    socket.send(
      JSON.stringify({
        type: 'identified',
        deviceId: deviceId,
        customName: device.custom_name,
      })
    );

    // eslint-disable-next-line no-console
    console.log(`[设备标识] 端点: ${endpointId}, 设备: ${device.custom_name} (${deviceId})`);
  } catch (error) {
    console.error('Error handling device identification:', error);
  }
}

/**
 * 处理 WebSocket 连接的异步逻辑
 */
async function handleConnection(socket: ExtendedWebSocket, req: IncomingMessage): Promise<void> {
  // 解析 URL 获取 endpoint_id
  const parsedUrl = url.parse(req.url!);
  const pathname = parsedUrl.pathname;

  // 使用正则表达式提取 endpoint_id
  // 期望格式: /ws/{endpoint_id}
  const match = pathname?.match(/^\/ws\/([a-zA-Z0-9-]+)$/);
  const endpointId = match ? match[1] : null;

  // 如果 URL 格式不正确或缺少 endpoint_id,拒绝连接
  if (!endpointId) {
    // eslint-disable-next-line no-console
    console.error(`Connection rejected: Invalid URL format - ${req.url}`);

    // 发送错误消息
    socket.send(
      JSON.stringify({
        type: 'system',
        level: 'error',
        message: 'Invalid URL format',
        timestamp: Date.now(),
      })
    );

    // 关闭连接
    socket.close(1008, 'Invalid URL format');
    return;
  }

  // 验证 endpoint_id 在数据库中是否存在
  try {
    const endpoint = await prisma.endpoint.findUnique({
      where: { endpoint_id: endpointId },
    });

    // 如果 endpoint 不存在,拒绝连接
    if (!endpoint) {
      // eslint-disable-next-line no-console
      console.error(`Connection rejected: Invalid endpoint_id - ${endpointId}`);

      // 发送错误消息
      socket.send(
        JSON.stringify({
          type: 'system',
          level: 'error',
          message: 'Invalid endpoint',
          timestamp: Date.now(),
        })
      );

      // 关闭连接
      socket.close(1008, 'Invalid endpoint');
      return;
    }

    // 将 endpoint_id 和 endpoint 数据存储到 socket 对象的自定义属性中
    socket.endpointId = endpointId;
    socket.endpoint = endpoint;
    socket.isAlive = true; // 初始化心跳标志

    // 将连接添加到 ConnectionManager (传递数据库 UUID 用于统计更新)
    await connectionManager.addConnection(endpointId, socket, endpoint.id);

    // eslint-disable-next-line no-console
    console.log(`WebSocket connected to endpoint: ${endpointId}`);
  } catch (error) {
    console.error('Database error during endpoint validation:', error);

    // 发送错误消息
    socket.send(
      JSON.stringify({
        type: 'system',
        level: 'error',
        message: 'Internal server error',
        timestamp: Date.now(),
      })
    );

    // 关闭连接
    socket.close(1011, 'Internal server error');
    return;
  }

  // 消息事件处理
  socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    // 使用立即执行的异步函数处理消息
    void (async () => {
      try {
        // 获取 endpointId 和 endpoint
        const endpointId = socket.endpointId;
        const endpoint = socket.endpoint;
        if (!endpointId || !endpoint) {
          console.error('Message received from socket without endpointId or endpoint');
          return;
        }

        // 将 Buffer 转换为字符串
        let messageStr: string;
        if (Buffer.isBuffer(data)) {
          messageStr = data.toString();
        } else if (data instanceof ArrayBuffer) {
          messageStr = Buffer.from(data).toString();
        } else {
          messageStr = Buffer.concat(data).toString();
        }

        // 【修复】提前尝试检测设备标识消息（无论转发模式）
        try {
          const parsedMessage = JSON.parse(messageStr) as unknown;
          // 检查是否为设备标识消息
          if (
            typeof parsedMessage === 'object' &&
            parsedMessage !== null &&
            'type' in parsedMessage &&
            parsedMessage.type === 'identify' &&
            'deviceId' in parsedMessage &&
            typeof parsedMessage.deviceId === 'string'
          ) {
            // 处理设备标识消息
            await handleIdentify(
              socket,
              parsedMessage as { deviceId: string; deviceName?: string }
            );
            return; // 设备标识消息不进入转发流程
          }
        } catch {
          // JSON 解析失败，继续按原转发模式处理（这是预期行为，不记录错误）
        }

        // 根据端点的转发模式处理消息
        let processedMessage: unknown;

        if (endpoint.forwarding_mode === 'DIRECT' || endpoint.forwarding_mode === 'CUSTOM_HEADER') {
          // DIRECT 和 CUSTOM_HEADER 模式：完全不处理，直接传递原始字符串
          processedMessage = messageStr;
          // eslint-disable-next-line no-console
          console.log(
            `[接收消息] ${endpoint.forwarding_mode} 模式，端点: ${endpointId}, 原始消息: ${messageStr.substring(0, 50)}${messageStr.length > 50 ? '...' : ''}`
          );
        } else {
          // JSON 模式：尝试解析 JSON
          try {
            processedMessage = JSON.parse(messageStr) as unknown;
          } catch (parseError) {
            // JSON 解析失败,将原始文本包装为标准消息格式
            // eslint-disable-next-line no-console
            console.log(
              `[接收消息] JSON 解析失败，端点: ${endpointId}, 包装为标准格式: ${messageStr.substring(0, 50)}${messageStr.length > 50 ? '...' : ''}`
            );
            processedMessage = {
              type: 'message',
              data: messageStr,
              timestamp: Date.now(),
            };
          }
        }

        // 记录消息接收日志
        // eslint-disable-next-line no-console
        console.log(`[接收消息] 端点: ${endpointId}, 转发模式: ${endpoint.forwarding_mode}`);

        // 广播消息给同一端点的其他客户端 (传递数据库 UUID 用于统计更新)
        await broadcastToEndpoint(endpointId, processedMessage, socket, endpoint.id);
      } catch (error) {
        console.error('Error handling message:', error);
      }
    })();
  });

  // 清理连接的共享函数（防止重复清理）
  const cleanupConnection = async (reason: string) => {
    // 如果已经清理过，跳过
    if (socket.isCleanedUp) {
      return;
    }

    // 标记为已清理
    socket.isCleanedUp = true;

    // 清理心跳定时器
    if (socket.pingInterval) {
      clearInterval(socket.pingInterval);
      socket.pingInterval = undefined;
    }

    try {
      const storedEndpointId = socket.endpointId;
      const endpoint = socket.endpoint;

      // 从 ConnectionManager 中移除连接 (传递数据库 UUID 用于统计更新)
      if (storedEndpointId && endpoint) {
        await connectionManager.removeConnection(storedEndpointId, socket, endpoint.id);
        // eslint-disable-next-line no-console
        console.log(`WebSocket ${reason} from endpoint: ${storedEndpointId}`);
      }
    } catch (error) {
      console.error(`Error during connection cleanup (${reason}):`, error);
    }
  };

  // 心跳检测 - 每 30 秒发送 ping，检测连接是否存活
  socket.pingInterval = setInterval(() => {
    if (socket.isAlive === false) {
      // 连接已死，清理并关闭
      // eslint-disable-next-line no-console
      console.log(`WebSocket heartbeat timeout for endpoint: ${socket.endpointId}`);
      void cleanupConnection('heartbeat-timeout');
      socket.terminate(); // 强制终止连接
      return;
    }

    // 标记为未响应，等待 pong
    socket.isAlive = false;
    socket.ping();
  }, 30000); // 30 秒心跳间隔

  // pong 事件处理 - 收到 pong 说明连接存活
  socket.on('pong', () => {
    socket.isAlive = true;
  });

  // 断开事件处理
  socket.on('close', () => {
    void cleanupConnection('disconnected');
  });

  // 错误处理 - 确保异常断开时也清理连接
  socket.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
    // 错误发生时也要清理连接，防止连接泄漏
    void cleanupConnection('error-terminated');
  });
}

// 连接事件处理
wss.on('connection', (socket: WebSocket, req: IncomingMessage) => {
  // 使用 void 运算符标记 Promise 为显式忽略
  void handleConnection(socket as ExtendedWebSocket, req);
});

// 服务器错误处理
wss.on('error', (error: Error) => {
  console.error('WebSocket server error:', error);
});

export { wss };
