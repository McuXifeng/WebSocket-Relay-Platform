import WebSocket from 'ws';

const endpointId = 'd4ZO8QbitG';
const wsUrl = `ws://localhost:3001/ws/${endpointId}`;

console.log('正在连接到:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket 连接成功!');

  // 发送测试消息
  const testMessage = { type: 'test', message: 'Hello from test script', timestamp: Date.now() };
  ws.send(JSON.stringify(testMessage));
  console.log('📤 发送测试消息:', testMessage);
});

ws.on('message', (data) => {
  console.log('📨 收到消息:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log(`❌ 连接关闭 - Code: ${code}, Reason: ${reason.toString() || '无'}`);
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('⚠️ WebSocket错误:', error.message);
  process.exit(1);
});

// 5秒后自动关闭连接
setTimeout(() => {
  console.log('⏰ 测试完成,关闭连接...');
  ws.close();
}, 5000);
