/**
 * 性能测试配置文件
 * 集中管理所有性能测试相关的环境变量和参数
 */
import dotenv from 'dotenv';
import path from 'path';

// 加载测试环境变量 (.env.test 或 .env)
dotenv.config({ path: path.join(__dirname, '../../.env.test') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * 性能测试配置对象
 */
export const performanceTestConfig = {
  /**
   * WebSocket 服务器 URL
   * 默认: ws://localhost:3001
   */
  wsServerUrl: process.env.WS_SERVER_URL || 'ws://localhost:3001',

  /**
   * 测试数据库连接 URL (独立于开发数据库)
   * 如果未指定,使用默认的开发数据库
   */
  testDatabaseUrl: process.env.TEST_DATABASE_URL,

  /**
   * 场景 1: 单端点多连接测试
   */
  scenarios: {
    singleEndpoint: {
      name: '单端点多连接测试',
      connectionCounts: [10, 20, 50], // 并发连接数
      duration: 300, // 测试时长 (秒) - 5分钟
      messageRate: 1, // 每连接每秒消息数
      warmupDuration: 60, // 预热时长 (秒)
    },

    /**
     * 场景 2: 多端点并发测试
     */
    multiEndpoint: {
      name: '多端点并发测试',
      endpointCounts: [10, 50, 100], // 端点数量
      connectionsPerEndpoint: 5, // 每端点连接数
      duration: 300, // 测试时长 (秒)
      messageRate: 0.5, // 每连接每秒消息数
      warmupDuration: 60,
    },

    /**
     * 场景 3: 高消息吞吐量测试
     */
    highThroughput: {
      name: '高消息吞吐量测试',
      targetMessageRates: [100, 500, 1000], // 目标消息吞吐量 (msg/s)
      connections: 50, // 固定连接数
      duration: 300, // 测试时长 (秒)
      warmupDuration: 60,
    },

    /**
     * 场景 4: 长连接稳定性测试
     */
    longConnection: {
      name: '长连接稳定性测试',
      connections: 100, // 并发连接数
      duration: 3600, // 测试时长 (秒) - 60分钟
      messageRate: 0.1, // 低频消息 (每10秒1条)
      warmupDuration: 60,
    },
  },

  /**
   * 报告输出配置
   */
  reports: {
    outputDir: path.join(__dirname, 'reports'),
    htmlReport: true,
    jsonReport: true,
  },
};

/**
 * 获取场景配置
 */
export function getScenarioConfig(scenarioName: keyof typeof performanceTestConfig.scenarios) {
  return performanceTestConfig.scenarios[scenarioName];
}

export default performanceTestConfig;
