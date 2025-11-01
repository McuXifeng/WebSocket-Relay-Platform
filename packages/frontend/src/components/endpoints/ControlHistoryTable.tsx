/**
 * ControlHistoryTable Component
 * 展示控制指令历史表格,支持状态标签、排序和分页
 * Story 6.4: 设备控制和指令下发
 */

import { Table, Tag, Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ControlCommand } from '../../services/control.service';

const { Text } = Typography;

interface ControlHistoryTableProps {
  commands: ControlCommand[];
  loading: boolean;
  onRefresh: () => void;
}

/**
 * 控制历史表格组件
 */
function ControlHistoryTable({
  commands,
  loading,
  onRefresh,
}: ControlHistoryTableProps): JSX.Element {
  // 定义表格列
  const columns: ColumnsType<ControlCommand> = [
    {
      title: '时间',
      dataIndex: 'sentAt',
      key: 'sentAt',
      sorter: (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      defaultSortOrder: 'descend',
      render: (sentAt: string) => dayjs(sentAt).format('YYYY-MM-DD HH:mm:ss'),
      width: 180,
    },
    {
      title: '指令类型',
      dataIndex: 'commandType',
      key: 'commandType',
      width: 150,
    },
    {
      title: '参数',
      dataIndex: 'commandParams',
      key: 'commandParams',
      render: (params: Record<string, unknown>) => (
        <Text code style={{ fontSize: '12px' }}>
          {JSON.stringify(params)}
        </Text>
      ),
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      filters: [
        { text: '等待中', value: 'pending' },
        { text: '成功', value: 'success' },
        { text: '失败', value: 'failed' },
        { text: '超时', value: 'timeout' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          pending: 'blue',
          success: 'green',
          failed: 'red',
          timeout: 'default',
        };
        const textMap: Record<string, string> = {
          pending: '等待中',
          success: '成功',
          failed: '失败',
          timeout: '超时',
        };
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>;
      },
      width: 100,
    },
    {
      title: '响应时间（ms）',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number | null) => (duration !== null ? `${duration} ms` : '-'),
      sorter: (a, b) => (a.duration ?? 0) - (b.duration ?? 0),
      width: 130,
    },
    {
      title: '错误消息',
      dataIndex: 'errorMessage',
      key: 'errorMessage',
      render: (errorMessage: string | null) => errorMessage || '-',
      ellipsis: true,
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          刷新
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={commands}
        loading={loading}
        pagination={{
          pageSize: 20,
          pageSizeOptions: ['10', '20', '50'],
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        rowKey="commandId"
        size="small"
        scroll={{ x: true }}
        locale={{
          emptyText: '暂无控制指令记录',
        }}
      />
    </>
  );
}

export default ControlHistoryTable;
