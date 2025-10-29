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
function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
