/**
 * Alert History API 集成测试 (Epic 6 Story 6.5)
 * 测试告警历史 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('Alert History API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let endpointId: string;
  let deviceId: string;
  let ruleId: string;

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'alert_history_testuser',
        email: 'alert_history@example.com',
        password_hash: 'hashed-password',
      },
    });
    userId = user.id;

    // 生成 JWT Token
    authToken = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: false },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        user_id: userId,
        endpoint_id: 'TEST-EP-HIST',
        name: 'Alert History Test Endpoint',
      },
    });
    endpointId = endpoint.id;

    // 创建测试设备
    const device = await prisma.device.create({
      data: {
        endpoint_id: endpointId,
        device_id: 'TEST-DEVICE-HIST',
        custom_name: 'Test History Device',
      },
    });
    deviceId = device.id;

    // 创建测试告警规则
    const rule = await prisma.alertRule.create({
      data: {
        user_id: userId,
        endpoint_id: endpointId,
        device_id: deviceId,
        rule_name: '测试规则',
        data_key: 'temperature',
        operator: '>',
        threshold: '30',
        alert_level: 'warning',
        enabled: true,
      },
    });
    ruleId = rule.id;
  });

  afterEach(async () => {
    // 清理告警历史数据
    await prisma.alertHistory.deleteMany();
  });

  afterAll(async () => {
    // 清理所有测试数据
    await prisma.alertHistory.deleteMany();
    await prisma.alertRule.deleteMany({ where: { user_id: userId } });
    await prisma.device.deleteMany({ where: { endpoint_id: endpointId } });
    await prisma.endpoint.deleteMany({ where: { user_id: userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('GET /api/alert-history - 获取告警历史记录', () => {
    beforeEach(async () => {
      // 创建测试告警历史记录
      await prisma.alertHistory.createMany({
        data: [
          {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '35',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
          {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '40',
            threshold: '30',
            alert_level: 'critical',
            status: 'read',
            notification_sent: true,
            email_sent: true,
            read_at: new Date(),
          },
        ],
      });
    });

    it('应该成功获取所有告警历史记录', async () => {
      const response = await request(app)
        .get('/api/alert-history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.data.pageSize).toBe(20);
    });

    it('应该成功按告警级别筛选历史记录', async () => {
      const response = await request(app)
        .get('/api/alert-history?alert_level=critical')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data.data[0].alert_level).toBe('critical');
    });

    it('应该成功按状态筛选历史记录', async () => {
      const response = await request(app)
        .get('/api/alert-history?status=unread')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data.data[0].status).toBe('unread');
    });

    it('应该成功按设备筛选历史记录', async () => {
      const response = await request(app)
        .get(`/api/alert-history?device_id=${deviceId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/alert-history?page=1&pageSize=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.data.pageSize).toBe(1);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.totalPages).toBe(2);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get('/api/alert-history');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/alert-history/:alertId - 获取单个告警详情', () => {
    let alertId: string;

    beforeEach(async () => {
      const alert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'temperature',
          triggered_value: '35',
          threshold: '30',
          alert_level: 'warning',
          status: 'unread',
          notification_sent: true,
          email_sent: false,
        },
      });
      alertId = alert.id;
    });

    it('应该成功获取告警详情', async () => {
      const response = await request(app)
        .get(`/api/alert-history/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(alertId);
      expect(response.body.data_key).toBe('temperature');
      expect(response.body.triggered_value).toBe('35');
      expect(response.body.threshold).toBe('30');
      expect(response.body.alert_level).toBe('warning');
      expect(response.body.data.status).toBe('unread');
    });

    it('应该在告警不存在时返回 404 错误', async () => {
      const response = await request(app)
        .get('/api/alert-history/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get(`/api/alert-history/${alertId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/alert-history/:alertId/read - 标记告警为已读', () => {
    let alertId: string;

    beforeEach(async () => {
      const alert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'temperature',
          triggered_value: '35',
          threshold: '30',
          alert_level: 'warning',
          status: 'unread',
          notification_sent: true,
          email_sent: false,
        },
      });
      alertId = alert.id;
    });

    it('应该成功标记告警为已读', async () => {
      const response = await request(app)
        .patch(`/api/alert-history/${alertId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('read');
      expect(response.body.read_at).toBeTruthy();

      // 验证数据库中的状态已更新
      const updated = await prisma.alertHistory.findUnique({
        where: { id: alertId },
      });
      expect(updated?.status).toBe('read');
      expect(updated?.read_at).toBeTruthy();
    });

    it('应该在告警不存在时返回 404 错误', async () => {
      const response = await request(app)
        .patch('/api/alert-history/nonexistent-id/read')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).patch(`/api/alert-history/${alertId}/read`);

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/alert-history/:alertId/processed - 标记告警为已处理', () => {
    let alertId: string;

    beforeEach(async () => {
      const alert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'temperature',
          triggered_value: '35',
          threshold: '30',
          alert_level: 'warning',
          status: 'unread',
          notification_sent: true,
          email_sent: false,
        },
      });
      alertId = alert.id;
    });

    it('应该成功标记告警为已处理', async () => {
      const response = await request(app)
        .patch(`/api/alert-history/${alertId}/processed`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('processed');
      expect(response.body.processed_at).toBeTruthy();

      // 验证数据库中的状态已更新
      const updated = await prisma.alertHistory.findUnique({
        where: { id: alertId },
      });
      expect(updated?.status).toBe('processed');
      expect(updated?.processed_at).toBeTruthy();
    });

    it('应该在告警不存在时返回 404 错误', async () => {
      const response = await request(app)
        .patch('/api/alert-history/nonexistent-id/processed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).patch(`/api/alert-history/${alertId}/processed`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/alert-history/:alertId - 删除告警历史记录', () => {
    let alertId: string;

    beforeEach(async () => {
      const alert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'temperature',
          triggered_value: '35',
          threshold: '30',
          alert_level: 'warning',
          status: 'unread',
          notification_sent: true,
          email_sent: false,
        },
      });
      alertId = alert.id;
    });

    it('应该成功删除告警历史记录', async () => {
      const response = await request(app)
        .delete(`/api/alert-history/${alertId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // 验证数据库中记录已删除
      const deleted = await prisma.alertHistory.findUnique({
        where: { id: alertId },
      });
      expect(deleted).toBeNull();
    });

    it('应该在告警不存在时返回 404 错误', async () => {
      const response = await request(app)
        .delete('/api/alert-history/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).delete(`/api/alert-history/${alertId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/alert-history/batch/read - 批量标记为已读', () => {
    let alertIds: string[];

    beforeEach(async () => {
      // 创建 3 条未读告警记录
      const alerts = await Promise.all([
        prisma.alertHistory.create({
          data: {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '35',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
        }),
        prisma.alertHistory.create({
          data: {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '36',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
        }),
        prisma.alertHistory.create({
          data: {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '37',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
        }),
      ]);
      alertIds = alerts.map((a) => a.id);
    });

    it('应该成功批量标记为已读', async () => {
      const response = await request(app)
        .post('/api/alert-history/batch/read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alertIds });

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(3);

      // 验证数据库中所有记录已标记为已读
      const updated = await prisma.alertHistory.findMany({
        where: { id: { in: alertIds } },
      });
      updated.forEach((alert) => {
        expect(alert.status).toBe('read');
        expect(alert.read_at).toBeTruthy();
      });
    });

    it('应该在 alertIds 不是数组时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/alert-history/batch/read')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alertIds: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('alertIds 必须是数组');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).post('/api/alert-history/batch/read').send({ alertIds });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/alert-history/batch/delete - 批量删除告警历史', () => {
    let alertIds: string[];

    beforeEach(async () => {
      // 创建 3 条告警记录
      const alerts = await Promise.all([
        prisma.alertHistory.create({
          data: {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '35',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
        }),
        prisma.alertHistory.create({
          data: {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '36',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
        }),
        prisma.alertHistory.create({
          data: {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '37',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
        }),
      ]);
      alertIds = alerts.map((a) => a.id);
    });

    it('应该成功批量删除告警历史', async () => {
      const response = await request(app)
        .post('/api/alert-history/batch/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alertIds });

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(3);

      // 验证数据库中所有记录已删除
      const deleted = await prisma.alertHistory.findMany({
        where: { id: { in: alertIds } },
      });
      expect(deleted.length).toBe(0);
    });

    it('应该在 alertIds 不是数组时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/alert-history/batch/delete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ alertIds: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('alertIds 必须是数组');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app)
        .post('/api/alert-history/batch/delete')
        .send({ alertIds });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/alert-history/unread/count - 获取未读告警数量', () => {
    beforeEach(async () => {
      // 创建 2 条未读和 1 条已读告警记录
      await prisma.alertHistory.createMany({
        data: [
          {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '35',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
          {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '36',
            threshold: '30',
            alert_level: 'warning',
            status: 'unread',
            notification_sent: true,
            email_sent: false,
          },
          {
            alert_rule_id: ruleId,
            device_id: deviceId,
            data_key: 'temperature',
            triggered_value: '40',
            threshold: '30',
            alert_level: 'critical',
            status: 'read',
            notification_sent: true,
            email_sent: true,
            read_at: new Date(),
          },
        ],
      });
    });

    it('应该成功获取未读告警数量', async () => {
      const response = await request(app)
        .get('/api/alert-history/unread/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(2);
    });

    it('应该支持按端点筛选未读告警数量', async () => {
      const response = await request(app)
        .get(`/api/alert-history/unread/count?endpointId=${endpointId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(2);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get('/api/alert-history/unread/count');

      expect(response.status).toBe(401);
    });
  });
});
