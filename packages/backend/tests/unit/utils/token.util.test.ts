/**
 * Unit tests for token.util.ts
 * Tests Token generation, verification, and security features
 */

import { generateMarkReadToken, verifyMarkReadToken } from '../../../src/utils/token.util';
import crypto from 'crypto';

describe('Mark Read Token Utils', () => {
  describe('generateMarkReadToken', () => {
    it('应该生成有效的 Token', () => {
      const alertId = 'test-alert-id-123';
      const token = generateMarkReadToken(alertId);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(2);
    });

    it('应该生成包含正确 payload 的 Token', () => {
      const alertId = 'test-alert-id-456';
      const token = generateMarkReadToken(alertId);

      const [payloadBase64] = token.split('.');
      const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadString) as {
        alertId: string;
        timestamp: number;
        exp: number;
      };

      expect(payload.alertId).toBe(alertId);
      expect(payload.timestamp).toBeGreaterThan(0);
      expect(payload.exp).toBeGreaterThan(Date.now());
      expect(payload.exp - payload.timestamp).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    it('应该为不同的 alertId 生成不同的 Token', () => {
      const token1 = generateMarkReadToken('alert-1');
      const token2 = generateMarkReadToken('alert-2');

      expect(token1).not.toBe(token2);
    });

    it('应该为同一个 alertId 在不同时间生成不同的 Token', () => {
      const alertId = 'test-alert-same-id';
      const token1 = generateMarkReadToken(alertId);

      // Wait 1ms to ensure different timestamp
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      return delay(1).then(() => {
        const token2 = generateMarkReadToken(alertId);
        expect(token1).not.toBe(token2);
      });
    });
  });

  describe('verifyMarkReadToken', () => {
    it('应该成功验证有效 Token', () => {
      const alertId = 'test-alert-verify-123';
      const token = generateMarkReadToken(alertId);

      const payload = verifyMarkReadToken(token);

      expect(payload).toBeTruthy();
      expect(payload.alertId).toBe(alertId);
      expect(payload.exp).toBeGreaterThan(Date.now());
    });

    it('应该拒绝格式错误的 Token', () => {
      const invalidTokens = [
        'invalid-token',
        'no-dot-separator',
        'too.many.dots.here',
        '',
        'only-one-part',
      ];

      invalidTokens.forEach((invalidToken) => {
        expect(() => verifyMarkReadToken(invalidToken)).toThrow('Invalid token format');
      });
    });

    it('应该拒绝签名错误的 Token', () => {
      const alertId = 'test-alert-bad-signature';
      const token = generateMarkReadToken(alertId);
      const [payloadBase64] = token.split('.');

      // Create invalid signature
      const invalidToken = `${payloadBase64}.invalid-signature-here`;

      expect(() => verifyMarkReadToken(invalidToken)).toThrow('Invalid token signature');
    });

    it('应该拒绝 payload 被篡改的 Token', () => {
      const alertId = 'test-alert-tampered';
      const token = generateMarkReadToken(alertId);
      const [, signature] = token.split('.');

      // Create tampered payload
      const tamperedPayload = JSON.stringify({
        alertId: 'different-alert-id',
        timestamp: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000,
      });
      const tamperedPayloadBase64 = Buffer.from(tamperedPayload).toString('base64url');
      const tamperedToken = `${tamperedPayloadBase64}.${signature}`;

      expect(() => verifyMarkReadToken(tamperedToken)).toThrow('Invalid token signature');
    });

    it('应该拒绝过期的 Token', () => {
      // Manually create an expired token
      const alertId = 'test-alert-expired';
      const timestamp = Date.now();
      const exp = timestamp - 1000; // Expired 1 second ago

      const payload = { alertId, timestamp, exp };
      const payloadString = JSON.stringify(payload);
      const payloadBase64 = Buffer.from(payloadString).toString('base64url');

      // Generate signature using the same secret
      const secret =
        process.env.MARK_READ_TOKEN_SECRET || process.env.JWT_SECRET || 'default-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('base64url');

      const expiredToken = `${payloadBase64}.${signature}`;

      expect(() => verifyMarkReadToken(expiredToken)).toThrow('Token expired');
    });

    it('应该拒绝非法 JSON payload 的 Token', () => {
      const invalidPayload = 'not-a-json-string';
      const payloadBase64 = Buffer.from(invalidPayload).toString('base64url');

      const secret =
        process.env.MARK_READ_TOKEN_SECRET || process.env.JWT_SECRET || 'default-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(invalidPayload)
        .digest('base64url');

      const invalidToken = `${payloadBase64}.${signature}`;

      expect(() => verifyMarkReadToken(invalidToken)).toThrow();
    });

    it('应该在 Token 过期时间边界正确处理', () => {
      // Create a token that expires in exactly 1ms ago
      const alertId = 'test-alert-boundary';
      const timestamp = Date.now();
      const exp = Date.now() - 1; // Expired 1ms ago

      const payload = { alertId, timestamp, exp };
      const payloadString = JSON.stringify(payload);
      const payloadBase64 = Buffer.from(payloadString).toString('base64url');

      const secret =
        process.env.MARK_READ_TOKEN_SECRET || process.env.JWT_SECRET || 'default-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('base64url');

      const boundaryToken = `${payloadBase64}.${signature}`;

      // Should fail because Date.now() > exp
      expect(() => verifyMarkReadToken(boundaryToken)).toThrow('Token expired');
    });
  });

  describe('Token Security', () => {
    it('应该使用正确的签名算法 (HMAC-SHA256)', () => {
      const alertId = 'test-alert-algo';
      const token = generateMarkReadToken(alertId);
      const [payloadBase64, signature] = token.split('.');

      // Verify signature manually
      const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const secret =
        process.env.MARK_READ_TOKEN_SECRET || process.env.JWT_SECRET || 'default-secret';
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('base64url');

      expect(signature).toBe(expectedSignature);
    });

    it('应该在环境变量存在时使用 MARK_READ_TOKEN_SECRET', () => {
      const originalSecret = process.env.MARK_READ_TOKEN_SECRET;
      process.env.MARK_READ_TOKEN_SECRET = 'custom-secret-key';

      const alertId = 'test-alert-custom-secret';
      const token = generateMarkReadToken(alertId);

      // Verify token uses custom secret
      const payload = verifyMarkReadToken(token);
      expect(payload.alertId).toBe(alertId);

      // Restore original secret
      if (originalSecret) {
        process.env.MARK_READ_TOKEN_SECRET = originalSecret;
      } else {
        delete process.env.MARK_READ_TOKEN_SECRET;
      }
    });

    it('应该在 MARK_READ_TOKEN_SECRET 不存在时回退到 JWT_SECRET', () => {
      const originalMarkReadSecret = process.env.MARK_READ_TOKEN_SECRET;
      const originalJwtSecret = process.env.JWT_SECRET;

      delete process.env.MARK_READ_TOKEN_SECRET;
      process.env.JWT_SECRET = 'jwt-fallback-secret';

      const alertId = 'test-alert-jwt-fallback';
      const token = generateMarkReadToken(alertId);

      // Verify token uses JWT_SECRET
      const payload = verifyMarkReadToken(token);
      expect(payload.alertId).toBe(alertId);

      // Restore original secrets
      if (originalMarkReadSecret) {
        process.env.MARK_READ_TOKEN_SECRET = originalMarkReadSecret;
      }
      if (originalJwtSecret) {
        process.env.JWT_SECRET = originalJwtSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
    });
  });

  describe('Token Format', () => {
    it('应该生成 URL 安全的 Token (base64url)', () => {
      const alertId = 'test-alert-url-safe';
      const token = generateMarkReadToken(alertId);

      // URL-safe base64 should not contain +, /, or =
      expect(token).not.toMatch(/[+/=]/);
    });

    it('应该生成的 Token 长度合理 (< 500 字符)', () => {
      const alertId = 'test-alert-length';
      const token = generateMarkReadToken(alertId);

      expect(token.length).toBeLessThan(500);
      expect(token.length).toBeGreaterThan(50); // At least some reasonable length
    });
  });

  describe('Edge Cases', () => {
    it('应该处理空字符串 alertId', () => {
      const token = generateMarkReadToken('');
      const payload = verifyMarkReadToken(token);
      expect(payload.alertId).toBe('');
    });

    it('应该处理特殊字符 alertId', () => {
      const specialIds = [
        'alert-with-特殊字符',
        'alert/with/slashes',
        'alert@with#special$chars',
        'alert with spaces',
      ];

      specialIds.forEach((alertId) => {
        const token = generateMarkReadToken(alertId);
        const payload = verifyMarkReadToken(token);
        expect(payload.alertId).toBe(alertId);
      });
    });

    it('应该处理非常长的 alertId (UUID + 额外信息)', () => {
      const longAlertId =
        'very-long-alert-id-with-uuid-90730061-3fe9-4087-a96f-ba0bc01f2ed9-and-more-data';
      const token = generateMarkReadToken(longAlertId);
      const payload = verifyMarkReadToken(token);
      expect(payload.alertId).toBe(longAlertId);
    });
  });
});
