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

---
