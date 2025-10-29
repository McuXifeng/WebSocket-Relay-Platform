# WebSocket Relay Platform 二次开发说明

欢迎使用 WebSocket Relay Platform API！本文档面向使用平台提供的 API (WebSocket + REST API) 开发自己应用的开发者。

---

## 平台概述

### 什么是 WebSocket Relay Platform?

WebSocket Relay Platform 是一个简单易用的 **WebSocket 消息中继服务**。它提供了:
- **消息中继**: 将客户端发送的消息广播给同一端点下的所有其他客户端
- **端点隔离**: 不同端点之间的消息完全隔离
- **实时统计**: 查看连接数、消息数等实时数据
- **设备管理**: 识别和管理连接的客户端设备

### 典型使用场景

- **聊天室应用**: 实时聊天、弹幕、群组消息
- **多人游戏**: 玩家位置同步、游戏状态更新、实时对战
- **协作工具**: 文档协同编辑、白板应用、团队看板
- **IoT 设备通信**: 传感器数据推送、设备控制指令、状态监控

---

## WebSocket API 使用说明

### WebSocket URL 格式

```
ws://域名:端口/ws/{端点ID}
```

或者 (生产环境,使用 SSL 加密):

```
wss://域名/ws/{端点ID}
```

**各部分说明:**

| 部分 | 说明 | 示例 |
|------|------|------|
| 协议 | `ws://` (非加密) 或 `wss://` (加密) | `ws://` |
| 域名 | 服务器地址 | `localhost` / `example.com` |
| 端口 | WebSocket 服务器端口 (开发环境: 3001) | `3001` |
| 路径前缀 | 固定为 `/ws/` | `/ws/` |
| 端点 ID | 您创建的端点唯一标识符 | `abc123xyz789` |

**示例:**

- 开发环境: `ws://localhost:3001/ws/abc123xyz789`
- 生产环境: `wss://example.com/ws/abc123xyz789`

### 消息中继机制

WebSocket Relay Platform 采用**广播模式**中继消息:

1. 客户端 A 连接到端点并发送消息
2. 平台将消息转发给**同一端点**下的所有其他客户端 (B, C, D...)
3. 发送者 A **不会收到**自己发送的消息 (不回显)

**图示:**

```
端点: chatroom123

客户端 A ---> [发送消息 "Hello"] ---> WebSocket Relay Platform
                                              |
                    +-------------------------+-------------------------+
                    |                         |                         |
                客户端 B                  客户端 C                  客户端 D
              (收到 "Hello")            (收到 "Hello")            (收到 "Hello")
```

**端点隔离:**

不同端点之间的消息**完全隔离**:
- 端点 `chatroom123` 的客户端无法收到端点 `gameroom456` 的消息
- 每个端点都是独立的通信通道

### 消息格式建议

平台支持任何格式的消息 (文本、JSON、二进制),但推荐使用 **JSON 格式** 便于解析:

```json
{
  "type": "message",
  "data": "Hello, World!",
  "sender": "Alice",
  "timestamp": "2025-10-28T10:30:00Z"
}
```

### 设备标识协议 (可选)

设备标识 (Device Identification) 是一个可选功能,用于在管理界面中识别和管理不同的客户端连接。

**设备标识消息格式:**

```json
{
  "type": "identify",
  "deviceId": "客户端唯一标识 (UUID)",
  "deviceName": "自定义设备名称 (可选)"
}
```

**服务器响应:**

```json
{
  "type": "identified",
  "deviceId": "客户端唯一标识",
  "customName": "服务器确认的设备名称"
}
```

**设备 ID 生成建议:**
- 浏览器: 使用 `crypto.randomUUID()` 生成 UUID,存储在 `localStorage`
- Node.js: 使用 `uuid` 库生成 UUID,存储在文件系统

---

## REST API 参考

平台提供了 REST API 用于用户认证和端点管理。

### 认证 API

#### 1. 用户注册

**请求:**

```
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123",
  "inviteCode": "abc123xyz" // 可选,如果平台开启了邀请码功能
}
```

**响应 (成功):**

```json
{
  "success": true,
  "message": "注册成功",
  "user": {
    "id": "user-uuid",
    "username": "testuser",
    "isAdmin": false
  }
}
```

**响应 (失败):**

```json
{
  "success": false,
  "message": "用户名已存在"
}
```

**状态码:**
- `201`: 注册成功
- `400`: 请求参数错误 (用户名或密码格式不正确)
- `409`: 用户名已存在
- `403`: 邀请码无效或已使用

#### 2. 用户登录

**请求:**

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

