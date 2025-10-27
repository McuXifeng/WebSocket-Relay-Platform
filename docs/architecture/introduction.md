# Introduction

本文档概述了 **WebSocket 中继共享平台** 的完整全栈架构，涵盖后端系统、前端实现及其集成方式。它是 AI 驱动开发的唯一真相来源，确保整个技术栈的一致性。

该统一方法结合了传统上分离的后端和前端架构文档，简化了现代全栈应用的开发流程，其中这些关注点日益交织在一起。

## Starter Template or Existing Project

**N/A - Greenfield 项目**

本项目是从零开始的新项目，未基于任何现有 starter template 或项目。技术选型完全根据 PRD 需求定制：

- **Monorepo 结构**：使用 pnpm workspace 管理前后端代码
- **前端框架**：Vite + React + TypeScript + Ant Design 5.x
- **后端框架**：Express + Prisma ORM + MySQL
- **WebSocket 服务**：独立 ws 服务器

虽然未使用预制模板，但架构设计充分利用这些技术的最佳实践和社区推荐配置。

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-27 | v1.0 | 初始架构文档创建 | Winston (Architecture Agent) |

---
