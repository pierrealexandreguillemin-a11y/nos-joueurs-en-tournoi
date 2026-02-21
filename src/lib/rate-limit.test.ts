import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from './rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within the limit', () => {
    const limiter = new RateLimiter(3, 60_000);

    const r1 = limiter.check('ip-1');
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = limiter.check('ip-1');
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check('ip-1');
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests exceeding the limit', () => {
    const limiter = new RateLimiter(2, 60_000);

    limiter.check('ip-1');
    limiter.check('ip-1');

    const r3 = limiter.check('ip-1');
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('resets after the time window', () => {
    const limiter = new RateLimiter(2, 60_000);

    limiter.check('ip-1');
    limiter.check('ip-1');

    expect(limiter.check('ip-1').allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    const r = limiter.check('ip-1');
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it('isolates different keys', () => {
    const limiter = new RateLimiter(1, 60_000);

    limiter.check('ip-1');
    expect(limiter.check('ip-1').allowed).toBe(false);

    const r = limiter.check('ip-2');
    expect(r.allowed).toBe(true);
  });

  it('cleans up expired entries', () => {
    const limiter = new RateLimiter(1, 1_000);

    limiter.check('ip-1');
    limiter.check('ip-2');

    vi.advanceTimersByTime(1_001);

    // Next check triggers cleanup — expired entries are removed
    const r = limiter.check('ip-3');
    expect(r.allowed).toBe(true);
  });
});
