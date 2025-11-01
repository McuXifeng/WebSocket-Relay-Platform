# WebSocket 中继平台 - 下位机与后端通信协议完整规范

**版本**: 1.4.0
**更新日期**: 2025-01-15
**维护者**: 米醋电子工作室 (Michu Electronics Studio)
**GitHub**: McuXifeng
**邮箱**: 3531313387@qq.com

---

## 一、协议概览

WebSocket 中继平台是一个双向通信系统，用于 IoT 设备与服务器的实时数据交互。

### 核心参数

| 参数 | 值 | 说明 |
|------|-----|------|
| WebSocket 服务器端口 | 3001 | WebSocket 服务监听端口 |
| 连接 URL 格式 | `ws://localhost:3001/ws/{endpoint_id}` | 端点标识符作为路径参数 |
| 消息格式 | JSON/DIRECT/CUSTOM_HEADER | 支持多种消息格式 |
| 心跳间隔 | 30 秒 | 服务器主动发送 ping |
| 命令超时 | 5 秒 | 控制命令响应超时时间 |

---

## 二、连接协议

### 2.1 连接建立

**URL 格式及验证：**

```
ws://localhost:3001/ws/CV6e3sON9o
                    └──────────┘
                    endpoint_id
```

**连接流程：**

1. 客户端发起 WebSocket 连接
2. 服务器解析 URL，提取 `endpoint_id`（正则表达式：`/^\/ws\/([a-zA-Z0-9-]+)$/`）
3. 查询数据库验证 `endpoint_id` 是否存在
4. **有效**：建立连接，存储 `endpointId` 和 `endpoint` 数据到 socket 对象
5. **无效**：发送错误消息，关闭连接（WebSocket 代码 1008）

**错误响应示例：**

```json
{
  "type": "system",
  "level": "error",
  "message": "Invalid endpoint",
  "timestamp": 1635316800000
}
```

### 2.2 连接对象属性

服务器为每个连接维护的扩展属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `endpointId` | string | 端点标识符 (UUID) |
| `endpoint` | Endpoint | 端点数据库对象 |
| `deviceId` | string | 设备标识符（如 "micu"） |
| `dbDeviceId` | string | 设备数据库 UUID |
| `customName` | string | 设备自定义名称 |
| `isAlive` | boolean | 心跳检测标志 |
| `isCleanedUp` | boolean | 连接清理标记 |

---

## 三、设备注册协议

### 3.1 设备标识消息（identify）

设备连接后**首先**发送标识消息：

```json
{
  "type": "identify",
  "deviceId": "micu",
  "deviceName": "我的 MICU 设备"
}
```

**字段说明：**

| 字段 | 类型 | 必需 | 限制 | 说明 |
|------|------|------|------|------|
| type | string | ✅ | 固定值 "identify" | 消息类型 |
| deviceId | string | ✅ | 最大 64 字符 | 设备唯一标识符 |
| deviceName | string | ❌ | 最大 100 字符 | 设备自定义名称 |

### 3.2 服务器确认响应（identified）

服务器收到 identify 后返回确认：

```json
{
  "type": "identified",
  "deviceId": "micu",
  "customName": "我的 MICU 设备"
}
```

### 3.3 数据库操作

执行 `upsert` 操作：

- **如果设备已存在**：更新 `last_connected_at` 时间戳
- **如果设备不存在**：创建新记录
  - `custom_name` 默认为 `"设备-{deviceId前4位}"`
  - 例如：deviceId = "micu1234" → customName = "设备-micu"

**Upsert 条件：**

```typescript
where: {
  endpoint_id_device_id: {
    endpoint_id: endpoint.id,    // 端点 UUID
    device_id: deviceId          // 设备标识符，如 "micu"
  }
}
```

---

## 四、数据上报协议

### 4.1 支持三种消息格式

服务器会自动识别和处理以下三种格式：

#### 格式 1：标准数据消息（推荐）

