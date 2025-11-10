# 后端 Dockerfile
# 基于 Node.js 20 LTS Alpine 版本（更小的镜像体积）
FROM node:20-alpine AS base

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat openssl

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# ========================================
# 依赖安装阶段
# ========================================
FROM base AS deps

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制 shared 包的 package.json
COPY packages/shared/package.json ./packages/shared/

# 复制 backend 包的 package.json
COPY packages/backend/package.json ./packages/backend/

# 安装所有依赖（包括开发依赖，用于构建）
RUN pnpm install --frozen-lockfile

# ========================================
# 构建阶段
# ========================================
FROM base AS builder

WORKDIR /app

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules

# 复制源代码和配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# 构建 shared 包
RUN pnpm --filter @websocket-relay/shared build

# 生成 Prisma Client
RUN cd packages/backend && pnpm prisma:generate

# 构建 backend
RUN pnpm --filter @websocket-relay/backend build

# ========================================
# 生产运行阶段
# ========================================
FROM base AS runner

WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# 复制 package.json 和 pnpm-lock.yaml
COPY --chown=nodejs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制 shared 包
COPY --chown=nodejs:nodejs --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --chown=nodejs:nodejs --from=builder /app/packages/shared/dist ./packages/shared/dist

# 复制 backend 包
COPY --chown=nodejs:nodejs --from=builder /app/packages/backend/package.json ./packages/backend/
COPY --chown=nodejs:nodejs --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --chown=nodejs:nodejs --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --chown=nodejs:nodejs --from=builder /app/packages/backend/node_modules/.prisma ./packages/backend/node_modules/.prisma

# 仅安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 创建日志目录
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000 3001

# 设置工作目录到 backend
WORKDIR /app/packages/backend

# 启动应用（使用 node 直接运行编译后的 JS）
# 注意：Docker 中建议使用单个主进程，由该进程管理 API 和 WebSocket 服务
CMD ["node", "dist/server.js"]
