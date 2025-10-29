import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import type { ReactNode } from 'react';

// Mock auth.service 模块
vi.mock('../../services/auth.service');

/**
 * AuthContext 单元测试
 *
 * 测试范围：
 * - 初始化状态验证
 * - login 函数功能
 * - logout 函数功能
 * - isAuthenticated 状态
 * - useAuth Hook 错误处理
 */

// 测试包装器
const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  beforeEach(() => {
    // 清空 localStorage
    localStorage.clear();
  });

  describe('初始化状态', () => {
    it('应该正确初始化未登录状态', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('应该在初始化完成后 loading 变为 false', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 验证最终 loading 状态
      expect(result.current.loading).toBe(false);
    });
  });

  describe('login 功能', () => {
    it('应该在登录成功后更新用户状态', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // 等待初始化完成
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 执行登录
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // 验证状态已更新
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.username).toBe('testuser');
      expect(result.current.user?.email).toBe('testuser@example.com');
    });

    it('应该在登录后将 token 存储到 localStorage', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // 验证 token 已存储
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
    });

    it('应该支持多个用户登录', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 第一个用户登录
      await act(async () => {
        await result.current.login('user1', 'password1');
      });
      expect(result.current.user?.username).toBe('user1');

      // 第二个用户登录（应该替换第一个）
      await act(async () => {
        await result.current.login('user2', 'password2');
      });
      expect(result.current.user?.username).toBe('user2');
    });
  });

  describe('logout 功能', () => {
    it('应该清除用户状态', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 先登录
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });
      expect(result.current.isAuthenticated).toBe(true);

      // 登出
      act(() => {
        result.current.logout();
      });

      // 验证状态已清除
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('应该从 localStorage 中移除 token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 先登录
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');

      // 登出
      act(() => {
        result.current.logout();
      });

      // 验证 token 已移除
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('应该可以多次调用 logout 而不出错', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 先登录
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      // 多次登出
      act(() => {
        result.current.logout();
        result.current.logout();
        result.current.logout();
      });

      // 验证状态正确
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('isAuthenticated 状态', () => {
    it('未登录时 isAuthenticated 应为 false', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('登录后 isAuthenticated 应为 true', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it('登出后 isAuthenticated 应为 false', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('useAuth Hook 错误处理', () => {
    it('在 AuthProvider 外使用 useAuth 应该抛出错误', () => {
      // 模拟控制台错误以避免测试输出污染
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });

  describe('登录流程集成测试', () => {
    it('完整的登录-登出流程应该正常工作', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // 初始状态
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      expect(result.current.isAuthenticated).toBe(false);

      // 登录
      await act(async () => {
        await result.current.login('testuser', 'password123');
      });
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.username).toBe('testuser');
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');

      // 登出
      act(() => {
        result.current.logout();
      });
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
