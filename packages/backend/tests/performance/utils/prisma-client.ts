/**
 * 性能测试专用 Prisma 客户端
 * 启用详细的查询日志和性能监控
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

/**
 * 查询性能日志记录器
 */
class QueryPerformanceLogger {
  private logs: Array<{
    timestamp: string;
    query: string;
    params: string;
    duration: number;
    target: string;
  }> = [];

  log(query: string, params: string, duration: number, target: string) {
    this.logs.push({
      timestamp: new Date().toISOString(),
      query,
      params,
      duration,
      target,
    });
  }

  getLogs() {
    return this.logs;
  }

  getSummary() {
    if (this.logs.length === 0) {
      return null;
    }

    const durations = this.logs.map((log) => log.duration);
    const sortedDurations = durations.sort((a, b) => a - b);

    return {
      totalQueries: this.logs.length,
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50: sortedDurations[Math.floor(sortedDurations.length * 0.5)],
      p95: sortedDurations[Math.floor(sortedDurations.length * 0.95)],
      p99: sortedDurations[Math.floor(sortedDurations.length * 0.99)],
      slowQueries: this.logs.filter((log) => log.duration > 100).length, // 超过 100ms 的查询
    };
  }

  saveToFile(outputPath: string) {
    const data = {
      summary: this.getSummary(),
      logs: this.logs,
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`[QueryPerformanceLogger] 查询日志已保存到: ${outputPath}`);
  }
}

export const queryLogger = new QueryPerformanceLogger();

/**
 * 创建启用性能监控的 Prisma 客户端
 */
export function createPerformancePrismaClient() {
  const prisma = new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'info',
      },
      {
        emit: 'event',
        level: 'warn',
      },
      {
        emit: 'event',
        level: 'error',
      },
    ],
  });

  // 监听查询事件
  prisma.$on(
    'query' as never,
    (e: { query: string; params: string; duration: number; target: string }) => {
      queryLogger.log(e.query, e.params, e.duration, e.target);

      // 打印慢查询 (超过 50ms)
      if (e.duration > 50) {
        console.warn(
          `[Slow Query] ${e.duration}ms - ${e.query.substring(0, 100)}... Params: ${e.params}`
        );
      }
    }
  );

  // 监听错误事件
  prisma.$on('error' as never, (e: { message: string }) => {
    console.error(`[Prisma Error] ${e.message}`, e);
  });

  // 监听警告事件
  prisma.$on('warn' as never, (e: { message: string }) => {
    console.warn(`[Prisma Warning] ${e.message}`, e);
  });

  return prisma;
}

/**
 * 使用示例:
 *
 * import { createPerformancePrismaClient, queryLogger } from './prisma-client';
 *
 * const prisma = createPerformancePrismaClient();
 *
 * // 运行测试...
 *
 * queryLogger.saveToFile('./reports/query-performance.json');
 * console.log(queryLogger.getSummary());
 */
