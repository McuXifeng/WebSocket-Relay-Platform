# WebSocket Relay Platform 使用指南

欢迎使用 WebSocket Relay Platform！这是一个简单易用的 WebSocket 消息中继平台，帮助您快速搭建实时通信应用。

---

## 快速开始

只需 3 步，5 分钟即可完成配置:

### 步骤 1: 注册并登录

1. 访问平台首页并点击"注册"
2. 填写用户名和密码完成注册
3. 使用注册的账号登录系统

### 步骤 2: 创建 WebSocket 端点

1. 登录后进入 Dashboard (控制台)
2. 点击"创建端点"按钮
3. 输入端点名称(例如: "聊天室端点"、"游戏服务器")
4. 点击"确定"完成创建

创建成功后,系统会为您生成:
- **端点 ID**: 唯一标识符,用于连接 WebSocket
- **WebSocket URL**: 完整的连接地址,可直接复制使用

**示例:**
```
端点名称: 聊天室端点
端点 ID: abc123xyz789
WebSocket URL: ws://localhost:3001/ws/abc123xyz789
```

### 步骤 3: 连接并开始使用

将生成的 WebSocket URL 复制到您的应用中,即可开始发送和接收消息！

```javascript
// 使用复制的 WebSocket URL 创建连接
const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

// 连接成功
ws.onopen = () => {
  console.log('已连接到 WebSocket 服务器');
  ws.send('Hello, World!');
};

// 接收消息
ws.onmessage = (event) => {
  console.log('收到消息:', event.data);
};
```

恭喜!您已经成功使用 WebSocket Relay Platform 了 🎉

---

## 平台功能介绍

### 1. 端点管理

**什么是端点?**

端点 (Endpoint) 是消息中继的通道。同一个端点下的所有客户端可以互相通信，不同端点之间完全隔离。

**典型使用场景:**
- **聊天室**: 每个聊天室创建一个端点,房间内成员互相通信
- **多人游戏**: 每个游戏房间对应一个端点,实现玩家间实时交互
- **协作工具**: 团队协作项目创建端点,成员实时同步数据
- **IoT 设备**: 每个设备组创建端点,设备间消息推送

**端点信息:**
- **端点名称**: 便于识别的自定义名称
- **端点 ID**: 系统生成的唯一标识符
- **WebSocket URL**: 完整的连接地址,包含端点 ID
- **创建时间**: 端点创建的时间戳
- **最后活跃时间**: 最近一次有客户端连接的时间

**端点操作:**
- **查看详情**: 点击端点卡片进入详情页
- **复制 URL**: 一键复制 WebSocket 连接地址
- **删除端点**: 永久删除端点及其所有数据(谨慎操作)

### 2. 实时统计

在端点详情页,您可以查看以下实时统计数据:

- **当前连接数**: 实时显示有多少客户端连接到此端点
- **历史总连接数**: 自创建以来的累计连接次数
- **总消息数**: 通过此端点中继的消息总数

统计数据每 5 秒自动刷新,帮助您监控端点使用情况。

---

## WebSocket URL 格式说明

### URL 组成

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

### 如何获取 WebSocket URL?

1. 进入 Dashboard (控制台)
2. 点击端点卡片进入详情页
3. 在"端点详情"卡片中找到"WebSocket URL"字段
4. 点击"复制"按钮,一键复制完整 URL

---

## 消息中继机制

### 工作原理

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

### 端点隔离

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

**发送 JSON 消息:**

```javascript
const message = {
  type: 'message',
  data: 'Hello!',
  sender: 'Alice',
  timestamp: new Date().toISOString(),
};

ws.send(JSON.stringify(message));
```

**接收 JSON 消息:**

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('类型:', message.type);
  console.log('内容:', message.data);
  console.log('发送者:', message.sender);
};
```

---

## 设备标识和自定义名称

### 什么是设备标识?

设备标识 (Device Identification) 是一个可选功能,用于在管理界面中识别和管理不同的客户端连接。通过发送设备标识消息,您可以:

- 为每个连接的设备设置自定义名称
- 在端点详情页查看所有连接的设备列表
- 查看设备的在线状态和最后连接时间
- 断开重连后保持设备名称不变

### 设备标识协议

在 WebSocket 连接建立后,您可以立即发送设备标识消息:

```javascript
{
  "type": "identify",
  "deviceId": "客户端唯一标识 (UUID)",
  "deviceName": "自定义设备名称 (可选)"
}
```

服务器会响应确认消息:

```javascript
{
  "type": "identified",
  "deviceId": "客户端唯一标识",
  "customName": "服务器确认的设备名称"
}
```

### 浏览器客户端示例

```javascript
// 生成或获取持久化的设备 ID
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
  deviceId = crypto.randomUUID(); // 现代浏览器原生 UUID 生成
  localStorage.setItem('deviceId', deviceId);
}

const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

