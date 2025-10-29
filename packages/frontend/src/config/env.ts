/**
 * 环境变量配置
 *
 * 职责：统一管理应用环境变量
 *
 * 关键规则：
 * - 通过 config/env.ts 模块访问环境变量
 * - 禁止直接使用 import.meta.env
 */

interface EnvConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
}

const env = import.meta.env as Record<string, string | undefined>;

const config: EnvConfig = {
  // 后端 API 地址
  API_BASE_URL: env.VITE_API_BASE_URL || 'http://localhost:3000/api',

  // WebSocket 地址（后续故事使用）
  WS_BASE_URL: env.VITE_WS_BASE_URL || 'ws://localhost:3001',
};

export default config;
