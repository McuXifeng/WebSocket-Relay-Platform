import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EndpointDetailPage from './pages/EndpointDetailPage';
import ProfilePage from './pages/ProfilePage';
import WebSocketDocPage from './pages/WebSocketDocPage';
import InviteCodesPage from './pages/admin/InviteCodesPage';
import UsersPage from './pages/admin/UsersPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/common/AdminRoute';

/**
 * 路由配置
 *
 * 公开路由：/login, /register - 任何人可访问
 * 受保护路由：/dashboard - 需要登录 (使用 ProtectedRoute 保护)
 *
 * 使用 MainLayout 包裹受保护路由
 */
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'endpoints/:id',
        element: (
          <ProtectedRoute>
            <EndpointDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'docs/websocket-usage',
        element: (
          <ProtectedRoute>
            <WebSocketDocPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/invite-codes',
        element: (
          <AdminRoute>
            <InviteCodesPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        ),
      },
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

export default router;
