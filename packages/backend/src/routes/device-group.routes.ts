/**
 * Device Group Routes (Epic 6 Story 6.6)
 * 定义设备分组相关的路由
 */

import { Router, type RequestHandler, type IRouter } from 'express';
import {
  createDeviceGroup,
  getDeviceGroups,
  getDeviceGroupById,
  updateDeviceGroup,
  deleteDeviceGroup,
  addDevicesToGroup,
  removeDevicesFromGroup,
  getGroupDataAggregation,
  sendBatchControl,
  getBatchControlStatus,
  exportGroupDeviceData,
} from '../controllers/device-group.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router: IRouter = Router();

// 所有设备分组路由都需要身份认证
router.use(authenticateToken);

/**
 * @route POST /api/device-groups
 * @desc 创建设备分组
 * @access Private
 */
router.post('/', createDeviceGroup as RequestHandler);

/**
 * @route GET /api/device-groups
 * @desc 获取用户的所有设备分组
 * @access Private
 * @query endpoint_id - 可选，按端点筛选
 * @query search - 可选，按分组名称搜索
 * @query page - 可选，页码（默认1）
 * @query page_size - 可选，每页数量（默认10）
 */
router.get('/', getDeviceGroups as RequestHandler);

/**
 * @route GET /api/device-groups/:groupId/data
 * @desc 获取分组数据聚合
 * @access Private
 */
router.get('/:groupId/data', getGroupDataAggregation as RequestHandler);

/**
 * @route POST /api/device-groups/:groupId/control
 * @desc 批量发送控制指令到分组内所有设备
 * @access Private
 */
router.post('/:groupId/control', sendBatchControl as RequestHandler);

/**
 * @route GET /api/device-groups/:groupId/control/:batchId
 * @desc 查询批量控制指令状态
 * @access Private
 */
router.get('/:groupId/control/:batchId', getBatchControlStatus as RequestHandler);

/**
 * @route GET /api/device-groups/:groupId/export
 * @desc 导出分组设备数据
 * @access Private
 * @query start_time - 必填，开始时间（ISO 8601格式）
 * @query end_time - 必填，结束时间（ISO 8601格式）
 * @query data_keys - 可选，要导出的数据字段键（逗号分隔）
 * @query format - 可选，导出格式（csv或json，默认csv）
 * @query limit - 可选，最大导出数据量（默认10000，最大10000）
 */
router.get('/:groupId/export', exportGroupDeviceData as RequestHandler);

/**
 * @route GET /api/device-groups/:groupId
 * @desc 获取分组详情
 * @access Private
 */
router.get('/:groupId', getDeviceGroupById as RequestHandler);

/**
 * @route PUT /api/device-groups/:groupId
 * @desc 更新设备分组
 * @access Private
 */
router.put('/:groupId', updateDeviceGroup as RequestHandler);

/**
 * @route DELETE /api/device-groups/:groupId
 * @desc 删除设备分组
 * @access Private
 */
router.delete('/:groupId', deleteDeviceGroup as RequestHandler);

/**
 * @route POST /api/device-groups/:groupId/devices
 * @desc 添加设备到分组
 * @access Private
 */
router.post('/:groupId/devices', addDevicesToGroup as RequestHandler);

/**
 * @route DELETE /api/device-groups/:groupId/devices
 * @desc 从分组移除设备
 * @access Private
 */
router.delete('/:groupId/devices', removeDevicesFromGroup as RequestHandler);

export default router;
