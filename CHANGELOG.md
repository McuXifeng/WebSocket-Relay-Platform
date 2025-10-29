# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-29

### ✨ Added - Epic 5: UI 优化与功能增强

#### 前端功能增强

- **Dashboard 页面优化** (Story 5.1)
  - 重新设计仪表盘布局，卡片式设计更清晰
  - 添加实时统计数据展示（总端点数、活跃连接数、消息总量）
  - 优化端点列表展示，支持快速跳转到详情页
  - 改进响应式设计，适配移动端显示

- **用户管理页面增强** (Story 5.2)
  - 优化用户列表展示，添加表格排序和筛选功能
  - 实现用户状态管理（启用/禁用账号）
  - 添加用户详细信息展示面板
  - 支持按用户名、邮箱搜索用户

- **授权码管理增强** (Story 5.3)
  - 实现批量导出授权码功能（CSV 格式）
  - 添加授权码生成记录（生成时间、使用状态）
  - 优化授权码列表展示，支持分页和搜索
  - 添加授权码使用情况统计

#### 后端功能增强

- **管理员端点查看权限** (Story 5.4)
  - 实现管理员查看所有用户端点的接口
  - 添加按用户筛选端点的功能
  - 新增管理员用户端点管理页面路由
  - 完善权限控制（区分管理员和普通用户）

- **WebSocket 消息转发规则配置** (Story 5.5, 5.6, 5.7)
  - 实现三种转发模式：
    - `DIRECT`: 直接转发原始消息
    - `JSON`: 消息包装为 JSON 格式（包含 senderId, data, timestamp）
    - `CUSTOM_HEADER`: 自定义头部字段转发
  - 数据库 Schema 更新支持转发模式配置
  - 前端添加端点配置界面
  - WebSocket 服务器支持设备标识和分组转发
  - 完整的消息路由和转发逻辑重构

#### 文档重构

- **开发者指南** (Story 5.8)
  - 创建详细的二次开发文档 `docs/developer-guide.md`
  - 包含项目架构、技术栈、开发环境搭建说明
  - API 接口文档和 WebSocket 协议说明
  - 代码结构和扩展指南

- **用户使用指南** (Story 5.8)
  - 创建用户友好的使用说明 `docs/user-guide.md`
  - 包含快速开始、功能介绍、常见问题
  - 前端添加文档导航页面（开发者指南页、用户指南页）
  - 移除旧的 `docs/websocket-usage.md`，整合到新文档体系

### 🚀 Planned - Epic 6: IoT 设备数据可视化平台

- 添加 Epic 6 完整规划文档 `docs/prd/epic-6-IoT设备数据可视化平台.md`
- 包含数据采集、解析、存储、可视化等核心功能设计
- 对标主流物联网云平台的可视化能力

### 🗃️ Database Changes

- 添加 `ForwardingMode` 枚举类型（DIRECT, JSON, CUSTOM_HEADER）
- `Endpoint` 表新增字段：
  - `forwarding_mode`: 转发模式配置，默认 JSON
  - `custom_header`: 自定义头部字段名称（可选）

### 🔧 Backend Improvements

- 优化 WebSocket 消息路由器 (`message-router.ts`)
  - 支持设备标识解析（Direct/JSON/Custom Header）
  - 实现设备分组和目标设备转发
  - 增强错误处理和日志记录
- 增强端点控制器 (`endpoint.controller.ts`)
  - 添加转发模式配置接口
  - 支持管理员查询用户端点
- 完善管理员控制器 (`admin.controller.ts`)
  - 实现用户端点查询接口
  - 添加授权码批量导出功能

### 🎨 Frontend Improvements

- 重构主要页面组件：
  - `DashboardPage.tsx`: 全新仪表盘设计
  - `EndpointDetailPage.tsx`: 优化端点详情展示
  - `admin/UsersPage.tsx`: 增强用户管理功能
  - `admin/InviteCodesPage.tsx`: 优化授权码管理界面
- 新增页面组件：
  - `admin/AdminUserEndpointsPage.tsx`: 管理员端点查看页面
  - `DeveloperGuidePage.tsx`: 开发者指南页面
  - `UserGuidePage.tsx`: 用户指南页面
- 优化组件：
  - `MessageHistoryCard.tsx`: 改进消息历史展示
  - `MainLayout.tsx`: 更新导航菜单结构

### 🧪 Testing

- 添加设备标识测试脚本：
  - `test-device-identify-direct.mjs`: 直接模式测试
  - `test-device-identify-json.mjs`: JSON 模式测试
  - `test-device-identify-custom-header.mjs`: 自定义头部模式测试

### 📝 Documentation

- 完成 Epic 5 所有 8 个 Story 的详细文档
- 创建完整的开发者指南和用户指南
- 添加 Epic 6 规划文档

### 🔄 Code Quality

- 遵循 SOLID 原则进行代码重构
- 保持 DRY 原则，消除代码重复
- 优化组件结构，提高可维护性
- 增强类型安全（TypeScript）

### 📊 Statistics

- Modified files: 24
- New files: 18
- Lines added: +1,753
- Lines deleted: -1,470
- Net change: +283 lines

---

## [1.0.0] - 2025-10-26

### 🎉 Initial Release

#### Core Features (Epic 1-4 完成)

- 完整的用户认证系统（注册、登录、授权码机制）
- WebSocket 端点管理功能
- WebSocket 消息转发核心服务
- 实时监控和管理功能
- 管理员后台系统
- 基础文档和部署配置

详细功能请参考 v1.0.0 版本文档。

---

[1.1.0]: https://github.com/yourusername/websocket-relay-platform/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/yourusername/websocket-relay-platform/releases/tag/v1.0.0
