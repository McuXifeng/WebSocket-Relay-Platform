import dotenv from 'dotenv';
import type { Server } from 'http';
import app from './app.js';
import { config, validateEnv } from './config/env.js';
import { verifyDatabaseConnection, disconnectDatabase } from './config/database.js';

// 加载环境变量（必须在最顶部）
dotenv.config();

// 验证环境变量（在启动服务器前）
validateEnv();

// 保存 HTTP 服务器实例，用于优雅关闭
let server: Server | null = null;

/**
 * 优雅关闭服务器
 * 关闭所有活动连接并释放资源
 */
async function gracefulShutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n🛑 Received ${signal}, starting graceful shutdown...`);

  // 关闭数据库连接
  try {
    await disconnectDatabase();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Error disconnecting database:', error);
  }

  // 关闭 HTTP 服务器
  if (server) {
    server.close((err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('❌ Error closing HTTP server:', err);
        process.exit(1);
      }

      // eslint-disable-next-line no-console
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // 设置超时，强制退出（如果优雅关闭失败）
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error('⚠️ Forced shutdown after timeout');
      process.exit(1);
    }, 10000); // 10秒超时
  } else {
    process.exit(0);
  }
}

/**
 * 启动 HTTP 服务器和 WebSocket 服务器
 */
async function startServer(): Promise<void> {
  try {
    // 验证数据库连接
    await verifyDatabaseConnection();

    // 自动检查并初始化数据库（仅在开发模式）
    if (config.nodeEnv === 'development') {
      try {
        const { checkAndSeed } = await import('./scripts/check-and-seed.js');
        await checkAndSeed();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('⚠️  自动数据库初始化失败，请手动运行: npx prisma db seed');
      }
    }

    // 启动 HTTP 服务器
    server = app.listen(config.apiPort, () => {
      // eslint-disable-next-line no-console
      console.log(`🚀 HTTP API Server is running on http://localhost:${config.apiPort}`);
      // eslint-disable-next-line no-console
      console.log(`📋 Health check: http://localhost:${config.apiPort}/api/health`);
      // eslint-disable-next-line no-console
      console.log(`🌍 Environment: ${config.nodeEnv}`);
    });

    // 启动 WebSocket 服务器 (Story 3.10 - 历史消息存储和展示功能)
    // 动态导入以确保在环境变量验证后才加载
    await import('./websocket/server.js');
    // eslint-disable-next-line no-console
    console.log('🔌 WebSocket Server is running on ws://localhost:3001');

    // 监听进程信号，实现优雅关闭
    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// 启动服务器
void startServer();
