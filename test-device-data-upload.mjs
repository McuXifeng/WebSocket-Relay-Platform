#!/usr/bin/env node

import WebSocket from 'ws';

// 配置信息
const WEBSOCKET_URL = 'ws://localhost:3001/ws/gfV9C7fqvt';
const DEVICE_ID = 'micu';

console.log('=== 设备数据上报测试 ===\n');
console.log(`WebSocket URL: ${WEBSOCKET_URL}`);
console.log(`Device ID: ${DEVICE_ID}\n`);

// 创建 WebSocket 连接
const ws = new WebSocket(WEBSOCKET_URL);

ws.on('open', () => {
  console.log('✅ WebSocket 连接成功\n');

  // 等待 500ms 后发送 identify 消息 (确保连接完全就绪)
  setTimeout(() => {
    // 步骤1: 发送设备标识消息
    const identifyMessage = {
      type: 'identify',
      deviceId: DEVICE_ID,
      deviceName: 'xifeng1、2',
    };

    console.log('📤 步骤1: 发送设备标识消息 (identify)');
    console.log(JSON.stringify(identifyMessage, null, 2));
    ws.send(JSON.stringify(identifyMessage));
  }, 500);

  // 等待3秒后发送数据消息 (增加等待时间，确保 identify 消息被处理)
  setTimeout(() => {
    // 步骤2: 发送设备数据消息
    const dataMessage = {
      type: 'data',
      deviceId: DEVICE_ID,
      timestamp: Date.now(),
      data: {
        '1': 25.5,                    // 字段 "1" 的值
        temperature: 28.3,            // 额外的温度字段
        humidity: 65,                 // 湿度字段
        voltage: 3.7,                 // 电压字段
      }
    };

    console.log('\n📤 步骤2: 发送数据消息 (data)');
    console.log(JSON.stringify(dataMessage, null, 2));
    ws.send(JSON.stringify(dataMessage));

    console.log('\n⏳ 等待3秒后查询数据...\n');

    // 3秒后查询数据并关闭连接
    setTimeout(() => {
      console.log('📥 测试完成，请在前端刷新页面查看数据\n');

      console.log('💡 查询设备数据的API命令:');
      console.log('TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d \'{"username":"admin","password":"admin123"}\' | python3 -c "import sys, json; print(json.load(sys.stdin)[\'data\'][\'token\'])") && curl -s -X GET "http://localhost:3000/api/endpoints/37935127-a03b-480d-8d0d-1ffe96abd74e/devices/96344914-1a6a-4b3f-9458-1b6ea4396b21/data" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool');

      ws.close();
      process.exit(0);
    }, 3000);
  }, 3500);
});

ws.on('message', (data) => {
  console.log('📩 收到服务器消息:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('\n🔌 WebSocket 连接已关闭');
});
