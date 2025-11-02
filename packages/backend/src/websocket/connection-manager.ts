/**
 * ConnectionManager
 * 管理 WebSocket 连接池,维护端点到连接的映射关系
 * 使用 Map<endpoint_id, Set<WebSocket>> 数据结构
 */

import { WebSocket } from 'ws';
import { updateEndpointStatsBatched } from '../services/stats.service';

/**
 * ConnectionManager 类
 * 单例模式管理所有 WebSocket 连接
 */
class ConnectionManager {
  // 连接映射: endpoint_id -> Set<WebSocket>
  private connections: Map<string, Set<WebSocket>> = new Map();
  // 用户连接映射: user_id -> Set<WebSocket> (Epic 6 Story 6.5 新增)
  private userConnections: Map<string, Set<WebSocket>> = new Map();

  /**
   * 添加连接到指定端点
   * @param endpointId - 端点 ID
   * @param socket - WebSocket 连接对象
   * @param dbEndpointId - 端点的数据库 UUID (用于更新统计数据)
   * @param userId - 用户 ID (可选，用于告警通知推送，Epic 6 Story 6.5 新增)
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async addConnection(
    endpointId: string,
    socket: WebSocket,
    dbEndpointId: string,
    userId?: string
  ): Promise<void> {
    // 如果该端点还没有连接集合,先创建一个
    if (!this.connections.has(endpointId)) {
      this.connections.set(endpointId, new Set());
    }

    // 将 socket 添加到该端点的连接集合中
    const sockets = this.connections.get(endpointId);
    if (sockets) {
      sockets.add(socket);
    }

    // 如果提供了 userId，也维护用户连接映射 (Epic 6 Story 6.5)
    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.add(socket);
      }
    }

    // 更新统计数据（使用批量模式，减少数据库写入）
    updateEndpointStatsBatched(dbEndpointId, 'connect');
  }

  /**
   * 从指定端点移除连接
   * @param endpointId - 端点 ID
   * @param socket - WebSocket 连接对象
   * @param dbEndpointId - 端点的数据库 UUID (用于更新统计数据)
   * @param userId - 用户 ID (可选，Epic 6 Story 6.5 新增)
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async removeConnection(
    endpointId: string,
    socket: WebSocket,
    dbEndpointId: string,
    userId?: string
  ): Promise<void> {
    const sockets = this.connections.get(endpointId);
    if (sockets) {
      sockets.delete(socket);

      // 如果该端点的连接集合为空,删除该端点的 Map 条目(防止内存泄漏)
      if (sockets.size === 0) {
        this.connections.delete(endpointId);
      }
    }

    // 如果提供了 userId，也从用户连接映射中移除 (Epic 6 Story 6.5)
    if (userId) {
      const userSockets = this.userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket);

        // 如果该用户的连接集合为空，删除该用户的 Map 条目
        if (userSockets.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }

    // 更新统计数据（使用批量模式，减少数据库写入）
    updateEndpointStatsBatched(dbEndpointId, 'disconnect');
  }

  /**
   * 获取指定端点的所有连接
   * @param endpointId - 端点 ID
   * @returns 该端点的所有 WebSocket 连接集合,如果不存在则返回空 Set
   */
  getConnections(endpointId: string): Set<WebSocket> {
    return this.connections.get(endpointId) || new Set();
  }

  /**
   * 检查指定端点是否存在某个连接
   * @param endpointId - 端点 ID
   * @param socket - WebSocket 连接对象
   * @returns true 表示存在,false 表示不存在
   */
  hasConnection(endpointId: string, socket: WebSocket): boolean {
    const sockets = this.connections.get(endpointId);
    return sockets ? sockets.has(socket) : false;
  }

  /**
   * 获取所有活跃的端点 ID
   * @returns 所有有活跃连接的端点 ID 数组
   */
  getActiveEndpoints(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * 获取指定端点的连接数量
   * @param endpointId - 端点 ID
   * @returns 该端点的连接数量
   */
  getConnectionCount(endpointId: string): number {
    const sockets = this.connections.get(endpointId);
    return sockets ? sockets.size : 0;
  }

  /**
   * 获取所有连接的总数量
   * @returns 所有端点的连接总数
   */
  getTotalConnectionCount(): number {
    let total = 0;
    for (const sockets of this.connections.values()) {
      total += sockets.size;
    }
    return total;
  }

  /**
   * 根据设备ID查找指定端点中的设备连接（Epic 6 Story 6.4 新增）
   * @param endpointId - 端点 ID
   * @param deviceId - 设备标识符（device_id字段，如"micu"）
   * @returns 匹配的 WebSocket 连接对象，如果不存在则返回 null
   */
  getDeviceConnection(endpointId: string, deviceId: string): WebSocket | null {
    const connections = this.getConnections(endpointId);

    // 遍历该端点的所有连接，查找匹配的设备
    for (const socket of connections) {
      // 使用类型断言来访问扩展的 deviceId 属性
      const extSocket = socket as WebSocket & { deviceId?: string };
      if (extSocket.deviceId === deviceId) {
        return socket;
      }
    }

    // 未找到匹配的设备连接
    return null;
  }

  /**
   * 向指定用户的所有连接推送消息（Epic 6 Story 6.5 新增）
   * 用于告警通知等需要向用户所有连接推送的场景
   * @param userId - 用户 ID
   * @param message - 要发送的消息对象
   * @returns 成功发送的连接数量
   */
  broadcastToUser(userId: string, message: unknown): number {
    const connections = this.userConnections.get(userId);
    if (!connections || connections.size === 0) {
      return 0;
    }

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
        }
      }
    });

    return sentCount;
  }

  /**
   * 获取指定用户的活跃连接数量（Epic 6 Story 6.5 新增）
   * @param userId - 用户 ID
   * @returns 该用户的活跃连接数量
   */
  getUserConnectionCount(userId: string): number {
    const connections = this.userConnections.get(userId);
    return connections ? connections.size : 0;
  }
}

// 导出单例实例
export const connectionManager = new ConnectionManager();
