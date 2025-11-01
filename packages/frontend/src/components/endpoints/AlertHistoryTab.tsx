import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, DatePicker, Select, message } from 'antd';
import { CheckOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AlertHistoryWithDetails, AlertLevel, AlertStatus } from '@websocket-relay/shared';
import {
  getAlertHistory,
  markAlertAsRead,
  markAlertAsProcessed,
} from '../../services/alert.service';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

interface AlertHistoryTabProps {
  endpointId: string;
}

/**
 * AlertHistoryTab 组件
 *
 * 职责：显示和管理告警历史记录
 *
 * 功能：
 * - 显示告警历史表格
 * - 筛选功能（告警级别、设备、状态、时间范围）
 * - 标记为已读
 * - 标记为已处理
 * - 表格排序和分页
 */
function AlertHistoryTab({ endpointId }: AlertHistoryTabProps) {
  const [alerts, setAlerts] = useState<AlertHistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 筛选条件
  const [filters, setFilters] = useState<{
    alert_level?: string;
    status?: string;
    start_time?: string;
    end_time?: string;
  }>({});

  // 加载告警历史
  const fetchAlerts = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      const response = await getAlertHistory({
        endpoint_id: endpointId,
        page,
        pageSize,
        ...filters,
      });
      setAlerts(response.data);
      setPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total,
      });
    } catch (error) {
      void message.error('加载告警历史失败');
      console.error('Failed to fetch alert history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, [endpointId, filters]);

  // 标记为已读
  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      void message.success('已标记为已读');
      void fetchAlerts(pagination.current, pagination.pageSize);
    } catch (error) {
      void message.error('操作失败');
      console.error('Failed to mark as read:', error);
    }
  };

  // 标记为已处理
  const handleMarkAsProcessed = async (alertId: string) => {
    try {
      await markAlertAsProcessed(alertId);
      void message.success('已标记为已处理');
      void fetchAlerts(pagination.current, pagination.pageSize);
    } catch (error) {
      void message.error('操作失败');
      console.error('Failed to mark as processed:', error);
    }
  };

  // 格式化日期时间
  const formatDateTime = (dateString: Date | string): string => {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  };

  // 表格列定义
  const columns: ColumnsType<AlertHistoryWithDetails> = [
    {
      title: '触发时间',
      dataIndex: 'triggered_at',
      key: 'triggered_at',
      width: 180,
      render: (date: Date) => formatDateTime(date),
      sorter: (a, b) => new Date(a.triggered_at).getTime() - new Date(b.triggered_at).getTime(),
    },
    {
      title: '设备',
      key: 'device',
      width: 120,
      render: (_, record) => record.device?.custom_name || record.device?.device_id || '-',
    },
    {
      title: '规则名称',
      key: 'rule_name',
      width: 150,
      render: (_, record) => record.alert_rule?.rule_name || '-',
    },
    {
      title: '数据字段',
      dataIndex: 'data_key',
      key: 'data_key',
      width: 120,
    },
    {
      title: '触发值',
      dataIndex: 'triggered_value',
      key: 'triggered_value',
      width: 100,
    },
    {
      title: '阈值',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 100,
    },
    {
      title: '告警级别',
      dataIndex: 'alert_level',
      key: 'alert_level',
      width: 100,
      render: (level: AlertLevel) => {
        const colorMap = {
          info: 'blue',
          warning: 'orange',
          critical: 'red',
        };
        const labelMap = {
          info: '信息',
          warning: '警告',
          critical: '严重',
        };
        return <Tag color={colorMap[level]}>{labelMap[level]}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AlertStatus) => {
        const colorMap = {
          unread: 'red',
          read: 'blue',
          processed: 'green',
        };
        const labelMap = {
          unread: '未读',
          read: '已读',
          processed: '已处理',
        };
        return <Tag color={colorMap[status]}>{labelMap[status]}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'unread' && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => void handleMarkAsRead(record.id)}
            >
              标记已读
            </Button>
          )}
          {(record.status === 'unread' || record.status === 'read') && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => void handleMarkAsProcessed(record.id)}
            >
              已处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 筛选条件 */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            placeholder="告警级别"
            allowClear
            style={{ width: 120 }}
            onChange={(value: string | undefined) =>
              setFilters((prev) => ({ ...prev, alert_level: value }))
            }
          >
            <Select.Option value="info">信息</Select.Option>
            <Select.Option value="warning">警告</Select.Option>
            <Select.Option value="critical">严重</Select.Option>
          </Select>

          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            onChange={(value: string | undefined) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            <Select.Option value="unread">未读</Select.Option>
            <Select.Option value="read">已读</Select.Option>
            <Select.Option value="processed">已处理</Select.Option>
          </Select>

          <RangePicker
            showTime
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                // Non-null assertion is safe here because we check dates[0] and dates[1] above
                setFilters((prev) => ({
                  ...prev,
                  start_time: dates[0]!.toISOString(),
                  end_time: dates[1]!.toISOString(),
                }));
              } else {
                setFilters((prev) => {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const { start_time, end_time, ...rest } = prev;
                  return rest;
                });
              }
            }}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => void fetchAlerts(pagination.current, pagination.pageSize)}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={alerts}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => void fetchAlerts(page, pageSize),
        }}
      />
    </div>
  );
}

export default AlertHistoryTab;
