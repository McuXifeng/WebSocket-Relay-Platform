# Platform Enhancement Epic - 平台功能增强

# Epic Goal / 史诗目标

完善 WebSocket-Relay-Platform 的核心功能，包括：
1. 补全可视化系统的仪表盘和状态指示器卡片
2. 实现管理员对用户和端点的封禁控制功能
3. 修复设备异常断开后连接状态显示不正确的bug

**价值：** 提升平台的管理能力、可视化完整性和系统可靠性，使其成为功能完备的IoT数据中继平台。

---

## Existing System Context / 现有系统上下文

### 当前相关功能

**可视化系统：**
- 已实现折线图(Line Chart)和柱状图(Bar Chart)两种图表类型
- 使用 echarts 6.0 + react-grid-layout 实现拖拽布局
- 已定义4种卡片类型：`statistic`, `gauge`, `chart`, `status`
- 问题：`gauge` 和 `status` 类型仅有类型定义和配置选项，无实际组件实现，用数值卡片占位

**权限管理：**
- 基于 JWT 的身份认证 + `is_admin` 字段的管理员权限
- 用户对端点的严格所有权控制（user_id 验证）
- 已有管理员路由：授权码管理、用户列表查看、用户端点查看
- 问题：完全没有封禁/禁用功能，无相关数据库字段和API

**WebSocket连接管理：**
- 基于 ws 库实现的WebSocket服务器
- 心跳检测机制：30秒发送ping，检测连接存活
- ConnectionManager 内存连接池 + EndpointStats 数据库持久化
- 问题：心跳间隔过长(30s)，批量更新延迟(5s)，前端轮询延迟(3s)，导致异常断开后最长68秒才更新状态

### 技术栈

**前端：**
- React 18 + TypeScript
- Ant Design 5.12.8 (UI组件)
- echarts 6.0 (图表库)
- react-grid-layout 1.5.2 (拖拽布局)

**后端：**
- Node.js + Express
- Prisma ORM (MySQL数据库)
- ws 8.18.0 (WebSocket)
- JWT 认证

### 集成点

1. **可视化系统：**
   - `VisualizationDashboardPage.tsx` 渲染卡片
   - `CardConfigModal.tsx` 配置卡片类型
   - `useECharts.ts` 管理echarts实例

2. **权限系统：**
   - `auth.middleware.ts` 的 `requireAdmin` 中间件
   - `admin.route.ts` 管理员路由
   - `AdminRoute.tsx` 前端路由守卫
   - Prisma Schema 的 User 和 Endpoint 模型

3. **连接管理：**
   - `websocket/server.ts` WebSocket服务器
   - `connection-manager.ts` 连接池
   - `stats-batch-updater.ts` 批量统计更新
   - 前端 `DeviceListCard.tsx` 设备状态显示

---

## Enhancement Details / 增强细节

### 需求 1: 补全可视化卡片样式

**添加内容：**
- 创建 `GaugeCard.tsx` 组件，使用echarts的gauge图表类型
- 创建 `StatusCard.tsx` 组件，使用Ant Design的Badge/Tag显示状态
- 修改 `VisualizationDashboardPage.tsx`，移除占位符逻辑，正确渲染新组件
- 扩展 `CardConfigModal.tsx`，为gauge和status类型添加专属配置项

**集成方式：**
- 遵循现有的可视化组件模式（接收相同的props结构）
- 复用 `useECharts` hook 和可视化服务API
- 保持与折线图/柱状图一致的样式和交互

**成功标准：**
- 用户可以在配置弹窗中选择仪表盘和状态指示器类型
- 仪表盘卡片正确显示百分比或范围数据（0-100%）
- 状态指示器卡片根据数值显示不同颜色的状态灯
- 卡片支持拖拽、缩放、删除等现有功能

---

### 需求 2: 管理员封禁功能

**添加内容：**

**数据库层（Prisma Schema）：**
```prisma
model User {
  // 新增字段
  is_active     Boolean   @default(true)    // 账户是否激活
  banned_at     DateTime?                   // 封禁时间
  banned_reason String?   @db.VarChar(255)  // 封禁原因
  banned_by     String?                     // 封禁操作者ID
}

model Endpoint {
  // 新增字段
  is_disabled    Boolean   @default(false)  // 端点是否禁用
  disabled_at    DateTime?                  // 禁用时间
  disabled_reason String?  @db.VarChar(255) // 禁用原因
  disabled_by    String?                    // 禁用操作者ID
}

model BanLog {
  id          String   @id @default(uuid())
  target_type String   @db.VarChar(20)     // 'user' 或 'endpoint'
  target_id   String                        // 目标ID
  action      String   @db.VarChar(20)     // 'ban' 或 'unban'
  reason      String?  @db.VarChar(255)
  operator_id String                        // 操作者ID
  created_at  DateTime @default(now())
}
```

