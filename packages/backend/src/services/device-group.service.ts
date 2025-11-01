/**
 * Device Group Service
 * 处理设备分组创建和管理相关的业务逻辑
 */

import prisma from '../config/database.js';
import { AppError } from '../middleware/error-handler.middleware.js';

/**
 * 每个用户最多创建的设备分组数量限制
 */
const MAX_DEVICE_GROUPS_PER_USER = 20;

/**
 * 创建设备分组请求参数
 */
export interface CreateDeviceGroupParams {
  userId: string;
  endpointId: string;
  groupName: string;
  description?: string;
  deviceIds?: string[];
}

/**
 * 更新设备分组请求参数
 */
export interface UpdateDeviceGroupParams {
  groupName?: string;
  description?: string;
}

/**
 * 查询设备分组请求参数
 */
export interface GetDeviceGroupsParams {
  userId: string;
  endpointId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 验证分组名称
 *
 * @param groupName - 分组名称
 * @throws {AppError} 400 - 分组名称不合法
 */
function validateGroupName(groupName: string): void {
  if (!groupName || groupName.trim().length === 0) {
    throw new AppError('INVALID_GROUP_NAME', '分组名称不能为空', 400);
  }

  if (groupName.length > 50) {
    throw new AppError('INVALID_GROUP_NAME', '分组名称长度不能超过50个字符', 400);
  }
}

/**
 * 验证分组描述
 *
 * @param description - 分组描述
 * @throws {AppError} 400 - 分组描述不合法
 */
function validateDescription(description?: string): void {
  if (description && description.length > 200) {
    throw new AppError('INVALID_DESCRIPTION', '分组描述长度不能超过200个字符', 400);
  }
}

/**
 * 检查用户设备分组数量是否超过限制
 *
 * @param userId - 用户 ID
 * @throws {AppError} 400 - 设备分组数量已达到上限
 */
async function checkDeviceGroupLimit(userId: string): Promise<void> {
  const count = await prisma.deviceGroup.count({
    where: { user_id: userId },
  });

  if (count >= MAX_DEVICE_GROUPS_PER_USER) {
    throw new AppError(
      'DEVICE_GROUP_LIMIT_REACHED',
      `已达到设备分组数量上限（${MAX_DEVICE_GROUPS_PER_USER}个）`,
      400
    );
  }
}

/**
 * 验证端点是否属于用户
 *
 * @param endpointId - 端点 ID
 * @param userId - 用户 ID
 * @throws {AppError} 403 - 无权访问该端点
 * @throws {AppError} 404 - 端点不存在
 */
async function validateEndpointOwnership(endpointId: string, userId: string): Promise<void> {
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
    select: { user_id: true },
  });

  if (!endpoint) {
    throw new AppError('ENDPOINT_NOT_FOUND', '端点不存在', 404);
  }

  if (endpoint.user_id !== userId) {
    throw new AppError('FORBIDDEN', '无权访问该端点', 403);
  }
}

/**
 * 验证设备是否属于该端点
 *
 * @param deviceIds - 设备 ID 列表
 * @param endpointId - 端点 ID
 * @throws {AppError} 404 - 设备不存在或不属于该端点
 */
async function validateDevicesOwnership(deviceIds: string[], endpointId: string): Promise<void> {
  const devices = await prisma.device.findMany({
    where: {
      id: { in: deviceIds },
      endpoint_id: endpointId,
    },
    select: { id: true },
  });

  if (devices.length !== deviceIds.length) {
    throw new AppError('DEVICE_NOT_FOUND', '部分设备不存在或不属于该端点', 404);
  }
}

/**
 * 验证分组是否属于用户
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组不存在
 */
async function validateGroupOwnership(groupId: string, userId: string): Promise<void> {
  const group = await prisma.deviceGroup.findUnique({
    where: { id: groupId },
    select: { user_id: true },
  });

  if (!group) {
    throw new AppError('DEVICE_GROUP_NOT_FOUND', '设备分组不存在', 404);
  }

  if (group.user_id !== userId) {
    throw new AppError('FORBIDDEN', '无权访问该设备分组', 403);
  }
}

