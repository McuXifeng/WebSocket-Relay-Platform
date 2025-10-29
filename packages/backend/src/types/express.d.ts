/**
 * Express Request 类型扩展
 * 扩展 Express Request 接口以包含自定义属性
 */

import type { JwtPayload } from '@websocket-relay/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
