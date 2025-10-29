import { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { LoginRequest } from '@shared/types/auth.types';

const { Text } = Typography;

/**
 * 登录页面组件
 *
 * 功能：
 * - 用户名和密码表单
 * - 客户端验证（必填）
 * - 调用登录 API
 * - 存储 JWT Token 到 localStorage
 * - 更新 AuthContext 认证状态
 * - 成功后跳转到 Dashboard
 * - 显示加载状态
 */
function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  /**
   * 异步登录处理
   *
   * 流程：
   * 1. 调用 AuthContext 的 login() 方法（内部会调用 API、存储 token、更新状态）
   * 2. 显示成功消息
   * 3. 跳转到 Dashboard
   *
   * 错误处理：
   * - api.ts 拦截器已统一处理错误显示，组件不需要手动调用 message.error()
   * - catch 块仅用于静默处理或日志记录
   *
   * 修复 CODE-001: 提取为独立 async 函数，提高代码可读性
   */
  const performLogin = async (loginData: LoginRequest) => {
    try {
      // 调用 AuthContext 的 login() 方法
      // 该方法内部会：调用 API、存储 token、更新用户状态
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      await login(loginData.username, loginData.password);

      // 显示成功消息
      void message.success('登录成功');

      // 跳转到 Dashboard
      void navigate('/dashboard');
    } catch (error: unknown) {
      // api.ts 拦截器已经显示了错误消息
      // 这里只需要记录日志
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 表单提交处理器
   *
   * Ant Design Form onFinish 类型要求返回 void，
   * 因此使用包装函数调用异步 performLogin
   */
  const handleSubmit = (values: unknown) => {
    // 类型保护：确保 values 符合 LoginRequest 接口
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const loginData = values as LoginRequest;

    setLoading(true);

    // 调用异步登录函数
    void performLogin(loginData);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <Card
        title="用户登录"
        style={{
          maxWidth: 400,
          width: '100%',
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          {/* 用户名字段 */}
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          {/* 密码字段 */}
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>

          {/* 注册链接 */}
          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <Text>
              还没有账号? <Link to="/register">去注册</Link>
            </Text>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
