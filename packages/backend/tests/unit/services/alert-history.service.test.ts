/**
 * 告警历史服务单元测试 (Epic 6 Story 6.5)
 * 测试告警历史查询、状态更新和删除操作
 */

import {
  getAlertHistory,
  getAlertHistoryById,
  markAsRead,
  markAsProcessed,
  deleteAlertHistory,
  markMultipleAsRead,
  deleteMultipleAlertHistory,
  getUnreadAlertCount,
} from '@/services/alert-history.service';
import prisma from '@/config/database';

describe('AlertHistoryService', () => {
  const TEST_USER_ID = 'test-user-history';
  const TEST_ENDPOINT_ID = 'test-endpoint-history';
  const TEST_DEVICE_ID = 'test-device-history';
  const TEST_ALERT_RULE_ID = 'test-alert-rule-history';
  const TEST_ALERT_HISTORY_ID = 'test-alert-history-001';

  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        username: 'testuser-history',
        email: 'testhistory@test.com',
        password_hash: 'dummy-hash',
        is_admin: false,
      },
    });

    // 创建测试端点
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.endpoint.create({
      data: {
        id: TEST_ENDPOINT_ID,
        endpoint_id: 'ep-hist-01',
        name: 'Test Endpoint for History',
        user_id: TEST_USER_ID,
      },
    });

    // 创建测试设备
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.device.create({
      data: {
        id: TEST_DEVICE_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: 'dev-hist-01',
        custom_name: 'Test Device History',
      },
    });

    // 创建测试告警规则
    await prisma.alertRule.deleteMany({ where: { id: TEST_ALERT_RULE_ID } });
    await prisma.alertRule.create({
      data: {
        id: TEST_ALERT_RULE_ID,
        user_id: TEST_USER_ID,
        endpoint_id: TEST_ENDPOINT_ID,
        device_id: TEST_DEVICE_ID,
        rule_name: '温度过高告警',
        data_key: 'temperature',
        operator: '>',
        threshold: '80',
        alert_level: 'warning',
        enabled: true,
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.alertHistory.deleteMany({ where: { alert_rule_id: TEST_ALERT_RULE_ID } });
    await prisma.alertRule.deleteMany({ where: { id: TEST_ALERT_RULE_ID } });
    await prisma.device.deleteMany({ where: { id: TEST_DEVICE_ID } });
    await prisma.endpoint.deleteMany({ where: { id: TEST_ENDPOINT_ID } });
    await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  });

  beforeEach(async () => {
    // 每个测试前清理告警历史
    await prisma.alertHistory.deleteMany({ where: { alert_rule_id: TEST_ALERT_RULE_ID } });
  });

  describe('getAlertHistory', () => {
    it('should get alert history with pagination', async () => {
      // 创建测试数据
      await prisma.alertHistory.create({
        data: {
          id: TEST_ALERT_HISTORY_ID,
          alert_rule_id: TEST_ALERT_RULE_ID,
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          triggered_value: '85',
          threshold: '80',
          alert_level: 'warning',
          status: 'unread',
        },
      });

      const result = await getAlertHistory(
        TEST_USER_ID,
        TEST_ENDPOINT_ID,
        {},
        { page: 1, pageSize: 20 }
      );

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by alert level', async () => {
      // 创建不同级别的告警
      await prisma.alertHistory.createMany({
        data: [
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '95',
            threshold: '90',
            alert_level: 'critical',
            status: 'unread',
          },
        ],
      });

      const result = await getAlertHistory(
        TEST_USER_ID,
        TEST_ENDPOINT_ID,
        { alertLevel: 'critical' },
        { page: 1, pageSize: 20 }
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].alert_level).toBe('critical');
    });

    it('should filter by status', async () => {
      // 创建不同状态的告警
      await prisma.alertHistory.createMany({
        data: [
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'read',
          },
        ],
      });

      const result = await getAlertHistory(
        TEST_USER_ID,
        TEST_ENDPOINT_ID,
        { status: 'unread' },
        { page: 1, pageSize: 20 }
      );

      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('unread');
    });
  });

  describe('getAlertHistoryById', () => {
    it('should get alert history by id', async () => {
      await prisma.alertHistory.create({
        data: {
          id: TEST_ALERT_HISTORY_ID,
          alert_rule_id: TEST_ALERT_RULE_ID,
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          triggered_value: '85',
          threshold: '80',
          alert_level: 'warning',
          status: 'unread',
        },
      });

      const result = await getAlertHistoryById(TEST_ALERT_HISTORY_ID, TEST_USER_ID);

      expect(result.id).toBe(TEST_ALERT_HISTORY_ID);
      expect(result.alert_rule.rule_name).toBe('温度过高告警');
    });

    it('should throw error for non-existent alert', async () => {
      await expect(getAlertHistoryById('non-existent-id', TEST_USER_ID)).rejects.toThrow(
        '告警历史记录不存在或无权访问'
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark alert as read', async () => {
      await prisma.alertHistory.create({
        data: {
          id: TEST_ALERT_HISTORY_ID,
          alert_rule_id: TEST_ALERT_RULE_ID,
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          triggered_value: '85',
          threshold: '80',
          alert_level: 'warning',
          status: 'unread',
        },
      });

      const result = await markAsRead(TEST_ALERT_HISTORY_ID, TEST_USER_ID);

      expect(result.status).toBe('read');
      expect(result.read_at).toBeTruthy();
    });

    it('should throw error for non-existent alert', async () => {
      await expect(markAsRead('non-existent-id', TEST_USER_ID)).rejects.toThrow(
        '告警历史记录不存在或无权访问'
      );
    });
  });

  describe('markAsProcessed', () => {
    it('should mark alert as processed', async () => {
      await prisma.alertHistory.create({
        data: {
          id: TEST_ALERT_HISTORY_ID,
          alert_rule_id: TEST_ALERT_RULE_ID,
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          triggered_value: '85',
          threshold: '80',
          alert_level: 'warning',
          status: 'read',
        },
      });

      const result = await markAsProcessed(TEST_ALERT_HISTORY_ID, TEST_USER_ID);

      expect(result.status).toBe('processed');
      expect(result.processed_at).toBeTruthy();
    });
  });

  describe('deleteAlertHistory', () => {
    it('should delete alert history', async () => {
      await prisma.alertHistory.create({
        data: {
          id: TEST_ALERT_HISTORY_ID,
          alert_rule_id: TEST_ALERT_RULE_ID,
          device_id: TEST_DEVICE_ID,
          data_key: 'temperature',
          triggered_value: '85',
          threshold: '80',
          alert_level: 'warning',
          status: 'unread',
        },
      });

      const result = await deleteAlertHistory(TEST_ALERT_HISTORY_ID, TEST_USER_ID);

      expect(result.id).toBe(TEST_ALERT_HISTORY_ID);

      // 验证已删除
      const deleted = await prisma.alertHistory.findUnique({
        where: { id: TEST_ALERT_HISTORY_ID },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('markMultipleAsRead', () => {
    it('should mark multiple alerts as read', async () => {
      const alert1Id = 'alert-multi-1';
      const alert2Id = 'alert-multi-2';

      await prisma.alertHistory.createMany({
        data: [
          {
            id: alert1Id,
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: alert2Id,
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '90',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
        ],
      });

      const count = await markMultipleAsRead([alert1Id, alert2Id], TEST_USER_ID);

      expect(count).toBe(2);

      // 验证已更新
      const alert1 = await prisma.alertHistory.findUnique({ where: { id: alert1Id } });
      const alert2 = await prisma.alertHistory.findUnique({ where: { id: alert2Id } });
      expect(alert1?.status).toBe('read');
      expect(alert2?.status).toBe('read');
    });

    it('should mark all unread alerts as read when alertIds is undefined', async () => {
      // 创建 3 个未读告警和 1 个已读告警
      await prisma.alertHistory.createMany({
        data: [
          {
            id: 'alert-all-1',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: 'alert-all-2',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '90',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: 'alert-all-3',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '95',
            threshold: '80',
            alert_level: 'critical',
            status: 'unread',
          },
          {
            id: 'alert-all-4',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '88',
            threshold: '80',
            alert_level: 'warning',
            status: 'read',
          },
        ],
      });

      // 不传 alertIds，应该标记所有未读告警为已读
      const count = await markMultipleAsRead(undefined, TEST_USER_ID);

      expect(count).toBe(3); // 只标记 3 个未读告警

      // 验证已更新
      const alerts = await prisma.alertHistory.findMany({
        where: { alert_rule_id: TEST_ALERT_RULE_ID },
        orderBy: { id: 'asc' },
      });
      expect(alerts.length).toBe(4);
      expect(alerts[0].status).toBe('read'); // alert-all-1
      expect(alerts[1].status).toBe('read'); // alert-all-2
      expect(alerts[2].status).toBe('read'); // alert-all-3
      expect(alerts[3].status).toBe('read'); // alert-all-4 (本来就是 read)
    });

    it('should mark all unread alerts for specific endpoint when endpointId is provided', async () => {
      // 创建另一个端点和告警规则
      const ANOTHER_ENDPOINT_ID = 'test-endpoint-history-2';
      const ANOTHER_ALERT_RULE_ID = 'test-alert-rule-history-2';
      const ANOTHER_DEVICE_ID = 'test-device-history-2';

      await prisma.endpoint.create({
        data: {
          id: ANOTHER_ENDPOINT_ID,
          endpoint_id: 'ep-hist-02',
          name: 'Another Endpoint for History',
          user_id: TEST_USER_ID,
        },
      });

      await prisma.device.create({
        data: {
          id: ANOTHER_DEVICE_ID,
          endpoint_id: ANOTHER_ENDPOINT_ID,
          device_id: 'dev-hist-02',
          custom_name: 'Another Device History',
        },
      });

      await prisma.alertRule.create({
        data: {
          id: ANOTHER_ALERT_RULE_ID,
          user_id: TEST_USER_ID,
          endpoint_id: ANOTHER_ENDPOINT_ID,
          device_id: ANOTHER_DEVICE_ID,
          rule_name: '湿度过高告警',
          data_key: 'humidity',
          operator: '>',
          threshold: '70',
          alert_level: 'warning',
          enabled: true,
        },
      });

      // 创建两个端点的未读告警
      await prisma.alertHistory.createMany({
        data: [
          {
            id: 'alert-ep1-1',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: 'alert-ep1-2',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '90',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: 'alert-ep2-1',
            alert_rule_id: ANOTHER_ALERT_RULE_ID,
            device_id: ANOTHER_DEVICE_ID,
            data_key: 'humidity',
            triggered_value: '75',
            threshold: '70',
            alert_level: 'warning',
            status: 'unread',
          },
        ],
      });

      // 只标记第一个端点的所有未读告警
      const count = await markMultipleAsRead(undefined, TEST_USER_ID, TEST_ENDPOINT_ID);

      expect(count).toBe(2); // 只标记端点 1 的 2 个未读告警

      // 验证端点 1 的告警已更新
      const ep1Alerts = await prisma.alertHistory.findMany({
        where: { alert_rule_id: TEST_ALERT_RULE_ID },
      });
      expect(ep1Alerts.every((alert) => alert.status === 'read')).toBe(true);

      // 验证端点 2 的告警未更新
      const ep2Alerts = await prisma.alertHistory.findMany({
        where: { alert_rule_id: ANOTHER_ALERT_RULE_ID },
      });
      expect(ep2Alerts.every((alert) => alert.status === 'unread')).toBe(true);

      // 清理测试数据
      await prisma.alertHistory.deleteMany({ where: { alert_rule_id: ANOTHER_ALERT_RULE_ID } });
      await prisma.alertRule.delete({ where: { id: ANOTHER_ALERT_RULE_ID } });
      await prisma.device.delete({ where: { id: ANOTHER_DEVICE_ID } });
      await prisma.endpoint.delete({ where: { id: ANOTHER_ENDPOINT_ID } });
    });

    it('should mark only specified alerts when alertIds array is provided', async () => {
      // 创建多个未读告警
      await prisma.alertHistory.createMany({
        data: [
          {
            id: 'alert-specific-1',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: 'alert-specific-2',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '90',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: 'alert-specific-3',
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '95',
            threshold: '80',
            alert_level: 'critical',
            status: 'unread',
          },
        ],
      });

      // 只标记前两个告警
      const count = await markMultipleAsRead(
        ['alert-specific-1', 'alert-specific-2'],
        TEST_USER_ID
      );

      expect(count).toBe(2);

      // 验证只有前两个告警被更新
      const alert1 = await prisma.alertHistory.findUnique({ where: { id: 'alert-specific-1' } });
      const alert2 = await prisma.alertHistory.findUnique({ where: { id: 'alert-specific-2' } });
      const alert3 = await prisma.alertHistory.findUnique({ where: { id: 'alert-specific-3' } });
      expect(alert1?.status).toBe('read');
      expect(alert2?.status).toBe('read');
      expect(alert3?.status).toBe('unread'); // 仍然是未读
    });
  });

  describe('deleteMultipleAlertHistory', () => {
    it('should delete multiple alert history records', async () => {
      const alert1Id = 'alert-delete-multi-1';
      const alert2Id = 'alert-delete-multi-2';

      await prisma.alertHistory.createMany({
        data: [
          {
            id: alert1Id,
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            id: alert2Id,
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '90',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
        ],
      });

      const count = await deleteMultipleAlertHistory([alert1Id, alert2Id], TEST_USER_ID);

      expect(count).toBe(2);

      // 验证已删除
      const alert1 = await prisma.alertHistory.findUnique({ where: { id: alert1Id } });
      const alert2 = await prisma.alertHistory.findUnique({ where: { id: alert2Id } });
      expect(alert1).toBeNull();
      expect(alert2).toBeNull();
    });
  });

  describe('getUnreadAlertCount', () => {
    it('should get unread alert count', async () => {
      await prisma.alertHistory.createMany({
        data: [
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '90',
            threshold: '80',
            alert_level: 'warning',
            status: 'unread',
          },
          {
            alert_rule_id: TEST_ALERT_RULE_ID,
            device_id: TEST_DEVICE_ID,
            data_key: 'temperature',
            triggered_value: '85',
            threshold: '80',
            alert_level: 'warning',
            status: 'read',
          },
        ],
      });

      const count = await getUnreadAlertCount(TEST_USER_ID, TEST_ENDPOINT_ID);

      expect(count).toBe(2);
    });
  });
});
