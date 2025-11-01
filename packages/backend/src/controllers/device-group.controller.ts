/**
 * Device Group Controller (Epic 6 Story 6.6)
 * 处理设备分组相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import * as deviceGroupService from '../services/device-group.service.js';
import * as deviceGroupDataService from '../services/device-group-data.service.js';
import * as controlCommandService from '../services/control-command.service.js';
import * as deviceDataService from '../services/device-data.service.js';
import { AppError } from '../middleware/error-handler.middleware.js';

/**
 * 创建设备分组
 * @route POST /api/device-groups
 */
export async function createDeviceGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { endpoint_id, group_name, description, device_ids } = req.body;

    // 参数验证
    if (!endpoint_id || !group_name) {
      throw new AppError('VALIDATION_ERROR', '缺少必填参数', 400);
    }

    // 调用 Service 层创建设备分组
    const group = await deviceGroupService.createDeviceGroup({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      endpointId: endpoint_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      groupName: group_name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      deviceIds: device_ids || [],
    });

    res.status(201).json({
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取用户的所有设备分组
 * @route GET /api/device-groups
 */
export async function getDeviceGroups(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { endpoint_id, search, page, page_size } = req.query;

    // 调用 Service 层查询设备分组
    const result = await deviceGroupService.getDeviceGroups({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      endpointId: endpoint_id as string | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      search: search as string | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      page: page ? parseInt(page as string, 10) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      pageSize: page_size ? parseInt(page_size as string, 10) : undefined,
    });

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取分组详情
 * @route GET /api/device-groups/:groupId
 */
export async function getDeviceGroupById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;

    // 调用 Service 层查询分组详情
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const group = await deviceGroupService.getDeviceGroupById(groupId, userId);

    res.status(200).json({
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 更新设备分组
 * @route PUT /api/device-groups/:groupId
 */
export async function updateDeviceGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { group_name, description } = req.body;

    // 调用 Service 层更新设备分组
    const group = await deviceGroupService.updateDeviceGroup(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      groupId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      userId,
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        groupName: group_name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        description,
      }
    );

    res.status(200).json({
      data: group,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 删除设备分组
 * @route DELETE /api/device-groups/:groupId
 */
export async function deleteDeviceGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await deviceGroupService.deleteDeviceGroup(groupId, userId);

    res.status(200).json({
      data: {
        success: true,
        message: '设备分组已删除',
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 添加设备到分组
 * @route POST /api/device-groups/:groupId/devices
 */
export async function addDevicesToGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { device_ids } = req.body;

    // 参数验证
    if (!device_ids || !Array.isArray(device_ids)) {
      throw new AppError('VALIDATION_ERROR', '缺少设备ID列表', 400);
    }

    // 调用 Service 层添加设备到分组
    const result = await deviceGroupService.addDevicesToGroup(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      groupId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      device_ids
    );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 从分组移除设备
 * @route DELETE /api/device-groups/:groupId/devices
 */
export async function removeDevicesFromGroup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { device_ids } = req.body;

    // 参数验证
    if (!device_ids || !Array.isArray(device_ids)) {
      throw new AppError('VALIDATION_ERROR', '缺少设备ID列表', 400);
    }

    // 调用 Service 层从分组移除设备
    const result = await deviceGroupService.removeDevicesFromGroup(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      groupId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      device_ids
    );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 获取分组数据聚合
 * @route GET /api/device-groups/:groupId/data
 */
export async function getGroupDataAggregation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;

    // 调用 Service 层获取分组数据聚合
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const aggregation = await deviceGroupDataService.getGroupDataAggregation(groupId, userId);

    res.status(200).json({
      data: aggregation,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 批量发送控制指令到分组内所有设备
 * @route POST /api/device-groups/:groupId/control
 */
export async function sendBatchControl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { command_type, command_params } = req.body;

    // 参数验证
    if (!command_type) {
      throw new AppError('VALIDATION_ERROR', '缺少指令类型', 400);
    }

    // 验证分组所有权
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const group = await deviceGroupService.getDeviceGroupById(groupId, userId);

    if (!group) {
      throw new AppError('DEVICE_GROUP_NOT_FOUND', '设备分组不存在或无权访问', 404);
    }

    // 调用 Service 层批量发送控制指令
    const result = await controlCommandService.sendBatchControlCommand({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      groupId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      commandType: command_type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      commandParams: command_params || {},
    });

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 查询批量控制指令状态
 * @route GET /api/device-groups/:groupId/control/:batchId
 */
export async function getBatchControlStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId, batchId } = req.params;

    // 验证分组所有权
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const group = await deviceGroupService.getDeviceGroupById(groupId, userId);

    if (!group) {
      throw new AppError('DEVICE_GROUP_NOT_FOUND', '设备分组不存在或无权访问', 404);
    }

    // 查询批量指令状态
    const result = await controlCommandService.getBatchControlStatus(batchId);

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 导出分组设备数据
 * @route GET /api/device-groups/:groupId/export
 */
export async function exportGroupDeviceData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    const { groupId } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { start_time, end_time, data_keys, format, limit } = req.query;

    // 参数验证
    if (!start_time || !end_time) {
      throw new AppError('VALIDATION_ERROR', '缺少时间范围参数', 400);
    }

    // 验证导出格式
    const exportFormat = (format as string) || 'csv';
    if (exportFormat !== 'csv' && exportFormat !== 'json') {
      throw new AppError('VALIDATION_ERROR', '不支持的导出格式', 400);
    }

    // 验证分组所有权并获取分组详情
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const group = await deviceGroupService.getDeviceGroupById(groupId, userId);

    if (!group) {
      throw new AppError('DEVICE_GROUP_NOT_FOUND', '设备分组不存在或无权访问', 404);
    }

    // 提取分组内所有设备的数据库ID
    const deviceIds = group.devices.map((device) => device.id);

    if (deviceIds.length === 0) {
      throw new AppError('VALIDATION_ERROR', '分组内没有设备', 400);
    }

    // 解析 data_keys（可选）
    let dataKeysArray: string[] | undefined;
    if (data_keys) {
      if (typeof data_keys === 'string') {
        dataKeysArray = data_keys.split(',').map((key) => key.trim());
      } else if (Array.isArray(data_keys)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        dataKeysArray = data_keys;
      }
    }

    // 解析 limit（默认10000）
    const exportLimit = limit ? parseInt(limit as string, 10) : 10000;
    if (exportLimit > 10000) {
      throw new AppError('VALIDATION_ERROR', '导出数据量不能超过10000条', 400);
    }

    // 调用 Service 层导出数据
    const exportData = await deviceDataService.exportGroupDeviceData(
      deviceIds,
      start_time as string,
      end_time as string,
      dataKeysArray,
      exportLimit
    );

    // 根据格式返回数据
    if (exportFormat === 'csv') {
      const csvContent = deviceDataService.formatDataAsCSV(exportData);

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `group-${groupId}-${timestamp}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else {
      // JSON 格式
      const jsonContent = deviceDataService.formatDataAsJSON(exportData);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `group-${groupId}-${timestamp}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(jsonContent);
    }
  } catch (error) {
    next(error);
  }
}
