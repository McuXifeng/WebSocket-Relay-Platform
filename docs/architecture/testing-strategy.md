# Testing Strategy

## Testing Pyramid

```
       E2E Tests (手动测试)
      /                    \
     Integration Tests (API)
    /                        \
Frontend Unit    Backend Unit + WebSocket
```

## Test Organization

**后端测试（必须）：**
```
packages/backend/tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   └── endpoint.service.test.ts
│   └── utils/
│       └── jwt.test.ts
├── integration/
│   ├── auth.api.test.ts
│   └── endpoint.api.test.ts
└── websocket/
    ├── connection.test.ts
    └── message-routing.test.ts
```

**前端测试（可选）：**
```
packages/frontend/src/__tests__/
├── components/
│   └── EndpointList.test.tsx
└── hooks/
    └── useAuth.test.ts
```

## Test Examples

**后端 API 测试：**

```typescript
// tests/integration/auth.api.test.ts
import request from 'supertest';
import app from '@/app';

describe('POST /api/auth/register', () => {
  it('应该成功注册新用户', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        inviteCode: 'valid-code',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.username).toBe('testuser');
  });

  it('应该拒绝无效授权码', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        inviteCode: 'invalid-code',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(400);
  });
});
```

**WebSocket 测试：**

```typescript
// tests/websocket/message-routing.test.ts
import WebSocket from 'ws';

describe('WebSocket 消息路由', () => {
  it('应该在同一端点的客户端之间广播消息', async () => {
    const client1 = new WebSocket('ws://localhost:3001/ws/test-endpoint');
    const client2 = new WebSocket('ws://localhost:3001/ws/test-endpoint');

    await new Promise((resolve) => client1.on('open', resolve));
    await new Promise((resolve) => client2.on('open', resolve));

    const messagePromise = new Promise((resolve) => {
      client2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        resolve(message);
      });
    });

    client1.send(JSON.stringify({ type: 'message', data: 'Hello' }));

    const receivedMessage = await messagePromise;
    expect(receivedMessage.data).toBe('Hello');

    client1.close();
    client2.close();
  });
});
```

## Performance Testing

### WebSocket 断开连接压力测试 (Epic 10 Story 10.5)

**测试脚本：** `packages/backend/tests/performance/websocket-disconnect-test.mjs`

**测试目标：**
- 模拟 100 个客户端同时连接到同一端点
- 50% 正常断开（`close()`），50% 异常断开（`terminate()`）
- 验证所有断开连接在 5 秒内完成统计更新
- 验证最终 `current_connections` 为 0（无连接泄漏）
- 监控内存使用和 CPU 负载

**性能指标：**
- ✅ 连接建立成功率：100/100 (100%)
- ✅ 断开连接成功率：100/100 (100%)
- ✅ 统计更新延迟：< 5 秒
- ✅ 连接泄漏检测：0 连接泄漏
- ✅ 内存稳定性：无内存泄漏
- ✅ 并发处理能力：支持 100+ 并发断开

**测试方法：**
```bash
# 确保后端服务已启动（端口 3000 和 3001）
pnpm --filter @websocket-relay/backend dev

# 在另一个终端运行压力测试
node packages/backend/tests/performance/websocket-disconnect-test.mjs
```

**预期输出示例：**
```
=== WebSocket Disconnect Pressure Test ===

[Step 1] Setting up test endpoint...
Using existing test endpoint: test-disconnect-1234567890

[Step 2] Creating 100 WebSocket connections...
[Result] 100/100 clients connected in 1234ms

[Step 3] Waiting 2 seconds for connections to stabilize...
[Stats Before Disconnect] current_connections: 100

[Step 4] Disconnecting all 100 clients...
  - 50% will use normal close()
  - 50% will use abnormal terminate()
[Result] All 100 clients disconnected in 123ms

[Step 5] Waiting 5 seconds for stats to update...
[Stats After Disconnect] current_connections: 0

=== Test Results ===

Total Duration: 8.5s

Connection Statistics:
  - Succeeded: 100
  - Failed: 0

Disconnect Statistics:
  - Normal (close): 50
  - Abnormal (terminate): 50
  - Total: 100

Database Statistics:
  - Before Disconnect: 100 connections
  - After Disconnect: 0 connections

Errors: 0

=== Test PASSED ✅ ===
```

**关键优化验证：**
1. ✅ 心跳间隔优化：15 秒（降低自 30 秒）
2. ✅ 超时检测优化：30 秒内检测异常断开
3. ✅ 断开立即刷新：统计更新延迟 < 1 秒
4. ✅ 幂等性清理：`socket.isCleanedUp` 标志防止重复清理
5. ✅ 日志增强：区分正常/异常断开，记录连接时长

---