**后端API：**
- `POST /api/admin/users/:userId/ban` - 封禁用户（body: `{ reason: string }`）
- `POST /api/admin/users/:userId/unban` - 解封用户
- `POST /api/admin/endpoints/:endpointId/disable` - 禁用端点
- `POST /api/admin/endpoints/:endpointId/enable` - 启用端点
- `GET /api/admin/ban-logs` - 查询封禁日志（支持分页和过滤）

**中间件增强：**
- 在 `authenticateToken` 中增加 `is_active` 检查，被封禁用户返回403
- WebSocket连接时检查用户和端点的封禁状态

**前端界面：**
- 用户管理页面（`/admin/users`）增加封禁/解封按钮和状态标识
- 端点管理页面增加禁用/启用按钮
- 封禁操作弹窗，输入封禁原因
- 新增封禁日志页面（`/admin/ban-logs`），支持搜索和导出

**集成方式：**
- 利用现有的 `requireAdmin` 中间件保护新API
- 复用现有的用户管理和端点管理UI组件
- 封禁日志使用Ant Design的Table组件展示

**成功标准：**
- 管理员可以封禁/解封用户账号，封禁后用户无法登录
- 管理员可以禁用/启用端点，禁用后端点无法建立WebSocket连接
- 所有封禁操作记录到审计日志，包含时间、原因、操作者
- 被封禁用户登录时显示明确的封禁提示
- 封禁日志页面支持按目标类型、操作类型、时间范围筛选

---

### 需求 3: 修复连接状态Bug

**修复内容：**

1. **缩短心跳间隔**（`websocket/server.ts`）：
   - 将心跳间隔从 30秒 改为 **15秒**
   - 超时判断逻辑保持不变（两次心跳无响应即断开）
   - 降低异常断开检测延迟从60秒到30秒

2. **优化批量更新逻辑**（`stats-batch-updater.ts`）：
   - 断开连接时立即刷新统计，不等待批次累积
   - 区分"连接建立"和"连接断开"的更新优先级
   - 保留批量更新机制用于非关键操作（如消息计数）

3. **增强错误处理**（`websocket/server.ts`）：
   - 改进 `cleanupConnection` 函数的幂等性
   - 防止重复清理导致的统计数据错误
   - 添加日志记录，标识断开原因（正常关闭/心跳超时/错误断开）

4. **前端实时反馈**（可选优化）：
   - 设备断开时通过WebSocket推送通知到前端
   - 替代轮询机制，实现即时状态更新
   - 降低前端轮询间隔从3秒到2秒（作为兼容方案）

**集成方式：**
- 最小化修改现有WebSocket服务器逻辑
- 保持ConnectionManager的API不变
- 向后兼容现有的统计数据结构

**成功标准：**
- 设备异常断开后，前端在 **5秒内** 显示离线状态（原来最长68秒）
- 心跳超时检测延迟降低到 **30秒以内**（原来60秒）
- 批量更新器的断开连接操作延迟 **< 1秒**（原来最长5秒）
- 统计数据（`current_connections`）与实际连接池状态保持一致
- 无重复清理导致的负数连接数问题

---

## Stories / 故事列表

### Story 1: 实现仪表盘和状态指示器卡片组件
**范围：** 前端可视化系统
- 创建 `GaugeCard.tsx` 组件（echarts gauge图表）
- 创建 `StatusCard.tsx` 组件（状态灯显示）
- 扩展 `CardConfigModal.tsx` 的配置项
- 修改 `VisualizationDashboardPage.tsx` 渲染逻辑
- 编写组件单元测试

---

### Story 2: 数据库Schema扩展 - 封禁功能基础
**范围：** 后端数据库层
- 修改 `schema.prisma`，为 User 和 Endpoint 添加封禁字段
- 创建 `BanLog` 模型
- 执行数据库迁移（`npx prisma migrate dev`）
- 编写Seed脚本测试数据

