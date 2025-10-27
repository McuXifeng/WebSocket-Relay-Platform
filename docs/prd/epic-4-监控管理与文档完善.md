# Epic 4: 监控、管理与文档完善

**Epic 目标（扩展）：** 实现管理员后台，包括授权码生成、用户管理功能。完善前端监控功能，优化用户体验。创建使用文档和快速开始指南。实施基础的测试（后端单元测试和 WebSocket 集成测试）。配置生产环境部署（PM2、Nginx、环境变量），编写部署文档。此 Epic 完成后，系统达到生产环境就绪状态，管理员可以有效管理用户和授权码，用户可以通过文档快速上手。

## Story 4.1: 实现管理员授权码生成 API

**As a** 后端开发者，
**I want** 实现管理员生成授权码的 API，
**so that** 管理员可以控制用户注册。

**Acceptance Criteria:**

1. 实现 `POST /api/admin/invite-codes` API（需要 JWT 认证，且 `isAdmin` 为 true）
2. 接收参数：`{ expires_at }` (可选，Unix 时间戳或 ISO 8601 日期字符串)
3. 生成随机授权码（8-12 位字符，使用 nanoid 或类似库）
4. 将授权码保存到 InviteCode 表，`created_by` 为当前管理员用户 ID
5. 返回创建的授权码信息：`{ id, code, expires_at, created_at }`
6. 如果请求用户不是管理员，返回 403 错误 "需要管理员权限"
7. 使用 Postman 测试，验证管理员可以成功创建授权码

## Story 4.2: 实现管理员查询授权码列表和用户列表 API

**As a** 后端开发者，
**I want** 实现查询授权码列表和用户列表的 API，
**so that** 管理员可以查看系统使用情况。

**Acceptance Criteria:**

1. 实现 `GET /api/admin/invite-codes` API（需要管理员权限）
2. 返回所有授权码列表，包含字段：`{ id, code, expires_at, used_by, used_at, created_by, created_at }`
3. 如果授权码已使用，关联查询 used_by 用户的 username
4. 按创建时间倒序排列
5. 实现 `GET /api/admin/users` API（需要管理员权限）
6. 返回所有用户列表，包含字段：`{ id, username, email, is_admin, created_at, endpoint_count }`
7. 使用子查询或聚合函数计算每个用户的 endpoint_count（端点数量）
8. 按注册时间倒序排列
9. 如果请求用户不是管理员，两个 API 都返回 403 错误
10. 使用 Postman 测试，验证返回数据格式正确

## Story 4.3: 实现管理员后台前端（授权码管理）

**As a** 管理员，
**I want** 在管理后台生成和查看授权码，
**so that** 我可以控制用户注册。

**Acceptance Criteria:**

1. 创建管理后台页面 `/admin/invite-codes`（需要管理员权限，普通用户访问显示 403 提示）
2. 页面顶部显示"生成授权码"按钮
3. 点击按钮弹出 Modal，包含可选的"有效期"字段（使用 Ant Design DatePicker）
4. 点击"生成"按钮，调用 `POST /api/admin/invite-codes` API
5. 生成成功后，显示 `message.success()` 并刷新授权码列表
6. 使用 Ant Design Table 组件展示授权码列表
7. Table 列：授权码、状态（未使用/已使用）、使用者、有效期、创建时间
8. 授权码列显示"复制"按钮，点击复制授权码到剪贴板
9. 状态列使用 Tag 组件：未使用=蓝色，已使用=灰色，已过期=红色
10. 页面加载时调用 `GET /api/admin/invite-codes` 获取列表

## Story 4.4: 实现管理员后台前端（用户管理）

**As a** 管理员，
**I want** 在管理后台查看所有用户列表和统计信息，
**so that** 我可以了解系统使用情况。

**Acceptance Criteria:**

1. 创建用户管理页面 `/admin/users`（需要管理员权限）
2. 使用 Ant Design Table 组件展示用户列表
3. Table 列：用户名、邮箱、管理员标识、端点数量、注册时间
4. 管理员标识使用 Badge 组件（is_admin=true 显示"管理员"徽章）
5. 端点数量列可点击，点击后跳转到该用户的端点列表（可选功能）
6. 支持按用户名搜索（使用 Ant Design Input.Search）
7. 页面加载时调用 `GET /api/admin/users` 获取列表
8. 在顶部导航栏添加"管理后台"下拉菜单（仅管理员可见）
9. 下拉菜单包含"授权码管理"和"用户管理"两个链接

