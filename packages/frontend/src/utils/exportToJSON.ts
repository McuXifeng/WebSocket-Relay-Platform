import type { Dayjs } from 'dayjs';

interface DataHistoryRecord {
  timestamp: string;
  value: number | string | boolean | Record<string, unknown>;
  count?: number;
}

interface ExportJSONOptions {
  deviceId: string;
  deviceName: string;
  dataKey: string;
  timeRange: [Dayjs, Dayjs];
  aggregation?: 'minute' | 'hour' | 'day';
  aggregateType?: 'avg' | 'max' | 'min';
}

/**
 * 导出历史数据为JSON格式
 * @param data 历史数据记录
 * @param options 导出选项
 */
export function exportToJSON(data: DataHistoryRecord[], options: ExportJSONOptions): void {
  const { deviceId, deviceName, dataKey, timeRange, aggregation, aggregateType } = options;

  // 构造JSON数据结构
  const jsonData = {
    metadata: {
      deviceId,
      deviceName,
      dataKey,
      timeRange: {
        startTime: timeRange[0].toISOString(),
        endTime: timeRange[1].toISOString(),
      },
      aggregation: aggregation || null,
      aggregateType: aggregateType || null,
      exportedAt: new Date().toISOString(),
    },
    records: data.map((record) => ({
      timestamp: record.timestamp,
      value: record.value,
      ...(record.count !== undefined && { count: record.count }),
    })),
  };

  // 转换为格式化的JSON字符串
  const jsonString = JSON.stringify(jsonData, null, 2);

  // 生成文件名
  const [startTime, endTime] = timeRange;
  const fileName = `${deviceName}_${dataKey}_${startTime.format('YYYYMMDD')}_${endTime.format('YYYYMMDD')}.json`;

  // 触发浏览器下载
  downloadFile(jsonString, fileName, 'application/json;charset=utf-8;');
}

/**
 * 触发浏览器下载文件
 * @param content 文件内容
 * @param fileName 文件名
 * @param mimeType MIME类型
 */
function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 释放 URL 对象
  URL.revokeObjectURL(url);
}
