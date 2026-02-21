/**
 * In-memory rate limiter using sliding window.
 * Suitable for single-instance deployments (Vercel serverless).
 */
export class RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {}

  check(key: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    this.cleanup(now);

    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      if (this.maxRequests <= 0) {
        return { allowed: false, remaining: 0 };
      }
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1 };
    }

    if (entry.count < this.maxRequests) {
      entry.count++;
      return { allowed: true, remaining: this.maxRequests - entry.count };
    }

    return { allowed: false, remaining: 0 };
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }
}
