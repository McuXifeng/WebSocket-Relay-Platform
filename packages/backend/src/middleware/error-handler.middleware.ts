import { type Request, type Response, type NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { config } from '../config/env.js';

/**
 * 自定义应用错误类
 * 用于业务逻辑错误，携带错误码和详情
 */
export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode = 400, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';

    // 维护原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 统一错误响应格式
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
    requestId: string;
  };
}

/**
 * 统一错误处理中间件
 * 捕获所有错误并返回标准化的 JSON 响应
 * 必须在所有路由之后注册
 *
 * @param err - 错误对象
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express 下一个中间件函数
 */
export function errorHandler(
  err: Error | AppError,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // 生成唯一的请求 ID，用于日志追踪
  const requestId = nanoid(12);

  // 区分已知错误（AppError）和未知错误（系统错误）
  const isAppError = err instanceof AppError;

  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred';
  const details = isAppError ? err.details : undefined;

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // 记录错误日志（开发环境输出详细信息）
  if (config.isDevelopment) {
    console.error('❌ Error caught by error handler:');
    console.error(`  Request ID: ${requestId}`);
    console.error(`  Status Code: ${statusCode}`);
    console.error(`  Code: ${code}`);
    console.error(`  Message: ${message}`);
    if (details) {
      console.error(`  Details:`, details);
    }
    console.error(`  Stack:`, err.stack);
  } else {
    // 生产环境只记录错误消息和 requestId
    console.error(`[${requestId}] ${code}: ${message}`);
  }

  // 返回错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found 处理中间件
 * 处理未匹配到任何路由的请求
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = nanoid(12);

  const errorResponse: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  res.status(404).json(errorResponse);
}
