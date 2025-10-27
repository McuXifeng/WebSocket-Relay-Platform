# WebSocket 中继共享平台 Product Requirements Document (PRD)

---

## Goals and Background Context

### Goals（目标）

- 为开发者提供零配置的 WebSocket 端点创建和管理能力，无需购买服务器或配置域名
- 实现稳定可靠的 WebSocket 消息转发服务，支持多客户端实时通信
- 通过授权码机制控制用户准入，保证服务质量和防止滥用
- 提供直观易用的 Web 界面，让用户在 2 分钟内完成从注册到创建端点的全流程
- 为管理员提供授权码生成和用户管理功能，实现有效的运营控制
- 提供基础的实时监控功能，帮助用户查看连接状态和消息流量

### Background Context（背景上下文）

开发者在学习和测试 WebSocket 应用时经常面临公网 IP 缺失的困境。家庭宽带通常没有公网 IP 或被运营商 NAT，即使购买云服务器也需要配置防火墙、域名、SSL 证书等繁琐步骤，对于只想快速测试功能的开发者来说门槛过高。现有的内网穿透工具需要两端配置且免费版限制多，公共测试服务则只提供 echo 演示功能无法用于真实应用场景。

本项目通过在公网服务器上部署 WebSocket 转发服务，为用户提供开箱即用的实时通信中继能力。用户通过授权码注册后，在 Web 界面一键创建专属的 WebSocket 端点，平台负责在多个客户端之间透明转发消息，不涉及任何业务逻辑处理。这种纯转发模式确保了最大的兼容性和性能，让开发者可以专注于应用本身的开发和测试。

### Change Log（变更日志）

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-27 | v1.0 | 初始 PRD 创建 | PM |

---

## Requirements

### Functional Requirements（功能需求）

**FR1:** 用户可以使用有效的授权码完成注册，授权码在注册成功后自动失效

**FR2:** 用户可以使用用户名/邮箱和密码进行登录认证

**FR3:** 用户可以在个人中心查看账户信息和管理自己创建的端点列表

**FR4:** 用户可以一键创建专属的 WebSocket 端点，系统自动生成唯一的端点 ID

**FR5:** 用户可以查看端点的详细信息，包括 WebSocket URL、创建时间、当前连接数和消息统计

**FR6:** 用户可以删除不再需要的端点

**FR7:** 用户可以一键复制端点的 WebSocket 连接地址

**FR8:** WebSocket 服务器根据端点 ID 进行消息路由，将消息在同一端点的所有连接客户端之间进行广播转发

**FR9:** WebSocket 服务器维护客户端连接状态，正确处理连接、断开和重连事件

**FR10:** 不同端点的 WebSocket 连接和消息完全隔离，互不干扰

**FR11:** 客户端发送的消息自动广播给同一端点的所有其他连接客户端（不包括发送者自己）

**FR12:** 用户可以实时查看端点的当前在线连接数

**FR13:** 用户可以查看端点的累计消息收发总数

**FR14:** 系统记录 WebSocket 连接和断开事件的基础日志

**FR15:** 管理员可以生成新的授权码，并可选设置有效期

**FR16:** 管理员可以查看授权码列表，包括授权码状态（未使用/已使用）和使用信息

**FR17:** 管理员可以查看已注册用户列表和每个用户的端点统计信息

**FR18:** 系统提供使用文档，说明注册、创建端点、连接使用的完整流程

**FR19:** 系统提供 JavaScript 客户端连接示例代码

**FR20:** 系统提供快速开始指南，帮助用户在 5 分钟内完成首次使用

### Non-Functional Requirements（非功能需求）

**NFR1:** WebSocket 消息转发延迟应低于 100ms（在正常网络条件下）

**NFR2:** 系统应支持至少 10 个并发端点的稳定运行

**NFR3:** 每个端点应支持至少 5 个并发客户端连接

**NFR4:** 用户从注册到创建第一个端点的全流程应在 2 分钟内完成

**NFR5:** Web 界面应具有良好的响应式设计，支持桌面和移动设备访问

**NFR6:** 用户密码必须使用 bcrypt 加密存储

**NFR7:** 所有 HTTP 通信必须使用 HTTPS 加密，WebSocket 连接必须使用 WSS 加密

**NFR8:** 系统应实施基础的速率限制，防止暴力破解和 DDoS 攻击

**NFR9:** 前端代码应防御 XSS 攻击（React 默认转义）

**NFR10:** 后端应使用 ORM 参数化查询防御 SQL 注入

**NFR11:** 系统应配置 CORS 策略，限制允许的请求源

**NFR12:** JWT Token 应设置合理的过期时间（建议 7 天）

---

## User Interface Design Goals

### Overall UX Vision（整体用户体验愿景）

打造极简、高效的 WebSocket 端点管理平台。核心设计理念是"零学习曲线"——用户无需阅读文档即可完成核心操作。界面最大化复用 Ant Design 组件库的现成方案，保持简洁专业的外观，避免自定义视觉设计带来的开发成本。

所有操作提供即时反馈（使用 Ant Design 的 message 和 notification 组件），让用户始终清楚当前系统状态。实时监控数据以简洁的数字和状态徽章呈现，避免复杂的图表和可视化（MVP 阶段）。

### Key Interaction Paradigms（关键交互范式）

**1. 组件库优先原则**
- 所有 UI 组件直接使用 Ant Design，不进行自定义视觉设计
- Toast 通知使用 `message.success()` / `message.error()`
- 确认对话框使用 `Modal.confirm()`
- 表单使用 `Form` 组件的内置验证
- 避免自定义样式和动画，保持 Ant Design 默认风格

**2. 一键操作优先**
- 创建端点：单个"创建"按钮（Ant Design Button 组件）
- 复制 URL：点击复制按钮，使用 `message.success('已复制')` 反馈
- 删除端点：`Modal.confirm()` 确认对话框防止误操作

**3. 实时反馈与状态可见**
- 连接数、消息统计实时更新（数字显示）
- WebSocket 连接状态使用 `Badge` 组件的 status 属性（绿色=在线，灰色=离线）
- 操作结果通过 Ant Design 的 message 组件即时反馈

