/**
 * alert-detector.service 单元测试
 * 测试告警检测和触发逻辑（Epic 6 Story 6.5）
 */

import { evaluateRule, checkAlerts, triggerAlert } from '@/services/alert-detector.service';
import prisma from '@/config/database';

describe('alert-detector.service', () => {
  const TEST_USER_ID = 'test-user-alert-detector';
  const TEST_ENDPOINT_ID = 'test-endpoint-alert-detector';
  const TEST_DEVICE_ID = 'test-device-alert-detector';
  const TEST_ENDPOINT_IDENTIFIER = 'ep-detect-01';
  const TEST_DEVICE_IDENTIFIER = 'dev-detect-01';
  const TEST_ALERT_RULE_ID = 'test-alert-rule-detector';

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-detector',
        email: 'testdetector@test.com',
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
        name: 'Test Endpoint for Detector',
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
        custom_name: 'Test Device Detector',
      },
    });
  });

  beforeEach(async () => {
    // 清理测试数据
    await prisma.alertHistory.deleteMany({ where: { device_id: TEST_DEVICE_ID } });
    await prisma.alertRule.deleteMany({ where: { id: TEST_ALERT_RULE_ID } });
    await prisma.deviceData.deleteMany({ where: { device_id: TEST_DEVICE_ID } });
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.alertHistory.deleteMany({ where: { device_id: TEST_DEVICE_ID } });
    await prisma.alertRule.deleteMany({ where: { user_id: TEST_USER_ID } });
    await prisma.deviceData.deleteMany({ where: { device_id: TEST_DEVICE_ID } });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.$disconnect();
  });

  // 辅助函数：创建测试用的设备数据
  async function createTestDeviceData(dataKey: string, dataValue: string) {
    await prisma.deviceData.create({
      data: {
        device_id: TEST_DEVICE_ID,
        data_key: dataKey,
        data_value: dataValue,
        data_type: 'number',
        timestamp: new Date(),
      },
    });
  }

  // 辅助函数：创建测试用的告警规则
  async function createTestAlertRule(
    dataKey: string,
    operator: string,
    threshold: string,
    alertLevel: string = 'warning',
    enabled: boolean = true
  ) {
    return await prisma.alertRule.create({
      data: {
        id: TEST_ALERT_RULE_ID,
        user_id: TEST_USER_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_ID,
        rule_name: '测试规则',
        data_key: dataKey,
        operator,
        threshold,
        alert_level: alertLevel,
        enabled,
      },
      include: {
        device: {
          select: {
            device_id: true,
            custom_name: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  describe('evaluateRule', () => {
    it('应该成功触发告警（数值 > 阈值）', async () => {
      // 创建设备数据：温度35度
      await createTestDeviceData('temperature', '35');

      // 创建告警规则：温度 > 30
      const rule = await createTestAlertRule('temperature', '>', '30');

      // 评估规则
      const result = await evaluateRule(rule);

      expect(result).toBeDefined();
      expect(result.triggered_value).toBe('35');
      expect(result.threshold).toBe('30');
      expect(result.status).toBe('unread');
    });

    it('应该成功触发告警（数值 < 阈值）', async () => {
      // 创建设备数据：湿度20%
      await createTestDeviceData('humidity', '20');

      // 创建告警规则：湿度 < 30
      const rule = await createTestAlertRule('humidity', '<', '30');

      // 评估规则
      const result = await evaluateRule(rule);

      expect(result).toBeDefined();
      expect(result.triggered_value).toBe('20');
    });

    it('应该成功触发告警（字符串 == 阈值）', async () => {
      // 创建设备数据：状态 error
      await createTestDeviceData('status', 'error');

      // 创建告警规则：状态 == error
      const rule = await createTestAlertRule('status', '==', 'error');

      // 评估规则
      const result = await evaluateRule(rule);

      expect(result).toBeDefined();
      expect(result.triggered_value).toBe('error');
    });

    it('不应触发告警（条件不满足）', async () => {
      // 创建设备数据：温度25度
      await createTestDeviceData('temperature', '25');

      // 创建告警规则：温度 > 30
      const rule = await createTestAlertRule('temperature', '>', '30');

      // 评估规则
      const result = await evaluateRule(rule);

      expect(result).toBeNull();
    });

    it('不应触发告警（设备无对应数据键）', async () => {
      // 创建设备数据：温度35度
      await createTestDeviceData('temperature', '35');

      // 创建告警规则：湿度 > 30（但设备没有湿度数据）
      const rule = await createTestAlertRule('humidity', '>', '30');

      // 评估规则
      const result = await evaluateRule(rule);

      expect(result).toBeNull();
    });

    it('应该防止重复触发告警（防抖机制）', async () => {
      // 创建设备数据：温度35度
      await createTestDeviceData('temperature', '35');

      // 创建告警规则：温度 > 30
      const rule = await createTestAlertRule('temperature', '>', '30');

      // 第一次评估 - 应该触发
      const result1 = await evaluateRule(rule);
      expect(result1).toBeDefined();

      // 立即第二次评估 - 应该被防抖
      const result2 = await evaluateRule(rule);
      expect(result2).toBeNull();
    });

    it('不应触发告警（设备离线）', async () => {
      // 创建旧的设备数据（15分钟前）
      const oldTimestamp = new Date();
      oldTimestamp.setMinutes(oldTimestamp.getMinutes() - 15);
      await prisma.deviceData.create({
        data: {
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          data_value: '35',
          data_type: 'number',
          timestamp: oldTimestamp,
        },
      });

      // 创建告警规则：温度 > 30
      const rule = await createTestAlertRule('temperature', '>', '30');

      // 评估规则 - 应该因为设备离线而跳过
      const result = await evaluateRule(rule);
      expect(result).toBeNull();
    });
  });

  describe('checkAlerts', () => {
    it('应该检测并触发多个告警', async () => {
      // 创建设备数据
      await createTestDeviceData('temperature', '35');
      await createTestDeviceData('humidity', '20');

      // 创建多个告警规则
      await prisma.alertRule.create({
        data: {
          user_id: TEST_USER_ID,
          endpoint_id: TEST_ENDPOINT_ID,
          device_id: TEST_DEVICE_ID,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        },
      });

      await prisma.alertRule.create({
        data: {
          user_id: TEST_USER_ID,
          endpoint_id: TEST_ENDPOINT_ID,
          device_id: TEST_DEVICE_ID,
          rule_name: '湿度告警',
          data_key: 'humidity',
          operator: '<',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        },
      });

      // 执行告警检测
      const triggeredAlerts = await checkAlerts();

      expect(triggeredAlerts.length).toBe(2);
    });

    it('应该跳过已禁用的规则', async () => {
      // 先清理所有规则
      await prisma.alertRule.deleteMany({ where: { user_id: TEST_USER_ID } });

      // 创建设备数据
      await createTestDeviceData('temperature', '35');

      // 创建已禁用的告警规则
      await prisma.alertRule.create({
        data: {
          user_id: TEST_USER_ID,
          endpoint_id: TEST_ENDPOINT_ID,
          device_id: TEST_DEVICE_ID,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: false, // 禁用
        },
      });

      // 执行告警检测
      const triggeredAlerts = await checkAlerts();

      expect(triggeredAlerts.length).toBe(0);
    });
  });

  describe('triggerAlert', () => {
    beforeEach(async () => {
      // 创建告警规则
      await createTestAlertRule('temperature', '>', '30');
    });

    it('应该成功创建告警历史记录', async () => {
      const alertHistory = await triggerAlert(
        TEST_ALERT_RULE_ID,
        TEST_DEVICE_ID,
        'temperature',
        '35',
        '30',
        'warning'
      );

      expect(alertHistory).toBeDefined();
      expect(alertHistory.triggered_value).toBe('35');
      expect(alertHistory.threshold).toBe('30');
      expect(alertHistory.alert_level).toBe('warning');
      expect(alertHistory.status).toBe('unread');
      expect(alertHistory.notification_sent).toBe(false);
      expect(alertHistory.email_sent).toBe(false);
    });
  });
});
