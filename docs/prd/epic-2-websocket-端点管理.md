# Epic 2: WebSocket 端点管理

**Epic 目标（扩展）：** 实现端点（Endpoint）的完整 CRUD 功能，包括数据库表设计、后端 REST API 和前端管理界面。用户登录后可以创建新的 WebSocket 端点（系统自动生成唯一 ID 和 URL），查看自己的端点列表，查看单个端点的详细信息，以及删除不需要的端点。同时实现个人中心页面，展示用户的基本信息和统计数据。此 Epic 完成后，用户可以管理端点并获得 WebSocket URL，但消息转发功能尚未实现（将在 Epic 3 中完成）。

## Story 2.1: 创建 Endpoints 数据库表

**As a** 后端开发者，
**I want** 使用 Prisma Schema 定义 Endpoints 表，
**so that** 可以持久化用户创建的 WebSocket 端点信息。

**Acceptance Criteria:**

1. 在 `prisma/schema.prisma` 中定义 `Endpoint` 模型，包含字段：id (主键), endpoint_id (唯一, 用于 URL), user_id (外键), name (用户自定义名称), created_at, last_active_at
2. 确保 endpoint_id 字段为唯一索引
3. 配置 Endpoint 和 User 之间的外键关系（一对多：一个用户可以有多个端点）
4. 运行 `npx prisma migrate dev --name add_endpoints` 成功创建数据库表
5. 运行 `npx prisma studio` 可以查看 Endpoints 表结构
6. 编写简单的 seed 脚本，创建 1-2 个测试端点数据（可选）

## Story 2.2: 实现创建端点 API

**As a** 后端开发者，
**I want** 实现创建端点的 REST API，
**so that** 用户可以通过 API 创建新的 WebSocket 端点。

**Acceptance Criteria:**

1. 实现 `POST /api/endpoints` API（需要 JWT 认证），接收 `{ name }` （name 可选，默认为"未命名端点"）
2. 生成唯一的 endpoint_id（使用 nanoid 或 uuid，8-12 位字符）
3. 将 endpoint 记录保存到数据库，关联当前登录用户的 user_id
4. 返回创建的端点信息：`{ id, endpoint_id, name, websocket_url, created_at }`，其中 websocket_url 格式为 `wss://domain.com/ws/{endpoint_id}`
5. 如果用户已创建的端点数量超过限制（例如 5 个），返回 400 错误"已达到端点数量上限"
6. 如果 endpoint_id 生成冲突（极小概率），自动重试生成
7. 使用 Postman 测试 API，验证创建成功和错误场景

## Story 2.3: 实现查询端点列表 API

**As a** 后端开发者，
**I want** 实现查询当前用户端点列表的 API，
**so that** 前端可以展示用户的所有端点。

**Acceptance Criteria:**

1. 实现 `GET /api/endpoints` API（需要 JWT 认证）
2. 查询当前登录用户的所有端点，按创建时间倒序排列
3. 返回端点列表数组，每个端点包含：`{ id, endpoint_id, name, websocket_url, created_at, last_active_at }`
4. 如果用户没有任何端点，返回空数组 `[]`
5. 使用 Postman 测试 API，验证返回数据格式正确

## Story 2.4: 实现查询单个端点详情和删除端点 API

**As a** 后端开发者，
**I want** 实现查询单个端点详情和删除端点的 API，
**so that** 用户可以查看端点详情并删除不需要的端点。

**Acceptance Criteria:**

1. 实现 `GET /api/endpoints/:id` API（需要 JWT 认证）
2. 查询指定 id 的端点，返回完整信息：`{ id, endpoint_id, name, websocket_url, created_at, last_active_at }`
3. 验证端点属于当前登录用户，如果不属于返回 403 错误"无权访问此端点"
4. 如果端点不存在，返回 404 错误"端点不存在"
5. 实现 `DELETE /api/endpoints/:id` API（需要 JWT 认证）
6. 删除指定 id 的端点记录
7. 验证端点属于当前登录用户，如果不属于返回 403 错误
8. 删除成功后返回 `{ message: "端点已删除" }`
9. 使用 Postman 测试查询和删除 API，验证所有场景