**4. 简单直接的信息层次**
- 端点列表：使用 `Table` 或 `List` 组件，直接展示所有关键信息
- 详情页面：使用独立路由页面（而非弹窗或展开）
- 避免复杂的交互层次和"渐进式披露"

### Core Screens and Views（核心页面和视图）

**P0（必须实现）：**
1. **登录页面**：Ant Design Form 组件 + Card 布局
2. **注册页面**：授权码输入 + 用户信息表单
3. **端点管理主页**：Table 或 List 显示端点，顶部"创建端点"按钮

**P1（重要）：**
4. **端点详情页**：Descriptions 组件显示端点信息，Statistic 组件显示实时统计
5. **个人中心页面**：用户基本信息，Statistic 显示账户统计

**P2（管理功能）：**
6. **授权码管理页面**：Table 显示授权码列表，Modal 表单生成新授权码
7. **用户管理页面**：Table 显示用户列表

**P3（文档，可选）：**
8. **使用文档页面**：Typography 组件渲染 markdown
9. **快速开始页面**：Steps 组件展示引导流程（可选）

### Accessibility（可访问性）

**WCAG AA（依赖组件库支持）**

- 色彩对比度由 Ant Design 默认主题保证（符合 WCAG AA）
- 键盘导航由 Ant Design 组件自动支持
- 使用语义化 HTML（`<button>` 而非 `<div onclick>`）
- 表单字段使用 Form.Item 的 label 属性

**MVP 阶段不额外开发自定义可访问性功能。**

### Branding（品牌）

**简约技术风格（基于 Ant Design 默认主题）**

**色彩方案（禁止渐变）：**
- 主色调：Ant Design 蓝 `#1890ff`
- 成功色：`#52c41a`
- 错误色：`#ff4d4f`
- 警告色：`#faad14`
- 中性色：Ant Design 灰度系列
- **禁止使用任何渐变色（gradient）**

**图标规范：**
- **强制使用 SVG 格式**
- 优先使用 `@ant-design/icons` 图标库
- **禁止使用 Emoji**

**字体：**
- 系统字体栈：Ant Design 默认字体配置
- 代码/URL：`font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace`

**组件库选择：**
- **Ant Design 5.x**（最新稳定版）
- 理由：中文文档完善，组件丰富，图标全部 SVG，主题配置简单

### Target Device and Platforms（目标设备和平台）

**Web Responsive（桌面优先，移动端基础支持）**

- **主要支持：** 桌面浏览器（Chrome 90+、Firefox 88+、Safari 14+、Edge 90+）
- **屏幕分辨率：** 1280x720 及以上（主要优化目标）
- **移动端：** 基础可用（可以登录、查看列表、复制 URL），但不优化复杂交互
- **不支持 IE 11** 及更早版本

**说明：** Ant Design 提供基础的响应式布局，MVP 阶段无需额外优化移动端体验。

---

## Technical Assumptions

### Repository Structure（仓库结构）

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

### Service Architecture（服务架构）

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

### Testing Requirements（测试要求）

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

### Additional Technical Assumptions and Requests（额外技术假设）

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

## Epic List

### Epic 1: 项目基础与用户认证系统
**目标：** 建立完整的项目基础设施（Monorepo、数据库、前后端框架），实现授权码系统和用户注册登录功能，交付一个用户可以注册并登录的系统。

### Epic 2: WebSocket 端点管理
**目标：** 实现端点的创建、查询、删除功能，提供完整的端点管理界面和个人中心，让用户可以管理自己的 WebSocket 端点（但消息转发功能尚未实现）。

### Epic 3: WebSocket 消息转发核心服务
**目标：** 实现 WebSocket 服务器、消息路由与广播逻辑、端点隔离机制，交付完整的 WebSocket 消息转发功能，让多个客户端可以通过端点实时通信。

### Epic 4: 监控、管理与文档完善
**目标：** 实现实时监控功能、管理员后台、使用文档和部署优化，交付一个生产环境就绪的完整 MVP 系统。

---

## Epic 1: 项目基础与用户认证系统

**Epic 目标（扩展）：** 建立完整的 Monorepo 项目结构，配置 TypeScript、ESLint、Prettier 等开发工具链，初始化前端（React + Vite + Ant Design）和后端（Express + Prisma + MySQL）框架。实现数据库表结构设计（用户表、授权码表），完成 JWT 认证机制。交付用户注册和登录功能，包括授权码验证、密码加密存储、前端表单页面。此 Epic 完成后，用户可以使用授权码注册账号并成功登录系统。

### Story 1.1: 初始化 Monorepo 项目结构与开发工具配置

**As a** 开发者，
**I want** 初始化 Monorepo 项目结构并配置开发工具链，
**so that** 团队有统一的代码规范和高效的开发环境。

**Acceptance Criteria:**

1. 创建 Monorepo 根目录，使用 pnpm workspace 配置
2. 创建 `packages/frontend` 和 `packages/backend` 子项目目录
3. 配置 TypeScript（tsconfig.json），支持 ES2022 和严格模式
4. 配置 ESLint 和 Prettier，统一代码风格
5. 配置 Husky + lint-staged，Git commit 前自动运行代码检查
6. 创建 `.env.example` 文件，列出所有必需的环境变量
7. 创建根目录 `package.json`，包含常用脚本（`lint`, `format`, `test`）
8. 项目可以成功运行 `pnpm install` 并通过 lint 检查

### Story 1.2: 初始化后端项目与数据库连接

**As a** 后端开发者，
**I want** 搭建 Express 服务器并连接 MySQL 数据库，
**so that** 后续可以开发 REST API 和持久化数据。

**Acceptance Criteria:**

