# Frontend Architecture

## Component Organization

```
packages/frontend/src/
├── components/          # 可复用 UI 组件
│   ├── layout/
│   ├── endpoints/
│   ├── auth/
│   └── common/
├── pages/               # 页面组件
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── EndpointDetailPage.tsx
│   ├── ProfilePage.tsx
│   └── admin/
├── contexts/            # React Context
│   └── AuthContext.tsx
├── services/            # API 调用服务
│   ├── api.ts
│   ├── auth.service.ts
│   └── endpoint.service.ts
├── hooks/               # 自定义 Hooks
│   ├── useAuth.ts
│   └── useWebSocket.ts
├── types/               # TypeScript 类型
├── utils/               # 工具函数
├── config/              # 配置文件
├── App.tsx
├── main.tsx
└── router.tsx
```

## State Management

**全局状态：** React Context API（用户认证）
**组件状态：** useState（列表数据、表单状态）
**服务器状态：** 直接通过 API 调用（无需 React Query）

## Routing

**路由组织：**
- 公开路由：`/login`, `/register`
- 受保护路由：`/dashboard`, `/endpoints/:id`, `/profile`
- 管理员路由：`/admin/invite-codes`, `/admin/users`

**保护机制：**
- `<ProtectedRoute>` - 验证用户登录
- `<AdminRoute>` - 验证管理员权限

## API Client

**Axios 配置：**
- Base URL 配置
- 请求拦截器：自动附加 JWT Token
- 响应拦截器：统一错误处理

---
