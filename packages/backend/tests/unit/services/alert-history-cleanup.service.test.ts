/**
 * Alert History Cleanup Service 单元测试
 * 测试告警历史清理功能 (Epic 6 Story 6.5 Task 16.5)
 */

import prisma from '../../../src/config/database';
import { cleanupAlertHistory } from '../../../src/services/alert-history.service';
import { config } from '../../../src/config/env';

describe('Alert History Cleanup Service', () => {
  // 测试用户ID
  const testUserId = 'test-user-cleanup-id';
  const testEndpointId = 'test-endpoint-cleanup-id';
  const testDeviceId = 'test-device-cleanup-id';
  const testRuleId = 'test-rule-cleanup-id';

  beforeEach(async () => {
    // 清理测试数据
    await prisma.alertHistory.deleteMany({
      where: {
        alert_rule: {
          user_id: testUserId,
        },
      },
    });

    await prisma.alertRule.deleteMany({
      where: { user_id: testUserId },
    });

    await prisma.device.deleteMany({
      where: { endpoint_id: testEndpointId },
    });

    await prisma.endpoint.deleteMany({
      where: { user_id: testUserId },
    });

    await prisma.user.deleteMany({
      where: { id: testUserId },
    });

    // 创建测试数据
    await prisma.user.create({
      data: {
        id: testUserId,
        username: 'cleanup-test-user',
        email: 'cleanup@test.com',
        password_hash: '$2b$10$test.hash.for.cleanup.user',
      },
    });

    await prisma.endpoint.create({
      data: {
        id: testEndpointId,
        endpoint_id: 'ep-cleanup',
        user_id: testUserId,
      },
    });

    await prisma.device.create({
      data: {
        id: testDeviceId,
        device_id: 'dev-cleanup',
        custom_name: 'Cleanup Test Device',
        endpoint_id: testEndpointId,
      },
    });

    await prisma.alertRule.create({
      data: {
        id: testRuleId,
        user_id: testUserId,
        endpoint_id: testEndpointId,
        device_id: testDeviceId,
        rule_name: 'Cleanup Test Rule',
        data_key: 'temperature',
        operator: '>',
        threshold: '30',
        alert_level: 'warning',
        enabled: true,
      },
    });
  });

  afterEach(async () => {
    // 清理测试数据
    await prisma.alertHistory.deleteMany({
      where: {
        alert_rule: {
          user_id: testUserId,
        },
      },
    });

    await prisma.alertRule.deleteMany({
      where: { user_id: testUserId },
    });

    await prisma.device.deleteMany({
      where: { endpoint_id: testEndpointId },
    });

    await prisma.endpoint.deleteMany({
      where: { user_id: testUserId },
    });

    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
  });

  it('应该成功清理过期的告警历史记录', async () => {
    // 创建过期的告警历史记录（超过保留天数）
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - (config.alertRetentionDays + 1));

    await prisma.alertHistory.create({
      data: {
        alert_rule_id: testRuleId,
        device_id: testDeviceId,
        triggered_at: expiredDate,
        data_key: 'temperature',
        triggered_value: '35',
        threshold: '30',
        alert_level: 'warning',
        status: 'unread',
      },
    });

    // 执行清理
    const result = await cleanupAlertHistory();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(1);
    expect(result.durationMs).toBeGreaterThan(0);

    // 验证记录已被删除
    const remainingAlerts = await prisma.alertHistory.count({
      where: {
        alert_rule_id: testRuleId,
      },
    });
    expect(remainingAlerts).toBe(0);
  });

  it('应该保留未过期的告警历史记录', async () => {
    // 创建未过期的告警历史记录（在保留天数内）
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - (config.alertRetentionDays - 1));

    await prisma.alertHistory.create({
      data: {
        alert_rule_id: testRuleId,
        device_id: testDeviceId,
        triggered_at: recentDate,
        data_key: 'temperature',
        triggered_value: '35',
        threshold: '30',
        alert_level: 'warning',
        status: 'unread',
      },
    });

    // 执行清理
    const result = await cleanupAlertHistory();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(0); // 未删除任何记录

    // 验证记录仍然存在
    const remainingAlerts = await prisma.alertHistory.count({
      where: {
        alert_rule_id: testRuleId,
      },
    });
    expect(remainingAlerts).toBe(1);
  });

  it('应该清理多条过期记录，保留未过期记录', async () => {
    // 创建3条过期记录
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - (config.alertRetentionDays + 5));

    for (let i = 0; i < 3; i++) {
      await prisma.alertHistory.create({
        data: {
          alert_rule_id: testRuleId,
          device_id: testDeviceId,
          triggered_at: new Date(expiredDate.getTime() + i * 60000), // 每条记录间隔1分钟
          data_key: 'temperature',
          triggered_value: '35',
          threshold: '30',
          alert_level: 'warning',
          status: 'unread',
        },
      });
    }

    // 创建2条未过期记录
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - (config.alertRetentionDays - 1));

    for (let i = 0; i < 2; i++) {
      await prisma.alertHistory.create({
        data: {
          alert_rule_id: testRuleId,
          device_id: testDeviceId,
          triggered_at: new Date(recentDate.getTime() + i * 60000),
          data_key: 'temperature',
          triggered_value: '35',
          threshold: '30',
          alert_level: 'warning',
          status: 'unread',
        },
      });
    }

    // 执行清理
    const result = await cleanupAlertHistory();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(3); // 删除了3条过期记录

    // 验证剩余2条未过期记录
    const remainingAlerts = await prisma.alertHistory.count({
      where: {
        alert_rule_id: testRuleId,
      },
    });
    expect(remainingAlerts).toBe(2);
  });

  it('应该在没有告警历史时正常运行', async () => {
    // 不创建任何告警历史记录
    const result = await cleanupAlertHistory();

    // 验证结果
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0); // 允许为0（测试可能在同一毫秒内完成）
  });

  it('应该在清理临界日期边界时正确处理', async () => {
    // 创建恰好等于保留天数减去1小时的记录（应该不被删除）
    const boundaryDate = new Date();
    boundaryDate.setDate(boundaryDate.getDate() - config.alertRetentionDays);
    boundaryDate.setHours(boundaryDate.getHours() + 1); // 加1小时,确保在保留期内

    await prisma.alertHistory.create({
      data: {
        alert_rule_id: testRuleId,
        device_id: testDeviceId,
        triggered_at: boundaryDate,
        data_key: 'temperature',
        triggered_value: '35',
        threshold: '30',
        alert_level: 'warning',
        status: 'unread',
      },
    });

    // 执行清理
    await cleanupAlertHistory();

    // 验证结果（边界日期加1小时不应该被删除）
    const remainingAlerts = await prisma.alertHistory.count({
      where: {
        alert_rule_id: testRuleId,
      },
    });
    expect(remainingAlerts).toBe(1);
  });
});