1. 在 `packages/backend` 中初始化 Express 项目，使用 TypeScript
2. 安装并配置必要依赖（express、cors、dotenv、bcrypt、jsonwebtoken）
3. 创建基础的 Express 服务器，监听 3000 端口
4. 实现健康检查路由 `GET /api/health`，返回 `{ status: "ok" }`
5. 安装并配置 Prisma ORM，连接 MySQL 数据库
6. 配置 CORS 中间件，允许前端开发服务器访问
7. 配置错误处理中间件，统一返回错误格式
8. 运行 `npm run dev` 后，访问 `http://localhost:3000/api/health` 返回正确响应

### Story 1.3: 设计并创建数据库表结构

**As a** 后端开发者，
**I want** 使用 Prisma Schema 定义用户表和授权码表，
**so that** 可以持久化用户信息和授权码数据。

**Acceptance Criteria:**

1. 在 `prisma/schema.prisma` 中定义 `User` 模型，包含字段：id, username, email, password_hash, is_admin, created_at
2. 在 `prisma/schema.prisma` 中定义 `InviteCode` 模型，包含字段：id, code, expires_at, used_by, used_at, created_by, created_at
3. 确保 username 和 email 字段为唯一索引
4. 确保 code 字段为唯一索引
5. 配置 User 和 InviteCode 之间的外键关系
6. 运行 `npx prisma migrate dev --name init` 成功创建数据库表
7. 运行 `npx prisma studio` 可以查看数据库表结构

### Story 1.4: 实现授权码验证和用户注册 API

**As a** 后端开发者，
**I want** 实现授权码验证逻辑和用户注册 API，
**so that** 用户可以使用有效授权码注册账号。

**Acceptance Criteria:**

1. 实现 `POST /api/auth/register` API，接收 `{ inviteCode, username, email, password }`
2. 验证授权码存在且未被使用且未过期
3. 验证 username 和 email 未被占用
4. 使用 bcrypt 加密密码（salt rounds = 10）
5. 创建新用户记录，并更新授权码的 `used_by` 和 `used_at` 字段
6. 返回成功响应，包含用户基本信息（不含密码）
7. 如果授权码无效/已使用/过期，返回 400 错误和清晰的错误消息
8. 如果用户名/邮箱已存在，返回 409 错误
9. 使用 Postman/curl 测试 API，验证所有场景

### Story 1.5: 实现用户登录和 JWT Token 生成

**As a** 后端开发者，
**I want** 实现用户登录 API 和 JWT Token 生成，
**so that** 用户可以登录并获得访问令牌。

**Acceptance Criteria:**

1. 实现 `POST /api/auth/login` API，接收 `{ username, password }`
2. 根据 username 查询用户，使用 bcrypt 验证密码
3. 如果验证成功，生成 JWT Token，payload 包含 `{ userId, username, isAdmin }`，过期时间 7 天
4. 返回 `{ token, user: { id, username, email, isAdmin } }`
5. 如果用户名不存在或密码错误，返回 401 错误和"用户名或密码错误"消息
6. 实现 JWT 验证中间件 `authenticateToken`，用于保护需要认证的路由
7. 创建测试路由 `GET /api/auth/me`（需要认证），返回当前用户信息
8. 使用 Postman 测试登录流程和受保护路由访问

### Story 1.6: 初始化前端项目与路由配置

**As a** 前端开发者，
**I want** 搭建 React + Vite + Ant Design 项目并配置路由，
**so that** 可以开发注册和登录页面。

**Acceptance Criteria:**

1. 在 `packages/frontend` 中使用 Vite 创建 React + TypeScript 项目
2. 安装 Ant Design 5.x 和 `@ant-design/icons`
3. 安装 React Router 和 Axios
4. 配置 React Router，创建以下路由：`/login`, `/register`, `/dashboard`（占位页面）
5. 创建 `AuthContext` 用于管理用户登录状态（使用 Context API）
6. 配置 Axios baseURL 为后端 API 地址，添加请求拦截器自动附加 JWT Token
7. 创建通用的 Layout 组件（使用 Ant Design Layout）
8. 运行 `npm run dev`，可以访问 `http://localhost:5173` 并看到基础布局

### Story 1.7: 实现用户注册页面

**As a** 用户，
**I want** 在注册页面输入授权码和账户信息完成注册，
**so that** 我可以创建自己的账号。

**Acceptance Criteria:**

1. 创建注册页面组件 `/register`，使用 Ant Design Form 和 Card 布局
2. 表单包含字段：授权码、用户名、邮箱、密码、确认密码
3. 实现客户端表单验证（必填、邮箱格式、密码长度 >= 8、密码一致性）
4. 点击"注册"按钮，调用 `POST /api/auth/register` API
5. 注册成功后，显示 `message.success('注册成功')` 并自动跳转到登录页
6. 注册失败时，显示 `message.error()` 并展示服务器返回的错误消息
7. 表单提交时显示 loading 状态，按钮禁用防止重复提交
8. 页面底部显示"已有账号？去登录"链接，点击跳转到登录页

### Story 1.8: 实现用户登录页面和认证状态管理

**As a** 用户，
**I want** 在登录页面输入用户名和密码登录系统，
**so that** 我可以访问我的端点管理页面。

**Acceptance Criteria:**

1. 创建登录页面组件 `/login`，使用 Ant Design Form 和 Card 布局
2. 表单包含字段：用户名、密码
3. 实现客户端表单验证（必填）
4. 点击"登录"按钮，调用 `POST /api/auth/login` API
5. 登录成功后，将 JWT Token 存储到 localStorage
6. 更新 AuthContext 状态（设置当前用户信息）
7. 显示 `message.success('登录成功')` 并跳转到 `/dashboard`
8. 登录失败时，显示 `message.error('用户名或密码错误')`
9. 表单提交时显示 loading 状态
10. 页面底部显示"还没有账号？去注册"链接
11. 实现受保护路由：未登录访问 `/dashboard` 自动重定向到 `/login`

---

## Epic 2: WebSocket 端点管理

