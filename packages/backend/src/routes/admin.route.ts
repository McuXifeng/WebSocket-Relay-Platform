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

/**
 * GET /users/:userId/endpoints
 * 获取指定用户的端点列表（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT,再通过 requireAdmin 验证管理员权限
 * Story 5.3: 用户管理页面 UI 优化
 */
router.get(
  '/users/:userId/endpoints',
  authenticateToken,
  requireAdmin,
  adminController.getUserEndpoints as RequestHandler
);

export default router;
