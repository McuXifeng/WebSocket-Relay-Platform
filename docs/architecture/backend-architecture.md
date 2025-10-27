# Backend Architecture

## Service Architecture

**分层架构：**
```
routes/ → controllers/ → services/ → prisma (数据访问)
```

**Controller 职责：** 处理 HTTP 请求，调用 Service 层
**Service 职责：** 业务逻辑，数据验证，调用 Prisma
**Middleware 职责：** JWT 验证，CORS，错误处理

## Database Access Layer

**Repository Pattern with Prisma：**
- Service 层封装所有数据库操作
- Prisma Client 提供类型安全的查询
- 使用事务确保数据一致性

## Authentication

**JWT 认证流程：**
1. 用户登录 → 验证密码（bcrypt.compare）
2. 生成 JWT Token（payload: userId, username, isAdmin）
3. 客户端存储 Token（localStorage）
4. 每次请求附加 Token（Authorization: Bearer TOKEN）
5. Middleware 验证 Token（jwt.verify）

**Middleware：**
- `authenticateToken` - 验证所有受保护路由
- `requireAdmin` - 验证管理员权限

## WebSocket Server

**架构组件：**
- `server.ts` - WebSocket 服务器主文件
- `ConnectionManager` - 连接池管理（Map<endpoint_id, Set<WebSocket>>）
- `MessageRouter` - 消息路由和广播
- `StatsUpdater` - 统计数据更新

**消息路由逻辑：**
1. 客户端连接 → 解析 endpoint_id → 验证端点存在
2. 添加连接到 Map → 更新统计（connections++）
3. 接收消息 → 查找同端点所有连接 → 广播（不包括发送者）
4. 更新统计（messages++, last_active_at）

---
