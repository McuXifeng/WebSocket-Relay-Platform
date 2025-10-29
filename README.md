# WebSocket Relay Platform

一个基于 WebSocket 的实时消息中转平台，支持多客户端连接、消息路由和用户管理。

## 项目简介

WebSocket Relay Platform 是一个企业级的实时通信平台，采用 Monorepo 架构，提供以下核心功能：

- 🔌 **WebSocket 实时通信**：高性能的 WebSocket 服务器，支持双向实时消息传输
- 🔐 **用户认证与授权**：基于 JWT 的安全认证机制
- 📡 **消息中转**：支持多个终端之间的消息路由和转发
- 🎯 **连接管理**：智能的连接池管理和状态监控
- 🎨 **现代化 UI**：基于 Ant Design 5.x 的企业级界面

## 技术栈

### 前端

- **React 18.2+** - 现代化 UI 框架
- **TypeScript 5.3+** - 类型安全
- **Ant Design 5.x** - 企业级组件库
- **Vite 5.x** - 快速构建工具
- **Axios** - HTTP 客户端

### 后端

- **Node.js 20.x** - 运行时环境
- **Express 4.18+** - REST API 服务器
- **TypeScript 5.3+** - 类型安全
- **ws 8.x** - WebSocket 库
- **Prisma 5.x** - ORM 数据库访问
- **MySQL 8.0+** - 关系型数据库
- **JWT** - 身份认证

### 开发工具

- **pnpm 8.x** - 包管理器
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Husky** - Git hooks
- **Jest/Vitest** - 测试框架

## 前置要求

在开始之前，请确保已安装以下软件：

- Node.js 20.x LTS 或更高版本
- pnpm 8.x 或更高版本
- MySQL 8.0 或更高版本

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd websocket-relay-platform
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制环境变量模板并根据实际情况修改：

```bash
# 前端环境变量
cp .env.example packages/frontend/.env.local

# 后端环境变量
cp .env.example packages/backend/.env
```

### 4. 初始化数据库

```bash
cd packages/backend
pnpm prisma:migrate
pnpm prisma:generate
```

### 5. 启动开发服务器

```bash
# 回到根目录
cd ../..

# 同时启动前端和后端开发服务器
pnpm dev
```

前端服务将在 `http://localhost:5173` 启动
后端 API 服务将在 `http://localhost:3000` 启动
WebSocket 服务将在 `ws://localhost:3001` 启动

## 项目结构

```
websocket-relay-platform/
├── packages/
│   ├── frontend/          # React 前端应用
│   ├── backend/           # Express + WebSocket 后端
│   └── shared/            # 共享类型和工具
├── docs/                  # 项目文档
├── .husky/                # Git hooks
├── package.json           # 根 package.json
├── pnpm-workspace.yaml    # pnpm workspace 配置
└── tsconfig.json          # TypeScript 基础配置
```

## 可用脚本

### 根目录脚本

```bash
# 开发模式（同时启动前后端）
pnpm dev

# 构建所有包
pnpm build

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 运行测试
pnpm test
```

### 前端脚本

```bash
cd packages/frontend

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview
```

### 后端脚本

```bash
cd packages/backend

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build

# 启动生产服务器
pnpm start

# 运行测试
pnpm test

# Prisma 相关
pnpm prisma:generate   # 生成 Prisma Client
pnpm prisma:migrate    # 运行数据库迁移
pnpm prisma:studio     # 打开 Prisma Studio
```

## 开发规范

### 代码风格

项目使用 ESLint 和 Prettier 来保持代码风格的一致性。提交代码前会自动运行代码检查和格式化。

### Git 提交规范

建议使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: 添加新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 类型安全

- 所有共享类型定义在 `packages/shared/src/types`
- 前后端统一导入共享类型
- 禁止使用 `any` 类型（除非特殊情况）

## 生产环境部署

### 前置要求

在生产环境部署前，请确保已安装以下软件：

- Node.js 20.x LTS 或更高版本
- pnpm 8.x 或更高版本
- MySQL 8.0 或更高版本
- **PM2** - Node.js 进程管理器

#### 安装 PM2

```bash
npm install -g pm2
```

### 部署步骤

#### 1. 配置生产环境变量

