# Epic 8: 告警系统用户体验增强 - Brownfield Enhancement

**Epic 目标：** 提升告警系统的用户体验，完善已读功能交互、优化移动端告警历史界面、更新下位机通信协议文档，让用户能够更便捷地管理告警，提高移动端使用体验，并为下位机开发者提供完整清晰的协议文档。

---

## Epic Description

### Existing System Context:

- **当前相关功能:**
  - 已实现智能告警系统（Epic 6 Story 6.5）
    - 告警规则创建、编辑、删除
    - 告警历史记录和状态管理（unread/read/processed）
    - 邮件通知功能
  - 已实现告警系统优化（Epic 7 Story 7.2）
    - 邮件发送性能优化（异步队列、连接池复用）
    - 告警历史去重机制
    - 性能监控指标
  - 已有告警历史管理API和前端页面
    - `GET /api/endpoints/:id/alert/history` - 查询告警历史
    - `PUT /api/endpoints/:id/alert/:alertId/read` - 标记单个告警已读
    - `DELETE /api/endpoints/:id/alert/:alertId` - 删除单个告警
    - 前端告警历史列表页面（AlertHistoryPage.tsx）

- **Technology stack:**
  - 后端: Node.js 20.x + Express 4.18 + TypeScript 5.3 + Prisma 5.x
  - 前端: React 18.2 + TypeScript 5.3 + Ant Design 5.x
  - 邮件服务: Nodemailer
  - 数据库: MySQL 8.0

- **Integration points:**
  - 告警历史服务（alert-history.service.ts）
  - 告警通知服务（alert-notification.service.ts）
  - 告警历史API（endpoint.controller.ts）
  - 前端告警历史页面（AlertHistoryPage.tsx）
  - 邮件模板（alert-notification.service.ts）
  - 下位机通信协议文档（docs/protocol-specification.md）

### Enhancement Details:

- **What's being added/changed:**

  1. **完善告警已读功能 (Story 8.1):**
     - **批量已读功能：** 前端添加"全部已读"按钮，支持一键标记所有未读告警为已读
       - 前端：AlertHistoryPage 添加批量操作按钮
       - 后端：新增批量已读 API（`PUT /api/endpoints/:id/alert/bulk-read`）
       - 用户体验：避免逐个点击，提升处理效率

     - **邮件内快速已读：** 告警邮件中添加"标记已读"链接，无需登录系统即可快速已读
       - 后端：生成带签名的一次性已读 Token（包含 alertId + timestamp + signature）
       - 邮件模板：添加已读链接按钮（`GET /api/alert/mark-read?token=xxx`）
       - 安全机制：Token 签名验证、过期时间（24小时）、一次性使用
       - 用户体验：移动端收到邮件后，点击链接即可完成已读，无需登录

     - **防止已读后重复触发告警：** 优化告警检测逻辑，已读告警在一定时间内（可配置）不会重复触发
       - 后端：alert-detector.service.ts 中添加已读告警过滤逻辑
       - 逻辑：检测到告警条件满足时，查询是否存在最近已读的相同告警（时间窗口：24小时）
       - 配置项：新增环境变量 `ALERT_READ_COOLDOWN_HOURS`（默认 24 小时）
       - 用户体验：避免用户处理过的告警短时间内再次骚扰

  2. **优化移动端告警历史UI (Story 8.2):**
     - **响应式布局优化：** 针对移动端屏幕（<768px）优化告警历史列表显示
       - 卡片式布局：每条告警独立卡片显示，替代PC端表格布局
       - 紧凑信息排版：合理利用屏幕空间，重要信息优先显示
       - 触摸友好：增大按钮点击区域（最小 44x44 px），避免误触

     - **移动端操作优化：**
       - 滑动操作：左滑显示"标记已读"和"删除"操作（参考iOS原生体验）
       - 下拉刷新：支持下拉刷新告警列表
       - 底部操作栏：固定底部显示"全部已读"和"筛选"按钮
       - 快速筛选：移动端优化筛选面板（底部抽屉式）

     - **视觉优化：**
       - 告警级别标识：使用颜色条（左侧边栏）代替图标，更直观
       - 时间显示优化：移动端使用相对时间（如"5分钟前"）而非绝对时间
       - 空状态优化：无告警时显示友好的空状态插图和文案

  3. **更新下位机通信协议文档 (Story 8.3):**
     - **完善协议文档结构：**
       - 增强"响应协议"章节：详细说明所有系统响应消息格式（identified、system、error）
       - 补充"请求协议"章节：明确设备可以主动发起的请求类型和格式
       - 优化"控制协议"章节：添加更多常见控制指令示例和错误处理说明
       - 详细"数据解析"说明：阐明服务器如何解析和存储设备上报的数据

     - **增加代码示例：**
       - 为每种消息类型提供完整的代码示例（JavaScript/Python/C++）
       - 添加常见应用场景的完整示例（如：温湿度监控、智能灯控制）
       - 补充错误处理和重连逻辑的最佳实践代码

     - **增强可读性：**
       - 使用表格总结所有消息类型和字段说明
       - 添加流程图（Mermaid 格式）可视化通信流程
       - 补充常见问题解答（FAQ）章节
       - 为关键概念添加清晰的说明和注意事项

