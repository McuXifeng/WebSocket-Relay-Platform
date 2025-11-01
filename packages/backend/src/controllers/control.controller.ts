/**
 * ControlController
 * 控制指令控制器 (Epic 6 Story 6.4)
 * 处理设备控制指令的HTTP请求
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  sendControlCommand,
  getCommandHistory,
  getCommandById,
} from '../services/control-command.service';

const prisma = new PrismaClient();

/**
 * POST /api/endpoints/:endpointId/devices/:deviceId/control
 * 发送控制指令到指定设备
 */
export async function sendCommand(req: Request, res: Response): Promise<void> {
  try {
    const { endpointId, deviceId } = req.params;
    const { command, params } = req.body as { command: string; params: Record<string, unknown> };

    // 参数验证
    if (!command || typeof command !== 'string') {
      res.status(400).json({
        error: {
          code: 'INVALID_COMMAND',
          message: '指令类型(command)必须是字符串',
        },
      });
      return;
    }

    if (!params || typeof params !== 'object') {
      res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '指令参数(params)必须是对象',
        },
      });
      return;
    }

    // 验证端点是否存在且属于当前用户
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: {
        id: true,
        endpoint_id: true,
        user_id: true,
      },
    });

    if (!endpoint) {
      res.status(404).json({
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: '端点不存在',
        },
      });
      return;
    }

    // 权限验证：端点是否属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (endpoint.user_id !== req.user?.userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '无权操作该端点',
        },
      });
      return;
    }

    // 验证设备是否存在且属于该端点
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        endpoint_id: endpointId,
      },
      select: {
        id: true,
        device_id: true,
        custom_name: true,
      },
    });

    if (!device) {
      res.status(404).json({
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: '设备不存在或不属于该端点',
        },
      });
      return;
    }

    // 发送控制指令
    try {
      const result = await sendControlCommand({
        endpointId: endpoint.id,
        deviceId: device.id,
        deviceIdentifier: device.device_id,
        endpointIdentifier: endpoint.endpoint_id,
        commandType: command,
        commandParams: params,
      });

      res.status(200).json({
        commandId: result.commandId,
        status: result.status,
        sentAt: result.sentAt,
        message: '控制指令已发送',
      });
    } catch (error) {
      // 设备离线错误
      if (error instanceof Error && error.message === 'DEVICE_OFFLINE') {
        res.status(503).json({
          error: {
            code: 'DEVICE_OFFLINE',
            message: '设备离线，无法发送控制指令',
          },
        });
        return;
      }

      // 其他错误
      throw error;
    }
  } catch (error) {
    console.error('Error sending control command:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '发送控制指令失败',
      },
    });
  }
}

/**
 * GET /api/endpoints/:endpointId/devices/:deviceId/control/history
 * 获取设备的控制指令历史
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  try {
    const { endpointId, deviceId } = req.params;
    const { page, pageSize, status } = req.query;

    // 验证端点是否存在且属于当前用户
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (!endpoint) {
      res.status(404).json({
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: '端点不存在',
        },
      });
      return;
    }

    // 权限验证：端点是否属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (endpoint.user_id !== req.user?.userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '无权操作该端点',
        },
      });
      return;
    }

    // 验证设备是否存在且属于该端点
    const device = await prisma.device.findFirst({
      where: {
        id: deviceId,
        endpoint_id: endpointId,
      },
    });

    if (!device) {
      res.status(404).json({
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: '设备不存在或不属于该端点',
        },
      });
      return;
    }

    // 解析查询参数
    const pageNumber = page ? parseInt(page as string, 10) : 1;
    const pageSizeNumber = pageSize ? parseInt(pageSize as string, 10) : 20;
    const statusFilter = status as 'pending' | 'success' | 'failed' | 'timeout' | undefined;

    // 获取控制历史
    const result = await getCommandHistory(deviceId, {
      page: pageNumber,
      pageSize: pageSizeNumber,
      status: statusFilter,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting control history:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取控制历史失败',
      },
    });
  }
}

/**
 * GET /api/endpoints/:endpointId/devices/:deviceId/control/:commandId
 * 获取指定控制指令的详情
 */
export async function getCommandDetail(req: Request, res: Response): Promise<void> {
  try {
    const { endpointId, deviceId, commandId } = req.params;

    // 验证端点是否存在且属于当前用户
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (!endpoint) {
      res.status(404).json({
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: '端点不存在',
        },
      });
      return;
    }

    // 权限验证：端点是否属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (endpoint.user_id !== req.user?.userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '无权操作该端点',
        },
      });
      return;
    }

    // 获取指令详情
    try {
      const command = await getCommandById(commandId);

      // 验证指令是否属于该端点和设备
      if (command.endpointId !== endpointId || command.deviceId !== deviceId) {
        res.status(404).json({
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: '控制指令不存在或不属于该设备',
          },
        });
        return;
      }

      res.status(200).json(command);
    } catch (error) {
      if (error instanceof Error && error.message === 'COMMAND_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: '控制指令不存在',
          },
        });
        return;
      }

      throw error;
    }
  } catch (error) {
    console.error('Error getting command detail:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '获取指令详情失败',
      },
    });
  }
}
