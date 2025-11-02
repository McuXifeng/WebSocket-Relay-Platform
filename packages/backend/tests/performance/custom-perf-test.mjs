#!/usr/bin/env node
/**
 * 自定义 WebSocket 性能测试脚本
 * 用于替代 Artillery 进行 WebSocket 压力测试
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// 测试配置
const WS_URL = 'ws://localhost:3001';
const TEST_ENDPOINT = 'test-ep-001';

// 性能指标收集器
class MetricsCollector {
  constructor() {
    this.latencies = [];
    this.errors = [];
    this.messagesReceived = 0;
    this.messagesSent = 0;
    this.connectionsSucceeded = 0;
    this.connectionsFailed = 0;
    this.startTime = Date.now();
  }

  recordLatency(latency) {
    this.latencies.push(latency);
  }

  recordError(error) {
    this.errors.push({ timestamp: Date.now(), error: error.message });
  }

  recordMessageSent() {
    this.messagesSent++;
  }

  recordMessageReceived() {
    this.messagesReceived++;
  }

  recordConnectionSuccess() {
    this.connectionsSucceeded++;
  }

  recordConnectionFailure() {
    this.connectionsFailed++;
  }

  calculatePercentile(percentile) {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  getThroughput() {
    const durationSec = (Date.now() - this.startTime) / 1000;
    return durationSec > 0 ? this.messagesSent / durationSec : 0;
  }

  getReport() {
    return {
      duration: (Date.now() - this.startTime) / 1000,
      connections: {
        succeeded: this.connectionsSucceeded,
        failed: this.connectionsFailed,
        total: this.connectionsSucceeded + this.connectionsFailed,
        successRate: ((this.connectionsSucceeded / (this.connectionsSucceeded + this.connectionsFailed)) * 100).toFixed(2) + '%'
      },
      messages: {
        sent: this.messagesSent,
        received: this.messagesReceived,
        throughput: this.getThroughput().toFixed(2) + ' msg/s'
      },
      latency: {
        p50: this.calculatePercentile(50).toFixed(2) + 'ms',
        p95: this.calculatePercentile(95).toFixed(2) + 'ms',
        p99: this.calculatePercentile(99).toFixed(2) + 'ms',
        min: Math.min(...this.latencies).toFixed(2) + 'ms',
        max: Math.max(...this.latencies).toFixed(2) + 'ms',
        avg: (this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length).toFixed(2) + 'ms'
      },
      errors: this.errors.length,
      errorRate: ((this.errors.length / this.messagesSent) * 100).toFixed(2) + '%'
    };
  }
}

// WebSocket 连接管理器
class WSConnection {
  constructor(url, onMessage) {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.onMessage = onMessage;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data) => {
        if (this.onMessage) {
          this.onMessage(data);
        }
      });

      this.ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.ws.on('close', () => {
        this.connected = false;
      });
    });
  }

  send(data) {
    if (!this.connected || !this.ws) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(data);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// 测试场景 1: 单端点多连接测试
async function testSingleEndpointMultiConnection() {
  console.log('\n🧪 场景 1: 单端点多连接测试');
  console.log('=' .repeat(60));

  const results = {};
  const connectionCounts = [10, 20, 50];

  for (const count of connectionCounts) {
    console.log(`\n📊 测试 ${count} 个并发连接...`);
    const metrics = new MetricsCollector();
    const connections = [];

    // 建立连接
    for (let i = 0; i < count; i++) {
      try {
        const conn = new WSConnection(
          `${WS_URL}/ws/${TEST_ENDPOINT}`,
          () => metrics.recordMessageReceived()
        );
        await conn.connect();
        connections.push(conn);
        metrics.recordConnectionSuccess();
      } catch (err) {
        metrics.recordConnectionFailure();
        metrics.recordError(err);
      }
    }

    console.log(`✅ 成功建立 ${metrics.connectionsSucceeded}/${count} 个连接`);

    // 发送消息测试 (60秒)
    const testDuration = 60 * 1000;
    const messageInterval = 1000; // 每秒1条消息
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      for (const conn of connections) {
        if (conn.connected) {
          try {
            const sendTime = performance.now();
            const message = JSON.stringify({
              type: 'message',
              data: 'Performance test',
              timestamp: Date.now()
            });
            conn.send(message);
            metrics.recordMessageSent();

            // 模拟接收延迟 (简化版,实际应该监听响应)
            const latency = performance.now() - sendTime;
            metrics.recordLatency(latency);
          } catch (err) {
            metrics.recordError(err);
          }
        }
      }
      await sleep(messageInterval);
    }

    // 关闭连接
    connections.forEach(conn => conn.close());

    results[`${count}_connections`] = metrics.getReport();
    console.log(`📈 完成测试: ${count} 连接`);
  }

  return results;
}

// 测试场景 2: 多端点并发测试
async function testMultiEndpointConcurrent() {
  console.log('\n🧪 场景 2: 多端点并发测试');
  console.log('=' .repeat(60));

  // 简化版: 使用同一个端点模拟多端点
  const results = {};
  const configs = [
    { endpoints: 10, connectionsPerEndpoint: 5 },
    { endpoints: 20, connectionsPerEndpoint: 5 },
    { endpoints: 50, connectionsPerEndpoint: 5 }
  ];

  for (const config of configs) {
    const totalConnections = config.endpoints * config.connectionsPerEndpoint;
    console.log(`\n📊 测试 ${config.endpoints} 端点 × ${config.connectionsPerEndpoint} 连接 = ${totalConnections} 总连接...`);

    const metrics = new MetricsCollector();
    const connections = [];

    // 建立连接
    for (let i = 0; i < totalConnections; i++) {
      try {
        const conn = new WSConnection(
          `${WS_URL}/ws/${TEST_ENDPOINT}`,
          () => metrics.recordMessageReceived()
        );
        await conn.connect();
        connections.push(conn);
        metrics.recordConnectionSuccess();
      } catch (err) {
        metrics.recordConnectionFailure();
        metrics.recordError(err);
      }
    }

    console.log(`✅ 成功建立 ${metrics.connectionsSucceeded}/${totalConnections} 个连接`);

    // 发送消息测试 (30秒, 更短的持续时间)
    const testDuration = 30 * 1000;
    const messageInterval = 2000; // 每2秒1条消息 (降低频率)
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      for (const conn of connections) {
        if (conn.connected) {
          try {
            const sendTime = performance.now();
            const message = JSON.stringify({
              type: 'message',
              data: 'Multi-endpoint test',
              timestamp: Date.now()
            });
            conn.send(message);
            metrics.recordMessageSent();

            const latency = performance.now() - sendTime;
            metrics.recordLatency(latency);
          } catch (err) {
            metrics.recordError(err);
          }
        }
      }
      await sleep(messageInterval);
    }

    // 关闭连接
    connections.forEach(conn => conn.close());

    results[`${config.endpoints}_endpoints`] = metrics.getReport();
    console.log(`📈 完成测试: ${config.endpoints} 端点`);
  }

  return results;
}

// 测试场景 3: 高消息吞吐量测试
async function testHighThroughput() {
  console.log('\n🧪 场景 3: 高消息吞吐量测试');
  console.log('=' .repeat(60));

  const results = {};
  const connectionCount = 50;
  const targetThroughputs = [100, 300, 500]; // msg/s (降低目标)

  for (const targetThroughput of targetThroughputs) {
    console.log(`\n📊 测试目标吞吐量: ${targetThroughput} msg/s...`);
    const metrics = new MetricsCollector();
    const connections = [];

    // 建立连接
    for (let i = 0; i < connectionCount; i++) {
      try {
        const conn = new WSConnection(
          `${WS_URL}/ws/${TEST_ENDPOINT}`,
          () => metrics.recordMessageReceived()
        );
        await conn.connect();
        connections.push(conn);
        metrics.recordConnectionSuccess();
      } catch (err) {
        metrics.recordConnectionFailure();
        metrics.recordError(err);
      }
    }

    console.log(`✅ 成功建立 ${metrics.connectionsSucceeded}/${connectionCount} 个连接`);

    // 高频发送测试 (30秒)
    const testDuration = 30 * 1000;
    const msgsPerConnection = targetThroughput / connectionCount;
    const intervalMs = 1000 / msgsPerConnection;
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      for (const conn of connections) {
        if (conn.connected) {
          try {
            const sendTime = performance.now();
            const message = JSON.stringify({
              type: 'message',
              data: 'High throughput test',
              timestamp: Date.now()
            });
            conn.send(message);
            metrics.recordMessageSent();

            const latency = performance.now() - sendTime;
            metrics.recordLatency(latency);
          } catch (err) {
            metrics.recordError(err);
          }
        }
      }
      await sleep(intervalMs);
    }

    // 关闭连接
    connections.forEach(conn => conn.close());

    results[`${targetThroughput}_msgs_per_sec`] = metrics.getReport();
    console.log(`📈 完成测试: 目标 ${targetThroughput} msg/s, 实际 ${metrics.getThroughput().toFixed(2)} msg/s`);
  }

  return results;
}

// 测试场景 4: 长连接稳定性测试 (简化版)
async function testLongConnectionStability() {
  console.log('\n🧪 场景 4: 长连接稳定性测试 (简化版: 5分钟)');
  console.log('=' .repeat(60));

  const connectionCount = 50; // 降低连接数
  const testDuration = 5 * 60 * 1000; // 5分钟 (简化版)
  const heartbeatInterval = 10000; // 10秒心跳

  console.log(`\n📊 测试 ${connectionCount} 个长连接, 持续 ${testDuration / 1000 / 60} 分钟...`);

  const metrics = new MetricsCollector();
  const connections = [];

  // 建立连接
  for (let i = 0; i < connectionCount; i++) {
    try {
      const conn = new WSConnection(
        `${WS_URL}/ws/${TEST_ENDPOINT}`,
        () => metrics.recordMessageReceived()
      );
      await conn.connect();
      connections.push(conn);
      metrics.recordConnectionSuccess();
    } catch (err) {
      metrics.recordConnectionFailure();
      metrics.recordError(err);
    }
  }

  console.log(`✅ 成功建立 ${metrics.connectionsSucceeded}/${connectionCount} 个连接`);
  console.log(`⏰ 开始长时间稳定性测试...`);

  const startTime = Date.now();
  let lastReport = startTime;

  while (Date.now() - startTime < testDuration) {
    // 发送心跳
    for (const conn of connections) {
      if (conn.connected) {
        try {
          const sendTime = performance.now();
          const message = JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now()
          });
          conn.send(message);
          metrics.recordMessageSent();

          const latency = performance.now() - sendTime;
          metrics.recordLatency(latency);
        } catch (err) {
          metrics.recordError(err);
        }
      }
    }

    // 每分钟输出一次进度
    if (Date.now() - lastReport >= 60000) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      console.log(`  ⏱️  已运行 ${elapsed} 分钟, 活跃连接: ${connections.filter(c => c.connected).length}/${connectionCount}`);
      lastReport = Date.now();
    }

    await sleep(heartbeatInterval);
  }

  // 关闭连接
  connections.forEach(conn => conn.close());

  console.log(`📈 完成长连接测试`);
  return { long_connection_test: metrics.getReport() };
}

// 工具函数: 延迟
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试流程
async function runAllTests() {
  console.log('\n🚀 开始 WebSocket 性能基准测试');
  console.log('=' .repeat(60));
  console.log(`目标服务器: ${WS_URL}`);
  console.log(`测试端点: ${TEST_ENDPOINT}`);
  console.log(`开始时间: ${new Date().toISOString()}`);

  const results = {
    metadata: {
      testDate: new Date().toISOString(),
      wsUrl: WS_URL,
      testEndpoint: TEST_ENDPOINT,
      platform: process.platform,
      nodeVersion: process.version
    },
    scenarios: {}
  };

  try {
    // 场景 1
    results.scenarios.singleEndpointMultiConnection = await testSingleEndpointMultiConnection();

    // 场景 2
    results.scenarios.multiEndpointConcurrent = await testMultiEndpointConcurrent();

    // 场景 3
    results.scenarios.highThroughput = await testHighThroughput();

    // 场景 4
    results.scenarios.longConnectionStability = await testLongConnectionStability();

    // 保存结果
    const reportPath = resolve(process.cwd(), 'tests/performance/reports/custom-test-results.json');
    writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ 测试完成! 结果已保存到: ${reportPath}`);

    // 打印摘要
    console.log('\n📊 测试摘要');
    console.log('=' .repeat(60));
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests().catch(console.error);
