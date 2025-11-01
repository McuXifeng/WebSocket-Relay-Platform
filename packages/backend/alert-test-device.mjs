import WebSocket from 'ws';

const endpointShortId = process.argv[2];
const wsUrl = `ws://localhost:3001/ws/${endpointShortId}`;

console.log('   连接 WebSocket:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('   ✅ WebSocket 连接成功');

  // 发送设备标识消息
  const identifyMsg = {
    type: 'identify',
    deviceId: 'alert-test-sensor-001',
    deviceName: '告警测试传感器'
  };

  ws.send(JSON.stringify(identifyMsg));
  console.log('   ✅ 设备已注册: alert-test-sensor-001');

  // 等待 1 秒后发送设备数据
  setTimeout(() => {
    const dataMsg = {
      type: 'data',
      data: {
        temperature: 42.5,
        humidity: 75.3,
        pressure: 1015.2
      }
    };

    ws.send(JSON.stringify(dataMsg));
    console.log('   ✅ 数据已发送: temperature=42.5°C, humidity=75.3%, pressure=1015.2hPa');

    // 等待 1 秒后关闭连接
    setTimeout(() => {
      ws.close();
      console.log('   ✅ WebSocket 连接已关闭');
    }, 1000);
  }, 1000);
});

ws.on('error', (error) => {
  console.error('   ❌ WebSocket 错误:', error.message);
  process.exit(1);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type !== 'pong') {
      console.log('   📩 收到消息:', msg);
    }
  } catch (e) {
    // 忽略解析错误
  }
});
