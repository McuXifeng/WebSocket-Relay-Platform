# Technical Assumptions

## Repository Structure（仓库结构）

**Monorepo（单一代码仓库）**

**选择理由：**
- MVP 项目规模适中，前后端代码放在一起管理更简单
- 共享配置（ESLint、Prettier、TypeScript）更容易
- 依赖管理统一，避免版本不一致
- 便于本地开发和调试（一个 repo 克隆即可）
- 使用 pnpm workspace 或 npm workspace 组织代码

**推荐目录结构：**
```
/
├── packages/
│   ├── frontend/     # React 前端
│   ├── backend/      # Express + WebSocket 后端
│   └── shared/       # 共享类型定义（如果使用 TypeScript）
├── docs/             # 项目文档
├── package.json      # 根 package.json
└── pnpm-workspace.yaml
```

## Service Architecture（服务架构）

**单体架构（Monolith）+ 独立 WebSocket 服务**

**架构描述：**
- **REST API 服务（Express）：** 处理用户认证、端点管理、授权码管理等 CRUD 操作
- **WebSocket 服务（ws）：** 独立的 WebSocket 服务器，负责消息转发
- **共享数据库：** PostgreSQL 或 MySQL，存储用户、端点、授权码等持久化数据
- **进程部署：** 使用 PM2 管理多个进程（REST API 和 WebSocket 分别启动）

**选择理由：**
- MVP 阶段单体架构足够，开发和部署简单
- WebSocket 服务单独进程，便于独立扩展和重启
- 避免微服务带来的分布式复杂度（服务发现、API 网关等）
- 单服务器部署，成本可控

**数据库选择建议：**
- **MySQL 8.0+**（推荐用于 MVP）
  - 轻量级，资源占用少，适合单服务器部署
  - 文档丰富，社区成熟
  - 满足 MVP 的所有数据存储需求
- **PostgreSQL 14+**（可选，如果需要更强功能）
  - JSON 字段支持更好，适合后续扩展
  - 功能更丰富，但资源占用略高

**建议：** 初期使用 MySQL，保持简单；如果未来需要复杂查询或 JSON 存储，可迁移到 PostgreSQL。

## Testing Requirements（测试要求）

**Unit + Integration（单元测试 + 集成测试）**

**测试策略：**

**后端测试（必须）：**
- **单元测试：** 使用 Jest 测试核心业务逻辑（授权码验证、端点创建、消息路由逻辑）
- **集成测试：** 测试 REST API 端点（使用 supertest）
- **WebSocket 测试：** 测试 WebSocket 连接、消息转发、端点隔离（使用 ws 客户端）
- **目标覆盖率：** 核心业务逻辑 > 70%

**前端测试（可选，MVP 可降低优先级）：**
- **组件测试：** 使用 React Testing Library 测试关键组件
- **E2E 测试：** MVP 阶段可手动测试，后续可引入 Playwright

**不包含：**
- 压力测试（MVP 阶段手动验证即可）
- 完整的 E2E 自动化测试套件

**测试便利性要求：**
- 提供 `npm run test` 命令运行所有测试
- 提供本地数据库 seed 脚本，快速创建测试数据
- 使用环境变量区分测试和开发环境

## Additional Technical Assumptions and Requests（额外技术假设）

**1. 编程语言：TypeScript**

**选择理由：**
- 类型安全减少运行时错误，特别是 WebSocket 消息路由这种复杂逻辑
- Ant Design 5.x 对 TypeScript 支持非常好
- Prisma ORM 天然支持 TypeScript 类型生成
- 现代 Node.js 和 React 项目的标准做法

**2. 前端状态管理：React Context API**

**选择理由：**
- MVP 状态管理需求简单（用户信息、端点列表）
- Context API 是 React 内置方案，无需额外依赖
- 如果后续状态复杂化，可迁移到 Zustand

**3. ORM 选择：Prisma**

**选择理由：**
- 开发体验好，类型生成自动化
- Schema 定义清晰，迁移管理简单
- 与 TypeScript 配合完美

**4. WebSocket 消息格式：JSON**

**建议格式：**
```json
{
  "type": "message",
  "data": "用户消息内容",
  "timestamp": 1698765432000
}
```

**选择理由：**
- 需要基本的消息结构便于调试
- JSON 易于解析和扩展
- 用户可在文档中看到消息格式规范

**5. 环境变量管理：dotenv**

**必需的环境变量：**
```
DATABASE_URL=mysql://user:password@localhost:3306/dbname
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
API_PORT=3000
WS_PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

**6. 代码规范工具**

- **ESLint：** JavaScript/TypeScript 代码检查
- **Prettier：** 代码格式化
- **Husky + lint-staged：** Git commit 前自动运行 lint 和 format

**7. 部署相关**

- **Node.js 版本：** 18.x LTS 或 20.x LTS
- **进程管理：** PM2
- **反向代理：** Nginx
- **SSL 证书：** Let's Encrypt
- **日志管理：** Winston 或 Pino（结构化日志）

**8. 开发工具链**

- **前端构建：** Vite（快速的 React 开发服务器）
- **包管理器：** pnpm（速度快，节省磁盘空间）
- **API 文档：** Swagger / OpenAPI（可选，帮助前后端协作）

**9. 跨域和安全**

- REST API 使用 CORS 中间件，配置允许的源
- WebSocket 服务通过 URL 中的 endpointId 识别端点
- 敏感操作（删除端点、生成授权码）需要 JWT Token 验证

**10. 性能优化**

- WebSocket 连接使用内存 Map 存储（`Map<endpointId, Set<WebSocket>>`）
- MVP 阶段单进程运行，不考虑 Redis 做进程间通信
- 数据库查询添加必要索引（user_id、endpoint_id、invite_code）

---
