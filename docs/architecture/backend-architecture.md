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
- `server.ts` - WebSocket 服务器主文件（监听 3001 端口）
- `ConnectionManager` - 连接池管理（Map<endpoint_id, Set<WebSocket>>）
- `MessageRouter` - 消息路由和广播
- `StatsUpdater` - 统计数据更新（批量刷新优化）

**消息路由逻辑：**
1. 客户端连接 → 解析 endpoint_id → 验证端点存在
2. 添加连接到 Map → 更新统计（connections++）
3. 接收消息 → 查找同端点所有连接 → 广播（不包括发送者）
4. 更新统计（messages++, last_active_at）

**心跳机制（Epic 10 Story 10.5 优化）：**
- **心跳间隔：** 15 秒（原 30 秒）
- **超时检测：** 两次心跳无响应即断开（30 秒内检测异常断开）
- **检测逻辑：** 服务器每 15 秒发送 ping，客户端响应 pong，设置 `socket.isAlive = true`
- **断开处理：** 幂等性清理（`socket.isCleanedUp` 标志防止重复清理）
- **日志增强：** 区分正常断开（logger.info）和异常断开（logger.warn），记录连接时长

**性能优化（Epic 10 Story 10.5）：**
- **断开连接立即刷新：** disconnect 操作立即触发统计数据刷新（延迟 < 1 秒）
- **批量更新保留：** connect 和 message 操作仍使用批量累积（5 秒刷新或达到 100 条阈值）
- **设计权衡：** 提升断开状态更新实时性，断开频率远低于消息，性能影响可忽略
- **压力测试验证：** 支持 100+ 并发连接异常断开场景，无连接泄漏

---