```json
{
  "type": "data",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "voltage": 12.3,
    "status": "online"
  },
  "timestamp": 1635316800000
}
```

#### 格式 2：简化格式

```json
{
  "data": {
    "temperature": 25.5,
    "humidity": 60
  },
  "timestamp": 1635316800000
}
```

#### 格式 3：直接数据对象

```json
{
  "temperature": 25.5,
  "humidity": 60,
  "voltage": 12.3
}
```

### 4.2 数据类型和单位识别

#### 自动推断单位映射

| 字段名称 | 自动单位 |
|----------|---------|
| temperature, temp | °C |
| humidity | % |
| voltage, volt | V |
| current | A |
| pressure | Pa |

#### 支持的数据类型

| 数据类型 | 说明 | 存储方式 |
|---------|------|---------|
| number | 数值型 | 字符串化存储 |
| string | 字符串型 | 直接存储 |
| boolean | 布尔型 | "true" / "false" |
| object | 复杂对象 | JSON.stringify() |

### 4.3 DeviceData 表存储

每个数据字段都会作为一条记录存储：

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | UUID | 主键 | "a1b2c3..." |
| device_id | UUID | 设备数据库 UUID | "d4e5f6..." |
| data_key | string | 字段名 | "temperature" |
| data_value | string | 值（字符串形式） | "25.5" |
| data_type | string | 类型 | "number" |
| unit | string | 单位 | "°C" |
| timestamp | datetime | 数据时间戳 | 2025-01-15 10:30:00 |

**索引：**

```sql
@@index([device_id, data_key, timestamp])
```

### 4.4 数据处理流程

```
1. 接收原始消息
   ↓
2. 解析格式（格式1/2/3）
   ↓
3. 提取 data 字段
   ↓
4. 遍历每个键值对
   ↓
5. 推断数据类型 (typeof value)
   ↓
6. 识别单位（根据字段名）
   ↓
7. 批量插入 DeviceData 表
   ↓
8. 根据端点转发模式转发给其他客户端
```

**注意事项：**

- 数据存储失败**不会中断**消息转发
- 错误会被记录到日志
- 异步批量插入，提高性能

---

## 五、控制命令协议

### 5.1 控制消息格式

后端通过 HTTP API 接收控制请求，经 WebSocket 转发到设备：

```json
{
  "type": "control",
  "commandId": "abc12345",
  "deviceId": "micu",
  "command": "setLight",
  "params": {
    "state": "on",
    "brightness": 100
  },
  "timestamp": 1635316800000
}
```

**字段说明：**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| type | string | ✅ | 固定值 "control" |
| commandId | string | ✅ | 指令 ID（8 位 nanoid，全局唯一） |
| deviceId | string | ✅ | 目标设备标识符 |
| command | string | ✅ | 指令类型（应用层自定义） |
| params | object | ✅ | 指令参数 |
| timestamp | number | ❌ | 服务器时间戳（自动添加） |

### 5.2 常见指令示例

#### 开关灯

```json
{
  "type": "control",
  "commandId": "cmd_001",
  "deviceId": "light_01",
  "command": "setLight",
  "params": {
    "state": "on"
  }
}
```

#### 调节温度

```json
{
  "type": "control",
  "commandId": "cmd_002",
  "deviceId": "thermostat_01",
  "command": "setTemperature",
  "params": {
    "temperature": 26,
    "mode": "cool"
  }
}
```

#### 调节亮度

```json
{
  "type": "control",
  "commandId": "cmd_003",
  "deviceId": "light_01",
  "command": "setBrightness",
  "params": {
    "brightness": 75
  }
}
```

### 5.3 HTTP API 端点

**发送控制命令：**

```http
POST /api/endpoints/{endpointId}/devices/{deviceId}/control
Content-Type: application/json
Authorization: Bearer {token}

请求体：
{
  "command": "setLight",
  "params": { "state": "on" }
}

响应：
{
  "commandId": "abc12345",
  "status": "pending",
  "sentAt": "2025-01-15T10:30:00Z"
}
```

