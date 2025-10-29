# 生产环境部署指南

> **版本**: v1.0
> **最后更新**: 2025-10-29
> **适用于**: WebSocket Relay Platform MVP

---

## 目录

1. [服务器要求](#1-服务器要求)
2. [环境准备](#2-环境准备)
3. [代码部署](#3-代码部署)
4. [环境变量配置](#4-环境变量配置)
5. [数据库配置](#5-数据库配置)
6. [Nginx 配置部署](#6-nginx-配置部署)
7. [SSL 证书配置](#7-ssl-证书配置)
8. [PM2 启动服务](#8-pm2-启动服务)
9. [验证部署](#9-验证部署)
10. [维护和更新](#10-维护和更新)
11. [安全建议](#11-安全建议)
12. [常见问题 FAQ](#12-常见问题-faq)

---

## 1. 服务器要求

### 1.1 硬件要求

| 配置项 | 最小配置 | 推荐配置 | 说明 |
|--------|---------|---------|------|
| **CPU** | 2 核 | 4 核 | 处理并发 WebSocket 连接和 API 请求 |
| **内存** | 4 GB | 8 GB | Node.js 进程和 MySQL 数据库运行所需 |
| **存储** | 20 GB SSD | 50 GB SSD | 存储代码、日志和数据库文件 |
| **带宽** | 5 Mbps | 10+ Mbps | 支持实时 WebSocket 消息传输 |

### 1.2 操作系统要求

支持以下 Linux 发行版:

- **Ubuntu**: 20.04 LTS 或更高版本 ✅ 推荐
- **Debian**: 11 (Bullseye) 或更高版本
- **CentOS**: 8 或更高版本

### 1.3 必需软件和版本

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Node.js** | 20.x LTS | JavaScript 运行环境 |
| **pnpm** | 8.x | 包管理器 (Monorepo workspace 支持) |
| **MySQL** | 8.0+ | 关系型数据库 |
| **Nginx** | 1.24+ | Web 服务器和反向代理 |
| **PM2** | 5.x | Node.js 进程管理器 |
| **Git** | 2.x | 代码版本控制 |
| **Certbot** | 最新版 | Let's Encrypt SSL 证书管理工具 |

### 1.4 网络要求

需要开放以下端口:

| 端口 | 协议 | 用途 | 公网访问 |
|------|------|------|---------|
| **80** | HTTP | HTTP 重定向到 HTTPS | ✅ 是 |
| **443** | HTTPS/WSS | 前端、API 和 WebSocket 访问 | ✅ 是 |
| **22** | SSH | 服务器远程管理 | ✅ 是 (限制 IP) |
| **3000** | HTTP | Express API 服务器 (仅本地) | ❌ 否 |
| **3001** | WebSocket | WebSocket 服务器 (仅本地) | ❌ 否 |
| **3306** | MySQL | 数据库服务 (仅本地) | ❌ 否 |

**注意**: 端口 3000、3001 和 3306 仅允许本地访问 (`127.0.0.1`),通过 Nginx 反向代理对外暴露服务。

---

## 2. 环境准备

### 2.1 更新系统包

```bash
# 更新包列表
sudo apt-get update

# 升级已安装的包
sudo apt-get upgrade -y
```

### 2.2 安装 Node.js 20.x LTS

```bash
# 添加 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 安装 Node.js
sudo apt-get install -y nodejs

# 验证安装
node -v   # 应显示 v20.x.x
npm -v    # 应显示 10.x.x
```

### 2.3 安装 pnpm 包管理器

```bash
# 全局安装 pnpm
npm install -g pnpm

# 验证安装
pnpm -v   # 应显示 8.x.x
```

### 2.4 安装 MySQL 8.0+

```bash
# 安装 MySQL Server
sudo apt-get install -y mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 运行安全配置向导
sudo mysql_secure_installation
```

**安全配置建议**:
- 设置强密码 (至少 16 字符,包含大小写字母、数字和特殊字符)
- 删除匿名用户: `Yes`
- 禁止 root 远程登录: `Yes`
- 删除测试数据库: `Yes`
- 重新加载权限表: `Yes`

### 2.5 安装 Nginx

```bash
# 安装 Nginx
sudo apt-get install -y nginx

# 启动 Nginx 服务
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证安装
nginx -v   # 应显示 nginx/1.24.x 或更高版本

# 检查 Nginx 状态
sudo systemctl status nginx
```

### 2.6 安装 PM2 进程管理器

```bash
# 全局安装 PM2
npm install -g pm2

# 验证安装
pm2 -v   # 应显示 5.x.x
```

### 2.7 安装 Certbot (Let's Encrypt)

```bash
# 安装 Certbot 和 Nginx 插件
sudo apt-get install -y certbot python3-certbot-nginx

# 验证安装
certbot --version
```

---

## 3. 代码部署

### 3.1 克隆代码仓库

```bash
# 切换到部署目录 (根据实际情况调整)
cd /var/www

# 克隆代码仓库
git clone <repository-url> websocket-relay
cd websocket-relay

# 切换到生产分支 (如果有)
git checkout main
```

### 3.2 安装项目依赖

```bash
# 安装所有依赖 (前端、后端、共享包)
pnpm install

# 验证依赖安装
pnpm list
```

**预计安装时间**: 1-3 分钟 (取决于网络速度)

### 3.3 构建前后端代码

#### 构建共享类型包

```bash
pnpm --filter shared build
```

#### 构建后端 (TypeScript → JavaScript)

```bash
pnpm --filter backend build
```

**产物位置**: `packages/backend/dist/`

#### 构建前端 (React → 静态文件)

```bash
pnpm --filter frontend build
```

**产物位置**: `packages/frontend/dist/`

#### 一键构建所有包

```bash
# 使用 pnpm build 脚本 (推荐)
pnpm build
```

**验证构建产物**:

```bash
# 检查后端构建产物
ls -la packages/backend/dist/

# 检查前端构建产物
ls -la packages/frontend/dist/
```

---

## 4. 环境变量配置

### 4.1 创建生产环境变量文件

```bash
# 复制示例文件
cp .env.production .env

# 编辑环境变量
nano .env
```

### 4.2 配置所有必需的环境变量

**完整的 `.env` 配置示例**:

```bash
# ============================================
# 生产环境配置
# ============================================

# Node 环境
NODE_ENV=production

# ============================================
# 数据库配置
# ============================================
# 格式: mysql://用户名:密码@主机:端口/数据库名
DATABASE_URL="mysql://ws_user:YOUR_STRONG_PASSWORD_HERE@localhost:3306/websocket_relay_production"

# ============================================
# JWT 认证配置
# ============================================
# ⚠️ 安全警告: 必须修改为强随机字符串 (至少 32 字符)
# 生成随机字符串命令: openssl rand -base64 32
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# ============================================
# 服务器端口配置
# ============================================
API_PORT=3000
WS_PORT=3001

# ============================================
# CORS 配置
# ============================================
# 允许的源 (多个域名用逗号分隔)
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com

# ============================================
# WebSocket 配置
# ============================================
# 生产环境 WebSocket URL (必须使用 WSS 协议)
WS_BASE_URL=wss://your-domain.com

# ============================================
# 日志配置
# ============================================
LOG_LEVEL=info
```

### 4.3 配置说明和安全注意事项

#### 🔒 必须修改的配置项

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | `mysql://ws_user:StrongP@ssw0rd@localhost:3306/websocket_relay_production` |
| `JWT_SECRET` | JWT 签名密钥 | 使用 `openssl rand -base64 32` 生成 |
| `ALLOWED_ORIGINS` | 允许的跨域源 | `https://your-domain.com` |
| `WS_BASE_URL` | WebSocket 基础 URL | `wss://your-domain.com` |

#### 生成强随机 JWT_SECRET

```bash
# 生成 32 字节的随机字符串 (Base64 编码)
openssl rand -base64 32

# 示例输出:
# Xk7mP9qR2wT5vN8jL1cH6fG4bY3sD0eA9zM7xW6uI5o=
```

#### 🛡️ 安全最佳实践

- ✅ **修改默认密钥**: 绝不使用示例中的默认 `JWT_SECRET`
- ✅ **使用强密码**: 数据库密码至少 16 字符,包含大小写字母、数字和特殊字符
- ✅ **限制 CORS**: 仅添加实际使用的域名到 `ALLOWED_ORIGINS`
- ✅ **使用 HTTPS/WSS**: 生产环境必须使用加密连接
- ✅ **保护 .env 文件**: 设置文件权限为 `600` (仅所有者可读写)

```bash
# 设置 .env 文件权限
chmod 600 .env
```

---

## 5. 数据库配置

### 5.1 创建生产数据库

```bash
# 登录 MySQL (使用 root 用户)
mysql -u root -p
```

在 MySQL 提示符中执行以下命令:

```sql
-- 创建生产数据库 (使用 UTF-8 字符集)
CREATE DATABASE websocket_relay_production
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建数据库用户 (替换为强密码)
CREATE USER 'ws_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD_HERE';

-- 授予用户所有权限
GRANT ALL PRIVILEGES ON websocket_relay_production.* TO 'ws_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证数据库和用户
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User = 'ws_user';

-- 退出 MySQL
EXIT;
```

### 5.2 运行数据库迁移

```bash
# 确保 .env 文件中的 DATABASE_URL 已正确配置
# 运行 Prisma 迁移 (应用所有迁移文件)
pnpm --filter backend prisma:migrate

# 或者使用完整命令
cd packages/backend
npx prisma migrate deploy
cd ../..
```

**迁移文件位置**: `packages/backend/prisma/migrations/`

### 5.3 插入种子数据 (可选)

```bash
# 如果有种子数据脚本,运行以下命令
pnpm --filter backend prisma:seed

# 或者手动运行种子脚本
cd packages/backend
npx prisma db seed
cd ../..
```

**注意**: 种子数据通常用于创建初始管理员账户或测试数据。

### 5.4 验证数据库结构

```bash
# 使用 Prisma Studio 查看数据库 (开发环境)
# cd packages/backend
# npx prisma studio

# 或者直接查询数据库
mysql -u ws_user -p websocket_relay_production -e "SHOW TABLES;"
```

**预期表**:
- `users`
- `endpoints`
- `devices`
- `messages`
- `invite_codes`

---

## 6. Nginx 配置部署

### 6.1 复制 Nginx 配置文件

```bash
# 从项目目录复制配置文件到 Nginx sites-available
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/sites-available/websocket-relay
```

### 6.2 修改域名占位符

```bash
# 编辑配置文件
sudo nano /etc/nginx/sites-available/websocket-relay
```

**需要替换的占位符**:

| 占位符 | 替换为 | 说明 |
|--------|--------|------|
| `your-domain.com` | `example.com` | 实际域名 (所有出现位置) |
| `www.your-domain.com` | `www.example.com` | 带 www 的域名 (可选) |
| `/var/www/websocket-relay/frontend` | `/var/www/websocket-relay/packages/frontend/dist` | 前端构建产物路径 |

**使用 sed 批量替换**:

```bash
# 替换所有 your-domain.com 为实际域名
sudo sed -i 's/your-domain.com/example.com/g' /etc/nginx/sites-available/websocket-relay

# 替换前端静态文件路径
sudo sed -i 's|/var/www/websocket-relay/frontend|/var/www/websocket-relay/packages/frontend/dist|g' /etc/nginx/sites-available/websocket-relay
```

### 6.3 创建符号链接

```bash
# 创建符号链接到 sites-enabled (启用配置)
sudo ln -s /etc/nginx/sites-available/websocket-relay /etc/nginx/sites-enabled/

# 验证符号链接
ls -la /etc/nginx/sites-enabled/
```

### 6.4 删除默认配置 (可选)

```bash
# 删除 Nginx 默认站点配置
sudo rm /etc/nginx/sites-enabled/default
```

### 6.5 测试 Nginx 配置

```bash
# 测试配置文件语法
sudo nginx -t
```

**预期输出**:

```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**如果出现错误**:
- 检查配置文件语法 (逗号、分号、大括号匹配)
- 验证文件路径是否存在 (前端构建产物目录)
- 检查 SSL 证书路径 (第一次部署时证书还不存在,可以先注释掉 SSL 相关配置)

### 6.6 重启 Nginx 服务

```bash
# 重启 Nginx
sudo systemctl restart nginx

# 验证服务状态
sudo systemctl status nginx

# 查看错误日志 (如果启动失败)
sudo tail -f /var/log/nginx/error.log
```

---

## 7. SSL 证书配置

### 7.1 安装 Certbot (已在环境准备中完成)

如果还未安装,执行:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

### 7.2 获取 Let's Encrypt 证书

**⚠️ 前提条件**:
- 域名 DNS 已正确解析到服务器 IP
- Nginx 已启动并监听 80 端口
- 防火墙已开放 80 和 443 端口

```bash
# 使用 Certbot Nginx 插件自动获取证书和配置 Nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**交互式配置**:

1. **输入邮箱**: 用于接收证书过期提醒
2. **同意服务条款**: `Yes`
3. **是否共享邮箱**: `No` (推荐)
4. **HTTPS 重定向**: 选择 `2: Redirect` (强制 HTTPS)

**证书文件路径**:

```
证书: /etc/letsencrypt/live/your-domain.com/fullchain.pem
私钥: /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 7.3 验证 SSL 证书

```bash
# 查看证书信息
sudo certbot certificates

# 使用 OpenSSL 测试证书
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### 7.4 配置自动续期

Let's Encrypt 证书有效期为 90 天,Certbot 会自动配置续期任务。

**测试自动续期**:

```bash
# 模拟续期过程 (不会真正续期)
sudo certbot renew --dry-run
```

**查看续期计划任务**:

```bash
# Certbot 使用 systemd timer 自动续期
sudo systemctl list-timers | grep certbot

# 查看 Certbot 续期服务
sudo systemctl status certbot.timer
```

**手动续期** (如果需要):

```bash
sudo certbot renew
```

---

## 8. PM2 启动服务

### 8.1 验证 PM2 生态系统配置

PM2 配置文件已在 Story 4.6 中创建: `infrastructure/pm2/ecosystem.config.js`

```bash
# 查看 PM2 配置
cat infrastructure/pm2/ecosystem.config.js
```

### 8.2 启动所有服务

```bash
# 使用项目根目录的 pnpm 脚本启动
pnpm start:prod
```

**此命令会**:
1. 启动 Express API 服务器 (端口 3000)
2. 启动 WebSocket 服务器 (端口 3001)
3. 配置日志输出到 `logs/` 目录
4. 启用自动重启 (进程崩溃时)

### 8.3 验证进程状态

```bash
# 查看所有 PM2 进程
pm2 status

# 预期输出:
# ┌─────┬──────────────┬─────────┬─────────┬──────────┬────────┐
# │ id  │ name         │ mode    │ ↺      │ status   │ cpu    │
# ├─────┼──────────────┼─────────┼─────────┼──────────┼────────┤
# │ 0   │ api-server   │ fork    │ 0       │ online   │ 0%     │
# │ 1   │ ws-server    │ fork    │ 0       │ online   │ 0%     │
# └─────┴──────────────┴─────────┴─────────┴──────────┴────────┘
```

### 8.4 查看实时日志

```bash
# 查看所有进程日志
pm2 logs

# 查看特定进程日志
pm2 logs api-server
pm2 logs ws-server

# 查看错误日志
pm2 logs --err
```

**日志文件位置**:
- 标准输出: `logs/api-server-out.log`, `logs/ws-server-out.log`
- 错误输出: `logs/api-server-error.log`, `logs/ws-server-error.log`

### 8.5 配置 PM2 开机自启动

```bash
# 生成 PM2 启动脚本 (根据当前系统)
pm2 startup

# 复制并执行输出的命令 (示例)
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user

# 保存当前 PM2 进程列表
pm2 save
```

**验证开机自启动**:

```bash
# 查看 PM2 服务状态
sudo systemctl status pm2-your-user

# 重启服务器后检查进程是否自动启动
# pm2 status
```

### 8.6 PM2 常用管理命令

```bash
# 重启所有进程
pm2 restart all

# 重启特定进程
pm2 restart api-server
pm2 restart ws-server

# 停止所有进程
pm2 stop all

# 删除所有进程 (从 PM2 列表中移除)
pm2 delete all

# 实时监控 (CPU、内存使用)
pm2 monit

# 查看详细信息
pm2 show api-server
```

---

## 9. 验证部署

### 9.1 验证前端访问

```bash
# 测试 HTTPS 访问 (检查状态码)
curl -I https://your-domain.com

# 预期输出: HTTP/2 200
```

**浏览器访问**:
- 打开浏览器访问 `https://your-domain.com`
- 应显示前端登录页面
- 检查浏览器控制台无错误

### 9.2 验证 API 访问

```bash
# 测试健康检查端点
curl https://your-domain.com/api/health

# 预期输出: {"status": "ok"} 或类似响应

# 测试认证端点 (应返回 401 未授权)
curl https://your-domain.com/api/auth/me

# 预期输出: {"error": "未授权"} 或类似错误信息
```

### 9.3 验证 WebSocket 连接

#### 使用浏览器开发者工具

1. 打开浏览器并访问 `https://your-domain.com`
2. 登录应用
3. 打开开发者工具 (F12)
4. 切换到 `Network` (网络) 标签
5. 筛选 `WS` (WebSocket) 连接
6. 应看到 `wss://your-domain.com/ws/...` 连接,状态为 `101 Switching Protocols`

#### 使用 wscat 工具 (可选)

```bash
# 安装 wscat
npm install -g wscat

# 测试 WebSocket 连接 (需要有效的 Token)
wscat -c "wss://your-domain.com/ws/YOUR_ENDPOINT_ID?token=YOUR_JWT_TOKEN"
```

### 9.4 常见问题排查

#### 前端无法访问 (404 Not Found)

```bash
# 检查前端构建产物是否存在
ls -la /var/www/websocket-relay/packages/frontend/dist/

# 检查 Nginx 配置的 root 路径
sudo cat /etc/nginx/sites-available/websocket-relay | grep "root"

# 检查 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

#### API 请求失败 (502 Bad Gateway)

```bash
# 检查 PM2 进程状态
pm2 status

# 检查 API 服务器是否监听 3000 端口
sudo netstat -tlnp | grep 3000

# 查看 API 服务器日志
pm2 logs api-server
```

#### WebSocket 连接失败

```bash
# 检查 WebSocket 服务器是否监听 3001 端口
sudo netstat -tlnp | grep 3001

# 查看 WebSocket 服务器日志
pm2 logs ws-server

# 检查 Nginx WebSocket 配置
sudo cat /etc/nginx/sites-available/websocket-relay | grep -A 10 "location /ws/"
```

#### SSL 证书问题

```bash
# 检查证书有效性
sudo certbot certificates

# 测试 SSL 连接
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# 查看 Nginx SSL 配置
sudo cat /etc/nginx/sites-available/websocket-relay | grep "ssl_"
```

---

## 10. 维护和更新

### 10.1 代码更新流程

```bash
# 1. 停止 PM2 进程 (可选,取决于更新内容)
pm2 stop all

# 2. 拉取最新代码
cd /var/www/websocket-relay
git pull origin main

# 3. 安装新的依赖 (如果 package.json 有变化)
pnpm install

# 4. 重新构建前后端
pnpm build

# 5. 重启 PM2 进程
pm2 restart all

# 6. 验证服务状态
pm2 status
pm2 logs
```

### 10.2 数据库迁移流程

**当有新的 Prisma 迁移文件时**:

```bash
# 1. 备份数据库 (重要!)
mysqldump -u ws_user -p websocket_relay_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 运行数据库迁移
pnpm --filter backend prisma:migrate

# 3. 重启 PM2 进程
pm2 restart all

# 4. 验证应用正常运行
curl https://your-domain.com/api/health
```

### 10.3 备份建议

#### 数据库备份

```bash
# 创建数据库备份脚本
cat > ~/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u ws_user -p'YOUR_PASSWORD' websocket_relay_production > $BACKUP_DIR/backup_$TIMESTAMP.sql
# 保留最近 7 天的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

# 设置执行权限
chmod +x ~/backup_db.sh

# 配置 cron 定时任务 (每天凌晨 2 点备份)
crontab -e
# 添加以下行:
# 0 2 * * * /home/your-user/backup_db.sh
```

#### 配置文件备份

```bash
# 备份重要配置文件
cp /etc/nginx/sites-available/websocket-relay ~/nginx_backup.conf
cp .env ~/env_backup
cp infrastructure/pm2/ecosystem.config.js ~/pm2_backup.config.js
```

### 10.4 日志管理

#### 手动清理日志

```bash
# 清理 PM2 日志
pm2 flush

# 清理 Nginx 日志 (可选)
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log
```

#### 配置 logrotate 自动管理日志

```bash
# 创建 PM2 日志轮转配置
sudo nano /etc/logrotate.d/pm2-logs

# 添加以下内容:
/var/www/websocket-relay/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 your-user your-group
}
```

---

## 11. 安全建议

### 11.1 防火墙配置

```bash
# 启用 UFW 防火墙
sudo ufw enable

# 允许 SSH (修改为实际 SSH 端口)
sudo ufw allow 22/tcp

# 允许 HTTP (用于 Let's Encrypt 验证)
sudo ufw allow 80/tcp

# 允许 HTTPS
sudo ufw allow 443/tcp

# 查看防火墙规则
sudo ufw status verbose
```

**限制 SSH 访问** (推荐):

```bash
# 仅允许特定 IP 访问 SSH
sudo ufw delete allow 22/tcp
sudo ufw allow from YOUR_IP_ADDRESS to any port 22 proto tcp
```

### 11.2 密钥管理建议

#### 定期更新 JWT_SECRET

```bash
# 生成新的 JWT_SECRET
openssl rand -base64 32

# 更新 .env 文件
nano .env
# 修改 JWT_SECRET 为新生成的值

# 重启 API 服务器
pm2 restart api-server
```

**注意**: 更新 `JWT_SECRET` 会使所有现有 Token 失效,用户需要重新登录。

#### 使用环境变量管理工具 (可选)

对于团队协作,推荐使用:
- **Vault** (HashiCorp): 企业级密钥管理
- **AWS Secrets Manager**: 云端密钥存储
- **1Password CLI**: 团队密码管理

### 11.3 数据库安全

```bash
# 定期更新数据库密码
mysql -u root -p
# ALTER USER 'ws_user'@'localhost' IDENTIFIED BY 'NEW_STRONG_PASSWORD';
# FLUSH PRIVILEGES;
# EXIT;

# 更新 .env 中的 DATABASE_URL
nano .env

# 重启服务
pm2 restart all
```

### 11.4 CORS 配置 (如果需要)

如果需要允许特定外部域名访问 API,可以在 Nginx 中配置 CORS:

```nginx
# 在 /etc/nginx/sites-available/websocket-relay 的 location /api/ 中添加
add_header Access-Control-Allow-Origin "https://allowed-domain.com" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

# 处理 OPTIONS 预检请求
if ($request_method = 'OPTIONS') {
    return 204;
}
```

**注意**: 后端已通过 `ALLOWED_ORIGINS` 环境变量配置 CORS,通常无需在 Nginx 中重复配置。

### 11.5 监控和日志建议

#### 设置日志告警

```bash
# 监控 Nginx 错误日志 (使用 fail2ban)
sudo apt-get install fail2ban

# 配置 fail2ban 监控规则
sudo nano /etc/fail2ban/jail.local
```

#### 定期检查 PM2 进程

```bash
# 创建监控脚本
cat > ~/check_pm2.sh << 'EOF'
#!/bin/bash
OFFLINE=$(pm2 jlist | jq '.[] | select(.pm2_env.status=="stopped") | .name')
if [ ! -z "$OFFLINE" ]; then
    echo "进程离线: $OFFLINE"
    pm2 restart all
fi
EOF

chmod +x ~/check_pm2.sh

# 配置 cron 定时任务 (每 5 分钟检查)
crontab -e
# */5 * * * * /home/your-user/check_pm2.sh
```

---

## 12. 常见问题 FAQ

### Q1: 如何更新 SSL 证书?

**A**: Let's Encrypt 证书会通过 Certbot 自动续期。如果需要手动续期:

```bash
# 手动续期
sudo certbot renew

# 续期后重启 Nginx
sudo systemctl restart nginx
```

### Q2: 如何查看应用日志?

**A**: 使用以下命令查看不同类型的日志:

```bash
# PM2 应用日志
pm2 logs

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx -f
```

### Q3: WebSocket 连接失败怎么办?

**A**: 按以下步骤排查:

1. **检查 WebSocket 服务器状态**:
   ```bash
   pm2 status
   pm2 logs ws-server
   ```

2. **检查端口监听**:
   ```bash
   sudo netstat -tlnp | grep 3001
   ```

3. **检查 Nginx WebSocket 配置**:
   ```bash
   sudo cat /etc/nginx/sites-available/websocket-relay | grep -A 10 "location /ws/"
   ```

4. **验证防火墙规则**:
   ```bash
   sudo ufw status
   ```

### Q4: 如何重启应用?

**A**: 根据需要重启的组件:

```bash
# 重启所有 PM2 进程
pm2 restart all

# 重启特定进程
pm2 restart api-server
pm2 restart ws-server

# 重启 Nginx
sudo systemctl restart nginx

# 重启 MySQL
sudo systemctl restart mysql
```

### Q5: 如何回滚到之前的版本?

**A**: 使用 Git 回滚代码:

```bash
# 查看提交历史
git log --oneline

# 回滚到特定提交
git checkout <commit-hash>

# 重新构建和重启
pnpm build
pm2 restart all

# 如果需要永久回滚 (创建新分支)
git checkout -b rollback-version
```

### Q6: 如何增加服务器资源 (扩容)?

**A**: 对于单服务器扩容:

1. **垂直扩容**: 增加 CPU 和内存
   - 联系云服务商升级服务器配置
   - 重启服务器后验证应用正常运行

2. **优化 PM2 配置** (多核 CPU):
   ```bash
   # 编辑 PM2 配置,启用集群模式
   nano infrastructure/pm2/ecosystem.config.js

   # 修改 exec_mode 为 'cluster'
   # instances: 4  # 根据 CPU 核心数调整

   # 重启进程
   pm2 delete all
   pnpm start:prod
   ```

### Q7: 如何备份和恢复数据库?

**A**:

**备份**:
```bash
# 导出数据库
mysqldump -u ws_user -p websocket_relay_production > backup.sql
```

**恢复**:
```bash
# 导入数据库
mysql -u ws_user -p websocket_relay_production < backup.sql
```

### Q8: 如何监控应用性能?

**A**: 使用以下工具:

```bash
# PM2 实时监控
pm2 monit

# 系统资源监控
htop

# 网络连接监控
sudo netstat -an | grep ESTABLISHED | wc -l

# WebSocket 连接数
sudo netstat -an | grep :3001 | grep ESTABLISHED | wc -l
```

### Q9: 如何处理磁盘空间不足?

**A**:

1. **清理日志文件**:
   ```bash
   # 清理 PM2 日志
   pm2 flush

   # 清理旧的日志文件
   find /var/www/websocket-relay/logs/ -name "*.log" -mtime +7 -delete

   # 清理 Nginx 日志
   sudo truncate -s 0 /var/log/nginx/access.log
   ```

2. **清理数据库备份**:
   ```bash
   # 删除 7 天前的备份
   find /var/backups/mysql/ -name "*.sql" -mtime +7 -delete
   ```

3. **清理 npm/pnpm 缓存**:
   ```bash
   pnpm store prune
   ```

### Q10: 生产环境可以使用开发模式吗?

**A**: ❌ 绝对不行！生产环境必须:

- ✅ 使用 `NODE_ENV=production`
- ✅ 使用构建后的代码 (不使用 `ts-node` 或 `vite dev`)
- ✅ 使用进程管理器 (PM2)
- ✅ 启用 HTTPS/WSS
- ✅ 配置强密钥和密码
- ✅ 限制日志级别为 `info` 或 `warn`

---

## 附录: 快速部署命令汇总

```bash
# ============================================
# 一键部署脚本 (仅供参考,请根据实际情况调整)
# ============================================

# 1. 系统更新
sudo apt-get update && sudo apt-get upgrade -y

# 2. 安装必需软件
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server nginx certbot python3-certbot-nginx
npm install -g pnpm pm2

# 3. 克隆代码
cd /var/www
git clone <repository-url> websocket-relay
cd websocket-relay

# 4. 安装依赖和构建
pnpm install
pnpm build

# 5. 配置环境变量
cp .env.production .env
nano .env  # 修改配置

# 6. 配置数据库
mysql -u root -p < setup_database.sql
pnpm --filter backend prisma:migrate

# 7. 配置 Nginx
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/sites-available/websocket-relay
sudo sed -i 's/your-domain.com/example.com/g' /etc/nginx/sites-available/websocket-relay
sudo ln -s /etc/nginx/sites-available/websocket-relay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 8. 获取 SSL 证书
sudo certbot --nginx -d example.com -d www.example.com

# 9. 启动服务
pnpm start:prod
pm2 save
pm2 startup

# 10. 验证部署
curl -I https://example.com
pm2 status
```

---

**文档版本**: v1.0
**最后更新**: 2025-10-29
**维护者**: DevOps Team
**反馈**: [GitHub Issues](https://github.com/your-repo/issues)

---
