import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 数据类型推断映射表
const DATA_TYPE_MAP = {
  number: 'number',
  string: 'string',
  boolean: 'boolean',
  object: 'json',
} as const;

// 单位自动识别映射表
const UNIT_MAP: Record<string, string> = {
  temperature: '°C',
  temp: '°C',
  humidity: '%',
  voltage: 'V',
  volt: 'V',
  current: 'A',
  pressure: 'Pa',
};

// 设备数据消息接口
export interface DeviceDataMessage {
  type: 'data';
  deviceId: string;
  timestamp?: number;
  data: Record<string, unknown>;
}

// 解析后的数据接口
export interface ParsedData {
  data_key: string;
  data_value: string;
  data_type: string;
  unit: string | null;
}

// 最新数据接口
export interface LatestData {
  key: string;
  value: unknown;
  type: string;
  unit: string | null;
  timestamp: Date;
}

// 数据字段接口
export interface DataKey {
  key: string;
  type: string;
  unit: string | null;
  lastSeen: Date;
}

/**
 * 解析设备上报的JSON数据
 * @param message 设备数据消息
 * @returns 解析后的数据数组
 */
export function parseDeviceData(message: DeviceDataMessage): ParsedData[] {
  const parsedData: ParsedData[] = [];

  // 遍历 data 对象的键值对
  for (const [key, value] of Object.entries(message.data)) {
    // 推断数据类型
    let dataType: string;
    let dataValue: string;

    if (typeof value === 'number') {
      dataType = DATA_TYPE_MAP.number;
      dataValue = value.toString();
    } else if (typeof value === 'boolean') {
      dataType = DATA_TYPE_MAP.boolean;
      dataValue = value.toString();
    } else if (typeof value === 'object' && value !== null) {
      dataType = DATA_TYPE_MAP.object;
      dataValue = JSON.stringify(value);
    } else {
      dataType = DATA_TYPE_MAP.string;
      dataValue = String(value);
    }

    // 推断数据单位（基于键名）
    const unit = UNIT_MAP[key.toLowerCase()] || null;

    parsedData.push({
      data_key: key,
      data_value: dataValue,
      data_type: dataType,
      unit,
    });
  }

  return parsedData;
}

/**
 * 异步批量存储设备数据
 * @param deviceId 设备ID
 * @param parsedData 解析后的数据数组
 */
export async function saveDeviceDataAsync(
  deviceId: string,
  parsedData: ParsedData[]
): Promise<void> {
  try {
    // 使用 Prisma createMany 批量插入
    await prisma.deviceData.createMany({
      data: parsedData.map((item) => ({
        device_id: deviceId,
        data_key: item.data_key,
        data_value: item.data_value,
        data_type: item.data_type,
        unit: item.unit,
        timestamp: new Date(),
      })),
    });

    console.log(`✅ Saved ${parsedData.length} data points for device ${deviceId}`);
  } catch (error) {
    console.error('❌ Failed to save device data:', error);
    // 错误处理：记录失败但不阻塞主流程
  }
}

/**
 * 获取设备最新数据
 * @param deviceId 设备ID
 * @returns 最新数据数组
 */
export async function getLatestDeviceData(deviceId: string): Promise<LatestData[]> {
  try {
    // 使用 Prisma 原生查询获取每个 data_key 的最新记录 (MySQL 兼容版本)
    const latestData = await prisma.$queryRaw<
      {
        data_key: string;
        data_value: string;
        data_type: string;
        unit: string | null;
        timestamp: Date;
      }[]
    >`
      SELECT d1.data_key, d1.data_value, d1.data_type, d1.unit, d1.timestamp
      FROM device_data d1
      INNER JOIN (
        SELECT data_key, MAX(timestamp) as max_timestamp
        FROM device_data
        WHERE device_id = ${deviceId}
        GROUP BY data_key
      ) d2 ON d1.data_key = d2.data_key AND d1.timestamp = d2.max_timestamp
      WHERE d1.device_id = ${deviceId}
      ORDER BY d1.data_key
    `;

    // 转换数据格式
    return latestData.map((item) => ({
      key: item.data_key,
      value: parseDataValue(item.data_value, item.data_type) as unknown,
      type: item.data_type,
      unit: item.unit,
      timestamp: item.timestamp,
    }));
  } catch (error) {
    console.error('❌ Failed to get latest device data:', error);
    throw error;
  }
}

/**
 * 获取设备可用数据字段列表
 * @param deviceId 设备ID
 * @returns 数据字段列表
 */
