import React, { useEffect, useState } from 'react';
import { Typography, Card, Anchor, Row, Col } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import markdownContent from '../../../../docs/websocket-usage.md?raw';
import './WebSocketDocPage.css';

const { Title } = Typography;

/**
 * WebSocket 使用文档页面
 *
 * 功能:
 * - 渲染 markdown 格式的 WebSocket 使用文档
 * - 支持 GitHub Flavored Markdown (表格、代码块等)
 * - 响应式布局,移动端友好
 * - 侧边栏大纲导航
 * - 动态替换域名为实际部署域名
 */
const WebSocketDocPage: React.FC = () => {
  const [processedContent, setProcessedContent] = useState<string>('');

  useEffect(() => {
    // 将 WebSocket URL 替换为实际域名
    // 开发环境: ws://localhost:3001
    // 生产环境: wss://实际域名
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = window.location.protocol === 'https:' ? '' : ':3001';
    const wsHost = window.location.hostname;
    const wsUrl = `${wsProtocol}//${wsHost}${wsPort}`;

    // 替换文档中的占位符
    let content: string = markdownContent;

    // 替换 wss://domain.com 为实际域名
    content = content.replace(/wss:\/\/domain\.com/g, wsUrl);
    // 替换 ws://localhost:3001 保持不变 (用于示例说明)
    // 替换示例 endpoint_id 为更清晰的说明
    content = content.replace(/your-endpoint-id/g, '{your-endpoint-id}');

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
                  key: 'quick-start',
                  href: '#快速开始',
                  title: '快速开始',
                  children: [
                    {
                      key: 'step1',
                      href: '#步骤-1-注册并登录',
                      title: '注册登录',
                    },
                    {
                      key: 'step2',
                      href: '#步骤-2-创建-WebSocket-端点',
                      title: '创建端点',
                    },
                    {
                      key: 'step3',
                      href: '#步骤-3-连接并开始使用',
                      title: '连接使用',
                    },
                  ],
                },
                {
                  key: 'features',
                  href: '#平台功能介绍',
                  title: '平台功能',
                  children: [
                    {
                      key: 'endpoint-management',
                      href: '#1.-端点管理',
                      title: '端点管理',
                    },
                    {
                      key: 'stats',
                      href: '#2.-实时统计',
                      title: '实时统计',
                    },
                  ],
                },
                {
                  key: 'url-format',
                  href: '#WebSocket-URL-格式说明',
                  title: 'URL 格式',
                  children: [
                    {
                      key: 'url-structure',
                      href: '#URL-组成',
                      title: 'URL 组成',
                    },
                    {
                      key: 'get-url',
                      href: '#如何获取-WebSocket-URL?',
                      title: '如何获取',
                    },
                  ],
                },
                {
                  key: 'relay-mechanism',
                  href: '#消息中继机制',
                  title: '中继机制',
                  children: [
                    {
                      key: 'how-it-works',
                      href: '#工作原理',
                      title: '工作原理',
                    },
                    {
                      key: 'isolation',
                      href: '#端点隔离',
                      title: '端点隔离',
                    },
                    {
                      key: 'message-format',
                      href: '#消息格式建议',
                      title: '消息格式',
                    },
                  ],
                },
                {
                  key: 'device-identification',
                  href: '#设备标识和自定义名称',
                  title: '设备标识',
                  children: [
                    {
                      key: 'what-is-device-id',
                      href: '#什么是设备标识?',
                      title: '什么是设备标识',
                    },
                    {
                      key: 'device-protocol',
                      href: '#设备标识协议',
                      title: '标识协议',
                    },
                    {
                      key: 'browser-example',
                      href: '#浏览器客户端示例',
                      title: '浏览器示例',
                    },
                    {
                      key: 'nodejs-device-example',
                      href: '#Node.js-客户端示例',
                      title: 'Node.js示例',
                    },
                    {
                      key: 'device-id-generation',
                      href: '#设备-ID-生成和持久化',
                      title: 'ID生成',
                    },
                    {
                      key: 'manage-devices',
                      href: '#管理界面查看设备',
                      title: '管理界面',
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
                  ],
                },
                {
                  key: 'troubleshooting',
                  href: '#错误排查',
                  title: '错误排查',
                  children: [
                    {
                      key: 'common-issues',
                      href: '#常见问题',
                      title: '常见问题',
                    },
                  ],
                },
                {
                  key: 'security',
                  href: '#安全建议',
                  title: '安全建议',
                },
                {
                  key: 'best-practices',
                  href: '#最佳实践',
                  title: '最佳实践',
                },
                {
                  key: 'complete-example',
                  href: '#完整示例-简单聊天室',
                  title: '完整示例',
                },
              ]}
            />
          </div>
        </Col>

        {/* 右侧文档内容 */}
        <Col xs={24} sm={24} md={18} lg={18} xl={19}>
          <Card className="doc-card">
            <Title level={2}>WebSocket 使用文档</Title>
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

export default WebSocketDocPage;