**响应 (成功):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "username": "testuser",
    "isAdmin": false
  }
}
```

**响应 (失败):**

```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

**状态码:**
- `200`: 登录成功,返回 JWT Token
- `401`: 用户名或密码错误

**JWT Token 使用:**

登录成功后,您会收到一个 JWT Token。在后续的 API 请求中,需要在请求头中携带此 Token:

```
Authorization: Bearer {token}
```

### 端点管理 API

#### 1. 创建端点

**请求:**

```
POST /api/endpoints
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "我的聊天室端点"
}
```

**响应 (成功):**

```json
{
  "success": true,
  "endpoint": {
    "id": "endpoint-uuid",
    "name": "我的聊天室端点",
    "ownerId": "user-uuid",
    "createdAt": "2025-10-28T10:30:00Z"
  }
}
```

**响应 (失败):**

```json
{
  "success": false,
  "message": "端点名称不能为空"
}
```

**状态码:**
- `201`: 创建成功
- `400`: 请求参数错误 (端点名称为空或格式不正确)
- `401`: 未认证 (Token 无效或过期)

#### 2. 查询用户的所有端点

**请求:**

```
GET /api/endpoints
Authorization: Bearer {token}
```

**响应 (成功):**

```json
{
  "success": true,
  "endpoints": [
    {
      "id": "endpoint-uuid-1",
      "name": "聊天室端点",
      "createdAt": "2025-10-28T10:30:00Z",
      "stats": {
        "currentConnections": 5,
        "totalConnections": 120,
        "totalMessages": 3500
      }
    },
    {
      "id": "endpoint-uuid-2",
      "name": "游戏服务器",
      "createdAt": "2025-10-27T08:00:00Z",
      "stats": {
        "currentConnections": 0,
        "totalConnections": 50,
        "totalMessages": 800
      }
    }
  ]
}
```

**状态码:**
- `200`: 查询成功
- `401`: 未认证 (Token 无效或过期)

#### 3. 查询单个端点详情

**请求:**

```
GET /api/endpoints/{endpointId}
Authorization: Bearer {token}
```

**响应 (成功):**

```json
{
  "success": true,
  "endpoint": {
    "id": "endpoint-uuid",
    "name": "聊天室端点",
    "ownerId": "user-uuid",
    "createdAt": "2025-10-28T10:30:00Z",
    "stats": {
      "currentConnections": 5,
      "totalConnections": 120,
      "totalMessages": 3500
    },
    "devices": [
      {
        "deviceId": "device-uuid-1",
        "customName": "浏览器客户端",
        "isOnline": true,
        "lastConnectedAt": "2025-10-28T11:00:00Z"
      }
    ]
  }
}
```

**响应 (失败):**

```json
{
  "success": false,
  "message": "端点不存在或无权访问"
}
```

**状态码:**
- `200`: 查询成功
- `401`: 未认证 (Token 无效或过期)
- `404`: 端点不存在或无权访问

#### 4. 删除端点

**请求:**

```
DELETE /api/endpoints/{endpointId}
Authorization: Bearer {token}
```

**响应 (成功):**

```json
{
  "success": true,
  "message": "端点已删除"
}
```

**响应 (失败):**

```json
{
  "success": false,
  "message": "端点不存在或无权删除"
}
```

**状态码:**
- `200`: 删除成功
- `401`: 未认证 (Token 无效或过期)
- `404`: 端点不存在或无权删除

### 错误处理

**标准错误响应格式:**

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

**常见 HTTP 状态码:**

| 状态码 | 说明 |
|--------|------|
| `200` | 请求成功 |
| `201` | 创建成功 |
| `400` | 请求参数错误 |
| `401` | 未认证或认证失败 |
| `403` | 无权限访问 |
| `404` | 资源不存在 |
| `500` | 服务器内部错误 |

---

## 客户端连接示例

### 浏览器 JavaScript

