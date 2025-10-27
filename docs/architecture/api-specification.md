# API Specification

## REST API Overview

完整的 OpenAPI 3.0 规范详见以下 YAML 定义。

**Base URL:** `https://your-domain.com/api`

**Authentication:** Bearer Token (JWT)

**核心端点分组：**
- `/health` - 健康检查
- `/auth/*` - 用户认证（注册、登录）
- `/endpoints/*` - 端点管理（CRUD、统计）
- `/admin/*` - 管理员操作（授权码、用户管理）

**标准响应格式：**

成功响应：
```json
{
  "data": { ... }
}
```

错误响应：
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "用户友好的错误消息",
    "details": { ... },
    "timestamp": "2025-10-27T10:00:00Z",
    "requestId": "uuid"
  }
}
```

**关键 API 端点：**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | 健康检查 |
| POST | /auth/register | No | 用户注册 |
| POST | /auth/login | No | 用户登录 |
| GET | /auth/me | Yes | 获取当前用户信息 |
| GET | /endpoints | Yes | 获取用户端点列表 |
| POST | /endpoints | Yes | 创建新端点 |
| GET | /endpoints/:id | Yes | 获取端点详情 |
| DELETE | /endpoints/:id | Yes | 删除端点 |
| GET | /endpoints/:id/stats | Yes | 获取端点统计 |
| GET | /admin/invite-codes | Yes (Admin) | 获取授权码列表 |
| POST | /admin/invite-codes | Yes (Admin) | 创建授权码 |
| GET | /admin/users | Yes (Admin) | 获取用户列表 |

---
