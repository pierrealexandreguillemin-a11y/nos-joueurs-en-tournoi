import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

function createRedis() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  return new Redis({
    url: process.env.KV_REST_API_URL.trim(),
    token: process.env.KV_REST_API_TOKEN.trim(),
  });
}

const redis = createRedis();

const scrapeLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'nos-joueurs:ratelimit:scrape',
    })
  : null;

const eventsLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'nos-joueurs:ratelimit:events',
    })
  : null;

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const limiter = path.startsWith('/api/events') ? eventsLimiter : scrapeLimiter;

  if (!limiter) return NextResponse.next();

  const ip = getClientIP(req);

  let success: boolean;
  let remaining: number;
  try {
    ({ success, remaining } = await limiter.limit(ip));
  } catch {
    console.warn('[proxy] Rate limit check failed, allowing request');
    return NextResponse.next();
  }

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  return response;
}

export const config = {
  matcher: ['/api/scrape', '/api/events/:path*'],
};
