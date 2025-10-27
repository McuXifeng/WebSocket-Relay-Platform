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

  endpoints            Endpoint[]
  created_invite_codes InviteCode[] @relation("CreatedBy")
  used_invite_code     InviteCode?  @relation("UsedBy")

  @@index([username])
  @@index([email])
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

  user  User           @relation(fields: [user_id], references: [id], onDelete: Cascade)
  stats EndpointStats?

  @@index([endpoint_id])
  @@index([user_id])
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
```

## 数据库设计说明

**索引策略：**
- `username`, `email` - 登录查询优化
- `endpoint_id` - WebSocket 连接快速查找
- `code` - 授权码验证优化
- `user_id` - 查询用户端点优化

**级联删除规则：**
- 删除用户 → 级联删除其所有端点和创建的授权码
- 删除端点 → 级联删除对应的统计数据
- 删除用户 → 将授权码 `used_by` 字段置为 null

---
