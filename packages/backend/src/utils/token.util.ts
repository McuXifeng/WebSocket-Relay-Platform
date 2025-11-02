/**
 * Mark Read Token Utility (Story 8.1)
 * 生成和验证邮件快速已读 Token
 */

import crypto from 'crypto';
import { config } from '../config/env';

/**
 * Mark Read Token Payload
 */
export interface MarkReadTokenPayload {
  alertId: string;
  timestamp: number;
  exp: number; // 过期时间戳(毫秒)
}

/**
 * 生成邮件快速已读 Token
 *
 * Token 格式: base64url(payload).signature
 * 使用 HMAC-SHA256 签名
 * 有效期 24 小时
 *
 * @param alertId - 告警历史 ID
 * @returns Token 字符串
 */
export function generateMarkReadToken(alertId: string): string {
  const timestamp = Date.now();
  const exp = timestamp + 24 * 60 * 60 * 1000; // 24 小时

  const payload: MarkReadTokenPayload = { alertId, timestamp, exp };
  const payloadString = JSON.stringify(payload);

  // 使用 HMAC-SHA256 签名
  const secret = config.markReadTokenSecret;
  const signature = crypto.createHmac('sha256', secret).update(payloadString).digest('base64url');

  // Token 格式: base64url(payload).signature
  const payloadBase64 = Buffer.from(payloadString).toString('base64url');
  return `${payloadBase64}.${signature}`;
}

/**
 * 验证邮件快速已读 Token
 *
 * 验证签名和过期时间
 * 不验证一次性使用（由调用方通过 UsedTokensService 验证）
 *
 * @param token - Token 字符串
 * @returns MarkReadTokenPayload - 解析后的 payload
 * @throws Error - Token 无效、签名错误或已过期
 */
export function verifyMarkReadToken(token: string): MarkReadTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Invalid token format');
  }

  const [payloadBase64, signature] = parts;
  const payloadString = Buffer.from(payloadBase64, 'base64url').toString('utf-8');

  // 验证签名
  const secret = config.markReadTokenSecret;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  // 解析 payload
  const payload: MarkReadTokenPayload = JSON.parse(payloadString) as MarkReadTokenPayload;

  // 验证过期时间
  if (Date.now() > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}
