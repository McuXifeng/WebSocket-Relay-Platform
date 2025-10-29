/**
 * Admin Routes
 * 定义管理员相关的 API 路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

/**
 * POST /invite-codes
 * 创建授权码（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT，再通过 requireAdmin 验证管理员权限
 */
router.post(
  '/invite-codes',
  authenticateToken,
  requireAdmin,
  adminController.createInviteCode as RequestHandler
);

/**
 * GET /invite-codes
 * 获取授权码列表（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT,再通过 requireAdmin 验证管理员权限
 */
router.get(
  '/invite-codes',
  authenticateToken,
  requireAdmin,
  adminController.getInviteCodes as RequestHandler
);

/**
 * GET /users
 * 获取用户列表（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT,再通过 requireAdmin 验证管理员权限
 */
router.get('/users', authenticateToken, requireAdmin, adminController.getUsers as RequestHandler);

export default router;
