import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Result, Button, Spin } from 'antd';
import { useAuth } from '../../contexts/AuthContext';

/**
 * AdminRoute 组件属性
 */
interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * 管理员路由保护组件
 *
 * 功能:
 * - 验证用户登录状态
 * - 验证管理员权限
 * - 非管理员用户显示 403 提示
 * - 未登录用户重定向到登录页
 *
 * 使用方式:
 * ```tsx
 * <AdminRoute>
 *   <InviteCodesPage />
 * </AdminRoute>
 * ```
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // 认证状态加载中，显示加载指示器
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // 未登录，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 已登录但非管理员，显示 403 提示
  if (!user?.is_admin) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉,您没有权限访问此页面。"
        extra={
          <Button
            type="primary"
            onClick={() => {
              void navigate('/dashboard');
            }}
          >
            返回首页
          </Button>
        }
      />
    );
  }

  // 管理员,渲染子组件
  return <>{children}</>;
}
