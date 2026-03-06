import { NextResponse } from 'next/server';

/**
 * Safe API error response — logs full error server-side, returns generic message to client.
 * Prevents leaking internal error details (stack traces, DB messages, etc.) per OWASP A05.
 */
export function apiError(label: string, error: unknown): NextResponse {
  console.error(`[API ${label}]`, error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 },
  );
}
