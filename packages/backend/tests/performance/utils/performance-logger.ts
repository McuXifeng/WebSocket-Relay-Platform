/**
 * 性能测试专用 Winston 日志配置
 * 将性能指标输出到独立的日志文件
 */
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// 确保日志目录存在
const logsDir = path.join(__dirname, '../reports/logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * 性能日志格式化器
 */
const performanceFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 性能日志记录器
 */
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: performanceFormat,
  transports: [
    // 所有性能日志
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // WebSocket 消息延迟日志
    new winston.transports.File({
      filename: path.join(logsDir, 'message-latency.log'),
      level: 'info',
      maxsize: 10485760,
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          // 只记录消息延迟相关日志
          return info.metric === 'message_latency' ? info : false;
        })()
      ),
    }),

    // 数据库查询性能日志
    new winston.transports.File({
      filename: path.join(logsDir, 'database-queries.log'),
      level: 'info',
      maxsize: 10485760,
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          return info.metric === 'db_query' ? info : false;
        })()
      ),
    }),

    // 连接池状态日志
    new winston.transports.File({
      filename: path.join(logsDir, 'connection-pool.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 2,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          return info.metric === 'connection_pool' ? info : false;
        })()
      ),
    }),

    // 控制台输出 (仅显示重要信息)
    new winston.transports.Console({
      level: 'warn',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${String(timestamp)} [${String(level)}] ${String(message)} ${metaStr}`;
        })
      ),
    }),
  ],
});

/**
 * 记录 WebSocket 消息延迟
 */
export function logMessageLatency(latencyMs: number, metadata?: Record<string, unknown>) {
  performanceLogger.info('WebSocket message latency', {
    metric: 'message_latency',
    latency: latencyMs,
    timestamp: Date.now(),
    ...metadata,
  });
}

/**
 * 记录数据库查询性能
 */
export function logDatabaseQuery(
  queryName: string,
  durationMs: number,
  metadata?: Record<string, unknown>
) {
  performanceLogger.info('Database query performance', {
    metric: 'db_query',
    query: queryName,
    duration: durationMs,
    timestamp: Date.now(),
    ...metadata,
  });

  // 慢查询告警 (超过 100ms)
  if (durationMs > 100) {
    performanceLogger.warn('Slow database query detected', {
      metric: 'slow_query',
      query: queryName,
      duration: durationMs,
      timestamp: Date.now(),
    });
  }
}

/**
 * 记录连接池状态
 */
export function logConnectionPool(stats: {
  endpoint_id?: string;
  connection_count: number;
  total_connections?: number;
  metadata?: Record<string, unknown>;
}) {
  performanceLogger.info('Connection pool status', {
    metric: 'connection_pool',
    timestamp: Date.now(),
    ...stats,
  });
}

/**
 * 记录消息吞吐量
 */
export function logMessageThroughput(
  messagesPerSecond: number,
  metadata?: Record<string, unknown>
) {
  performanceLogger.info('Message throughput', {
    metric: 'message_throughput',
    messagesPerSecond,
    timestamp: Date.now(),
    ...metadata,
  });
}

/**
 * 记录系统资源使用
 */
export function logSystemResources(resources: {
  cpuPercent: number;
  memoryMB: number;
  memoryPercent: number;
}) {
  performanceLogger.info('System resources', {
    metric: 'system_resources',
    ...resources,
    timestamp: Date.now(),
  });
}

/**
 * 使用示例:
 *
 * import { logMessageLatency, logDatabaseQuery, logConnectionPool } from './performance-logger';
 *
 * // 记录消息延迟
 * logMessageLatency(42, { endpoint_id: 'test-1', message_type: 'broadcast' });
 *
 * // 记录数据库查询
 * logDatabaseQuery('findEndpoint', 15, { endpoint_id: 'test-1' });
 *
 * // 记录连接池状态
 * logConnectionPool({ endpoint_id: 'test-1', connection_count: 50 });
 */
