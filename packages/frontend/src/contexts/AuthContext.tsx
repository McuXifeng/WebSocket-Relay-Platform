import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPublic } from '@shared/types/user.types';
import type { LoginResponse } from '@shared/types/auth.types';
import * as authService from '../services/auth.service';

/**
 * AuthContext 类型定义
 */
interface AuthContextType {
  user: UserPublic | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

/**
 * AuthContext
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider 组件属性
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider 组件
 *
 * 职责：管理全局用户认证状态，提供登录/登出功能
 *
 * 实现要点：
 * - 使用 useState 管理用户状态
 * - 初始化时从 localStorage 读取 token，验证并恢复用户状态
 * - login 函数：调用后端 API，存储 token，更新用户状态
 * - logout 函数：清除 token 和用户状态
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * 初始化：从 localStorage 读取 token，验证并恢复用户状态
   *
   * 修复 AUTH-001: 调用 /auth/me API 验证 token 有效性
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // 调用后端 API 验证 token 并获取当前用户信息
          const user = await authService.getCurrentUser();
          setUser(user);
        } catch (error) {
          // Token 无效或已过期，清除本地存储
          console.error('Token 验证失败:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    void initAuth();
  }, []);

  /**
   * 登录函数
   *
   * @param username 用户名
   * @param password 密码
   */
  const login = async (username: string, password: string): Promise<void> => {
    // 调用认证服务的登录 API
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response: LoginResponse = await authService.login({
      username,
      password,
    });

    // 存储 JWT Token 到 localStorage
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    localStorage.setItem('token', response.token);

    // 更新全局用户状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    setUser(response.user);
  };

  /**
   * 登出函数
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  /**
   * 刷新用户信息
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const user = await authService.getCurrentUser();
      setUser(user);
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      // Token 无效时清除登录状态
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    login,
    logout,
    refreshUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * 方便组件使用 AuthContext
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
