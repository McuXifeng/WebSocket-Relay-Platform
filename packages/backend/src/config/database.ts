/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';
import { config } from './env.js';

/**
 * Prisma Client 单例实例
 * 避免多次实例化导致连接池耗尽
 *
 * 开发环境：启用查询日志（query, error, warn）
 * 生产环境：仅记录错误（error）
 * 性能分析模式：详细记录查询时间和参数
 *
 * 注意：在 Prisma schema 没有定义模型时，PrismaClient 类型推断会有问题
 * 这是正常的，当后续故事定义数据库表结构后，类型会自动正确推断
 */

// 检查是否启用性能分析模式
const isProfilingMode = process.env.PRISMA_LOG_QUERIES === 'true';

const prisma = new PrismaClient({
  log:
    config.isDevelopment || isProfilingMode
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : ['error'],
});

// 性能分析模式: 监听查询事件，记录执行时间
if (isProfilingMode || config.isDevelopment) {
  prisma.$on(
    'query' as never,
    (e: { query: string; params: string; duration: number; target: string }) => {
      // 只记录慢查询 (> 10ms) 或所有查询(如果启用详细日志)
      const slowQueryThreshold = 10; // ms
      if (e.duration > slowQueryThreshold) {
        console.log(`🐢 [Slow Query] ${e.duration}ms - ${e.query.substring(0, 100)}`);
        console.log(`   Params: ${e.params}`);
      } else if (isProfilingMode) {
        console.log(`⚡ [Query] ${e.duration}ms - ${e.query.substring(0, 80)}`);
      }
    }
  );
}

/**
 * 优雅关闭数据库连接
 * 在应用退出时调用，确保所有连接正确关闭
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📊 Database connection closed');
}

/**
 * 验证数据库连接
 * 应用启动时调用，确保数据库可访问
 */
export async function verifyDatabaseConnection(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

// 默认导出 Prisma Client 实例
export default prisma;
