/**
 * Alert Rule Routes (Epic 6 Story 6.5)
 * 定义告警规则相关的路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import {
  createAlertRule,
  getAlertRules,
  getAlertRuleById,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
} from '../controllers/alert-rule.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: IRouter = Router();

// 所有告警规则路由都需要身份认证
router.use(authenticateToken);

/**
 * @route POST /api/alert-rules
 * @desc 创建告警规则
 * @access Private
 */
router.post('/', createAlertRule as RequestHandler);

/**
 * @route GET /api/alert-rules
 * @desc 获取用户的所有告警规则
 * @access Private
 * @query endpointId - 可选，按端点筛选
 * @query enabled - 可选，按启用状态筛选 (true/false)
 */
router.get('/', getAlertRules as RequestHandler);

/**
 * @route GET /api/alert-rules/:ruleId
 * @desc 获取单个告警规则详情
 * @access Private
 */
router.get('/:ruleId', getAlertRuleById as RequestHandler);

/**
 * @route PUT /api/alert-rules/:ruleId
 * @desc 更新告警规则
 * @access Private
 */
router.put('/:ruleId', updateAlertRule as RequestHandler);

/**
 * @route DELETE /api/alert-rules/:ruleId
 * @desc 删除告警规则
 * @access Private
 */
router.delete('/:ruleId', deleteAlertRule as RequestHandler);

/**
 * @route PATCH /api/alert-rules/:ruleId/toggle
 * @desc 启用/禁用告警规则
 * @access Private
 */
router.patch('/:ruleId/toggle', toggleAlertRule as RequestHandler);

export default router;
