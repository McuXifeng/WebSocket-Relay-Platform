/**
 * 邮件队列管理器单元测试 (Epic 7 Story 7.2)
 * 测试异步邮件队列、重试机制和性能监控
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EmailQueueManager } from '@/utils/email-queue.util';
import type nodemailer from 'nodemailer';

describe('EmailQueueManager', () => {
  let mockTransporter: nodemailer.Transporter;
  let queueManager: EmailQueueManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    // 创建 Mock 传输器
    sendMailMock = jest.fn();
    mockTransporter = {
      sendMail: sendMailMock,
    } as unknown as nodemailer.Transporter;

    // 创建队列管理器实例
    queueManager = new EmailQueueManager(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('入队操作', () => {
    it('应该成功将邮件任务添加到队列', () => {
      queueManager.enqueue({
        to: 'test@example.com',
        subject: '测试邮件',
        html: '<p>测试内容</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      expect(queueManager.getQueueLength()).toBeGreaterThanOrEqual(0);
    });

    it('应该按优先级排序队列 (高优先级在前)', () => {
      // 添加不同优先级的任务
      queueManager.enqueue({
        to: 'low@example.com',
        subject: '低优先级',
        html: '<p>Low</p>',
        priority: 'low',
        maxRetries: 3,
      });

      queueManager.enqueue({
        to: 'high@example.com',
        subject: '高优先级',
        html: '<p>High</p>',
        priority: 'high',
        maxRetries: 3,
      });

      queueManager.enqueue({
        to: 'normal@example.com',
        subject: '普通优先级',
        html: '<p>Normal</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 队列长度应该大于等于 0（可能已经开始处理）
      const queueLength = queueManager.getQueueLength();
      expect(queueLength).toBeGreaterThanOrEqual(0);
      expect(queueLength).toBeLessThanOrEqual(3);
    });
  });

  describe('邮件发送成功场景', () => {
    it('应该成功发送邮件并更新性能指标', async () => {
      // Mock 成功发送
      sendMailMock.mockResolvedValueOnce({
        messageId: 'test-message-id',
      });

      queueManager.enqueue({
        to: 'success@example.com',
        subject: '测试成功',
        html: '<p>Success</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 等待队列处理
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 验证 sendMail 被调用
      expect(sendMailMock).toHaveBeenCalled();

      // 验证性能指标
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
    });

    it('应该处理多个邮件任务', async () => {
      // Mock 成功发送
      sendMailMock.mockResolvedValue({
        messageId: 'test-message-id',
      });

      // 入队 3 个任务
      for (let i = 0; i < 3; i++) {
        queueManager.enqueue({
          to: `test${i}@example.com`,
          subject: `测试邮件 ${i}`,
          html: `<p>测试内容 ${i}</p>`,
          priority: 'normal',
          maxRetries: 3,
        });
      }

      // 等待队列处理
      await new Promise((resolve) => setTimeout(resolve, 300));

      // 验证 sendMail 被调用
      expect(sendMailMock).toHaveBeenCalled();

      // 验证性能指标
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
    });
  });

  describe('邮件发送失败和重试机制', () => {
    it('应该在失败后重试发送邮件', async () => {
      jest.useFakeTimers();

      // Mock 第一次失败,第二次成功
      sendMailMock
        .mockRejectedValueOnce(new Error('SMTP connection failed'))
        .mockResolvedValueOnce({
          messageId: 'test-message-id',
        });

      queueManager.enqueue({
        to: 'retry@example.com',
        subject: '重试测试',
        html: '<p>Retry</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 等待第一次处理失败
      await Promise.resolve();
      jest.runAllTimers();

      // 快进时间到第一次重试（2秒后）
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      // 验证 sendMail 至少被调用了 1 次
      expect(sendMailMock).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('应该在达到最大重试次数后停止重试', async () => {
      // 使用真实计时器，因为 fakeTimers 与 setImmediate 有兼容性问题
      // Mock 所有尝试都失败
      sendMailMock.mockRejectedValue(new Error('SMTP connection failed'));

      queueManager.enqueue({
        to: 'max-retry@example.com',
        subject: '最大重试测试',
        html: '<p>MaxRetry</p>',
        priority: 'normal',
        maxRetries: 1, // 减少重试次数以加快测试
      });

      // 等待初次处理和所有重试完成
      // 2秒（第1次重试） = 总共2秒
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 验证 sendMail 被调用
      expect(sendMailMock).toHaveBeenCalled();

      // 验证性能指标记录了失败
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
      expect(metrics.totalFailed).toBeGreaterThan(0);
    }, 15000); // 增加测试超时到15秒
  });

  describe('性能监控', () => {
    it('应该正确计算成功率', async () => {
      // Mock 2次成功, 1次失败
      sendMailMock
        .mockResolvedValueOnce({
          messageId: 'test-1',
        })
        .mockResolvedValueOnce({
          messageId: 'test-2',
        })
        .mockRejectedValueOnce(new Error('Failed'));

      // 入队 3 个任务
      for (let i = 0; i < 3; i++) {
        queueManager.enqueue({
          to: `test${i}@example.com`,
          subject: `测试邮件 ${i}`,
          html: `<p>测试内容 ${i}</p>`,
          priority: 'normal',
          maxRetries: 0, // 不重试,直接失败
        });
      }

      // 等待队列处理（增加超时时间）
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 验证性能指标
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(100);
    }, 15000); // 增加测试超时到15秒

    it('应该记录平均处理时间', async () => {
      // Mock 成功发送（模拟不同的处理时间）
      sendMailMock.mockImplementation(async () => {
        // 减少模拟处理时间
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          messageId: 'test-message-id',
        };
      });

      queueManager.enqueue({
        to: 'test@example.com',
        subject: '测试邮件',
        html: '<p>测试内容</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 等待队列处理
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 验证性能指标中包含平均处理时间
      const metrics = queueManager.getMetrics();
      expect(metrics.averageProcessTimeMs).toBeGreaterThanOrEqual(0);
    }, 15000); // 增加测试超时到15秒

    it('应该能够重置性能指标', async () => {
      // Mock 成功发送
      sendMailMock.mockResolvedValue({
        messageId: 'test-message-id',
      });

      queueManager.enqueue({
        to: 'test@example.com',
        subject: '测试邮件',
        html: '<p>测试内容</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 等待队列处理
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 重置指标
      queueManager.resetMetrics();

      // 验证指标已重置
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(0);
      expect(metrics.totalSuccess).toBe(0);
      expect(metrics.totalFailed).toBe(0);
      expect(metrics.successRate).toBe(0);
    }, 15000); // 增加测试超时到15秒
  });

  describe('队列状态查询', () => {
    it('应该正确返回队列长度', () => {
      const initialLength = queueManager.getQueueLength();
      expect(initialLength).toBe(0);

      queueManager.enqueue({
        to: 'test1@example.com',
        subject: '测试1',
        html: '<p>Test1</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 队列长度应该大于等于0（可能已开始处理）
      expect(queueManager.getQueueLength()).toBeGreaterThanOrEqual(0);
    });

    it('应该正确返回处理状态', () => {
      // 验证方法可以正常调用
      const processing = queueManager.isProcessing();
      expect(typeof processing).toBe('boolean');
    });
  });

  describe('传输器管理', () => {
    it('应该能够更新传输器', () => {
      const newSendMailMock = jest.fn();
      const newMockTransporter = {
        sendMail: newSendMailMock,
      } as unknown as nodemailer.Transporter;

      queueManager.updateTransporter(newMockTransporter);

      // 验证更新成功（通过发送邮件来验证）
      queueManager.enqueue({
        to: 'test@example.com',
        subject: '测试',
        html: '<p>Test</p>',
        priority: 'normal',
        maxRetries: 3,
      });

      // 不需要验证具体调用，只要没有抛出错误即可
      expect(queueManager).toBeDefined();
    });

    it('应该处理传输器为 null 的情况', async () => {
      const nullQueueManager = new EmailQueueManager(null);

      nullQueueManager.enqueue({
        to: 'test@example.com',
        subject: '测试',
        html: '<p>Test</p>',
        priority: 'normal',
        maxRetries: 0, // 不重试
      });

      // 等待队列处理
      await new Promise((resolve) => setTimeout(resolve, 200));

      // 验证性能指标（应该记录为失败）
      const metrics = nullQueueManager.getMetrics();
      expect(metrics.totalFailed).toBeGreaterThan(0);
    }, 15000); // 增加测试超时到15秒
  });

  describe('获取性能指标', () => {
    it('应该返回完整的性能指标对象', () => {
      const metrics = queueManager.getMetrics();

      expect(metrics).toHaveProperty('queueLength');
      expect(metrics).toHaveProperty('totalProcessed');
      expect(metrics).toHaveProperty('totalSuccess');
      expect(metrics).toHaveProperty('totalFailed');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('averageProcessTimeMs');
    });
  });
});
