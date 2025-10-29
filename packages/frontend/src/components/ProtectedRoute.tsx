import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute 组件属性
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 受保护路由组件
 *
 * 功能：
 * - 检查用户认证状态
 * - 未认证时自动重定向到登录页
 * - 已认证时渲染子组件
 * - 加载中显示 Spin 组件
 *
 * 使用方式：
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

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

  // 未认证，重定向到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 已认证，渲染子组件
  return <>{children}</>;
}
