import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.KV_REST_API_URL.trim(),
        token: process.env.KV_REST_API_TOKEN.trim(),
      }),
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'nos-joueurs:ratelimit',
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
  if (!ratelimit) return NextResponse.next();

  const ip = getClientIP(req);
  const { success, remaining } = await ratelimit.limit(ip);

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