**Epic 目标（扩展）：** 实现端点（Endpoint）的完整 CRUD 功能，包括数据库表设计、后端 REST API 和前端管理界面。用户登录后可以创建新的 WebSocket 端点（系统自动生成唯一 ID 和 URL），查看自己的端点列表，查看单个端点的详细信息，以及删除不需要的端点。同时实现个人中心页面，展示用户的基本信息和统计数据。此 Epic 完成后，用户可以管理端点并获得 WebSocket URL，但消息转发功能尚未实现（将在 Epic 3 中完成）。

### Story 2.1: 创建 Endpoints 数据库表

**As a** 后端开发者，
**I want** 使用 Prisma Schema 定义 Endpoints 表，
**so that** 可以持久化用户创建的 WebSocket 端点信息。

**Acceptance Criteria:**

1. 在 `prisma/schema.prisma` 中定义 `Endpoint` 模型，包含字段：id (主键), endpoint_id (唯一, 用于 URL), user_id (外键), name (用户自定义名称), created_at, last_active_at
2. 确保 endpoint_id 字段为唯一索引
3. 配置 Endpoint 和 User 之间的外键关系（一对多：一个用户可以有多个端点）
4. 运行 `npx prisma migrate dev --name add_endpoints` 成功创建数据库表
5. 运行 `npx prisma studio` 可以查看 Endpoints 表结构
6. 编写简单的 seed 脚本，创建 1-2 个测试端点数据（可选）

### Story 2.2: 实现创建端点 API

**As a** 后端开发者，
**I want** 实现创建端点的 REST API，
**so that** 用户可以通过 API 创建新的 WebSocket 端点。

**Acceptance Criteria:**

1. 实现 `POST /api/endpoints` API（需要 JWT 认证），接收 `{ name }` （name 可选，默认为"未命名端点"）
2. 生成唯一的 endpoint_id（使用 nanoid 或 uuid，8-12 位字符）
3. 将 endpoint 记录保存到数据库，关联当前登录用户的 user_id
4. 返回创建的端点信息：`{ id, endpoint_id, name, websocket_url, created_at }`，其中 websocket_url 格式为 `wss://domain.com/ws/{endpoint_id}`
5. 如果用户已创建的端点数量超过限制（例如 5 个），返回 400 错误"已达到端点数量上限"
6. 如果 endpoint_id 生成冲突（极小概率），自动重试生成
7. 使用 Postman 测试 API，验证创建成功和错误场景

### Story 2.3: 实现查询端点列表 API

**As a** 后端开发者，
**I want** 实现查询当前用户端点列表的 API，
**so that** 前端可以展示用户的所有端点。

**Acceptance Criteria:**

1. 实现 `GET /api/endpoints` API（需要 JWT 认证）
2. 查询当前登录用户的所有端点，按创建时间倒序排列
3. 返回端点列表数组，每个端点包含：`{ id, endpoint_id, name, websocket_url, created_at, last_active_at }`
4. 如果用户没有任何端点，返回空数组 `[]`
5. 使用 Postman 测试 API，验证返回数据格式正确

### Story 2.4: 实现查询单个端点详情和删除端点 API

**As a** 后端开发者，
**I want** 实现查询单个端点详情和删除端点的 API，
**so that** 用户可以查看端点详情并删除不需要的端点。

**Acceptance Criteria:**

1. 实现 `GET /api/endpoints/:id` API（需要 JWT 认证）
2. 查询指定 id 的端点，返回完整信息：`{ id, endpoint_id, name, websocket_url, created_at, last_active_at }`
3. 验证端点属于当前登录用户，如果不属于返回 403 错误"无权访问此端点"
4. 如果端点不存在，返回 404 错误"端点不存在"
5. 实现 `DELETE /api/endpoints/:id` API（需要 JWT 认证）
6. 删除指定 id 的端点记录
7. 验证端点属于当前登录用户，如果不属于返回 403 错误
8. 删除成功后返回 `{ message: "端点已删除" }`
9. 使用 Postman 测试查询和删除 API，验证所有场景

### Story 2.5: 实现端点管理主页前端（列表展示）

**As a** 用户，
**I want** 在端点管理主页查看我的所有端点列表，
**so that** 我可以了解我创建了哪些端点。

**Acceptance Criteria:**

1. 创建端点管理主页组件 `/dashboard`，使用 Ant Design Layout
2. 页面加载时调用 `GET /api/endpoints` 获取端点列表
3. 使用 Ant Design Table 或 List 组件展示端点列表
4. 每个端点显示：端点名称、WebSocket URL、创建时间、最后活跃时间
5. WebSocket URL 旁边显示"复制"按钮（使用 Ant Design Button + CopyOutlined 图标）
6. 如果列表为空，显示 Empty 组件提示"还没有端点，点击创建按钮开始"
7. 页面顶部显示用户欢迎信息（如"欢迎，{username}"）和"创建端点"按钮
8. 加载数据时显示 Spin 加载动画
9. 如果 API 请求失败，显示 `message.error()` 错误提示

### Story 2.6: 实现创建端点功能（前端）

**As a** 用户，
**I want** 点击"创建端点"按钮创建新的 WebSocket 端点，
**so that** 我可以获得一个可用的 WebSocket URL。

**Acceptance Criteria:**

1. 点击端点管理主页的"创建端点"按钮，弹出 Modal 对话框
2. Modal 中包含表单，字段：端点名称（可选，默认"未命名端点"）
3. 点击"确定"按钮，调用 `POST /api/endpoints` API
4. 创建成功后，显示 `message.success('端点创建成功')`
5. 关闭 Modal，刷新端点列表（重新调用 `GET /api/endpoints`）
6. 创建失败时，显示 `message.error()` 并展示服务器返回的错误消息
7. 表单提交时按钮显示 loading 状态
8. 如果用户达到端点数量上限，显示错误提示"已达到端点数量上限（5个）"

### Story 2.7: 实现端点详情页和删除功能

**As a** 用户，
**I want** 点击端点列表中的某个端点查看详情，并可以删除该端点，
**so that** 我可以管理我的端点。

**Acceptance Criteria:**

