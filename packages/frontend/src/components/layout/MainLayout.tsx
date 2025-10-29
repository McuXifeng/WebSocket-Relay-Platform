import { useState, useEffect } from 'react';
import { Layout, Typography, Button, Space, Avatar, Dropdown } from 'antd';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  SettingOutlined,
  BookOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

/**
 * MainLayout 组件
 *
 * 使用 Ant Design Layout 组件
 *
 * 职责：
 * - Header 显示应用标题、面包屑导航和用户信息/登出按钮
 * - Content 渲染子路由内容（使用 Outlet）
 * - Footer 显示版权信息
 *
 * 优化点：
 * - 改进布局对齐和间距
 * - 增强响应式设计（移动端适配）
 * - 添加面包屑导航
 * - 用户下拉菜单（Dropdown）
 * - 视觉分隔和层次
 */
function MainLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // 滚动状态管理
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  /**
   * 监听页面滚动,实现导航栏折叠效果
   */
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 滚动超过 50px 时认为已滚动
      setIsScrolled(currentScrollY > 50);

      // 向下滚动且超过 100px 时隐藏导航栏
      // 向上滚动时显示导航栏
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // 向下滚动
        setIsHeaderVisible(false);
      } else {
        // 向上滚动或在顶部
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const handleLogout = () => {
    logout();
    void navigate('/login');
  };

  /**
   * 管理员下拉菜单（仅管理员可见）
   */
  const adminMenuItems: MenuProps['items'] = user?.is_admin
    ? [
        {
          key: 'admin',
          icon: <SettingOutlined />,
          label: '管理后台',
          children: [
            {
              key: 'admin-invite-codes',
              label: '授权码管理',
              onClick: () => {
                void navigate('/admin/invite-codes');
              },
            },
            {
              key: 'admin-users',
              label: '用户管理',
              onClick: () => {
                void navigate('/admin/users');
              },
            },
          ],
        },
        {
          type: 'divider',
        },
      ]
    : [];

  /**
   * 用户下拉菜单
   */
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      disabled: false, // Story 2.8: 启用个人资料菜单项
      onClick: () => {
        void navigate('/profile');
      },
    },
    {
      key: 'docs',
      icon: <BookOutlined />,
      label: '文档',
      children: [
        {
          key: 'docs-user',
          label: '用户使用说明',
          onClick: () => {
            void navigate('/docs/user');
          },
        },
        {
          key: 'docs-developer',
          label: '二次开发说明',
          onClick: () => {
            void navigate('/docs/developer');
          },
        },
      ],
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
      disabled: true, // MVP 暂不实现
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: handleLogout,
    },
  ];

  /**
   * 合并管理员菜单和用户菜单
   */
  const allMenuItems = [...adminMenuItems, ...userMenuItems];

  return (
    <>
      <style>{`
        /* 响应式设计：隐藏小屏幕下的文本 */
        @media (max-width: 768px) {
          .app-title-full {
            display: none;
          }
          .app-title-short {
            display: inline;
          }
          .user-name-text {
            display: none;
          }
        }
        @media (min-width: 769px) {
          .app-title-full {
            display: inline;
          }
          .app-title-short {
            display: none;
          }
        }

        /* 用户头像样式 */
        .user-avatar {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .user-avatar:hover {
          transform: scale(1.1);
        }

        /* 面包屑链接样式 */
        .breadcrumb-link {
          color: #666;
          transition: color 0.3s;
        }
        .breadcrumb-link:hover {
          color: #1890ff;
        }

        /* 导航栏折叠动画 */
        .header-container {
          transition: transform 0.3s ease-in-out, box-shadow 0.3s ease;
        }
        .header-hidden {
          transform: translateY(-100%);
        }
        .header-scrolled {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 顶部导航栏 */}
        <Header
          className={`header-container ${!isHeaderVisible ? 'header-hidden' : ''} ${isScrolled ? 'header-scrolled' : ''}`}
          style={{
            backgroundColor: '#ffffff',
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            borderBottom: '1px solid #e8e8e8',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            height: 'auto',
            lineHeight: 'normal',
          }}
        >
          {/* 第一行：应用标题和用户信息 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '64px',
              gap: '16px',
            }}
          >
            {/* 左侧：应用标题 */}
            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
              <Title
                level={3}
                style={{
                  color: '#001529',
                  margin: 0,
                  fontSize: 'clamp(16px, 3vw, 20px)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#1890ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#001529';
                }}
              >
                <HomeOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                <span className="app-title-full">WebSocket Relay Platform</span>
                <span className="app-title-short">WS Relay</span>
              </Title>
            </Link>

            {/* 右侧：用户信息 */}
            <Space size="middle" align="center">
              {isAuthenticated && user ? (
                <Dropdown menu={{ items: allMenuItems }} placement="bottomRight" arrow>
                  <Space
                    style={{
                      cursor: 'pointer',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#f5f5f5',
                      transition: 'background-color 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e6f7ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                  >
                    <Avatar
                      size="default"
                      icon={<UserOutlined />}
                      style={{
                        backgroundColor: '#1890ff',
                      }}
                      className="user-avatar"
                    />
                    <Text
                      className="user-name-text"
                      style={{
                        color: '#001529',
                        fontWeight: 500,
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.username}
                    </Text>
                  </Space>
                </Dropdown>
              ) : (
                <Space size="small">
                  <Link to="/login">
                    <Button type="primary" size="small">
                      登录
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="small">注册</Button>
                  </Link>
                </Space>
              )}
            </Space>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content
          style={{
            padding: '24px',
            backgroundColor: '#f0f2f5',
            minHeight: 'calc(100vh - 64px - 70px)', // 减去 Header 和 Footer 高度
          }}
        >
          {/* React Router 子路由内容 */}
          <Outlet />
        </Content>

        {/* 页脚 */}
        <Footer
          style={{
            textAlign: 'center',
            backgroundColor: '#fff',
            borderTop: '1px solid #e8e8e8',
            padding: '16px 24px',
          }}
        >
          <Text type="secondary">WebSocket Relay Platform ©2025 Created with ❤️</Text>
        </Footer>
      </Layout>
    </>
  );
}

export default MainLayout;
