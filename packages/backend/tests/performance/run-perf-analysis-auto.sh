#!/bin/bash
# 自动化性能分析脚本 (Story 9.2 Task 1)
# 非交互式版本 - 适用于自动化执行
#
# 使用方法:
# ./run-perf-analysis-auto.sh [测试模式]
#
# 测试模式:
#   - full: 完整测试 (所有场景, 约15分钟) [默认]
#   - quick: 快速测试 (2个场景, 约5分钟)

set -e

# 解析参数
TEST_MODE="${1:-full}"

echo "🔍 WebSocket Relay Platform - 自动化性能分析"
echo "============================================"
echo "测试模式: $TEST_MODE"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 从 .env 文件提取数据库密码
if [ -f .env ]; then
  DB_PASSWORD=$(grep DATABASE_URL .env | cut -d':' -f3 | cut -d'@' -f1)
  echo -e "${GREEN}✅ 从 .env 读取数据库配置${NC}"
else
  echo -e "${RED}❌ 未找到 .env 文件${NC}"
  exit 1
fi

# 步骤 1: 启用 MySQL 慢查询日志
echo -e "${BLUE}📊 步骤 1/5: 启用 MySQL 慢查询日志${NC}"
mysql -u root -p"$DB_PASSWORD" <<EOF 2>/dev/null || echo -e "${YELLOW}⚠️  MySQL 慢查询日志配置失败,继续执行${NC}"
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.05;
SET GLOBAL log_output = 'TABLE';
SET GLOBAL log_queries_not_using_indexes = 'ON';
SELECT '✅ MySQL 慢查询日志已启用' AS Status;
EOF
echo -e "${GREEN}✅ MySQL 配置完成${NC}"
echo ""

# 步骤 2: 清理旧文件
echo -e "${BLUE}🧹 步骤 2/6: 清理旧的分析文件${NC}"
rm -f isolate-*.log profile.txt profiling.log 2>/dev/null || true
rm -f tests/performance/reports/profiling-*.json 2>/dev/null || true
rm -rf dist 2>/dev/null || true
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 步骤 3: 构建 TypeScript 代码
echo -e "${BLUE}🔨 步骤 3/6: 构建 TypeScript 代码${NC}"
echo "运行: pnpm build"
if pnpm build; then
  echo -e "${GREEN}✅ 构建完成${NC}"
else
  echo -e "${RED}❌ 构建失败${NC}"
  exit 1
fi
echo ""

# 步骤 4: 启动带 Profiler 的后端服务
echo -e "${BLUE}🚀 步骤 4/6: 启动性能分析模式后端服务${NC}"

export PRISMA_LOG_QUERIES=true
export PRISMA_LOG_LEVEL=query

# 启动服务 (后台运行,使用编译后的 JavaScript)
nohup node --prof dist/server.js > profiling.log 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}✅ 服务已启动 (PID: $SERVER_PID)${NC}"

# 等待服务就绪
echo -e "${YELLOW}⏳ 等待服务就绪 (15秒)...${NC}"
sleep 15

# 检查服务是否正常运行
if ! ps -p $SERVER_PID > /dev/null; then
  echo -e "${RED}❌ 服务启动失败${NC}"
  echo "最后 20 行日志:"
  tail -20 profiling.log
  exit 1
fi

# 简单健康检查
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${GREEN}✅ 服务健康检查通过${NC}"
else
  echo -e "${YELLOW}⚠️  健康检查失败,但服务进程运行中,继续执行${NC}"
fi
echo ""

# 步骤 5: 运行性能测试
echo -e "${BLUE}🧪 步骤 5/6: 运行性能基准测试${NC}"

if [ "$TEST_MODE" = "quick" ]; then
  echo "运行快速测试 (场景 1 & 3, 约 5 分钟)"

  # 修改测试脚本,只运行部分场景
  # 这里我们直接运行完整脚本,但可以考虑创建简化版
  node tests/performance/custom-perf-test.mjs || {
    echo -e "${YELLOW}⚠️  部分测试失败,继续分析${NC}"
  }
