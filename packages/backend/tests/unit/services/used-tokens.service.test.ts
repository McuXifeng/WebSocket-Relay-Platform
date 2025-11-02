/**
 * Unit tests for used-tokens.service.ts
 * Tests one-time token storage and validation
 */

import { usedTokensService } from '../../../src/services/used-tokens.service';

describe('UsedTokensService', () => {
  beforeEach(() => {
    // Clear all used tokens before each test
    usedTokensService['usedTokens'].clear();
  });

  describe('isTokenUsed', () => {
    it('应该对未使用的 Token 返回 false', () => {
      const token = 'test-token-unused';
      expect(usedTokensService.isTokenUsed(token)).toBe(false);
    });

    it('应该对已使用的 Token 返回 true', () => {
      const token = 'test-token-used';
      usedTokensService.markTokenAsUsed(token);

      expect(usedTokensService.isTokenUsed(token)).toBe(true);
    });

    it('应该区分不同的 Token', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';

      usedTokensService.markTokenAsUsed(token1);

      expect(usedTokensService.isTokenUsed(token1)).toBe(true);
      expect(usedTokensService.isTokenUsed(token2)).toBe(false);
    });

    it('应该处理空字符串 Token', () => {
      const emptyToken = '';
      expect(usedTokensService.isTokenUsed(emptyToken)).toBe(false);

      usedTokensService.markTokenAsUsed(emptyToken);
      expect(usedTokensService.isTokenUsed(emptyToken)).toBe(true);
    });

    it('应该处理特殊字符 Token', () => {
      const specialTokens = [
        'token-with-special-chars-!@#$%^&*()',
        'token/with/slashes',
        'token@with#special$symbols',
        'token with spaces',
        'token-with-中文字符',
      ];

      specialTokens.forEach((token) => {
        expect(usedTokensService.isTokenUsed(token)).toBe(false);

        usedTokensService.markTokenAsUsed(token);
        expect(usedTokensService.isTokenUsed(token)).toBe(true);
      });
    });
  });

  describe('markTokenAsUsed', () => {
    it('应该成功标记 Token 为已使用', () => {
      const token = 'test-token-mark';

      expect(usedTokensService.isTokenUsed(token)).toBe(false);

      usedTokensService.markTokenAsUsed(token);

      expect(usedTokensService.isTokenUsed(token)).toBe(true);
    });

    it('应该允许多次标记同一个 Token (幂等性)', () => {
      const token = 'test-token-idempotent';

      usedTokensService.markTokenAsUsed(token);
      usedTokensService.markTokenAsUsed(token);
      usedTokensService.markTokenAsUsed(token);

      expect(usedTokensService.isTokenUsed(token)).toBe(true);
    });

    it('应该支持标记多个不同的 Token', () => {
      const tokens = Array.from({ length: 100 }, (_, i) => `test-token-${i}`);

      tokens.forEach((token) => {
        usedTokensService.markTokenAsUsed(token);
      });

      tokens.forEach((token) => {
        expect(usedTokensService.isTokenUsed(token)).toBe(true);
      });
    });

    it('应该处理非常长的 Token 字符串', () => {
      const longToken = 'test-token-' + 'a'.repeat(1000);

      usedTokensService.markTokenAsUsed(longToken);

      expect(usedTokensService.isTokenUsed(longToken)).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('应该能处理大量 Token 存储', () => {
      const tokenCount = 10000;
      const tokens: string[] = [];

      // Add 10,000 tokens
      for (let i = 0; i < tokenCount; i++) {
        const token = `test-token-${i}`;
        tokens.push(token);
        usedTokensService.markTokenAsUsed(token);
      }

      // Verify all tokens are marked as used
      tokens.forEach((token) => {
        expect(usedTokensService.isTokenUsed(token)).toBe(true);
      });

      // Verify token count
      expect(usedTokensService['usedTokens'].size).toBe(tokenCount);
    });

    it('应该在多次调用后保持状态一致性', () => {
      const token = 'test-token-consistency';

      // Mark as used
      usedTokensService.markTokenAsUsed(token);
      expect(usedTokensService.isTokenUsed(token)).toBe(true);

      // Check multiple times
      for (let i = 0; i < 100; i++) {
        expect(usedTokensService.isTokenUsed(token)).toBe(true);
      }
    });
  });

  describe('Concurrency Safety', () => {
    it('应该在并发标记时保持一致性', async () => {
      const token = 'test-token-concurrent';

      // Simulate concurrent marking
      await Promise.all([
        Promise.resolve(usedTokensService.markTokenAsUsed(token)),
        Promise.resolve(usedTokensService.markTokenAsUsed(token)),
        Promise.resolve(usedTokensService.markTokenAsUsed(token)),
      ]);

      expect(usedTokensService.isTokenUsed(token)).toBe(true);
    });

    it('应该在并发检查时返回正确结果', async () => {
      const token = 'test-token-concurrent-check';
      usedTokensService.markTokenAsUsed(token);

      // Simulate concurrent checking
      const results = await Promise.all([
        Promise.resolve(usedTokensService.isTokenUsed(token)),
        Promise.resolve(usedTokensService.isTokenUsed(token)),
        Promise.resolve(usedTokensService.isTokenUsed(token)),
      ]);

      results.forEach((result) => {
        expect(result).toBe(true);
      });
    });
  });

  describe('Service Singleton Behavior', () => {
    it('应该在整个测试套件中保持单例状态', async () => {
      const token = 'test-token-singleton';

      usedTokensService.markTokenAsUsed(token);

      // Import service again to verify singleton (ES modules)
      const { usedTokensService: reimportedService } = await import(
        '../../../src/services/used-tokens.service'
      );

      expect(reimportedService.isTokenUsed(token)).toBe(true);
      expect(reimportedService).toBe(usedTokensService); // Should be the same instance
    });
  });

  describe('Edge Cases', () => {
    it('应该处理 null 和 undefined Token (类型安全)', () => {
      // TypeScript should prevent this, but test runtime behavior
      const nullToken = null as unknown as string;
      const undefinedToken = undefined as unknown as string;

      // Clear before testing to ensure clean state
      usedTokensService['usedTokens'].clear();

      // Should not throw errors for null/undefined
      expect(() => {
        usedTokensService.markTokenAsUsed(nullToken);
      }).not.toThrow();

      expect(() => {
        usedTokensService.isTokenUsed(nullToken);
      }).not.toThrow();

      expect(() => {
        usedTokensService.markTokenAsUsed(undefinedToken);
      }).not.toThrow();

      expect(() => {
        usedTokensService.isTokenUsed(undefinedToken);
      }).not.toThrow();

      // Verify they are marked as used
      expect(usedTokensService.isTokenUsed(nullToken)).toBe(true);
      expect(usedTokensService.isTokenUsed(undefinedToken)).toBe(true);
    });

    it('应该处理包含换行符的 Token', () => {
      const tokenWithNewline = 'test-token\nwith\nnewlines';

      usedTokensService.markTokenAsUsed(tokenWithNewline);

      expect(usedTokensService.isTokenUsed(tokenWithNewline)).toBe(true);
    });

    it('应该处理 Unicode 字符 Token', () => {
      const unicodeTokens = [
        'test-token-😀🎉🔥',
        'test-token-中文字符测试',
        'test-token-Ελληνικά',
        'test-token-العربية',
      ];

      unicodeTokens.forEach((token) => {
        usedTokensService.markTokenAsUsed(token);
        expect(usedTokensService.isTokenUsed(token)).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    it('应该在 O(1) 时间复杂度内检查 Token', () => {
      // Add 1000 tokens
      for (let i = 0; i < 1000; i++) {
        usedTokensService.markTokenAsUsed(`test-token-${i}`);
      }

      // Check should be fast regardless of token count
      const startTime = Date.now();
      const result = usedTokensService.isTokenUsed('test-token-500');
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(10); // Should be < 10ms
    });

    it('应该在 O(1) 时间复杂度内标记 Token', () => {
      // Add 1000 tokens
      for (let i = 0; i < 1000; i++) {
        usedTokensService.markTokenAsUsed(`test-token-${i}`);
      }

      // Mark should be fast regardless of token count
      const startTime = Date.now();
      usedTokensService.markTokenAsUsed('test-token-new');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // Should be < 10ms
    });
  });

  describe('Clear Functionality', () => {
    it('应该支持清空所有已使用的 Token', () => {
      const tokens = ['token-1', 'token-2', 'token-3'];

      tokens.forEach((token) => {
        usedTokensService.markTokenAsUsed(token);
      });

      // Clear all tokens
      usedTokensService['usedTokens'].clear();

      // Verify all tokens are cleared
      tokens.forEach((token) => {
        expect(usedTokensService.isTokenUsed(token)).toBe(false);
      });

      expect(usedTokensService['usedTokens'].size).toBe(0);
    });
  });
});