/**
 * 创建设备分组
 *
 * @param params - 创建参数
 * @returns 创建的设备分组
 * @throws {AppError} 400 - 参数不合法或分组数量已达上限
 * @throws {AppError} 403 - 无权访问端点
 * @throws {AppError} 404 - 端点或设备不存在
 */
export async function createDeviceGroup(params: CreateDeviceGroupParams) {
  const { userId, endpointId, groupName, description, deviceIds = [] } = params;

  // 验证参数
  validateGroupName(groupName);
  validateDescription(description);

  // 检查分组数量限制
  await checkDeviceGroupLimit(userId);

  // 验证端点所有权
  await validateEndpointOwnership(endpointId, userId);

  // 验证设备所有权
  if (deviceIds.length > 0) {
    await validateDevicesOwnership(deviceIds, endpointId);
  }

  // 创建设备分组
  const group = await prisma.deviceGroup.create({
    data: {
      user_id: userId,
      endpoint_id: endpointId,
      group_name: groupName,
      description: description || null,
      members: {
        create: deviceIds.map((deviceId) => ({
          device_id: deviceId,
        })),
      },
    },
    include: {
      members: {
        include: {
          device: {
            select: {
              id: true,
              device_id: true,
              custom_name: true,
            },
          },
        },
      },
    },
  });

  return {
    id: group.id,
    user_id: group.user_id,
    endpoint_id: group.endpoint_id,
    group_name: group.group_name,
    description: group.description,
    device_count: group.members.length,
    created_at: group.created_at.toISOString(),
    updated_at: group.updated_at.toISOString(),
  };
}

/**
 * 查询用户的所有设备分组
 *
 * @param params - 查询参数
 * @returns 设备分组列表和分页信息
 */
export async function getDeviceGroups(params: GetDeviceGroupsParams) {
  const { userId, endpointId, search, page = 1, pageSize = 10 } = params;

  // 构建查询条件
  const where: {
    user_id: string;
    endpoint_id?: string;
    group_name?: { contains: string };
  } = {
    user_id: userId,
  };

  if (endpointId) {
    where.endpoint_id = endpointId;
  }

  if (search) {
    where.group_name = {
      contains: search,
    };
  }

  // 查询总数
  const total = await prisma.deviceGroup.count({ where });

  // 查询分组列表
  const groups = await prisma.deviceGroup.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      endpoint: {
        select: {
          name: true,
        },
      },
      members: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return {
    groups: groups.map((group) => ({
      id: group.id,
      group_name: group.group_name,
      endpoint_id: group.endpoint_id,
      endpoint_name: group.endpoint.name,
      device_count: group.members.length,
      created_at: group.created_at.toISOString(),
    })),
    page,
    page_size: pageSize,
    total,
  };
}

/**
 * 根据 groupId 查询分组详情
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @returns 分组详情
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组不存在
 */
export async function getDeviceGroupById(groupId: string, userId: string) {
  // 验证分组所有权
  await validateGroupOwnership(groupId, userId);

  // 查询分组详情
  const group = await prisma.deviceGroup.findUnique({
    where: { id: groupId },
    include: {
      endpoint: {
        select: {
          name: true,
        },
      },
      members: {
        include: {
          device: {
            select: {
              id: true,
              device_id: true,
              custom_name: true,
              last_connected_at: true,
            },
          },
        },
      },
    },
  });

  if (!group) {
    throw new AppError('DEVICE_GROUP_NOT_FOUND', '设备分组不存在', 404);
  }

  return {
    id: group.id,
    group_name: group.group_name,
    description: group.description,
    endpoint_id: group.endpoint_id,
    endpoint_name: group.endpoint.name,
    device_count: group.members.length,
    created_at: group.created_at.toISOString(),
    devices: group.members.map((member) => ({
      id: member.device.id,
      device_id: member.device.device_id,
      custom_name: member.device.custom_name,
      last_connected_at: member.device.last_connected_at.toISOString(),
    })),
  };
}

