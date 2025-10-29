import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import WebSocket from 'ws';

const prisma = new PrismaClient();

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 确保测试端点存在
async function ensureTestEndpoints() {
  log(colors.blue, '\n🔧 准备测试端点...\n');

  // 查找或创建测试用户
  let testUser = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!testUser) {
    log(colors.yellow, '⚠️  未找到 admin 用户,尝试查找其他用户...');
    const anyUser = await prisma.user.findFirst();
    if (!anyUser) {
      throw new Error('数据库中没有用户,请先创建一个用户');
    }
    testUser = anyUser;
    log(colors.cyan, `✓ 使用用户: ${testUser.username}`);
  } else {
    log(colors.cyan, '✓ 找到 admin 用户');
  }

  // 创建或获取 endpoint_A
  let endpointA = await prisma.endpoint.findFirst({
    where: { name: 'Test Endpoint A', user_id: testUser.id },
  });

  if (!endpointA) {
    endpointA = await prisma.endpoint.create({
      data: {
        endpoint_id: nanoid(10),
        name: 'Test Endpoint A',
        user_id: testUser.id,
      },
    });
    log(colors.green, `✓ 创建 Endpoint A: ${endpointA.endpoint_id}`);
  } else {
    log(colors.cyan, `✓ 复用 Endpoint A: ${endpointA.endpoint_id}`);
  }

  // 创建或获取 endpoint_B
  let endpointB = await prisma.endpoint.findFirst({
    where: { name: 'Test Endpoint B', user_id: testUser.id },
  });

  if (!endpointB) {
    endpointB = await prisma.endpoint.create({
      data: {
        endpoint_id: nanoid(10),
        name: 'Test Endpoint B',
        user_id: testUser.id,
      },
    });
    log(colors.green, `✓ 创建 Endpoint B: ${endpointB.endpoint_id}`);
  } else {
    log(colors.cyan, `✓ 复用 Endpoint B: ${endpointB.endpoint_id}`);
  }

  log(colors.blue, '\n✅ 测试端点准备完成!\n');
  return { endpointA, endpointB };
}

