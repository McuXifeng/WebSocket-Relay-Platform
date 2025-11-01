/**
 * ControlRoutes
 * 控制指令路由 (Epic 6 Story 6.4)
 * 定义设备控制指令相关的API路由
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { sendCommand, getHistory, getCommandDetail } from '../controllers/control.controller';

const router = Router();

// 所有控制指令路由都需要身份验证
router.use(authenticateToken);

/**
 * POST /api/endpoints/:endpointId/devices/:deviceId/control
 * 发送控制指令到指定设备
 */
router.post('/:endpointId/devices/:deviceId/control', (req, res) => void sendCommand(req, res));

/**
 * GET /api/endpoints/:endpointId/devices/:deviceId/control/history
 * 获取设备的控制指令历史
 */
router.get(
  '/:endpointId/devices/:deviceId/control/history',
  (req, res) => void getHistory(req, res)
);

/**
 * GET /api/endpoints/:endpointId/devices/:deviceId/control/:commandId
 * 获取指定控制指令的详情
 */
router.get(
  '/:endpointId/devices/:deviceId/control/:commandId',
  (req, res) => void getCommandDetail(req, res)
);

export default router;
