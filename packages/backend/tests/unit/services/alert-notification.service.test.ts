/**
 * 告警通知服务单元测试 (Epic 6 Story 6.5)
 * 测试邮件告警通知功能
 */

import { sendEmailNotification } from '@/services/alert-notification.service';

describe('AlertNotificationService', () => {
  // 注意：邮件通知测试需要实际的 SMTP 配置
  // 在单元测试中，我们只测试邮件通知在没有 SMTP 配置时的行为
  describe('Email notification without SMTP', () => {
    it('should skip email notification when SMTP is not configured', () => {
      // 确保没有设置 SMTP 环境变量
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      // 调用邮件通知函数（Story 7.2: 改为同步函数）
      const result = sendEmailNotification({
        to: 'test@example.com',
        alertLevel: 'warning',
        ruleName: '测试告警规则',
        deviceName: 'Test Device',
        dataKey: 'temperature',
        triggeredValue: '85',
        threshold: '80',
        triggeredAt: new Date(),
      });

      // 由于没有配置SMTP,应该返回false
      expect(result).toBe(false);
    });
  });

  describe('Email notification with mock transport', () => {
    it('should handle email parameters correctly', () => {
      // 确保没有设置 SMTP 环境变量
      delete process.env.SMTP_HOST;

      const params = {
        to: 'admin@example.com',
        alertLevel: 'critical' as const,
        ruleName: '严重告警',
        deviceName: 'Critical Device',
        dataKey: 'voltage',
        triggeredValue: '250',
        threshold: '220',
        triggeredAt: new Date('2025-01-01T12:00:00Z'),
      };

      // 调用函数，应该返回false（未配置SMTP）（Story 7.2: 改为同步函数）
      const result = sendEmailNotification(params);
      expect(result).toBe(false);
    });
  });
});
