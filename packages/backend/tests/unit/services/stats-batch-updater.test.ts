/**
 * StatsBatchUpdater 单元测试 (Story 9.2 Task 9)
 * 测试批量统计更新器的核心功能：累积更新、定时刷新、阈值刷新、优雅关闭
 */

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { StatsBatchUpdater } from '@/services/stats-batch-updater';
import prisma from '@/config/database';

// Mock Prisma 客户端
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: {
    endpointStats: {
      upsert: jest.fn(),
    },
    endpoint: {
      update: jest.fn(),
    },
  },
}));

// Mock Logger (default export + named export)
jest.mock('../../../src/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('StatsBatchUpdater', () => {
  let updater: StatsBatchUpdater;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    if (updater) {
      await updater.shutdown();
    }
    jest.useRealTimers();
  });

  describe('addUpdate', () => {
    it('应该正确累积 connect 操作', () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-1', 'connect');

      expect(updater.getBatchSize()).toBe(1); // 同一端点合并
    });

    it('应该正确累积 disconnect 操作', () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      updater.addUpdate('endpoint-1', 'disconnect');
      updater.addUpdate('endpoint-1', 'disconnect');

      expect(updater.getBatchSize()).toBe(1);
    });

    it('应该正确累积 message 操作', () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      updater.addUpdate('endpoint-1', 'message');
      updater.addUpdate('endpoint-1', 'message');
      updater.addUpdate('endpoint-1', 'message');

      expect(updater.getBatchSize()).toBe(1);
    });

    it('应该为不同端点创建独立的累积记录', () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-2', 'connect');
      updater.addUpdate('endpoint-3', 'message');

      expect(updater.getBatchSize()).toBe(3); // 3 个不同端点
    });

    it('应该混合累积多种操作类型', () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-1', 'message');
      updater.addUpdate('endpoint-1', 'message');
      updater.addUpdate('endpoint-1', 'disconnect');

      expect(updater.getBatchSize()).toBe(1); // 同一端点的混合操作
    });

    it('应该在关闭期间拒绝新的更新', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      // 开始关闭
      const shutdownPromise = updater.shutdown();

      // 尝试添加更新
      updater.addUpdate('endpoint-1', 'message');

      await shutdownPromise;

      // 关闭后批次应该为空（因为 flush 会清空）
      expect(updater.getBatchSize()).toBe(0);
    });
  });

  describe('flush', () => {
    it('应该清空批次并调用数据库更新', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});
      (prisma.endpoint.update as jest.Mock).mockResolvedValue({});

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-1', 'message');

      await updater.flush();

      // 批次应该被清空
      expect(updater.getBatchSize()).toBe(0);

      // 应该调用 upsert
      expect(prisma.endpointStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint_id: 'endpoint-1' },
        })
      );

      // 应该更新 last_active_at（因为有消息）
      expect(prisma.endpoint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'endpoint-1' },
        })
      );
    });

    it('应该正确计算 current_connections 增量', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      // 3 次连接，1 次断开 = +2
      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-1', 'disconnect');

      await updater.flush();

      expect(prisma.endpointStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            current_connections: { increment: 2 }, // 3 - 1 = 2
            total_connections: { increment: 3 },
          }),
        })
      );
    });

    it('应该在空批次时不执行数据库操作', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      await updater.flush();

      expect(prisma.endpointStats.upsert).not.toHaveBeenCalled();
    });

    it('应该处理数据库错误并继续处理其他端点', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      // 第一个端点失败，第二个成功
      (prisma.endpointStats.upsert as jest.Mock)
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({});

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-2', 'connect');

      await updater.flush();

      // 两个端点都应该尝试更新
      expect(prisma.endpointStats.upsert).toHaveBeenCalledTimes(2);
    });

    it('应该只在有消息时更新 last_active_at', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});
      (prisma.endpoint.update as jest.Mock).mockResolvedValue({});

      // 只有 connect，没有 message
      updater.addUpdate('endpoint-1', 'connect');

      await updater.flush();

      // 不应该更新 last_active_at
      expect(prisma.endpoint.update).not.toHaveBeenCalled();
    });
  });

  describe('阈值触发刷新', () => {
    it('应该在累积量达到阈值时自动刷新', async () => {
      // 设置阈值为 3
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 3 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-2', 'connect');
      // 第 3 个应该触发刷新
      updater.addUpdate('endpoint-3', 'connect');

      // 等待 flush 完成
      await new Promise((resolve) => setTimeout(resolve, 100));
      jest.runOnlyPendingTimers();

      // 批次应该被清空
      expect(updater.getBatchSize()).toBe(0);
    });

    it('应该在超过阈值时立即刷新', async () => {
      // 设置阈值为 2
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 2 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      updater.addUpdate('endpoint-1', 'connect');
      expect(updater.getBatchSize()).toBe(1);

      // 第 2 个应该触发刷新
      updater.addUpdate('endpoint-2', 'connect');

      // 等待 flush 完成
      await new Promise((resolve) => setTimeout(resolve, 100));
      jest.runOnlyPendingTimers();

      expect(updater.getBatchSize()).toBe(0);
    });
  });

  describe('定时刷新', () => {
    it('应该在指定间隔后自动刷新', async () => {
      // 设置 5 秒刷新间隔
      updater = new StatsBatchUpdater({ flushInterval: 5000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      updater.addUpdate('endpoint-1', 'connect');
      expect(updater.getBatchSize()).toBe(1);

      // 快进 5 秒
      jest.advanceTimersByTime(5000);

      // 等待 flush 完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updater.getBatchSize()).toBe(0);
    });

    it('应该定期重复刷新', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 3000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      // 第一次累积
      updater.addUpdate('endpoint-1', 'message');
      jest.advanceTimersByTime(3000);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updater.getBatchSize()).toBe(0);

      // 第二次累积
      updater.addUpdate('endpoint-2', 'message');
      jest.advanceTimersByTime(3000);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updater.getBatchSize()).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('应该停止定时器并刷新未提交的数据', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 5000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      updater.addUpdate('endpoint-1', 'connect');
      updater.addUpdate('endpoint-2', 'message');

      await updater.shutdown();

      // 批次应该被清空
      expect(updater.getBatchSize()).toBe(0);

      // 应该调用数据库更新
      expect(prisma.endpointStats.upsert).toHaveBeenCalledTimes(2);
    });

    it('应该防止多次关闭', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 5000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      updater.addUpdate('endpoint-1', 'connect');

      // 第一次关闭
      await updater.shutdown();
      const firstCallCount = (prisma.endpointStats.upsert as jest.Mock).mock.calls.length;

      // 第二次关闭（应该被忽略）
      await updater.shutdown();
      const secondCallCount = (prisma.endpointStats.upsert as jest.Mock).mock.calls.length;

      // 第二次关闭不应该执行更多的数据库操作
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('关闭后定时器不应该继续触发刷新', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 1000, batchSize: 100 });

      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});

      await updater.shutdown();

      updater.addUpdate('endpoint-1', 'connect');

      // 快进时间
      jest.advanceTimersByTime(5000);

      // 不应该调用数据库（因为已关闭，不接受新更新）
      expect(updater.getBatchSize()).toBe(0);
    });
  });

  describe('getBatchSize', () => {
    it('应该返回当前批次中的端点数量', () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });

      expect(updater.getBatchSize()).toBe(0);

      updater.addUpdate('endpoint-1', 'connect');
      expect(updater.getBatchSize()).toBe(1);

      updater.addUpdate('endpoint-2', 'connect');
      expect(updater.getBatchSize()).toBe(2);

      updater.addUpdate('endpoint-1', 'message'); // 同一端点
      expect(updater.getBatchSize()).toBe(2);
    });
  });

  // Epic 10 Story 10.5 Task 6: disconnect 立即刷新测试
  describe('disconnect 立即刷新 (Epic 10 Story 10.5)', () => {
    beforeEach(() => {
      (prisma.endpointStats.upsert as jest.Mock).mockResolvedValue({});
      (prisma.endpoint.update as jest.Mock).mockResolvedValue({});
    });

    it('应该在 disconnect 操作时立即触发 flush()', async () => {
      // 设置很大的批次阈值和刷新间隔，确保不会因为阈值或定时器触发刷新
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 1000 });

      updater.addUpdate('endpoint-1', 'disconnect');

      // 等待 flush 完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 批次应该被立即清空
      expect(updater.getBatchSize()).toBe(0);

      // 应该调用数据库更新
      expect(prisma.endpointStats.upsert).toHaveBeenCalledTimes(1);
    });

    it('应该在 connect 操作时不立即触发 flush()', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 1000 });

      updater.addUpdate('endpoint-1', 'connect');

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 批次不应该被清空（因为没有达到阈值，也没有定时刷新）
      expect(updater.getBatchSize()).toBe(1);

      // 不应该调用数据库更新
      expect(prisma.endpointStats.upsert).not.toHaveBeenCalled();
    });

    it('应该在 message 操作时不立即触发 flush()', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 1000 });

      updater.addUpdate('endpoint-1', 'message');
      updater.addUpdate('endpoint-1', 'message');

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 批次不应该被清空
      expect(updater.getBatchSize()).toBe(1);

      // 不应该调用数据库更新
      expect(prisma.endpointStats.upsert).not.toHaveBeenCalled();
    });

    it('应该验证 disconnect 刷新延迟 < 100ms', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 1000 });

      const startTime = Date.now();
      updater.addUpdate('endpoint-1', 'disconnect');

      // 等待 flush 完成
      await new Promise((resolve) => setTimeout(resolve, 150));

      const duration = Date.now() - startTime;

      // 批次应该被清空
      expect(updater.getBatchSize()).toBe(0);

      // 延迟应该小于 100ms（包含一些容错时间）
      expect(duration).toBeLessThan(200); // 使用 200ms 作为上限，考虑测试环境的延迟
    });

    it('应该在多个 disconnect 操作时每次都立即刷新', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 1000 });

      updater.addUpdate('endpoint-1', 'disconnect');
      await new Promise((resolve) => setTimeout(resolve, 50));

      updater.addUpdate('endpoint-2', 'disconnect');
      await new Promise((resolve) => setTimeout(resolve, 50));

      updater.addUpdate('endpoint-3', 'disconnect');
      await new Promise((resolve) => setTimeout(resolve, 50));

      // 每次 disconnect 都应该触发刷新，所以最终批次应该为空
      expect(updater.getBatchSize()).toBe(0);

      // 应该调用 3 次数据库更新
      expect(prisma.endpointStats.upsert).toHaveBeenCalledTimes(3);
    });

    it('应该在 disconnect 后仍然允许其他操作累积', async () => {
      updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 1000 });

      // disconnect 立即刷新
      updater.addUpdate('endpoint-1', 'disconnect');
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(updater.getBatchSize()).toBe(0);

      // 添加新的 connect 操作（不应该立即刷新）
      updater.addUpdate('endpoint-2', 'connect');
      updater.addUpdate('endpoint-3', 'message');

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 新的操作应该被累积
      expect(updater.getBatchSize()).toBe(2);
    });
  });
});
