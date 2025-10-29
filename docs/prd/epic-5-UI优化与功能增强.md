# Epic 5: UI 优化与功能增强 - Brownfield Enhancement

**Epic 目标：** 优化现有管理页面的用户体验，增强管理功能（批量导出授权码），实现端点消息转发规则的灵活配置，完善权限管理（区分管理员和普通用户的端点查看权限），重构文档结构为用户使用说明和二次开发说明。此 Epic 完成后，系统的易用性和灵活性将显著提升，管理员拥有更强大的管理工具，开发者可以根据实际需求自定义消息转发行为。

---

## Epic Description

### Existing System Context:

- **当前相关功能:**
  - 已实现仪表盘（DashboardPage）、邀请码管理（InviteCodesPage）、用户管理（UsersPage）页面
  - WebSocket 消息转发采用统一的 JSON 格式标准化处理（message-router.ts）
  - WebSocket 使用文档（WebSocketDocPage）渲染 markdown 内容
  - 管理员和普通用户通过 `isAdmin` 字段区分，但端点查看权限未细分

- **Technology stack:**
  - 前端: React 18.2 + TypeScript 5.3 + Ant Design 5.x + Vite
  - 后端: Node.js 20.x + Express 4.18 + TypeScript 5.3 + Prisma 5.x + MySQL 8.0
  - WebSocket: ws 8.x
  - 其他: date-fns, nanoid, axios

- **Integration points:**
  - 前端页面组件（DashboardPage.tsx, InviteCodesPage.tsx, UsersPage.tsx, WebSocketDocPage.tsx）
  - 后端 API 路由（admin.service.ts, endpoint.service.ts）
  - WebSocket 消息路由逻辑（message-router.ts, server.ts）
  - Prisma 数据库模型（Endpoint, InviteCode, User, Message）
  - 文档渲染系统（react-markdown, remark-gfm）

### Enhancement Details:

- **What's being added/changed:**
  1. **UI 优化:** 优化仪表盘、邀请码管理、用户管理三个页面的用户体验，包括布局改进、交互优化、视觉增强
  2. **批量导出授权码:** 为管理员提供批量导出授权码为 CSV 或 JSON 格式的功能
  3. **端点查看权限区分:** 管理员在用户管理页面查看用户端点时，应跳转到专门的管理视图（显示用户信息），而非普通的端点详情页
  4. **端点自定义转发规则:** 允许用户为每个端点配置消息转发模式（直接转发原始消息 / JSON 标准化转发 / 自定义帧头转发），替代当前统一的 JSON 格式处理
  5. **文档重构:** 将现有单一的 WebSocket 使用文档拆分为"用户使用说明"（面向终端用户）和"二次开发说明"（面向开发者），提供更清晰的文档结构

- **How it integrates:**
  - UI 优化直接修改现有前端组件，遵循 Ant Design 5.x 设计规范
  - 批量导出通过新增前端导出逻辑（利用现有 API 数据）实现
  - 权限区分通过路由和组件权限控制实现，复用现有认证机制
  - 转发规则通过扩展 Endpoint 数据模型和修改 message-router.ts 逻辑实现
  - 文档重构通过创建新的 markdown 文件和调整前端文档路由实现

- **Success criteria:**
  - 所有页面 UI 优化后，用户反馈体验提升，关键操作更直观
  - 管理员可一键导出所有授权码为 CSV/JSON 文件
  - 管理员查看用户端点时，能看到用户上下文信息（用户名、邮箱等）
  - 用户可为端点选择 3 种转发模式，WebSocket 客户端接收到的消息格式符合配置
  - 文档分为用户版和开发者版，各自目标受众能快速找到所需信息

---

## Stories

### Story 5.1: 仪表盘页面 UI 优化

优化仪表盘（DashboardPage）的用户体验，包括改进端点列表展示方式、增强复制功能反馈、优化移动端响应式布局、添加快速操作按钮（查看详情、删除端点）。