## Story 4.5: 编写后端单元测试和 WebSocket 集成测试

**As a** 开发者，
**I want** 编写测试用例覆盖核心业务逻辑，
**so that** 可以保证代码质量和功能正确性。

**Acceptance Criteria:**

1. 配置 Jest 测试框架（已在 Story 1.1 中配置）
2. 编写授权码验证逻辑的单元测试：
   - 测试有效授权码注册成功
   - 测试无效授权码被拒绝
   - 测试已使用授权码被拒绝
   - 测试过期授权码被拒绝
3. 编写端点创建逻辑的单元测试：
   - 测试成功创建端点
   - 测试 endpoint_id 唯一性
   - 测试端点数量限制
4. 编写 WebSocket 集成测试（使用 `ws` 客户端库）：
   - 测试客户端成功连接
   - 测试消息在同一端点多个客户端之间广播
   - 测试不同端点的消息隔离
   - 测试无效 endpoint_id 连接被拒绝
5. 配置 `npm run test` 命令，运行所有测试
6. 目标覆盖率：核心业务逻辑 > 70%
7. 所有测试通过，CI 友好（可在 GitHub Actions 中运行）

## Story 4.6: 配置生产环境部署和 PM2 进程管理

**As a** DevOps 工程师，
**I want** 配置 PM2 进程管理和环境变量，
**so that** 应用可以在生产环境稳定运行。

**Acceptance Criteria:**

1. 创建 `ecosystem.config.js` PM2 配置文件
2. 配置两个应用进程：
   - `api-server`：Express REST API（端口 3000）
   - `ws-server`：WebSocket 服务器（端口 3001）
3. 配置环境变量：`NODE_ENV=production`
4. 配置进程重启策略：异常退出自动重启
5. 配置日志输出：`error.log` 和 `out.log`
6. 配置 `max_memory_restart`：内存超过限制自动重启
7. 创建 `.env.production` 示例文件
8. 编写启动脚本：`npm run start:prod` 使用 PM2 启动所有进程
9. 验证：运行 `pm2 list` 可以看到两个进程正常运行
10. 验证：运行 `pm2 logs` 可以查看日志输出

## Story 4.7: 创建 Nginx 配置和部署文档

**As a** DevOps 工程师，
**I want** 配置 Nginx 反向代理和 SSL，
**so that** 应用可以通过 HTTPS/WSS 安全访问。

**Acceptance Criteria:**

1. 创建 `nginx.conf` 配置文件模板
2. 配置反向代理：
   - `/` → React 静态文件
   - `/api` → Express API（http://localhost:3000）
   - `/ws` → WebSocket 服务器（http://localhost:3001，配置 WebSocket 升级）
3. 配置 SSL/TLS（使用 Let's Encrypt）
4. 配置 HTTPS 强制重定向
5. 配置 CORS 头（如果需要）
6. 配置 Gzip 压缩
7. 创建部署文档 `docs/deployment.md`，包含：
   - 服务器要求（2核4G，Ubuntu 20.04+）
   - 安装 Node.js、MySQL、Nginx、PM2
   - 克隆代码、安装依赖
   - 配置环境变量
   - 运行数据库迁移
   - 构建前端
   - 配置 Nginx
   - 启动 PM2
   - 配置 Let's Encrypt SSL
8. 文档包含完整的命令步骤，复制即可执行

## Story 4.8: 完善使用文档和 README

**As a** 用户，
**I want** 查看完整的使用文档和项目 README，
**so that** 我可以快速了解项目和上手使用。

**Acceptance Criteria:**

1. 创建项目 `README.md`，包含：
   - 项目简介和核心功能
   - 技术栈说明
   - 本地开发环境搭建步骤
   - 目录结构说明
   - 开发命令（dev、build、test、lint）
   - 贡献指南（可选）
   - 许可证信息（可选）
2. 创建 `docs/quick-start.md` 快速开始指南，包含：
   - 注册账号（如何获取授权码）
   - 创建端点
   - 连接 WebSocket（代码示例）
   - 测试消息转发
   - 常见问题 FAQ
3. 在前端创建"帮助"或"文档"页面（`/docs`），展示快速开始指南
4. 在端点详情页添加"如何使用"提示，引导用户查看文档
5. 文档使用 Markdown 格式，易于维护
6. 文档包含截图（可选）

---
