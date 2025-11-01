/**
 * ControlCommandService
 * 控制指令服务层 (Epic 6 Story 6.4)
 * 负责设备控制指令的发送、状态管理和历史查询
 */

import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import { sendToDevice } from '../websocket/message-router';

// 创建 Prisma 客户端
const prisma = new PrismaClient();

/**
 * 超时定时器存储（Map<commandId, NodeJS.Timeout>）
 * 用于在收到ACK或超时时清除定时器
 */
const timeoutTimers = new Map<string, NodeJS.Timeout>();

/**
 * 控制指令参数接口
 */
export interface ControlCommandParams {
  endpointId: string; // 端点的数据库UUID
  deviceId: string; // 设备的数据库UUID
  deviceIdentifier: string; // 设备标识符（device_id字段，如"micu"）
  endpointIdentifier: string; // 端点标识符（endpoint_id字段，用于WebSocket路由）
  commandType: string; // 指令类型（如"setLight", "setTemperature"）
  commandParams: Record<string, unknown>; // 指令参数（JSON对象）
}

/**
 * 发送控制指令
 * @param params - 控制指令参数
 * @returns 控制指令记录（包含commandId、status等）
 * @throws Error - 设备离线、设备不存在等错误
 */
export async function sendControlCommand(params: ControlCommandParams) {
  const { endpointId, deviceId, deviceIdentifier, endpointIdentifier, commandType, commandParams } =
    params;

  // 1. 生成唯一的 commandId（使用nanoid，8位字符）
  const commandId = nanoid(8);

  // 2. 创建 ControlCommand 记录（初始状态：pending）
  const command = await prisma.controlCommand.create({
    data: {
      endpoint_id: endpointId,
      device_id: deviceId,
      command_id: commandId,
      command_type: commandType,
      command_params: JSON.stringify(commandParams),
      status: 'pending',
      timeout_at: new Date(Date.now() + 5000), // 超时时间：5秒后
    },
  });

  // 3. 构造控制消息（WebSocket消息格式）
  const controlMessage = {
    type: 'control',
    commandId,
    deviceId: deviceIdentifier,
    command: commandType,
    params: commandParams,
    timestamp: Date.now(),
  };

  // 4. 发送WebSocket消息到目标设备（点对点消息）
  try {
    sendToDevice(endpointIdentifier, deviceIdentifier, controlMessage);
    // eslint-disable-next-line no-console
    console.log(
      `[控制指令] 发送成功, commandId: ${commandId}, 设备: ${deviceIdentifier}, 类型: ${commandType}`
    );
  } catch (error) {
    // 设备离线或发送失败，更新指令状态为 failed
    await updateCommandStatus(commandId, 'failed', '设备离线或发送失败');
    throw error;
  }

  // 5. 启动超时定时器（5秒后检查是否收到ACK）
  const timeoutTimer = setTimeout(() => {
    // 超时后检查指令状态
    void (async () => {
      try {
        const currentCommand = await prisma.controlCommand.findUnique({
          where: { command_id: commandId },
        });

        // 如果状态仍为 pending，标记为 timeout
        if (currentCommand && currentCommand.status === 'pending') {
          await updateCommandStatus(commandId, 'timeout', '指令超时，未收到ACK响应');
          // eslint-disable-next-line no-console
          console.log(`[控制指令] 超时, commandId: ${commandId}`);
        }

        // 清除定时器
        timeoutTimers.delete(commandId);
      } catch (error) {
        console.error(`[控制指令] 超时检测失败, commandId: ${commandId}:`, error);
      }
    })();
  }, 5000); // 5秒超时

  // 存储定时器引用
  timeoutTimers.set(commandId, timeoutTimer);

  // 6. 返回控制指令记录
  return {
    commandId,
    status: command.status,
    sentAt: command.sent_at,
  };
}

/**
 * 更新控制指令状态（收到ACK或超时时调用）
 * @param commandId - 指令唯一标识
 * @param status - 新状态（success, failed, timeout）
 * @param message - 响应消息或错误消息（可选）
 */
