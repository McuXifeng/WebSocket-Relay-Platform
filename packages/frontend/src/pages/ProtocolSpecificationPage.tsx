import React, { useEffect, useState, useRef } from 'react';
import { Typography, Card, Anchor, Row, Col } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import markdownContent from '../../../../docs/protocol-specification.md?raw';
import './WebSocketDocPage.css';

const { Title } = Typography;

/**
 * 下位机通信协议规范页面
 *
 * 功能:
 * - 渲染 markdown 格式的下位机与后端通信协议完整规范文档
 * - 面向下位机设备开发者
 * - 支持 GitHub Flavored Markdown (表格、代码块等)
 * - 响应式布局,移动端友好
 * - 侧边栏大纲导航
 * - 动态替换域名为实际部署域名
 */
const ProtocolSpecificationPage: React.FC = () => {
  const [processedContent, setProcessedContent] = useState<string>('');
  const mermaidIdCounter = useRef<number>(0);

  useEffect(() => {
    // 初始化 Mermaid
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });

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
                  href: '#一、协议概览',
                  title: '一、协议概览',
                },
                {
                  key: 'connection',
                  href: '#二、连接协议',
                  title: '二、连接协议',
                },
                {
                  key: 'device-registration',
                  href: '#三、设备注册协议',
                  title: '三、设备注册协议',
                },
                {
                  key: 'data-upload',
                  href: '#四、数据上报协议',
                  title: '四、数据上报协议',
                },
                {
                  key: 'control-command',
                  href: '#五、控制命令协议',
                  title: '五、控制命令协议',
                },
                {
                  key: 'response',
                  href: '#六、响应协议',
                  title: '六、响应协议',
                },
                {
                  key: 'request',
                  href: '#七、请求协议（Request-Protocol）',
                  title: '七、请求协议',
                },
                {
                  key: 'data-parsing',
                  href: '#八、数据解析（Data-Parsing）',
                  title: '八、数据解析',
                },
                {
                  key: 'heartbeat',
                  href: '#九、心跳/保活机制',
                  title: '九、心跳/保活机制',
                },
                {
                  key: 'error-handling',
                  href: '#十、错误处理协议',
                  title: '十、错误处理协议',
                },
                {
                  key: 'forwarding-mode',
                  href: '#十一、消息转发模式',
                  title: '十一、消息转发模式',
                },
                {
                  key: 'database-tables',
                  href: '#十二、数据库核心表',
                  title: '十二、数据库核心表',
                },
                {
                  key: 'communication-flow',
                  href: '#十三、完整通信流程示例',
                  title: '十三、通信流程示例',
                },
                {
                  key: 'implementation-guide',
                  href: '#十四、设备端实现指南',
                  title: '十四、设备端实现指南',
                },
                {
                  key: 'security',
                  href: '#十五、安全建议',
                  title: '十五、安全建议',
                },
                {
                  key: 'performance',
                  href: '#十六、性能优化建议',
                  title: '十六、性能优化建议',
                },
                {
                  key: 'appendix',
                  href: '#附录-A：完整消息类型总览',
                  title: '附录',
                  children: [
                    {
                      key: 'appendix-a',
                      href: '#附录-A：完整消息类型总览',
                      title: 'A: 消息类型总览',
                    },
                    {
                      key: 'appendix-b',
                      href: '#附录-B：WebSocket-状态码',
                      title: 'B: WebSocket 状态码',
                    },
                    {
                      key: 'appendix-c',
                      href: '#附录-C：常见问题解答',
                      title: 'C: FAQ',
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
            <Title level={2}>下位机通信协议完整规范</Title>
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
                  // 自定义代码块样式 - 支持 Mermaid 图表
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    // 如果是 Mermaid 代码块
                    if (language === 'mermaid') {
                      const mermaidCode = String(children).replace(/\n$/, '');
                      const mermaidId = `mermaid-${++mermaidIdCounter.current}`;

                      // 使用 useEffect 渲染 Mermaid 图表
                      useEffect(() => {
                        const element = document.getElementById(mermaidId);
                        if (element) {
                          mermaid
                            .render(`mermaid-svg-${mermaidId}`, mermaidCode)
                            .then(({ svg }) => {
                              element.innerHTML = svg;
                            })
                            .catch((error: unknown) => {
                              console.error('Mermaid rendering error:', error);
                              const errorMessage =
                                error instanceof Error ? error.message : String(error);
                              element.innerHTML = `<pre>Mermaid rendering error: ${errorMessage}</pre>`;
                            });
                        }
                      }, [mermaidCode, mermaidId]);

                      return <div id={mermaidId} className="mermaid-diagram"></div>;
                    }

                    // 普通代码块
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

export default ProtocolSpecificationPage;
