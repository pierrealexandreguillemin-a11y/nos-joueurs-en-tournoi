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

    const r = limiter.check('ip-3');
    expect(r.allowed).toBe(true);
  });

  it('remaining is 0 on the exact limit request', () => {
    const limiter = new RateLimiter(1, 60_000);
    const r = limiter.check('ip-1');
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it('stays blocked until window expires', () => {
    const limiter = new RateLimiter(1, 10_000);
    limiter.check('ip-1');

    vi.advanceTimersByTime(5_000);
    expect(limiter.check('ip-1').allowed).toBe(false);

    vi.advanceTimersByTime(5_001);
    expect(limiter.check('ip-1').allowed).toBe(true);
  });

  it('handles maxRequests=0 (always blocked)', () => {
    const limiter = new RateLimiter(0, 60_000);
    const r = limiter.check('ip-1');
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('multiple keys can exhaust independently', () => {
    const limiter = new RateLimiter(1, 60_000);

    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    expect(limiter.check('b').allowed).toBe(false);
  });

  it('first request after window resets count to 1', () => {
    const limiter = new RateLimiter(3, 1_000);
    limiter.check('ip-1');
    limiter.check('ip-1');

    vi.advanceTimersByTime(1_001);

    const r = limiter.check('ip-1');
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });
});
