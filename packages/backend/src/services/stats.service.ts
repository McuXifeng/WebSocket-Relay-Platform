import prisma from '@/config/database';
import type { EndpointStatsResponse } from '@websocket-relay/shared';

/**
 * 更新端点统计数据
 * @param endpointId - 端点的数据库 ID (UUID)
 * @param action - 统计操作类型: 'connect' | 'disconnect' | 'message'
 */
export async function updateEndpointStats(
  endpointId: string,
  action: 'connect' | 'disconnect' | 'message'
): Promise<void> {
  try {
    // 防护逻辑: disconnect 操作前检查当前连接数,避免负数
    if (action === 'disconnect') {
      const currentStats = await prisma.endpointStats.findUnique({
        where: { endpoint_id: endpointId },
        select: { current_connections: true },
      });

      // 如果记录不存在或当前连接数已经是 0,跳过 decrement
      if (!currentStats || currentStats.current_connections <= 0) {
        console.warn(
          `[stats.service] Skipped disconnect for endpoint ${endpointId}: current_connections is already 0 or record does not exist`
        );
        return;
      }
    }

    // 使用 upsert 确保统计记录存在
    await prisma.endpointStats.upsert({
      where: { endpoint_id: endpointId },
      create: {
        endpoint_id: endpointId,
        current_connections: action === 'connect' ? 1 : 0,
        total_connections: action === 'connect' ? 1 : 0,
        total_messages: action === 'message' ? 1 : 0,
      },
      update: {
        // 根据 action 更新对应字段
        current_connections:
          action === 'connect'
            ? { increment: 1 }
            : action === 'disconnect'
              ? { decrement: 1 }
              : undefined,
        total_connections: action === 'connect' ? { increment: 1 } : undefined,
        total_messages: action === 'message' ? { increment: 1 } : undefined,
      },
    });

    // 如果是消息事件,更新 Endpoint 的 last_active_at
    if (action === 'message') {
      await prisma.endpoint.update({
        where: { id: endpointId },
        data: { last_active_at: new Date() },
      });
    }
  } catch (error) {
    // 记录错误但不抛出,确保 WebSocket 服务不受影响
    console.error(
      `[stats.service] Failed to update endpoint stats (${action}) for endpoint ${endpointId}:`,
      error
    );
  }
}

/**
 * 查询端点统计数据
 *
 * @param endpointId - 端点数据库 UUID (Endpoint.id)
 * @returns 统计数据,如果不存在返回默认值
 */
export async function getEndpointStats(endpointId: string): Promise<EndpointStatsResponse> {
  // 查询统计记录,同时包含 endpoint 关联以获取 last_active_at
  const stats = await prisma.endpointStats.findUnique({
    where: { endpoint_id: endpointId },
    include: {
      endpoint: {
        select: { last_active_at: true },
      },
    },
  });

  // 如果统计记录不存在,返回默认值
  if (!stats) {
    return {
      current_connections: 0,
      total_connections: 0,
      total_messages: 0,
      last_active_at: null,
    };
  }

  // 返回统计数据
  return {
    current_connections: stats.current_connections,
    total_connections: stats.total_connections,
    total_messages: stats.total_messages,
    last_active_at: stats.endpoint.last_active_at,
  };
}