**查询命令状态：**

```http
GET /api/endpoints/{endpointId}/devices/{deviceId}/control/{commandId}
Authorization: Bearer {token}

响应：
{
  "commandId": "abc12345",
  "status": "success",
  "sentAt": "2025-01-15T10:30:00Z",
  "ackAt": "2025-01-15T10:30:02Z"
}
```

### 5.4 发送流程

```
前端/客户端
   ↓
HTTP POST /api/endpoints/:id/devices/:id/control
   ↓
创建 ControlCommand 记录 (status: pending)
   ↓
生成 WebSocket 控制消息
   ↓
查找目标设备的 WebSocket 连接
   ↓
点对点发送到设备 (if 设备在线)
   ↓
启动 5 秒超时定时器
   ↓
返回 commandId 给客户端
   ↓
客户端轮询：GET /api/endpoints/:id/devices/:id/control/:commandId
   ↓
获取当前状态（pending → success/failed/timeout）
```

### 5.5 ControlCommand 表结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| endpoint_id | UUID | 端点 UUID |
| device_id | UUID | 设备 UUID |
| command_id | string | 指令 ID（nanoid 8 位，唯一索引） |
| command_type | string | 指令类型（如 "setLight"） |
| command_params | text | 参数 JSON |
| status | string | pending/success/failed/timeout |
| sent_at | datetime | 发送时间 |
| ack_at | datetime | 应答时间（可为空） |
| timeout_at | datetime | 超时时间（可为空） |
| error_message | text | 错误信息（可为空） |

**索引：**

```sql
@@index([device_id, sent_at])
@@index([command_id])
@@index([status])
```

---

## 六、响应协议

### 6.1 控制应答消息（control_ack）

设备执行命令后**必须**发送应答：

```json
{
  "type": "control_ack",
  "commandId": "abc12345",
  "status": "success",
  "message": "Light turned on successfully"
}
```

**字段说明：**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| type | string | ✅ | 固定值 "control_ack" |
| commandId | string | ✅ | 对应的指令 ID（必须完全相同） |
| status | string | ✅ | success / failed |
| message | string | ❌ | 响应消息或错误说明 |

### 6.2 应答示例

#### 成功应答

```json
{
  "type": "control_ack",
  "commandId": "cmd_001",
  "status": "success",
  "message": "Light turned on"
}
```

#### 失败应答

```json
{
  "type": "control_ack",
  "commandId": "cmd_002",
  "status": "failed",
  "message": "Device hardware error: relay not responding"
}
```

### 6.3 应答处理流程

```
设备发送 control_ack
   ↓
服务器接收并解析消息
   ↓
查询 ControlCommand 记录（通过 commandId）
   ↓
更新记录：
  - status: success / failed
  - ack_at: 当前时间
  - error_message: message 字段（如果失败）
   ↓
清除超时定时器
   ↓
(后端不主动推送，客户端通过轮询获知)
```

### 6.4 超时规则

| 参数 | 值 | 说明 |
|------|-----|------|
| 超时时间 | 5 秒 | 从发送时刻开始计时 |
| 触发条件 | 5 秒内未收到 ACK | 自动触发 |
| 处理方式 | 标记为 "timeout" | 更新 status 字段 |
| 错误消息 | "Command timeout" | 记录到 error_message |

**注意事项：**

- 超时后收到的 ACK **仍会被处理**，但不会改变 timeout 状态
- 客户端应该通过轮询发现超时状态，并考虑重试

---

## 七、心跳/保活机制

### 7.1 Ping/Pong 参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 心跳间隔 | 30 秒 | 服务器每 30 秒发送 ping |
| 响应超时 | 30 秒 | 未收到 pong 则认为连接已死 |
| 心跳标志 | isAlive | 布尔值，初始为 true |
| 检测方式 | WebSocket Ping/Pong | 标准协议 |

