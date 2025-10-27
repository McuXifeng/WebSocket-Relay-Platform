# Components

## Frontend Components

### AuthContext
**Responsibility:** 管理全局用户认证状态，提供登录/登出功能。

**Key Interfaces:**
- `login(username, password): Promise<void>`
- `logout(): void`
- `user: UserPublic | null`
- `isAuthenticated: boolean`

**Technology Stack:** React Context API, TypeScript

---

### API Client Service
**Responsibility:** 封装所有 HTTP API 调用，统一处理 Token 附加和错误处理。

**Key Interfaces:**
- `auth.register(data)`, `auth.login(data)`, `auth.getCurrentUser()`
- `endpoints.list()`, `endpoints.create(data)`, `endpoints.get(id)`, `endpoints.delete(id)`
- `admin.createInviteCode(data)`, `admin.getUsers()`

**Technology Stack:** Axios

---

### WebSocket Manager
**Responsibility:** 管理 WebSocket 连接，处理消息收发和自动重连。

**Key Interfaces:**
- `connect(endpointId): void`
- `disconnect(): void`
- `send(message): void`
- `onMessage(callback): void`

**Technology Stack:** 原生 WebSocket API, React Hooks

---

## Backend Components

### Express REST API Server
**Responsibility:** 处理所有 HTTP 请求，提供完整的 REST API。

**Architecture:** 分层架构（Routes → Controllers → Services → Prisma）

**Technology Stack:** Express, TypeScript, PM2

---

### WebSocket Server
**Responsibility:** 处理 WebSocket 连接，实现端点消息路由和广播。

**Core Data Structure:** `Map<endpoint_id, Set<WebSocket>>`

**Technology Stack:** ws 库, TypeScript, PM2

---

### Authentication Middleware
**Responsibility:** 验证 JWT Token，保护需要认证的 API 路由。

**Key Functions:**
- `authenticateToken(req, res, next)`
- `requireAdmin(req, res, next)`

**Technology Stack:** jsonwebtoken, Express middleware

---

### Prisma Client (ORM)
**Responsibility:** 提供类型安全的数据库访问。

**Models:** User, Endpoint, InviteCode, EndpointStats

**Technology Stack:** Prisma 5.x, MySQL 8.0

---
