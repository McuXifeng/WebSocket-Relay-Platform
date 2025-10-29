/**
 * Endpoint Routes
 * 定义端点管理相关的 API 路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import * as endpointController from '../controllers/endpoint.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router: IRouter = Router();

/**
 * GET /
 * 查询端点列表（需要认证）
 * 应用 JWT 认证中间件保护路由
 */
router.get('/', authenticateToken, endpointController.getEndpoints as RequestHandler);

/**
 * POST /
 * 创建新端点（需要认证）
 * 应用 JWT 认证中间件保护路由
 */
router.post('/', authenticateToken, endpointController.createEndpoint as RequestHandler);

/**
 * GET /:id
 * 查询单个端点详情（需要认证）
 * 应用 JWT 认证中间件保护路由
 */
router.get('/:id', authenticateToken, endpointController.getEndpointById as RequestHandler);

/**
 * DELETE /:id
 * 删除端点（需要认证）
 * 应用 JWT 认证中间件保护路由
 */
router.delete('/:id', authenticateToken, endpointController.deleteEndpoint as RequestHandler);

/**
 * GET /:id/stats
 * 获取端点统计数据（需要认证）
 * 应用 JWT 认证中间件保护路由
 */
router.get('/:id/stats', authenticateToken, endpointController.getEndpointStats as RequestHandler);

/**
 * GET /:id/messages
 * 获取端点历史消息（需要认证）
 * 应用 JWT 认证中间件保护路由
 * Story 3.10: 历史消息存储和展示功能
 */
router.get(
  '/:id/messages',
  authenticateToken,
  endpointController.getEndpointMessages as RequestHandler
);

/**
 * GET /:id/devices
 * 获取端点的设备列表（需要认证）
 * 应用 JWT 认证中间件保护路由
 * Story 3.11: 连接设备管理和自定义名称永久化
 */
router.get(
  '/:id/devices',
  authenticateToken,
  endpointController.getEndpointDevices as RequestHandler
);

/**
 * PUT /:id/forwarding-mode
 * 更新端点转发模式（需要认证）
 * 应用 JWT 认证中间件保护路由
 * Story 5.6: 实现端点自定义转发规则配置
 */
router.put(
  '/:id/forwarding-mode',
  authenticateToken,
  endpointController.updateForwardingMode as RequestHandler
);

/**
 * PUT /:endpointId/devices/:deviceId
 * 更新设备名称（需要认证）
 * 应用 JWT 认证中间件保护路由
 * Story 3.11: 连接设备管理和自定义名称永久化
 */
router.put(
  '/:endpointId/devices/:deviceId',
  authenticateToken,
  endpointController.updateDeviceName as RequestHandler
);

export default router;