ws.onopen = () => {
  console.log('✅ 已连接到 WebSocket 服务器');

  // 发送设备标识消息
  ws.send(JSON.stringify({
    type: 'identify',
    deviceId: deviceId,
    deviceName: '我的浏览器客户端' // 可选,自定义设备名称
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'identified') {
    console.log('设备已识别:', message.customName);
    return;
  }

  // 处理普通消息...
  console.log('收到消息:', message);
};
```

### Node.js 客户端示例

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

const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

ws.on('open', () => {
  console.log('✅ 已连接到 WebSocket 服务器');

  // 发送设备标识消息
  ws.send(JSON.stringify({
    type: 'identify',
    deviceId: deviceId,
    deviceName: 'Node.js 后台服务'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === 'identified') {
    console.log('设备已识别:', message.customName);
    return;
  }

  // 处理普通消息...
  console.log('收到消息:', message);
});
```

### 设备 ID 生成和持久化

**浏览器端:**
- 使用 `localStorage` 持久化设备 ID
- 使用 `crypto.randomUUID()` 生成 UUID (现代浏览器原生支持)
- 同域名下所有标签页共享同一个设备 ID

**Node.js 端:**
- 使用文件系统持久化设备 ID
- 使用 `uuid` 库生成 UUID
- 需要安装依赖: `npm install uuid`

**注意事项:**
- 设备标识消息是**可选的**,但强烈推荐使用
- deviceId 由客户端生成并持久化,确保重连后保持一致
- deviceName 是可选的,如果不提供则使用 `设备-{前4位ID}` 作为默认名称
- 如果用户清除浏览器数据,设备 ID 会重新生成
- 未发送 identify 的连接视为匿名设备

### 管理界面查看设备

在端点详情页的"连接设备"卡片中,您可以:

- 查看所有连接过的设备列表
- 查看设备的在线状态 (绿色徽章表示在线,灰色徽章表示离线)
- 查看设备的最后连接时间
- 编辑设备的自定义名称

**在线状态判断规则:**
- 设备在 30 秒内有连接活动视为在线
- 超过 30 秒无活动视为离线
- 设备列表每 10 秒自动刷新

---

## 客户端连接示例

### 浏览器 JavaScript

```javascript
// 1. 创建 WebSocket 连接 (使用您的端点 URL)
const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

// 2. 监听连接成功事件
ws.onopen = () => {
  console.log('✅ 已连接到 WebSocket 服务器');

  // 连接成功后发送欢迎消息
  ws.send(JSON.stringify({
    type: 'join',
    user: '用户A',
  }));
};

// 3. 监听接收消息事件
ws.onmessage = (event) => {
  console.log('📨 收到消息:', event.data);

  // 解析 JSON 消息
  try {
    const message = JSON.parse(event.data);
    console.log('消息内容:', message);
  } catch (error) {
    console.log('纯文本消息:', event.data);
  }
};

// 4. 监听连接关闭事件
ws.onclose = () => {
  console.log('🔌 连接已关闭');
};

// 5. 监听连接错误事件
ws.onerror = (error) => {
  console.error('❌ 连接错误:', error);
};

// 6. 发送消息
function sendMessage(text) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'message',
      data: text,
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
npm install ws
```

**连接代码:**

```javascript
const WebSocket = require('ws');

// 创建连接
const ws = new WebSocket('ws://localhost:3001/ws/abc123xyz789');

// 连接成功
ws.on('open', () => {
  console.log('✅ 已连接到 WebSocket 服务器');
  ws.send('Hello from Node.js!');
});

// 接收消息
ws.on('message', (data) => {
  console.log('📨 收到消息:', data.toString());
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

---

## 错误排查

### 常见问题

#### 1. 连接失败: "WebSocket connection failed"

**可能原因:**
- WebSocket 服务器未启动
- 端点 ID 不存在或拼写错误
- 网络连接问题
- 防火墙拦截

**解决方案:**
- 检查端点 ID 是否正确
- 确认 WebSocket 服务器正在运行
- 检查网络连接和防火墙设置
- 查看浏览器控制台的详细错误信息

#### 2. 消息发送失败: "Failed to send message"

**可能原因:**
- WebSocket 连接尚未建立 (状态不是 `OPEN`)
- 连接已关闭
- 消息格式错误

**解决方案:**

```javascript
// 发送前检查连接状态
if (ws.readyState === WebSocket.OPEN) {
  ws.send('消息内容');
} else {
  console.warn('WebSocket 未连接,当前状态:', ws.readyState);
}
```

#### 3. 收不到消息

**可能原因:**
- 发送者和接收者不在同一个端点
- 发送者收不到自己的消息 (这是正常行为,不回显)
- 消息事件监听器未正确设置

**解决方案:**
- 确认所有客户端使用相同的端点 ID
- 如需在发送方显示消息,请在客户端本地处理
- 检查 `onmessage` 事件监听器是否正确绑定

#### 4. 连接意外断开

**可能原因:**
- 网络不稳定
- 服务器重启或维护
- 长时间无活动被超时断开

**解决方案:**

实现自动重连机制:

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

---

## 安全建议

### 1. 使用 HTTPS/WSS

生产环境务必使用加密连接:
- 前端使用 HTTPS
- WebSocket 使用 WSS (WebSocket Secure)
- 通过 Nginx 配置 SSL 证书

### 2. 验证消息来源

在接收消息时进行验证:

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

### 3. 防止 XSS 攻击

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

## 最佳实践

### 1. 连接状态管理

```javascript
const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

let currentState = ConnectionState.DISCONNECTED;

ws.onopen = () => {
  currentState = ConnectionState.CONNECTED;
  updateUI(currentState);
};

ws.onclose = () => {
  currentState = ConnectionState.DISCONNECTED;
  updateUI(currentState);
};

function updateUI(state) {
  const statusElement = document.getElementById('status');
  statusElement.textContent = state;
  statusElement.className = `status-${state}`;
}
```

### 2. 消息队列

连接未建立时暂存消息:

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

### 3. 心跳保活

定期发送心跳消息保持连接:

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

## 完整示例: 简单聊天室

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

将上述代码保存为 `chat.html`,双击打开即可使用。多个窗口打开可以体验实时通信效果！

---

## 技术支持

如果您在使用过程中遇到问题,请:

1. 查看本文档的"错误排查"章节
2. 查看浏览器控制台的错误日志
3. 检查端点状态和统计数据
4. 联系技术支持: support@example.com

---

**祝您使用愉快! 🎉**