```javascript
// 1. 创建 WebSocket 连接 (使用您的端点 URL)
const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

// 2. 生成或获取持久化的设备 ID
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = crypto.randomUUID(); // 现代浏览器原生 UUID 生成
  localStorage.setItem('deviceId', deviceId);
}

// 3. 监听连接成功事件
ws.onopen = () => {
  console.log('✅ 已连接到 WebSocket 服务器');

  // 发送设备标识消息 (可选)
  ws.send(JSON.stringify({
    type: 'identify',
    deviceId: deviceId,
    deviceName: '我的浏览器客户端'
  }));

  // 发送欢迎消息
  ws.send(JSON.stringify({
    type: 'join',
    user: '用户A',
  }));
};

// 4. 监听接收消息事件
ws.onmessage = (event) => {
  console.log('📨 收到消息:', event.data);

  // 解析 JSON 消息
  try {
    const message = JSON.parse(event.data);

    if (message.type === 'identified') {
      console.log('设备已识别:', message.customName);
      return;
    }

    console.log('消息内容:', message);
  } catch (error) {
    console.log('纯文本消息:', event.data);
  }
};

// 5. 监听连接关闭事件
ws.onclose = () => {
  console.log('🔌 连接已关闭');
};

// 6. 监听连接错误事件
ws.onerror = (error) => {
  console.error('❌ 连接错误:', error);
};

// 7. 发送消息
function sendMessage(text) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'message',
      data: text,
      sender: '用户A',
      timestamp: new Date().toISOString(),
    }));
  } else {
    console.warn('WebSocket 未连接,无法发送消息');
  }
}
```

### Node.js

如果您需要在 Node.js 环境中连接 WebSocket,请使用 `ws` 库:

**安装依赖:**

```bash
npm install ws uuid
```

**连接代码:**

```javascript
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// 从文件持久化设备 ID
const DEVICE_ID_FILE = '.device_id';
let deviceId;

if (fs.existsSync(DEVICE_ID_FILE)) {
  deviceId = fs.readFileSync(DEVICE_ID_FILE, 'utf-8').trim();
} else {
  deviceId = uuidv4();
  fs.writeFileSync(DEVICE_ID_FILE, deviceId);
}

// 创建连接
const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

// 连接成功
ws.on('open', () => {
  console.log('✅ 已连接到 WebSocket 服务器');

  // 发送设备标识消息 (可选)
  ws.send(JSON.stringify({
    type: 'identify',
    deviceId: deviceId,
    deviceName: 'Node.js 后台服务'
  }));

  // 发送消息
  ws.send(JSON.stringify({
    type: 'message',
    data: 'Hello from Node.js!',
    timestamp: new Date().toISOString()
  }));
});

// 接收消息
ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'identified') {
    console.log('设备已识别:', message.customName);
    return;
  }

  console.log('📨 收到消息:', message);
});

// 连接关闭
ws.on('close', () => {
  console.log('🔌 连接已关闭');
});

// 连接错误
ws.on('error', (error) => {
  console.error('❌ 连接错误:', error);
});
```

**关键区别:**

| 特性 | 浏览器 | Node.js (ws 库) |
|------|--------|-----------------|
| WebSocket 对象 | 原生 `WebSocket` | 需要安装 `ws` 库 |
| 事件监听 | `ws.onopen = () => {}` | `ws.on('open', () => {})` |
| 消息数据 | `event.data` (字符串) | `data` (Buffer,需 `.toString()`) |

### Python (可选)

如果您使用 Python 开发,可以使用 `websockets` 库:

**安装依赖:**

```bash
pip install websockets
```

**连接代码:**

```python
import asyncio
import websockets
import json
import uuid

async def connect():
    # 生成设备 ID
    device_id = str(uuid.uuid4())

    # 连接到 WebSocket
    async with websockets.connect('ws://localhost:3001/ws/abc123xyz789') as ws:
        print('✅ 已连接到 WebSocket 服务器')

        # 发送设备标识消息
        await ws.send(json.dumps({
            'type': 'identify',
            'deviceId': device_id,
            'deviceName': 'Python 客户端'
        }))

        # 发送消息
        await ws.send(json.dumps({
            'type': 'message',
            'data': 'Hello from Python!',
            'timestamp': '2025-10-28T10:30:00Z'
        }))

        # 接收消息
        async for message in ws:
            data = json.loads(message)
            print('📨 收到消息:', data)

# 运行客户端
asyncio.run(connect())
```

---

## 消息格式和协议

### 推荐的 JSON 消息格式

```json
{
  "type": "message",
  "data": "消息内容",
  "sender": "发送者名称",
  "timestamp": "2025-10-28T10:30:00Z"
}
```

**字段说明:**
- `type`: 消息类型 (自定义,例如 `message`, `join`, `leave`, `notification`)
- `data`: 消息内容 (可以是字符串、对象、数组等)
- `sender`: 发送者标识 (可选)
- `timestamp`: 时间戳 (可选)

### 设备标识消息格式

**客户端发送:**

```json
{
  "type": "identify",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceName": "我的浏览器客户端"
}
```

**服务器响应:**

```json
{
  "type": "identified",
  "deviceId": "550e8400-e29b-41d4-a716-446655440000",
  "customName": "我的浏览器客户端"
}
```