---

### Story 3: 后端封禁API实现
**范围：** 后端服务层和控制器
- 创建 `ban.service.ts` 封禁业务逻辑
- 实现封禁/解封用户的API端点
- 实现禁用/启用端点的API端点
- 实现封禁日志查询API
- 增强 `authenticateToken` 中间件，检查 `is_active`
- WebSocket连接时检查封禁状态
- 编写API集成测试

---

### Story 4: 前端管理员封禁界面
**范围：** 前端管理页面
- 修改 `/admin/users` 页面，添加封禁/解封按钮和状态标识
- 修改端点管理页面，添加禁用/启用功能
- 创建封禁原因输入弹窗组件
- 创建 `/admin/ban-logs` 封禁日志页面
- 优化被封禁用户的登录提示
- 编写E2E测试

---

### Story 5: 修复WebSocket心跳和连接状态
**范围：** 后端WebSocket服务
- 修改心跳间隔从30秒到15秒
- 优化 `cleanupConnection` 函数的幂等性
- 修改批量更新器，断开连接时立即刷新
- 增强断开原因日志记录
- 压力测试心跳机制（模拟100+并发连接异常断开）

---

### Story 6: 前端连接状态实时优化（可选）
**范围：** 前端实时通知
- 实现WebSocket推送机制（设备状态变更通知）
- 修改 `DeviceListCard.tsx`，订阅状态推送
- 降低轮询间隔作为兼容方案
- 验证断开后5秒内前端状态更新

---

## Compatibility Requirements / 兼容性要求

### 数据库兼容性
- [ ] 新增字段使用默认值，不影响现有数据
- [ ] 数据库迁移脚本向前兼容，支持回滚
- [ ] 封禁功能不改变现有用户的 `is_admin` 逻辑

### API兼容性
- [ ] 现有API端点的响应格式不变
- [ ] 新增的封禁字段在响应中可选（`is_active`, `banned_at` 等）
- [ ] WebSocket协议保持不变，心跳间隔调整对客户端透明

### UI兼容性
- [ ] 新增的可视化卡片遵循现有的拖拽布局规则
- [ ] 管理员页面保持现有的导航结构
- [ ] 封禁功能仅对管理员可见，普通用户无影响

### 性能兼容性
- [ ] 心跳间隔缩短不显著增加服务器CPU/网络负载
- [ ] 批量更新优化不降低高并发场景的吞吐量
- [ ] 封禁状态检查的性能开销 < 5ms/请求

---

## Risk Mitigation / 风险缓解

### 主要风险 1: 数据库迁移失败
**风险：** 添加新字段的迁移可能在生产环境失败，导致服务中断
**缓解：**
- 在测试环境完整执行迁移流程，验证向前兼容性
- 使用 Prisma 的 `migrate deploy` 确保原子性
- 准备回滚脚本（删除新增字段和表）
- 迁移前备份数据库

---

### 主要风险 2: 心跳间隔调整导致大量断开
**风险：** 缩短心跳间隔可能导致网络不稳定的设备频繁断开重连
**缓解：**
- 在灰度环境先测试15秒间隔，观察断开率
- 如果断开率显著增加，调整为20秒折中方案
- 添加重连退避机制，防止重连风暴
- 监控心跳超时的日志分布

---

### 主要风险 3: 封禁功能误操作
**风险：** 管理员误封禁活跃用户或关键端点，影响业务
**缓解：**
- 封禁操作前二次确认弹窗
- 封禁日志完整记录，支持审计和追责
- 提供批量解封功能，快速恢复误操作
- 限制超级管理员账户不能被封禁（硬编码保护）

---

### 主要风险 4: 可视化组件渲染性能
**风险：** 新增的Gauge和Status卡片渲染性能差，影响Dashboard加载速度
**缓解：**
- 使用React.memo优化组件渲染
- echarts实例复用（通过useECharts hook）
- 限制Dashboard最大卡片数量（如20个）
- 懒加载卡片数据，滚动到可视区域再请求

---

## Rollback Plan / 回滚计划

### 可视化组件回滚
**场景：** 新组件有严重bug，需要紧急回滚
**步骤：**
1. 恢复 `VisualizationDashboardPage.tsx` 的占位符逻辑
2. 在配置弹窗中隐藏 `gauge` 和 `status` 选项
3. 已创建的gauge/status卡片自动降级为数值卡片
4. 不需要数据库回滚（类型字段本身无问题）

