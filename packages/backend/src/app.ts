import express, { type Express } from 'express';
import cors from 'cors';
import healthRouter from './routes/health.route.js';
import authRouter from './routes/auth.route.js';
import endpointRouter from './routes/endpoint.route.js';
import adminRouter from './routes/admin.route.js';
import visualizationRouter from './routes/visualization.routes.js';
import controlRouter from './routes/control.routes.js';
import alertRuleRouter from './routes/alert-rule.routes.js';
import alertHistoryRouter from './routes/alert-history.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware.js';
import { config } from './config/env.js';

/**
 * 创建并配置 Express 应用实例
 * 集成中间件、路由和错误处理
 */
function createApp(): Express {
  const app = express();

  // 配置 CORS 中间件
  // 允许前端开发服务器（localhost:5173）和生产环境访问 API
  // credentials: true 允许携带 Cookie 和 Authorization 头
  app.use(
    cors({
      origin: config.allowedOrigins,
      credentials: true,
    })
  );

  // 解析 JSON 请求体
  app.use(express.json());

  // 解析 URL 编码数据（来自表单提交）
  app.use(express.urlencoded({ extended: true }));

  // 挂载健康检查路由到 /api 前缀下
  app.use('/api', healthRouter);

  // 挂载认证路由到 /api/auth 前缀下
  app.use('/api/auth', authRouter);

  // 挂载端点路由到 /api/endpoints 前缀下
  app.use('/api/endpoints', endpointRouter);

  // 挂载管理员路由到 /api/admin 前缀下
  app.use('/api/admin', adminRouter);

  // 挂载可视化路由到 /api/visualization 前缀下 (Epic 6 新增)
  app.use('/api/visualization', visualizationRouter);

  // 挂载控制指令路由到 /api/endpoints 前缀下 (Epic 6 Story 6.4 新增)
  app.use('/api/endpoints', controlRouter);

  // 挂载告警规则路由到 /api/alert-rules 前缀下 (Epic 6 Story 6.5 新增)
  app.use('/api/alert-rules', alertRuleRouter);

  // 挂载告警历史路由到 /api/alert-history 前缀下 (Epic 6 Story 6.5 新增)
  app.use('/api/alert-history', alertHistoryRouter);

  // 404 Not Found 处理（必须在所有路由之后，错误处理之前）
  app.use(notFoundHandler);

  // 统一错误处理中间件（必须在所有路由和中间件之后）
  app.use(errorHandler);

  return app;
}

// 导出应用实例供 server.ts 使用
export default createApp();
