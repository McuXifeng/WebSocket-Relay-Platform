import { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '@/services/auth.service';
import type { RegisterRequest } from '@shared/types/auth.types';

const { Text } = Typography;

/**
 * 用户注册页面
 *
 * 职责：提供用户注册表单，验证输入并调用注册 API
 */
function RegisterPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /**
   * 处理表单提交
   */
  const handleSubmit = async (values: RegisterRequest & { confirmPassword: string }) => {
    setLoading(true);
    try {
      // 提取注册所需的字段（不包括 confirmPassword）
      const registerData: RegisterRequest = {
        inviteCode: values.inviteCode,
        username: values.username,
        email: values.email,
        password: values.password,
      };

      await register(registerData);
      void message.success('注册成功');
      void navigate('/login');
    } catch (error: unknown) {
      // 错误消息已由 api.ts 响应拦截器统一处理，无需重复显示
      // 只需要处理 loading 状态
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        padding: '20px',
      }}
    >
      <Card
        title="用户注册"
        style={{
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            void handleSubmit(values as RegisterRequest & { confirmPassword: string });
          }}
        >
          {/* 授权码字段 */}
          <Form.Item
            label="授权码"
            name="inviteCode"
            rules={[{ required: true, message: '请输入授权码' }]}
          >
            <Input placeholder="请输入8-12位授权码" />
          </Form.Item>

          {/* 用户名字段 */}
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          {/* 邮箱字段 */}
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          {/* 密码字段 */}
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '密码长度至少为8位' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                message: '密码必须包含至少一个大写字母、一个小写字母和一个数字',
              },
            ]}
          >
            <Input.Password placeholder="请输入密码（至少8位，含大小写字母和数字）" />
          </Form.Item>

          {/* 确认密码字段 */}
          <Form.Item
            label="确认密码"
            name="confirmPassword"
            rules={[
              { required: true, message: '请再次输入密码' },
              {
                validator: (_, value) => {
                  if (!value || form.getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              },
            ]}
          >
            <Input.Password placeholder="请再次输入密码" />
          </Form.Item>

          {/* 提交按钮 */}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={loading} block>
              注册
            </Button>
          </Form.Item>
        </Form>

        {/* 导航链接 */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text>
            已有账号？ <Link to="/login">去登录</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}

export default RegisterPage;
