/**
 * Alert Rule API 集成测试 (Epic 6 Story 6.5)
 * 测试告警规则 API 的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import jwt from 'jsonwebtoken';
import { config } from '@/config/env';

describe('Alert Rule API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let endpointId: string;
  let deviceId: string;

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'alert_rule_testuser',
        email: 'alert_rule@example.com',
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
        endpoint_id: 'TEST-EP-01',
        name: 'Alert Rule Test Endpoint',
      },
    });
    endpointId = endpoint.id;

    // 创建测试设备
    const device = await prisma.device.create({
      data: {
        endpoint_id: endpointId,
        device_id: 'TEST-DEVICE-01',
        custom_name: 'Test Device',
      },
    });
    deviceId = device.id;
  });

  afterEach(async () => {
    // 清理告警规则和历史数据
    await prisma.alertHistory.deleteMany();
    await prisma.alertRule.deleteMany({ where: { user_id: userId } });
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

  describe('POST /api/alert-rules - 创建告警规则', () => {
    it('应该成功创建告警规则', async () => {
      const response = await request(app)
        .post('/api/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.rule_name).toBe('温度告警');
      expect(response.body.data.data_key).toBe('temperature');
      expect(response.body.data.operator).toBe('>');
      expect(response.body.data.threshold).toBe('30');
      expect(response.body.data.alert_level).toBe('warning');
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.user_id).toBe(userId);
      expect(response.body.data.endpoint_id).toBe(endpointId);
      expect(response.body.data.device_id).toBe(deviceId);
    });

    it('应该在缺少必填参数时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          // 缺少 device_id
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('缺少必填参数');
    });

    it('应该在无效运算符时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: 'invalid',
          threshold: '30',
          alert_level: 'warning',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('无效的运算符');
    });

    it('应该在无效告警级别时返回 400 错误', async () => {
      const response = await request(app)
        .post('/api/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('无效的告警级别');
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).post('/api/alert-rules').send({
        endpoint_id: endpointId,
        device_id: deviceId,
        rule_name: '温度告警',
        data_key: 'temperature',
        operator: '>',
        threshold: '30',
        alert_level: 'warning',
      });

      expect(response.status).toBe(401);
    });

    it('应该在超过告警规则数量限制(50条)时返回 400 错误', async () => {
      // 创建 50 条告警规则
      const rules = Array.from({ length: 50 }, (_, i) => ({
        user_id: userId,
        endpoint_id: endpointId,
        device_id: deviceId,
        rule_name: `规则 ${i + 1}`,
        data_key: 'temperature',
        operator: '>',
        threshold: '30',
        alert_level: 'warning',
        enabled: true,
      }));

      await prisma.alertRule.createMany({ data: rules });

      // 尝试创建第 51 条规则
      const response = await request(app)
        .post('/api/alert-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '规则 51',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('已达到告警规则数量上限');
    });
  });

  describe('GET /api/alert-rules - 获取告警规则列表', () => {
    beforeEach(async () => {
      // 创建测试告警规则
      await prisma.alertRule.createMany({
        data: [
          {
            user_id: userId,
            endpoint_id: endpointId,
            device_id: deviceId,
            rule_name: '温度告警',
            data_key: 'temperature',
            operator: '>',
            threshold: '30',
            alert_level: 'warning',
            enabled: true,
          },
          {
            user_id: userId,
            endpoint_id: endpointId,
            device_id: deviceId,
            rule_name: '湿度告警',
            data_key: 'humidity',
            operator: '<',
            threshold: '20',
            alert_level: 'critical',
            enabled: false,
          },
        ],
      });
    });

    it('应该成功获取所有告警规则', async () => {
      const response = await request(app)
        .get('/api/alert-rules')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('rules');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.rules)).toBe(true);
      expect(response.body.data.rules.length).toBe(2);
      expect(response.body.data.rules[0]).toHaveProperty('rule_name');
      expect(response.body.data.rules[0]).toHaveProperty('data_key');
      expect(response.body.data.rules[0]).toHaveProperty('operator');
      expect(response.body.data.rules[0]).toHaveProperty('threshold');
      expect(response.body.data.rules[0]).toHaveProperty('alert_level');
      expect(response.body.data.rules[0]).toHaveProperty('enabled');
      expect(response.body.data.pagination.total).toBe(2);
    });

    it('应该成功按端点筛选告警规则', async () => {
      const response = await request(app)
        .get(`/api/alert-rules?endpointId=${endpointId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rules');
      expect(response.body.data.rules.length).toBe(2);
    });

    it('应该成功按启用状态筛选告警规则', async () => {
      const response = await request(app)
        .get('/api/alert-rules?enabled=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('rules');
      expect(response.body.data.rules.length).toBe(1);
      expect(response.body.data.rules[0].rule_name).toBe('温度告警');
      expect(response.body.data.rules[0].enabled).toBe(true);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get('/api/alert-rules');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/alert-rules/:ruleId - 获取单个告警规则详情', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await prisma.alertRule.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        },
      });
      ruleId = rule.id;
    });

    it('应该成功获取告警规则详情', async () => {
      const response = await request(app)
        .get(`/api/alert-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(ruleId);
      expect(response.body.data.rule_name).toBe('温度告警');
      expect(response.body.data.data_key).toBe('temperature');
      expect(response.body.data.operator).toBe('>');
      expect(response.body.data.threshold).toBe('30');
      expect(response.body.data.alert_level).toBe('warning');
    });

    it('应该在规则不存在时返回 404 错误', async () => {
      const response = await request(app)
        .get('/api/alert-rules/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).get(`/api/alert-rules/${ruleId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/alert-rules/:ruleId - 更新告警规则', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await prisma.alertRule.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        },
      });
      ruleId = rule.id;
    });

    it('应该成功更新告警规则', async () => {
      const response = await request(app)
        .put(`/api/alert-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rule_name: '高温告警',
          threshold: '40',
          alert_level: 'critical',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.rule_name).toBe('高温告警');
      expect(response.body.data.threshold).toBe('40');
      expect(response.body.data.alert_level).toBe('critical');
    });

    it('应该在无效运算符时返回 400 错误', async () => {
      const response = await request(app)
        .put(`/api/alert-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          operator: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('无效的运算符');
    });

    it('应该在规则不存在时返回 404 错误', async () => {
      const response = await request(app)
        .put('/api/alert-rules/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rule_name: '高温告警',
        });

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).put(`/api/alert-rules/${ruleId}`).send({
        rule_name: '高温告警',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/alert-rules/:ruleId - 删除告警规则', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await prisma.alertRule.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        },
      });
      ruleId = rule.id;
    });

    it('应该成功删除告警规则', async () => {
      const response = await request(app)
        .delete(`/api/alert-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // 验证数据库中规则已删除
      const deletedRule = await prisma.alertRule.findUnique({
        where: { id: ruleId },
      });
      expect(deletedRule).toBeNull();
    });

    it('应该在规则不存在时返回 404 错误', async () => {
      const response = await request(app)
        .delete('/api/alert-rules/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app).delete(`/api/alert-rules/${ruleId}`);

      expect(response.status).toBe(401);
    });

    it('应该级联删除告警历史记录', async () => {
      // 创建告警历史记录
      const alertHistory = await prisma.alertHistory.create({
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

      // 删除告警规则
      await request(app)
        .delete(`/api/alert-rules/${ruleId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // 验证告警历史记录已删除
      const deletedHistory = await prisma.alertHistory.findUnique({
        where: { id: alertHistory.id },
      });
      expect(deletedHistory).toBeNull();
    });
  });

  describe('PATCH /api/alert-rules/:ruleId/toggle - 启用/禁用告警规则', () => {
    let ruleId: string;

    beforeEach(async () => {
      const rule = await prisma.alertRule.create({
        data: {
          user_id: userId,
          endpoint_id: endpointId,
          device_id: deviceId,
          rule_name: '温度告警',
          data_key: 'temperature',
          operator: '>',
          threshold: '30',
          alert_level: 'warning',
          enabled: true,
        },
      });
      ruleId = rule.id;
    });

    it('应该成功禁用告警规则', async () => {
      const response = await request(app)
        .patch(`/api/alert-rules/${ruleId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(false);
    });

    it('应该成功启用告警规则', async () => {
      // 先禁用规则
      await prisma.alertRule.update({
        where: { id: ruleId },
        data: { enabled: false },
      });

      const response = await request(app)
        .patch(`/api/alert-rules/${ruleId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body.data.enabled).toBe(true);
    });

    it('应该在 enabled 不是布尔值时返回 400 错误', async () => {
      const response = await request(app)
        .patch(`/api/alert-rules/${ruleId}/toggle`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('enabled 必须是布尔值');
    });

    it('应该在规则不存在时返回 404 错误', async () => {
      const response = await request(app)
        .patch('/api/alert-rules/nonexistent-id/toggle')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(404);
    });

    it('应该在未认证时返回 401 错误', async () => {
      const response = await request(app)
        .patch(`/api/alert-rules/${ruleId}/toggle`)
        .send({ enabled: false });

      expect(response.status).toBe(401);
    });
  });
});
