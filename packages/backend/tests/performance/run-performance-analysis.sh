#!/bin/bash
# 性能分析自动化脚本 (Story 9.2 Task 1)
#
# 此脚本会:
# 1. 启用 MySQL 慢查询日志
# 2. 启动带 Node.js Profiler 的后端服务
# 3. 等待服务就绪
# 4. 运行性能测试
# 5. 停止服务并收集分析数据
# 6. 生成 Profiler 可读报告

set -e  # 遇到错误立即退出

echo "🔍 WebSocket Relay Platform - 性能分析流程"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 步骤 1: 启用 MySQL 慢查询日志
echo -e "${BLUE}📊 步骤 1/6: 启用 MySQL 慢查询日志${NC}"
echo "提示: 需要输入 MySQL root 密码"
mysql -u root -p < tests/performance/enable-mysql-slow-query-log.sql
echo -e "${GREEN}✅ MySQL 慢查询日志已启用${NC}"
echo ""

# 步骤 2: 清理旧的 profiler 文件
echo -e "${BLUE}🧹 步骤 2/6: 清理旧的分析文件${NC}"
rm -f isolate-*.log profile.txt 2>/dev/null || true
rm -f tests/performance/reports/profiling-*.json 2>/dev/null || true
echo -e "${GREEN}✅ 清理完成${NC}"
echo ""

# 步骤 3: 启动带 Profiler 的后端服务
echo -e "${BLUE}🚀 步骤 3/6: 启动性能分析模式后端服务${NC}"
echo "提示: 服务将在后台运行,日志输出到 profiling.log"

# 设置环境变量
export PRISMA_LOG_QUERIES=true
export PRISMA_LOG_LEVEL=query

# 启动服务 (后台运行)
nohup node --prof --experimental-vm-modules --loader tsx/esm src/server.ts > profiling.log 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}✅ 服务已启动 (PID: $SERVER_PID)${NC}"
echo ""

# 等待服务就绪
echo -e "${YELLOW}⏳ 等待服务就绪...${NC}"
sleep 5

# 检查服务是否正常运行
if ! ps -p $SERVER_PID > /dev/null; then
  echo -e "${RED}❌ 服务启动失败,请检查 profiling.log${NC}"
  cat profiling.log
  exit 1
fi
echo -e "${GREEN}✅ 服务就绪${NC}"
echo ""

# 步骤 4: 运行性能测试
echo -e "${BLUE}🧪 步骤 4/6: 运行性能基准测试${NC}"
echo "提示: 测试将持续约 10-15 分钟"
echo ""

# 运行自定义性能测试
if node tests/performance/custom-perf-test.mjs; then
  echo -e "${GREEN}✅ 性能测试完成${NC}"
else
  echo -e "${YELLOW}⚠️  性能测试部分失败,继续分析${NC}"
fi
echo ""

# 步骤 5: 停止服务
echo -e "${BLUE}🛑 步骤 5/6: 停止后端服务${NC}"
kill -SIGINT $SERVER_PID 2>/dev/null || true
sleep 2

# 如果进程还在运行,强制终止
if ps -p $SERVER_PID > /dev/null 2>&1; then
  kill -9 $SERVER_PID 2>/dev/null || true
fi
echo -e "${GREEN}✅ 服务已停止${NC}"
echo ""

# 步骤 6: 生成 Profiler 可读报告
echo -e "${BLUE}📊 步骤 6/6: 生成性能分析报告${NC}"

# 查找 isolate 文件
ISOLATE_FILE=$(ls -t isolate-*.log 2>/dev/null | head -1)

if [ -z "$ISOLATE_FILE" ]; then
  echo -e "${RED}❌ 未找到 profiler 输出文件 (isolate-*.log)${NC}"
  echo "请检查服务是否正确启动和停止"
  exit 1
fi

echo "处理 Profiler 数据: $ISOLATE_FILE"
node --prof-process "$ISOLATE_FILE" > profile.txt

echo -e "${GREEN}✅ Profiler 报告已生成: profile.txt${NC}"
echo ""

# 显示 Profiler 报告摘要
echo -e "${BLUE}📈 Profiler 报告摘要 (Top 10 热点函数):${NC}"
echo "=========================================="
grep -A 20 "\[Summary\]" profile.txt | head -25 || echo "摘要部分未找到"
echo ""
echo "完整报告: profile.txt"
echo ""

# 查询 MySQL 慢查询统计
echo -e "${BLUE}🐢 MySQL 慢查询统计 (Top 10):${NC}"
echo "=========================================="
mysql -u root -p -e "
USE mysql;
SELECT
  CONCAT('⏱️  ', ROUND(query_time, 3), 's') AS duration,
  SUBSTRING(sql_text, 1, 80) AS query_preview,
  start_time
FROM slow_log
ORDER BY query_time DESC
LIMIT 10;
" || echo "无慢查询记录 (所有查询 < 50ms)"
echo ""

# 显示 Prisma 查询日志摘要
echo -e "${BLUE}⚡ Prisma 查询日志摘要:${NC}"
echo "=========================================="
echo "提示: 查看 profiling.log 获取完整查询日志"
grep -c "\[Query\]" profiling.log && echo "总查询数: $(grep -c "\[Query\]" profiling.log)" || echo "无查询日志"
grep -c "\[Slow Query\]" profiling.log && echo "慢查询数 (>10ms): $(grep -c "\[Slow Query\]" profiling.log)" || echo "无慢查询"
echo ""

# 最终总结
echo "=========================================="
echo -e "${GREEN}🎉 性能分析完成!${NC}"
echo ""
echo "📁 生成的文件:"
echo "   - profile.txt                                  (Node.js CPU Profiler 报告)"
echo "   - profiling.log                                (后端服务日志,包含 Prisma 查询)"
echo "   - tests/performance/reports/custom-test-results.json  (性能测试结果)"
echo "   - MySQL slow_log 表                             (慢查询记录)"
echo ""
echo "📝 下一步:"
echo "   1. 分析 profile.txt 找出 CPU 热点函数"
echo "   2. 查看 profiling.log 中的慢查询 (标记为 🐢)"
echo "   3. 查询 MySQL: SELECT * FROM mysql.slow_log ORDER BY query_time DESC;"
echo "   4. 继续 Task 2: 识别和记录性能瓶颈"
echo "=========================================="
