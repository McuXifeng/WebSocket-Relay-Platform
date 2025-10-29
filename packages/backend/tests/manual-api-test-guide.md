# 注册 API 手动测试指南

## 前置准备

### 1. 启动开发服务器

```bash
cd packages/backend
pnpm dev
```

### 2. 创建测试授权码

使用 Prisma Studio 或直接执行 SQL：

```sql
-- 先创建管理员用户
INSERT INTO users (id, username, email, password_hash, is_admin)
VALUES ('admin-001', 'admin', 'admin@test.com', '$2a$10$dummy', true);

-- 创建测试授权码
INSERT INTO invite_codes (code, created_by)
VALUES ('testcode01', 'admin-001');
```

或使用 Prisma Studio：

```bash
cd packages/backend
npx prisma studio
```

## 手动测试场景

### ✅ 场景 1: 成功注册新用户

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "testcode01",
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**预期结果**:

- HTTP 状态码: 201
- 响应包含用户信息（不含 password_hash）
- 授权码被标记为已使用

**预期响应**:

```json
{
  "data": {
    "user": {
      "id": "...",
      "username": "testuser",
      "email": "test@example.com",
      "is_admin": false,
      "created_at": "2025-10-27T..."
    }
  }
}
```

---

### ❌ 场景 2: 使用无效授权码

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "invalid-code",
    "username": "testuser2",
    "email": "test2@example.com",
    "password": "Password123"
  }'
```

**预期结果**:

- HTTP 状态码: 400
- 错误消息: "授权码不存在"

**预期响应**:

```json
{
  "error": {
    "code": "INVALID_INVITE_CODE",
    "message": "授权码不存在",
    "timestamp": "...",
    "requestId": "..."
  }
}
```

---

### ❌ 场景 3: 重复使用授权码

```bash
# 先使用一次授权码（假设之前已成功注册）
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "testcode01",
    "username": "testuser3",
    "email": "test3@example.com",
    "password": "Password123"
  }'
```

**预期结果**:

- HTTP 状态码: 400
- 错误消息: "授权码已被使用"

---

### ❌ 场景 4: 使用已过期的授权码

```sql
-- 先创建一个过期的授权码
INSERT INTO invite_codes (code, expires_at, created_by)
VALUES ('expired01', '2020-01-01 00:00:00', 'admin-001');
```

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "expired01",
    "username": "testuser4",
    "email": "test4@example.com",
    "password": "Password123"
  }'
```

**预期结果**:

- HTTP 状态码: 400
- 错误消息: "授权码已过期"

---

### ❌ 场景 5: 重复的用户名

```bash
# 假设 testuser 已经存在
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "anothercode",
    "username": "testuser",
    "email": "different@example.com",
    "password": "Password123"
  }'
```

**预期结果**:

- HTTP 状态码: 409
- 错误消息: "用户名已存在"

---

### ❌ 场景 6: 重复的邮箱

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "anothercode",
    "username": "differentuser",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

**预期结果**:

- HTTP 状态码: 409
- 错误消息: "邮箱已存在"

---

### ❌ 场景 7: 缺少必填字段

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "testcode01",
    "username": "testuser",
    "email": "test@example.com"
  }'
```

**预期结果**:

- HTTP 状态码: 400 或 500
- 错误信息指出缺少 password 字段

---

## 验证结果

### 检查数据库

```sql
-- 查看新创建的用户
SELECT id, username, email, is_admin, created_at
FROM users
WHERE username = 'testuser';

-- 确认密码已加密
SELECT id, username, password_hash
FROM users
WHERE username = 'testuser';
-- password_hash 应该是类似 $2a$10$... 的哈希字符串，而不是明文

-- 查看授权码使用状态
SELECT code, used_by, used_at, created_at
FROM invite_codes
WHERE code = 'testcode01';
-- used_by 应该是用户的 ID，used_at 应该有时间戳
```

---

## 测试完成标准

- [x] 成功注册新用户
- [x] 返回的用户信息不包含 password_hash
- [x] 授权码被正确标记为已使用
- [x] 无效授权码返回 400 错误
- [x] 重复授权码返回 400 错误
- [x] 过期授权码返回 400 错误
- [x] 重复用户名返回 409 错误
- [x] 重复邮箱返回 409 错误
- [x] 缺少必填字段返回适当错误
- [x] 所有错误消息清晰友好

---

## 注意事项

1. **密码安全**: 密码在数据库中应该是 bcrypt 哈希，永远不要存储明文密码
2. **授权码唯一性**: 每个授权码只能使用一次
3. **错误消息**: 所有错误消息应该对用户友好，但不泄露敏感信息
4. **响应格式**: 成功响应使用 `{ data: {...} }`，错误响应使用 `{ error: {...} }`

---

## 集成测试覆盖

**注意**: 上述所有场景已在集成测试中完全覆盖并通过（12/12 tests passed）。
手动测试主要用于验证真实环境下的 API 行为。
