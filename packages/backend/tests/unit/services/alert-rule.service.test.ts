/**
 * alert-rule.service 单元测试
 * 测试告警规则的CRUD操作和验证逻辑（Epic 6 Story 6.5）
 */

import {
  createAlertRule,
  getAlertRules,
  getAlertRuleById,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
} from '@/services/alert-rule.service';
import prisma from '@/config/database';
import { AppError } from '@/middleware/error-handler.middleware';

describe('alert-rule.service', () => {
  const TEST_USER_ID = 'test-user-alert-rule';
  const TEST_ENDPOINT_ID = 'test-endpoint-alert-rule';
  const TEST_DEVICE_ID = 'test-device-alert-rule';
  const TEST_ENDPOINT_IDENTIFIER = 'ep-alert-01';
  const TEST_DEVICE_IDENTIFIER = 'dev-alert-01';

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-alert-rule',
        email: 'testalert@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建测试端点
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID,
        endpoint_id: TEST_ENDPOINT_IDENTIFIER,
        name: 'Test Endpoint for Alert Rule',
        user_id: TEST_USER_ID,
      },
    });

    // 创建测试设备
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_IDENTIFIER,
        custom_name: 'Test Device Alert',
      },
    });
  });

  beforeEach(async () => {
    // 清理告警规则记录
    await prisma.alertRule.deleteMany({
      where: { user_id: TEST_USER_ID },
    });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.alertRule.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  describe('createAlertRule', () => {
    it('应该成功创建告警规则', async () => {
      const rule = await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '温度过高告警',
        dataKey: 'temperature',
        operator: '>',
        threshold: '30',
        alertLevel: 'warning',
        enabled: true,
      });

      expect(rule).toBeDefined();
      expect(rule.rule_name).toBe('温度过高告警');
      expect(rule.data_key).toBe('temperature');
      expect(rule.operator).toBe('>');
      expect(rule.threshold).toBe('30');
      expect(rule.alert_level).toBe('warning');
      expect(rule.enabled).toBe(true);
    });

    it('应该拒绝不合法的运算符', async () => {
      await expect(
        createAlertRule({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          deviceId: TEST_DEVICE_ID,
          ruleName: '测试规则',
          dataKey: 'temperature',
          operator: '===', // 不合法的运算符
          threshold: '30',
          alertLevel: 'warning',
        })
      ).rejects.toThrow(AppError);
    });

    it('应该拒绝不合法的告警级别', async () => {
      await expect(
        createAlertRule({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          deviceId: TEST_DEVICE_ID,
          ruleName: '测试规则',
          dataKey: 'temperature',
          operator: '>',
          threshold: '30',
          alertLevel: 'super-critical', // 不合法的级别
        })
      ).rejects.toThrow(AppError);
    });

    it('应该拒绝访问不属于用户的端点', async () => {
      const anotherUserId = 'another-user-id';
      await expect(
        createAlertRule({
          userId: anotherUserId,
          endpointId: TEST_ENDPOINT_ID,
          deviceId: TEST_DEVICE_ID,
          ruleName: '测试规则',
          dataKey: 'temperature',
          operator: '>',
          threshold: '30',
          alertLevel: 'warning',
        })
      ).rejects.toThrow(AppError);
    });

    it('应该拒绝创建超过50条规则', async () => {
      // 创建50条规则
      for (let i = 0; i < 50; i++) {
        await createAlertRule({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          deviceId: TEST_DEVICE_ID,
          ruleName: `规则${i}`,
          dataKey: 'temperature',
          operator: '>',
          threshold: '30',
          alertLevel: 'info',
        });
      }

      // 尝试创建第51条规则
      await expect(
        createAlertRule({
          userId: TEST_USER_ID,
          endpointId: TEST_ENDPOINT_ID,
          deviceId: TEST_DEVICE_ID,
          ruleName: '第51条规则',
          dataKey: 'temperature',
          operator: '>',
          threshold: '30',
          alertLevel: 'info',
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('getAlertRules', () => {
    beforeEach(async () => {
      // 创建测试规则
      await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '规则1',
        dataKey: 'temperature',
        operator: '>',
        threshold: '30',
        alertLevel: 'warning',
        enabled: true,
      });

      await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '规则2',
        dataKey: 'humidity',
        operator: '<',
        threshold: '40',
        alertLevel: 'info',
        enabled: false,
      });
    });

    it('应该获取用户的所有告警规则', async () => {
      const result = await getAlertRules({
        userId: TEST_USER_ID,
      });

      expect(result.rules.length).toBe(2);
      expect(result.pagination.total).toBe(2);
    });

    it('应该支持按端点筛选', async () => {
      const result = await getAlertRules({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
      });

      expect(result.rules.length).toBe(2);
    });

    it('应该支持按启用状态筛选', async () => {
      const result = await getAlertRules({
        userId: TEST_USER_ID,
        enabled: true,
      });

      expect(result.rules.length).toBe(1);
      expect(result.rules[0].rule_name).toBe('规则1');
    });

    it('应该支持分页', async () => {
      const result = await getAlertRules({
        userId: TEST_USER_ID,
        page: 1,
        pageSize: 1,
      });

      expect(result.rules.length).toBe(1);
      expect(result.pagination.totalPages).toBe(2);
    });
  });

  describe('getAlertRuleById', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '测试规则',
        dataKey: 'temperature',
        operator: '>',
        threshold: '30',
        alertLevel: 'warning',
      });
      ruleId = rule.id;
    });

    it('应该成功获取告警规则详情', async () => {
      const rule = await getAlertRuleById(ruleId, TEST_USER_ID);
      expect(rule).toBeDefined();
      expect(rule.rule_name).toBe('测试规则');
    });

    it('应该拒绝访问不属于用户的规则', async () => {
      await expect(getAlertRuleById(ruleId, 'another-user-id')).rejects.toThrow(AppError);
    });

    it('应该拒绝访问不存在的规则', async () => {
      await expect(getAlertRuleById('non-existent-id', TEST_USER_ID)).rejects.toThrow(AppError);
    });
  });

  describe('updateAlertRule', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '原始规则',
        dataKey: 'temperature',
        operator: '>',
        threshold: '30',
        alertLevel: 'warning',
      });
      ruleId = rule.id;
    });

    it('应该成功更新告警规则', async () => {
      const updatedRule = await updateAlertRule(ruleId, TEST_USER_ID, {
        ruleName: '更新后的规则',
        threshold: '35',
        alertLevel: 'critical',
      });

      expect(updatedRule.rule_name).toBe('更新后的规则');
      expect(updatedRule.threshold).toBe('35');
      expect(updatedRule.alert_level).toBe('critical');
    });

    it('应该拒绝更新不属于用户的规则', async () => {
      await expect(updateAlertRule(ruleId, 'another-user-id', { threshold: '40' })).rejects.toThrow(
        AppError
      );
    });

    it('应该拒绝使用不合法的参数更新', async () => {
      await expect(
        updateAlertRule(ruleId, TEST_USER_ID, {
          operator: '===', // 不合法的运算符
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteAlertRule', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '待删除规则',
        dataKey: 'temperature',
        operator: '>',
        threshold: '30',
        alertLevel: 'warning',
      });
      ruleId = rule.id;
    });

    it('应该成功删除告警规则', async () => {
      await deleteAlertRule(ruleId, TEST_USER_ID);

      const result = await getAlertRules({ userId: TEST_USER_ID });
      expect(result.rules.length).toBe(0);
    });

    it('应该拒绝删除不属于用户的规则', async () => {
      await expect(deleteAlertRule(ruleId, 'another-user-id')).rejects.toThrow(AppError);
    });
  });

  describe('toggleAlertRule', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await createAlertRule({
        userId: TEST_USER_ID,
        endpointId: TEST_ENDPOINT_ID,
        deviceId: TEST_DEVICE_ID,
        ruleName: '测试规则',
        dataKey: 'temperature',
        operator: '>',
        threshold: '30',
        alertLevel: 'warning',
        enabled: true,
      });
      ruleId = rule.id;
    });

    it('应该成功禁用告警规则', async () => {
      const result = await toggleAlertRule(ruleId, TEST_USER_ID, false);
      expect(result.enabled).toBe(false);
    });

    it('应该成功启用告警规则', async () => {
      await toggleAlertRule(ruleId, TEST_USER_ID, false);
      const result = await toggleAlertRule(ruleId, TEST_USER_ID, true);
      expect(result.enabled).toBe(true);
    });

    it('应该拒绝切换不属于用户的规则', async () => {
      await expect(toggleAlertRule(ruleId, 'another-user-id', false)).rejects.toThrow(AppError);
    });
  });
});