1. 在端点列表中，每个端点添加"查看详情"链接或按钮
2. 点击后跳转到端点详情页 `/endpoints/:id`
3. 详情页调用 `GET /api/endpoints/:id` 获取端点详细信息
4. 使用 Ant Design Descriptions 组件展示端点信息：端点名称、endpoint_id、WebSocket URL、创建时间、最后活跃时间
5. WebSocket URL 旁边显示"复制"按钮，点击复制 URL 到剪贴板并显示 `message.success('已复制')`
6. 详情页底部显示"删除端点"按钮（Danger 样式）
7. 点击删除按钮，弹出 `Modal.confirm()` 确认对话框："确定要删除此端点吗？删除后无法恢复。"
8. 确认后调用 `DELETE /api/endpoints/:id` API
9. 删除成功后，显示 `message.success('端点已删除')` 并跳转回端点管理主页
10. 删除失败时，显示 `message.error()`

### Story 2.8: 实现个人中心页面

**As a** 用户，
**I want** 在个人中心查看我的账户信息和统计数据，
**so that** 我可以了解我的账户状态。

**Acceptance Criteria:**

1. 创建个人中心页面组件 `/profile`
2. 在顶部导航栏添加"个人中心"链接（使用 Ant Design Menu）
3. 使用 Ant Design Card 和 Descriptions 组件展示用户基本信息：用户名、邮箱、注册时间
4. 使用 Ant Design Statistic 组件展示统计数据：
   - 总端点数（调用 `GET /api/endpoints` 获取列表长度）
   - 账户创建天数（根据 created_at 计算）
5. 页面底部显示"退出登录"按钮（Danger 样式）
6. 点击退出登录按钮，清除 localStorage 中的 JWT Token
7. 更新 AuthContext 状态（清除用户信息）
8. 显示 `message.success('已退出登录')` 并跳转到登录页

---

## Epic 3: WebSocket 消息转发核心服务

**Epic 目标（扩展）：** 实现独立的 WebSocket 服务器，负责接收客户端连接、根据端点 ID 进行消息路由、在同一端点的多个客户端之间广播消息，以及确保不同端点的消息完全隔离。实现连接管理逻辑，包括连接建立、心跳检测、断线处理。编写 WebSocket 客户端测试脚本，验证消息转发功能。实现前端实时连接状态显示和消息统计。此 Epic 完成后，WebSocket 端点真正可用，用户可以通过获得的 URL 连接并实现多客户端实时通信。

### Story 3.1: 初始化 WebSocket 服务器项目

**As a** 后端开发者，
**I want** 在 backend 中创建独立的 WebSocket 服务器，
**so that** 可以接收和处理 WebSocket 连接。

**Acceptance Criteria:**

1. 在 `packages/backend/src` 中创建 `websocket` 目录
2. 安装 `ws` 库（原生 WebSocket 库）
3. 创建 WebSocket 服务器，监听 3001 端口
4. 实现基础的连接处理：`ws.on('connection', (socket) => { ... })`
5. 连接建立时打印日志："New WebSocket connection established"
6. 连接断开时打印日志："WebSocket connection closed"
7. 创建启动脚本 `npm run ws-server`，可以独立启动 WebSocket 服务器
8. 使用浏览器 WebSocket 测试工具或 `wscat` 验证可以成功连接到 `ws://localhost:3001`

### Story 3.2: 实现端点 ID 解析和连接映射管理

**As a** 后端开发者，
**I want** 从 WebSocket 连接 URL 中提取 endpoint_id 并建立映射关系，
**so that** 可以将消息路由到正确的端点。

**Acceptance Criteria:**

1. WebSocket 连接 URL 格式：`ws://localhost:3001/ws/{endpoint_id}`
2. 从连接请求的 URL 中解析出 endpoint_id（使用 `url.parse()` 或类似方法）
3. 如果 URL 格式不正确或缺少 endpoint_id，拒绝连接并发送错误消息
4. 验证 endpoint_id 在数据库中存在（查询 Prisma Endpoint 表）
5. 如果 endpoint_id 不存在，拒绝连接并发送 "Invalid endpoint" 错误
6. 创建内存 Map 数据结构：`Map<endpoint_id, Set<WebSocket>>`，存储端点到连接的映射
7. 连接建立时，将 WebSocket 对象添加到对应 endpoint_id 的 Set 中
8. 连接断开时，从 Set 中移除 WebSocket 对象
9. 使用 `wscat -c "ws://localhost:3001/ws/{valid_endpoint_id}"` 测试，验证连接成功
10. 使用无效 endpoint_id 测试，验证连接被拒绝

### Story 3.3: 实现消息路由和广播逻辑

**As a** 后端开发者，
**I want** 实现消息在同一端点多个客户端之间的广播转发，
**so that** 用户可以进行实时通信。

**Acceptance Criteria:**

1. 监听 WebSocket 的 `message` 事件：`socket.on('message', (data) => { ... })`
2. 解析接收到的消息（假设为 JSON 格式）
3. 根据发送者的 endpoint_id，查找该端点的所有连接（从 Map 中获取 Set）
4. 将消息广播给同一端点的所有其他客户端（不包括发送者本身）
5. 如果消息格式不是有效 JSON，记录警告日志但不中断连接
6. 实现广播函数：`broadcastToEndpoint(endpointId, message, senderSocket)`
7. 添加错误处理：如果某个客户端发送失败，记录日志但继续发送给其他客户端
8. 使用两个 `wscat` 客户端连接到同一 endpoint_id 进行测试
9. 验证：客户端 A 发送消息，客户端 B 能收到，但客户端 A 自己不收到（不回显）
10. 验证：客户端 B 发送消息，客户端 A 能收到

### Story 3.4: 实现端点隔离机制

**As a** 后端开发者，
**I want** 确保不同端点的消息完全隔离，
**so that** 用户的消息不会泄露到其他端点。

**Acceptance Criteria:**

1. 使用测试脚本创建两个不同的 endpoint（endpoint_A 和 endpoint_B）
2. 启动 4 个 WebSocket 客户端：
   - 客户端 1 和 2 连接到 endpoint_A
   - 客户端 3 和 4 连接到 endpoint_B
