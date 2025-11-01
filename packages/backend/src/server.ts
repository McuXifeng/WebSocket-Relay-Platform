import dotenv from 'dotenv';
import type { Server } from 'http';
import cron from 'node-cron';
import app from './app.js';
import { config, validateEnv } from './config/env.js';
import { verifyDatabaseConnection, disconnectDatabase } from './config/database.js';
import { checkAlerts } from './services/alert-detector.service.js';
import { cleanupAlertHistory } from './services/alert-history.service.js';
import { alertLogger } from './config/logger.js';
import { sendEmailNotification } from './services/alert-notification.service.js';

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

    // 启动告警检测定时任务 (Epic 6 Story 6.5)
    // 每分钟执行一次告警检测
    cron.schedule('* * * * *', () => {
      void (async () => {
        try {
          alertLogger.debug('运行定时告警检测...');
          const triggeredAlerts = await checkAlerts();

          // 如果有触发的告警，发送邮件通知（Story 6.5 Task 4）
          if (triggeredAlerts.length > 0) {
            alertLogger.info(`检测到 ${triggeredAlerts.length} 个触发的告警，开始发送邮件通知`);

            // 逐个发送邮件通知
            for (const alert of triggeredAlerts) {
              try {
                // 获取用户邮箱
                const userEmail = alert.alert_rule.user.email;

                // 如果用户没有设置邮箱，跳过邮件通知
                if (!userEmail) {
                  alertLogger.warn('用户未设置邮箱，跳过邮件通知', {
                    alertId: alert.id,
                    userId: alert.alert_rule.user_id,
                  });
                  continue;
                }

                const emailSent = await sendEmailNotification({
                  to: userEmail,
                  alertLevel: alert.alert_level,
                  ruleName: alert.alert_rule.rule_name,
                  deviceName: alert.device.custom_name || alert.device.device_id,
                  dataKey: alert.data_key,
                  triggeredValue: alert.triggered_value,
                  threshold: alert.threshold,
                  triggeredAt: alert.triggered_at,
                });

                // 更新告警历史记录的邮件发送状态
                if (emailSent) {
                  await import('./config/database.js').then(({ default: prisma }) => {
                    return prisma.alertHistory.update({
                      where: { id: alert.id },
                      data: { email_sent: true },
                    });
                  });
                  alertLogger.info('邮件通知发送成功', { alertId: alert.id, userEmail });
                } else {
                  alertLogger.warn('邮件通知发送失败', { alertId: alert.id, userEmail });
                }
              } catch (error) {
                alertLogger.error('发送单个告警邮件通知时发生错误', error as Error, {
                  alertId: alert.id,
                });
              }
            }
          }
        } catch (error) {
          alertLogger.error('定时告警检测执行失败', error as Error);
        }
      })();
    });
    // eslint-disable-next-line no-console
    console.log('⏰ Alert detection cron job started (runs every minute)');

    // 启动告警历史清理定时任务 (Epic 6 Story 6.5 Task 16)
    // 每天凌晨0点执行一次告警历史清理
    cron.schedule('0 0 * * *', () => {
      void (async () => {
        try {
          alertLogger.info('运行定时告警历史清理...');
          const result = await cleanupAlertHistory();

          if (result.success) {
            alertLogger.info('告警历史清理定时任务执行成功', result);
          } else {
            alertLogger.error(
              '告警历史清理定时任务执行失败',
              new Error(result.error || 'Unknown error'),
              result
            );
          }
        } catch (error) {
          alertLogger.error('告警历史清理定时任务执行异常', error as Error);
        }
      })();
    });
    // eslint-disable-next-line no-console
    console.log(
      `⏰ Alert history cleanup cron job started (runs daily at midnight, retention: ${config.alertRetentionDays} days)`
    );

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
