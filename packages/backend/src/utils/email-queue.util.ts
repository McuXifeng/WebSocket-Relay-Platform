/**
 * 邮件发送队列管理器 (Epic 7 Story 7.2)
 * 负责异步邮件发送、队列管理、重试机制和性能监控
 */

import nodemailer from 'nodemailer';
import { alertLogger } from '../config/logger.js';
import { nanoid } from 'nanoid';

/**
 * 邮件任务优先级
 */
export type EmailPriority = 'low' | 'normal' | 'high';

/**
 * 邮件任务接口
 */
export interface EmailTask {
  id: string; // 任务唯一ID
  to: string; // 收件人邮箱
  subject: string; // 邮件主题
  html: string; // 邮件HTML内容
  priority: EmailPriority; // 优先级(critical告警为high)
  retryCount: number; // 当前重试次数
  maxRetries: number; // 最大重试次数(默认3)
  createdAt: Date; // 创建时间
  from?: string; // 发件人邮箱(可选)
}

/**
 * 队列性能指标
 */
export interface QueueMetrics {
  queueLength: number; // 当前队列长度
  totalProcessed: number; // 总处理数量
  totalSuccess: number; // 成功数量
  totalFailed: number; // 失败数量
  successRate: number; // 成功率
  averageProcessTimeMs: number; // 平均处理时间(毫秒)
}

/**
 * 邮件队列管理器类
 * 管理邮件发送队列、异步消费、重试机制和性能监控
 */
export class EmailQueueManager {
  private queue: EmailTask[] = [];
  private processing: boolean = false;
  private transporter: nodemailer.Transporter | null = null;

  // 性能监控指标
  private metrics = {
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    processTimes: [] as number[], // 记录最近100次处理时间
  };

  // 优先级权重映射
  private priorityOrder: Record<EmailPriority, number> = {
    high: 3,
    normal: 2,
    low: 1,
  };

  constructor(transporter: nodemailer.Transporter | null) {
    this.transporter = transporter;
  }

  /**
   * 更新传输器(用于支持连接池切换)
   */
  updateTransporter(transporter: nodemailer.Transporter | null): void {
    this.transporter = transporter;
  }

  /**
   * 入队操作 - 添加邮件任务到队列
   * @param task - 邮件任务(不包含 id 和 createdAt,由队列管理器自动生成)
   */
  enqueue(
    task: Omit<EmailTask, 'id' | 'createdAt' | 'retryCount'> & { retryCount?: number }
  ): void {
    const emailTask: EmailTask = {
      ...task,
      id: nanoid(12),
      createdAt: new Date(),
      retryCount: task.retryCount || 0,
    };

    this.queue.push(emailTask);

    // 按优先级排序(高优先级排在前面)
    this.queue.sort((a, b) => this.priorityOrder[b.priority] - this.priorityOrder[a.priority]);

    alertLogger.debug('邮件任务入队', {
      taskId: emailTask.id,
      priority: emailTask.priority,
      to: emailTask.to,
      queueLength: this.queue.length,
    });

    // 触发队列消费
    this.processQueue();
  }

  /**
   * 队列消费器 - 异步处理队列中的邮件任务
   * 使用 setImmediate 实现非阻塞的异步处理
   */
  private processQueue(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    // 使用 setImmediate 异步处理,避免阻塞主流程
    setImmediate(() => {
      void this.processQueueAsync();
    });
  }

  /**
   * 异步处理队列中的邮件任务
   */
  private async processQueueAsync(): Promise<void> {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await this.sendEmail(task);
      }
    }

    this.processing = false;

    // 如果队列还有新任务,继续处理
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * 发送邮件(带重试逻辑和性能监控)
   * @param task - 邮件任务
   */
  private async sendEmail(task: EmailTask): Promise<void> {
    const startTime = Date.now();

    try {
      if (!this.transporter) {
        throw new Error('SMTP transporter is not configured');
      }

      await this.transporter.sendMail({
        from: task.from || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: task.to,
        subject: task.subject,
        html: task.html,
      });

      const duration = Date.now() - startTime;

      // 记录成功
      this.metrics.totalProcessed++;
      this.metrics.totalSuccess++;
      this.recordProcessTime(duration);

      alertLogger.info('邮件发送成功', {
        taskId: task.id,
        to: task.to,
        subject: task.subject,
        durationMs: duration,
        retryCount: task.retryCount,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      alertLogger.error('邮件发送失败', error as Error, {
        taskId: task.id,
        to: task.to,
        subject: task.subject,
        retryCount: task.retryCount,
        maxRetries: task.maxRetries,
        durationMs: duration,
      });

      // 重试逻辑 - 指数退避策略
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        const delay = Math.pow(2, task.retryCount) * 1000; // 2秒, 4秒, 8秒...

        alertLogger.warn('邮件发送失败,准备重试', {
          taskId: task.id,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries,
          delayMs: delay,
        });

        // 延迟后重新入队
        setTimeout(() => {
          this.enqueue(task);
        }, delay);
      } else {
        // 所有重试都失败,记录最终失败
        this.metrics.totalProcessed++;
        this.metrics.totalFailed++;
        this.recordProcessTime(duration);

        alertLogger.error('邮件发送最终失败(已达最大重试次数)', {
          taskId: task.id,
          to: task.to,
          subject: task.subject,
          totalRetries: task.retryCount,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * 记录处理时间(保留最近100次)
   */
  private recordProcessTime(duration: number): void {
    this.metrics.processTimes.push(duration);

    // 只保留最近100次的记录
    if (this.metrics.processTimes.length > 100) {
      this.metrics.processTimes.shift();
    }
  }

  /**
   * 获取队列性能指标
   */
  getMetrics(): QueueMetrics {
    const avgProcessTime =
      this.metrics.processTimes.length > 0
        ? this.metrics.processTimes.reduce((sum, time) => sum + time, 0) /
          this.metrics.processTimes.length
        : 0;

    const successRate =
      this.metrics.totalProcessed > 0
        ? (this.metrics.totalSuccess / this.metrics.totalProcessed) * 100
        : 0;

    return {
      queueLength: this.queue.length,
      totalProcessed: this.metrics.totalProcessed,
      totalSuccess: this.metrics.totalSuccess,
      totalFailed: this.metrics.totalFailed,
      successRate: parseFloat(successRate.toFixed(2)),
      averageProcessTimeMs: parseFloat(avgProcessTime.toFixed(2)),
    };
  }

  /**
   * 重置性能指标(用于测试或定期重置)
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      processTimes: [],
    };

    alertLogger.info('邮件队列性能指标已重置');
  }

  /**
   * 获取当前队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 检查队列是否正在处理
   */
  isProcessing(): boolean {
    return this.processing;
  }
}
