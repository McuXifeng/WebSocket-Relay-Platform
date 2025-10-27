# Next Steps

## UX Expert Prompt

你好！我是 UX 专家，现在需要为 **WebSocket 中继共享平台** 设计用户体验架构。

请阅读以下文档：
- **PRD 文档：** `docs/prd.md` - 完整的产品需求文档
- **Project Brief：** `docs/brief.md` - 项目简介和背景信息

**你的任务：**

1. 基于 PRD 的 **UI Design Goals** 部分，设计详细的用户界面规范
2. 创建核心页面的线框图或组件结构图
3. 设计用户流程图（注册→登录→创建端点→连接测试）
4. 定义 Ant Design 组件使用规范和自定义样式指南
5. 确保所有设计符合 PRD 的约束：
   - 禁止渐变色
   - 禁止 Emoji
   - 强制使用 SVG 图标
   - 最大化复用 Ant Design 组件
   - 桌面优先，移动端基础支持

**交付物：**
- UX 设计文档（`docs/ux-design.md`）
- 核心页面线框图或组件树（可选）
- 用户流程图（推荐使用 Mermaid）
- Ant Design 主题配置建议

**关键参考：**
- PRD 的 **Core Screens and Views** 列出了 9 个核心页面
- PRD 的 **Key Interaction Paradigms** 定义了交互原则
- PRD 的 **Branding** 部分定义了色彩方案

请开始 UX 设计工作！

## Architect Prompt

你好！我是系统架构师，现在需要为 **WebSocket 中继共享平台** 设计技术架构。

请阅读以下文档：
- **PRD 文档：** `docs/prd.md` - 完整的产品需求文档
- **Project Brief：** `docs/brief.md` - 项目简介和背景信息

**你的任务：**

1. 设计系统架构，包括：
   - 整体系统架构图（REST API + WebSocket Server + Database）
   - 数据库 Schema 详细设计（基于 Story 1.3、2.1、3.5）
   - API 接口设计（所有 REST API 端点和 WebSocket 协议）
   - 目录结构设计（Monorepo 的详细文件组织）

2. 技术选型验证和细化：
   - 验证 PRD 中的技术选型是否合理
   - 细化 TypeScript 配置、Prisma Schema、WebSocket 服务器架构
   - 设计 JWT 认证流程和中间件架构
   - 设计 WebSocket 消息路由机制（`Map<endpoint_id, Set<WebSocket>>`）

3. 关键技术决策：
   - WebSocket 连接池管理策略
   - 数据库连接池配置
   - 错误处理和日志记录策略
   - 安全措施实施细节（bcrypt、JWT、CORS、速率限制）

4. 风险评估和缓解：
   - 并发瓶颈风险
   - WebSocket 内存泄漏风险
   - 安全漏洞风险
   - 针对每个风险提出缓解方案

5. 开发环境和部署架构：
   - 本地开发环境配置
   - PM2 进程管理配置
   - Nginx 反向代理配置
   - 生产环境部署流程

**交付物：**
- 架构设计文档（`docs/architecture.md`）
- 系统架构图（推荐使用 Mermaid）
- 数据库 Schema（Prisma Schema 格式）
- API 规范文档（可选：OpenAPI/Swagger 格式）
- 技术风险评估报告

**关键参考：**
- PRD 的 **Technical Assumptions** 明确了所有技术选型
- PRD 的 **Requirements** 定义了 20 个功能需求和 12 个非功能需求
- PRD 的 **Epic Details** 包含 32 个 Stories，详细描述了实现细节
- Brief 的 **Technical Considerations** 提供了架构设计指导

**特别注意：**
- 架构必须支持 MVP 的性能要求：<100ms 延迟、10 个端点、5 个连接/端点
- WebSocket 服务器必须支持端点隔离和消息广播
- 数据库设计必须支持统计数据的高效查询

请开始架构设计工作！

---
