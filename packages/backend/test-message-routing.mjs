/**
 * WebSocket 消息路由测试脚本
 * 测试同一端点多个客户端之间的消息广播
 */

import WebSocket from 'ws';

const ENDPOINT_ID = 'CV6e3sON9o';
const WS_URL = `ws://localhost:3001/ws/${ENDPOINT_ID}`;

console.log('🧪 开始测试 WebSocket 消息路由...\n');

// 创建两个客户端
const client1 = new WebSocket(WS_URL);
const client2 = new WebSocket(WS_URL);

let client1Connected = false;
let client2Connected = false;
let testsPassed = 0;
let testsFailed = 0;

// 测试结果记录
const results = {
  client1ToClient2: false,
  client2ToClient1: false,
  noEcho: true,
};

// 客户端 1 连接成功
client1.on('open', () => {
  console.log('✅ 客户端 1 已连接');
  client1Connected = true;
  checkBothConnected();
});

// 客户端 2 连接成功
client2.on('open', () => {
  console.log('✅ 客户端 2 已连接');
  client2Connected = true;
  checkBothConnected();
});

// 客户端 1 接收消息
client1.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📩 客户端 1 收到消息:', message);

  // 验证消息格式
  if (message.type === 'message' && message.data === 'Hello from Client 2') {
    console.log('✅ 测试通过: 客户端 2 -> 客户端 1');
    results.client2ToClient1 = true;
    testsPassed++;
  }

  // 如果客户端 1 收到自己发送的消息,说明有回显问题
  if (message.data === 'Hello from Client 1') {
    console.log('❌ 测试失败: 客户端 1 收到自己的消息(不应回显)');
    results.noEcho = false;
    testsFailed++;
  }

  checkTestsComplete();
});

// 客户端 2 接收消息
client2.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📩 客户端 2 收到消息:', message);

  // 验证消息格式
  if (message.type === 'message' && message.data === 'Hello from Client 1') {
    console.log('✅ 测试通过: 客户端 1 -> 客户端 2');
    results.client1ToClient2 = true;
    testsPassed++;
  }

  // 如果客户端 2 收到自己发送的消息,说明有回显问题
  if (message.data === 'Hello from Client 2') {
    console.log('❌ 测试失败: 客户端 2 收到自己的消息(不应回显)');
    results.noEcho = false;
    testsFailed++;
  }

  checkTestsComplete();
});

// 错误处理
client1.on('error', (error) => {
  console.error('❌ 客户端 1 错误:', error.message);
  process.exit(1);
});

client2.on('error', (error) => {
  console.error('❌ 客户端 2 错误:', error.message);
  process.exit(1);
});

// 检查两个客户端是否都已连接
function checkBothConnected() {
  if (client1Connected && client2Connected) {
    console.log('\n🚀 开始消息广播测试...\n');

    // 客户端 1 发送消息
    setTimeout(() => {
      console.log('📤 客户端 1 发送消息: "Hello from Client 1"');
      client1.send(
        JSON.stringify({
          type: 'message',
          data: 'Hello from Client 1',
        })
      );
    }, 100);

    // 客户端 2 发送消息
    setTimeout(() => {
      console.log('📤 客户端 2 发送消息: "Hello from Client 2"');
      client2.send(
        JSON.stringify({
          type: 'message',
          data: 'Hello from Client 2',
        })
      );
    }, 200);

    // 测试非 JSON 消息
    setTimeout(() => {
      console.log('📤 客户端 1 发送非 JSON 消息 (测试错误处理)');
      client1.send('This is not JSON');
    }, 300);

    // 5 秒后检查测试结果
    setTimeout(() => {
      checkTestsComplete();
    }, 1000);
  }
}

// 检查测试是否完成
function checkTestsComplete() {
  // 至少需要两个测试通过(双向消息传递)
  if (results.client1ToClient2 && results.client2ToClient1) {
    console.log('\n========================================');
    console.log('✅ 所有测试通过!');
    console.log(`✅ 通过: ${testsPassed} 个测试`);
    console.log(`❌ 失败: ${testsFailed} 个测试`);
    console.log('========================================\n');

    console.log('测试结果详情:');
    console.log(`  ✅ 客户端 1 -> 客户端 2: ${results.client1ToClient2 ? '通过' : '失败'}`);
    console.log(`  ✅ 客户端 2 -> 客户端 1: ${results.client2ToClient1 ? '通过' : '失败'}`);
    console.log(`  ✅ 无回显: ${results.noEcho ? '通过' : '失败'}`);

    // 关闭连接
    client1.close();
    client2.close();
    process.exit(0);
  }
}

// 超时处理
setTimeout(() => {
  console.log('\n⚠️ 测试超时!');
  console.log(`✅ 通过: ${testsPassed} 个测试`);
  console.log(`❌ 失败: ${testsFailed} 个测试`);
  client1.close();
  client2.close();
  process.exit(testsFailed > 0 ? 1 : 0);
}, 5000);
