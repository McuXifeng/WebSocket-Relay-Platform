# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** 所有共享类型定义在 `packages/shared/src/types`，前后端统一导入
- **API Calls:** 前端永远通过 `services/` 层调用 API，禁止直接使用 Axios
- **Environment Variables:** 通过 `config/` 模块访问环境变量，禁止直接使用 `process.env`
- **Error Handling:** 所有 API 路由必须使用统一的错误处理中间件
- **State Updates:** 前端禁止直接修改状态，使用 setState 或 Context API
- **WebSocket Messages:** 所有消息必须符合定义的 TypeScript 接口
- **Database Queries:** 禁止拼接 SQL，使用 Prisma 参数化查询
- **Password Handling:** 禁止记录或传输明文密码，使用 bcrypt 加密

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts` |
| API Routes | - | kebab-case | `/api/user-profile` |
| Database Tables | - | snake_case | `user_profiles` |
| Functions | camelCase | camelCase | `getUserById()` |
| Constants | UPPER_SNAKE_CASE | UPPER_SNAKE_CASE | `MAX_ENDPOINTS` |

---