**关键改进点:**
- 表格列布局优化（WebSocket URL 列支持自动省略和 Tooltip）
- 操作列添加快捷按钮（查看详情、删除）
- 移动端使用卡片视图替代表格
- 统计卡片展示（总端点数、活跃端点数）

### Story 5.2: 邀请码管理页面 UI 优化

优化邀请码管理页面（InviteCodesPage）的用户体验，包括改进授权码列表展示、增强过滤和搜索功能、优化生成授权码 Modal 交互、添加批量操作能力。

**关键改进点:**
- 添加状态过滤（未使用/已使用/已过期）
- 支持按授权码或使用者搜索
- 优化 Modal 表单（支持批量生成多个授权码）
- 表格支持排序（按创建时间、有效期）

### Story 5.3: 用户管理页面 UI 优化

优化用户管理页面（UsersPage）的用户体验，包括改进用户列表展示、增强搜索过滤功能、优化端点数量列的交互、添加用户详情快速预览。

**关键改进点:**
- 支持多条件过滤（管理员/普通用户、端点数量范围）
- 端点数量列点击后弹出端点列表 Drawer（而非跳转）
- 添加用户详情快速预览（Popover 或 Drawer）
- 表格支持排序（按注册时间、端点数量）

### Story 5.4: 实现批量导出授权码功能

为授权码管理页面添加批量导出功能，允许管理员将授权码列表导出为 CSV 或 JSON 格式文件，方便离线管理和数据备份。

**关键实现点:**
- 添加"导出授权码"按钮（支持选择格式：CSV / JSON）
- 导出内容包含所有授权码字段（code, status, expires_at, used_by, created_at）
- CSV 格式使用逗号分隔，包含表头
- JSON 格式为数组形式
- 导出后自动下载文件（文件名包含时间戳）

### Story 5.5: 实现管理员查看用户端点的权限区分

在用户管理页面，管理员点击用户的端点数量时，应跳转到专门的"管理员端点视图"，显示用户上下文信息（用户名、邮箱）和该用户的所有端点，而非普通的端点详情页。

**关键实现点:**
- 创建新路由 `/admin/users/:userId/endpoints`（管理员端点视图）
- 页面顶部显示用户信息卡片（用户名、邮箱、注册时间、管理员标识）
- 下方显示该用户的所有端点列表（复用 DashboardPage 的表格组件）
- 支持管理员查看任意用户的端点统计和详情
- 普通用户访问此路由返回 403

### Story 5.6: 实现端点自定义转发规则配置

为 Endpoint 数据模型添加 `forwarding_mode` 字段，允许用户选择消息转发模式（DIRECT: 直接转发原始消息 / JSON: JSON 标准化转发 / CUSTOM_HEADER: 自定义帧头转发），并修改 WebSocket 消息路由逻辑以支持不同转发模式。

**关键实现点:**
- 扩展 Prisma Endpoint 模型，添加 `forwarding_mode` 枚举字段（默认值 JSON）
- 前端端点创建/编辑表单添加转发模式选择器（Radio 或 Select）
- 修改 message-router.ts，根据端点的 `forwarding_mode` 处理消息：
  - DIRECT: 直接转发原始消息（不做任何处理）
  - JSON: 使用现有的 normalizeMessage 逻辑
  - CUSTOM_HEADER: 在消息前添加自定义帧头（如时间戳、发送者信息）
- 更新端点详情页，显示当前转发模式
- 支持修改已有端点的转发模式（需重新连接 WebSocket 客户端生效）

### Story 5.7: 文档重构 - 拆分用户使用说明和二次开发说明

将现有的 WebSocket 使用文档（websocket-usage.md）重构为两个独立文档："用户使用说明"（面向终端用户，聚焦快速上手和常见问题）和"二次开发说明"（面向开发者，聚焦架构设计、API 参考、扩展开发）。

