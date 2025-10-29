import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import config from '@/config/env';

/**
 * Axios API Client
 *
 * 职责：封装所有 HTTP API 调用，统一处理 Token 附加和错误处理
 *
 * 配置要点：
 * 1. Base URL 配置：http://localhost:3000/api
 * 2. 请求拦截器：自动附加 JWT Token
 * 3. 响应拦截器：统一错误处理
 *
 * 关键规则：
 * - 前端永远通过 services/ 层调用 API，禁止直接使用 Axios
 * - 所有 API 服务函数使用配置好的 apiClient 实例
 * - 使用泛型确保类型安全
 */

/**
 * API 响应数据结构（后端统一返回格式）
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * API 错误响应数据结构
 */
interface ApiErrorResponse {
  error?: {
    message?: string;
  };
  message?: string;
}

/**
 * 从 AxiosError 中提取用户友好的错误消息
 *
 * @param error Axios 错误对象
 * @returns 用户友好的错误消息
 */
function extractErrorMessage(error: AxiosError<ApiErrorResponse>): string {
  // 尝试从响应数据中提取错误消息
  if (error.response?.data) {
    const data = error.response.data;

    // 后端返回的标准错误格式
    if (data.error?.message) {
      return data.error.message;
    }

    // 简单的错误消息
    if (data.message) {
      return data.message;
    }

    // 字符串类型的响应
    if (typeof data === 'string') {
      return data;
    }
  }

  // 根据 HTTP 状态码返回默认消息
  if (error.response?.status) {
    const statusMessages: Record<number, string> = {
      400: '请求参数错误',
      403: '没有权限访问',
      404: '请求的资源不存在',
      500: '服务器错误，请稍后重试',
      502: '网关错误',
      503: '服务暂时不可用',
    };
    return statusMessages[error.response.status] || `请求失败 (${error.response.status})`;
  }

  // 网络错误
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请检查网络连接';
  }

  if (error.message === 'Network Error') {
    return '网络连接失败，请检查网络设置';
  }

  // 默认错误消息
  return error.message || '未知错误，请稍后重试';
}

/**
 * 创建 Axios 实例
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 自动附加 JWT Token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 统一错误处理
 */
apiClient.interceptors.response.use(
  <T = unknown>(response: AxiosResponse<T>): T => {
    // 直接返回 data 字段，简化调用代码
    // 使用泛型确保类型安全
    return response.data;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // 401 错误处理：需要区分"登录失败"和"Token 失效"
    if (error.response?.status === 401) {
      // 获取请求的 URL
      const requestUrl = error.config?.url || '';

      // 如果是认证相关的 API (登录/注册)，不清除 token，不重定向
      // 这些 API 的 401 错误表示"用户名或密码错误"，而不是"Token 失效"
      if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
        // 显示后端返回的具体错误消息
        const errorMessage = extractErrorMessage(error);
        void message.error(errorMessage);
        console.error('认证失败:', error.response?.data || error.message);
        return Promise.reject(error);
      }

      // 其他 API 的 401 错误表示 Token 失效
      void message.error('登录已过期，请重新登录');
      localStorage.removeItem('token');
      // 延迟跳转，确保用户看到提示
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return Promise.reject(error);
    }

    // 其他错误：显示用户友好的错误消息
    const errorMessage = extractErrorMessage(error);
    void message.error(errorMessage);
    console.error('API 请求错误:', error.response?.data || error.message);

    return Promise.reject(error);
  }
);

/**
 * 类型安全的 API 客户端包装器
 * 由于响应拦截器返回 response.data，这些包装函数明确了正确的返回类型
 */
export const api = {
  get: <T>(url: string, config?: Parameters<typeof apiClient.get>[1]): Promise<T> => {
    return apiClient.get<T>(url, config) as Promise<T>;
  },
  post: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.post>[2]
  ): Promise<T> => {
    return apiClient.post<T>(url, data, config) as Promise<T>;
  },
  put: <T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof apiClient.put>[2]
  ): Promise<T> => {
    return apiClient.put<T>(url, data, config) as Promise<T>;
  },
  delete: <T>(url: string, config?: Parameters<typeof apiClient.delete>[1]): Promise<T> => {
    return apiClient.delete<T>(url, config) as Promise<T>;
  },
};

export default apiClient;
