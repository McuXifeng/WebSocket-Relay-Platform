import WebSocket from 'ws';

const endpointShortId = 'gfV9C7fqvt';
const wsUrl = `ws://localhost:3001/ws/${endpointShortId}`;

console.log('   连接 WebSocket:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('   ✅ WebSocket 连接成功');

  // 发送设备标识
  const identifyMsg = {
    type: 'identify',
    deviceId: 'micu',
    deviceName: 'micu设备'
  };

  ws.send(JSON.stringify(identifyMsg));
  console.log('   ✅ 设备已标识: micu');

  // 等待 1 秒后发送数据
  setTimeout(() => {
    const dataMsg = {
      type: 'data',
      data: {
        temperature: 45.8,
        humidity: 80.5,
        pressure: 1012.3
      }
    };

    ws.send(JSON.stringify(dataMsg));
    console.log('   ✅ 数据已发送: temperature=45.8°C (高温)');

    setTimeout(() => {
      ws.close();
      console.log('   ✅ 连接已关闭');
    }, 1000);
  }, 1000);
});

ws.on('error', (error) => {
  console.error('   ❌ 错误:', error.message);
  process.exit(1);
});