### 7.2 心跳流程

```
时间点        服务器操作              客户端操作
────────────────────────────────────────────────
0秒          发送 ping              接收 ping
             isAlive = false        自动发送 pong

0.1秒        接收 pong
             isAlive = true

30秒         发送 ping              接收 ping
             isAlive = false        自动发送 pong

30.1秒       接收 pong
             isAlive = true

60秒         发送 ping              [设备离线，未响应]
             isAlive = false

90秒         检测到 isAlive = false
             执行清理
             socket.terminate()
```

### 7.3 实现代码

#### 服务器端（Node.js）

```typescript
// 启动心跳定时器
socket.pingInterval = setInterval(() => {
  if (socket.isAlive === false) {
    // 连接已死，清理并关闭
    cleanupConnection('heartbeat-timeout');
    socket.terminate();
    return;
  }

  // 标记为未响应，等待 pong
  socket.isAlive = false;
  socket.ping();
}, 30000); // 30 秒

// Pong 事件
socket.on('pong', () => {
  socket.isAlive = true;
});

// 关闭时清理
socket.on('close', () => {
  clearInterval(socket.pingInterval);
});
```

#### 客户端

- **JavaScript 浏览器**：自动处理 ping/pong（无需编码）
- **Node.js ws 库**：自动处理 ping/pong
- **其他客户端**：需要手动实现 ping/pong 响应

**Python 示例（websocket-client）：**

```python
import websocket

def on_ping(ws, message):
    ws.pong(message)

ws = websocket.WebSocketApp(
    "ws://localhost:3001/ws/CV6e3sON9o",
    on_ping=on_ping
)
```

---

## 八、错误处理协议

### 8.1 系统错误消息

```json
{
  "type": "system",
  "level": "error" | "warning" | "info",
  "message": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": 1635316800000
}
```

### 8.2 错误代码汇总

#### 连接错误

| 错误代码 | WebSocket Code | 说明 |
|---------|----------------|------|
| INVALID_URL_FORMAT | 1008 | URL 格式错误，无法解析 endpoint_id |
| INVALID_ENDPOINT | 1008 | 端点不存在或已禁用 |
| INTERNAL_SERVER_ERROR | 1011 | 服务器内部错误 |

#### 设备错误

| 错误代码 | HTTP Code | 说明 |
|---------|-----------|------|
| DEVICE_OFFLINE | 503 | 设备离线，无法发送指令 |
| DEVICE_NOT_FOUND | 404 | 设备不存在 |

#### 指令错误

| 错误代码 | HTTP Code | 说明 |
|---------|-----------|------|
| INVALID_COMMAND | 400 | 指令格式错误或缺少必需字段 |
| COMMAND_TIMEOUT | 504 | 指令超时（5 秒内未响应） |
| COMMAND_FAILED | 500 | 设备报告执行失败 |

#### 数据错误

| 错误代码 | HTTP Code | 说明 |
|---------|-----------|------|
| INVALID_DATA_FORMAT | 400 | 数据格式错误，无法解析 |
| DATA_STORAGE_FAILED | 500 | 数据存储失败（不影响转发） |

### 8.3 错误处理最佳实践

#### 设备端

1. ✅ 验证每条消息的 `type` 字段
2. ✅ 使用 try-catch 处理 JSON 解析错误
3. ✅ 监听 `error` 和 `close` 事件
4. ✅ 实现自动重连逻辑（指数退避）
5. ✅ 记录详细的错误日志

**重连逻辑示例：**

```javascript
let reconnectDelay = 1000; // 初始 1 秒
const maxDelay = 60000;    // 最大 60 秒

function connect() {
  const ws = new WebSocket('ws://localhost:3001/ws/CV6e3sON9o');

  ws.onclose = () => {
    console.log(`Reconnecting in ${reconnectDelay}ms...`);
    setTimeout(connect, reconnectDelay);

    // 指数退避
    reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
  };

  ws.onopen = () => {
    reconnectDelay = 1000; // 重置延迟
  };
}
```

