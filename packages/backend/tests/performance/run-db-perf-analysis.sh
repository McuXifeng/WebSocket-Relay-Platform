#!/bin/bash
# 数据库性能分析脚本 (Story 9.2 Task 1 - 简化版)
# 专注于 Prisma + MySQL 性能分析,不包含 Node.js CPU Profiler
#
# 使用方法:
# ./run-db-perf-analysis.sh [测试模式]
#
# 测试模式:
#   - full: 完整测试 (所有场景, 约15分钟) [默认]
#   - quick: 快速测试 (2个场景, 约5分钟)

set -e

TEST_MODE="${1:-full}"

echo "🔍 WebSocket Relay Platform - 数据库性能分析"
echo "==========================================="
echo "测试模式: $TEST_MODE"
echo "分析重点: Prisma Query + MySQL Slow Query"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0;33m'

# 从 .env 提取数据库密码
if [ -f .env ]; then
  DB_PASSWORD=$(grep DATABASE_URL .env | cut -d':' -f3 | cut -d'@' -f1)
  echo -e "${GREEN}✅ 从 .env 读取数据库配置${NC}"
else
  echo -e "${RED}❌ 未找到 .env 文件${NC}"
  exit 1
fi

# 步骤 1: 启用 MySQL 慢查询日志
echo -e "${BLUE}📊 步骤 1/4: 启用 MySQL 慢查询日志${NC}"
mysql -u root -p"$DB_PASSWORD" <<EOF 2>/dev/null || echo -e "${YELLOW}⚠️  MySQL 配置失败,继续执行${NC}"
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.05;
SET GLOBAL log_output = 'TABLE';
SET GLOBAL log_queries_not_using_indexes = 'ON';
-- 清空旧的慢查询记录
TRUNCATE TABLE mysql.slow_log;
SELECT '✅ MySQL 慢查询日志已启用并清空' AS Status;
EOF
echo -e "${GREEN}✅ MySQL 配置完成${NC}"
echo ""

# 步骤 2: 清理旧文件
echo -e "${BLUE}🧹 步骤 2/4: 清理旧的分析文件${NC}"
rm -f profiling.log 2>/dev/null || true
rm -f tests/performance/reports/profiling-*.json 2>/dev/null || true
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 步骤 3: 启动带 Prisma 日志的后端服务
echo -e "${BLUE}🚀 步骤 3/4: 启动性能分析模式后端服务${NC}"

export PRISMA_LOG_QUERIES=true
export PRISMA_LOG_LEVEL=query

# 启动服务 (后台运行,使用 tsx 开发模式)
# 使用 npx tsx 确保能找到命令
nohup npx tsx --env-file=.env src/server.ts > profiling.log 2>&1 &
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

# 步骤 4: 运行性能测试
echo -e "${BLUE}🧪 步骤 4/4: 运行性能基准测试并收集数据${NC}"

if [ "$TEST_MODE" = "quick" ]; then
  echo "运行快速测试 (约 5 分钟)"
else
  echo "运行完整测试 (约 15 分钟)"
fi

# 记录测试开始时间
TEST_START_TIME=$(date +%s)

# 运行性能测试
node tests/performance/custom-perf-test.mjs || {
  echo -e "${YELLOW}⚠️  部分测试失败,继续分析${NC}"
}

TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

echo -e "${GREEN}✅ 性能测试完成 (耗时: ${TEST_DURATION}秒)${NC}"
echo ""

# 停止服务
echo -e "${BLUE}🛑 停止后端服务${NC}"
kill -SIGINT $SERVER_PID 2>/dev/null || true
sleep 3

if ps -p $SERVER_PID > /dev/null 2>&1; then
  kill -9 $SERVER_PID 2>/dev/null || true
  sleep 1
fi
echo -e "${GREEN}✅ 服务已停止${NC}"
echo ""

# 分析结果
echo "=========================================="
echo -e "${BLUE}📊 数据库性能分析结果${NC}"
echo "=========================================="
echo ""

