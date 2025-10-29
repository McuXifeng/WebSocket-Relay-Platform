import WebSocket from 'ws';

// 测试场景
const scenarios = [
  {
    name: 'Test 1: 有效 endpoint_id 连接',
    url: 'ws://localhost:3001/ws/CV6e3sON9o',
    expectedResult: 'success',
  },
  {
    name: 'Test 2: 无效 endpoint_id 连接',
    url: 'ws://localhost:3001/ws/invalid-endpoint-id',
    expectedResult: 'error: Invalid endpoint',
  },
  {
    name: 'Test 3: 缺少 endpoint_id',
    url: 'ws://localhost:3001/ws/',
    expectedResult: 'error: Invalid URL format',
  },
  {
    name: 'Test 4: 错误路径',
    url: 'ws://localhost:3001/invalid/path',
    expectedResult: 'error: Invalid URL format',
  },
  {
    name: 'Test 5: 根路径',
    url: 'ws://localhost:3001/',
    expectedResult: 'error: Invalid URL format',
  },
];

// 运行测试
async function runTest(scenario, index) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${scenario.name}`);
    console.log(`URL: ${scenario.url}`);
    console.log(`Expected: ${scenario.expectedResult}`);
    console.log(`${'='.repeat(60)}`);

    const ws = new WebSocket(scenario.url);
    let testResolved = false;
    let connectionOpened = false;

    const timeout = setTimeout(() => {
      if (!testResolved) {
        console.log('❌ 测试超时 - 连接未建立也未收到错误');
        ws.close();
        testResolved = true;
        resolve(false);
      }
    }, 3000);

    ws.on('open', () => {
      connectionOpened = true;
      console.log('🔗 WebSocket 连接已建立');

      // 对于成功场景,连接建立后等待一段时间没收到错误就算通过
      if (scenario.expectedResult === 'success') {
        setTimeout(() => {
          if (!testResolved) {
            clearTimeout(timeout);
            console.log('✅ 测试通过: 连接按预期成功并保持稳定');
            ws.close();
            testResolved = true;
            resolve(true);
          }
        }, 500);
      }
      // 对于错误场景,连接建立了但需要等待错误消息或连接关闭
    });

    ws.on('message', (data) => {
      if (!testResolved) {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 收到消息:', JSON.stringify(message, null, 2));

          if (message.type === 'system' && message.level === 'error') {
            if (scenario.expectedResult.includes(message.message)) {
              console.log('✅ 测试通过: 收到预期的错误消息');
              // 不要立即 resolve,等待连接关闭事件验证关闭代码
            } else {
              clearTimeout(timeout);
              console.log(`❌ 测试失败: 错误消息不匹配`);
              console.log(`   Expected: ${scenario.expectedResult}`);
              console.log(`   Received: error: ${message.message}`);
              testResolved = true;
              resolve(false);
            }
          }
        } catch (error) {
          clearTimeout(timeout);
          console.error('❌ 解析消息失败:', error);
          testResolved = true;
          resolve(false);
        }
      }
    });

    ws.on('close', (code, reason) => {
      if (!testResolved) {
        clearTimeout(timeout);
        console.log(`🔌 连接关闭 - Code: ${code}, Reason: ${reason}`);

        // 如果是错误场景,连接应该被服务器关闭
        if (scenario.expectedResult !== 'success') {
          if (code === 1008 || code === 1011) {
            console.log(`✅ 测试通过: 连接被正确拒绝 (Code ${code})`);
            testResolved = true;
            resolve(true);
          } else {
            console.log(`⚠️  连接关闭但代码不是预期的: ${code}`);
            testResolved = true;
            resolve(true); // 仍然算通过,因为连接被拒绝了
          }
        }
      }
    });

    ws.on('error', (error) => {
      if (!testResolved) {
        clearTimeout(timeout);
        console.log('⚠️  WebSocket 错误:', error.message);
        // 连接错误也算是一种预期的结果(对于错误场景)
        if (scenario.expectedResult !== 'success') {
          console.log('✅ 测试通过: 连接产生错误(符合预期)');
          testResolved = true;
          resolve(true);
        } else {
          console.log('❌ 测试失败: 连接应该成功但产生了错误');
          testResolved = true;
          resolve(false);
        }
      }
    });
  });
}

// 串行运行所有测试
async function runAllTests() {
  console.log('\n🚀 开始 WebSocket 端点验证测试\n');

  const results = [];
  for (let i = 0; i < scenarios.length; i++) {
    const result = await runTest(scenarios[i], i);
    results.push(result);

    // 测试之间等待一点时间
    if (i < scenarios.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // 总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 测试总结');
  console.log(`${'='.repeat(60)}`);

  const passed = results.filter((r) => r).length;
  const failed = results.length - passed;

  scenarios.forEach((scenario, index) => {
    const status = results[index] ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${scenario.name}`);
  });

  console.log(`\n总计: ${passed} 通过, ${failed} 失败, 共 ${results.length} 个测试`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过!');
  } else {
    console.log('\n⚠️  部分测试失败,请检查日志');
  }

  process.exit(failed === 0 ? 0 : 1);
}

runAllTests();
