# WebSocket Relay Platform - Docker 部署指南（宝塔面板版）

> 本文档专门针对已安装宝塔面板的 Linux 服务器，提供完整的 Docker 容器化部署方案。

## 📋 目录

- [前置要求](#前置要求)
- [一、安装 Docker 和 Docker Compose](#一安装-docker-和-docker-compose)
- [二、上传项目文件到服务器](#二上传项目文件到服务器)
- [三、配置环境变量](#三配置环境变量)
- [四、构建和启动 Docker 容器](#四构建和启动-docker-容器)
- [五、配置宝塔反向代理](#五配置宝塔反向代理)
- [六、配置 SSL 证书（HTTPS）](#六配置-ssl-证书https)
- [七、日常运维管理](#七日常运维管理)
- [八、常见问题解决](#八常见问题解决)
- [附录：完整部署脚本](#附录完整部署脚本)

---

## 前置要求

在开始部署前，请确保：

- ✅ 已安装宝塔面板（Linux）
- ✅ 服务器内存至少 2GB（推荐 4GB+）
- ✅ 服务器硬盘至少 20GB 可用空间
- ✅ 已有域名并解析到服务器 IP（如需 HTTPS）
- ✅ 服务器防火墙已开放 80 和 443 端口

---

## 一、安装 Docker 和 Docker Compose

### 1.1 使用宝塔面板安装 Docker（推荐）

1. 登录宝塔面板
2. 进入 **软件商店**
3. 搜索 **Docker 管理器**
4. 点击 **安装**

安装完成后，Docker 和 Docker Compose 会自动安装并配置好。

### 1.2 手动安装 Docker（备选方案）

如果宝塔面板中没有 Docker 管理器，可以手动安装：

```bash
# 连接到服务器 SSH
ssh root@your-server-ip

# 安装 Docker（以 Ubuntu/Debian 为例）
curl -fsSL https://get.docker.com | bash

# 启动 Docker 服务
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

---

## 二、上传项目文件到服务器

### 2.1 选择部署目录

推荐使用以下目录结构：

```bash
/www/wwwroot/websocket-relay/
```

### 2.2 上传方式一：使用 Git（推荐）

```bash
# SSH 连接到服务器
ssh root@your-server-ip

# 创建项目目录
mkdir -p /www/wwwroot/websocket-relay
cd /www/wwwroot/websocket-relay

# 克隆项目（替换为你的仓库地址）
git clone <your-repository-url> .

# 如果是私有仓库，需要先配置 SSH 密钥或使用 HTTPS 认证
```

### 2.3 上传方式二：使用宝塔面板文件管理

1. 登录宝塔面板
2. 进入 **文件** 管理
3. 导航到 `/www/wwwroot/`
4. 创建文件夹 `websocket-relay`
5. 将项目文件压缩为 `.zip` 或 `.tar.gz`
6. 上传并解压到该目录

### 2.4 上传方式三：使用 SFTP 工具

使用 FileZilla、WinSCP 等工具，将项目文件上传到服务器。

---

## 三、配置环境变量

### 3.1 创建生产环境配置文件

```bash
# SSH 连接到服务器
cd /www/wwwroot/websocket-relay

# 复制环境变量模板
cp .env.docker .env

# 编辑环境变量（使用 vim 或宝塔面板文件编辑器）
vim .env
```

### 3.2 修改关键配置项

**必须修改的配置（安全相关）：**

```env
# 1. MySQL 根密码（生成强密码）
MYSQL_ROOT_PASSWORD=your_secure_mysql_password_change_me

# 2. JWT 密钥（生成强随机密钥）
JWT_SECRET=your-super-secret-jwt-key-change-in-production-at-least-32-characters

# 3. 允许的前端域名（替换为你的实际域名）
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**生成强密钥的方法：**

```bash
# 生成 MySQL 密码
openssl rand -base64 32

# 生成 JWT 密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**需要根据域名修改的配置：**

```env
# 如果使用 HTTP（不推荐生产环境）
VITE_WS_URL=ws://yourdomain.com/ws

# 如果使用 HTTPS（推荐生产环境）
VITE_WS_URL=wss://yourdomain.com/ws
```

### 3.3 完整的 .env 配置示例

```env
# MySQL 配置
MYSQL_ROOT_PASSWORD=Ab3d5Fg7Hj9Kl2Mn4Pq6Rs8Tu0Vw1Xy3Z
MYSQL_DATABASE=websocket_relay

# JWT 配置
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN=7d

# CORS 配置
ALLOWED_ORIGINS=https://example.com,https://www.example.com

# 前端配置
FRONTEND_PORT=8080
VITE_API_URL=/api
VITE_WS_URL=wss://example.com/ws

# 日志配置
LOG_LEVEL=info

# 性能优化
STATS_BATCH_INTERVAL=5000
STATS_BATCH_SIZE=100
```

---

## 四、构建和启动 Docker 容器

### 4.1 构建 Docker 镜像

```bash
# 确保在项目根目录
cd /www/wwwroot/websocket-relay

# 构建镜像（首次构建可能需要 10-20 分钟）
docker-compose build

# 如果构建失败，可以尝试清理缓存后重建
docker-compose build --no-cache
```

### 4.2 启动服务

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志（确认服务正常启动）
docker-compose logs -f
```

### 4.3 验证服务运行状态

```bash
# 检查所有容器是否正常运行
docker-compose ps

# 应该看到 3 个容器都在运行：
# - websocket-relay-mysql
# - websocket-relay-backend
# - websocket-relay-frontend

# 测试后端 API 健康检查
curl http://localhost:8080/api/health

# 应该返回：{"status":"ok"}
```

---

## 五、配置宝塔反向代理

### 5.1 创建网站

1. 登录宝塔面板
2. 进入 **网站** 管理
3. 点击 **添加站点**
   - 域名：填写你的域名（如 `example.com`）
   - 根目录：可以随意选择（不会使用，因为我们用反向代理）
   - PHP 版本：选择 **纯静态**
4. 点击 **提交**

### 5.2 配置反向代理

1. 在网站列表中，点击刚创建的网站对应的 **设置**
2. 进入 **反向代理** 标签
3. 点击 **添加反向代理**
4. 填写以下配置：

**代理名称：** `websocket-relay`

**目标 URL：** `http://127.0.0.1:8080`

**发送域名：** `$host`

**自定义配置：** 粘贴以下 Nginx 配置

```nginx
# WebSocket 升级配置
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# 代理请求头
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# 超时配置（WebSocket 需要长连接）
proxy_connect_timeout 7d;
proxy_send_timeout 7d;
proxy_read_timeout 7d;

# 禁用缓冲
proxy_buffering off;
```

5. 点击 **提交**

### 5.3 测试反向代理

```bash
# 通过域名访问 API（替换为你的域名）
curl http://yourdomain.com/api/health

# 应该返回：{"status":"ok"}
```

---

## 六、配置 SSL 证书（HTTPS）

### 6.1 申请免费 SSL 证书（Let's Encrypt）

1. 在宝塔网站设置中，进入 **SSL** 标签
2. 选择 **Let's Encrypt** 免费证书
3. 勾选你的域名
4. 点击 **申请**
5. 等待证书申请成功

### 6.2 启用强制 HTTPS

1. 在 SSL 设置中，勾选 **强制 HTTPS**
2. 保存配置

### 6.3 更新 WebSocket URL

编辑 `.env` 文件，将 WebSocket URL 改为 WSS 协议：

```env
# 修改前
VITE_WS_URL=ws://yourdomain.com/ws

# 修改后
VITE_WS_URL=wss://yourdomain.com/ws
```

重启前端容器使配置生效：

```bash
docker-compose restart frontend
```

### 6.4 验证 HTTPS 和 WSS

```bash
# 测试 HTTPS API
curl https://yourdomain.com/api/health

# 使用浏览器测试 WebSocket
# 访问 https://yourdomain.com 并打开浏览器控制台，查看 WebSocket 连接状态
```

---

## 七、日常运维管理

### 7.1 查看服务状态

```bash
# 查看所有容器状态
docker-compose ps

# 查看服务日志
docker-compose logs -f backend    # 后端日志
docker-compose logs -f frontend   # 前端日志
docker-compose logs -f mysql      # MySQL 日志

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### 7.2 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mysql
```

### 7.3 停止和删除服务

```bash
# 停止所有服务（保留容器）
docker-compose stop

# 停止并删除所有容器
docker-compose down

# 停止并删除所有容器和卷（⚠️ 会删除数据库数据）
docker-compose down -v
```

### 7.4 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

### 7.5 备份数据库

```bash
# 导出 MySQL 数据
docker-compose exec mysql mysqldump -u root -p websocket_relay > backup_$(date +%Y%m%d).sql

# 输入 MySQL 密码（在 .env 文件中的 MYSQL_ROOT_PASSWORD）
```

### 7.6 恢复数据库

```bash
# 导入 MySQL 数据
docker-compose exec -T mysql mysql -u root -p websocket_relay < backup_20241109.sql

# 输入 MySQL 密码
```

### 7.7 查看资源使用情况

```bash
# 查看容器 CPU 和内存使用
docker stats

# 查看 Docker 磁盘使用
docker system df

# 清理未使用的镜像和容器
docker system prune -a
```

---

## 八、常见问题解决

### 8.1 问题：容器无法启动

**症状：** `docker-compose up -d` 后容器立即退出

**解决方法：**

```bash
# 查看容器日志
docker-compose logs backend
docker-compose logs frontend

# 检查环境变量配置是否正确
cat .env

# 重新构建镜像
docker-compose build --no-cache
docker-compose up -d
```

### 8.2 问题：数据库连接失败

**症状：** 后端日志显示 "Failed to connect to database"

**解决方法：**

```bash
# 检查 MySQL 容器是否正常运行
docker-compose ps mysql

# 检查 MySQL 日志
docker-compose logs mysql

# 验证数据库连接配置
# 确保 .env 中的 MYSQL_ROOT_PASSWORD 正确

# 重启 MySQL 容器
docker-compose restart mysql

# 等待 MySQL 完全启动后，重启后端
sleep 10
docker-compose restart backend
```

### 8.3 问题：WebSocket 连接失败

**症状：** 前端无法建立 WebSocket 连接

**解决方法：**

1. 检查 `.env` 文件中的 `VITE_WS_URL` 配置是否正确
   - HTTP 环境：`ws://yourdomain.com/ws`
   - HTTPS 环境：`wss://yourdomain.com/ws`

2. 确认宝塔反向代理配置中包含 WebSocket 支持配置

3. 检查服务器防火墙是否开放了 80 和 443 端口

```bash
# 测试 WebSocket 连接（使用 wscat 工具）
npm install -g wscat
wscat -c ws://yourdomain.com/ws
```

### 8.4 问题：前端页面显示空白

**症状：** 浏览器访问域名显示空白页面

**解决方法：**

```bash
# 检查前端容器日志
docker-compose logs frontend

# 检查 Nginx 配置
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# 重新构建前端镜像
docker-compose build frontend
docker-compose up -d frontend
```

### 8.5 问题：端口冲突

**症状：** `Error: bind: address already in use`

**解决方法：**

```bash
# 查看端口占用情况
netstat -tunlp | grep 8080

# 修改 .env 文件中的 FRONTEND_PORT
# 例如改为 8081
FRONTEND_PORT=8081

# 重新启动服务
docker-compose down
docker-compose up -d
```

### 8.6 问题：磁盘空间不足

**症状：** 构建镜像时提示 "no space left on device"

**解决方法：**

```bash
# 清理 Docker 未使用的资源
docker system prune -a -f

# 查看磁盘使用情况
df -h

# 如果 /var/lib/docker 占用过大，考虑增加服务器磁盘空间
```

---

## 附录：完整部署脚本

创建一个自动化部署脚本 `deploy.sh`：

```bash
#!/bin/bash

# WebSocket Relay Platform - 自动化部署脚本

set -e

echo "========================================="
echo "WebSocket Relay Platform - 自动化部署"
echo "========================================="

# 检查是否在项目根目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误：Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误：Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  警告：.env 文件不存在，正在从 .env.docker 复制..."
    cp .env.docker .env
    echo "📝 请编辑 .env 文件并配置必要的环境变量"
    echo "   特别是：MYSQL_ROOT_PASSWORD, JWT_SECRET, ALLOWED_ORIGINS"
    read -p "按 Enter 键继续..."
fi

# 拉取最新代码（如果使用 Git）
if [ -d ".git" ]; then
    echo "🔄 拉取最新代码..."
    git pull
fi

# 停止现有服务
echo "🛑 停止现有服务..."
docker-compose down

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build

# 启动服务
echo "🚀 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 15

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 测试健康检查
echo "🔍 测试后端健康检查..."
curl -f http://localhost:8080/api/health || echo "⚠️  警告：健康检查失败"

echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo "📋 查看日志：docker-compose logs -f"
echo "📊 查看状态：docker-compose ps"
echo "🛑 停止服务：docker-compose down"
echo "========================================="
```

使用方法：

```bash
# 赋予执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

---

## 🎉 部署完成

恭喜！你已经成功在宝塔面板服务器上使用 Docker 部署了 WebSocket Relay Platform。

**下一步：**

1. 访问你的域名，应该能看到登录页面
2. 使用默认管理员账户登录（账号密码在后端 seed 数据中）
3. 修改管理员密码
4. 开始使用系统

**需要帮助？**

- 查看项目文档：`/docs` 目录
- 提交 Issue：GitHub Issues
- 技术支持：联系项目维护者

---

**编写者：老王**
**最后更新：2024-11-09**
