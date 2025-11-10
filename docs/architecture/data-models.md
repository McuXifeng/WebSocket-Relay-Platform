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
- `is_active`: boolean - 账户激活状态(false表示被封禁) **(Epic 10 Story 10.2)**
- `banned_at`: DateTime (nullable) - 封禁时间 **(Epic 10 Story 10.2)**
- `banned_reason`: string (nullable) - 封禁原因 **(Epic 10 Story 10.2)**
- `banned_by`: string (nullable) - 封禁操作者ID **(Epic 10 Story 10.2)**

### TypeScript Interface

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  is_admin: boolean;
  created_at: Date;
  // Epic 10 Story 10.2: 封禁功能字段
  is_active: boolean;
  banned_at: Date | null;
  banned_reason: string | null;
  banned_by: string | null;
}

// 前端使用的安全类型（不含密码）
interface UserPublic {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: Date;
  // Epic 10 Story 10.2: 封禁功能字段
  is_active: boolean;
  banned_at: Date | null;
  banned_reason: string | null;
  banned_by: string | null;
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
- `is_disabled`: boolean - 端点禁用状态(true表示被禁用) **(Epic 10 Story 10.2)**
- `disabled_at`: DateTime (nullable) - 禁用时间 **(Epic 10 Story 10.2)**
- `disabled_reason`: string (nullable) - 禁用原因 **(Epic 10 Story 10.2)**
- `disabled_by`: string (nullable) - 禁用操作者ID **(Epic 10 Story 10.2)**

### TypeScript Interface

```typescript
interface Endpoint {
  id: string;
  endpoint_id: string;
  name: string;
  user_id: string;
  created_at: Date;
  last_active_at: Date | null;
  // Epic 10 Story 10.2: 禁用功能字段
  is_disabled: boolean;
  disabled_at: Date | null;
  disabled_reason: string | null;
  disabled_by: string | null;
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

## BanLog（封禁审计日志）**(Epic 10 Story 10.2)**

**Purpose:** 记录所有用户封禁和端点禁用的操作日志,支持审计追溯和管理员操作记录查询。

**Key Attributes:**
- `id`: string (UUID) - 日志记录唯一标识
- `target_type`: string - 目标类型('user' 或 'endpoint')
- `target_id`: string - 目标ID(User.id或Endpoint.id)
- `action`: string - 操作类型('ban', 'unban', 'disable', 'enable')
- `reason`: string (nullable) - 操作原因
- `operator_id`: string - 操作者ID(引用User.id)
- `created_at`: DateTime - 操作时间

### TypeScript Interface

```typescript
interface BanLog {
  id: string;
  target_type: 'user' | 'endpoint';
  target_id: string;
  action: 'ban' | 'unban' | 'disable' | 'enable';
  reason: string | null;
  operator_id: string;
  created_at: Date;
}

// 前端展示用的扩展类型(包含操作者信息)
interface BanLogWithOperator extends BanLog {
  operator_username: string;
  target_name: string; // 用户名或端点名称
}
```

### Relationships
- 无外键关联(避免级联删除导致审计日志丢失)
- `target_id`逻辑上引用User.id或Endpoint.id,但仅作记录
- `operator_id`逻辑上引用User.id,但仅作记录

### Design Notes
- **审计完整性**: BanLog表不使用外键约束,即使目标用户/端点被删除,日志记录依然保留
- **索引优化**: 支持按目标类型+ID、操作者、时间范围快速查询
- **操作类型**: 'ban'(封禁用户)、'unban'(解封用户)、'disable'(禁用端点)、'enable'(启用端点)

---
