# Epic 3: WebSocket 消息转发核心服务

**Epic 目标（扩展）：** 实现独立的 WebSocket 服务器，负责接收客户端连接、根据端点 ID 进行消息路由、在同一端点的多个客户端之间广播消息，以及确保不同端点的消息完全隔离。实现连接管理逻辑，包括连接建立、心跳检测、断线处理。编写 WebSocket 客户端测试脚本，验证消息转发功能。实现前端实时连接状态显示和消息统计。此 Epic 完成后，WebSocket 端点真正可用，用户可以通过获得的 URL 连接并实现多客户端实时通信。

## Story 3.1: 初始化 WebSocket 服务器项目

**As a** 后端开发者，
**I want** 在 backend 中创建独立的 WebSocket 服务器，
**so that** 可以接收和处理 WebSocket 连接。

**Acceptance Criteria:**

1. 在 `packages/backend/src` 中创建 `websocket` 目录
2. 安装 `ws` 库（原生 WebSocket 库）
3. 创建 WebSocket 服务器，监听 3001 端口
4. 实现基础的连接处理：`ws.on('connection', (socket) => { ... })`
5. 连接建立时打印日志："New WebSocket connection established"
6. 连接断开时打印日志："WebSocket connection closed"
7. 创建启动脚本 `npm run ws-server`，可以独立启动 WebSocket 服务器
8. 使用浏览器 WebSocket 测试工具或 `wscat` 验证可以成功连接到 `ws://localhost:3001`

## Story 3.2: 实现端点 ID 解析和连接映射管理

**As a** 后端开发者，
**I want** 从 WebSocket 连接 URL 中提取 endpoint_id 并建立映射关系，
**so that** 可以将消息路由到正确的端点。

**Acceptance Criteria:**

1. WebSocket 连接 URL 格式：`ws://localhost:3001/ws/{endpoint_id}`
2. 从连接请求的 URL 中解析出 endpoint_id（使用 `url.parse()` 或类似方法）
3. 如果 URL 格式不正确或缺少 endpoint_id，拒绝连接并发送错误消息
4. 验证 endpoint_id 在数据库中存在（查询 Prisma Endpoint 表）
5. 如果 endpoint_id 不存在，拒绝连接并发送 "Invalid endpoint" 错误
6. 创建内存 Map 数据结构：`Map<endpoint_id, Set<WebSocket>>`，存储端点到连接的映射
7. 连接建立时，将 WebSocket 对象添加到对应 endpoint_id 的 Set 中
8. 连接断开时，从 Set 中移除 WebSocket 对象
9. 使用 `wscat -c "ws://localhost:3001/ws/{valid_endpoint_id}"` 测试，验证连接成功
10. 使用无效 endpoint_id 测试，验证连接被拒绝

## Story 3.3: 实现消息路由和广播逻辑

**As a** 后端开发者，
**I want** 实现消息在同一端点多个客户端之间的广播转发，
**so that** 用户可以进行实时通信。

**Acceptance Criteria:**

1. 监听 WebSocket 的 `message` 事件：`socket.on('message', (data) => { ... })`
2. 解析接收到的消息（假设为 JSON 格式）
3. 根据发送者的 endpoint_id，查找该端点的所有连接（从 Map 中获取 Set）
4. 将消息广播给同一端点的所有其他客户端（不包括发送者本身）
5. 如果消息格式不是有效 JSON，记录警告日志但不中断连接
6. 实现广播函数：`broadcastToEndpoint(endpointId, message, senderSocket)`
7. 添加错误处理：如果某个客户端发送失败，记录日志但继续发送给其他客户端
8. 使用两个 `wscat` 客户端连接到同一 endpoint_id 进行测试
9. 验证：客户端 A 发送消息，客户端 B 能收到，但客户端 A 自己不收到（不回显）
10. 验证：客户端 B 发送消息，客户端 A 能收到

## Story 3.4: 实现端点隔离机制

**As a** 后端开发者，
**I want** 确保不同端点的消息完全隔离，
**so that** 用户的消息不会泄露到其他端点。

**Acceptance Criteria:**

