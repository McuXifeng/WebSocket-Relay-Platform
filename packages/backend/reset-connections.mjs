#!/usr/bin/env node
/**
 * 连接数重置工具
 * 用于重置所有端点的 current_connections 为 0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetConnections() {
  try {
    console.log('🔧 开始重置所有端点的连接数...\n');

    // 查询所有有非零连接数的端点
    const statsWithConnections = await prisma.endpointStats.findMany({
      where: {
        current_connections: {
          gt: 0,
        },
      },
      include: {
        endpoint: {
          select: {
            endpoint_id: true,
            name: true,
          },
        },
      },
    });

    if (statsWithConnections.length === 0) {
      console.log('✅ 所有端点的连接数都为 0，无需重置');
      return;
    }

    console.log(`⚠️  发现 ${statsWithConnections.length} 个端点有非零连接数:\n`);
    statsWithConnections.forEach((stat) => {
      console.log(
        `  - ${stat.endpoint.endpoint_id} (${stat.endpoint.name}): ${stat.current_connections} 个在线`
      );
    });
    console.log();

    // 重置所有连接数为 0
    const result = await prisma.endpointStats.updateMany({
      where: {
        current_connections: {
          gt: 0,
        },
      },
      data: {
        current_connections: 0,
      },
    });

    console.log(`✅ 成功重置 ${result.count} 个端点的连接数\n`);

    // 验证结果
    const remaining = await prisma.endpointStats.findMany({
      where: {
        current_connections: {
          gt: 0,
        },
      },
    });

    if (remaining.length === 0) {
      console.log('🎉 所有端点连接数已重置为 0');
    } else {
      console.log('⚠️  仍有 ' + remaining.length + ' 个端点连接数不为 0');
    }
  } catch (error) {
    console.error('❌ 重置失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetConnections();
