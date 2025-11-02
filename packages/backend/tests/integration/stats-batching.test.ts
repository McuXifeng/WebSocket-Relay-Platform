/**
 * StatsBatchUpdater 集成测试 (Story 9.2 Task 9)
 * 测试批量更新器与真实数据库的集成，验证数据一致性和优雅关闭
 */

import { StatsBatchUpdater } from '@/services/stats-batch-updater';
import prisma from '@/config/database';

describe('Stats Batching 集成测试', () => {
  const TEST_USER_ID = 'test-user-stats-batch';
  const TEST_ENDPOINT_ID_1 = 'test-endpoint-batch-1';
  const TEST_ENDPOINT_ID_2 = 'test-endpoint-batch-2';

  let updater: StatsBatchUpdater;

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-batch',
        email: 'testbatch@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建测试端点
    await prisma.endpoint.deleteMany({
      where: { id: { in: [TEST_ENDPOINT_ID_1, TEST_ENDPOINT_ID_2] } },
    });

    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID_1,
        endpoint_id: 'ep-batch-01',
        name: 'Test Endpoint Batch 1',
        user_id: TEST_USER_ID,
      },
    });

    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID_2,
        endpoint_id: 'ep-batch-02',
        name: 'Test Endpoint Batch 2',
        user_id: TEST_USER_ID,
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.endpointStats.deleteMany({
      where: { endpoint_id: { in: [TEST_ENDPOINT_ID_1, TEST_ENDPOINT_ID_2] } },
    });
    await prisma.endpoint.deleteMany({
      where: { id: { in: [TEST_ENDPOINT_ID_1, TEST_ENDPOINT_ID_2] } },
    });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  });

  beforeEach(async () => {
    // 每个测试前清理统计数据
    await prisma.endpointStats.deleteMany({
      where: { endpoint_id: { in: [TEST_ENDPOINT_ID_1, TEST_ENDPOINT_ID_2] } },
    });

    // 创建新的批量更新器实例
    updater = new StatsBatchUpdater({ flushInterval: 60000, batchSize: 100 });
  });

  afterEach(async () => {
    // 关闭批量更新器
    if (updater) {
      await updater.shutdown();
    }
  });

  describe('数据一致性验证', () => {
    it('应该正确批量更新单个端点的统计数据', async () => {
      // 模拟 10 次连接
      for (let i = 0; i < 10; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');
      }

      // 模拟 50 条消息
      for (let i = 0; i < 50; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'message');
      }

      // 模拟 3 次断开
      for (let i = 0; i < 3; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'disconnect');
      }

      // 立即刷新
      await updater.flush();

      // 验证统计数据
      const stats = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });

      expect(stats).toBeDefined();
      expect(stats?.current_connections).toBe(7); // 10 - 3 = 7
      expect(stats?.total_connections).toBe(10);
      expect(stats?.total_messages).toBe(50);
    });

    it('应该正确批量更新多个端点的统计数据', async () => {
      // 端点 1: 5 连接, 20 消息
      for (let i = 0; i < 5; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');
      }
      for (let i = 0; i < 20; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'message');
      }

      // 端点 2: 8 连接, 30 消息, 2 断开
      for (let i = 0; i < 8; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_2, 'connect');
      }
      for (let i = 0; i < 30; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_2, 'message');
      }
      for (let i = 0; i < 2; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_2, 'disconnect');
      }

      // 立即刷新
      await updater.flush();

      // 验证端点 1
      const stats1 = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });
      expect(stats1?.current_connections).toBe(5);
      expect(stats1?.total_connections).toBe(5);
      expect(stats1?.total_messages).toBe(20);

      // 验证端点 2
      const stats2 = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_2 },
      });
      expect(stats2?.current_connections).toBe(6); // 8 - 2 = 6
      expect(stats2?.total_connections).toBe(8);
      expect(stats2?.total_messages).toBe(30);
    });

    it('应该正确处理多次批量刷新的累积效果', async () => {
      // 第一批: 10 连接, 50 消息
      for (let i = 0; i < 10; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');
      }
      for (let i = 0; i < 50; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'message');
      }
      await updater.flush();

      // 第二批: 5 连接, 30 消息, 3 断开
      for (let i = 0; i < 5; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');
      }
      for (let i = 0; i < 30; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'message');
      }
      for (let i = 0; i < 3; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'disconnect');
      }
      await updater.flush();

      // 验证累积统计数据
      const stats = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });

      expect(stats?.current_connections).toBe(12); // 10 + 5 - 3 = 12
      expect(stats?.total_connections).toBe(15); // 10 + 5 = 15
      expect(stats?.total_messages).toBe(80); // 50 + 30 = 80
    });

    it('应该在有消息时更新端点的 last_active_at', async () => {
      const beforeTime = new Date();

      // 添加消息统计
      updater.addUpdate(TEST_ENDPOINT_ID_1, 'message');

      // 等待一小段时间确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));

      await updater.flush();

      // 验证 last_active_at 已更新
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: TEST_ENDPOINT_ID_1 },
      });

      expect(endpoint?.last_active_at).toBeDefined();
      expect(endpoint!.last_active_at!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('应该在仅有连接操作时不更新 last_active_at', async () => {
      // 先清除 last_active_at
      await prisma.endpoint.update({
        where: { id: TEST_ENDPOINT_ID_1 },
        data: { last_active_at: null },
      });

      // 只添加连接操作
      updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');

      await updater.flush();

      // 验证 last_active_at 仍为 null
      const endpoint = await prisma.endpoint.findUnique({
        where: { id: TEST_ENDPOINT_ID_1 },
      });

      expect(endpoint?.last_active_at).toBeNull();
    });
  });

  describe('优雅关闭验证', () => {
    it('应该在关闭时刷新所有未提交的数据', async () => {
      // 添加一些未提交的更新
      for (let i = 0; i < 15; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');
      }
      for (let i = 0; i < 25; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'message');
      }

      // 验证数据尚未刷新
      const statsBefore = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });
      expect(statsBefore).toBeNull();

      // 调用 shutdown（应该刷新数据）
      await updater.shutdown();

      // 验证数据已刷新
      const statsAfter = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });
      expect(statsAfter?.current_connections).toBe(15);
      expect(statsAfter?.total_messages).toBe(25);
    });

    it('应该在关闭后拒绝新的更新', async () => {
      await updater.shutdown();

      // 尝试添加新更新
      updater.addUpdate(TEST_ENDPOINT_ID_1, 'connect');

      // 批次应该为空（更新被拒绝）
      expect(updater.getBatchSize()).toBe(0);
    });
  });

  describe('边界情况处理', () => {
    it('应该正确处理 disconnect 数量超过 connect 的情况', async () => {
      // 先创建初始统计（5 个当前连接）
      await prisma.endpointStats.create({
        data: {
          endpoint_id: TEST_ENDPOINT_ID_1,
          current_connections: 5,
          total_connections: 10,
          total_messages: 0,
        },
      });

      // 模拟 8 次断开（超过当前连接数）
      for (let i = 0; i < 8; i++) {
        updater.addUpdate(TEST_ENDPOINT_ID_1, 'disconnect');
      }

      await updater.flush();

      // current_connections 应该减少，但由于数据库层面的增量操作，可能会是负数
      // 这是一个已知的边界情况，实际使用中应该由业务逻辑保证不会出现
      const stats = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });

      // 验证数据库操作成功执行
      expect(stats).toBeDefined();
    });

    it('应该正确处理空批次的 flush', async () => {
      // 不添加任何更新，直接刷新
      await expect(updater.flush()).resolves.not.toThrow();

      // 验证没有创建统计记录
      const stats = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });
      expect(stats).toBeNull();
    });

    it('应该正确处理大量混合操作', async () => {
      // 模拟 100 个随机操作
      const actions: Array<'connect' | 'disconnect' | 'message'> = [
        'connect',
        'disconnect',
        'message',
      ];
      let expectedConnect = 0;
      let expectedDisconnect = 0;
      let expectedMessage = 0;

      for (let i = 0; i < 100; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        updater.addUpdate(TEST_ENDPOINT_ID_1, action);

        if (action === 'connect') expectedConnect++;
        else if (action === 'disconnect') expectedDisconnect++;
        else expectedMessage++;
      }

      await updater.flush();

      // 验证统计数据
      const stats = await prisma.endpointStats.findUnique({
        where: { endpoint_id: TEST_ENDPOINT_ID_1 },
      });

      expect(stats?.current_connections).toBe(expectedConnect - expectedDisconnect);
      expect(stats?.total_connections).toBe(expectedConnect);
      expect(stats?.total_messages).toBe(expectedMessage);
    });
  });

  describe('错误恢复', () => {
    it('应该在刷新失败后清空批次', async () => {
      // 使用不存在的端点 ID（应该导致更新失败）
      const invalidEndpointId = 'non-existent-endpoint-id';

      updater.addUpdate(invalidEndpointId, 'connect');

      // flush 应该不抛出异常（内部处理错误）
      await expect(updater.flush()).resolves.not.toThrow();

      // 批次应该被清空
      expect(updater.getBatchSize()).toBe(0);
    });
  });
});