**注意事项:**
- 设备标识消息是**可选的**,但强烈推荐使用
- `deviceId` 由客户端生成并持久化,确保重连后保持一致
- `deviceName` 是可选的,如果不提供则使用 `设备-{前4位ID}` 作为默认名称

---

## 错误处理和最佳实践

### 1. 连接失败处理

```javascript
ws.onerror = (error) => {
  console.error('❌ 连接错误:', error);
  // 记录错误日志
  // 通知用户连接失败
};
```

**可能的原因:**
- WebSocket 服务器未启动
- 端点 ID 不存在或拼写错误
- 网络连接问题
- 防火墙拦截

### 2. 自动重连机制

```javascript
let ws;
let reconnectAttempts = 0;
const maxAttempts = 5;

function connect() {
  ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

  ws.onopen = () => {
    console.log('✅ 连接成功');
    reconnectAttempts = 0; // 重置重连次数
  };

  ws.onclose = () => {
    console.log('🔌 连接关闭,尝试重连...');

    if (reconnectAttempts < maxAttempts) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      setTimeout(connect, delay);
    } else {
      console.error('❌ 达到最大重连次数,停止重连');
    }
  };

  ws.onerror = (error) => {
    console.error('❌ 连接错误:', error);
  };
}

// 初始连接
connect();
```

### 3. 消息队列 (连接未建立时暂存消息)

```javascript
const messageQueue = [];

function sendMessage(message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    // 暂存到队列
    messageQueue.push(message);
  }
}

ws.onopen = () => {
  // 连接成功后发送队列中的消息
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    ws.send(JSON.stringify(message));
  }
};
```

### 4. 心跳保活 (定期发送 ping 消息)

```javascript
let heartbeatInterval;

ws.onopen = () => {
  // 每 30 秒发送一次心跳
  heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
};

ws.onclose = () => {
  // 清除心跳定时器
  clearInterval(heartbeatInterval);
};
```

---

## 安全建议

### 1. 使用 HTTPS/WSS 加密连接

生产环境务必使用加密连接:
- 前端使用 HTTPS
- WebSocket 使用 WSS (WebSocket Secure)
- 通过 Nginx 配置 SSL 证书

**示例 (生产环境):**

```javascript
const ws = new WebSocket('wss://example.com/ws/abc123xyz789');
```

### 2. 验证消息来源和格式

```javascript
ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);

    // 验证消息结构
    if (!message.type || !message.data) {
      console.warn('无效消息格式:', message);
      return;
    }

    // 验证消息类型
    const validTypes = ['message', 'join', 'leave', 'notification'];
    if (!validTypes.includes(message.type)) {
      console.warn('未知消息类型:', message.type);
      return;
    }

    // 处理消息
    handleMessage(message);
  } catch (error) {
    console.error('消息解析失败:', error);
  }
};
```

### 3. 防止 XSS 攻击 (消息转义)

显示用户消息时进行转义:

```javascript
// 不安全 (可能导致 XSS)
element.innerHTML = message.data; // ❌

// 安全
element.textContent = message.data; // ✅

// 或者使用 DOMPurify 库进行 HTML 清理
element.innerHTML = DOMPurify.sanitize(message.data); // ✅
```

### 4. 限制消息大小和频率

在客户端实现节流:

```javascript
let lastSendTime = 0;
const sendInterval = 100; // 最小发送间隔 100ms

function sendMessage(text) {
  const now = Date.now();
  if (now - lastSendTime < sendInterval) {
    console.warn('发送过于频繁,请稍后再试');
    return;
  }

  lastSendTime = now;
  ws.send(text);
}
```

---

## 完整应用示例

