import WebSocket from 'ws';

const wsUrl = 'ws://localhost:3001/ws/gfV9C7fqvt';

console.log('连接 WebSocket:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket 连接成功');

  // 发送设备标识
  const identifyMsg = {
    type: 'identify',
    deviceId: 'micu',
    deviceName: 'micu设备'
  };

  console.log('发送标识消息:', identifyMsg);
  ws.send(JSON.stringify(identifyMsg));

  // 等待 2 秒后发送数据（确保设备标识完成）
  setTimeout(() => {
    const dataMsg = {
      type: 'data',
      data: {
        temperature: 48.5,
        humidity: 85.0,
        pressure: 1010.5,
        test_timestamp: new Date().toISOString()
      }
    };

    console.log('发送数据消息:', dataMsg);
    ws.send(JSON.stringify(dataMsg));

    setTimeout(() => {
      console.log('关闭连接');
      ws.close();
      process.exit(0);
    }, 2000);
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('收到消息:', msg);
  } catch (e) {
    console.log('收到原始消息:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('WebSocket 错误:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('WebSocket 已关闭');
});
