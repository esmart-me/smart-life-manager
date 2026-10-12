/**
 * In-Memory Sliding-Window Rate Limiter
 *
 * Designed for single-instance Next.js / Electron architectures.
 * Note: For horizontally scaled distributed deployments across multiple containers or servers,
 * this in-memory store should be swapped with a shared persistent store such as Redis.
 */

interface RateLimitRecord {
  timestamps: number[];
}

class SlidingWindowRateLimiter {
  private cache = new Map<string, RateLimitRecord>();
  private cleanupIntervalMs = 60000; // 1 minute
  private lastCleanup = Date.now();

  /**
   * Periodically cleans up expired records to prevent unbounded memory growth.
   */
  private cleanup(maxWindowMs: number) {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;
    this.lastCleanup = now;

    for (const [key, record] of this.cache.entries()) {
      const valid = record.timestamps.filter((ts) => now - ts < maxWindowMs);
      if (valid.length === 0) {
        this.cache.delete(key);
      } else {
        this.cache.set(key, { timestamps: valid });
      }
    }
  }

  /**
   * Consumes a token and checks if the rate limit is exceeded.
   */
  public check(
    key: string,
    limit: number,
    windowMs: number
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    retryAfterSec: number;
  } {
    const now = Date.now();
    this.cleanup(windowMs);

    const record = this.cache.get(key) || { timestamps: [] };
    // Filter timestamps within current sliding window
    const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length >= limit) {
      const oldestValid = validTimestamps[0];
      const resetTimeMs = oldestValid + windowMs - now;
      const retryAfterSec = Math.max(1, Math.ceil(resetTimeMs / 1000));

      return {
        success: false,
        limit,
        remaining: 0,
        retryAfterSec,
      };
    }

    validTimestamps.push(now);
    this.cache.set(key, { timestamps: validTimestamps });

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - validTimestamps.length),
      retryAfterSec: 0,
    };
  }

  /**
   * Checks if limit is exceeded WITHOUT consuming a token (for inspection).
   */
  public isLimited(
    key: string,
    limit: number,
    windowMs: number
  ): {
    limited: boolean;
    retryAfterSec: number;
  } {
    const now = Date.now();
    const record = this.cache.get(key);
    if (!record) return { limited: false, retryAfterSec: 0 };

    const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (validTimestamps.length >= limit) {
      const oldestValid = validTimestamps[0];
      const resetTimeMs = oldestValid + windowMs - now;
      return {
        limited: true,
        retryAfterSec: Math.max(1, Math.ceil(resetTimeMs / 1000)),
      };
    }

    return { limited: false, retryAfterSec: 0 };
  }

  /**
   * Resets rate-limiting record for a specific key (e.g., upon successful login).
   */
  public reset(key: string): void {
    this.cache.delete(key);
  }
}

// Global singletons for memory persistence across hot-reloads and requests
const globalForLimiter = globalThis as unknown as {
  authLimiter?: SlidingWindowRateLimiter;
  aiLimiter?: SlidingWindowRateLimiter;
  generalLimiter?: SlidingWindowRateLimiter;
};

export const authLimiter = globalForLimiter.authLimiter || new SlidingWindowRateLimiter();
export const aiLimiter = globalForLimiter.aiLimiter || new SlidingWindowRateLimiter();
export const generalLimiter = globalForLimiter.generalLimiter || new SlidingWindowRateLimiter();

if (process.env.NODE_ENV !== "production") {
  globalForLimiter.authLimiter = authLimiter;
  globalForLimiter.aiLimiter = aiLimiter;
  globalForLimiter.generalLimiter = generalLimiter;
}

/**
 * Extracts client IP address from request headers safely.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}
