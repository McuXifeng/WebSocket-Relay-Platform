/**
 * Alert History Routes (Epic 6 Story 6.5, Story 8.1)
 * 定义告警历史相关的路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import {
  getAlertHistory,
  getAlertHistoryById,
  markAsRead,
  markAsProcessed,
  deleteAlertHistory,
  markMultipleAsRead,
  deleteMultipleAlertHistory,
  getUnreadAlertCount,
  markAsReadByToken, // Story 8.1
} from '../controllers/alert-history.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: IRouter = Router();

/**
 * @route GET /api/alert-history/mark-read
 * @desc 通过邮件 Token 标记告警为已读 (Story 8.1)
 * @access Public (通过 Token 验证)
 * @query token - 邮件中的快速已读 Token
 */
router.get('/mark-read', markAsReadByToken as RequestHandler);

// 以下路由需要身份认证
router.use(authenticateToken);

/**
 * @route GET /api/alert-history
 * @desc 获取告警历史记录（支持筛选和分页）
 * @access Private
 * @query endpointId - 可选，按端点筛选
 * @query alertLevel - 可选，按告警级别筛选 (info/warning/critical)
 * @query deviceId - 可选，按设备筛选
 * @query status - 可选，按状态筛选 (unread/read/processed)
 * @query startDate - 可选，开始时间
 * @query endDate - 可选，结束时间
 * @query page - 可选，页码（默认 1）
 * @query pageSize - 可选，每页数量（默认 20）
 */
router.get('/', getAlertHistory as RequestHandler);

/**
 * @route GET /api/alert-history/unread/count
 * @desc 获取未读告警数量
 * @access Private
 * @query endpointId - 可选，按端点筛选
 */
router.get('/unread/count', getUnreadAlertCount as RequestHandler);

/**
 * @route POST /api/alert-history/batch/read
 * @desc 批量标记告警为已读
 * @access Private
 */
router.post('/batch/read', markMultipleAsRead as RequestHandler);

/**
 * @route POST /api/alert-history/batch/delete
 * @desc 批量删除告警历史记录
 * @access Private
 */
router.post('/batch/delete', deleteMultipleAlertHistory as RequestHandler);

/**
 * @route GET /api/alert-history/:alertId
 * @desc 获取单个告警详情
 * @access Private
 */
router.get('/:alertId', getAlertHistoryById as RequestHandler);

/**
 * @route PATCH /api/alert-history/:alertId/read
 * @desc 标记告警为已读
 * @access Private
 */
router.patch('/:alertId/read', markAsRead as RequestHandler);

/**
 * @route PATCH /api/alert-history/:alertId/processed
 * @desc 标记告警为已处理
 * @access Private
 */
router.patch('/:alertId/processed', markAsProcessed as RequestHandler);

/**
 * @route DELETE /api/alert-history/:alertId
 * @desc 删除告警历史记录
 * @access Private
 */
router.delete('/:alertId', deleteAlertHistory as RequestHandler);

export default router;
