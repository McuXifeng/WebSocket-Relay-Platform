import React from 'react';
import { Typography, Card, Anchor, Row, Col } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import markdownContent from '../../../../docs/user-guide.md?raw';
import './WebSocketDocPage.css';

const { Title } = Typography;

/**
 * 用户使用说明页面
 *
 * 功能:
 * - 渲染 markdown 格式的用户使用说明文档
 * - 面向只使用网页界面的用户,不涉及任何代码
 * - 支持 GitHub Flavored Markdown (表格、列表等)
 * - 响应式布局,移动端友好
 * - 侧边栏大纲导航
 */
const UserGuidePage: React.FC = () => {
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
                      href: '#步骤-2-创建端点',
                      title: '创建端点',
                    },
                    {
                      key: 'step3',
                      href: '#步骤-3-查看端点详情',
                      title: '查看详情',
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
                    {
                      key: 'device-management',
                      href: '#3.-设备管理',
                      title: '设备管理',
                    },
                  ],
                },
                {
                  key: 'admin-features',
                  href: '#管理员功能',
                  title: '管理员功能',
                  children: [
                    {
                      key: 'invite-codes',
                      href: '#1.-邀请码管理',
                      title: '邀请码管理',
                    },
                    {
                      key: 'user-management',
                      href: '#2.-用户管理',
                      title: '用户管理',
                    },
                  ],
                },
                {
                  key: 'basic-concepts',
                  href: '#基本概念',
                  title: '基本概念',
                  children: [
                    {
                      key: 'endpoint-isolation',
                      href: '#端点隔离',
                      title: '端点隔离',
                    },
                    {
                      key: 'websocket-url',
                      href: '#WebSocket-URL',
                      title: 'WebSocket URL',
                    },
                    {
                      key: 'relay-mechanism',
                      href: '#消息中继机制',
                      title: '消息中继机制',
                    },
                  ],
                },
                {
                  key: 'faq',
                  href: '#常见问题-FAQ',
                  title: '常见问题',
                },
              ]}
            />
          </div>
        </Col>

        {/* 右侧文档内容 */}
        <Col xs={24} sm={24} md={18} lg={18} xl={19}>
          <Card className="doc-card">
            <Title level={2}>用户使用说明</Title>
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
                {markdownContent}
              </ReactMarkdown>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserGuidePage;
