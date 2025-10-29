/** @type {import('jest').Config} */
export default {
  // 测试环境设置为 Node.js
  testEnvironment: 'node',

  // ESM 支持
  extensionsToTreatAsEsm: ['.ts'],

  // 模块名映射 (对应 tsconfig.json 的 paths)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1',
    // 处理 .js 导入映射到 .ts 文件 (ESM 兼容)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // 转换配置 - 使用 ts-jest 处理 TypeScript
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },

  // 测试文件匹配模式
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.spec.ts'],

  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts', // 排除入口文件
  ],

  // 覆盖率阈值 (可选,暂不强制)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // 超时设置
  testTimeout: 10000,

  // 显示详细输出
  verbose: true,

  // 测试环境设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // 测试环境变量
  testEnvironmentOptions: {
    env: {
      DATABASE_URL: 'mysql://root:password@localhost:3306/websocket_relay_test',
      NODE_ENV: 'test',
    },
  },
};
