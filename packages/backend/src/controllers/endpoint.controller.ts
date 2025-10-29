/**
 * Endpoint Controller
 * 处理端点相关的 HTTP 请求
 */

import type { Request, Response, NextFunction } from 'express';
import * as endpointService from '../services/endpoint.service.js';
import * as statsService from '../services/stats.service.js';
import * as messageService from '../services/message.service.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { PrismaClient } from '@prisma/client';
import type {
  CreateEndpointRequest,
  CreateEndpointResponse,
  GetEndpointsResponse,
  GetMessagesResponse,
  GetDevicesResponse,
} from '@websocket-relay/shared';

/**
 * 创建端点控制器
 *
 * @route POST /api/endpoints
 * @param req - Express 请求对象,包含端点创建数据
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function createEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从请求体提取端点创建数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const requestBody = req.body as CreateEndpointRequest;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const name = requestBody.name;

    // 调用 Service 层创建端点
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const endpoint = await endpointService.createEndpoint(userId, name);

    // 构建响应数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response: CreateEndpointResponse = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      endpoint,
    };

    // 返回成功响应 (201 Created)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    res.status(201).json({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: response,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 查询端点列表控制器
 *
 * @route GET /api/endpoints
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getEndpoints(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 调用 Service 层查询端点列表
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const endpoints = await endpointService.getEndpointsByUserId(userId);

    // 构建响应数据
    const response: GetEndpointsResponse = {
      endpoints,
    };

    // 返回成功响应 (200 OK)
    res.status(200).json({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: response,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 查询单个端点详情控制器
 *
 * @route GET /api/endpoints/:id
 * @param req - Express 请求对象,包含端点 ID
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getEndpointById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从路由参数获取端点 ID
    const endpointId = req.params.id;

    // 调用 Service 层查询端点详情
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
    const endpoint = await endpointService.getEndpointById(endpointId, userId);

    // 返回成功响应 (200 OK)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    res.status(200).json({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { endpoint },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 删除端点控制器
 *
 * @route DELETE /api/endpoints/:id
 * @param req - Express 请求对象,包含端点 ID
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function deleteEndpoint(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从路由参数获取端点 ID
    const endpointId = req.params.id;

    // 调用 Service 层删除端点
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await endpointService.deleteEndpoint(endpointId, userId);

    // 返回成功响应 (200 OK)
    res.status(200).json({
      data: { message: '端点已删除' },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 获取端点统计数据控制器
 *
 * @route GET /api/endpoints/:id/stats
 * @param req - Express 请求对象,包含端点 ID
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getEndpointStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从路由参数获取端点 ID
    const endpointId = req.params.id;

    // 1. 验证端点存在且属于当前用户 (复用现有函数)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await endpointService.getEndpointById(endpointId, userId);

    // 2. 获取统计数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stats = await statsService.getEndpointStats(endpointId);

    // 3. 返回成功响应 (200 OK)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    res.status(200).json({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: stats,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 获取端点历史消息控制器
 * Story 3.10: 历史消息存储和展示功能
 *
 * @route GET /api/endpoints/:id/messages
 * @param req - Express 请求对象,包含端点 ID
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getEndpointMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从路由参数获取端点 ID
    const endpointId = req.params.id;

    // 1. 验证端点存在且属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await endpointService.getEndpointById(endpointId, userId);

    // 2. 获取历史消息 (最新 50 条)
    const messages = await messageService.getEndpointMessages(endpointId);

    // 3. 转换为前端格式 (ISO 8601 时间字符串)
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      endpoint_id: msg.endpoint_id,
      content: msg.content,
      sender_info: msg.sender_info,
      created_at: msg.created_at.toISOString(),
    }));

    // 4. 构建响应数据
    const response: GetMessagesResponse = {
      messages: formattedMessages,
    };

    // 5. 返回成功响应 (200 OK)
    res.status(200).json({
      data: response,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

// 创建 Prisma 客户端实例
const prisma = new PrismaClient();

/**
 * 获取端点的设备列表控制器
 * Story 3.11: 连接设备管理和自定义名称永久化
 *
 * @route GET /api/endpoints/:id/devices
 * @param req - Express 请求对象,包含端点 ID
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function getEndpointDevices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从路由参数获取端点 ID
    const endpointId = req.params.id;

    // 1. 验证端点存在且属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await endpointService.getEndpointById(endpointId, userId);

    // 2. 查询设备列表
    const devices = await prisma.device.findMany({
      where: { endpoint_id: endpointId },
      orderBy: { last_connected_at: 'desc' },
    });

    // 3. 计算在线状态
    const now = Date.now();
    const devicesWithStatus = devices.map((device) => ({
      id: device.id,
      endpoint_id: device.endpoint_id,
      device_id: device.device_id,
      custom_name: device.custom_name,
      is_online: now - new Date(device.last_connected_at).getTime() < 30000,
      last_connected_at: device.last_connected_at.toISOString(),
      created_at: device.created_at.toISOString(),
    }));

    // 4. 构建响应数据
    const response: GetDevicesResponse = {
      devices: devicesWithStatus,
    };

    // 5. 返回成功响应 (200 OK)
    res.status(200).json({
      data: response,
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}

/**
 * 更新设备名称控制器
 * Story 3.11: 连接设备管理和自定义名称永久化
 *
 * @route PUT /api/endpoints/:endpointId/devices/:deviceId
 * @param req - Express 请求对象,包含端点 ID 和设备 ID
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export async function updateDeviceName(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从 req.user 获取 userId (由 authenticateToken 中间件附加)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const userId = req.user?.userId;

    if (!userId) {
      throw new AppError('UNAUTHORIZED', '用户认证信息无效', 401);
    }

    // 从路由参数获取端点 ID 和设备 ID
    const { endpointId, deviceId } = req.params;

    // 从请求体获取新的设备名称
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const { custom_name } = req.body as { custom_name: string };

    // 验证请求体
    if (!custom_name || custom_name.trim().length === 0) {
      throw new AppError('INVALID_INPUT', '设备名称不能为空', 400);
    }

    if (custom_name.length > 100) {
      throw new AppError('INVALID_INPUT', '设备名称不能超过100个字符', 400);
    }

    // 1. 验证端点存在且属于当前用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await endpointService.getEndpointById(endpointId, userId);

    // 2. 验证设备存在
    const device = await prisma.device.findFirst({
      where: {
        endpoint_id: endpointId,
        device_id: deviceId,
      },
    });

    if (!device) {
      throw new AppError('DEVICE_NOT_FOUND', '设备不存在', 404);
    }

    // 3. 更新设备名称
    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: { custom_name: custom_name.trim() },
    });

    // 4. 返回成功响应 (200 OK)
    res.status(200).json({
      data: {
        device: {
          id: updatedDevice.id,
          endpoint_id: updatedDevice.endpoint_id,
          device_id: updatedDevice.device_id,
          custom_name: updatedDevice.custom_name,
          last_connected_at: updatedDevice.last_connected_at.toISOString(),
          created_at: updatedDevice.created_at.toISOString(),
        },
      },
    });
  } catch (error) {
    // 将错误传递给错误处理中间件
    next(error);
  }
}
