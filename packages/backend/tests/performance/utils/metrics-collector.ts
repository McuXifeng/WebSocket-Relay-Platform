/**
 * 性能指标收集工具
 * 用于在性能测试期间收集系统级和应用级性能指标
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * 性能指标数据结构
 */
export interface PerformanceMetrics {
  timestamp: string;
  system: {
    cpuUsagePercent: number;
    memoryUsageMB: number;
    memoryTotalMB: number;
    memoryUsagePercent: number;
    loadAverage: number[];
  };
  process: {
    pid: number;
    cpuUsagePercent: number;
    memoryUsageMB: number;
    memoryHeapUsedMB: number;
    memoryHeapTotalMB: number;
    uptime: number;
  };
  custom?: Record<string, number>;
}

/**
 * 性能指标收集器类
 */
export class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  /**
   * 开始收集指标
   * @param intervalMs 采集间隔 (毫秒),默认 5000ms (5秒)
   */
  start(intervalMs: number = 5000): void {
    this.startTime = Date.now();
    this.metrics = [];

    console.log(`[MetricsCollector] 开始收集性能指标 (间隔: ${intervalMs}ms)`);

    this.intervalId = setInterval(() => {
      const metrics = this.collectMetrics();
      this.metrics.push(metrics);
    }, intervalMs);
  }

  /**
   * 停止收集指标
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`[MetricsCollector] 停止收集性能指标 (共收集 ${this.metrics.length} 个数据点)`);
    }
  }

  /**
   * 收集当前性能指标
   */
  private collectMetrics(): PerformanceMetrics {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    const memUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      system: {
        cpuUsagePercent: this.getCpuUsagePercent(),
        memoryUsageMB: Math.round(usedMemory / 1024 / 1024),
        memoryTotalMB: Math.round(totalMemory / 1024 / 1024),
        memoryUsagePercent: Math.round((usedMemory / totalMemory) * 100),
        loadAverage: os.loadavg(),
      },
      process: {
        pid: process.pid,
        cpuUsagePercent: process.cpuUsage().user / 1000000, // 转换为秒
        memoryUsageMB: Math.round(memUsage.rss / 1024 / 1024),
        memoryHeapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryHeapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        uptime: Math.round(process.uptime()),
      },
    };
  }

  /**
   * 获取 CPU 使用率百分比 (简化版本)
   */
  private getCpuUsagePercent(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((100 * idle) / total);

    return usage;
  }

  /**
   * 获取收集的所有指标
   */
  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  /**
   * 保存指标到 JSON 文件
   */
  saveToFile(outputPath: string): void {
    const data = {
      collectionStartTime: new Date(this.startTime).toISOString(),
      collectionDuration: Date.now() - this.startTime,
      dataPoints: this.metrics.length,
      metrics: this.metrics,
    };

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`[MetricsCollector] 指标已保存到: ${outputPath}`);
  }

  /**
   * 保存指标到 CSV 文件 (便于在 Excel 中分析)
   */
  saveToCsv(outputPath: string): void {
    const headers = [
      'timestamp',
      'system_cpu_percent',
      'system_memory_mb',
      'system_memory_percent',
      'process_cpu_percent',
      'process_memory_mb',
      'process_heap_used_mb',
      'process_heap_total_mb',
      'process_uptime',
    ];

    const rows = this.metrics.map((m) => [
      m.timestamp,
      m.system.cpuUsagePercent,
      m.system.memoryUsageMB,
      m.system.memoryUsagePercent,
      m.process.cpuUsagePercent,
      m.process.memoryUsageMB,
      m.process.memoryHeapUsedMB,
      m.process.memoryHeapTotalMB,
      m.process.uptime,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, csv);
    console.log(`[MetricsCollector] CSV 已保存到: ${outputPath}`);
  }

  /**
   * 计算统计摘要
   */
  getSummary() {
    if (this.metrics.length === 0) {
      return null;
    }

    const systemCpu = this.metrics.map((m) => m.system.cpuUsagePercent);
    const systemMem = this.metrics.map((m) => m.system.memoryUsagePercent);
    const processMem = this.metrics.map((m) => m.process.memoryUsageMB);

    return {
      system: {
        cpu: {
          avg: this.average(systemCpu),
          max: Math.max(...systemCpu),
          min: Math.min(...systemCpu),
        },
        memory: {
          avg: this.average(systemMem),
          max: Math.max(...systemMem),
          min: Math.min(...systemMem),
        },
      },
      process: {
        memory: {
          avg: this.average(processMem),
          max: Math.max(...processMem),
          min: Math.min(...processMem),
          final: processMem[processMem.length - 1],
        },
      },
      dataPoints: this.metrics.length,
      duration: Date.now() - this.startTime,
    };
  }

  /**
   * 计算平均值
   */
  private average(arr: number[]): number {
    return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
  }
}

/**
 * 使用示例:
 *
 * const collector = new MetricsCollector();
 * collector.start(5000); // 每 5 秒收集一次
 *
 * // 运行测试...
 *
 * collector.stop();
 * collector.saveToFile('./reports/metrics.json');
 * collector.saveToCsv('./reports/metrics.csv');
 * console.log(collector.getSummary());
 */
