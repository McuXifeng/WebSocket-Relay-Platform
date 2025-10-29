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
 *
 * 注意：在 Prisma schema 没有定义模型时，PrismaClient 类型推断会有问题
 * 这是正常的，当后续故事定义数据库表结构后，类型会自动正确推断
 */
const prisma = new PrismaClient({
  log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
});

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
