-- MySQL 慢查询日志配置脚本
-- 用于性能分析 (Story 9.2)
--
-- 使用方法:
-- 1. 连接到 MySQL: mysql -u root -p
-- 2. 执行此脚本: source enable-mysql-slow-query-log.sql
-- 3. 运行压力测试
-- 4. 查询慢查询统计: SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;

-- 启用慢查询日志
SET GLOBAL slow_query_log = 'ON';

-- 设置慢查询阈值为 50ms (与 AC 目标一致)
SET GLOBAL long_query_time = 0.05;

-- 设置慢查询日志输出到表 (方便查询)
SET GLOBAL log_output = 'TABLE';

-- 记录未使用索引的查询
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- 验证配置
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
SHOW VARIABLES LIKE 'log_output';
SHOW VARIABLES LIKE 'log_queries_not_using_indexes';

-- 显示成功消息
SELECT '✅ MySQL 慢查询日志已启用' AS Status;
SELECT '📊 慢查询阈值: 50ms' AS Config;
SELECT '📝 查看慢查询: SELECT * FROM mysql.slow_log ORDER BY query_time DESC LIMIT 10;' AS Help;