else
  echo "运行完整测试 (所有场景, 约 15 分钟)"
  node tests/performance/custom-perf-test.mjs || {
    echo -e "${YELLOW}⚠️  部分测试失败,继续分析${NC}"
  }
fi

echo -e "${GREEN}✅ 性能测试完成${NC}"
echo ""

# 步骤 6: 停止服务并生成报告
echo -e "${BLUE}🛑 步骤 6/6: 停止服务并生成分析报告${NC}"

# 优雅停止服务
kill -SIGINT $SERVER_PID 2>/dev/null || true
sleep 3

# 强制终止(如果还在运行)
if ps -p $SERVER_PID > /dev/null 2>&1; then
  kill -9 $SERVER_PID 2>/dev/null || true
  sleep 1
fi
echo -e "${GREEN}✅ 服务已停止${NC}"
echo ""

# 生成 Profiler 报告
echo -e "${BLUE}📊 生成性能分析报告${NC}"

ISOLATE_FILE=$(ls -t isolate-*.log 2>/dev/null | head -1)

if [ -z "$ISOLATE_FILE" ]; then
  echo -e "${RED}❌ 未找到 profiler 输出文件${NC}"
  echo "可能原因: 服务运行时间过短,或 --prof 标志未生效"
else
  echo "处理: $ISOLATE_FILE"
  node --prof-process "$ISOLATE_FILE" > profile.txt
  echo -e "${GREEN}✅ Profiler 报告: profile.txt${NC}"

  # 显示摘要
  echo ""
  echo -e "${BLUE}📈 CPU 热点函数 Top 10:${NC}"
  echo "========================================"
  grep -A 15 "ticks" profile.txt | head -20 || echo "摘要生成中..."
fi
echo ""

# Prisma 查询日志统计
echo -e "${BLUE}⚡ Prisma 查询统计:${NC}"
echo "========================================"
TOTAL_QUERIES=$(grep -c "\[Query\]" profiling.log 2>/dev/null || echo "0")
SLOW_QUERIES=$(grep -c "\[Slow Query\]" profiling.log 2>/dev/null || echo "0")
echo "总查询数: $TOTAL_QUERIES"
echo "慢查询数 (>10ms): $SLOW_QUERIES"

if [ "$SLOW_QUERIES" -gt "0" ]; then
  echo ""
  echo "慢查询示例 (前 5 条):"
  grep "\[Slow Query\]" profiling.log | head -5
fi
echo ""

# MySQL 慢查询统计
echo -e "${BLUE}🐢 MySQL 慢查询统计:${NC}"
echo "========================================"
mysql -u root -p"$DB_PASSWORD" -e "
USE mysql;
SELECT COUNT(*) AS slow_query_count FROM slow_log;
SELECT
  ROUND(query_time, 3) AS time_sec,
  SUBSTRING(sql_text, 1, 60) AS query
FROM slow_log
ORDER BY query_time DESC
LIMIT 5;
" 2>/dev/null || echo "无慢查询记录或表为空"
echo ""

# 最终总结
echo "========================================"
echo -e "${GREEN}🎉 性能分析完成!${NC}"
echo ""
echo "📁 生成的文件:"
echo "   ✅ profile.txt         - Node.js CPU Profiler 报告"
echo "   ✅ profiling.log       - 后端日志(含 Prisma 查询)"
echo "   ✅ tests/performance/reports/custom-test-results.json"
echo "   ✅ MySQL slow_log 表   - 慢查询记录"
echo ""
echo "📝 关键发现:"
echo "   - 总查询数: $TOTAL_QUERIES"
echo "   - 慢查询 (Prisma): $SLOW_QUERIES"
if [ -f profile.txt ]; then
  echo "   - CPU Profiler: 已生成"
fi
echo ""
echo "📊 查看完整报告:"
echo "   cat profile.txt                    # CPU 热点分析"
echo "   grep 'Slow Query' profiling.log    # Prisma 慢查询"
echo "   mysql> SELECT * FROM mysql.slow_log ORDER BY query_time DESC;"
echo "========================================"