复制 `.env.production` 示例文件并修改为实际的生产配置：

```bash
cp .env.production .env
```

**重要配置项：**

- `DATABASE_URL` - 生产数据库连接字符串
- `JWT_SECRET` - 强随机密钥（至少 32 字符，使用以下命令生成）:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `ALLOWED_ORIGINS` - 生产域名（HTTPS）
- `WS_BASE_URL` - 生产 WebSocket URL（使用 WSS 协议）
- `LOG_LEVEL=info` - 生产环境日志级别

#### 2. 构建项目

```bash
pnpm install
pnpm build
```

这将构建：

- `packages/shared` - 共享类型库
- `packages/frontend` - 前端静态资源（输出到 `packages/frontend/dist/`）
- `packages/backend` - 后端 JavaScript 文件（输出到 `packages/backend/dist/`）

#### 3. 运行数据库迁移

```bash
pnpm --filter backend prisma:migrate
```

#### 4. 启动 PM2 进程

```bash
pnpm start:prod
```

这将启动两个独立的进程：

- `api-server` - Express REST API（端口 3000）
- `ws-server` - WebSocket 服务器（端口 3001）

### PM2 进程管理

#### 查看进程状态

```bash
# 查看进程列表
pnpm status:prod

# 或直接使用 PM2 命令
pm2 status
```

#### 查看日志

```bash
# 查看实时日志
pnpm logs:prod

# 或使用 PM2 命令
pm2 logs

# 查看特定进程日志
pm2 logs api-server
pm2 logs ws-server
```

#### 重启服务

```bash
# 重启所有进程
pnpm restart:prod

# 或使用 PM2 命令
pm2 restart all

# 重启特定进程
pm2 restart api-server
pm2 restart ws-server
```

#### 停止服务

```bash
# 停止所有进程
pnpm stop:prod

# 或使用 PM2 命令
pm2 stop all

# 停止特定进程
pm2 stop api-server
pm2 stop ws-server
```

#### 查看详细监控

```bash
# 实时监控（CPU、内存使用情况）
pm2 monit

# 查看进程详细信息
pm2 info api-server
pm2 info ws-server
```

### 日志文件

PM2 会将日志输出到 `logs/` 目录：

- `logs/api-error.log` - API 服务器错误日志
- `logs/api-out.log` - API 服务器输出日志
- `logs/ws-error.log` - WebSocket 服务器错误日志
- `logs/ws-out.log` - WebSocket 服务器输出日志

### 自动化部署脚本

项目提供了自动化部署脚本 `infrastructure/scripts/deploy.sh`，包含以下步骤：

1. 拉取最新代码
2. 安装依赖
3. 运行数据库迁移
4. 构建项目
5. 重启 PM2 进程

使用方法：

```bash
./infrastructure/scripts/deploy.sh
```

### 进程配置

PM2 配置文件位于 `infrastructure/pm2/ecosystem.config.js`，包含以下关键配置：

- **实例数量**: 1（单实例，fork 模式）
- **内存限制**: 500MB（超过后自动重启）
- **自动重启**: 异常退出时自动重启
- **日志管理**: 分离的错误日志和输出日志

### 安全建议

1. **环境变量安全**：
   - 不要将 `.env` 文件提交到版本控制
   - 生产环境的 `JWT_SECRET` 必须使用强随机字符串
   - 数据库密码使用强密码

2. **HTTPS/WSS**：
   - 生产环境必须使用 HTTPS 和 WSS 协议
   - 建议使用 Nginx 作为反向代理
   - 使用 Let's Encrypt 提供免费的 SSL 证书

3. **防火墙配置**：
   - 仅开放必要的端口（如 80, 443）
   - 数据库端口（3306）仅允许本地访问

## 文档

更多详细文档请查看 `docs/` 目录：

- 📐 **[架构设计文档](docs/architecture/)** - 系统架构、技术栈、设计决策
- 📝 **[PRD 文档](docs/prd/)** - 产品需求文档
- 🗄️ **[数据库设计](docs/architecture/database-schema.md)** - 数据库结构和表设计
- 🚀 **[生产环境部署指南](docs/deployment.md)** - 完整的生产环境部署文档，包括 Nginx 配置、SSL 证书、PM2 管理等

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
