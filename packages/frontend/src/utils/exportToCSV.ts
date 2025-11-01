import Papa from 'papaparse';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

interface DataHistoryRecord {
  timestamp: string;
  value: number | string | boolean | Record<string, unknown>;
  count?: number;
}

interface ExportCSVOptions {
  deviceName: string;
  dataKey: string;
  timeRange: [Dayjs, Dayjs];
  aggregation?: 'minute' | 'hour' | 'day';
  aggregateType?: 'avg' | 'max' | 'min';
}

/**
 * 导出历史数据为CSV格式
 * @param data 历史数据记录
 * @param options 导出选项
 */
export function exportToCSV(data: DataHistoryRecord[], options: ExportCSVOptions): void {
  const { deviceName, dataKey, timeRange, aggregation, aggregateType } = options;

  // 构造CSV数据
  const csvData = data.map((record) => {
    // 格式化值为字符串或数字
    let formattedValue: string | number;
    if (typeof record.value === 'object' && record.value !== null) {
      formattedValue = JSON.stringify(record.value);
    } else if (typeof record.value === 'boolean') {
      formattedValue = record.value ? '是' : '否';
    } else {
      formattedValue = record.value;
    }

    const row: Record<string, string | number> = {
      时间戳: dayjs(record.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      设备名称: deviceName,
      数据键: dataKey,
      数据值: formattedValue,
    };

    // 如果是聚合数据，添加聚合信息
    if (aggregation && aggregateType) {
      const aggregateTypeLabel =
        aggregateType === 'avg' ? '平均值' : aggregateType === 'max' ? '最大值' : '最小值';

      row['聚合粒度'] =
        aggregation === 'minute' ? '按分钟' : aggregation === 'hour' ? '按小时' : '按天';
      row['聚合类型'] = aggregateTypeLabel;

      if (record.count !== undefined) {
        row['数据点数量'] = record.count;
      }
    }

    return row;
  });

  // 使用 Papa Parse 生成CSV
  const csv = Papa.unparse(csvData, {
    header: true,
    delimiter: ',',
  });

  // 生成文件名
  const [startTime, endTime] = timeRange;
  const fileName = `${deviceName}_${dataKey}_${startTime.format('YYYYMMDD')}_${endTime.format('YYYYMMDD')}.csv`;

  // 触发浏览器下载
  downloadFile(csv, fileName, 'text/csv;charset=utf-8;');
}

/**
 * 触发浏览器下载文件
 * @param content 文件内容
 * @param fileName 文件名
 * @param mimeType MIME类型
 */
function downloadFile(content: string, fileName: string, mimeType: string): void {
  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
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
