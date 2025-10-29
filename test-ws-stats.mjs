#!/usr/bin/env node
import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/ws/d4ZO8QbitG';

console.log('🔌 正在连接到端点...');
console.log(`WebSocket URL: ${WS_URL}`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket 连接成功！');

  // 发送 5 条测试消息
  console.log('\n📤 开始发送测试消息...\n');

  let count = 0;
  const interval = setInterval(() => {
    count++;
    const message = `测试消息 #${count} - ${new Date().toISOString()}`;
    ws.send(message);
    console.log(`✉️  已发送消息 ${count}: ${message}`);

    if (count >= 5) {
      clearInterval(interval);
      console.log('\n✅ 所有消息发送完成！');
      console.log('💡 WebSocket 连接保持打开状态，您可以在浏览器中查看统计数据更新');
      console.log('💡 按 Ctrl+C 可以关闭连接\n');
    }
  }, 1000);
});

ws.on('message', (data) => {
  console.log(`📨 收到服务器消息: ${data}`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket 错误:', error.message);
});

ws.on('close', () => {
  console.log('🔌 WebSocket 连接已关闭');
  process.exit(0);
});

// 捕获 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 正在关闭 WebSocket 连接...');
  ws.close();
});
