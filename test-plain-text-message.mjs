import WebSocket from 'ws';

const endpointId = 'd4ZO8QbitG';
const wsUrl = `ws://localhost:3001/ws/${endpointId}`;

console.log('🔗 连接到:', wsUrl);

const ws1 = new WebSocket(wsUrl);
const ws2 = new WebSocket(wsUrl);

let connectionCount = 0;

function checkReady() {
  connectionCount++;
  if (connectionCount === 2) {
    console.log('\n✅ 两个客户端都已连接\n');

    // 测试1: 发送纯文本消息
    console.log('📤 客户端1发送纯文本: "你好,这是一条纯文本消息!"');
    ws1.send('你好,这是一条纯文本消息!');

    setTimeout(() => {
      // 测试2: 发送JSON格式消息
      console.log('📤 客户端2发送JSON消息');
      ws2.send(JSON.stringify({
        type: 'message',
        data: '这是一条JSON格式的消息',
        timestamp: Date.now()
      }));
    }, 1000);

    setTimeout(() => {
      // 测试3: 发送数字(会被转成字符串)
      console.log('📤 客户端1发送数字: 12345');
      ws1.send('12345');
    }, 2000);

    setTimeout(() => {
      console.log('\n⏰ 测试完成,关闭连接...\n');
      ws1.close();
      ws2.close();
    }, 3000);
  }
}

ws1.on('open', () => {
  console.log('✅ 客户端1连接成功');
  checkReady();
});

ws2.on('open', () => {
  console.log('✅ 客户端2连接成功');
  checkReady();
});

ws1.on('message', (data) => {
  console.log('📨 客户端1收到消息:', data.toString());
});

ws2.on('message', (data) => {
  console.log('📨 客户端2收到消息:', data.toString());
});

ws1.on('close', () => {
  console.log('❌ 客户端1断开连接');
});

ws2.on('close', () => {
  console.log('❌ 客户端2断开连接');
  process.exit(0);
});

ws1.on('error', (error) => {
  console.error('⚠️ 客户端1错误:', error.message);
});

ws2.on('error', (error) => {
  console.error('⚠️ 客户端2错误:', error.message);
});
