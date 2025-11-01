import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import router from './router';

/**
 * 应用根组件
 *
 * 集成：
 * - AuthProvider：管理全局用户认证状态
 * - React Router：负责路由管理
 */
function AppContent() {
  // TODO (Story 6.5): 实现用户告警通知 WebSocket 服务器后，在此处初始化告警通知监听
  // useAlertNotifications();

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
