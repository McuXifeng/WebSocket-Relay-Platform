/**
 * Used Tokens Service (Story 8.1)
 * 一次性 Token 存储服务
 *
 * MVP 使用内存 Set 存储已使用的 Token
 * 生产环境建议使用 Redis 以支持分布式部署
 */

import { alertLogger } from '../config/logger';

/**
 * 一次性 Token 存储服务
 *
 * 职责：
 * - 记录已使用的 Token，防止重放攻击
 * - 提供 Token 使用状态查询
 * - 定期清理过期 Token（可选）
 */
class UsedTokensService {
  private usedTokens: Set<string> = new Set();

  /**
   * 检查 Token 是否已使用
   * @param token - Token 字符串
   * @returns boolean - 是否已使用
   */
  isTokenUsed(token: string): boolean {
    return this.usedTokens.has(token);
  }

  /**
   * 标记 Token 为已使用
   * @param token - Token 字符串
   */
  markTokenAsUsed(token: string): void {
    this.usedTokens.add(token);
    const tokenPreview = token && token.length > 20 ? token.substring(0, 20) + '...' : token;
    alertLogger.debug('Token 已标记为已使用', { token: tokenPreview });
  }

  /**
   * 清理过期 Token
   *
   * 注意：当前实现无法区分过期和未过期的 Token
   * 因为只存储 Token 字符串，不存储过期时间
   *
   * 未来优化方案：
   * 1. 使用 Map 存储 Token 及其过期时间
   * 2. 定期清理已过期的 Token
   * 3. 使用 Redis 并设置 TTL
   */
  cleanupExpiredTokens(): void {
    // TODO: 实现基于过期时间的清理逻辑
    // 当前版本不实现，因为内存 Set 无法区分过期 Token
    // Token 过期由 verifyMarkReadToken() 函数验证
    alertLogger.warn('cleanupExpiredTokens 未实现: 当前使用内存 Set，无法自动清理');
  }

  /**
   * 获取已使用 Token 数量
   * @returns number - 已使用 Token 数量
   */
  getUsedTokenCount(): number {
    return this.usedTokens.size;
  }

  /**
   * 清空所有已使用 Token（仅用于测试）
   */
  clear(): void {
    this.usedTokens.clear();
    alertLogger.info('所有已使用 Token 已清空');
  }
}

// 导出单例实例
export const usedTokensService = new UsedTokensService();
