/**
 * ConnectionManager
 * 管理 WebSocket 连接池,维护端点到连接的映射关系
 * 使用 Map<endpoint_id, Set<WebSocket>> 数据结构
 */

import { WebSocket } from 'ws';
import { updateEndpointStats } from '../services/stats.service';

/**
 * ConnectionManager 类
 * 单例模式管理所有 WebSocket 连接
 */
class ConnectionManager {
  // 连接映射: endpoint_id -> Set<WebSocket>
  private connections: Map<string, Set<WebSocket>> = new Map();

  /**
   * 添加连接到指定端点
   * @param endpointId - 端点 ID
   * @param socket - WebSocket 连接对象
   * @param dbEndpointId - 端点的数据库 UUID (用于更新统计数据)
   */
  async addConnection(endpointId: string, socket: WebSocket, dbEndpointId: string): Promise<void> {
    // 如果该端点还没有连接集合,先创建一个
    if (!this.connections.has(endpointId)) {
      this.connections.set(endpointId, new Set());
    }

    // 将 socket 添加到该端点的连接集合中
    const sockets = this.connections.get(endpointId);
    if (sockets) {
      sockets.add(socket);
    }

    // 更新统计数据
    await updateEndpointStats(dbEndpointId, 'connect');
  }

  /**
   * 从指定端点移除连接
   * @param endpointId - 端点 ID
   * @param socket - WebSocket 连接对象
   * @param dbEndpointId - 端点的数据库 UUID (用于更新统计数据)
   */
  async removeConnection(
    endpointId: string,
    socket: WebSocket,
    dbEndpointId: string
  ): Promise<void> {
    const sockets = this.connections.get(endpointId);
    if (sockets) {
      sockets.delete(socket);

      // 如果该端点的连接集合为空,删除该端点的 Map 条目(防止内存泄漏)
      if (sockets.size === 0) {
        this.connections.delete(endpointId);
      }
    }

    // 更新统计数据
    await updateEndpointStats(dbEndpointId, 'disconnect');
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
}

// 导出单例实例
export const connectionManager = new ConnectionManager();