export async function getDeviceDataKeys(deviceId: string): Promise<DataKey[]> {
  try {
    // 使用 Prisma groupBy 查询唯一的 data_key
    const dataKeys = await prisma.deviceData.groupBy({
      by: ['data_key', 'data_type', 'unit'],
      where: {
        device_id: deviceId,
      },
      _max: {
        timestamp: true,
      },
      orderBy: {
        _max: {
          timestamp: 'desc',
        },
      },
    });

    return dataKeys.map((item) => ({
      key: item.data_key,
      type: item.data_type,
      unit: item.unit,
      lastSeen: item._max.timestamp || new Date(),
    }));
  } catch (error) {
    console.error('❌ Failed to get device data keys:', error);
    throw error;
  }
}

/**
 * 解析数据值（从字符串转换为原始类型）
 * @param value 数据值字符串
 * @param type 数据类型
 * @returns 解析后的值
 */
function parseDataValue(
  value: string,
  type: string
): number | boolean | string | Record<string, unknown> {
  switch (type) {
    case 'number':
      return parseFloat(value);
    case 'boolean':
      return value === 'true';
    case 'json':
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return value;
      }
    default:
      return value;
  }
}

// 历史数据记录接口
export interface HistoryDataRecord {
  timestamp: string;
  value: number;
  count?: number; // 聚合时包含：参与聚合的原始数据点数量
}

// 历史数据查询结果接口
export interface DeviceDataHistory {
  deviceId: string;
  deviceName: string;
  dataKey: string;
  timeRange: {
    startTime: string;
    endTime: string;
  };
  aggregation?: string;
  aggregateType?: 'avg' | 'max' | 'min'; // 聚合类型（新增）
  records: HistoryDataRecord[];
}

/**
 * 获取设备历史数据
 * @param deviceId 设备ID（数据库UUID）
 * @param dataKey 数据字段键
 * @param startTime 开始时间（ISO 8601格式）
 * @param endTime 结束时间（ISO 8601格式）
 * @param aggregation 数据聚合粒度（可选：'minute' | 'hour' | 'day'）
 * @param aggregateType 聚合统计类型（可选：'avg' | 'max' | 'min'，默认'avg'）
 * @param limit 最大返回数据点数量（默认1000）
 * @returns 历史数据数组
 */
export async function getDeviceDataHistory(
  deviceId: string,
  dataKey: string,
  startTime: string,
  endTime: string,
  aggregation?: 'minute' | 'hour' | 'day',
  aggregateType: 'avg' | 'max' | 'min' = 'avg',
  limit = 1000
): Promise<HistoryDataRecord[]> {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 根据聚合参数选择查询策略
    if (!aggregation) {
      // 无聚合查询：直接查询时间范围内的所有数据点
      const rawData = await prisma.deviceData.findMany({
        where: {
          device_id: deviceId,
          data_key: dataKey,
          timestamp: {
            gte: start,
            lte: end,
          },
        },
        select: {
          timestamp: true,
          data_value: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
        take: limit,
      });

      return rawData.map((item) => ({
        timestamp: item.timestamp.toISOString(),
        value: parseFloat(item.data_value),
      }));
    } else {
      // 聚合查询：按分钟/小时/天聚合
      let dateFormat: string;
      switch (aggregation) {
        case 'minute':
          dateFormat = '%Y-%m-%d %H:%i:00';
          break;
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'day':
          dateFormat = '%Y-%m-%d 00:00:00';
          break;
      }

      // 根据聚合类型构建不同的 SQL 查询
      let aggregatedData: { time_bucket: string; value: number; count: bigint }[];

      if (aggregateType === 'max') {
        aggregatedData = await prisma.$queryRaw`
          SELECT
            DATE_FORMAT(timestamp, ${dateFormat}) as time_bucket,
            MAX(CAST(data_value AS DECIMAL(10,2))) as value,
            COUNT(*) as count
          FROM device_data
          WHERE device_id = ${deviceId}
            AND data_key = ${dataKey}
            AND timestamp BETWEEN ${start} AND ${end}
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
          LIMIT ${limit}
        `;
      } else if (aggregateType === 'min') {
        aggregatedData = await prisma.$queryRaw`
          SELECT
            DATE_FORMAT(timestamp, ${dateFormat}) as time_bucket,
            MIN(CAST(data_value AS DECIMAL(10,2))) as value,
            COUNT(*) as count
          FROM device_data
          WHERE device_id = ${deviceId}
            AND data_key = ${dataKey}
            AND timestamp BETWEEN ${start} AND ${end}
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
          LIMIT ${limit}
        `;
      } else {
        // 默认使用 AVG
        aggregatedData = await prisma.$queryRaw`
          SELECT
            DATE_FORMAT(timestamp, ${dateFormat}) as time_bucket,
            AVG(CAST(data_value AS DECIMAL(10,2))) as value,
            COUNT(*) as count
          FROM device_data
          WHERE device_id = ${deviceId}
            AND data_key = ${dataKey}
            AND timestamp BETWEEN ${start} AND ${end}
          GROUP BY time_bucket
          ORDER BY time_bucket ASC
          LIMIT ${limit}
        `;
      }

      return aggregatedData.map((item) => ({
        timestamp: new Date(item.time_bucket).toISOString(),
        value: Number(item.value),
        count: Number(item.count),
      }));
    }
  } catch (error) {
    console.error('❌ Failed to get device data history:', error);
    throw error;
  }
}

