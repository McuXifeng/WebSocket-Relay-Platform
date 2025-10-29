#!/bin/bash
# ========================================
# WebSocket Relay Platform - 生产环境部署脚本
# ========================================
# 用途:自动化部署生产环境,包括代码更新、依赖安装、数据库迁移、项目构建和 PM2 进程管理
# 使用方法: ./infrastructure/scripts/deploy.sh

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🚀 开始部署生产环境...${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. 拉取最新代码
echo -e "\n${YELLOW}📦 步骤 1/5: 拉取最新代码...${NC}"
git pull origin main || {
  echo -e "${RED}❌ Git 拉取失败!请检查网络连接或分支状态${NC}"
  exit 1
}
echo -e "${GREEN}✓ 代码拉取成功${NC}"

# 2. 安装依赖
echo -e "\n${YELLOW}📦 步骤 2/5: 安装项目依赖...${NC}"
pnpm install || {
  echo -e "${RED}❌ 依赖安装失败!请检查 pnpm 是否正确安装${NC}"
  exit 1
}
echo -e "${GREEN}✓ 依赖安装成功${NC}"

# 3. 运行数据库迁移
echo -e "\n${YELLOW}🗄️  步骤 3/5: 运行数据库迁移...${NC}"
pnpm --filter backend prisma:migrate || {
  echo -e "${RED}❌ 数据库迁移失败!请检查数据库连接配置${NC}"
  exit 1
}
echo -e "${GREEN}✓ 数据库迁移成功${NC}"

# 4. 构建项目
echo -e "\n${YELLOW}🔨 步骤 4/5: 构建前后端项目...${NC}"
pnpm build || {
  echo -e "${RED}❌ 项目构建失败!请检查 TypeScript 编译错误${NC}"
  exit 1
}
echo -e "${GREEN}✓ 项目构建成功${NC}"

# 5. 重启 PM2 进程
echo -e "\n${YELLOW}🔄 步骤 5/5: 重启 PM2 进程...${NC}"

# 检查 PM2 是否已经运行进程
if pm2 list | grep -q "api-server\|ws-server"; then
  echo -e "${YELLOW}检测到现有 PM2 进程,正在重启...${NC}"
  pm2 restart all || {
    echo -e "${RED}❌ PM2 重启失败!${NC}"
    exit 1
  }
  echo -e "${GREEN}✓ PM2 进程重启成功${NC}"
else
  echo -e "${YELLOW}未检测到现有 PM2 进程,正在启动...${NC}"
  pnpm start:prod || {
    echo -e "${RED}❌ PM2 启动失败!${NC}"
    exit 1
  }
  echo -e "${GREEN}✓ PM2 进程启动成功${NC}"
fi

# 显示进程状态
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 部署完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${YELLOW}当前进程状态:${NC}"
pm2 status

echo -e "\n${YELLOW}提示:${NC}"
echo -e "  • 查看日志: ${GREEN}pnpm logs:prod${NC}"
echo -e "  • 查看状态: ${GREEN}pnpm status:prod${NC}"
echo -e "  • 重启服务: ${GREEN}pnpm restart:prod${NC}"
echo -e "  • 停止服务: ${GREEN}pnpm stop:prod${NC}"
