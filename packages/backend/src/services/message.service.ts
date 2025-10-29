/**
 * Message Service
 * 处理历史消息的存储和清理
 * Story 3.10: 历史消息存储和展示功能
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 消息内容最大长度 (字符数)
 */
const MAX_MESSAGE_LENGTH = 5000;

/**
 * 每个端点保留的最大消息数量
 */
const MAX_MESSAGES_PER_ENDPOINT = 50;

/**
 * 异步存储消息到数据库
 * @param endpointId - 端点的数据库 UUID
 * @param content - 消息内容
 * @param senderInfo - 发送者信息 (IP、连接ID、设备名称等)
 */
export async function saveMessageAsync(
  endpointId: string,
  content: string,
  senderInfo: string | null
): Promise<void> {
  try {
    // 截断过长的消息内容
    const truncatedContent =
      content.length > MAX_MESSAGE_LENGTH
        ? content.substring(0, MAX_MESSAGE_LENGTH) + '...[已截断]'
        : content;

    // 存储消息到数据库
    await prisma.message.create({
      data: {
        endpoint_id: endpointId,
        content: truncatedContent,
        sender_info: senderInfo,
      },
    });

    // 存储成功后,触发清理旧消息
    void cleanupOldMessages(endpointId).catch((err) => {
      console.error(`[消息清理失败] 端点 ${endpointId}:`, err);
    });
  } catch (error) {
    // 记录错误但不抛出异常,避免影响消息转发
    console.error(`[消息存储失败] 端点 ${endpointId}:`, {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 清理端点的旧消息,保持最多 50 条
 * @param endpointId - 端点的数据库 UUID
 */
export async function cleanupOldMessages(endpointId: string): Promise<void> {
  try {
    // 查询当前端点的所有消息 ID,按时间降序排列
    const messages = await prisma.message.findMany({
      where: { endpoint_id: endpointId },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });

    // 如果消息数量超过限制,删除多余的旧消息
    if (messages.length > MAX_MESSAGES_PER_ENDPOINT) {
      const idsToDelete = messages.slice(MAX_MESSAGES_PER_ENDPOINT).map((m) => m.id);

      await prisma.message.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      console.log(`[消息清理] 端点 ${endpointId} 删除了 ${idsToDelete.length} 条旧消息`);
    }
  } catch (error) {
    // 记录清理失败错误
    console.error(`[消息清理失败] 端点 ${endpointId}:`, {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 获取端点的历史消息 (最新 50 条)
 * @param endpointId - 端点的数据库 UUID
 * @returns 消息列表,按时间降序排列
 */
export async function getEndpointMessages(endpointId: string) {
  return await prisma.message.findMany({
    where: { endpoint_id: endpointId },
    orderBy: { created_at: 'desc' },
    take: MAX_MESSAGES_PER_ENDPOINT,
  });
}