## Story 2.5: 实现端点管理主页前端（列表展示）

**As a** 用户，
**I want** 在端点管理主页查看我的所有端点列表，
**so that** 我可以了解我创建了哪些端点。

**Acceptance Criteria:**

1. 创建端点管理主页组件 `/dashboard`，使用 Ant Design Layout
2. 页面加载时调用 `GET /api/endpoints` 获取端点列表
3. 使用 Ant Design Table 或 List 组件展示端点列表
4. 每个端点显示：端点名称、WebSocket URL、创建时间、最后活跃时间
5. WebSocket URL 旁边显示"复制"按钮（使用 Ant Design Button + CopyOutlined 图标）
6. 如果列表为空，显示 Empty 组件提示"还没有端点，点击创建按钮开始"
7. 页面顶部显示用户欢迎信息（如"欢迎，{username}"）和"创建端点"按钮
8. 加载数据时显示 Spin 加载动画
9. 如果 API 请求失败，显示 `message.error()` 错误提示

## Story 2.6: 实现创建端点功能（前端）

**As a** 用户，
**I want** 点击"创建端点"按钮创建新的 WebSocket 端点，
**so that** 我可以获得一个可用的 WebSocket URL。

**Acceptance Criteria:**

1. 点击端点管理主页的"创建端点"按钮，弹出 Modal 对话框
2. Modal 中包含表单，字段：端点名称（可选，默认"未命名端点"）
3. 点击"确定"按钮，调用 `POST /api/endpoints` API
4. 创建成功后，显示 `message.success('端点创建成功')`
5. 关闭 Modal，刷新端点列表（重新调用 `GET /api/endpoints`）
6. 创建失败时，显示 `message.error()` 并展示服务器返回的错误消息
7. 表单提交时按钮显示 loading 状态
8. 如果用户达到端点数量上限，显示错误提示"已达到端点数量上限（5个）"

## Story 2.7: 实现端点详情页和删除功能

**As a** 用户，
**I want** 点击端点列表中的某个端点查看详情，并可以删除该端点，
**so that** 我可以管理我的端点。

**Acceptance Criteria:**

1. 在端点列表中，每个端点添加"查看详情"链接或按钮
2. 点击后跳转到端点详情页 `/endpoints/:id`
3. 详情页调用 `GET /api/endpoints/:id` 获取端点详细信息
4. 使用 Ant Design Descriptions 组件展示端点信息：端点名称、endpoint_id、WebSocket URL、创建时间、最后活跃时间
5. WebSocket URL 旁边显示"复制"按钮，点击复制 URL 到剪贴板并显示 `message.success('已复制')`
6. 详情页底部显示"删除端点"按钮（Danger 样式）
7. 点击删除按钮，弹出 `Modal.confirm()` 确认对话框："确定要删除此端点吗？删除后无法恢复。"
8. 确认后调用 `DELETE /api/endpoints/:id` API
9. 删除成功后，显示 `message.success('端点已删除')` 并跳转回端点管理主页
10. 删除失败时，显示 `message.error()`

## Story 2.8: 实现个人中心页面

**As a** 用户，
**I want** 在个人中心查看我的账户信息和统计数据，
**so that** 我可以了解我的账户状态。

**Acceptance Criteria:**

1. 创建个人中心页面组件 `/profile`
2. 在顶部导航栏添加"个人中心"链接（使用 Ant Design Menu）
3. 使用 Ant Design Card 和 Descriptions 组件展示用户基本信息：用户名、邮箱、注册时间
4. 使用 Ant Design Statistic 组件展示统计数据：
   - 总端点数（调用 `GET /api/endpoints` 获取列表长度）
   - 账户创建天数（根据 created_at 计算）
5. 页面底部显示"退出登录"按钮（Danger 样式）
6. 点击退出登录按钮，清除 localStorage 中的 JWT Token
7. 更新 AuthContext 状态（清除用户信息）
8. 显示 `message.success('已退出登录')` 并跳转到登录页

---
