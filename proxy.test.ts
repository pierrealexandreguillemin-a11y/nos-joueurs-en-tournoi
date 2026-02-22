import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock @upstash/ratelimit — must be before import
const mockLimit = vi.fn();

class MockRatelimit {
  limit = mockLimit;
  static readonly slidingWindow = vi.fn().mockReturnValue('config');
}
class MockRedis {}

vi.mock('@upstash/ratelimit', () => ({ Ratelimit: MockRatelimit }));
vi.mock('@upstash/redis', () => ({ Redis: MockRedis }));

// Set env vars before importing proxy so createRedis() returns non-null
process.env.KV_REST_API_URL = 'https://fake.upstash.io';
process.env.KV_REST_API_TOKEN = 'fake-token';

// Now import proxy (limiters will be created with the mock)
const { proxy } = await import('./proxy');

function makeRequest(path: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

describe('proxy rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 429 when rate limit exceeded', async () => {
    mockLimit.mockResolvedValue({ success: false, remaining: 0 });
    const res = await proxy(makeRequest('/api/scrape'));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many requests');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('passes through with X-RateLimit-Remaining when allowed', async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 25 });
    const res = await proxy(makeRequest('/api/scrape'));
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('25');
  });

  it('fails open when Redis throws', async () => {
    mockLimit.mockRejectedValue(new Error('Redis connection timeout'));
    const res = await proxy(makeRequest('/api/scrape'));
    // Should pass through, not 500
    expect(res.status).toBe(200);
  });

  it('extracts IP from x-forwarded-for (first entry)', async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 10 });
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- test fixture
    const testIPs = '10.0.0.1, 10.0.0.2';
    await proxy(makeRequest('/api/scrape', { 'x-forwarded-for': testIPs }));
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- test assertion
    expect(mockLimit).toHaveBeenCalledWith('10.0.0.1');
  });

  it('falls back to x-real-ip', async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 10 });
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- test fixture
    const testIP = '10.0.0.3';
    await proxy(makeRequest('/api/scrape', { 'x-real-ip': testIP }));
    expect(mockLimit).toHaveBeenCalledWith(testIP);
  });

  it('uses "unknown" when no IP headers', async () => {
    mockLimit.mockResolvedValue({ success: true, remaining: 10 });
    await proxy(makeRequest('/api/scrape'));
    expect(mockLimit).toHaveBeenCalledWith('unknown');
  });
});