1. 使用测试脚本创建两个不同的 endpoint（endpoint_A 和 endpoint_B）
2. 启动 4 个 WebSocket 客户端：
   - 客户端 1 和 2 连接到 endpoint_A
   - 客户端 3 和 4 连接到 endpoint_B
3. 客户端 1 发送消息 "Hello from A"
4. 验证：客户端 2 能收到消息，客户端 3 和 4 收不到
5. 客户端 3 发送消息 "Hello from B"
6. 验证：客户端 4 能收到消息，客户端 1 和 2 收不到
7. 检查 Map 数据结构，确认两个 endpoint_id 分别管理各自的 Set<WebSocket>
8. 编写自动化测试脚本（使用 Node.js ws 客户端库），验证隔离机制

## Story 3.5: 实现连接统计和数据库更新

**As a** 后端开发者，
**I want** 统计端点的连接数和消息数，并更新到数据库，
**so that** 前端可以展示实时监控数据。

**Acceptance Criteria:**

1. 在 Prisma Schema 中创建 `EndpointStats` 模型，包含字段：id, endpoint_id (外键), total_connections (累计连接数), total_messages (累计消息数), current_connections (当前在线数), updated_at
2. 运行 `npx prisma migrate dev --name add_endpoint_stats` 创建表
3. 连接建立时，递增 total_connections 和 current_connections
4. 连接断开时，递减 current_connections
5. 消息转发成功时，递增 total_messages
6. 更新 `Endpoint` 表的 `last_active_at` 字段为当前时间（每次有消息时更新）
7. 实现统计更新函数：`updateEndpointStats(endpointId, action)`，action 可以是 'connect', 'disconnect', 'message'
8. 使用 Prisma 的 `upsert` 操作，确保 EndpointStats 记录存在
9. 使用 Prisma Studio 查看统计数据，验证数据正确更新

## Story 3.6: 实现获取端点实时统计数据 API

**As a** 后端开发者，
**I want** 实现获取端点实时统计数据的 API，
**so that** 前端可以展示当前连接数和消息统计。

**Acceptance Criteria:**

1. 实现 `GET /api/endpoints/:id/stats` API（需要 JWT 认证）
2. 验证端点属于当前登录用户
3. 从 EndpointStats 表查询统计数据
4. 返回 `{ current_connections, total_connections, total_messages, last_active_at }`
5. 如果 EndpointStats 记录不存在，返回默认值：`{ current_connections: 0, total_connections: 0, total_messages: 0, last_active_at: null }`
6. 如果端点不存在或无权访问，返回 403/404 错误
7. 使用 Postman 测试 API，验证返回数据正确

## Story 3.7: 前端展示端点实时连接数和统计数据

**As a** 用户，
**I want** 在端点详情页实时查看当前连接数和消息统计，
**so that** 我可以监控端点的使用情况。

**Acceptance Criteria:**

1. 在端点详情页（`/endpoints/:id`）中添加统计数据展示区域
2. 页面加载时调用 `GET /api/endpoints/:id/stats` 获取统计数据
3. 使用 Ant Design Statistic 组件展示：
   - 当前连接数（使用 Badge 组件显示在线状态：绿色=有连接，灰色=无连接）
   - 累计连接数
   - 累计消息数
   - 最后活跃时间（格式化显示，如"2 分钟前"）
4. 实现定时刷新：每 5 秒自动调用一次 API 更新统计数据（使用 `setInterval`）
5. 组件卸载时清除定时器（使用 `useEffect` cleanup）
6. 如果 API 请求失败，显示 `message.error()` 但不中断定时刷新
7. 统计数据使用卡片布局，视觉上与端点信息区分开

## Story 3.8: 编写 WebSocket 客户端使用文档和示例代码

**As a** 用户，
**I want** 查看 WebSocket 客户端连接示例代码和使用说明，
**so that** 我可以快速集成到我的应用中。

**Acceptance Criteria:**

1. 在 `docs/` 目录创建 `websocket-usage.md` 文档
2. 文档包含以下章节：
   - **快速开始**：5 分钟快速上手指南
   - **连接 WebSocket**：JavaScript 浏览器客户端示例代码
   - **发送和接收消息**：完整的消息收发示例
   - **错误处理**：连接失败、断线重连的处理方式
   - **消息格式**：JSON 格式说明和示例
