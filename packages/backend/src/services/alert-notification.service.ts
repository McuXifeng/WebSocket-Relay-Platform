/**
 * 告警通知服务 (Epic 6 Story 6.5, Epic 7 Story 7.2)
 * 负责发送邮件通知
 * Story 7.2 优化: 添加异步邮件队列、SMTP连接池、超时控制
 */

import nodemailer from 'nodemailer';
import { EmailQueueManager, type EmailPriority } from '../utils/email-queue.util.js';
import { alertLogger } from '../config/logger.js';
import { generateMarkReadToken } from '../utils/token.util.js'; // Story 8.1
import { config } from '../config/env.js'; // Story 8.1

/**
 * SMTP 配置接口
 */
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * 邮件通知内容接口
 */
interface EmailNotificationParams {
  to: string;
  alertId: string; // Story 8.1: 告警历史 ID，用于生成快速已读 Token
  alertLevel: 'info' | 'warning' | 'critical';
  ruleName: string;
  deviceName: string;
  dataKey: string;
  triggeredValue: string;
  threshold: string;
  triggeredAt: Date;
}

/**
 * 获取 SMTP 配置
 * 从环境变量读取 SMTP 服务器配置
 */
function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // 如果缺少必要配置，返回 null (静默失败，不记录日志)
  if (!host || !port || !user || !pass) {
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true', // 默认 false
    auth: {
      user,
      pass,
    },
  };
}

/**
 * 创建邮件传输器（单例模式 + 连接池）
 * Story 7.2 优化: 添加连接池配置、超时控制
 */
let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  const config = getSmtpConfig();

  if (!config) {
    alertLogger.warn('SMTP 配置缺失,邮件通知功能已禁用');
    return null;
  }

  // 如果已存在传输器，直接返回
  if (transporter) {
    return transporter;
  }

  try {
    // Story 7.2 优化: 添加连接池配置和超时控制
    transporter = nodemailer.createTransport({
      ...config,
      // 连接池配置
      pool: true, // 启用连接池
      maxConnections: parseInt(process.env.EMAIL_POOL_MAX_CONNECTIONS || '5', 10), // 最大并发连接数
      maxMessages: 100, // 每个连接最多发送100封邮件后重建
      rateDelta: 1000, // 速率限制时间窗口(1秒)
      rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT || '5', 10), // 每秒最多发送邮件数
      // 超时控制
      connectionTimeout: parseInt(process.env.EMAIL_QUEUE_TIMEOUT || '10000', 10), // 连接超时
      greetingTimeout: parseInt(process.env.EMAIL_QUEUE_TIMEOUT || '10000', 10), // 握手超时
      socketTimeout: parseInt(process.env.EMAIL_QUEUE_TIMEOUT || '10000', 10), // Socket超时
    });

    alertLogger.info('SMTP 传输器已创建(连接池模式)', {
      host: config.host,
      port: config.port,
      maxConnections: parseInt(process.env.EMAIL_POOL_MAX_CONNECTIONS || '5', 10),
      timeout: parseInt(process.env.EMAIL_QUEUE_TIMEOUT || '10000', 10),
    });

    return transporter;
  } catch (error) {
    alertLogger.error('创建 SMTP 传输器失败', error as Error);
    return null;
  }
}

/**
 * 邮件队列管理器单例
 * Story 7.2 新增: 异步邮件队列管理
 */
let emailQueueManager: EmailQueueManager | null = null;

/**
 * 获取或创建邮件队列管理器
 */
function getEmailQueueManager(): EmailQueueManager {
  if (!emailQueueManager) {
    const transporter = getEmailTransporter();
    emailQueueManager = new EmailQueueManager(transporter);

    alertLogger.info('邮件队列管理器已初始化');
  }

  return emailQueueManager;
}

/**
 * 生成告警邮件 HTML 模板
 * Story 8.1: 添加"标记已读"按钮和 Token 生成
 */
