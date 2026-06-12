import { TokenService } from '../../../src/modules/auth/token.service';
import { RedisService } from '../../../src/modules/redis/redis.service';

/**
 * In-memory mock Redis store for testing TokenService.
 * Simulates key-value storage with TTL support.
 */
class MockRedisService {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Helper: manually expire a key for testing expiry scenarios.
   */
  expireKey(key: string): void {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() - 1;
    }
  }

  /**
   * Helper: get all keys (for debugging).
   */
  getKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

describe('TokenService', () => {
  let tokenService: TokenService;
  let mockRedis: MockRedisService;

  beforeEach(() => {
    mockRedis = new MockRedisService();
    tokenService = new TokenService(mockRedis as unknown as RedisService);
  });

  describe('Tracking Tokens', () => {
    it('should generate a unique tracking token and store in Redis', async () => {
      const changeRequestId = 'CR-2026-0001';

      const token = await tokenService.generateTrackingToken(changeRequestId);

      // Token should be a 64-character hex string (32 bytes)
      expect(token).toMatch(/^[a-f0-9]{64}$/);

      // Should be stored in Redis under tracking:{token} key
      const stored = await mockRedis.get(`tracking:${token}`);
      expect(stored).toBe(changeRequestId);
    });

    it('should generate unique tokens for each call', async () => {
      const token1 = await tokenService.generateTrackingToken('CR-2026-0001');
      const token2 = await tokenService.generateTrackingToken('CR-2026-0002');

      expect(token1).not.toBe(token2);
    });

    it('should verify a valid tracking token and return changeRequestId', async () => {
      const changeRequestId = 'CR-2026-0001';
      const token = await tokenService.generateTrackingToken(changeRequestId);

      const result = await tokenService.verifyTrackingToken(token);

      expect(result).toBe(changeRequestId);
    });

    it('should return null for an expired tracking token', async () => {
      const changeRequestId = 'CR-2026-0001';
      const token = await tokenService.generateTrackingToken(changeRequestId);

      // Manually expire the key
      mockRedis.expireKey(`tracking:${token}`);

      const result = await tokenService.verifyTrackingToken(token);

      expect(result).toBeNull();
    });

    it('should return null for a non-existent tracking token', async () => {
      const result = await tokenService.verifyTrackingToken('nonexistenttoken');
      expect(result).toBeNull();
    });
  });

  describe('Approval Tokens', () => {
    it('should generate an approval token with metadata', async () => {
      const changeRequestId = 'CR-2026-0001';
      const approverEmail = 'approver@dits.co.th';

      const token = await tokenService.generateApprovalToken(
        changeRequestId,
        approverEmail,
      );

      // Token should be a 64-character hex string
      expect(token).toMatch(/^[a-f0-9]{64}$/);

      // Should be stored in Redis with JSON metadata
      const stored = await mockRedis.get(`approval:${token}`);
      expect(stored).not.toBeNull();

      const data = JSON.parse(stored!);
      expect(data.changeRequestId).toBe(changeRequestId);
      expect(data.approverEmail).toBe(approverEmail);
      expect(data.createdAt).toBeDefined();
    });

    it('should verify a valid approval token and return data', async () => {
      const changeRequestId = 'CR-2026-0001';
      const approverEmail = 'approver@dits.co.th';

      const token = await tokenService.generateApprovalToken(
        changeRequestId,
        approverEmail,
      );

      const result = await tokenService.verifyApprovalToken(token);

      expect(result).not.toBeNull();
      expect(result!.changeRequestId).toBe(changeRequestId);
      expect(result!.approverEmail).toBe(approverEmail);
    });

    it('should mark approval token as used after verification (one-time use)', async () => {
      const changeRequestId = 'CR-2026-0001';
      const approverEmail = 'approver@dits.co.th';

      const token = await tokenService.generateApprovalToken(
        changeRequestId,
        approverEmail,
      );

      // First verification should succeed
      const firstResult = await tokenService.verifyApprovalToken(token);
      expect(firstResult).not.toBeNull();

      // Token should be deleted after first use — key no longer exists
      const exists = await mockRedis.exists(`approval:${token}`);
      expect(exists).toBe(false);
    });

    it('should return null on second verification of same approval token (already used)', async () => {
      const changeRequestId = 'CR-2026-0001';
      const approverEmail = 'approver@dits.co.th';

      const token = await tokenService.generateApprovalToken(
        changeRequestId,
        approverEmail,
      );

      // First verification — consumes the token
      await tokenService.verifyApprovalToken(token);

      // Second verification — should return null
      const secondResult = await tokenService.verifyApprovalToken(token);
      expect(secondResult).toBeNull();
    });

    it('should return null for an expired approval token', async () => {
      const changeRequestId = 'CR-2026-0001';
      const approverEmail = 'approver@dits.co.th';

      const token = await tokenService.generateApprovalToken(
        changeRequestId,
        approverEmail,
      );

      // Manually expire the key
      mockRedis.expireKey(`approval:${token}`);

      const result = await tokenService.verifyApprovalToken(token);
      expect(result).toBeNull();
    });

    it('should return null for a non-existent approval token', async () => {
      const result = await tokenService.verifyApprovalToken('nonexistenttoken');
      expect(result).toBeNull();
    });
  });

  describe('Token Invalidation', () => {
    it('should invalidate a tracking token', async () => {
      const token = await tokenService.generateTrackingToken('CR-2026-0001');

      await tokenService.invalidateToken(token);

      const result = await tokenService.verifyTrackingToken(token);
      expect(result).toBeNull();
    });

    it('should invalidate an approval token', async () => {
      const token = await tokenService.generateApprovalToken(
        'CR-2026-0001',
        'approver@dits.co.th',
      );

      await tokenService.invalidateToken(token);

      const result = await tokenService.verifyApprovalToken(token);
      expect(result).toBeNull();
    });

    it('should not throw when invalidating a non-existent token', async () => {
      await expect(
        tokenService.invalidateToken('nonexistenttoken'),
      ).resolves.not.toThrow();
    });
  });
});