// 分组设备数据导出接口
export interface GroupDeviceDataExport {
  device_id: string;
  device_name: string;
  timestamp: string;
  [key: string]: string | number; // 动态数据字段
}

/**
 * 导出分组设备数据（支持CSV和JSON格式）
 * @param deviceIds 设备ID列表
 * @param startTime 开始时间（ISO 8601格式）
 * @param endTime 结束时间（ISO 8601格式）
 * @param dataKeys 要导出的数据字段键（可选，为空则导出所有字段）
 * @param limit 最大返回数据量（默认10000条）
 * @returns 导出数据数组
 */
export async function exportGroupDeviceData(
  deviceIds: string[],
  startTime: string,
  endTime: string,
  dataKeys?: string[],
  limit = 10000
): Promise<GroupDeviceDataExport[]> {
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // 构建查询条件
    const whereCondition: {
      device_id: { in: string[] };
      timestamp: { gte: Date; lte: Date };
      data_key?: { in: string[] };
    } = {
      device_id: { in: deviceIds },
      timestamp: {
        gte: start,
        lte: end,
      },
    };

    // 如果指定了 data_keys，添加过滤条件
    if (dataKeys && dataKeys.length > 0) {
      whereCondition.data_key = { in: dataKeys };
    }

    // 查询设备数据（包含设备信息）
    const rawData = await prisma.deviceData.findMany({
      where: whereCondition,
      include: {
        device: {
          select: {
            device_id: true, // 设备的 device_id（WebSocket ID）
            custom_name: true,
          },
        },
      },
      orderBy: [{ device_id: 'asc' }, { timestamp: 'asc' }],
      take: limit,
    });

    // 将数据转换为导出格式（按时间戳和设备分组）
    const groupedData = new Map<
      string,
      {
        device_id: string;
        device_name: string;
        timestamp: string;
        data: Record<string, string>;
      }
    >();

    for (const record of rawData) {
      // 创建唯一键：设备ID + 时间戳（精确到秒）
      const timestampKey = record.timestamp.toISOString();
      const uniqueKey = `${record.device_id}_${timestampKey}`;

      if (!groupedData.has(uniqueKey)) {
        groupedData.set(uniqueKey, {
          device_id: record.device.device_id,
          device_name: record.device.custom_name || record.device.device_id,
          timestamp: timestampKey,
          data: {},
        });
      }

      const group = groupedData.get(uniqueKey)!;
      group.data[record.data_key] = record.data_value;
    }

    // 转换为数组格式
    return Array.from(groupedData.values()).map((item) => ({
      device_id: item.device_id,
      device_name: item.device_name,
      timestamp: item.timestamp,
      ...item.data,
    }));
  } catch (error) {
    console.error('❌ Failed to export group device data:', error);
    throw error;
  }
}

/**
 * 将导出数据转换为CSV格式
 * @param data 导出数据数组
 * @returns CSV字符串
 */
export function formatDataAsCSV(data: GroupDeviceDataExport[]): string {
  if (data.length === 0) {
    return '';
  }

  // 获取所有列名（去重）
  const columnSet = new Set<string>();
  columnSet.add('device_id');
  columnSet.add('device_name');
  columnSet.add('timestamp');

  for (const row of data) {
    for (const key of Object.keys(row)) {
      if (key !== 'device_id' && key !== 'device_name' && key !== 'timestamp') {
        columnSet.add(key);
      }
    }
  }

  const columns = Array.from(columnSet);

  // 构建CSV头部
  const header = columns.join(',');

  // 构建CSV行
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col];
        // CSV转义：包含逗号或双引号的值需要用双引号包裹
        if (value === undefined || value === null) {
          return '';
        }
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * 将导出数据转换为JSON格式
 * @param data 导出数据数组
 * @returns JSON字符串
 */
export function formatDataAsJSON(data: GroupDeviceDataExport[]): string {
  return JSON.stringify(data, null, 2);
}