export async function updateCommandStatus(
  commandId: string,
  status: 'success' | 'failed' | 'timeout',
  message?: string
): Promise<void> {
  try {
    // 更新数据库记录
    await prisma.controlCommand.update({
      where: { command_id: commandId },
      data: {
        status,
        ack_at: new Date(), // 记录ACK时间（或超时时间）
        error_message: message || null,
      },
    });

    // 清除超时定时器
    const timer = timeoutTimers.get(commandId);
    if (timer) {
      clearTimeout(timer);
      timeoutTimers.delete(commandId);
    }

    // eslint-disable-next-line no-console
    console.log(
      `[控制指令] 状态更新, commandId: ${commandId}, 新状态: ${status}, 消息: ${message || '无'}`
    );
  } catch (error) {
    console.error(`[控制指令] 状态更新失败, commandId: ${commandId}:`, error);
    throw error;
  }
}

/**
 * 获取设备的控制指令历史
 * @param deviceId - 设备的数据库UUID
 * @param options - 分页和筛选选项
 * @returns 控制指令历史列表和分页信息
 */
export async function getCommandHistory(
  deviceId: string,
  options: {
    page?: number;
    pageSize?: number;
    status?: 'pending' | 'success' | 'failed' | 'timeout';
  } = {}
) {
  const { page = 1, pageSize = 20, status } = options;

  // 构造查询条件
  const where: {
    device_id: string;
    status?: string;
  } = {
    device_id: deviceId,
  };

  if (status) {
    where.status = status;
  }

  // 查询总数
  const total = await prisma.controlCommand.count({ where });

  // 查询控制指令列表（按 sent_at 降序排列）
  const commands = await prisma.controlCommand.findMany({
    where,
    orderBy: { sent_at: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      device: {
        select: {
          id: true,
          device_id: true,
          custom_name: true,
        },
      },
    },
  });

  // 格式化返回数据
  const formattedCommands = commands.map((cmd) => {
    // 计算响应耗时（毫秒）
    const duration =
      cmd.ack_at && cmd.sent_at ? cmd.ack_at.getTime() - cmd.sent_at.getTime() : null;

    return {
      commandId: cmd.command_id,
      commandType: cmd.command_type,
      commandParams: JSON.parse(cmd.command_params) as Record<string, unknown>,
      status: cmd.status,
      sentAt: cmd.sent_at.toISOString(),
      ackAt: cmd.ack_at ? cmd.ack_at.toISOString() : null,
      timeoutAt: cmd.timeout_at ? cmd.timeout_at.toISOString() : null,
      errorMessage: cmd.error_message,
      duration, // 响应耗时（毫秒）
    };
  });

  return {
    deviceId: commands[0]?.device.id,
    deviceName: commands[0]?.device.custom_name,
    commands: formattedCommands,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 根据 commandId 获取控制指令详情
 * @param commandId - 指令唯一标识
 * @returns 控制指令详情
 * @throws Error - 指令不存在
 */
export async function getCommandById(commandId: string) {
  const command = await prisma.controlCommand.findUnique({
    where: { command_id: commandId },
    include: {
      device: {
        select: {
          id: true,
          device_id: true,
          custom_name: true,
        },
      },
      endpoint: {
        select: {
          id: true,
          endpoint_id: true,
          name: true,
        },
      },
    },
  });

  if (!command) {
    throw new Error('COMMAND_NOT_FOUND');
  }

  // 计算响应耗时（毫秒）
  const duration =
    command.ack_at && command.sent_at ? command.ack_at.getTime() - command.sent_at.getTime() : null;

  return {
    commandId: command.command_id,
    deviceId: command.device.id,
    deviceName: command.device.custom_name,
    endpointId: command.endpoint.id,
    endpointName: command.endpoint.name,
    commandType: command.command_type,
    commandParams: JSON.parse(command.command_params) as Record<string, unknown>,
    status: command.status,
    sentAt: command.sent_at.toISOString(),
    ackAt: command.ack_at ? command.ack_at.toISOString() : null,
    timeoutAt: command.timeout_at ? command.timeout_at.toISOString() : null,
    errorMessage: command.error_message,
    duration, // 响应耗时（毫秒）
  };
}
