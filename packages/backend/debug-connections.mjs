import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugConnections() {
  try {
    console.log('=== 连接诊断工具 ===\n');

    const endpoint = await prisma.endpoint.findFirst({
      where: { endpoint_id: 'd4ZO8QbitG' },
      include: { stats: true },
    });

    if (!endpoint) {
      console.log('❌ 端点不存在');
      return;
    }

    console.log('📍 端点信息:');
    console.log('  - 数据库 ID:', endpoint.id);
    console.log('  - Endpoint ID:', endpoint.endpoint_id);
    console.log('  - 名称:', endpoint.name);
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

    console.log('💡 如果连接数不为 0，执行以下命令重置:');
    console.log(`UPDATE endpoint_stats SET current_connections = 0 WHERE endpoint_id = '${endpoint.id}';`);
  } catch (error) {
    console.error('❌ 诊断失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConnections();