#### 服务器端

1. ✅ 数据存储失败不中断消息转发
2. ✅ 记录详细的错误日志（包括 stack trace）
3. ✅ 更新指令状态为 failed
4. ✅ 记录 error_message 字段
5. ✅ 监控异常率和性能指标

---

## 九、消息转发模式

### 9.1 三种转发模式

端点可以配置不同的转发模式：

#### DIRECT 模式

- **原始转发**，不做任何处理
- 支持：纯文本、二进制、JSON（原始形式）
- 用途：自定义协议、二进制数据、透传

**示例：**

```
设备 A 发送: "TEMP:25.5,HUMI:60"
  ↓
服务器转发给设备 B: "TEMP:25.5,HUMI:60" (原样转发)
```

#### JSON 模式（推荐）

- 标准化 JSON 转发
- 消息格式：`{ "type": "message", "data": {...}, "timestamp": ... }`
- 用途：标准 JSON 消息

**示例：**

```json
设备 A 发送: {"temperature": 25.5}
  ↓
服务器转发给设备 B:
{
  "type": "message",
  "data": {"temperature": 25.5},
  "timestamp": 1635316800000
}
```

#### CUSTOM_HEADER 模式

- 消息前添加自定义帧头
- 格式：`{custom_header}{message_content}`
- 用途：需要自定义协议头的场景

**示例：**

```
设备 A 发送: {"temperature": 25.5}
自定义帧头: "MICU|V1|"
  ↓
服务器转发给设备 B:
MICU|V1|{"temperature": 25.5}
```

### 9.2 端点属性

| 字段 | 类型 | 说明 | 默认值 |
|------|------|------|-------|
| forwarding_mode | enum | DIRECT \| JSON \| CUSTOM_HEADER | JSON |
| custom_header | string | 自定义帧头（仅 CUSTOM_HEADER 模式使用） | null |

---

## 十、数据库核心表

### 10.1 Device 表

设备注册信息表：

```typescript
model Device {
  id                String   @id @default(uuid())      // UUID 主键
  endpoint_id       String                              // 关联端点 UUID
  device_id         String   @db.VarChar(64)           // 设备标识符，如 "micu"
  custom_name       String   @db.VarChar(100)          // 自定义名称
  last_connected_at DateTime @default(now())           // 最后连接时间
  created_at        DateTime @default(now())           // 创建时间

  @@unique([endpoint_id, device_id])                   // 同一端点内 device_id 唯一
  @@index([endpoint_id])
  @@index([device_id])
}
```

**关键说明：**

- `device_id`：由设备自定义的标识符，最大 64 字符
- 使用 `(endpoint_id, device_id)` 组合为唯一键
- 一个端点下可以有多个设备

### 10.2 DeviceData 表

设备数据存储表：

```typescript
model DeviceData {
  id         String   @id @default(uuid())             // 主键
  device_id  String                                     // 设备 UUID
  data_key   String   @db.VarChar(100)                 // 字段名，如 "temperature"
  data_value String   @db.Text                         // 值（字符串形式）
  data_type  String   @db.VarChar(20)                  // number/string/boolean/json
  unit       String?  @db.VarChar(20)                  // 单位：°C、%、V 等
  timestamp  DateTime @default(now())                  // 数据时间戳

  @@index([device_id, data_key, timestamp])
  @@index([device_id, timestamp])
}
```

**存储策略：**

- 每个数据字段作为一条记录
- 值统一转换为字符串存储
- 保留原始数据类型信息

### 10.3 ControlCommand 表

控制命令表：

