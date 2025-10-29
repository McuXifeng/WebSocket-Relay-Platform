/**
 * MessageHistoryCard Component
 * Story 3.10: 历史消息存储和展示功能
 *
 * 显示端点的历史消息记录(最新50条)，支持分页和JSON格式化
 */

import { useState } from 'react';
import { Card, List, Empty, Skeleton, Typography, message as antdMessage, Button, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getEndpointMessages } from '../../services/endpoint.service';
import type { Message } from '@websocket-relay/shared/types/message.types';
import { usePolling } from '../../hooks/usePolling';

interface MessageHistoryCardProps {
  /** 端点的数据库 UUID */
  endpointId: string;
}

/**
 * 尝试解析 JSON 字符串并智能提取消息内容
 * @param content - 消息内容（可能是 JSON 字符串）
 * @returns 格式化后的内容、类型信息和元数据
 */
function formatMessageContent(content: string): {
  isJson: boolean;
  formatted: string;
  messageType?: string;
  timestamp?: number;
  rawData?: unknown;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(content);

    // 如果是标准消息格式 { type, data, timestamp }
    if (parsed && typeof parsed === 'object' && 'type' in parsed && 'data' in parsed) {
      const { type, data, timestamp } = parsed as {
        type: string;
        data: unknown;
        timestamp?: number;
      };

      // 如果 data 是对象，格式化显示
      if (data && typeof data === 'object') {
        return {
          isJson: true,
          formatted: JSON.stringify(data, null, 2),
          messageType: type,
          timestamp,
          rawData: data,
        };
      }

      // 如果 data 是字符串或基本类型，直接显示
      return {
        isJson: true,
        formatted: String(data),
        messageType: type,
        timestamp,
        rawData: data,
      };
    }

    // 如果是普通 JSON 对象（不是标准消息格式）
    return {
      isJson: true,
      formatted: JSON.stringify(parsed, null, 2),
      rawData: parsed,
    };
  } catch {
    // 不是 JSON，返回原始文本
    return {
      isJson: false,
      formatted: content,
    };
  }
}

/**
 * 历史消息卡片组件
 *
 * 功能：
 * - 加载并展示端点的历史消息(最新50条)
 * - 自动识别并格式化 JSON 消息
 * - 支持分页展示
 * - 手动刷新功能
 * - 显示消息内容、发送者信息、相对时间
 * - 长消息支持展开/折叠
 * - 空状态提示
 * - 加载状态 Skeleton
 *
 * @param props - 组件属性
 * @returns React 组件
 */
export default function MessageHistoryCard({ endpointId }: MessageHistoryCardProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // 每页显示10条

  // 加载消息的函数（支持静默刷新）
  const fetchMessages = async (silent = false) => {
    try {
      // 非静默模式才显示 loading
      if (!silent) {
        setLoading(true);
      }

      // getEndpointMessages 已经在 service 层处理了数据提取
      // 直接返回 { messages: Message[] } 格式
      const data = await getEndpointMessages(endpointId);
      setMessages(data.messages);
    } catch (err) {
      console.error('加载历史消息失败:', err);
      void antdMessage.error('加载历史消息失败');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // 使用智能轮询 Hook，每 5 秒静默刷新一次（页面可见时）
  // 页面不可见时自动暂停，重新可见时立即刷新
  usePolling(() => fetchMessages(true), {
    interval: 5000, // 5 秒间隔，及时显示新消息
    enabled: true,
  });

  // 手动刷新（显示 loading 状态）
  const handleRefresh = () => {
    void fetchMessages(false);
  };

  if (loading) {
    return (
      <Card
        title="历史消息"
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
        }
      >
        <Skeleton active paragraph={{ rows: 5 }} />
      </Card>
    );
  }

  // 分页数据
  const paginatedMessages = messages.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Card
      title={`历史消息 (共 ${messages.length} 条)`}
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
          刷新
        </Button>
      }
    >
      <List
        dataSource={paginatedMessages}
        locale={{ emptyText: <Empty description="暂无历史消息" /> }}
        pagination={{
          current: currentPage,
          pageSize,
          total: messages.length,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条消息`,
        }}
        renderItem={(msg) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          const { isJson, formatted, messageType, timestamp } = formatMessageContent(msg.content);

          return (
            <List.Item>
              <List.Item.Meta
                title={
                  <div>
                    {isJson && <Tag color="blue">JSON</Tag>}
                    {messageType && <Tag color="green">{messageType}</Tag>}
                    <Typography.Paragraph
                      ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
                      style={{
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        fontFamily: isJson ? 'monospace' : 'inherit',
                        marginBottom: 0,
                      }}
                    >
                      {formatted}
                    </Typography.Paragraph>
                  </div>
                }
                description={
                  <>
                    {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
                    {msg.sender_info || '未知设备'}
                    {' · '}
                    {/* eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */}
                    {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                    {timestamp && (
                      <>
                        {' · '}
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          消息时间戳: {new Date(timestamp).toLocaleTimeString('zh-CN')}
                        </span>
                      </>
                    )}
                  </>
                }
              />
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