// 等待 WebSocket 连接打开
function waitForOpen(ws) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('连接超时'));
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      resolve();
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// 测试端点隔离
async function testEndpointIsolation(endpointA, endpointB) {
  log(colors.blue, '🚀 开始端点隔离测试\n');
  log(colors.cyan, '=' .repeat(60));

  // 创建 4 个 WebSocket 客户端
  log(colors.cyan, '📡 创建 4 个 WebSocket 客户端连接...\n');

  const clientA1 = new WebSocket(`ws://localhost:3001/ws/${endpointA.endpoint_id}`);
  const clientA2 = new WebSocket(`ws://localhost:3001/ws/${endpointA.endpoint_id}`);
  const clientB1 = new WebSocket(`ws://localhost:3001/ws/${endpointB.endpoint_id}`);
  const clientB2 = new WebSocket(`ws://localhost:3001/ws/${endpointB.endpoint_id}`);

  try {
    // 等待所有连接建立
    await Promise.all([
      waitForOpen(clientA1),
      waitForOpen(clientA2),
      waitForOpen(clientB1),
      waitForOpen(clientB2),
    ]);

    log(colors.green, '✓ 所有客户端连接成功');
    log(colors.cyan, `  - Client A1 & A2 连接到: ${endpointA.endpoint_id}`);
    log(colors.cyan, `  - Client B1 & B2 连接到: ${endpointB.endpoint_id}\n`);

    // 等待一小段时间确保连接完全就绪
    await new Promise((resolve) => setTimeout(resolve, 500));

    // ========================================
    // 测试场景 1: Endpoint A 内部广播
    // ========================================
    log(colors.yellow, '🧪 测试场景 1: Endpoint A 消息隔离');
    log(colors.cyan, '-'.repeat(60));

    const testA = await new Promise((resolve) => {
      let receivedA2 = false;
      let receivedB1 = false;
      let receivedB2 = false;
      let messageA2 = null;

      // 设置消息监听器
      clientA2.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message' && msg.data === 'Hello from A') {
            receivedA2 = true;
            messageA2 = msg;
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      clientB1.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message' && msg.data === 'Hello from A') {
            receivedB1 = true;
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      clientB2.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message' && msg.data === 'Hello from A') {
            receivedB2 = true;
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      // Client A1 发送消息
      clientA1.send(JSON.stringify({ type: 'message', data: 'Hello from A' }));
      log(colors.cyan, '  → Client A1 发送消息: "Hello from A"');

      // 等待 800ms 后验证结果
      setTimeout(() => {
        resolve({ receivedA2, receivedB1, receivedB2, messageA2 });
      }, 800);
    });

    // 验证结果
    if (testA.receivedA2) {
      log(colors.green, '  ✓ Client A2 收到消息 (同端点内广播正常)');
    } else {
      log(colors.red, '  ✗ Client A2 未收到消息 (失败!)');
    }

    if (!testA.receivedB1) {
      log(colors.green, '  ✓ Client B1 未收到消息 (隔离成功)');
    } else {
      log(colors.red, '  ✗ Client B1 收到消息 (隔离失败!)');
    }

    if (!testA.receivedB2) {
      log(colors.green, '  ✓ Client B2 未收到消息 (隔离成功)');
    } else {
      log(colors.red, '  ✗ Client B2 收到消息 (隔离失败!)');
    }

    const testAPass = testA.receivedA2 && !testA.receivedB1 && !testA.receivedB2;
    log(
      testAPass ? colors.green : colors.red,
      testAPass ? '\n✅ 测试场景 1 通过!\n' : '\n❌ 测试场景 1 失败!\n'
    );

    // ========================================
    // 测试场景 2: Endpoint B 内部广播
    // ========================================
    log(colors.yellow, '🧪 测试场景 2: Endpoint B 消息隔离');
    log(colors.cyan, '-'.repeat(60));

    const testB = await new Promise((resolve) => {
      let receivedA1 = false;
      let receivedA2 = false;
      let receivedB2 = false;
      let messageB2 = null;

      // 移除旧的监听器,设置新的监听器
      clientA1.removeAllListeners('message');
      clientA2.removeAllListeners('message');
      clientB2.removeAllListeners('message');

      clientA1.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message' && msg.data === 'Hello from B') {
            receivedA1 = true;
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      clientA2.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message' && msg.data === 'Hello from B') {
            receivedA2 = true;
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      clientB2.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'message' && msg.data === 'Hello from B') {
            receivedB2 = true;
            messageB2 = msg;
          }
        } catch (e) {
          // 忽略解析错误
        }
      });

      // Client B1 发送消息
      clientB1.send(JSON.stringify({ type: 'message', data: 'Hello from B' }));
      log(colors.cyan, '  → Client B1 发送消息: "Hello from B"');

      // 等待 800ms 后验证结果
      setTimeout(() => {
        resolve({ receivedA1, receivedA2, receivedB2, messageB2 });
      }, 800);
    });

    // 验证结果
    if (testB.receivedB2) {
      log(colors.green, '  ✓ Client B2 收到消息 (同端点内广播正常)');
    } else {
      log(colors.red, '  ✗ Client B2 未收到消息 (失败!)');
    }

    if (!testB.receivedA1) {
      log(colors.green, '  ✓ Client A1 未收到消息 (隔离成功)');
    } else {
      log(colors.red, '  ✗ Client A1 收到消息 (隔离失败!)');
    }

    if (!testB.receivedA2) {
      log(colors.green, '  ✓ Client A2 未收到消息 (隔离成功)');
    } else {
      log(colors.red, '  ✗ Client A2 收到消息 (隔离失败!)');
    }

    const testBPass = testB.receivedB2 && !testB.receivedA1 && !testB.receivedA2;
    log(
      testBPass ? colors.green : colors.red,
      testBPass ? '\n✅ 测试场景 2 通过!\n' : '\n❌ 测试场景 2 失败!\n'
    );

    // ========================================
    // 总结
    // ========================================
    log(colors.cyan, '='.repeat(60));
    log(colors.blue, '📊 测试总结\n');

    const allPass = testAPass && testBPass;
    if (allPass) {
      log(colors.green, '🎉 所有端点隔离测试通过!');
      log(colors.green, '✓ 不同端点的消息完全隔离');
      log(colors.green, '✓ 同端点内的消息正常广播');
    } else {
      log(colors.red, '⚠️  部分测试失败,端点隔离机制存在问题');
    }

    log(colors.cyan, '\n' + '='.repeat(60) + '\n');

    // 关闭所有连接
    [clientA1, clientA2, clientB1, clientB2].forEach((client) => {
      client.close();
    });

    return allPass;
  } catch (error) {
    log(colors.red, `\n❌ 测试过程中发生错误: ${error.message}\n`);

    // 关闭所有连接
    [clientA1, clientA2, clientB1, clientB2].forEach((client) => {
      try {
        client.close();
      } catch (e) {
        // 忽略关闭错误
      }
    });

    return false;
  }
}

// 主函数
async function main() {
  try {
    log(colors.blue, '\n' + '='.repeat(60));
    log(colors.blue, '🧪 WebSocket 端点隔离机制测试');
    log(colors.blue, '='.repeat(60));

    // 准备测试端点
    const { endpointA, endpointB } = await ensureTestEndpoints();

    // 执行隔离测试
    const testPassed = await testEndpointIsolation(endpointA, endpointB);

    // 断开数据库连接
    await prisma.$disconnect();

    // 退出进程
    process.exit(testPassed ? 0 : 1);
  } catch (error) {
    log(colors.red, `\n❌ 测试失败: ${error.message}`);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