3. 客户端 1 发送消息 "Hello from A"
4. 验证：客户端 2 能收到消息，客户端 3 和 4 收不到
5. 客户端 3 发送消息 "Hello from B"
6. 验证：客户端 4 能收到消息，客户端 1 和 2 收不到
7. 检查 Map 数据结构，确认两个 endpoint_id 分别管理各自的 Set<WebSocket>
8. 编写自动化测试脚本（使用 Node.js ws 客户端库），验证隔离机制

### Story 3.5: 实现连接统计和数据库更新

**As a** 后端开发者，
**I want** 统计端点的连接数和消息数，并更新到数据库，
**so that** 前端可以展示实时监控数据。

**Acceptance Criteria:**

1. 在 Prisma Schema 中创建 `EndpointStats` 模型，包含字段：id, endpoint_id (外键), total_connections (累计连接数), total_messages (累计消息数), current_connections (当前在线数), updated_at
2. 运行 `npx prisma migrate dev --name add_endpoint_stats` 创建表
3. 连接建立时，递增 total_connections 和 current_connections
4. 连接断开时，递减 current_connections
5. 消息转发成功时，递增 total_messages
6. 更新 `Endpoint` 表的 `last_active_at` 字段为当前时间（每次有消息时更新）
7. 实现统计更新函数：`updateEndpointStats(endpointId, action)`，action 可以是 'connect', 'disconnect', 'message'
8. 使用 Prisma 的 `upsert` 操作，确保 EndpointStats 记录存在
9. 使用 Prisma Studio 查看统计数据，验证数据正确更新

### Story 3.6: 实现获取端点实时统计数据 API

**As a** 后端开发者，
**I want** 实现获取端点实时统计数据的 API，
**so that** 前端可以展示当前连接数和消息统计。

**Acceptance Criteria:**

1. 实现 `GET /api/endpoints/:id/stats` API（需要 JWT 认证）
2. 验证端点属于当前登录用户
3. 从 EndpointStats 表查询统计数据
4. 返回 `{ current_connections, total_connections, total_messages, last_active_at }`
5. 如果 EndpointStats 记录不存在，返回默认值：`{ current_connections: 0, total_connections: 0, total_messages: 0, last_active_at: null }`
6. 如果端点不存在或无权访问，返回 403/404 错误
7. 使用 Postman 测试 API，验证返回数据正确

### Story 3.7: 前端展示端点实时连接数和统计数据

**As a** 用户，
**I want** 在端点详情页实时查看当前连接数和消息统计，
**so that** 我可以监控端点的使用情况。

**Acceptance Criteria:**

1. 在端点详情页（`/endpoints/:id`）中添加统计数据展示区域
2. 页面加载时调用 `GET /api/endpoints/:id/stats` 获取统计数据
3. 使用 Ant Design Statistic 组件展示：
   - 当前连接数（使用 Badge 组件显示在线状态：绿色=有连接，灰色=无连接）
   - 累计连接数
   - 累计消息数
   - 最后活跃时间（格式化显示，如"2 分钟前"）
4. 实现定时刷新：每 5 秒自动调用一次 API 更新统计数据（使用 `setInterval`）
5. 组件卸载时清除定时器（使用 `useEffect` cleanup）
6. 如果 API 请求失败，显示 `message.error()` 但不中断定时刷新
7. 统计数据使用卡片布局，视觉上与端点信息区分开

### Story 3.8: 编写 WebSocket 客户端使用文档和示例代码

**As a** 用户，
**I want** 查看 WebSocket 客户端连接示例代码和使用说明，
**so that** 我可以快速集成到我的应用中。

**Acceptance Criteria:**

1. 在 `docs/` 目录创建 `websocket-usage.md` 文档
2. 文档包含以下章节：
   - **快速开始**：5 分钟快速上手指南
   - **连接 WebSocket**：JavaScript 浏览器客户端示例代码
   - **发送和接收消息**：完整的消息收发示例
   - **错误处理**：连接失败、断线重连的处理方式
   - **消息格式**：JSON 格式说明和示例
3. 提供浏览器 JavaScript 示例：
   ```javascript
   const ws = new WebSocket('wss://domain.com/ws/{your-endpoint-id}');
   ws.onopen = () => console.log('Connected');
   ws.onmessage = (event) => console.log('Message:', event.data);
   ws.send(JSON.stringify({ type: 'message', data: 'Hello' }));
   ```
4. 提供 Node.js 示例（使用 `ws` 库）
5. 在前端端点详情页添加"查看使用文档"链接，跳转到文档页面
6. 文档页面使用 Ant Design Typography 组件渲染 markdown 内容
7. 代码示例使用代码高亮（可选，使用 `react-syntax-highlighter`）

---

## Epic 4: 监控、管理与文档完善

**Epic 目标（扩展）：** 实现管理员后台，包括授权码生成、用户管理功能。完善前端监控功能，优化用户体验。创建使用文档和快速开始指南。实施基础的测试（后端单元测试和 WebSocket 集成测试）。配置生产环境部署（PM2、Nginx、环境变量），编写部署文档。此 Epic 完成后，系统达到生产环境就绪状态，管理员可以有效管理用户和授权码，用户可以通过文档快速上手。

### Story 4.1: 实现管理员授权码生成 API

**As a** 后端开发者，
**I want** 实现管理员生成授权码的 API，
**so that** 管理员可以控制用户注册。

**Acceptance Criteria:**

1. 实现 `POST /api/admin/invite-codes` API（需要 JWT 认证，且 `isAdmin` 为 true）
2. 接收参数：`{ expires_at }` (可选，Unix 时间戳或 ISO 8601 日期字符串)
3. 生成随机授权码（8-12 位字符，使用 nanoid 或类似库）
4. 将授权码保存到 InviteCode 表，`created_by` 为当前管理员用户 ID
5. 返回创建的授权码信息：`{ id, code, expires_at, created_at }`
6. 如果请求用户不是管理员，返回 403 错误 "需要管理员权限"
7. 使用 Postman 测试，验证管理员可以成功创建授权码

