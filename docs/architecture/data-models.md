# Data Models

## User（用户）

**Purpose:** 存储平台用户的基本信息和认证凭据，支持授权码注册和角色管理。

**Key Attributes:**
- `id`: string (UUID) - 用户唯一标识符
- `username`: string (unique) - 用户名，用于登录
- `email`: string (unique) - 用户邮箱
- `password_hash`: string - bcrypt 加密的密码哈希
- `is_admin`: boolean - 管理员标识
- `created_at`: DateTime - 注册时间

### TypeScript Interface

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_admin: boolean;
  created_at: Date;
}

// 前端使用的安全类型（不含密码）
interface UserPublic {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: Date;
}
```

### Relationships
- One-to-Many: User → Endpoint（一个用户可以创建多个端点）
- One-to-Many: User → InviteCode（一个管理员可以创建多个授权码）

---

## InviteCode（授权码）

**Purpose:** 控制用户注册准入，通过授权码验证机制防止滥用。

**Key Attributes:**
- `id`: string (UUID) - 授权码记录唯一标识
- `code`: string (unique) - 8-12 位随机授权码
- `expires_at`: DateTime (nullable) - 过期时间
- `used_by`: string (nullable) - 使用该授权码注册的用户 ID
- `used_at`: DateTime (nullable) - 使用时间
- `created_by`: string - 创建该授权码的管理员 ID
- `created_at`: DateTime - 创建时间

### TypeScript Interface

```typescript
interface InviteCode {
  id: string;
  code: string;
  expires_at: Date | null;
  used_by: string | null;
  used_at: Date | null;
  created_by: string;
  created_at: Date;
}
```

### Relationships
- Many-to-One: InviteCode → User (used_by)
- Many-to-One: InviteCode → User (created_by)

---

## Endpoint（WebSocket 端点）

**Purpose:** 存储用户创建的 WebSocket 端点信息，每个端点对应一个唯一的 WebSocket URL。

**Key Attributes:**
- `id`: string (UUID) - 数据库主键
- `endpoint_id`: string (unique) - 8-12 位随机 ID，用于 WebSocket URL
- `name`: string - 用户自定义端点名称
- `user_id`: string - 所属用户 ID
- `created_at`: DateTime - 创建时间
- `last_active_at`: DateTime (nullable) - 最后活跃时间

### TypeScript Interface

```typescript
interface Endpoint {
  id: string;
  endpoint_id: string;
  name: string;
  user_id: string;
  created_at: Date;
  last_active_at: Date | null;
}

// 前端展示用的扩展类型
interface EndpointWithUrl extends Endpoint {
  websocket_url: string;
}
```

### Relationships
- Many-to-One: Endpoint → User
- One-to-One: Endpoint → EndpointStats

---

## EndpointStats（端点统计）

**Purpose:** 记录端点的实时连接数和消息统计，用于前端监控展示。

**Key Attributes:**
- `id`: string (UUID) - 主键
- `endpoint_id`: string (unique) - 关联的端点 ID
- `current_connections`: number - 当前在线连接数
- `total_connections`: number - 累计连接总数
- `total_messages`: number - 累计消息总数
- `updated_at`: DateTime - 最后更新时间

### TypeScript Interface

```typescript
interface EndpointStats {
  id: string;
  endpoint_id: string;
  current_connections: number;
  total_connections: number;
  total_messages: number;
  updated_at: Date;
}
```

### Relationships
- One-to-One: EndpointStats → Endpoint

---

## WebSocketMessage（消息格式）

**Purpose:** 定义 WebSocket 通信的标准消息格式（非数据库表）。

### TypeScript Interface

```typescript
// 客户端发送的消息格式
interface WebSocketMessage {
  type: 'message' | 'ping';
  data: any;
  timestamp: number;
}

// 服务器广播的消息格式
interface WebSocketBroadcast extends WebSocketMessage {
  type: 'message';
}

// 系统消息
interface SystemMessage {
  type: 'system';
  message: string;
  level: 'info' | 'error' | 'warning';
  timestamp: number;
}
```

---
