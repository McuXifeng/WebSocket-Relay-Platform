# Database Schema

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid())
  username      String   @unique @db.VarChar(30)
  email         String   @unique @db.VarChar(255)
  password_hash String   @db.VarChar(255)
  is_admin      Boolean  @default(false)
  created_at    DateTime @default(now())

  // Epic 10 Story 10.2: 封禁功能字段
  is_active     Boolean   @default(true) // 账户激活状态(false表示被封禁)
  banned_at     DateTime? // 封禁时间(可为空)
  banned_reason String?   @db.VarChar(255) // 封禁原因(可为空)
  banned_by     String? // 封禁操作者ID(引用User.id,可为空)

  endpoints            Endpoint[]
  created_invite_codes InviteCode[] @relation("CreatedBy")
  used_invite_code     InviteCode?  @relation("UsedBy")

  @@index([username])
  @@index([email])
  @@index([is_active]) // Epic 10 Story 10.2: 优化查询被封禁用户列表
  @@map("users")
}

model InviteCode {
  id         String    @id @default(uuid())
  code       String    @unique @db.VarChar(12)
  expires_at DateTime?
  used_by    String?   @unique
  used_at    DateTime?
  created_by String
  created_at DateTime  @default(now())

  creator User  @relation("CreatedBy", fields: [created_by], references: [id], onDelete: Cascade)
  user    User? @relation("UsedBy", fields: [used_by], references: [id], onDelete: SetNull)

  @@index([code])
  @@index([used_by])
  @@index([created_by])
  @@map("invite_codes")
}

model Endpoint {
  id             String    @id @default(uuid())
  endpoint_id    String    @unique @db.VarChar(12)
  name           String    @default("未命名端点") @db.VarChar(100)
  user_id        String
  created_at     DateTime  @default(now())
  last_active_at DateTime?

  // Epic 10 Story 10.2: 禁用功能字段
  is_disabled     Boolean   @default(false) // 端点禁用状态(true表示被禁用)
  disabled_at     DateTime? // 禁用时间(可为空)
  disabled_reason String?   @db.VarChar(255) // 禁用原因(可为空)
  disabled_by     String? // 禁用操作者ID(引用User.id,可为空)

  user  User           @relation(fields: [user_id], references: [id], onDelete: Cascade)
  stats EndpointStats?

  @@index([endpoint_id])
  @@index([user_id])
  @@index([is_disabled]) // Epic 10 Story 10.2: 优化查询被禁用端点列表
  @@map("endpoints")
}

model EndpointStats {
  id                  String   @id @default(uuid())
  endpoint_id         String   @unique
  current_connections Int      @default(0)
  total_connections   Int      @default(0)
  total_messages      Int      @default(0)
  updated_at          DateTime @updatedAt

  endpoint Endpoint @relation(fields: [endpoint_id], references: [id], onDelete: Cascade)

  @@index([endpoint_id])
  @@map("endpoint_stats")
}

// BanLog 模型 (Epic 10 Story 10.2 新增) - 封禁/禁用操作审计日志
model BanLog {
  id          String   @id @default(uuid())
  target_type String   @db.VarChar(20) // 目标类型: 'user' 或 'endpoint'
  target_id   String // 目标ID (User.id或Endpoint.id)
  action      String   @db.VarChar(20) // 操作类型: 'ban','unban','disable','enable'
  reason      String?  @db.VarChar(255) // 操作原因(可为空)
  operator_id String // 操作者ID (引用User.id)
  created_at  DateTime @default(now()) // 操作时间

  @@index([target_type, target_id]) // 查询特定目标的日志
  @@index([operator_id]) // 查询特定管理员的操作记录
  @@index([created_at]) // 按时间范围查询
  @@map("ban_logs")
}
```

## 数据库设计说明

**索引策略：**
- `username`, `email` - 登录查询优化
- `endpoint_id` - WebSocket 连接快速查找
- `code` - 授权码验证优化
- `user_id` - 查询用户端点优化
- `is_active` - 查询被封禁用户列表优化 (Epic 10 Story 10.2)
- `is_disabled` - 查询被禁用端点列表优化 (Epic 10 Story 10.2)
- `[target_type, target_id]` - 查询特定目标的封禁日志优化 (Epic 10 Story 10.2)
- `operator_id` - 查询特定管理员的操作记录优化 (Epic 10 Story 10.2)
- `created_at` (BanLog) - 按时间范围查询封禁日志优化 (Epic 10 Story 10.2)

**级联删除规则：**
- 删除用户 → 级联删除其所有端点和创建的授权码
- 删除端点 → 级联删除对应的统计数据
- 删除用户 → 将授权码 `used_by` 字段置为 null

**封禁功能设计说明 (Epic 10 Story 10.2):**
- **User.is_active**: 默认true,所有现有用户不受影响,向后兼容
- **Endpoint.is_disabled**: 默认false,所有现有端点不受影响,向后兼容
- **BanLog表**: 不使用外键关联,避免级联删除导致审计日志丢失,target_id仅作记录
- **banned_by/disabled_by**: 逻辑上引用User.id,但不创建FK约束,记录操作者支持审计追溯

---
