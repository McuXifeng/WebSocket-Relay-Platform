# Changelog

所有项目的重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.7.0] - 2025-11-10

### 新增 ✨

- **Docker 部署支持**
  - 新增 Backend Dockerfile，支持多阶段构建和生产环境优化
  - 新增 Frontend Dockerfile，集成 Nginx 作为静态文件服务器
  - 新增 docker-compose.yml，一键启动完整服务（MySQL + Backend + Frontend）
  - 新增 .dockerignore，优化构建性能和镜像大小
  - 新增 .env.docker 环境变量模板，方便生产环境配置
  - 新增 `docs/DOCKER_DEPLOY.md`，提供完整的宝塔面板 Docker 部署指南（包括反向代理、SSL配置、运维管理）

- **可视化组件增强**
  - 新增 `GaugeCard` 仪表盘卡片组件，支持百分比/范围数据展示
  - 新增 `StatusCard` 状态指示器卡片组件，支持状态灯和文本映射
  - 增强 `CardConfigModal`，支持更多可视化配置选项（阈值、颜色、单位）

- **测试基础设施**
  - 新增 `stats-batch-updater.test.ts` 单元测试，覆盖统计批量更新逻辑
  - 新增 `websocket-disconnect-test.mjs` 性能测试，验证断开连接性能优化
  - 新增 `packages/backend/tests/unit/websocket/` 测试目录结构

### 改进 🚀

- **Epic 10 Story 10.5: WebSocket 心跳和连接状态优化**
  - WebSocket 心跳间隔从 30 秒优化到 15 秒，降低异常断开检测延迟（从 60 秒降低到 30 秒）
  - 新增连接时长统计（`connectedAt`），方便日志分析和问题排查
  - 优化日志级别：正常断开使用 `logger.info`，超时/错误使用 `logger.warn`
  - 增强断开原因日志，包含 `endpointId`、`deviceId`、`connectionDuration` 等关键信息
  - 统计批量更新器：断开连接时立即刷新状态，提升连接状态更新实时性（设计权衡：牺牲批量优化，但断开频率低，性能影响可忽略）

- **文档完善**
  - 更新 `docs/architecture/backend-architecture.md`，补充 WebSocket 心跳机制说明
  - 更新 `docs/architecture/data-models.md`，新增可视化卡片配置数据模型
  - 更新 `docs/architecture/database-schema.md`，补充 Prisma schema 详细说明
  - 新增 `docs/architecture/testing-strategy.md`，定义单元测试、集成测试、性能测试策略
  - 更新 `README.md`，新增 Docker 部署指南入口链接

### 移除 🗑️

- **测试脚本重构**
  - 删除所有根目录临时测试脚本（test-_.mjs, test-_.sh），统一迁移到 `packages/*/tests/` 目录
  - 删除调试脚本（debug-connections.mjs, get-endpoint.mjs）
  - 删除根目录 tsconfig.json（项目使用 packages 内的独立配置）

### 技术债务优化 🔧

- 规范化测试代码结构，提升可维护性
- 优化 Docker 镜像构建，减少不必要的文件打包
- 统一日志输出方式，使用 logger 替代 console.log

---

## [1.6.1] - 2024-11-09

### 修复 🐛

- 修复用户列表 API 缺失封禁字段导致前端状态显示错误

---

## [1.6.0] - 2024-11-08

### 新增 ✨

- 移动端适配与协议文档完善
- 性能优化与移动端依赖完善

### 修复 🐛

- 修复 `pnpm test:performance` 并完善性能测试基础设施

---

## [1.5.1] - 2024-11-07

### 改进 🚀

- 告警系统性能优化
- 已读功能完善

---

## [1.5.0] - 2024-11-06

### 新增 ✨

- Story 7.1: 数据查询和协议简化

---

## [1.4.1] - 2024-11-05

### 新增 ✨

- Story 6.6: 设备分组和批量管理功能

---

## [1.4.0] - 2024-11-04

### 新增 ✨

- 智能警报与设备控制系统

---

## 版本类型说明

- **Major（主版本）**：不兼容的 API 修改
- **Minor（次版本）**：向下兼容的功能性新增
- **Patch（修订版本）**：向下兼容的问题修正

## 图标说明

- ✨ 新增功能
- 🚀 改进/优化
- 🐛 Bug 修复
- 🗑️ 移除功能
- 🔧 技术债务优化
- 📝 文档更新
- 🔒 安全修复

---

**维护者：老王**
**最后更新：2025-11-10**