function generateEmailTemplate(params: EmailNotificationParams): string {
  const {
    alertId,
    alertLevel,
    ruleName,
    deviceName,
    dataKey,
    triggeredValue,
    threshold,
    triggeredAt,
  } = params;

  // Story 8.1: 生成邮件快速已读 Token
  const markReadToken = generateMarkReadToken(alertId);
  // 邮件链接应该指向后端 API，而不是前端
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${config.apiPort}`;
  const markReadUrl = `${backendUrl}/api/alert-history/mark-read?token=${markReadToken}`;

  // 告警级别对应的颜色和中文名称
  const levelConfig = {
    info: { color: '#1890ff', label: '普通' },
    warning: { color: '#faad14', label: '警告' },
    critical: { color: '#ff4d4f', label: '严重' },
  };

  const levelStyle = levelConfig[alertLevel];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>告警通知</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: ${levelStyle.color}; padding: 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px;">⚠️ 设备告警通知</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background-color: ${levelStyle.color}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;">
          ${levelStyle.label}
        </div>
      </div>

      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #262626;">${ruleName}</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #8c8c8c; font-size: 14px;">设备名称</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #262626; font-size: 14px; text-align: right;">${deviceName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #8c8c8c; font-size: 14px;">数据字段</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #262626; font-size: 14px; text-align: right;">${dataKey}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #8c8c8c; font-size: 14px;">触发值</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: ${levelStyle.color}; font-size: 14px; font-weight: bold; text-align: right;">${triggeredValue}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #8c8c8c; font-size: 14px;">阈值</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #262626; font-size: 14px; text-align: right;">${threshold}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #8c8c8c; font-size: 14px;">触发时间</td>
          <td style="padding: 12px 0; color: #262626; font-size: 14px; text-align: right;">${new Date(triggeredAt).toLocaleString('zh-CN')}</td>
        </tr>
      </table>

      <!-- Story 8.1: 快速已读按钮 -->
      <div style="margin-top: 30px; text-align: center;">
        <a href="${markReadUrl}" style="display: inline-block; padding: 12px 32px; background-color: #52c41a; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold;">
          ✓ 标记为已读
        </a>
        <p style="margin: 10px 0 0 0; color: #8c8c8c; font-size: 12px;">
          点击上方按钮可快速标记此告警为已读，无需登录系统
        </p>
      </div>

      <div style="margin-top: 20px; padding: 16px; background-color: #f5f5f5; border-radius: 4px;">
        <p style="margin: 0; color: #595959; font-size: 14px;">
          此邮件由 WebSocket 中继平台自动发送，请勿回复。
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px; background-color: #fafafa; text-align: center; border-top: 1px solid #f0f0f0;">
      <p style="margin: 0; color: #8c8c8c; font-size: 12px;">
        &copy; ${new Date().getFullYear()} WebSocket Relay Platform. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 发送邮件告警通知（异步队列方式）
 * Story 7.2 优化: 改为异步入队操作,不阻塞主流程
 *
 * @param params - 邮件通知参数
 * @param maxRetries - 最大重试次数（默认 3 次）
 * @returns 是否成功入队（不代表发送成功）
 */
export function sendEmailNotification(
  params: EmailNotificationParams,
  maxRetries: number = 3
): boolean {
  const queueManager = getEmailQueueManager();

  // 如果队列管理器的传输器为空（SMTP 未配置），跳过邮件发送
  if (!getEmailTransporter()) {
    alertLogger.warn('邮件通知已跳过: SMTP 未配置');
    return false;
  }

  const { to, ruleName, alertLevel } = params;
  const html = generateEmailTemplate(params);

  // 邮件标题根据告警级别添加前缀
  const levelPrefix = {
    info: '[普通]',
    warning: '[警告]',
    critical: '[严重]',
  };

  // 根据告警级别设置邮件优先级
  const priorityMap: Record<typeof alertLevel, EmailPriority> = {
    critical: 'high',
    warning: 'normal',
    info: 'low',
  };

  // 入队操作（异步发送）
  queueManager.enqueue({
    to,
    subject: `${levelPrefix[alertLevel]} ${ruleName} - 设备告警通知`,
    html,
    priority: priorityMap[alertLevel],
    maxRetries,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  });

  alertLogger.debug('邮件通知已入队', {
    to,
    alertLevel,
    ruleName,
    priority: priorityMap[alertLevel],
  });

  return true;
}

/**
 * 获取邮件队列性能指标
 * Story 7.2 新增: 性能监控接口
 */
export function getEmailQueueMetrics() {
  const queueManager = getEmailQueueManager();
  return queueManager.getMetrics();
}

/**
 * 重置邮件队列性能指标
 * Story 7.2 新增: 用于测试或定期重置
 */
export function resetEmailQueueMetrics(): void {
  const queueManager = getEmailQueueManager();
  queueManager.resetMetrics();
}