```typescript
model ControlCommand {
  id             String    @id @default(uuid())
  endpoint_id    String                                 // 端点 UUID
  device_id      String                                 // 设备 UUID
  command_id     String    @unique @db.VarChar(50)     // 指令 ID (nanoid 8位)
  command_type   String    @db.VarChar(100)            // 指令类型
  command_params String    @db.Text                    // 参数 JSON
  status         String    @db.VarChar(20)             // pending/success/failed/timeout
  sent_at        DateTime  @default(now())             // 发送时间
  ack_at         DateTime?                             // 应答时间
  timeout_at     DateTime?                             // 超时时间
  error_message  String?   @db.Text                    // 错误信息

  @@index([device_id, sent_at])
  @@index([command_id])
  @@index([status])
  @@index([endpoint_id])
}
```

**状态流转：**

```
pending → success (收到成功 ACK)
pending → failed  (收到失败 ACK)
pending → timeout (5 秒超时)
```

### 10.4 Message 表

历史消息表：

```typescript
model Message {
  id          String   @id @default(uuid())
  endpoint_id String                                   // 端点 UUID
  content     String   @db.Text                        // 消息内容（最大 5000 字符）
  sender_info String?  @db.VarChar(255)               // 设备名称或连接 ID
  created_at  DateTime @default(now())                // 创建时间

  @@index([endpoint_id, created_at])
}
```

**自动清理策略：**

- 每个端点保留最新 50 条消息
- 超出部分自动删除（按 created_at 排序）

---

## 十一、完整通信流程示例

### 11.1 设备初次连接完整流程

```
1. 设备发起连接
   ws://localhost:3001/ws/CV6e3sON9o

2. 服务器验证端点
   - 查询数据库
   - 端点存在 → 建立连接

3. 设备发送 identify
   {
     "type": "identify",
     "deviceId": "micu_001",
     "deviceName": "温湿度传感器-01"
   }

4. 服务器处理
   - 查询或创建 Device 记录
   - 更新连接属性
   - 返回 identified

5. 服务器响应
   {
     "type": "identified",
     "deviceId": "micu_001",
     "customName": "温湿度传感器-01"
   }

6. 设备开始上报数据
   {
     "type": "data",
     "data": {
       "temperature": 25.5,
       "humidity": 60
     }
   }

7. 服务器存储并转发
   - 存储到 DeviceData 表
   - 根据转发模式转发给其他客户端
```

### 11.2 控制命令完整流程

```
1. 前端发送 HTTP 请求
   POST /api/endpoints/xxx/devices/yyy/control
   Body: {
     "command": "setLight",
     "params": {"state": "on"}
   }

2. 后端创建命令记录
   - 生成 commandId: "abc12345"
   - 状态: pending
   - 启动 5 秒超时定时器

3. 后端返回响应
   {
     "commandId": "abc12345",
     "status": "pending"
   }

4. 后端通过 WebSocket 发送到设备
   {
     "type": "control",
     "commandId": "abc12345",
     "deviceId": "micu_001",
     "command": "setLight",
     "params": {"state": "on"}
   }

5. 设备执行命令
   - 解析 command 和 params
   - 执行硬件操作

6. 设备发送 ACK
   {
     "type": "control_ack",
     "commandId": "abc12345",
     "status": "success",
     "message": "Light turned on"
   }

7. 后端更新命令状态
   - status: success
   - ack_at: 当前时间
   - 清除超时定时器

8. 前端轮询获取状态
   GET /api/endpoints/xxx/devices/yyy/control/abc12345
   Response: {
     "status": "success",
     "ackAt": "2025-01-15T10:30:02Z"
   }
```

---

## 十二、设备端实现指南

### 12.1 最小实现（JavaScript/Node.js）

