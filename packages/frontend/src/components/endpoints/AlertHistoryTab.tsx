import { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, DatePicker, Select, message, Grid, Empty } from 'antd';
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import { PullToRefresh } from 'antd-mobile';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { AlertHistoryWithDetails, AlertLevel, AlertStatus } from '@websocket-relay/shared';
import {
  getAlertHistory,
  markAlertAsRead,
  markAllAlertsAsRead,
  getUnreadAlertCount,
} from '../../services/alert.service';
import type { ColumnsType } from 'antd/es/table';
import MobileAlertCard from './MobileAlertCard';
import MobileBottomBar from './MobileBottomBar';
import MobileFilterPanel from './MobileFilterPanel';

const { useBreakpoint } = Grid;

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
  // 响应式布局检测 (768px 为移动端/PC端分界线)
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 断点为 768px

  const [alerts, setAlerts] = useState<AlertHistoryWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 未读数量和加载状态
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState<{
    alert_level?: string;
    status?: string;
    start_time?: string;
    end_time?: string;
  }>({});

  // 移动端筛选面板显示状态
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);

  // 加载未读数量
  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadAlertCount(endpointId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

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
      // 刷新未读数量
      void fetchUnreadCount();
    } catch (error) {
      void message.error('加载告警历史失败');
      console.error('Failed to fetch alert history:', error);
    } finally {
      setLoading(false);
    }
  };

  // 下拉刷新处理函数
  const handlePullRefresh = async () => {
    await fetchAlerts(pagination.current, pagination.pageSize);
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

  // 批量已读（全部已读）
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllAsRead(true);
      const result = await markAllAlertsAsRead(endpointId);
      void message.success(`已将 ${result.count} 条告警标记为已读`);
      void fetchAlerts(pagination.current, pagination.pageSize);
    } catch (error) {
      void message.error('批量已读操作失败');
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllAsRead(false);
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
      width: 150,
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
        </Space>
      ),
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* PC端筛选条件 */}
      {!isMobile && (
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
      )}

      {/* PC端批量操作按钮区域 */}
      {!isMobile && unreadCount > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => void handleMarkAllAsRead()}
              loading={markingAllAsRead}
            >
              全部已读 ({unreadCount})
            </Button>
          </Space>
        </div>
      )}

      {/* 条件渲染: 移动端显示卡片列表, PC端显示表格 */}
      {isMobile ? (
        <PullToRefresh onRefresh={handlePullRefresh}>
          <div style={{ paddingBottom: 80 }}>
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <MobileAlertCard
                  key={alert.id}
                  alert={alert}
                  onMarkAsRead={(id) => void handleMarkAsRead(id)}
                  onDelete={() => {
                    // TODO: 实现删除功能 (Story 8.2 Task 3)
                    void message.info('删除功能待实现');
                  }}
                />
              ))
            ) : (
              <Empty description="暂无告警，系统运行正常 ✅" style={{ padding: '60px 0' }} />
            )}
          </div>
        </PullToRefresh>
      ) : (
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
      )}

      {/* 移动端底部操作栏 */}
      {isMobile && (
        <MobileBottomBar
          unreadCount={unreadCount}
          onMarkAllAsRead={() => void handleMarkAllAsRead()}
          onOpenFilter={() => setFilterPanelVisible(true)}
          loading={markingAllAsRead}
        />
      )}

      {/* 移动端筛选面板 */}
      {isMobile && (
        <MobileFilterPanel
          visible={filterPanelVisible}
          onClose={() => setFilterPanelVisible(false)}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
    </div>
  );
}

export default AlertHistoryTab;
