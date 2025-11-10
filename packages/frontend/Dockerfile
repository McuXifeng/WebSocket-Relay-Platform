# 前端 Dockerfile
# 使用多阶段构建：构建阶段 + Nginx 运行阶段

# ========================================
# 构建阶段
# ========================================
FROM node:20-alpine AS builder

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 workspace 配置文件
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# 复制 shared 包的 package.json
COPY packages/shared/package.json ./packages/shared/

# 复制 frontend 包的 package.json
COPY packages/frontend/package.json ./packages/frontend/

# 安装所有依赖
RUN pnpm install --frozen-lockfile

# 复制源代码和配置文件
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend

# 构建 shared 包
RUN pnpm --filter @websocket-relay/shared build

# 设置构建时环境变量（将在运行时被 Nginx 替换）
# 这些是占位符，实际值会在容器启动时由 docker-entrypoint.sh 替换
ARG VITE_API_URL=/api
ARG VITE_WS_URL=ws://localhost:3001

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

# 构建 frontend（生成静态文件到 dist 目录）
RUN pnpm --filter @websocket-relay/frontend build

# ========================================
# Nginx 运行阶段
# ========================================
FROM nginx:alpine AS runner

# 安装 gettext 用于环境变量替换（envsubst 命令）
RUN apk add --no-cache gettext

# 从构建阶段复制构建好的静态文件
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# 复制自定义 Nginx 配置
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# 创建运行时环境变量替换脚本
# 这个脚本会在容器启动时执行，将 index.html 中的环境变量占位符替换为实际值
RUN echo '#!/bin/sh' > /docker-entrypoint.d/40-substitute-env.sh && \
    echo 'set -e' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo 'echo "Replacing environment variables in JavaScript files..."' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo 'for file in /usr/share/nginx/html/assets/*.js; do' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '  if [ -f "$file" ]; then' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    # 创建临时文件' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    tmpfile=$(mktemp)' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    # 替换 API_URL（支持相对路径和绝对路径）' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    sed "s|VITE_API_URL_PLACEHOLDER|${VITE_API_URL:-/api}|g" "$file" > "$tmpfile"' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    # 替换 WS_URL' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    sed "s|VITE_WS_URL_PLACEHOLDER|${VITE_WS_URL:-ws://localhost:3001}|g" "$tmpfile" > "$file"' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '    rm -f "$tmpfile"' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo '  fi' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo 'done' >> /docker-entrypoint.d/40-substitute-env.sh && \
    echo 'echo "Environment variables replaced successfully"' >> /docker-entrypoint.d/40-substitute-env.sh && \
    chmod +x /docker-entrypoint.d/40-substitute-env.sh

# 暴露 Nginx 默认端口
EXPOSE 80

# Nginx 会自动执行 /docker-entrypoint.d/ 目录下的脚本
# 然后启动 Nginx
CMD ["nginx", "-g", "daemon off;"]
