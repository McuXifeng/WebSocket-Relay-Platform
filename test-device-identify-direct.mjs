#!/usr/bin/env node
/**
 * 测试脚本：验证 DIRECT 模式下的设备标识功能
 */

import WebSocket from 'ws';

const ENDPOINT_ID = 'gfV9C7fqvt'; // DIRECT 模式端点
const WS_URL = `ws://localhost:3001/ws/${ENDPOINT_ID}`;

console.log('📡 测试 DIRECT 模式下的设备标识功能');
console.log(`🔗 连接到: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket 连接已建立');

  // 发送设备标识消息
  const identifyMsg = {
    type: 'identify',
    deviceId: 'test-device-direct-001',
    deviceName: '测试设备-DIRECT模式',
  };

  console.log('📤 发送设备标识消息:', JSON.stringify(identifyMsg));
  ws.send(JSON.stringify(identifyMsg));
});

ws.on('message', (data) => {
  const message = data.toString();
  console.log('📥 收到消息:', message);

  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'identified') {
      console.log('✅ 设备标识成功!');
      console.log(`   - 设备 ID: ${parsed.deviceId}`);
      console.log(`   - 自定义名称: ${parsed.customName}`);

      // 测试成功，关闭连接
      setTimeout(() => {
        console.log('\n✅ 测试通过！DIRECT 模式下设备标识功能正常工作');
        ws.close();
        process.exit(0);
      }, 500);
    }
  } catch (error) {
    console.error('❌ 解析消息失败:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('🔌 WebSocket 连接已关闭');
});

// 超时机制
setTimeout(() => {
  console.error('\n❌ 测试超时！未收到设备标识确认消息');
  ws.close();
  process.exit(1);
}, 5000);
