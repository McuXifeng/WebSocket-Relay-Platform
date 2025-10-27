# Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Frontend Language** | TypeScript | 5.3+ | 前端类型安全开发 | 与 Ant Design 和 React 完美集成，减少运行时错误，提供优秀的 IDE 支持 |
| **Frontend Framework** | React | 18.2+ | 构建用户界面 | 成熟的组件化框架，生态丰富，与 Ant Design 原生集成，团队熟悉度高 |
| **UI Component Library** | Ant Design | 5.x | 企业级 UI 组件库 | PRD 明确要求，中文文档完善，组件丰富，全 SVG 图标，主题配置简单 |
| **State Management** | React Context API | 18.2+ | 全局状态管理 | 内置方案无需额外依赖，满足 MVP 简单状态需求，符合 YAGNI 原则 |
| **Backend Language** | TypeScript | 5.3+ | 后端类型安全开发 | Prisma 原生支持类型生成，减少 WebSocket 消息路由等复杂逻辑的错误 |
| **Backend Framework** | Express | 4.18+ | REST API 服务器 | 轻量级，中间件生态成熟，适合快速开发 MVP，与 TypeScript 集成良好 |
| **API Style** | REST | - | HTTP API 设计风格 | 简单直接，满足 CRUD 操作需求，工具链成熟，前端 Axios 原生支持 |
| **Database** | MySQL | 8.0+ | 关系型数据库 | 轻量级，资源占用少，适合单服务器部署，文档丰富，满足 MVP 所有存储需求 |
| **ORM** | Prisma | 5.x | 数据库访问层 | 类型安全的查询，自动生成 TypeScript 类型，Schema 清晰，开发体验极佳 |
| **WebSocket Library** | ws | 8.x | WebSocket 服务器 | 原生 Node.js WebSocket 库，性能高，无额外抽象开销，完全控制连接管理逻辑 |
| **Cache** | N/A (内存 Map) | - | WebSocket 连接池 | MVP 阶段使用内存 Map 存储连接映射，无需 Redis，简化架构 |
| **File Storage** | 本地文件系统 | - | 静态资源托管 | 前端构建产物存储在服务器本地，通过 Nginx 托管，成本为零 |
| **Authentication** | JWT (jsonwebtoken) | 9.x | 用户认证 | 无状态认证，Token 存储在客户端，易于水平扩展 |
| **Password Hashing** | bcrypt | 5.x | 密码加密存储 | 业界标准，自动加盐，salt rounds = 10，防止彩虹表攻击 |
| **Frontend Testing** | Vitest | 1.x | 前端单元测试 | Vite 原生支持，配置简单，速度快（MVP 可选，优先级较低） |
| **Backend Testing** | Jest | 29.x | 后端单元/集成测试 | 成熟的测试框架，支持 TypeScript，supertest 集成测试 API |
| **E2E Testing** | 手动测试 | - | 端到端测试 | MVP 阶段手动测试即可，未来可引入 Playwright |
| **Build Tool** | Vite | 5.x | 前端构建工具 | 快速的开发服务器（HMR），ES Modules 原生支持，React 官方推荐 |
| **Bundler** | Rollup (Vite 内置) | 4.x | JavaScript 打包器 | Vite 内置，Tree-shaking 优化，生成高效的生产代码 |
| **Package Manager** | pnpm | 8.x | 依赖管理 | 磁盘空间节省，安装速度快，Monorepo workspace 支持良好 |
| **Process Manager** | PM2 | 5.x | Node.js 进程管理 | 生产环境标准，自动重启，日志管理，内置监控 |
| **Reverse Proxy** | Nginx | 1.24+ | Web 服务器 | 静态文件托管，反向代理，SSL 终止，WebSocket 升级支持 |
| **SSL/TLS** | Let's Encrypt | - | HTTPS/WSS 加密 | 免费 SSL 证书，自动续期，Certbot 工具简化配置 |
| **Code Linting** | ESLint | 8.x | JavaScript/TypeScript 检查 | 统一代码风格，捕获潜在错误，TypeScript 插件支持 |
| **Code Formatting** | Prettier | 3.x | 代码格式化 | 自动格式化，团队风格统一，减少代码审查中的风格争议 |
| **Git Hooks** | Husky + lint-staged | 8.x / 15.x | Commit 前检查 | 自动运行 lint 和 format，保证提交代码质量 |
| **CI/CD** | GitHub Actions | - | 持续集成/部署 | 免费，与 GitHub 深度集成，YAML 配置简单 |
| **Monitoring** | PM2 内置监控 | - | 进程监控 | PM2 提供 CPU/内存监控，日志聚合，MVP 阶段足够 |
| **Logging** | Winston | 3.x | 结构化日志 | 支持多种传输方式，日志级别管理，JSON 格式输出便于分析 |
| **CSS Framework** | Ant Design 内置 | 5.x | 样式系统 | 使用 Ant Design 的 CSS-in-JS 方案，无需额外 CSS 框架 |
| **HTTP Client** | Axios | 1.x | 前端 HTTP 请求库 | Promise 基础，拦截器支持，请求/响应转换，错误处理统一 |
| **CORS Middleware** | cors | 2.8+ | 跨域资源共享 | Express 中间件，配置允许的源，支持 credentials |
| **Environment Variables** | dotenv | 16.x | 环境变量管理 | 从 .env 文件加载配置，区分开发/生产环境 |
| **Date/Time Library** | date-fns | 3.x | 日期处理 | 轻量级，Tree-shakable，TypeScript 支持 |
| **ID Generation** | nanoid | 5.x | 唯一 ID 生成 | 短小（8-12 位），URL 友好，用于生成 endpoint_id 和 invite_code |

---
