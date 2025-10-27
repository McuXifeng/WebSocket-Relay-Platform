# Epic 1: 项目基础与用户认证系统

**Epic 目标（扩展）：** 建立完整的 Monorepo 项目结构，配置 TypeScript、ESLint、Prettier 等开发工具链，初始化前端（React + Vite + Ant Design）和后端（Express + Prisma + MySQL）框架。实现数据库表结构设计（用户表、授权码表），完成 JWT 认证机制。交付用户注册和登录功能，包括授权码验证、密码加密存储、前端表单页面。此 Epic 完成后，用户可以使用授权码注册账号并成功登录系统。

## Story 1.1: 初始化 Monorepo 项目结构与开发工具配置

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

## Story 1.2: 初始化后端项目与数据库连接

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

## Story 1.3: 设计并创建数据库表结构

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

## Story 1.4: 实现授权码验证和用户注册 API

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

## Story 1.5: 实现用户登录和 JWT Token 生成

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

## Story 1.6: 初始化前端项目与路由配置

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

## Story 1.7: 实现用户注册页面

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

## Story 1.8: 实现用户登录页面和认证状态管理

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
