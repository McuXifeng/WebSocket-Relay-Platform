import React, { useEffect, useState } from 'react';
import { Typography, Card, Anchor, Row, Col } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import markdownContent from '../../../../docs/developer-guide.md?raw';
import './WebSocketDocPage.css';

const { Title } = Typography;

/**
 * 二次开发说明页面
 *
 * 功能:
 * - 渲染 markdown 格式的二次开发说明文档
 * - 面向使用平台 API (WebSocket + REST API) 开发自己应用的开发者
 * - 支持 GitHub Flavored Markdown (表格、代码块等)
 * - 响应式布局,移动端友好
 * - 侧边栏大纲导航
 * - 动态替换域名为实际部署域名
 */
const DeveloperGuidePage: React.FC = () => {
  const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    // 将 WebSocket URL 替换为实际域名
    // 开发环境: ws://localhost:3001
    // 生产环境: wss://实际域名
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = window.location.protocol === 'https:' ? '' : ':3001';
    const wsHost = window.location.hostname;
    const wsUrl = `${wsProtocol}//${wsHost}${wsPort}`;

    // 替换文档中的 ws://localhost:3001 为实际域名
    let content: string = markdownContent;
    content = content.replace(/ws:\/\/localhost:3001/g, wsUrl);

    setProcessedContent(content);
  }, []);

  return (
    <div className="websocket-doc-page">
      <Row gutter={24}>
        {/* 左侧大纲导航 */}
        <Col xs={0} sm={0} md={6} lg={6} xl={5}>
          <div className="doc-anchor-wrapper">
            <Anchor
              offsetTop={80}
              targetOffset={80}
              onClick={(e, link) => {
                e.preventDefault();
                const targetId = link.href.replace('#', '');
                const element = document.getElementById(targetId);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // 调整滚动位置，考虑顶部偏移
                  window.scrollBy(0, -80);
                }
              }}
              items={[
                {
                  key: 'overview',
                  href: '#平台概述',
                  title: '平台概述',
                  children: [
                    {
                      key: 'what-is',
                      href: '#什么是-WebSocket-Relay-Platform?',
                      title: '什么是平台',
                    },
                    {
                      key: 'use-cases',
                      href: '#典型使用场景',
                      title: '使用场景',
                    },
                  ],
                },
                {
                  key: 'websocket-api',
                  href: '#WebSocket-API-使用说明',
                  title: 'WebSocket API',
                  children: [
                    {
                      key: 'url-format',
                      href: '#WebSocket-URL-格式',
                      title: 'URL 格式',
                    },
                    {
                      key: 'relay-mechanism',
                      href: '#消息中继机制',
                      title: '中继机制',
                    },
                    {
                      key: 'message-format',
                      href: '#消息格式建议',
                      title: '消息格式',
                    },
                    {
                      key: 'device-identification',
                      href: '#设备标识协议-可选',
                      title: '设备标识',
                    },
                  ],
                },
                {
                  key: 'rest-api',
                  href: '#REST-API-参考',
                  title: 'REST API',
                  children: [
                    {
                      key: 'auth-api',
                      href: '#认证-API',
                      title: '认证 API',
                    },
                    {
                      key: 'endpoint-api',
                      href: '#端点管理-API',
                      title: '端点管理 API',
                    },
                    {
                      key: 'error-handling',
                      href: '#错误处理',
                      title: '错误处理',
                    },
                  ],
                },
                {
                  key: 'client-examples',
                  href: '#客户端连接示例',
                  title: '连接示例',
                  children: [
                    {
                      key: 'browser',
                      href: '#浏览器-JavaScript',
                      title: '浏览器',
                    },
                    {
                      key: 'nodejs',
                      href: '#Node.js',
                      title: 'Node.js',
                    },
                    {
                      key: 'python',
                      href: '#Python-可选',
                      title: 'Python',
                    },
                  ],
                },
                {
                  key: 'message-protocol',
                  href: '#消息格式和协议',
                  title: '消息协议',
                },
                {
                  key: 'best-practices',
                  href: '#错误处理和最佳实践',
                  title: '最佳实践',
                  children: [
                    {
                      key: 'connection-error',
                      href: '#1.-连接失败处理',
                      title: '连接失败处理',
                    },
                    {
                      key: 'reconnect',
                      href: '#2.-自动重连机制',
                      title: '自动重连',
                    },
                    {
                      key: 'message-queue',
                      href: '#3.-消息队列-连接未建立时暂存消息',
                      title: '消息队列',
                    },
                    {
                      key: 'heartbeat',
                      href: '#4.-心跳保活-定期发送-ping-消息',
                      title: '心跳保活',
                    },
                  ],
                },
                {
                  key: 'security',
                  href: '#安全建议',
                  title: '安全建议',
                },
                {
                  key: 'complete-examples',
                  href: '#完整应用示例',
                  title: '完整示例',
                  children: [
                    {
                      key: 'chatroom',
                      href: '#简单聊天室-HTML-+-JavaScript',
                      title: '聊天室',
                    },
                    {
                      key: 'iot',
                      href: '#IoT-设备通信-Node.js',
                      title: 'IoT 设备',
                    },
                  ],
                },
              ]}
            />
          </div>
        </Col>

        {/* 右侧文档内容 */}
        <Col xs={24} sm={24} md={18} lg={18} xl={19}>
          <Card className="doc-card">
            <Title level={2}>二次开发说明</Title>
            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // 自定义标题组件,添加 id 用于锚点导航
                  h1({ children, ...props }) {
                    const text = String(children);
                    // 替换空格和特殊字符为破折号，然后合并连续的破折号
                    const id = text.replace(/[\s:：]/g, '-').replace(/-+/g, '-');
                    return (
                      <h1 id={id} {...props}>
                        {children}
                      </h1>
                    );
                  },
                  h2({ children, ...props }) {
                    const text = String(children);
                    const id = text.replace(/[\s:：]/g, '-').replace(/-+/g, '-');
                    return (
                      <h2 id={id} {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3({ children, ...props }) {
                    const text = String(children);
                    const id = text.replace(/[\s:：]/g, '-').replace(/-+/g, '-');
                    return (
                      <h3 id={id} {...props}>
                        {children}
                      </h3>
                    );
                  },
                  h4({ children, ...props }) {
                    const text = String(children);
                    const id = text.replace(/[\s:：]/g, '-').replace(/-+/g, '-');
                    return (
                      <h4 id={id} {...props}>
                        {children}
                      </h4>
                    );
                  },
                  // 自定义代码块样式
                  code({ className, children, ...props }) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // 自定义表格样式
                  table({ children, ...props }) {
                    return (
                      <div className="table-wrapper">
                        <table {...props}>{children}</table>
                      </div>
                    );
                  },
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DeveloperGuidePage;