- **How it integrates:**
  - 告警已读功能：扩展现有 `alert-history.service.ts` 和 `alert-notification.service.ts`
  - 移动端UI：修改现有 `AlertHistoryPage.tsx`，使用 Ant Design Mobile 组件（或响应式样式）
  - 协议文档：更新现有 `docs/protocol-specification.md`，无代码修改

- **Success criteria:**
  - **已读功能：**
    - 用户可以通过"全部已读"按钮一键标记所有未读告警
    - 用户可以通过邮件内链接快速已读单个告警，无需登录系统
    - 已读告警在 24 小时内不会重复触发（即使告警条件再次满足）
  - **移动端UI：**
    - 移动端告警历史页面显示流畅，布局紧凑美观
    - 支持左滑操作、下拉刷新等移动端原生交互
    - 告警级别和时间信息清晰可读
  - **协议文档：**
    - 文档完整覆盖响应/请求/控制/数据解析四大协议
    - 每种消息类型都有完整的代码示例
    - 开发者可以仅凭文档完成下位机对接，无需查看源码

---

## Stories

### Story 8.1: 告警已读功能完善 ✅

**目标：** 完善告警已读功能，支持批量已读、邮件内快速已读，优化已读后的告警触发逻辑。

**核心功能:**

1. **批量已读功能：**
   - 前端：在 AlertHistoryPage 添加"全部已读"按钮（仅未读告警数量 > 0 时显示）
   - 后端：新增 `PUT /api/endpoints/:id/alert/bulk-read` API，调用 `markMultipleAsRead()` 服务
   - 业务逻辑：查询当前端点下所有 `status=unread` 的告警，批量更新为 `status=read`
   - 权限验证：确保用户只能标记自己端点下的告警

2. **邮件内快速已读：**
   - Token 生成：使用 HMAC-SHA256 签名，包含 `alertId` + `timestamp` + `secret`
   - 邮件模板：添加"标记已读"按钮，链接格式：`https://your-domain.com/api/alert/mark-read?token=xxx`
   - API 端点：新增 `GET /api/alert/mark-read?token=xxx`，验证 Token 签名和有效期（24小时）
   - 一次性使用：Token 使用后立即失效（在数据库中标记或使用 Redis 存储已使用Token）
   - 响应页面：标记成功后返回简单的 HTML 页面，显示"已读成功"提示

3. **防止已读后重复触发：**
   - 配置项：新增环境变量 `ALERT_READ_COOLDOWN_HOURS`（默认 24）
   - 检测逻辑：在 `alert-detector.service.ts` 的 `shouldDebounce()` 函数中增强
   - 查询条件：不仅检查 5 分钟内的 unread 告警，还检查冷却期内的 read 告警
   - 伪代码：
     ```typescript
     const recentRead = await prisma.alertHistory.findFirst({
       where: {
         alert_rule_id: ruleId,
         device_id: deviceId,
         status: 'read',
         read_at: { gte: new Date(Date.now() - cooldownMs) }
       }
     });
     if (recentRead) return true; // 跳过触发
     ```

**验收标准:**
- 用户点击"全部已读"按钮后，所有未读告警状态变为"已读"
- 邮件中的"标记已读"链接可用，点击后告警状态更新且 Token 失效
- Token 验证：签名错误返回 401，过期返回 410，使用过返回 409
- 已读告警在 24 小时内不会重复触发新告警（即使设备数据再次触发阈值）
- 所有相关单元测试和集成测试通过