/**
 * 更新分组信息
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @param params - 更新参数
 * @returns 更新后的分组信息
 * @throws {AppError} 400 - 参数不合法
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组不存在
 */
export async function updateDeviceGroup(
  groupId: string,
  userId: string,
  params: UpdateDeviceGroupParams
) {
  const { groupName, description } = params;

  // 验证参数
  if (groupName !== undefined) {
    validateGroupName(groupName);
  }
  if (description !== undefined) {
    validateDescription(description);
  }

  // 验证分组所有权
  await validateGroupOwnership(groupId, userId);

  // 更新分组
  const group = await prisma.deviceGroup.update({
    where: { id: groupId },
    data: {
      group_name: groupName,
      description: description,
    },
  });

  return {
    id: group.id,
    group_name: group.group_name,
    description: group.description,
    updated_at: group.updated_at.toISOString(),
  };
}

/**
 * 删除分组
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组不存在
 */
export async function deleteDeviceGroup(groupId: string, userId: string): Promise<void> {
  // 验证分组所有权
  await validateGroupOwnership(groupId, userId);

  // 删除分组（级联删除分组成员关系）
  await prisma.deviceGroup.delete({
    where: { id: groupId },
  });
}

/**
 * 批量添加设备到分组
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @param deviceIds - 设备 ID 列表
 * @returns 添加结果
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组或设备不存在
 */
export async function addDevicesToGroup(groupId: string, userId: string, deviceIds: string[]) {
  // 验证分组所有权
  await validateGroupOwnership(groupId, userId);

  // 获取分组信息（包含 endpoint_id）
  const group = await prisma.deviceGroup.findUnique({
    where: { id: groupId },
    select: { endpoint_id: true },
  });

  if (!group) {
    throw new AppError('DEVICE_GROUP_NOT_FOUND', '设备分组不存在', 404);
  }

  // 验证设备所有权
  await validateDevicesOwnership(deviceIds, group.endpoint_id);

  // 获取已存在的设备成员
  const existingMembers = await prisma.deviceGroupMember.findMany({
    where: {
      group_id: groupId,
      device_id: { in: deviceIds },
    },
    select: { device_id: true },
  });

  const existingDeviceIds = new Set(existingMembers.map((m) => m.device_id));

  // 过滤出需要添加的设备（排除已存在的）
  const newDeviceIds = deviceIds.filter((id) => !existingDeviceIds.has(id));

  // 批量创建设备成员关系
  if (newDeviceIds.length > 0) {
    await prisma.deviceGroupMember.createMany({
      data: newDeviceIds.map((deviceId) => ({
        group_id: groupId,
        device_id: deviceId,
      })),
    });
  }

  // 查询更新后的总设备数量
  const totalDevices = await prisma.deviceGroupMember.count({
    where: { group_id: groupId },
  });

  return {
    added_count: newDeviceIds.length,
    total_devices: totalDevices,
  };
}

/**
 * 批量从分组移除设备
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @param deviceIds - 设备 ID 列表
 * @returns 移除结果
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组不存在
 */
export async function removeDevicesFromGroup(groupId: string, userId: string, deviceIds: string[]) {
  // 验证分组所有权
  await validateGroupOwnership(groupId, userId);

  // 批量删除设备成员关系
  const result = await prisma.deviceGroupMember.deleteMany({
    where: {
      group_id: groupId,
      device_id: { in: deviceIds },
    },
  });

  // 查询更新后的总设备数量
  const totalDevices = await prisma.deviceGroupMember.count({
    where: { group_id: groupId },
  });

  return {
    removed_count: result.count,
    total_devices: totalDevices,
  };
}
