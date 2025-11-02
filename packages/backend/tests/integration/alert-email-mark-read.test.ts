/**
 * Alert Email Mark Read API 集成测试 (Story 8.1)
 * 测试邮件内快速已读功能的完整流程
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import request from 'supertest';
import app from '@/app';
import prisma from '@/config/database';
import { config } from '@/config/env';
import { generateMarkReadToken, verifyMarkReadToken } from '@/utils/token.util';
import { usedTokensService } from '@/services/used-tokens.service';
import crypto from 'crypto';

describe('Alert Email Mark Read API Integration Tests', () => {
  let userId: string;
  let endpointId: string;
  let deviceId: string;
  let ruleId: string;
  let alertId: string;

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'email_mark_read_testuser',
        email: 'email_mark_read@example.com',
        password_hash: 'hashed-password',
      },
    });
    userId = user.id;

    // 创建测试端点
    const endpoint = await prisma.endpoint.create({
      data: {
        user_id: userId,
        endpoint_id: 'TEST-EP-EMAIL',
        name: 'Email Mark Read Test Endpoint',
      },
    });
    endpointId = endpoint.id;

    // 创建测试设备
    const device = await prisma.device.create({
      data: {
        endpoint_id: endpoint.id,
        device_id: 'test-device-email',
        name: 'Test Device Email',
      },
    });
    deviceId = device.id;

    // 创建告警规则
    const alertRule = await prisma.alertRule.create({
      data: {
        endpoint_id: endpoint.id,
        name: 'Email Mark Read Test Rule',
        data_key: 'temperature',
        condition: 'greater_than',
        threshold: '30',
        alert_level: 'warning',
        enabled: true,
      },
    });
    ruleId = alertRule.id;

    // 创建测试告警
    const alert = await prisma.alertHistory.create({
      data: {
        alert_rule_id: ruleId,
        device_id: deviceId,
        data_key: 'temperature',
        alert_level: 'warning',
        triggered_value: '35',
        threshold: '30',
        status: 'unread',
        message: 'Test alert for email mark read',
      },
    });
    alertId = alert.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.alertHistory.deleteMany({ where: { device_id: deviceId } });
    await prisma.alertRule.deleteMany({ where: { endpoint_id: endpointId } });
    await prisma.device.deleteMany({ where: { endpoint_id: endpointId } });
    await prisma.endpoint.deleteMany({ where: { id: endpointId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  beforeEach(() => {
    // 清空 used tokens
    usedTokensService['usedTokens'].clear();
  });

  describe('GET /api/alert-history/mark-read?token=xxx', () => {
    it('应该通过有效 Token 成功标记告警为已读', async () => {
      // 1. 生成 Token
      const token = generateMarkReadToken(alertId);

      // 2. 调用邮件快速已读 API
      const response = await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      // 3. 验证响应
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('告警已标记为已读');
      expect(response.text).toContain('✅');

      // 4. 验证数据库状态已更新
      const updatedAlert = await prisma.alertHistory.findUnique({
        where: { id: alertId },
      });

      expect(updatedAlert).toBeTruthy();
      expect(updatedAlert?.status).toBe('read');
      expect(updatedAlert?.read_at).toBeTruthy();

      // 5. 验证 Token 已被标记为已使用
      expect(usedTokensService.isTokenUsed(token)).toBe(true);
    });

    it('应该拒绝重复使用的 Token (409 Conflict)', async () => {
      // 1. 创建新告警
      const newAlert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'temperature',
          alert_level: 'warning',
          triggered_value: '40',
          threshold: '30',
          status: 'unread',
          message: 'Test alert for duplicate token',
        },
      });

      // 2. 生成 Token 并第一次使用
      const token = generateMarkReadToken(newAlert.id);

      await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      // 3. 第二次使用相同 Token (应该失败)
      const response = await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      expect(response.status).toBe(409); // Conflict
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.message).toContain('已使用');

      // 清理
      await prisma.alertHistory.delete({ where: { id: newAlert.id } });
    });

    it('应该拒绝签名错误的 Token (401 Unauthorized)', async () => {
      // 1. 生成有效 Token
      const validToken = generateMarkReadToken(alertId);
      const [payloadBase64] = validToken.split('.');

      // 2. 创建签名错误的 Token
      const invalidToken = `${payloadBase64}.invalid-signature-here`;

      // 3. 调用 API
      const response = await request(app).get(`/api/alert-history/mark-read?token=${invalidToken}`);

      expect(response.status).toBe(401); // Unauthorized
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.message).toContain('签名');
    });

    it('应该拒绝过期的 Token (410 Gone)', async () => {
      // 1. 手动创建过期 Token
      const timestamp = Date.now();
      const exp = timestamp - 1000; // 已过期 1 秒

      const payload = { alertId, timestamp, exp };
      const payloadString = JSON.stringify(payload);
      const payloadBase64 = Buffer.from(payloadString).toString('base64url');

      const secret =
        process.env.MARK_READ_TOKEN_SECRET || process.env.JWT_SECRET || 'default-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('base64url');

      const expiredToken = `${payloadBase64}.${signature}`;

      // 2. 调用 API
      const response = await request(app).get(`/api/alert-history/mark-read?token=${expiredToken}`);

      expect(response.status).toBe(410); // Gone
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.message).toContain('过期');
    });

    it('应该拒绝格式错误的 Token (400 Bad Request)', async () => {
      const invalidTokens = ['invalid-token', 'no-dot-separator', 'too.many.dots.here', ''];

      for (const invalidToken of invalidTokens) {
        const response = await request(app).get(
          `/api/alert-history/mark-read?token=${invalidToken}`
        );

        expect(response.status).toBe(400); // Bad Request
        expect(response.body.error).toBeTruthy();
      }
    });

    it('应该拒绝不存在的告警 ID (404 Not Found)', async () => {
      // 1. 生成指向不存在告警的 Token
      const nonExistentAlertId = 'non-existent-alert-id-12345';
      const token = generateMarkReadToken(nonExistentAlertId);

      // 2. 调用 API
      const response = await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      expect(response.status).toBe(404); // Not Found
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.message).toContain('告警不存在');
    });

    it('应该拒绝缺少 Token 参数的请求 (400 Bad Request)', async () => {
      const response = await request(app).get('/api/alert-history/mark-read');

      expect(response.status).toBe(400); // Bad Request
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.message).toContain('Token');
    });

    it('应该正确处理已读告警的再次标记 (幂等性)', async () => {
      // 1. 创建新告警并标记为已读
      const newAlert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'temperature',
          alert_level: 'info',
          triggered_value: '25',
          threshold: '30',
          status: 'read',
          read_at: new Date(),
          message: 'Already read alert',
        },
      });

      // 2. 生成 Token 并尝试再次标记
      const token = generateMarkReadToken(newAlert.id);

      const response = await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      // 3. 应该成功返回 (幂等操作)
      expect(response.status).toBe(200);
      expect(response.text).toContain('告警已标记为已读');

      // 清理
      await prisma.alertHistory.delete({ where: { id: newAlert.id } });
    });

    it('应该在成功标记后返回正确的 HTML 响应', async () => {
      // 1. 创建新告警
      const newAlert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'humidity',
          alert_level: 'critical',
          triggered_value: '90',
          threshold: '80',
          status: 'unread',
          message: 'High humidity alert',
        },
      });

      // 2. 生成 Token 并调用 API
      const token = generateMarkReadToken(newAlert.id);

      const response = await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      // 3. 验证 HTML 响应格式
      expect(response.status).toBe(200);
      expect(response.type).toBe('text/html');
      expect(response.text).toContain('<!DOCTYPE html>');
      expect(response.text).toContain('<html');
      expect(response.text).toContain('<head>');
      expect(response.text).toContain('<body');
      expect(response.text).toContain('告警已标记为已读');
      expect(response.text).toContain('✅');

      // 清理
      await prisma.alertHistory.delete({ where: { id: newAlert.id } });
    });

    it('应该正确处理 URL 编码的 Token', async () => {
      // 1. 生成 Token
      const token = generateMarkReadToken(alertId);

      // 2. URL 编码 Token (虽然 base64url 应该不需要编码)
      const encodedToken = encodeURIComponent(token);

      // 3. 清理之前的测试,重置告警状态
      await prisma.alertHistory.update({
        where: { id: alertId },
        data: { status: 'unread', read_at: null },
      });

      // 4. 调用 API
      const response = await request(app).get(`/api/alert-history/mark-read?token=${encodedToken}`);

      expect(response.status).toBe(200);
      expect(response.text).toContain('告警已标记为已读');
    });

    it('应该在并发请求时保证 Token 一次性使用', async () => {
      // 1. 创建新告警
      const newAlert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'pressure',
          alert_level: 'warning',
          triggered_value: '1100',
          threshold: '1000',
          status: 'unread',
          message: 'High pressure alert',
        },
      });

      // 2. 生成 Token
      const token = generateMarkReadToken(newAlert.id);

      // 3. 并发发送多个请求
      const responses = await Promise.all([
        request(app).get(`/api/alert-history/mark-read?token=${token}`),
        request(app).get(`/api/alert-history/mark-read?token=${token}`),
        request(app).get(`/api/alert-history/mark-read?token=${token}`),
      ]);

      // 4. 验证只有一个请求成功 (200),其他请求失败 (409)
      const successResponses = responses.filter((r) => r.status === 200);
      const conflictResponses = responses.filter((r) => r.status === 409);

      expect(successResponses.length).toBe(1);
      expect(conflictResponses.length).toBe(2);

      // 清理
      await prisma.alertHistory.delete({ where: { id: newAlert.id } });
    });
  });

  describe('Token Generation in Email Templates', () => {
    it('应该验证生成的 Token 可以在邮件模板中使用', () => {
      // 1. 生成 Token
      const token = generateMarkReadToken(alertId);

      // 2. 验证 Token 是 URL 安全的 (base64url)
      expect(token).not.toMatch(/[+/=]/); // Should not contain +, /, or =

      // 3. 验证 Token 长度合理 (适合嵌入邮件 URL)
      expect(token.length).toBeLessThan(500);

      // 4. 构建邮件 URL
      const frontendUrl = config.frontendUrl || 'http://localhost:3000';
      const emailUrl = `${frontendUrl}/api/alert-history/mark-read?token=${token}`;

      // 5. 验证 URL 格式正确
      expect(emailUrl).toMatch(/^https?:\/\/.+\/api\/alert-history\/mark-read\?token=.+$/);
    });

    it('应该确保 Token 包含正确的告警 ID', () => {
      // 1. 生成 Token
      const token = generateMarkReadToken(alertId);

      // 2. 验证 Token
      const payload = verifyMarkReadToken(token);

      expect(payload.alertId).toBe(alertId);
    });
  });

  describe('Security and Error Handling', () => {
    it('应该在 Token 验证失败时记录日志 (模拟)', async () => {
      // 测试各种错误场景是否正确处理
      const invalidToken = 'invalid.token';

      const response = await request(app).get(`/api/alert-history/mark-read?token=${invalidToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it('应该在数据库更新失败时正确处理', async () => {
      // 1. 创建告警后立即删除,模拟数据不一致
      const tempAlert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'test',
          alert_level: 'info',
          triggered_value: '10',
          threshold: '5',
          status: 'unread',
        },
      });

      const token = generateMarkReadToken(tempAlert.id);

      // 删除告警
      await prisma.alertHistory.delete({ where: { id: tempAlert.id } });

      // 2. 尝试标记已读
      const response = await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('告警不存在');
    });
  });

  describe('Integration with Used Tokens Service', () => {
    it('应该正确集成 UsedTokensService', async () => {
      // 1. 创建新告警
      const newAlert = await prisma.alertHistory.create({
        data: {
          alert_rule_id: ruleId,
          device_id: deviceId,
          data_key: 'voltage',
          alert_level: 'critical',
          triggered_value: '250',
          threshold: '220',
          status: 'unread',
        },
      });

      const token = generateMarkReadToken(newAlert.id);

      // 2. 验证 Token 未使用
      expect(usedTokensService.isTokenUsed(token)).toBe(false);

      // 3. 调用 API
      await request(app).get(`/api/alert-history/mark-read?token=${token}`);

      // 4. 验证 Token 已标记为使用
      expect(usedTokensService.isTokenUsed(token)).toBe(true);

      // 清理
      await prisma.alertHistory.delete({ where: { id: newAlert.id } });
    });
  });
});