---

### Story 8.2: 移动端告警历史UI优化 📱

**目标：** 优化移动端告警历史页面的显示和交互，提升移动端用户体验。

**核心功能:**

1. **响应式布局优化：**
   - 检测设备宽度（使用 CSS Media Query 或 Ant Design `useBreakpoint` Hook）
   - 移动端（<768px）切换为卡片式布局，替代 PC 端表格
   - 卡片设计：
     - 顶部：告警级别色条 + 告警标题
     - 中间：设备名称、数据字段、触发值/阈值
     - 底部：相对时间 + 操作按钮（标记已读、删除）
   - 紧凑布局：减少 padding 和 margin，合理利用屏幕空间

2. **移动端交互优化：**
   - **左滑操作：** 使用 `react-swipeable` 或 Ant Design Mobile 的 SwipeAction 组件
     - 左滑显示"标记已读"（绿色）和"删除"（红色）按钮
     - 点击后执行对应操作
   - **下拉刷新：** 使用 Ant Design Mobile PullToRefresh 组件
     - 下拉时显示加载动画，释放后刷新告警列表
   - **底部操作栏：** 固定底部显示（使用 `position: fixed`）
     - "全部已读"按钮（左侧）
     - "筛选"按钮（右侧，打开抽屉式筛选面板）
   - **快速筛选：** 移动端优化筛选面板
     - 使用 Ant Design Mobile Popup 或 Drawer 组件
     - 从底部弹出，包含告警级别、设备、状态筛选

3. **视觉优化：**
   - **告警级别标识：**
     - 使用 4px 宽度的左侧边栏颜色条（critical: 红色、warning: 橙色、info: 蓝色）
     - 替代 PC 端的 Tag 图标，更适合移动端视觉
   - **时间显示优化：**
     - PC 端：显示绝对时间（如"2025-11-02 14:30:00"）
     - 移动端：使用 `date-fns` 的 `formatDistanceToNow()` 显示相对时间（如"5 分钟前"）
   - **空状态优化：**
     - 无告警时显示 Ant Design Empty 组件
     - 自定义空状态插图和文案："暂无告警，系统运行正常 ✅"

**验收标准:**
- 移动端告警历史页面使用卡片布局，显示流畅美观
- 左滑操作正常，可以快速标记已读或删除
- 下拉刷新功能正常，加载动画流畅
- 底部操作栏固定显示，筛选面板从底部弹出
- 告警级别颜色条清晰可辨，相对时间显示准确
- 空状态显示友好提示
- PC 端显示不受影响，仍使用表格布局

---

### Story 8.3: 下位机通信协议文档更新 📖

**目标：** 更新下位机通信协议文档，完善响应/请求/控制/数据解析章节，增加代码示例，提升文档可读性和完整性。

**核心功能:**

1. **完善协议文档结构：**
   - **第六章：响应协议（增强）：**
     - 详细说明所有系统响应消息：`identified`、`system`、`error`
     - 每种响应都包含字段说明、示例、使用场景
     - 补充边界情况处理（如重复 identify、断线重连后的响应）

   - **新增章节：请求协议（Request Protocol）：**
     - 说明设备可以主动发起的请求类型
     - 包括：数据同步请求、状态查询请求、配置获取请求（如果适用）
     - 提供请求消息格式和服务器响应格式

   - **第五章：控制协议（优化）：**
     - 增加常见控制指令示例（至少 5 种，如：开关灯、调温度、设置参数等）
     - 详细说明错误处理流程（设备执行失败时如何应答）
     - 补充超时重试策略建议

   - **新增章节：数据解析（Data Parsing）：**
     - 阐明服务器如何解析设备上报的数据
     - 说明三种消息格式的解析流程（标准数据消息、简化格式、直接对象）
     - 详细说明数据类型推断规则和单位识别映射表
     - 解释 DeviceData 表的存储策略和查询优化

