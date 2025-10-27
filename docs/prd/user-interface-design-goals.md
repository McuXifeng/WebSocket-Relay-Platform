# User Interface Design Goals

## Overall UX Vision（整体用户体验愿景）

打造极简、高效的 WebSocket 端点管理平台。核心设计理念是"零学习曲线"——用户无需阅读文档即可完成核心操作。界面最大化复用 Ant Design 组件库的现成方案，保持简洁专业的外观，避免自定义视觉设计带来的开发成本。

所有操作提供即时反馈（使用 Ant Design 的 message 和 notification 组件），让用户始终清楚当前系统状态。实时监控数据以简洁的数字和状态徽章呈现，避免复杂的图表和可视化（MVP 阶段）。

## Key Interaction Paradigms（关键交互范式）

**1. 组件库优先原则**
- 所有 UI 组件直接使用 Ant Design，不进行自定义视觉设计
- Toast 通知使用 `message.success()` / `message.error()`
- 确认对话框使用 `Modal.confirm()`
- 表单使用 `Form` 组件的内置验证
- 避免自定义样式和动画，保持 Ant Design 默认风格

**2. 一键操作优先**
- 创建端点：单个"创建"按钮（Ant Design Button 组件）
- 复制 URL：点击复制按钮，使用 `message.success('已复制')` 反馈
- 删除端点：`Modal.confirm()` 确认对话框防止误操作

**3. 实时反馈与状态可见**
- 连接数、消息统计实时更新（数字显示）
- WebSocket 连接状态使用 `Badge` 组件的 status 属性（绿色=在线，灰色=离线）
- 操作结果通过 Ant Design 的 message 组件即时反馈

**4. 简单直接的信息层次**
- 端点列表：使用 `Table` 或 `List` 组件，直接展示所有关键信息
- 详情页面：使用独立路由页面（而非弹窗或展开）
- 避免复杂的交互层次和"渐进式披露"

## Core Screens and Views（核心页面和视图）

**P0（必须实现）：**
1. **登录页面**：Ant Design Form 组件 + Card 布局
2. **注册页面**：授权码输入 + 用户信息表单
3. **端点管理主页**：Table 或 List 显示端点，顶部"创建端点"按钮

**P1（重要）：**
4. **端点详情页**：Descriptions 组件显示端点信息，Statistic 组件显示实时统计
5. **个人中心页面**：用户基本信息，Statistic 显示账户统计

**P2（管理功能）：**
6. **授权码管理页面**：Table 显示授权码列表，Modal 表单生成新授权码
7. **用户管理页面**：Table 显示用户列表

**P3（文档，可选）：**
8. **使用文档页面**：Typography 组件渲染 markdown
9. **快速开始页面**：Steps 组件展示引导流程（可选）

## Accessibility（可访问性）

**WCAG AA（依赖组件库支持）**

- 色彩对比度由 Ant Design 默认主题保证（符合 WCAG AA）
- 键盘导航由 Ant Design 组件自动支持
- 使用语义化 HTML（`<button>` 而非 `<div onclick>`）
- 表单字段使用 Form.Item 的 label 属性

**MVP 阶段不额外开发自定义可访问性功能。**

## Branding（品牌）

**简约技术风格（基于 Ant Design 默认主题）**

**色彩方案（禁止渐变）：**
- 主色调：Ant Design 蓝 `#1890ff`
- 成功色：`#52c41a`
- 错误色：`#ff4d4f`
- 警告色：`#faad14`
- 中性色：Ant Design 灰度系列
- **禁止使用任何渐变色（gradient）**

**图标规范：**
- **强制使用 SVG 格式**
- 优先使用 `@ant-design/icons` 图标库
- **禁止使用 Emoji**

**字体：**
- 系统字体栈：Ant Design 默认字体配置
- 代码/URL：`font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace`

**组件库选择：**
- **Ant Design 5.x**（最新稳定版）
- 理由：中文文档完善，组件丰富，图标全部 SVG，主题配置简单

## Target Device and Platforms（目标设备和平台）

**Web Responsive（桌面优先，移动端基础支持）**

- **主要支持：** 桌面浏览器（Chrome 90+、Firefox 88+、Safari 14+、Edge 90+）
- **屏幕分辨率：** 1280x720 及以上（主要优化目标）
- **移动端：** 基础可用（可以登录、查看列表、复制 URL），但不优化复杂交互
- **不支持 IE 11** 及更早版本

**说明：** Ant Design 提供基础的响应式布局，MVP 阶段无需额外优化移动端体验。

---
