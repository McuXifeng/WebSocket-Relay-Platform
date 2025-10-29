/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Markdown 文件导入类型声明
 */
declare module '*.md?raw' {
  const content: string;
  export default content;
}