### Story 4.2: 实现管理员查询授权码列表和用户列表 API

**As a** 后端开发者，
**I want** 实现查询授权码列表和用户列表的 API，
**so that** 管理员可以查看系统使用情况。

**Acceptance Criteria:**

1. 实现 `GET /api/admin/invite-codes` API（需要管理员权限）
2. 返回所有授权码列表，包含字段：`{ id, code, expires_at, used_by, used_at, created_by, created_at }`
3. 如果授权码已使用，关联查询 used_by 用户的 username
4. 按创建时间倒序排列
5. 实现 `GET /api/admin/users` API（需要管理员权限）
6. 返回所有用户列表，包含字段：`{ id, username, email, is_admin, created_at, endpoint_count }`
7. 使用子查询或聚合函数计算每个用户的 endpoint_count（端点数量）
8. 按注册时间倒序排列
9. 如果请求用户不是管理员，两个 API 都返回 403 错误
10. 使用 Postman 测试，验证返回数据格式正确

### Story 4.3: 实现管理员后台前端（授权码管理）

**As a** 管理员，
**I want** 在管理后台生成和查看授权码，
**so that** 我可以控制用户注册。

**Acceptance Criteria:**

1. 创建管理后台页面 `/admin/invite-codes`（需要管理员权限，普通用户访问显示 403 提示）
2. 页面顶部显示"生成授权码"按钮
3. 点击按钮弹出 Modal，包含可选的"有效期"字段（使用 Ant Design DatePicker）
4. 点击"生成"按钮，调用 `POST /api/admin/invite-codes` API
5. 生成成功后，显示 `message.success()` 并刷新授权码列表
6. 使用 Ant Design Table 组件展示授权码列表
7. Table 列：授权码、状态（未使用/已使用）、使用者、有效期、创建时间
8. 授权码列显示"复制"按钮，点击复制授权码到剪贴板
9. 状态列使用 Tag 组件：未使用=蓝色，已使用=灰色，已过期=红色
10. 页面加载时调用 `GET /api/admin/invite-codes` 获取列表

### Story 4.4: 实现管理员后台前端（用户管理）

**As a** 管理员，
**I want** 在管理后台查看所有用户列表和统计信息，
**so that** 我可以了解系统使用情况。

**Acceptance Criteria:**

1. 创建用户管理页面 `/admin/users`（需要管理员权限）
2. 使用 Ant Design Table 组件展示用户列表
3. Table 列：用户名、邮箱、管理员标识、端点数量、注册时间
4. 管理员标识使用 Badge 组件（is_admin=true 显示"管理员"徽章）
5. 端点数量列可点击，点击后跳转到该用户的端点列表（可选功能）
6. 支持按用户名搜索（使用 Ant Design Input.Search）
7. 页面加载时调用 `GET /api/admin/users` 获取列表
8. 在顶部导航栏添加"管理后台"下拉菜单（仅管理员可见）
9. 下拉菜单包含"授权码管理"和"用户管理"两个链接

### Story 4.5: 编写后端单元测试和 WebSocket 集成测试

**As a** 开发者，
**I want** 编写测试用例覆盖核心业务逻辑，
**so that** 可以保证代码质量和功能正确性。

**Acceptance Criteria:**

1. 配置 Jest 测试框架（已在 Story 1.1 中配置）
2. 编写授权码验证逻辑的单元测试：
   - 测试有效授权码注册成功
   - 测试无效授权码被拒绝
   - 测试已使用授权码被拒绝
   - 测试过期授权码被拒绝
3. 编写端点创建逻辑的单元测试：
   - 测试成功创建端点
   - 测试 endpoint_id 唯一性
   - 测试端点数量限制
4. 编写 WebSocket 集成测试（使用 `ws` 客户端库）：
   - 测试客户端成功连接
   - 测试消息在同一端点多个客户端之间广播
   - 测试不同端点的消息隔离
   - 测试无效 endpoint_id 连接被拒绝
5. 配置 `npm run test` 命令，运行所有测试
6. 目标覆盖率：核心业务逻辑 > 70%
7. 所有测试通过，CI 友好（可在 GitHub Actions 中运行）

### Story 4.6: 配置生产环境部署和 PM2 进程管理

**As a** DevOps 工程师，
**I want** 配置 PM2 进程管理和环境变量，
**so that** 应用可以在生产环境稳定运行。

**Acceptance Criteria:**

1. 创建 `ecosystem.config.js` PM2 配置文件
2. 配置两个应用进程：
   - `api-server`：Express REST API（端口 3000）
   - `ws-server`：WebSocket 服务器（端口 3001）
3. 配置环境变量：`NODE_ENV=production`
4. 配置进程重启策略：异常退出自动重启
5. 配置日志输出：`error.log` 和 `out.log`
6. 配置 `max_memory_restart`：内存超过限制自动重启
7. 创建 `.env.production` 示例文件
8. 编写启动脚本：`npm run start:prod` 使用 PM2 启动所有进程
9. 验证：运行 `pm2 list` 可以看到两个进程正常运行
10. 验证：运行 `pm2 logs` 可以查看日志输出

### Story 4.7: 创建 Nginx 配置和部署文档

**As a** DevOps 工程师，
**I want** 配置 Nginx 反向代理和 SSL，
**so that** 应用可以通过 HTTPS/WSS 安全访问。

**Acceptance Criteria:**

1. 创建 `nginx.conf` 配置文件模板
2. 配置反向代理：
   - `/` → React 静态文件
   - `/api` → Express API（http://localhost:3000）
   - `/ws` → WebSocket 服务器（http://localhost:3001，配置 WebSocket 升级）
3. 配置 SSL/TLS（使用 Let's Encrypt）
4. 配置 HTTPS 强制重定向
5. 配置 CORS 头（如果需要）
6. 配置 Gzip 压缩
7. 创建部署文档 `docs/deployment.md`，包含：
   - 服务器要求（2核4G，Ubuntu 20.04+）
   - 安装 Node.js、MySQL、Nginx、PM2
   - 克隆代码、安装依赖
   - 配置环境变量
   - 运行数据库迁移
   - 构建前端
   - 配置 Nginx
   - 启动 PM2
   - 配置 Let's Encrypt SSL