2. **增加代码示例：**
   - **为每种消息类型提供完整示例：**
     - identify、data、control、control_ack、system
     - 每种消息提供 JavaScript/Python/C++ 三种语言示例

   - **补充应用场景完整示例：**
     - 场景 1：温湿度监控设备（完整流程：连接→identify→定时上报数据→处理控制命令）
     - 场景 2：智能灯控制（完整流程：连接→identify→接收控制命令→应答→状态上报）
     - 每个场景提供完整的设备端代码（JavaScript/Python/Arduino）

   - **错误处理和重连逻辑最佳实践：**
     - 指数退避重连代码示例（JavaScript/Python/C++）
     - 消息队列本地缓存示例（离线数据处理）
     - 错误日志记录最佳实践

3. **增强可读性：**
   - **使用表格总结：**
     - 附录 A：完整消息类型总览表（增强版，包含每种消息的用途和注意事项）
     - 新增附录 D：字段类型和限制总览表（所有消息字段的类型、必需性、长度限制）

   - **添加流程图：**
     - 使用 Mermaid 格式绘制完整通信流程图：
       - 设备初次连接完整流程图（已有，优化）
       - 控制命令完整流程图（已有,优化）
       - 新增：数据上报和解析流程图
       - 新增：错误处理和重连流程图

   - **补充 FAQ 章节：**
     - 新增常见问题解答（至少 10 个问题）：
       - Q: 设备如何处理网络不稳定导致的消息丢失？
       - Q: 控制命令超时后应该如何处理？
       - Q: 如何优化设备端的数据上报频率？
       - Q: 设备离线期间的数据如何处理？
       - Q: 如何调试 WebSocket 连接问题？
       - ...等

   - **关键概念说明：**
     - 为 endpoint_id、device_id、commandId 等关键概念添加醒目的说明框
     - 补充注意事项（如：timestamp 字段现在是可选的，服务器会自动填充）

**验收标准:**
- 文档完整覆盖响应/请求/控制/数据解析四大协议章节
- 每种消息类型都有 JavaScript/Python/C++ 三种语言的代码示例
- 至少 2 个完整应用场景示例（温湿度监控、智能灯控制）
- 包含 4 个 Mermaid 流程图（连接、控制、数据解析、错误处理）
- FAQ 章节至少 10 个常见问题
- 文档结构清晰，排版美观，代码高亮正确
- 开发者仅凭文档可以完成下位机对接，无需查看服务器源码

---

## Compatibility Requirements

- [x] **现有API保持不变：**
  - 现有告警历史 API 不修改，仅新增批量已读和邮件快速已读端点
  - 向后兼容：旧的单个已读 API 仍然正常工作

- [x] **数据库Schema向后兼容：**
  - AlertHistory 表无结构变更，仅更新查询逻辑
  - 可选：新增 Token 使用记录表（用于一次性Token验证）

- [x] **UI向后兼容：**
  - PC 端告警历史页面保持表格布局，不受移动端优化影响
  - 使用响应式设计，自动适配设备宽度

- [x] **协议文档向后兼容：**
  - 文档更新不涉及协议变更，仅补充说明和示例
  - 现有设备无需修改代码

---

## Risk Mitigation

### Primary Risks

1. **邮件内快速已读的安全风险**
   - **缓解:** 使用 HMAC-SHA256 签名、Token 过期时间（24小时）、一次性使用机制
   - **验证:** 编写安全测试用例，验证签名伪造、Token 重放、过期 Token 等场景

2. **移动端UI优化可能破坏PC端体验**
   - **缓解:** 使用响应式设计，确保 PC 端和移动端相互独立
   - **验证:** 在不同设备尺寸下测试（手机、平板、PC），确保布局正常

3. **已读冷却期可能导致漏报告警**
   - **缓解:** 冷却期设置为可配置（环境变量），默认 24 小时，用户可调整
   - **验证:** 编写测试用例验证边界情况（如设备数据持续触发阈值）

### Rollback Plan

- **已读功能优化:**
  - 移除新增的批量已读和邮件快速已读 API
  - 恢复 alert-detector.service.ts 的旧版检测逻辑

- **移动端UI优化:**
  - Git 回退 AlertHistoryPage.tsx 代码
  - 恢复 PC 端表格布局

- **协议文档更新:**
  - Git 回退 docs/protocol-specification.md 文件

---

## Definition of Done

