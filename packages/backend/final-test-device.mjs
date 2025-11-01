import WebSocket from 'ws';

const wsUrl = 'ws://localhost:3001/ws/test-ep-002';

console.log('   连接:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('   ✅ 连接成功');

  // 设备标识
  ws.send(JSON.stringify({
    type: 'identify',
    deviceId: 'alert-final-test-001',
    deviceName: '告警最终测试传感器'
  }));

  setTimeout(() => {
    // 发送高温数据
    ws.send(JSON.stringify({
      type: 'data',
      data: {
        temperature: 55.8,
        humidity: 90.5
      }
    }));
    console.log('   ✅ 数据已发送: temperature=55.8°C');

    setTimeout(() => {
      ws.close();
      console.log('   ✅ 连接已关闭');
    }, 1000);
  }, 2000);
});

ws.on('error', (e) => {
  console.error('   ❌ 错误:', e.message);
  process.exit(1);
});