### 简单聊天室 (HTML + JavaScript)

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>WebSocket 聊天室</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; }
    #messages { border: 1px solid #ccc; height: 400px; overflow-y: scroll; padding: 10px; margin-bottom: 10px; }
    #messageInput { width: 80%; padding: 10px; }
    #sendButton { width: 18%; padding: 10px; }
    .status { padding: 10px; margin-bottom: 10px; border-radius: 5px; }
    .status-connected { background: #d4edda; color: #155724; }
    .status-disconnected { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <h1>WebSocket 聊天室</h1>
  <div id="status" class="status status-disconnected">状态: 未连接</div>
  <div id="messages"></div>
  <input type="text" id="messageInput" placeholder="输入消息..." />
  <button id="sendButton">发送</button>

  <script>
    // 替换为您的端点 URL
    const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');
    const messagesEl = document.getElementById('messages');
    const statusEl = document.getElementById('status');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');

    // 连接成功
    ws.onopen = () => {
      statusEl.textContent = '状态: 已连接 ✅';
      statusEl.className = 'status status-connected';
      addSystemMessage('已连接到服务器');
    };

    // 接收消息
    ws.onmessage = (event) => {
      addMessage('其他用户', event.data, 'received');
    };

    // 连接关闭
    ws.onclose = () => {
      statusEl.textContent = '状态: 已断开 ❌';
      statusEl.className = 'status status-disconnected';
      addSystemMessage('连接已关闭');
    };

    // 连接错误
    ws.onerror = (error) => {
      addSystemMessage('连接错误');
    };

    // 发送消息
    function sendMessage() {
      const text = messageInput.value.trim();
      if (!text) return;

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(text);
        addMessage('我', text, 'sent');
        messageInput.value = '';
      } else {
        alert('WebSocket 未连接');
      }
    }

    // 添加消息到界面
    function addMessage(sender, text, type) {
      const messageEl = document.createElement('div');
      messageEl.style.marginBottom = '10px';
      messageEl.style.padding = '8px';
      messageEl.style.borderRadius = '4px';

      if (type === 'sent') {
        messageEl.style.textAlign = 'right';
        messageEl.style.background = '#e3f2fd';
      } else if (type === 'received') {
        messageEl.style.textAlign = 'left';
        messageEl.style.background = '#f5f5f5';
      }

      messageEl.textContent = `${sender}: ${text}`;
      messagesEl.appendChild(messageEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // 添加系统消息
    function addSystemMessage(text) {
      const messageEl = document.createElement('div');
      messageEl.style.textAlign = 'center';
      messageEl.style.color = '#999';
      messageEl.style.fontSize = '14px';
      messageEl.style.marginBottom = '10px';
      messageEl.textContent = `--- ${text} ---`;
      messagesEl.appendChild(messageEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    // 绑定事件
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  </script>
</body>
</html>
```

### IoT 设备通信 (Node.js)

```javascript
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// 模拟 IoT 传感器设备
class IoTSensor {
  constructor(endpointUrl, sensorName) {
    this.deviceId = uuidv4();
    this.sensorName = sensorName;
    this.ws = new WebSocket(endpointUrl);
    this.setupListeners();
  }

  setupListeners() {
    this.ws.on('open', () => {
      console.log(`[${this.sensorName}] ✅ 已连接到 WebSocket 服务器`);

      // 发送设备标识
      this.ws.send(JSON.stringify({
        type: 'identify',
        deviceId: this.deviceId,
        deviceName: this.sensorName
      }));

      // 开始定期发送传感器数据
      this.startSendingData();
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'identified') {
        console.log(`[${this.sensorName}] 设备已识别:`, message.customName);
        return;
      }

      // 接收来自其他设备的控制指令
      if (message.type === 'command') {
        console.log(`[${this.sensorName}] 📨 收到指令:`, message.data);
        this.handleCommand(message.data);
      }
    });

    this.ws.on('close', () => {
      console.log(`[${this.sensorName}] 🔌 连接已关闭`);
    });

    this.ws.on('error', (error) => {
      console.error(`[${this.sensorName}] ❌ 连接错误:`, error);
    });
  }

  startSendingData() {
    // 每 5 秒发送一次传感器数据
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        const data = {
          type: 'sensor_data',
          sensor: this.sensorName,
          temperature: (20 + Math.random() * 10).toFixed(2), // 模拟温度
          humidity: (40 + Math.random() * 20).toFixed(2), // 模拟湿度
          timestamp: new Date().toISOString()
        };

        this.ws.send(JSON.stringify(data));
        console.log(`[${this.sensorName}] 📤 发送数据:`, data);
      }
    }, 5000);
  }

  handleCommand(command) {
    console.log(`[${this.sensorName}] 执行指令:`, command);
    // 处理控制指令 (例如: 开关设备、调整参数等)
  }
}

// 创建多个传感器设备
const sensor1 = new IoTSensor('ws://localhost:3001/ws/abc123xyz789', '温度传感器-1');
const sensor2 = new IoTSensor('ws://localhost:3001/ws/abc123xyz789', '湿度传感器-2');
const sensor3 = new IoTSensor('ws://localhost:3001/ws/abc123xyz789', '压力传感器-3');
```

---

## 技术支持

如果您在开发过程中遇到问题,请:

1. 查看本文档的"错误处理和最佳实践"章节
2. 查看浏览器控制台或服务器日志的详细错误信息
3. 确认 WebSocket URL 和端点 ID 正确
4. 联系技术支持: support@example.com

---

**祝您开发愉快! 🎉**