8. 文档包含完整的命令步骤，复制即可执行

### Story 4.8: 完善使用文档和 README

**As a** 用户，
**I want** 查看完整的使用文档和项目 README，
**so that** 我可以快速了解项目和上手使用。

**Acceptance Criteria:**

1. 创建项目 `README.md`，包含：
   - 项目简介和核心功能
   - 技术栈说明
   - 本地开发环境搭建步骤
   - 目录结构说明
   - 开发命令（dev、build、test、lint）
   - 贡献指南（可选）
   - 许可证信息（可选）
2. 创建 `docs/quick-start.md` 快速开始指南，包含：
   - 注册账号（如何获取授权码）
   - 创建端点
   - 连接 WebSocket（代码示例）
   - 测试消息转发
   - 常见问题 FAQ
3. 在前端创建"帮助"或"文档"页面（`/docs`），展示快速开始指南
4. 在端点详情页添加"如何使用"提示，引导用户查看文档
5. 文档使用 Markdown 格式，易于维护
6. 文档包含截图（可选）

---

## Checklist Results Report

本 PRD 已通过 PM 质量检查清单验证，整体完成度 **95%**，评估为 **READY FOR ARCHITECT**。

**关键发现：**
- ✅ PRD 结构完整，包含所有核心部分
- ✅ 需求清晰具体，可测试性强
- ✅ Epic 和 Story 拆分合理，符合敏捷实践
- ✅ 技术假设明确，为架构师提供充足指导
- ✅ 32 个 Stories，工作量估计合理（约 70-90 小时）

**验证结果：**
- Problem Definition & Context: **PASS** (95%)
- MVP Scope Definition: **PASS** (95%)
- User Experience Requirements: **PASS** (90%)
- Functional Requirements: **PASS** (100%)
- Non-Functional Requirements: **PASS** (95%)
- Epic & Story Structure: **PASS** (100%)
- Technical Guidance: **PASS** (100%)
- Cross-Functional Requirements: **PARTIAL** (80%)
- Clarity & Communication: **PASS** (95%)

架构师可以立即开始系统架构设计工作。

---

## Next Steps

### UX Expert Prompt

你好！我是 UX 专家，现在需要为 **WebSocket 中继共享平台** 设计用户体验架构。

请阅读以下文档：
- **PRD 文档：** `docs/prd.md` - 完整的产品需求文档
- **Project Brief：** `docs/brief.md` - 项目简介和背景信息

**你的任务：**

1. 基于 PRD 的 **UI Design Goals** 部分，设计详细的用户界面规范
2. 创建核心页面的线框图或组件结构图
3. 设计用户流程图（注册→登录→创建端点→连接测试）
4. 定义 Ant Design 组件使用规范和自定义样式指南
5. 确保所有设计符合 PRD 的约束：
   - 禁止渐变色
   - 禁止 Emoji
   - 强制使用 SVG 图标
   - 最大化复用 Ant Design 组件
   - 桌面优先，移动端基础支持

**交付物：**
- UX 设计文档（`docs/ux-design.md`）
- 核心页面线框图或组件树（可选）
- 用户流程图（推荐使用 Mermaid）
- Ant Design 主题配置建议

**关键参考：**
- PRD 的 **Core Screens and Views** 列出了 9 个核心页面
- PRD 的 **Key Interaction Paradigms** 定义了交互原则
- PRD 的 **Branding** 部分定义了色彩方案

请开始 UX 设计工作！

### Architect Prompt

你好！我是系统架构师，现在需要为 **WebSocket 中继共享平台** 设计技术架构。

请阅读以下文档：
- **PRD 文档：** `docs/prd.md` - 完整的产品需求文档
- **Project Brief：** `docs/brief.md` - 项目简介和背景信息

**你的任务：**

1. 设计系统架构，包括：
   - 整体系统架构图（REST API + WebSocket Server + Database）
   - 数据库 Schema 详细设计（基于 Story 1.3、2.1、3.5）
   - API 接口设计（所有 REST API 端点和 WebSocket 协议）
   - 目录结构设计（Monorepo 的详细文件组织）

2. 技术选型验证和细化：
   - 验证 PRD 中的技术选型是否合理
   - 细化 TypeScript 配置、Prisma Schema、WebSocket 服务器架构
   - 设计 JWT 认证流程和中间件架构
   - 设计 WebSocket 消息路由机制（`Map<endpoint_id, Set<WebSocket>>`）

3. 关键技术决策：
   - WebSocket 连接池管理策略
   - 数据库连接池配置
   - 错误处理和日志记录策略
   - 安全措施实施细节（bcrypt、JWT、CORS、速率限制）

4. 风险评估和缓解：
   - 并发瓶颈风险
   - WebSocket 内存泄漏风险
   - 安全漏洞风险
   - 针对每个风险提出缓解方案

5. 开发环境和部署架构：
   - 本地开发环境配置
   - PM2 进程管理配置
   - Nginx 反向代理配置
   - 生产环境部署流程

**交付物：**
- 架构设计文档（`docs/architecture.md`）
- 系统架构图（推荐使用 Mermaid）
- 数据库 Schema（Prisma Schema 格式）
- API 规范文档（可选：OpenAPI/Swagger 格式）
- 技术风险评估报告

**关键参考：**
- PRD 的 **Technical Assumptions** 明确了所有技术选型
- PRD 的 **Requirements** 定义了 20 个功能需求和 12 个非功能需求
- PRD 的 **Epic Details** 包含 32 个 Stories，详细描述了实现细节
- Brief 的 **Technical Considerations** 提供了架构设计指导

**特别注意：**
- 架构必须支持 MVP 的性能要求：<100ms 延迟、10 个端点、5 个连接/端点
- WebSocket 服务器必须支持端点隔离和消息广播
- 数据库设计必须支持统计数据的高效查询

请开始架构设计工作！

---
