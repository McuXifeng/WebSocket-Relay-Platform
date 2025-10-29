/**
 * Auth Routes
 * 定义认证相关的 API 路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { validateRegister } from '../middleware/validation/register.validation.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { config } from '../config/env.js';

const router: IRouter = Router();

/**
 * 注册速率限制器
 * 限制每个 IP 每 15 分钟最多 5 次注册尝试（生产环境）
 * 开发环境和测试环境使用更宽松的限制以避免开发调试受阻
 * 防止暴力破解授权码和恶意注册
 */
const isTestEnv = config.nodeEnv === 'test';
const isDevelopmentEnv = config.isDevelopment;
const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: isTestEnv || isDevelopmentEnv ? 1000 : 5, // 测试/开发环境 1000 次,生产环境 5 次
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '注册请求过于频繁,请稍后再试',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
  skip: isTestEnv || isDevelopmentEnv ? () => true : () => false, // 测试/开发环境跳过速率限制
});

/**
 * 登录速率限制器
 * 限制每个 IP 每 15 分钟最多 5 次登录尝试（生产环境）
 * 开发环境和测试环境跳过限制以避免开发调试受阻
 * 防止暴力破解密码攻击
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: isTestEnv || isDevelopmentEnv ? 1000 : 5, // 测试/开发环境 1000 次,生产环境 5 次
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '登录请求过于频繁,请稍后再试',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true, // 返回 RateLimit-* headers
  legacyHeaders: false, // 禁用 X-RateLimit-* headers
  skip: isTestEnv || isDevelopmentEnv ? () => true : () => false, // 测试/开发环境跳过速率限制
});

/**
 * POST /register
 * 用户注册
 * 应用速率限制和输入验证中间件确保安全
 */
router.post(
  '/register',
  registerRateLimiter,
  validateRegister,
  authController.register as RequestHandler
);

/**
 * POST /login
 * 用户登录
 * 应用速率限制防止暴力破解攻击
 */
router.post('/login', loginRateLimiter, authController.login as RequestHandler);

/**
 * GET /me
 * 获取当前用户信息（需要认证）
 */
router.get('/me', authenticateToken, authController.getCurrentUser as RequestHandler);

export default router;
