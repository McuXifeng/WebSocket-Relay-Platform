import express, { type RequestHandler } from 'express';
import {
  createCardHandler,
  getAllCardsHandler,
  getCardHandler,
  updateCardHandler,
  deleteCardHandler,
  getDeviceDataHistoryHandler,
} from '../controllers/visualization.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/visualization/cards - 创建卡片配置（需要认证）
 */
router.post(
  '/cards',
  authenticateToken,
  createCardHandler as RequestHandler
);

/**
 * GET /api/visualization/cards - 获取用户所有卡片配置（需要认证）
 */
router.get('/cards', authenticateToken, getAllCardsHandler as RequestHandler);

/**
 * GET /api/visualization/cards/:id - 获取单个卡片配置（需要认证）
 */
router.get('/cards/:id', authenticateToken, getCardHandler as RequestHandler);

/**
 * PUT /api/visualization/cards/:id - 更新卡片配置（需要认证）
 */
router.put(
  '/cards/:id',
  authenticateToken,
  updateCardHandler as RequestHandler
);

/**
 * DELETE /api/visualization/cards/:id - 删除卡片配置（需要认证）
 */
router.delete(
  '/cards/:id',
  authenticateToken,
  deleteCardHandler as RequestHandler
);

/**
 * GET /api/endpoints/:endpointId/devices/:deviceId/data/history - 获取设备历史数据（需要认证）
 */
router.get(
  '/endpoints/:endpointId/devices/:deviceId/data/history',
  authenticateToken,
  getDeviceDataHistoryHandler as RequestHandler
);

export default router;