- [x] Story 8.1 所有验收标准满足
- [x] Story 8.2 所有验收标准满足
- [x] Story 8.3 所有验收标准满足
- [x] 所有单元测试和集成测试通过
- [x] 现有功能回归测试通过（告警历史查询、单个已读、删除功能）
- [x] 移动端和PC端设备测试通过
- [x] 安全测试通过（邮件 Token 验证、一次性使用）
- [x] 代码格式化和 Lint 检查通过
- [x] 协议文档已更新并经过技术评审
- [x] QA 审查通过，无安全漏洞或性能问题

---

## Roadmap

| Phase | Story | Priority | Estimated Effort |
|-------|-------|----------|------------------|
| Phase 1 | 8.1 - 告警已读功能完善 | P0 | 4-6 小时 |
| Phase 2 | 8.2 - 移动端告警历史UI优化 | P1 | 4-6 小时 |
| Phase 3 | 8.3 - 下位机通信协议文档更新 | P2 | 3-4 小时 |

**Total Estimated Effort:** 11-16 小时（约 1.5-2 个开发周期）

**Story 8.1 工作量分解：**
- 批量已读功能：1.5-2 小时
- 邮件内快速已读：2-2.5 小时（包含 Token 生成、验证、API、邮件模板更新）
- 防止已读后重复触发：1-1.5 小时
- 测试和文档：0.5-1 小时

**Story 8.2 工作量分解：**
- 响应式布局优化：1.5-2 小时
- 移动端交互优化（左滑、下拉刷新、底部栏）：2-2.5 小时
- 视觉优化（颜色条、相对时间、空状态）：0.5-1 小时
- 测试和调试：0.5-1 小时

**Story 8.3 工作量分解：**
- 完善协议文档结构（响应/请求/控制/数据解析）：1-1.5 小时
- 增加代码示例（3 种语言 x 多种消息类型 + 完整场景）：1.5-2 小时
- 增强可读性（表格、流程图、FAQ）：0.5-1 小时
- 技术评审和修订：0.5 小时

---

## Success Metrics

- **已读功能：**
  - 批量已读使用率：> 30%（相对于单个已读操作）
  - 邮件快速已读成功率：> 95%
  - 已读冷却期误拦截率：< 5%

- **移动端UI：**
  - 移动端用户告警处理效率提升：> 40%（操作步骤减少）
  - 移动端页面加载速度：< 2 秒
  - 用户满意度：移动端体验评分 > 4.0/5.0

- **协议文档：**
  - 文档完整性：覆盖 100% 消息类型和协议流程
  - 开发者独立对接成功率：> 90%（无需联系技术支持）
  - 文档可读性评分：> 4.5/5.0

---

## Change Log

| Date       | Version | Description                             | Author         |
|------------|---------|-----------------------------------------|----------------|
| 2025-11-02 | 1.0     | 初始创建 Epic 8（告警系统用户体验增强）     | Sarah (PO)     |

---

## Next Steps

1. ✅ **立即开始：** Story 8.1 - 告警已读功能完善
   - 创建详细的 Story 8.1 文档（story.md 格式）
   - 设计批量已读 API 接口
   - 设计邮件快速已读 Token 生成和验证机制
   - 更新 alert-detector 检测逻辑（已读冷却期）

2. **后续：** Story 8.2 - 移动端告警历史UI优化
   - 创建详细的 Story 8.2 文档
   - 设计移动端卡片布局和交互方案
   - 评估 Ant Design Mobile 组件使用

3. **最后：** Story 8.3 - 下位机通信协议文档更新
   - 创建详细的 Story 8.3 文档
   - 列出所有需要补充的章节和示例
   - 准备 Mermaid 流程图草稿

---

## Reference

- **相关文档：**
  - Epic 6 Story 6.5: 设备数据告警系统（docs/stories/6.5.story.md）
  - Epic 7 Story 7.2: 告警系统优化（docs/stories/7.2.story.md）
  - 下位机通信协议文档（docs/protocol-specification.md）
  - 告警历史服务（packages/backend/src/services/alert-history.service.ts）

- **技术参考：**
  - Ant Design Mobile: https://mobile.ant.design/
  - Ant Design Responsive Design: https://ant.design/docs/spec/responsive
  - react-swipeable: https://www.npmjs.com/package/react-swipeable
  - HMAC Token 签名：https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options
  - Mermaid 流程图：https://mermaid.js.org/
