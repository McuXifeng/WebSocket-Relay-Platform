/**
 * 环境变量管理模块
 * 提供类型安全的环境变量访问
 * 验证必需的环境变量是否存在
 */

/**
 * 环境变量配置对象
 * 所有环境变量的类型安全访问器
 */
export const config = {
  // 服务器端口配置
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
  wsPort: parseInt(process.env.WS_PORT || '3001', 10),

  // 数据库配置
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT 认证配置
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS 配置
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],

  // WebSocket 配置
  wsBaseUrl: process.env.WS_BASE_URL || 'ws://localhost:3001',
  websocketBaseUrl: process.env.WEBSOCKET_BASE_URL || 'wss://localhost:3001',

  // 应用环境
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  // 日志配置
  logLevel: process.env.LOG_LEVEL || 'debug',

  // 告警系统配置
  // SMTP 邮件配置（可选，如果未配置则只发送 WebSocket 通知）
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASSWORD || '',
    },
    from: {
      email: process.env.SMTP_FROM_EMAIL || '',
      name: process.env.SMTP_FROM_NAME || 'WebSocket Relay Alert System',
    },
  },

  // 告警防抖时间（分钟）
  alertDebounceMinutes: parseInt(process.env.ALERT_DEBOUNCE_MINUTES || '5', 10),

  // 告警历史保留天数
  alertRetentionDays: parseInt(process.env.ALERT_RETENTION_DAYS || '30', 10),
};

/**
 * 验证必需的环境变量
 * 如果缺失关键配置，抛出错误并阻止应用启动
 */
export function validateEnv(): void {
  const requiredVars: { name: string; value: string }[] = [
    { name: 'DATABASE_URL', value: config.databaseUrl },
    { name: 'JWT_SECRET', value: config.jwtSecret },
  ];

  const missingVars = requiredVars.filter(({ value }) => !value);

  if (missingVars.length > 0) {
    const varNames = missingVars.map(({ name }) => name).join(', ');
    // eslint-disable-next-line no-console
    console.error('❌ Missing required environment variables:', varNames);
    // eslint-disable-next-line no-console
    console.error('   Please check your .env file and ensure all required variables are set.');
    throw new Error(`Missing required environment variables: ${varNames}`);
  }

  // 开发环境警告
  if (config.isDevelopment) {
    // eslint-disable-next-line no-console
    console.log('⚠️  Running in DEVELOPMENT mode');
    if (config.jwtSecret === 'your-super-secret-key-change-in-production') {
      // eslint-disable-next-line no-console
      console.warn('⚠️  WARNING: Using default JWT_SECRET! Change it in production!');
    }
  }

  // eslint-disable-next-line no-console
  console.log('✅ Environment variables validated successfully');
}