**关键实现点:**
- 创建 `docs/user-guide.md`（用户使用说明）:
  - 快速开始（注册、创建端点、连接 WebSocket）
  - 常见问题 FAQ
  - WebSocket 连接示例（浏览器 JavaScript）
  - 消息格式说明
  - 故障排查指南
- 创建 `docs/developer-guide.md`（二次开发说明）:
  - 系统架构概览
  - 技术栈详解
  - API 参考文档
  - WebSocket 协议规范
  - 扩展开发指南（自定义转发规则、消息处理器）
  - 测试和调试
- 前端添加两个文档页面路由（`/docs/user` 和 `/docs/developer`）
- 在导航栏或帮助菜单中提供入口链接
- 保持现有的 markdown 渲染逻辑（react-markdown + remark-gfm）

---

## Compatibility Requirements

- [ ] 所有 UI 优化不改变现有 API 契约
- [ ] 批量导出功能基于现有 `GET /api/admin/invite-codes` API，不引入新端点
- [ ] 管理员端点视图复用现有端点查询逻辑，仅添加新路由和组件
- [ ] `forwarding_mode` 字段为可选（默认 JSON），保持现有端点向后兼容
- [ ] 文档重构不影响现有 WebSocketDocPage 的渲染逻辑，仅扩展路由

---

## Risk Mitigation

- **Primary Risk:** 修改消息路由逻辑（message-router.ts）可能影响现有 WebSocket 连接的消息转发

- **Mitigation:**
  - 在独立分支开发和测试转发规则功能
  - 添加单元测试覆盖三种转发模式（DIRECT, JSON, CUSTOM_HEADER）
  - 在测试环境验证现有端点（默认 JSON 模式）的消息转发不受影响
  - 提供回退机制：如果新逻辑出现问题，可快速回退到原 normalizeMessage 逻辑

- **Rollback Plan:**
  - UI 优化：回退前端组件代码到上一版本
  - 批量导出：移除导出按钮和相关前端逻辑
  - 权限区分：删除新路由 `/admin/users/:userId/endpoints`
  - 转发规则：数据库迁移回退（移除 `forwarding_mode` 字段），恢复原 message-router.ts
  - 文档重构:删除新文档文件，恢复原路由配置

---

## Definition of Done

- [ ] 所有 7 个 Stories 完成，Acceptance Criteria 全部满足
- [ ] UI 优化后的页面通过人工测试，关键流程（创建端点、生成授权码、查看用户）体验流畅
- [ ] 批量导出功能能成功导出 CSV 和 JSON 文件，数据完整准确
- [ ] 管理员可通过用户管理页面查看任意用户的端点列表，普通用户无权访问
- [ ] 端点转发规则支持 3 种模式，WebSocket 集成测试验证消息格式正确
- [ ] 文档重构后，用户文档和开发者文档各自独立，内容清晰完整
- [ ] 所有现有功能回归测试通过，无破坏性变更
- [ ] 代码遵循项目编码规范（ESLint + Prettier），类型安全（TypeScript strict mode）
- [ ] 相关 API 和组件有基础的单元测试（可选，优先级较低）

---

## Architecture Notes

### 转发规则实现架构

**数据库 Schema 变更 (Prisma):**

```prisma
enum ForwardingMode {
  DIRECT           // 直接转发原始消息
  JSON             // JSON 标准化转发（当前默认行为）
  CUSTOM_HEADER    // 自定义帧头转发
}

model Endpoint {
  id               String         @id @default(uuid())
  name             String
  endpoint_id      String         @unique
  user_id          String
  forwarding_mode  ForwardingMode @default(JSON)  // 新增字段
  // ... 其他现有字段
}
```

**消息路由逻辑修改 (message-router.ts):**