---

### 封禁功能回滚
**场景：** 封禁功能导致权限混乱或数据错误
**步骤：**
1. 删除所有封禁相关的API路由
2. 恢复 `authenticateToken` 中间件到原始版本（移除 `is_active` 检查）
3. 执行数据库迁移回滚脚本：
   ```sql
   ALTER TABLE User DROP COLUMN is_active, banned_at, banned_reason, banned_by;
   ALTER TABLE Endpoint DROP COLUMN is_disabled, disabled_at, disabled_reason, disabled_by;
   DROP TABLE BanLog;
   ```
4. 前端隐藏所有封禁相关的UI组件

---

### 心跳机制回滚
**场景：** 新心跳间隔导致异常断开率激增
**步骤：**
1. 将心跳间隔恢复为30秒
2. 恢复批量更新器的原始刷新逻辑（5秒间隔）
3. 如果已部署WebSocket推送，关闭推送功能，恢复轮询
4. 重启WebSocket服务器应用新配置

---

## Definition of Done / 完成定义

### 功能完整性
- [ ] 仪表盘和状态指示器卡片在Dashboard中正常显示和交互
- [ ] 管理员可以通过UI封禁/解封用户，禁用/启用端点
- [ ] 封禁的用户无法登录，禁用的端点无法建立WebSocket连接
- [ ] 所有封禁操作记录到日志，可在管理页面查询
- [ ] 设备异常断开后，前端在5秒内更新状态为离线

### 代码质量
- [ ] 所有新增代码通过 ESLint 和 Prettier 检查
- [ ] 关键业务逻辑有单元测试覆盖（测试覆盖率 > 80%）
- [ ] API有集成测试，覆盖正常和异常场景
- [ ] 前端有E2E测试，覆盖封禁和可视化配置流程

### 现有功能验证
- [ ] 原有的折线图和柱状图功能正常
- [ ] 原有的用户注册、登录、端点管理功能正常
- [ ] 原有的WebSocket消息转发功能正常
- [ ] 现有的告警规则和通知功能不受影响
- [ ] 性能测试：100并发WebSocket连接稳定性无回归

### 文档更新
- [ ] 更新 README.md，添加封禁功能和新卡片类型的说明
- [ ] 更新 API 文档（`docs/api/`），记录新增的封禁API
- [ ] 更新 Prisma Schema 的注释
- [ ] 编写封禁功能的管理员操作手册（`docs/admin-guide.md`）

### 部署就绪
- [ ] 数据库迁移脚本在测试环境验证通过
- [ ] 构建流程成功（`pnpm build`）
- [ ] 前端和后端无TypeScript编译错误
- [ ] Docker镜像构建成功（如果使用Docker部署）

---

## Handoff to Story Manager / 移交给故事管理器

**Story Manager，请为这个棕地Epic开发详细的用户故事。**

### 关键考虑因素

**集成点：**
- 前端可视化系统运行在 React 18 + Ant Design 5 + echarts 6
- 后端使用 Prisma ORM + Express + ws库
- WebSocket服务器已有成熟的ConnectionManager和批量更新器
- 管理员权限体系基于 `is_admin` 字段 + JWT中间件

**现有模式：**
- 可视化组件遵循统一的props接口（config, layout, onConfigChange等）
- 所有管理员API使用 `/api/admin/*` 路由 + `requireAdmin` 中间件
- WebSocket连接时验证JWT token，断开时调用 `cleanupConnection`
- 前端使用自定义Hook（如useAuth, usePolling, useECharts）

**关键兼容性要求：**
- 数据库迁移必须向前兼容，支持回滚
- 心跳间隔调整不能破坏现有客户端连接
- 封禁功能不能影响非管理员用户的正常使用
- 新组件必须支持现有的拖拽布局和配置保存逻辑

**每个故事必须包含：**
- 对现有系统的影响评估
- 集成测试验证现有功能不受破坏
- 数据库变更的回滚脚本（如果涉及Schema修改）
- 性能基准测试（心跳机制修改必须测试100+并发）

**Epic目标：** 完善平台的管理能力、可视化完整性和系统可靠性，同时保持系统稳定性和向后兼容性。

---

**Epic 创建时间：** 2025-11-08
**创建者：** 老王（Claude Code）
**项目：** WebSocket-Relay-Platform
**版本：** v1.6.0+
