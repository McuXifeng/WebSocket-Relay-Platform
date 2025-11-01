/**
 * Winston 日志系统配置
 * 提供结构化日志记录功能
 */

import winston from 'winston';
import { config } from './env.js';

/**
 * 自定义日志格式
 * 包含时间戳、级别、消息和额外数据
 */
interface LogInfo {
  timestamp: string;
  level: string;
  message: string;
  stack?: string;
  [key: string]: unknown;
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info: LogInfo) => {
    const { timestamp, level, message, stack, ...meta } = info;
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 添加堆栈信息（如果存在）
    if (stack) {
      log += `\n${stack}`;
    } else if (Object.keys(meta).length > 0) {
      // 添加额外的元数据（如果存在）
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

/**
 * 创建 Winston Logger 实例
 */
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),

    // 错误日志文件（仅记录 error 级别）
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),

    // 综合日志文件（记录所有级别）
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

/**
 * 告警系统专用日志记录器
 * 带有 [Alert] 前缀，方便日志过滤
 */
export const alertLogger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    logger.info(`[Alert] ${message}`, meta);
  },

  warn: (message: string, meta?: Record<string, unknown>) => {
    logger.warn(`[Alert] ${message}`, meta);
  },

  error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
    if (error instanceof Error) {
      logger.error(`[Alert] ${message}`, {
        error: error.message,
        stack: error.stack,
        ...meta,
      });
    } else if (error) {
      logger.error(`[Alert] ${message}`, { error: String(error), ...meta });
    } else {
      logger.error(`[Alert] ${message}`, meta);
    }
  },

  debug: (message: string, meta?: Record<string, unknown>) => {
    logger.debug(`[Alert] ${message}`, meta);
  },
};

export default logger;
