/**
 * 告警通知服务 (Epic 6 Story 6.5)
 * 负责发送邮件通知
 */

import nodemailer from 'nodemailer';

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
 * 创建邮件传输器（单例模式）
 */
let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  const config = getSmtpConfig();

  if (!config) {
    // eslint-disable-next-line no-console
    console.warn('[Alert] SMTP configuration is missing, email notifications disabled');
    return null;
  }

  // 如果已存在传输器，直接返回
  if (transporter) {
    return transporter;
  }

  try {
    transporter = nodemailer.createTransport(config);
    // eslint-disable-next-line no-console
    console.log('[Alert] SMTP transporter created successfully');
    return transporter;
  } catch (error) {
    console.error('[Alert] Failed to create SMTP transporter:', error);
    return null;
  }
}

/**
 * 生成告警邮件 HTML 模板
 */
function generateEmailTemplate(params: EmailNotificationParams): string {
  const { alertLevel, ruleName, deviceName, dataKey, triggeredValue, threshold, triggeredAt } =
    params;

  // 告警级别对应的颜色和中文名称
  const levelConfig = {
    info: { color: '#1890ff', label: '普通' },
    warning: { color: '#faad14', label: '警告' },
    critical: { color: '#ff4d4f', label: '严重' },
  };

  const config = levelConfig[alertLevel];

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
    <div style="background-color: ${config.color}; padding: 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px;">⚠️ 设备告警通知</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background-color: ${config.color}; color: #ffffff; padding: 4px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;">
          ${config.label}
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
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: ${config.color}; font-size: 14px; font-weight: bold; text-align: right;">${triggeredValue}</td>
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

      <div style="margin-top: 30px; padding: 16px; background-color: #f5f5f5; border-radius: 4px;">
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
 * 发送邮件告警通知（带重试机制）
 * @param params - 邮件通知参数
 * @param maxRetries - 最大重试次数（默认 2 次）
 * @returns 是否发送成功
 */
export async function sendEmailNotification(
  params: EmailNotificationParams,
  maxRetries: number = 2
): Promise<boolean> {
  const transporter = getEmailTransporter();

  // 如果没有配置 SMTP，跳过邮件发送
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.warn('[Alert] Email notification skipped: SMTP not configured');
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

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `${levelPrefix[alertLevel]} ${ruleName} - 设备告警通知`,
    html,
  };

  // 重试逻辑
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      // eslint-disable-next-line no-console
      console.log(`[Alert] Email notification sent successfully to ${to} (attempt ${attempt + 1})`);
      return true;
    } catch (error) {
      console.error(
        `[Alert] Failed to send email notification to ${to} (attempt ${attempt + 1}):`,
        error
      );

      // 如果还有重试次数，等待 5 秒后重试
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  // 所有重试都失败
  console.error(`[Alert] Email notification failed after ${maxRetries + 1} attempts to ${to}`);
  return false;
}
