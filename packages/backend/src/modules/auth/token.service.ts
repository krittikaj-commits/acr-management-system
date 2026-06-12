import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';

/** TTL constants in seconds */
const TRACKING_TOKEN_TTL = 24 * 60 * 60; // 24 hours
const APPROVAL_TOKEN_TTL = 72 * 60 * 60; // 72 hours

/** Redis key prefixes */
const TRACKING_PREFIX = 'tracking:';
const APPROVAL_PREFIX = 'approval:';

export interface ApprovalTokenData {
  changeRequestId: string;
  approverEmail: string;
  createdAt: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate a secure random token string (64 hex characters).
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a tracking token for an anonymous requester.
   * Stored in Redis with `tracking:{token}` key and 24h TTL.
   */
  async generateTrackingToken(changeRequestId: string): Promise<string> {
    const token = this.generateSecureToken();
    const key = `${TRACKING_PREFIX}${token}`;
    await this.redisService.set(key, changeRequestId, TRACKING_TOKEN_TTL);
    return token;
  }

  /**
   * Verify a tracking token.
   * Returns the changeRequestId if valid, null if expired or not found.
   */
  async verifyTrackingToken(token: string): Promise<string | null> {
    const key = `${TRACKING_PREFIX}${token}`;
    return this.redisService.get(key);
  }

  /**
   * Generate an approval link token for one-time use.
   * Stored in Redis with `approval:{token}` key, metadata, and 72h TTL.
   */
  async generateApprovalToken(
    changeRequestId: string,
    approverEmail: string,
  ): Promise<string> {
    const token = this.generateSecureToken();
    const key = `${APPROVAL_PREFIX}${token}`;
    const data: ApprovalTokenData = {
      changeRequestId,
      approverEmail,
      createdAt: new Date().toISOString(),
    };
    await this.redisService.set(key, JSON.stringify(data), APPROVAL_TOKEN_TTL);
    return token;
  }

  /**
   * Verify an approval token (one-time use).
   * If valid, returns { changeRequestId, approverEmail } and deletes the token (one-time use).
   * Returns null if token not found or already used.
   */
  async verifyApprovalToken(
    token: string,
  ): Promise<{ changeRequestId: string; approverEmail: string } | null> {
    const key = `${APPROVAL_PREFIX}${token}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      return null;
    }

    // Delete immediately — one-time use
    await this.redisService.del(key);

    const data: ApprovalTokenData = JSON.parse(raw);
    return {
      changeRequestId: data.changeRequestId,
      approverEmail: data.approverEmail,
    };
  }

  /**
   * Peek at an approval token without consuming it (non-destructive check).
   * Returns the token data if valid, null if not found.
   */
  async peekApprovalToken(
    token: string,
  ): Promise<{ changeRequestId: string; approverEmail: string } | null> {
    const key = `${APPROVAL_PREFIX}${token}`;
    const raw = await this.redisService.get(key);
    if (!raw) {
      return null;
    }

    const data: ApprovalTokenData = JSON.parse(raw);
    return {
      changeRequestId: data.changeRequestId,
      approverEmail: data.approverEmail,
    };
  }

  /**
   * Invalidate (remove) any token from Redis.
   * Works for both tracking and approval tokens.
   */
  async invalidateToken(token: string): Promise<void> {
    // Try both prefixes
    await this.redisService.del(`${TRACKING_PREFIX}${token}`);
    await this.redisService.del(`${APPROVAL_PREFIX}${token}`);
  }
}
