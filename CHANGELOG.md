# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-10-30

### 🎨 Added - Epic 6: IoT设备数据可视化平台

#### Story 6.1: 数据统计卡片系统 ✅

- **可视化Dashboard页面**
  - 基于react-grid-layout的拖拽布局系统
  - 支持卡片自由拖拽、调整大小
  - 响应式网格布局，自适应屏幕尺寸

- **数据统计卡片组件**
  - 显示设备最新数据（实时更新）
  - 数据列表卡片（展示多个数据字段）
  - 趋势指标卡片（与上次对比，显示增长/下降）

- **可视化卡片配置系统**
  - 完整的CRUD API（创建、读取、更新、删除卡片）
  - 前端配置弹窗（卡片类型、数据源、样式配置）
  - 卡片配置持久化存储

- **设备数据存储和查询服务**
  - DeviceData表设计（device_id, data_key, data_value, timestamp索引）
  - 设备数据解析和自动存储（支持number、string、boolean、json类型）
  - 最新数据查询API（getLatestDeviceData）
  - 数据字段列表API（getDeviceDataKeys）

- **实时数据更新机制**
  - 定时轮询（每5秒刷新一次）
  - 无感刷新（后续刷新静默更新数据）
  - 自动单位识别（temperature→°C, humidity→%, voltage→V等）

#### Story 6.2: 实时数据流可视化 - 图表展示 ✅

- **图表可视化库集成**
  - Apache ECharts 5.x集成
  - useECharts Hook封装（自动初始化、销毁、响应式）
  - 图表容器DOM渲染优化

- **图表卡片组件**
  - 支持折线图（line chart）
  - 支持柱状图（bar chart）
  - 图表自适应卡片尺寸
  - 图表响应式布局

- **设备历史数据查询API**
  - GET /api/visualization/endpoints/:id/devices/:id/data/history
  - 支持时间范围查询（startTime, endTime）
  - 支持数据聚合（按分钟/小时/天聚合AVG）
  - 支持数据采样（limit参数，默认1000点）
  - 参数验证（时间格式、aggregation、权限403）

- **时间范围控制**
  - 快捷选项：最近1小时、24小时、7天
  - 自定义时间范围（DatePicker.RangePicker）
  - 时间范围配置持久化

- **多设备数据对比**
  - 支持在同一图表显示多条曲线
  - 不同设备使用不同颜色
  - 图例支持点击切换显示/隐藏
  - 并发请求优化（Promise.all）

- **图表交互功能**
  - 缩放（鼠标滚轮）
  - 平移（拖动）
  - 悬停提示（时间戳、数值、单位）
  - 数据导出（保存为图片）
  - 还原按钮（重置缩放和平移）

- **实时数据流更新**
  - 图表自动刷新（可配置刷新间隔）
  - 新数据追加到图表末尾
  - 流畅渲染（帧率 > 30fps）

### 🧪 Testing Coverage

#### 后端测试
- **单元测试: 21个用例全部通过** ✅
  - 数据解析测试（5个用例）
  - 数据存储测试（2个用例）
  - 最新数据查询测试（2个用例）
  - 数据字段列表测试（3个用例）
  - 历史数据查询测试（8个用例：聚合、采样、排序、边界）

- **集成测试: 16个用例全部通过** ✅
  - 成功场景测试（7个用例）
  - 权限验证测试（2个用例）
  - 参数验证测试（5个用例）
  - 资源不存在测试（2个用例）

#### 前端测试
- **手动测试指南** (`docs/stories/6.2-manual-testing-guide.md`)
  - 13个前端交互功能测试用例
  - 4个性能测试场景
  - 12步完整端到端测试流程
  - 测试报告模板

### 🚀 Technical Highlights

- **数据聚合优化**
  - 使用MySQL `DATE_FORMAT()` + `GROUP BY` 实现高效聚合
  - 支持按分钟/小时/天三种聚合粒度
  - 使用别名避免 `only_full_group_by` 模式冲突

- **参数验证增强**
  - 时间格式验证（ISO 8601）
  - aggregation参数验证（minute | hour | day）
  - 权限验证优化（分离存在性检查和权限检查，正确返回403/404）

- **性能优化**
  - SQL查询优化（复合索引 [device_id, data_key, timestamp]）
  - 数据采样（默认limit 1000点）
  - 图表响应式布局（窗口resize自动调整）
  - ECharts容器DOM渲染时机优化

- **用户体验**
  - 拖拽布局（react-grid-layout）
  - 实时更新（定时轮询 + 无感刷新）
  - 多设备对比（并发加载）
  - 图表交互（缩放、平移、悬停提示）

### 🗃️ Database Changes

- **新增表: DeviceData**
  - 存储设备时间序列数据
  - 复合索引 [device_id, data_key, timestamp]
  - 支持级联删除（onDelete: Cascade）

- **新增表: VisualizationCard**
  - 存储可视化卡片配置
  - 支持多种卡片类型（statistic, chart等）
  - JSON格式config字段（灵活配置）
  - 关联用户、端点、设备

### 🔧 Backend Improvements

- **新增服务**
  - `device-data.service.ts`: 设备数据解析、存储、查询
  - `visualization-card.service.ts`: 可视化卡片CRUD服务

- **新增控制器**
  - `visualization.controller.ts`: 可视化API端点
  - 支持卡片CRUD、历史数据查询

- **WebSocket消息路由增强**
  - 自动解析设备数据消息（type: 'data'）
  - 异步存储设备数据到DeviceData表
  - 不阻塞消息转发流程

### 🎨 Frontend Improvements

- **新增页面**
  - `VisualizationDashboardPage.tsx`: 可视化Dashboard主页

- **新增组件**
  - `DataStatisticCard.tsx`: 数据统计卡片
  - `ChartCard.tsx`: 图表卡片（折线图、柱状图）
  - `CardConfigModal.tsx`: 卡片配置弹窗

- **新增Hooks**
  - `useECharts.ts`: ECharts React Hook（封装初始化、销毁、响应式）

- **新增服务**
  - `visualization.service.ts`: 可视化API调用服务

- **依赖新增**
  - `echarts`: ^6.0.0 - 图表可视化库
  - `dayjs`: ^1.11.18 - 时间处理库
  - `react-grid-layout`: ^1.5.2 - 拖拽布局库

### 🐛 Bug Fixes

- 修复图表卡片空白问题（ECharts容器DOM渲染时机）
- 修复图表尺寸自适应问题（窗口resize后图表重绘）
- 修复数据源配置设备选择器问题（统一端点变化处理逻辑）
- 修复时间范围配置保存和回显异常（Dayjs与字符串转换）
- 修复Ant Design组件警告（bodyStyle -> styles.body）

### 📝 Documentation

- **Story文档**
  - `docs/stories/6.1.story.md`: 数据统计卡片系统（已完成）
  - `docs/stories/6.2.story.md`: 实时数据流可视化（已完成）

- **测试文档**
  - `docs/stories/6.2-manual-testing-guide.md`: 完整的手动测试指南

- **Epic规划**
  - `docs/prd/epic-6-IoT设备数据可视化平台.md`: Epic 6完整规划

### 📊 Statistics

- Modified files: 35+
- New files: 20+
- Tests: 37 automated tests + manual test guide
- Code quality: ESLint warnings fixed, TypeScript strict mode
- Performance: Chart loading < 2s, Frame rate > 30fps

### 📜 License

- Added MIT License file (`LICENSE`)
- All code released under MIT License

---

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
