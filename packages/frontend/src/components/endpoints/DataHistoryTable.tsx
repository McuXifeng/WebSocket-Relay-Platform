import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface DataHistoryRecord {
  timestamp: string;
  value: number;
  count?: number;
}

interface DataHistoryTableProps {
  data: DataHistoryRecord[];
  loading: boolean;
  pagination: { current: number; pageSize: number };
  onPaginationChange: (pagination: { current: number; pageSize: number }) => void;
  aggregation: 'none' | 'minute' | 'hour' | 'day';
  aggregateType?: 'avg' | 'max' | 'min';
}

const DataHistoryTable: React.FC<DataHistoryTableProps> = ({
  data,
  loading,
  pagination,
  onPaginationChange,
  aggregation,
  aggregateType,
}) => {
  const columns: ColumnsType<DataHistoryRecord> = [
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      defaultSortOrder: 'ascend',
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
    },
    {
      title: '数据值',
      dataIndex: 'value',
      key: 'value',
      render: (value: number) => {
        // 如果是整数，不显示小数点
        if (Number.isInteger(value)) {
          return value;
        }
        // 保留2位小数
        return value.toFixed(2);
      },
      align: 'right',
      width: 120,
    },
  ];

  // 如果是聚合查询，添加聚合信息列
  if (aggregation !== 'none' && aggregateType) {
    const aggregateTypeLabel =
      aggregateType === 'avg' ? '平均值' : aggregateType === 'max' ? '最大值' : '最小值';

    columns.splice(1, 0, {
      title: `聚合类型`,
      key: 'aggregateType',
      render: () => aggregateTypeLabel,
      width: 100,
    });

    columns.push({
      title: '数据点数量',
      dataIndex: 'count',
      key: 'count',
      render: (count?: number) => count || '-',
      align: 'right',
      width: 120,
    });
  }

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        pageSizeOptions: ['10', '20', '50', '100'],
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条记录`,
        onChange: (page, pageSize) => onPaginationChange({ current: page, pageSize }),
      }}
      rowKey="timestamp"
      size="small"
      scroll={{ x: true }}
      bordered
    />
  );
};

export default DataHistoryTable;
