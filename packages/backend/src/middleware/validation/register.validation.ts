/**
 * 注册请求验证中间件
 * 使用 Zod 验证注册 API 的输入数据
 */

import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * 注册请求 Zod Schema
 * 验证规则:
 * - inviteCode: 8-12 位字符串
 * - username: 3-30 字符,仅允许字母、数字、下划线
 * - email: 有效邮箱格式 (RFC 5322)
 * - password: 最小 8 字符,必须包含大小写字母和数字
 */
export const registerSchema = z.object({
  inviteCode: z
    .string()
    .min(8, '授权码长度必须为 8-12 位')
    .max(12, '授权码长度必须为 8-12 位')
    .regex(/^[a-zA-Z0-9-_]+$/, '授权码格式无效'),

  username: z
    .string()
    .min(3, '用户名长度必须为 3-30 字符')
    .max(30, '用户名长度必须为 3-30 字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),

  email: z.string().email('邮箱格式无效').max(255, '邮箱长度不能超过 255 字符'),

  password: z
    .string()
    .min(8, '密码长度必须至少为 8 字符')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      '密码必须包含至少一个大写字母、一个小写字母和一个数字'
    ),
});

/**
 * 验证错误详情接口
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * 验证中间件工厂函数
 * 接收 Zod schema,返回 Express 中间件函数
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // 验证请求体
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // 格式化 Zod 错误为友好的错误响应
        const zodErrors = error.issues;
        const errorMessages: ValidationErrorDetail[] = zodErrors.map(
          (err): ValidationErrorDetail => ({
            field: err.path.join('.'),
            message: err.message,
          })
        );

        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求数据验证失败',
            details: errorMessages,
            timestamp: new Date().toISOString(),
            requestId: (req.headers['x-request-id'] as string) || 'unknown',
          },
        });
      } else {
        // 未知错误传递给错误处理中间件
        next(error);
      }
    }
  };
};

/**
 * 注册请求验证中间件
 * 可直接在路由中使用
 */
export const validateRegister = validate(registerSchema);
