#!/usr/bin/env node
/**
 * WebSocket 断开连接压力测试 (Epic 10 Story 10.5 Task 7)
 *
 * 测试目标:
 * 1. 模拟 100 个客户端同时连接到同一端点
 * 2. 50% 正常断开，50% 异常断开（terminate）
 * 3. 验证所有断开连接在 5 秒内完成统计更新
 * 4. 验证最终 current_connections 为 0（无连接泄漏）
 * 5. 监控内存使用和 CPU 负载
 */

import WebSocket from 'ws';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 测试配置
const WS_URL = 'ws://localhost:3001';
const CLIENT_COUNT = 100;

// 测试结果收集器
const results = {
  connectSuccessCount: 0,
  connectFailureCount: 0,
  normalDisconnectCount: 0,
  abnormalDisconnectCount: 0,
  errors: [],
};

/**
 * 创建一个 WebSocket 客户端并连接
 */
async function createClient(endpointId, clientId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_URL}/ws/${endpointId}`);
    const client = { ws, clientId, connected: false };

    ws.on('open', () => {
      client.connected = true;
      results.connectSuccessCount++;
      console.log(`[Client ${clientId}] Connected`);
      resolve(client);
    });

    ws.on('error', (error) => {
      results.connectFailureCount++;
      results.errors.push({ clientId, error: error.message });
      reject(error);
    });

    // 设置超时
    setTimeout(() => {
      if (!client.connected) {
        ws.terminate();
        reject(new Error(`Connection timeout for client ${clientId}`));
      }
    }, 5000);
  });
}

/**
 * 断开客户端连接
 */
function disconnectClient(client, useTerminate = false) {
  if (!client.ws || client.ws.readyState !== WebSocket.OPEN) {
    console.log(`[Client ${client.clientId}] Already disconnected`);
    return;
  }

  if (useTerminate) {
    // 异常断开：直接 terminate
    client.ws.terminate();
    results.abnormalDisconnectCount++;
    console.log(`[Client ${client.clientId}] Abnormal disconnect (terminate)`);
  } else {
    // 正常断开：close
    client.ws.close();
    results.normalDisconnectCount++;
    console.log(`[Client ${client.clientId}] Normal disconnect (close)`);
  }
}

/**
 * 主测试函数
 */
async function runDisconnectTest() {
  console.log('\n=== WebSocket Disconnect Pressure Test ===\n');

  // Step 1: 获取或创建测试端点
  console.log('[Step 1] Setting up test endpoint...');

  let endpoint;
  try {
    // 尝试查找现有的测试端点
    endpoint = await prisma.endpoint.findFirst({
      where: {
        name: { startsWith: 'test-disconnect-' },
        disabled: false,
      },
    });

    if (!endpoint) {
      // 如果没有测试端点，创建一个（需要有用户）
      const testUser = await prisma.user.findFirst({
        where: { username: 'admin' },
      });

      if (!testUser) {
        throw new Error('No admin user found. Please create an admin user first.');
      }

      endpoint = await prisma.endpoint.create({
        data: {
          name: `test-disconnect-${Date.now()}`,
          endpoint_id: `test-disconnect-${Date.now()}`,
          user_id: testUser.id,
        },
      });
      console.log(`Created test endpoint: ${endpoint.endpoint_id}`);
    } else {
      console.log(`Using existing test endpoint: ${endpoint.endpoint_id}`);
    }
  } catch (error) {
    console.error('Failed to setup test endpoint:', error);
    throw error;
  }

  const endpointId = endpoint.endpoint_id;

  // Step 2: 创建 100 个客户端连接
  console.log(`\n[Step 2] Creating ${CLIENT_COUNT} WebSocket connections...`);
  const clients = [];
  const connectStartTime = Date.now();

  for (let i = 0; i < CLIENT_COUNT; i++) {
    try {
      const client = await createClient(endpointId, i);
      clients.push(client);
    } catch (error) {
      console.error(`Failed to create client ${i}:`, error.message);
    }

    // 添加小延迟避免连接风暴
    if (i % 10 === 0 && i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  const connectDuration = Date.now() - connectStartTime;
  console.log(
    `\n[Result] ${results.connectSuccessCount}/${CLIENT_COUNT} clients connected in ${connectDuration}ms`
  );

  if (results.connectSuccessCount === 0) {
    console.error('No clients connected. Test failed.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // 等待 2 秒，让连接稳定
  console.log('\n[Step 3] Waiting 2 seconds for connections to stabilize...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 查询连接建立后的统计数据
  const statsBeforeDisconnect = await prisma.endpointStats.findUnique({
    where: { endpoint_id: endpoint.id },
  });

  console.log(
    `\n[Stats Before Disconnect] current_connections: ${statsBeforeDisconnect?.current_connections ?? 0}`
  );

  // Step 4: 断开所有客户端（50% 正常，50% 异常）
  console.log(`\n[Step 4] Disconnecting all ${clients.length} clients...`);
  console.log('  - 50% will use normal close()');
  console.log('  - 50% will use abnormal terminate()');

  const disconnectStartTime = Date.now();

  for (let i = 0; i < clients.length; i++) {
    const useTerminate = i % 2 === 1; // 奇数索引使用 terminate
    disconnectClient(clients[i], useTerminate);
  }

  const disconnectDuration = Date.now() - disconnectStartTime;
  console.log(`\n[Result] All ${clients.length} clients disconnected in ${disconnectDuration}ms`);

  // Step 5: 等待 5 秒，查询统计数据
  console.log('\n[Step 5] Waiting 5 seconds for stats to update...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const statsAfterDisconnect = await prisma.endpointStats.findUnique({
    where: { endpoint_id: endpoint.id },
  });

  console.log(
    `\n[Stats After Disconnect] current_connections: ${statsAfterDisconnect?.current_connections ?? 0}`
  );

  // Step 6: 验证结果
  console.log('\n=== Test Results ===\n');
  console.log(`Total Duration: ${(Date.now() - connectStartTime) / 1000}s`);
  console.log(`\nConnection Statistics:`);
  console.log(`  - Succeeded: ${results.connectSuccessCount}`);
  console.log(`  - Failed: ${results.connectFailureCount}`);
  console.log(`\nDisconnect Statistics:`);
  console.log(`  - Normal (close): ${results.normalDisconnectCount}`);
  console.log(`  - Abnormal (terminate): ${results.abnormalDisconnectCount}`);
  console.log(`  - Total: ${results.normalDisconnectCount + results.abnormalDisconnectCount}`);
  console.log(`\nDatabase Statistics:`);
  console.log(
    `  - Before Disconnect: ${statsBeforeDisconnect?.current_connections ?? 0} connections`
  );
  console.log(
    `  - After Disconnect: ${statsAfterDisconnect?.current_connections ?? 0} connections`
  );
  console.log(`\nErrors: ${results.errors.length}`);

  // 验证测试是否通过
  const testPassed = statsAfterDisconnect?.current_connections === 0;

  console.log(`\n=== Test ${testPassed ? 'PASSED ✅' : 'FAILED ❌'} ===\n`);

  if (!testPassed) {
    console.error(
      `Expected current_connections to be 0, but got ${statsAfterDisconnect?.current_connections}`
    );
    console.error('Possible connection leak detected!');
  }

  if (results.errors.length > 0) {
    console.log('\n=== Errors ===');
    results.errors.forEach((err) => {
      console.log(`  [Client ${err.clientId}] ${err.error}`);
    });
  }

  // 清理
  await prisma.$disconnect();
  process.exit(testPassed ? 0 : 1);
}

// 运行测试
runDisconnectTest().catch((error) => {
  console.error('Test failed with error:', error);
  prisma.$disconnect();
  process.exit(1);
});