```javascript
const WebSocket = require('ws');

// 1. 建立连接
const ws = new WebSocket('ws://localhost:3001/ws/CV6e3sON9o');

ws.on('open', () => {
  console.log('Connected');

  // 2. 发送 identify
  ws.send(JSON.stringify({
    type: 'identify',
    deviceId: 'micu_001',
    deviceName: '温湿度传感器-01'
  }));

  // 3. 定时上报数据
  setInterval(() => {
    ws.send(JSON.stringify({
      type: 'data',
      data: {
        temperature: 20 + Math.random() * 10,
        humidity: 50 + Math.random() * 20
      }
    }));
  }, 5000); // 每 5 秒上报
});

// 4. 处理控制命令
ws.on('message', (data) => {
  const msg = JSON.parse(data);

  if (msg.type === 'control') {
    console.log('Received command:', msg);

    // 执行命令（示例：简单打印）
    console.log(`Executing ${msg.command} with params:`, msg.params);

    // 发送 ACK
    ws.send(JSON.stringify({
      type: 'control_ack',
      commandId: msg.commandId,
      status: 'success',
      message: 'Command executed'
    }));
  }

  if (msg.type === 'identified') {
    console.log('Device identified:', msg.customName);
  }
});

// 5. 错误处理和重连
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Disconnected, reconnecting in 5s...');
  setTimeout(() => {
    // 重新运行连接逻辑
  }, 5000);
});
```

### 12.2 Python 实现示例

```python
import websocket
import json
import time
import random
import threading

endpoint_url = "ws://localhost:3001/ws/CV6e3sON9o"
device_id = "micu_001"
device_name = "温湿度传感器-01"

def on_open(ws):
    print("Connected")

    # 发送 identify
    ws.send(json.dumps({
        "type": "identify",
        "deviceId": device_id,
        "deviceName": device_name
    }))

    # 启动数据上报线程
    def send_data():
        while True:
            time.sleep(5)
            ws.send(json.dumps({
                "type": "data",
                "data": {
                    "temperature": 20 + random.random() * 10,
                    "humidity": 50 + random.random() * 20
                }
            }))

    thread = threading.Thread(target=send_data, daemon=True)
    thread.start()

def on_message(ws, message):
    msg = json.loads(message)

    if msg["type"] == "control":
        print(f"Received command: {msg['command']}")

        # 执行命令（示例）
        # ... 硬件操作 ...

        # 发送 ACK
        ws.send(json.dumps({
            "type": "control_ack",
            "commandId": msg["commandId"],
            "status": "success",
            "message": "Command executed"
        }))

    elif msg["type"] == "identified":
        print(f"Device identified: {msg['customName']}")

def on_error(ws, error):
    print(f"Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print("Disconnected")

# 自动重连
websocket.enableTrace(False)
ws = websocket.WebSocketApp(
    endpoint_url,
    on_open=on_open,
    on_message=on_message,
    on_error=on_error,
    on_close=on_close
)

# run_forever 自带重连逻辑
ws.run_forever()
```

### 12.3 Arduino/ESP32 实现示例（C++）

```cpp
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
const char* ws_host = "192.168.1.100";
const uint16_t ws_port = 3001;
const char* ws_path = "/ws/CV6e3sON9o";

WebSocketsClient webSocket;

void sendIdentify() {
  StaticJsonDocument<200> doc;
  doc["type"] = "identify";
  doc["deviceId"] = "esp32_001";
  doc["deviceName"] = "ESP32 温湿度传感器";

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void sendData(float temperature, float humidity) {
  StaticJsonDocument<300> doc;
  doc["type"] = "data";

  JsonObject data = doc.createNestedObject("data");
  data["temperature"] = temperature;
  data["humidity"] = humidity;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void sendControlAck(const char* commandId, const char* status, const char* message) {
  StaticJsonDocument<200> doc;
  doc["type"] = "control_ack";
  doc["commandId"] = commandId;
  doc["status"] = status;
  doc["message"] = message;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_CONNECTED:
      Serial.println("Connected to server");
      sendIdentify();
      break;

    case WStype_DISCONNECTED:
      Serial.println("Disconnected");
      break;

    case WStype_TEXT: {
      StaticJsonDocument<512> doc;
      deserializeJson(doc, payload);

      const char* msgType = doc["type"];

      if (strcmp(msgType, "control") == 0) {
        const char* commandId = doc["commandId"];
        const char* command = doc["command"];

        Serial.printf("Received command: %s\n", command);

        // 执行命令
        if (strcmp(command, "setLight") == 0) {
          const char* state = doc["params"]["state"];
          // digitalWrite(LED_PIN, strcmp(state, "on") == 0 ? HIGH : LOW);
          sendControlAck(commandId, "success", "Light state changed");
        }
      }
      else if (strcmp(msgType, "identified") == 0) {
        Serial.println("Device identified");
      }
      break;
    }
  }
}

void setup() {
  Serial.begin(115200);

  // 连接 WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // 连接 WebSocket
  webSocket.begin(ws_host, ws_port, ws_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();

  // 每 10 秒上报数据
  static unsigned long lastSend = 0;
  if (millis() - lastSend > 10000) {
    float temp = random(200, 300) / 10.0;  // 模拟温度
    float humi = random(400, 800) / 10.0;  // 模拟湿度
    sendData(temp, humi);
    lastSend = millis();
  }
}
```

