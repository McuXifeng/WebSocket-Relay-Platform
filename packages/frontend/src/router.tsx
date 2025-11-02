import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EndpointDetailPage from './pages/EndpointDetailPage';
import ProfilePage from './pages/ProfilePage';
import UserGuidePage from './pages/UserGuidePage';
import DeveloperGuidePage from './pages/DeveloperGuidePage';
import ProtocolSpecificationPage from './pages/ProtocolSpecificationPage';
import VisualizationDashboardPage from './pages/VisualizationDashboardPage';
import DeviceGroupsPage from './pages/DeviceGroupsPage';
import DeviceGroupDetailPage from './pages/DeviceGroupDetailPage';
import InviteCodesPage from './pages/admin/InviteCodesPage';
import UsersPage from './pages/admin/UsersPage';
import AdminUserEndpointsPage from './pages/admin/AdminUserEndpointsPage';
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
        path: 'docs',
        element: <Navigate to="/docs/user" replace />,
      },
      {
        path: 'docs/user',
        element: (
          <ProtectedRoute>
            <UserGuidePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'docs/developer',
        element: (
          <ProtectedRoute>
            <DeveloperGuidePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'docs/protocol',
        element: (
          <ProtectedRoute>
            <ProtocolSpecificationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'visualization',
        element: (
          <ProtectedRoute>
            <VisualizationDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'device-groups',
        element: (
          <ProtectedRoute>
            <DeviceGroupsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'device-groups/:groupId',
        element: (
          <ProtectedRoute>
            <DeviceGroupDetailPage />
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
        path: 'admin/users/:userId/endpoints',
        element: (
          <AdminRoute>
            <AdminUserEndpointsPage />
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
