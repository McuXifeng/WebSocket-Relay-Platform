/**
 * 连接诊断脚本
 * 检查内存中的连接池和数据库中的统计数据
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugConnections() {
  try {
    console.log('=== 连接诊断工具 ===\n');

    // 查询 endpoint_id
    const endpoint = await prisma.endpoint.findFirst({
      where: { endpoint_id: 'd4ZO8QbitG' },
      include: {
        stats: true,
      },
    });

    if (!endpoint) {
      console.log('❌ 端点不存在');
      return;
    }

    console.log('📍 端点信息:');
    console.log('  - 数据库 ID:', endpoint.id);
    console.log('  - Endpoint ID:', endpoint.endpoint_id);
    console.log('  - 名称:', endpoint.name);
    console.log('  - 创建时间:', endpoint.created_at);
    console.log('  - 最后活跃:', endpoint.last_active_at);
    console.log();

    console.log('📊 统计数据:');
    if (endpoint.stats) {
      console.log('  - 当前连接数:', endpoint.stats.current_connections);
      console.log('  - 累计连接数:', endpoint.stats.total_connections);
      console.log('  - 累计消息数:', endpoint.stats.total_messages);
    } else {
      console.log('  - ⚠️ 没有统计记录');
    }
    console.log();

    // 查询所有端点的统计
    console.log('📋 所有端点的连接统计:');
    const allStats = await prisma.endpointStats.findMany({
      include: {
        endpoint: {
          select: {
            endpoint_id: true,
            name: true,
          },
        },
      },
    });

    allStats.forEach((stat) => {
      console.log(
        `  - ${stat.endpoint.endpoint_id} (${stat.endpoint.name}): ${stat.current_connections} 个在线`
      );
    });
    console.log();

    // 建议
    console.log('💡 诊断建议:');
    if (endpoint.stats && endpoint.stats.current_connections > 0) {
      console.log(
        '  1. 检查后端服务器是否正在运行（WebSocket 服务器在 3001 端口）'
      );
      console.log('  2. 检查是否有旧的后端进程残留（导致内存连接池不同步）');
      console.log('  3. 手动重置连接数：');
      console.log(
        `     pnpm exec prisma db execute --stdin <<< "UPDATE endpoint_stats SET current_connections = 0 WHERE endpoint_id = '${endpoint.id}'"`
      );
      console.log('  4. 等待心跳检测超时（最多 60 秒）');
      console.log('  5. 检查后端日志中的清理消息');
    } else {
      console.log('  ✅ 连接数正常');
    }
  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConnections();
