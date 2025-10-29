/**
 * Endpoint Service
 * 处理端点创建和管理相关的业务逻辑
 */

import { nanoid } from 'nanoid';
import prisma from '../config/database.js';
import { AppError } from '../middleware/error-handler.middleware.js';
import { config } from '../config/env.js';
import type { EndpointWithUrl } from '@websocket-relay/shared';

/**
 * 端点 ID 生成的最大重试次数
 */
const MAX_RETRIES = 5;

/**
 * 每个用户最多创建的端点数量限制
 */
const MAX_ENDPOINTS_PER_USER = 5;

/**
 * 生成唯一的端点 ID
 *
 * @returns 10 位唯一的端点 ID
 * @throws {AppError} 500 - ID 生成失败（重试次数耗尽）
 */
export async function generateUniqueEndpointId(): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    // 使用 nanoid 生成 10 位随机 ID
    const id = nanoid(10);

    // 检查数据库是否存在冲突
    const existing = await prisma.endpoint.findUnique({
      where: { endpoint_id: id },
    });

    // 如果不存在冲突，返回 ID
    if (!existing) {
      return id;
    }
  }

  // 重试次数耗尽，抛出错误
  throw new AppError('ID_GENERATION_FAILED', '生成唯一 ID 失败', 500);
}

/**
 * 检查用户端点数量是否超过限制
 *
 * @param userId - 用户 ID
 * @throws {AppError} 400 - 端点数量已达到上限
 */
export async function checkEndpointLimit(userId: string): Promise<void> {
  // 查询用户已创建的端点数量
  const count = await prisma.endpoint.count({
    where: { user_id: userId },
  });

  // 如果超过限制，抛出错误
  if (count >= MAX_ENDPOINTS_PER_USER) {
    throw new AppError('ENDPOINT_LIMIT_REACHED', '已达到端点数量上限', 400);
  }
}

/**
 * 构建 WebSocket URL
 *
 * @param endpointId - 端点 ID
 * @returns WebSocket URL (格式: wss://domain.com/ws/{endpoint_id})
 */
export function buildWebSocketUrl(endpointId: string): string {
  return `${config.websocketBaseUrl}/ws/${endpointId}`;
}

/**
 * 创建新端点
 *
 * @param userId - 用户 ID
 * @param name - 端点名称（可选，默认"未命名端点"）
 * @returns 创建的端点信息（包含 WebSocket URL）
 * @throws {AppError} 400 - 端点数量已达到上限
 * @throws {AppError} 500 - ID 生成失败
 */
export async function createEndpoint(userId: string, name?: string): Promise<EndpointWithUrl> {
  // 1. 检查端点数量限制
  await checkEndpointLimit(userId);

  // 2. 生成唯一端点 ID
  const endpoint_id = await generateUniqueEndpointId();

  // 3. 创建端点记录
  const endpoint = await prisma.endpoint.create({
    data: {
      endpoint_id,
      name: name || '未命名端点', // 使用默认名称
      user_id: userId,
    },
  });

  // 4. 构建 WebSocket URL 并返回
  return {
    id: endpoint.id,
    endpoint_id: endpoint.endpoint_id,
    name: endpoint.name,
    user_id: endpoint.user_id,
    created_at: endpoint.created_at,
    last_active_at: endpoint.last_active_at,
    websocket_url: buildWebSocketUrl(endpoint.endpoint_id),
  };
}

/**
 * 查询用户的所有端点列表
 *
 * @param userId - 用户 ID
 * @returns 用户的所有端点数组（按创建时间倒序排列，包含 WebSocket URL）
 */
export async function getEndpointsByUserId(userId: string): Promise<EndpointWithUrl[]> {
  // 1. 查询用户的所有端点，按创建时间降序排列
  const endpoints = await prisma.endpoint.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });

  // 2. 为每个端点添加 websocket_url 字段
  return endpoints.map((endpoint) => ({
    id: endpoint.id,
    endpoint_id: endpoint.endpoint_id,
    name: endpoint.name,
    user_id: endpoint.user_id,
    created_at: endpoint.created_at,
    last_active_at: endpoint.last_active_at,
    websocket_url: buildWebSocketUrl(endpoint.endpoint_id),
  }));
}

/**
 * 查询单个端点详情
 *
 * @param endpointId - 端点 ID (数据库主键)
 * @param userId - 当前用户 ID
 * @returns 端点详情(包含 WebSocket URL)
 * @throws {AppError} 404 - 端点不存在
 * @throws {AppError} 403 - 无权访问此端点
 */
export async function getEndpointById(
  endpointId: string,
  userId: string
): Promise<EndpointWithUrl> {
  // 1. 查询指定 ID 的端点
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });

  // 2. 验证端点存在
  if (!endpoint) {
    throw new AppError('ENDPOINT_NOT_FOUND', '端点不存在', 404);
  }

  // 3. 验证所有权
  if (endpoint.user_id !== userId) {
    throw new AppError('FORBIDDEN', '无权访问此端点', 403);
  }

  // 4. 添加 websocket_url 并返回
  return {
    id: endpoint.id,
    endpoint_id: endpoint.endpoint_id,
    name: endpoint.name,
    user_id: endpoint.user_id,
    created_at: endpoint.created_at,
    last_active_at: endpoint.last_active_at,
    websocket_url: buildWebSocketUrl(endpoint.endpoint_id),
  };
}

/**
 * 删除端点
 *
 * @param endpointId - 端点 ID (数据库主键)
 * @param userId - 当前用户 ID
 * @throws {AppError} 404 - 端点不存在
 * @throws {AppError} 403 - 无权访问此端点
 */
export async function deleteEndpoint(endpointId: string, userId: string): Promise<void> {
  // 1. 查询指定 ID 的端点
  const endpoint = await prisma.endpoint.findUnique({
    where: { id: endpointId },
  });

  // 2. 验证端点存在
  if (!endpoint) {
    throw new AppError('ENDPOINT_NOT_FOUND', '端点不存在', 404);
  }

  // 3. 验证所有权
  if (endpoint.user_id !== userId) {
    throw new AppError('FORBIDDEN', '无权访问此端点', 403);
  }

  // 4. 删除端点(级联删除 EndpointStats)
  await prisma.endpoint.delete({
    where: { id: endpointId },
  });
}
