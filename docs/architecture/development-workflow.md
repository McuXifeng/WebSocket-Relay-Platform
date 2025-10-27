# Development Workflow

## Local Development Setup

### Prerequisites

```bash
# 安装 Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 MySQL 8.0
sudo apt-get install mysql-server
sudo mysql_secure_installation
```

### Initial Setup

```bash
# 1. 克隆仓库
git clone <repository-url>
cd websocket-relay-platform

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际配置

# 4. 数据库迁移
cd packages/backend
npx prisma migrate dev
npx prisma db seed

# 5. 生成 Prisma Client
npx prisma generate
```

### Development Commands

```bash
# 启动所有服务（开发模式）
pnpm dev

# 仅启动前端
pnpm --filter frontend dev

# 仅启动后端 API
pnpm --filter backend dev:api

# 仅启动 WebSocket 服务器
pnpm --filter backend dev:ws

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## Environment Configuration

### 前端环境变量 (.env.local)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3001
```

### 后端环境变量 (.env)

```bash
# 数据库
DATABASE_URL="mysql://user:password@localhost:3306/websocket_relay"

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 服务器端口
API_PORT=3000
WS_PORT=3001

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# WebSocket
WS_BASE_URL=ws://localhost:3001

# 日志
LOG_LEVEL=debug
```

---