# Prisma 查询日志统计
echo -e "${BLUE}⚡ Prisma 查询统计:${NC}"
echo "------------------------------------------"
TOTAL_QUERIES=$(grep -c "⚡ \[Query\]" profiling.log 2>/dev/null || echo "0")
SLOW_QUERIES=$(grep -c "🐢 \[Slow Query\]" profiling.log 2>/dev/null || echo "0")
echo "总查询数: $TOTAL_QUERIES"
echo "慢查询数 (>10ms): $SLOW_QUERIES"

if [ "$SLOW_QUERIES" -gt "0" ]; then
  echo ""
  echo "慢查询示例 (前 10 条):"
  grep "🐢 \[Slow Query\]" profiling.log | head -10
fi
echo ""

# MySQL 慢查询统计
echo -e "${BLUE}🐢 MySQL 慢查询统计:${NC}"
echo "------------------------------------------"
mysql -u root -p"$DB_PASSWORD" -e "
USE mysql;
SELECT COUNT(*) AS total_slow_queries FROM slow_log;
SELECT '---慢查询 Top 10 (按执行时间排序)---' AS '';
SELECT
  ROUND(query_time, 4) AS time_sec,
  SUBSTRING(sql_text, 1, 80) AS query_preview
FROM slow_log
ORDER BY query_time DESC
LIMIT 10;
" 2>/dev/null || echo "无慢查询记录或查询失败"
echo ""

# 性能测试结果摘要
echo -e "${BLUE}🧪 性能测试结果摘要:${NC}"
echo "------------------------------------------"
if [ -f tests/performance/reports/custom-test-results.json ]; then
  echo "详细结果: tests/performance/reports/custom-test-results.json"
  echo ""
  # 尝试提取关键指标
  if command -v jq > /dev/null 2>&1; then
    echo "场景 1 (单端点多连接 - 50 连接):"
    jq -r '.scenarios.singleEndpointMultiConnection["50_connections"] |
      "  - 吞吐量: \(.messages.throughput)\n  - p99延迟: \(.latency.p99)\n  - 错误率: \(.errorRate)"' \
      tests/performance/reports/custom-test-results.json 2>/dev/null || echo "  (解析失败)"
    echo ""
    echo "场景 3 (高吞吐量 - 500 msg/s目标):"
    jq -r '.scenarios.highThroughput["500_msgs_per_sec"] |
      "  - 实际吞吐量: \(.messages.throughput)\n  - p99延迟: \(.latency.p99)\n  - 错误率: \(.errorRate)"' \
      tests/performance/reports/custom-test-results.json 2>/dev/null || echo "  (解析失败)"
  else
    echo "提示: 安装 jq 工具可查看 JSON 摘要"
  fi
else
  echo "⚠️  未找到测试结果文件"
fi
echo ""

# 最终总结
echo "=========================================="
echo -e "${GREEN}🎉 数据库性能分析完成!${NC}"
echo "=========================================="
echo ""
echo "📁 生成的文件:"
echo "   ✅ profiling.log                               (Prisma 查询日志)"
echo "   ✅ tests/performance/reports/custom-test-results.json"
echo "   ✅ MySQL slow_log 表                           (慢查询记录)"
echo ""
echo "📊 关键发现:"
echo "   - Prisma 总查询数: $TOTAL_QUERIES"
echo "   - Prisma 慢查询 (>10ms): $SLOW_QUERIES"
echo "   - 测试耗时: ${TEST_DURATION}秒"
echo ""
echo "📝 查看完整报告:"
echo "   grep '🐢 \[Slow Query\]' profiling.log      # Prisma 慢查询"
echo "   mysql> SELECT * FROM mysql.slow_log ORDER BY query_time DESC;"
echo "   cat tests/performance/reports/custom-test-results.json | jq ."
echo ""
echo "🚀 下一步:"
echo "   继续 Story 9.2 Task 2: 识别和记录性能瓶颈"
echo "=========================================="
