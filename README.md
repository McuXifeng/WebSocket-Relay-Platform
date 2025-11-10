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
- MySQL 8.0 或更高版本（或使用 Docker）

### MySQL 数据库安装

#### 方式一：使用 Docker（推荐，快速简单）

如果你已安装 Docker，可以使用以下命令快速启动 MySQL 容器：

```bash
# 启动 MySQL 8.0 容器
docker run -d \
  --name mysql-websocket \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=websocket_relay \
  -p 3306:3306 \
  mysql:8.0

# 验证 MySQL 是否启动成功
docker exec mysql-websocket mysqladmin ping -h localhost -uroot -proot123

# 常用 Docker 命令
docker start mysql-websocket   # 启动容器
docker stop mysql-websocket    # 停止容器
docker logs mysql-websocket    # 查看日志
docker rm mysql-websocket      # 删除容器
```

**默认配置：**

- 用户名: `root`
- 密码: `root123`
- 数据库名: `websocket_relay`
- 端口: `3306`

#### 方式二：本地安装 MySQL

如果你使用 macOS，可以通过 Homebrew 安装：

```bash
# 安装 Homebrew（如果未安装）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 创建数据库
mysql -u root -e "CREATE DATABASE websocket_relay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

其他系统请参考 MySQL 官方文档。

## 部署方式

本项目支持两种部署方式，请根据你的需求选择：

### 🐳 方式一：Docker 部署（推荐）

**适用场景：**

- ✅ 生产环境部署
- ✅ 已安装宝塔面板的服务器
- ✅ 快速部署，一键启动所有服务
- ✅ 环境隔离，不污染主机环境

**优势：**

- 自动配置 MySQL 数据库
- 自动配置 Nginx 反向代理
- 一条命令启动所有服务
- 数据持久化和备份简单

#### 快速开始（Docker）

```bash
# 1. 克隆项目
git clone <repository-url>
cd websocket-relay-platform

# 2. 一键部署（自动完成所有配置）
chmod +x docker-deploy.sh
./docker-deploy.sh

# 3. 访问应用
# 浏览器打开: http://localhost
```

**详细文档：**

- **宝塔面板部署指南：** [docs/DOCKER_DEPLOY.md](docs/DOCKER_DEPLOY.md)
- **Docker 配置说明：** [docker/README.md](docker/README.md)

---

### 💻 方式二：传统部署（开发环境）

**适用场景：**

- ✅ 本地开发
- ✅ 代码调试
- ✅ 需要实时热更新

## 快速开始（传统部署）

### 1. 克隆项目

```bash
git clone <repository-url>
cd websocket-relay-platform
```

### 2. 安装 pnpm（如果未安装）

```bash
npm install -g pnpm
```

### 3. 安装依赖

```bash
pnpm install
```

### 4. 配置环境变量

复制环境变量模板并根据实际情况修改：

```bash
# 前端环境变量
cp .env.example packages/frontend/.env.local

# 后端环境变量
cp .env.example packages/backend/.env
```

**重要：** 如果使用 Docker 启动的 MySQL，确保 `packages/backend/.env` 中的数据库配置为：

```
DATABASE_URL="mysql://root:root123@localhost:3306/websocket_relay?connection_limit=20&pool_timeout=30"
```

### 5. 初始化数据库

```bash
cd packages/backend
pnpm prisma:generate
pnpm prisma:migrate
```

### 6. 启动开发服务器

```bash
# 回到根目录
cd ../..

# 同时启动前端和后端开发服务器
pnpm dev
```

前端服务将在 `http://localhost:5173` 启动
后端 API 服务将在 `http://localhost:3000` 启动
WebSocket 服务将在 `ws://localhost:3001` 启动

## WebSocket 心跳机制

本平台采用优化的 WebSocket 心跳机制，确保连接状态的实时性和可靠性：

### 心跳参数（Epic 10 Story 10.5 优化）

- **心跳间隔：** 15 秒（降低自原 30 秒）
- **超时检测：** 30 秒内检测异常断开（两次心跳无响应即断开）
- **检测延迟优化：**
  - 设备断开检测延迟：从 68 秒降至 **5 秒以内**
  - 心跳超时检测延迟：从 60 秒降至 **30 秒以内**
  - 断开状态更新延迟：从 5 秒降至 **< 1 秒**

### 工作原理

1. **服务器主动心跳：** WebSocket 服务器每 15 秒向客户端发送 `ping` 帧
2. **客户端响应：** 客户端收到 `ping` 后自动响应 `pong` 帧
3. **活跃标记：** 服务器收到 `pong` 后标记连接为活跃（`socket.isAlive = true`）
4. **超时断开：** 如果连续两次心跳（30 秒）未收到 `pong` 响应，服务器主动断开连接
5. **幂等清理：** 使用 `socket.isCleanedUp` 标志防止重复清理，确保统计数据准确

### 性能优化

- **断开连接立即刷新：** 断开操作立即触发统计数据刷新（延迟 < 1 秒）
- **批量更新保留：** 连接和消息操作仍使用批量累积（5 秒刷新或达到 100 条阈值）
- **压力测试验证：** 支持 100+ 并发连接异常断开场景，无连接泄漏

### 日志增强

- **正常断开：** 使用 `logger.info` 级别，记录连接时长和设备ID
- **异常断开：** 使用 `logger.warn` 级别，便于故障排查
- **详细元数据：** 记录端点ID、断开原因、连接时长等信息

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
