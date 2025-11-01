/**
 * Device Group Data Service
 * 处理设备分组数据聚合相关的业务逻辑
 */

import prisma from '../config/database.js';
import { Prisma } from '@prisma/client';
import { AppError } from '../middleware/error-handler.middleware.js';

/**
 * 数据聚合结果
 */
interface AggregationData {
  data_key: string;
  unit?: string;
  average: number;
  max: number;
  min: number;
  sample_count: number;
}

/**
 * 分组数据聚合结果
 */
interface GroupDataAggregation {
  group_id: string;
  device_count: number;
  last_update: string;
  aggregations: AggregationData[];
}

/**
 * 聚合缓存 (内存Map, TTL 1分钟)
 */
interface CacheEntry {
  data: GroupDataAggregation;
  timestamp: number;
}

const aggregationCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 1分钟

/**
 * 获取分组数据聚合
 *
 * @param groupId - 分组 ID
 * @param userId - 用户 ID
 * @returns 聚合数据
 * @throws {AppError} 403 - 无权访问该设备分组
 * @throws {AppError} 404 - 设备分组不存在
 */
export async function getGroupDataAggregation(
  groupId: string,
  userId: string
): Promise<GroupDataAggregation> {
  // 验证分组所有权
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

  // 检查缓存
  const cacheKey = `group-agg-${groupId}`;
  const cached = aggregationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 获取分组内所有设备
  const members = await prisma.deviceGroupMember.findMany({
    where: { group_id: groupId },
    select: { device_id: true },
  });

  const deviceIds = members.map((m) => m.device_id);

  if (deviceIds.length === 0) {
    return {
      group_id: groupId,
      device_count: 0,
      last_update: new Date().toISOString(),
      aggregations: [],
    };
  }

  // 查询最近24小时的数据，按 data_key 聚合
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 获取所有数据键
  const dataKeys = await prisma.deviceData.findMany({
    where: {
      device_id: { in: deviceIds },
      timestamp: { gte: oneDayAgo },
    },
    select: {
      data_key: true,
      unit: true,
    },
    distinct: ['data_key'],
  });

  // 对每个 data_key 进行聚合（使用原生 SQL，因为 data_value 是字符串类型）
  const aggregations = await Promise.all(
    dataKeys.map(async (key) => {
      // 使用 Prisma.$queryRaw 参数化查询（安全防止SQL注入）
      const stats = await prisma.$queryRaw<
        {
          avg_value: number | null;
          max_value: number | null;
          min_value: number | null;
          count: bigint;
        }[]
      >`
        SELECT
          AVG(CAST(data_value AS DECIMAL(10,2))) as avg_value,
          MAX(CAST(data_value AS DECIMAL(10,2))) as max_value,
          MIN(CAST(data_value AS DECIMAL(10,2))) as min_value,
          COUNT(*) as count
        FROM device_data
        WHERE device_id IN (${Prisma.join(deviceIds)})
          AND data_key = ${key.data_key}
          AND timestamp >= ${oneDayAgo}
      `;

      if (stats.length === 0 || stats[0].count === 0n || stats[0].avg_value === null) {
        return null;
      }

      const stat = stats[0];

      return {
        data_key: key.data_key,
        unit: key.unit || undefined,
        average: Number(stat.avg_value),
        max: Number(stat.max_value),
        min: Number(stat.min_value),
        sample_count: Number(stat.count),
      };
    })
  );

  const result = {
    group_id: groupId,
    device_count: deviceIds.length,
    last_update: new Date().toISOString(),
    aggregations: aggregations.filter((a) => a !== null),
  };

  // 缓存结果
  aggregationCache.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
  });

  return result;
}