3. 提供浏览器 JavaScript 示例：
   ```javascript
   const ws = new WebSocket('wss://domain.com/ws/{your-endpoint-id}');
   ws.onopen = () => console.log('Connected');
   ws.onmessage = (event) => console.log('Message:', event.data);
   ws.send(JSON.stringify({ type: 'message', data: 'Hello' }));
   ```
4. 提供 Node.js 示例（使用 `ws` 库）
5. 在前端端点详情页添加"查看使用文档"链接，跳转到文档页面
6. 文档页面使用 Ant Design Typography 组件渲染 markdown 内容
7. 代码示例使用代码高亮（可选，使用 `react-syntax-highlighter`）

## Story 3.9: 端点详情页移动端适配和实时消息统计优化

**As a** 用户,
**I want** 在移动设备上流畅地查看端点列表和详情页，并看到更清晰的实时消息统计数据,
**so that** 我可以随时随地通过手机监控我的 WebSocket 端点运行状态。

**Acceptance Criteria:**

1. **端点列表移动端响应式优化** - 在小屏幕设备(<768px)上，端点列表卡片垂直排列，表格视图转换为卡片视图
2. **端点详情页移动端布局优化** - 详情页在小屏幕上使用单列布局，Descriptions 组件设置 `column={1}`
3. **实时消息统计数据展示增强** - 添加"消息速率"指标(消息数/分钟)，使用徽章显示在线状态
4. **响应式断点测试** - 在 Desktop (≥1200px)、Tablet (768px-1199px)、Mobile (<768px) 三种尺寸测试
5. **性能和用户体验** - 统计数据轮询保持5秒，使用 Skeleton 占位符，所有操作提供视觉反馈

## Story 3.10: 历史消息存储和展示功能

**As a** 用户,
**I want** 查看端点的历史消息记录(最新50条),
**so that** 我可以回溯最近的通信内容，方便调试和监控。

**Acceptance Criteria:**

1. **数据库 Schema 变更** - 创建 `Message` 表存储历史消息，字段包含 id, endpoint_id, content, sender_info, created_at
2. **WebSocket 服务器消息存储** - 在消息转发逻辑中添加异步存储功能，消息内容最大 5000 字符
3. **消息自动清理机制** - 保持每个端点最多 50 条消息，按 created_at 降序保留最新记录
4. **获取历史消息 API** - 实现 `GET /api/endpoints/:id/messages` 接口，返回最新 50 条消息
5. **前端历史消息展示** - 在端点详情页添加"历史消息"卡片，使用 List 或 Timeline 组件展示
6. **性能和用户体验** - 历史消息加载使用 Skeleton 占位符，消息存储不影响 WebSocket 转发性能

## Story 3.11: 连接设备管理和自定义名称永久化

**As a** 用户,
**I want** 查看当前连接到端点的所有设备,并为每个设备设置自定义名称(断开重连后保持),
**so that** 我可以清楚地识别和管理不同的客户端连接。

**Acceptance Criteria:**

1. **数据库 Schema 变更** - 创建 `Device` 表存储设备信息，字段包含 id, endpoint_id, device_id, custom_name, last_connected_at
2. **WebSocket 协议扩展** - 客户端连接时发送设备标识消息 `{ type: 'identify', deviceId: 'uuid' }`，服务器响应确认
3. **设备连接状态管理** - 在内存 Map 中维护设备到 WebSocket 的映射，根据 last_connected_at 判断在线状态(30秒内)
4. **获取设备列表 API** - 实现 `GET /api/endpoints/:id/devices` 接口，返回设备列表及在线状态
5. **更新设备名称 API** - 实现 `PUT /api/endpoints/:endpointId/devices/:deviceId` 接口，更新设备自定义名称
6. **前端设备列表展示** - 在端点详情页添加"连接设备"卡片，使用 Table 展示设备列表，支持内联编辑名称
7. **客户端 SDK 集成指南** - 更新 `docs/websocket-usage.md` 文档，添加设备标识章节和示例代码
8. **性能和用户体验** - 设备列表支持定时刷新(每 10 秒)，在线状态实时更新，名称编辑提供即时反馈

---
