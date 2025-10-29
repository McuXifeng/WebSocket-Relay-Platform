import { Router, type Request, type Response, type IRouter } from 'express';

/**
 * 健康检查路由
 * 用于监控系统状态和负载均衡器探测
 */
const healthRouter: IRouter = Router();

/**
 * GET /health
 * 健康检查端点，返回服务器运行状态
 * @returns { status: "ok" }
 */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
  });
});

export default healthRouter;