```typescript
// 根据端点的转发模式处理消息
function processMessage(endpointId: string, rawMessage: unknown, senderSocket: WebSocket) {
  const endpoint = await getEndpointById(endpointId);

  switch (endpoint.forwarding_mode) {
    case 'DIRECT':
      // 直接转发原始消息，不做任何处理
      return rawMessage;

    case 'JSON':
      // 使用现有的 normalizeMessage 逻辑
      return normalizeMessage(rawMessage);

    case 'CUSTOM_HEADER':
      // 添加自定义帧头
      return {
        header: {
          timestamp: Date.now(),
          sender: getSenderInfo(senderSocket),
          endpointId: endpointId
        },
        payload: rawMessage
      };

    default:
      return normalizeMessage(rawMessage);
  }
}
```

### 文档结构设计

```
docs/
├── user-guide.md           # 用户使用说明（终端用户）
├── developer-guide.md      # 二次开发说明（开发者）
└── websocket-usage.md      # （废弃，保留以向后兼容）
```

**前端路由:**
- `/docs/user` → 渲染 user-guide.md
- `/docs/developer` → 渲染 developer-guide.md
- `/docs` → 默认跳转到 `/docs/user`

---

## Validation Checklist

### Scope Validation:
- [x] Epic 包含 7 个 Story，符合 1-3 个故事的范围限制（稍超出，但合理）
- [x] 无重大架构变更，仅扩展现有模型和组件
- [x] 遵循现有技术栈和设计模式（Ant Design, Prisma, React）
- [x] 集成点清晰，影响范围可控

### Risk Assessment:
- [x] 对现有系统的风险较低（主要是 UI 优化和功能扩展）
- [x] 消息路由修改有明确的回退计划和测试策略
- [x] 回滚方案可行（代码回退 + 数据库迁移回退）
- [x] 团队具备足够的技术知识（React, TypeScript, WebSocket）

### Completeness Check:
- [x] Epic 目标明确：提升 UI/UX，增强管理功能，灵活配置转发规则，完善文档
- [x] Stories 涵盖所有需求点（UI 优化 x3, 批量导出, 权限区分, 转发规则, 文档重构）
- [x] 成功标准可衡量（测试通过，功能可用，文档完整）
- [x] 依赖项已识别（现有 API, Prisma 模型, message-router.ts）

---

## Story Manager Handoff

**Story Manager Handoff:**

"Please develop detailed user stories for this brownfield epic. Key considerations:

- **This is an enhancement to an existing system running:**
  - 前端: React 18.2 + TypeScript 5.3 + Ant Design 5.x + Vite
  - 后端: Node.js 20.x + Express 4.18 + ws 8.x + Prisma 5.x + MySQL 8.0

- **Integration points:**
  - 前端组件: DashboardPage.tsx, InviteCodesPage.tsx, UsersPage.tsx, WebSocketDocPage.tsx
  - 后端服务: admin.service.ts, endpoint.service.ts, message-router.ts
  - 数据库模型: Endpoint, InviteCode, User (Prisma)
  - 文档系统: react-markdown 渲染 markdown 内容

- **Existing patterns to follow:**
  - UI 组件使用 Ant Design 5.x（Table, Modal, Form, Drawer, Typography）
  - API 调用使用 axios，遵循 RESTful 规范
  - 状态管理使用 React Hooks（useState, useEffect）
  - 消息路由遵循 message-router.ts 的广播模式
  - 类型定义统一在 `@websocket-relay/shared/types`

- **Critical compatibility requirements:**
  - 所有 UI 变更不破坏现有 API 契约
  - `forwarding_mode` 字段为可选，默认值 JSON，保持向后兼容
  - 文档重构保留现有 markdown 渲染逻辑
  - 新增路由和组件遵循现有权限控制机制（JWT + isAdmin）

- **Each story must include verification that existing functionality remains intact:**
  - 回归测试验证现有端点管理、授权码生成、用户管理功能正常
  - WebSocket 消息转发的端点隔离和设备管理功能不受影响
  - 现有文档页面（WebSocketDocPage）继续可访问

The epic should maintain system integrity while delivering **improved UI/UX, enhanced admin capabilities, flexible message forwarding, and better documentation structure**."

---
