# Deployment Architecture

## Deployment Strategy

**前端部署：**
- **平台**：Nginx 静态文件托管
- **构建命令**：`pnpm --filter frontend build`
- **输出目录**：`packages/frontend/dist`
- **CDN/Edge**：MVP 阶段无需 CDN，直接 Nginx 托管

**后端部署：**
- **平台**：自管理 VPS
- **构建命令**：`pnpm --filter backend build`
- **部署方法**：PM2 进程管理
- **进程数量**：2（API Server + WebSocket Server）

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
```

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|-------------|-------------|---------|
| Development | http://localhost:5173 | http://localhost:3000 | 本地开发 |
| Staging | https://staging.your-domain.com | https://staging.your-domain.com/api | 预生产测试 |
| Production | https://your-domain.com | https://your-domain.com/api | 生产环境 |

## PM2 Configuration

```javascript
// infrastructure/pm2/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-server',
      script: './packages/backend/dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      max_memory_restart: '500M',
    },
    {
      name: 'ws-server',
      script: './packages/backend/dist/ws-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 3001,
      },
      error_file: './logs/ws-error.log',
      out_file: './logs/ws-out.log',
      max_memory_restart: '500M',
    },
  ],
};
```

## Nginx Configuration

```nginx
# infrastructure/nginx/nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 前端静态文件
    location / {
        root /var/www/websocket-relay/frontend;
        try_files $uri $uri/ /index.html;
    }

    # REST API
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

---
