/**
 * Admin Routes
 * 定义管理员相关的 API 路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as banController from '../controllers/ban.controller.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

/**
 * POST /invite-codes
 * 创建授权码（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT，再通过 requireAdmin 验证管理员权限
 */
router.post(
  '/invite-codes',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  adminController.getInviteCodes as RequestHandler
);

/**
 * GET /users
 * 获取用户列表（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT,再通过 requireAdmin 验证管理员权限
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get('/users', authenticateToken, requireAdmin, adminController.getUsers as RequestHandler);

/**
 * GET /users/:userId/endpoints
 * 获取指定用户的端点列表（需要管理员权限）
 * 先通过 authenticateToken 验证 JWT,再通过 requireAdmin 验证管理员权限
 * Story 5.3: 用户管理页面 UI 优化
 */
router.get(
  '/users/:userId/endpoints',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  adminController.getUserEndpoints as RequestHandler
);

/**
 * POST /users/:userId/ban
 * 封禁用户（需要管理员权限）
 * Epic 10 Story 10.3: 后端封禁API实现
 */
router.post(
  '/users/:userId/ban',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  banController.banUser as RequestHandler
);

/**
 * POST /users/:userId/unban
 * 解封用户（需要管理员权限）
 * Epic 10 Story 10.3: 后端封禁API实现
 */
router.post(
  '/users/:userId/unban',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  banController.unbanUser as RequestHandler
);

/**
 * POST /endpoints/:endpointId/disable
 * 禁用端点（需要管理员权限）
 * Epic 10 Story 10.3: 后端封禁API实现
 */
router.post(
  '/endpoints/:endpointId/disable',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  banController.disableEndpoint as RequestHandler
);

/**
 * POST /endpoints/:endpointId/enable
 * 启用端点（需要管理员权限）
 * Epic 10 Story 10.3: 后端封禁API实现
 */
router.post(
  '/endpoints/:endpointId/enable',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  banController.enableEndpoint as RequestHandler
);

/**
 * GET /ban-logs
 * 查询封禁日志（需要管理员权限）
 * Epic 10 Story 10.3: 后端封禁API实现
 */
router.get(
  '/ban-logs',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  authenticateToken,
  requireAdmin,
  banController.getBanLogs as RequestHandler
);

export default router;