---

## 十三、安全建议

### 13.1 身份验证

当前协议基于 endpoint_id 进行访问控制，建议增强：

1. ✅ 使用 HTTPS/WSS 加密传输
2. ✅ 实现设备级 Token 认证
3. ✅ 限制 endpoint_id 泄露风险
4. ✅ 定期轮换 endpoint_id

### 13.2 数据验证

1. ✅ 验证所有输入数据格式
2. ✅ 限制消息大小（防止 DoS）
3. ✅ 限制字段长度
4. ✅ 验证数据类型

### 13.3 速率限制

1. ✅ 限制每个设备的消息发送频率
2. ✅ 限制控制命令发送频率
3. ✅ 限制 HTTP API 调用频率

---

## 十四、性能优化建议

### 14.1 设备端

1. ✅ 批量上报数据（减少消息数量）
2. ✅ 使用二进制协议（减少带宽）
3. ✅ 实现本地缓存（离线数据）
4. ✅ 压缩大数据包

### 14.2 服务器端

1. ✅ 使用消息队列处理数据存储
2. ✅ 批量写入数据库
3. ✅ 使用 Redis 缓存设备状态
4. ✅ 实现水平扩展

---

## 附录 A：完整消息类型总览

| 消息类型 | 方向 | 说明 |
|---------|------|------|
| identify | 设备 → 服务器 | 设备注册 |
| identified | 服务器 → 设备 | 注册确认 |
| data | 设备 → 服务器 | 数据上报 |
| control | 服务器 → 设备 | 控制命令 |
| control_ack | 设备 → 服务器 | 命令应答 |
| system | 服务器 → 设备 | 系统消息 |
| message | 双向 | 通用消息（转发模式） |

---

## 附录 B：WebSocket 状态码

| 代码 | 说明 |
|------|------|
| 1000 | 正常关闭 |
| 1001 | 端点离开 |
| 1008 | 策略违规（端点无效等） |
| 1011 | 服务器内部错误 |

---

## 附录 C：常见问题解答

### Q1: 设备离线后重连，历史数据会丢失吗？

A: 是的，WebSocket 不保证离线消息传递。如需离线数据，设备应实现本地缓存，重连后批量上报。

### Q2: 控制命令超时后还能重试吗？

A: 可以。客户端检测到 timeout 状态后，可以发起新的控制请求（生成新的 commandId）。

### Q3: 一个端点可以连接多少个设备？

A: 无硬性限制，但建议不超过 100 个设备/端点，以保证性能。

### Q4: 支持设备间直接通信吗？

A: 不直接支持。设备通信需通过服务器转发（根据转发模式）。

### Q5: 数据存储多久？

A: 当前无自动清理策略，建议根据业务需求定期归档或清理历史数据。

---

**文档结束**

**版权声明**: © 2025 米醋电子工作室 (Michu Electronics Studio). All rights reserved.

**联系方式**:
- GitHub: https://github.com/McuXifeng
- Email: 3531313387@qq.com
