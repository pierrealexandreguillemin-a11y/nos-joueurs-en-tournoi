import { NextRequest, NextResponse } from 'next/server';
import { getStorageData } from '@/lib/kv';

const SLUG_REGEX = /^[a-z0-9-]{1,40}$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};

/**
 * GET /api/events/fetch?clubSlug=xxx
 * Fetch all events from Vercel KV for a specific club
 */
export async function GET(req: NextRequest) {
  try {
    const clubSlug = req.nextUrl.searchParams.get('clubSlug');

    // Validate clubSlug
    if (!clubSlug || !SLUG_REGEX.test(clubSlug)) {
      return NextResponse.json(
        { error: 'Invalid or missing clubSlug. Must match /^[a-z0-9-]{1,40}$/' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    console.log('[API /fetch] Fetching data from Upstash KV for club:', clubSlug);

    // Fetch all data from Upstash KV
    const data = await getStorageData(clubSlug);

    console.log('[API /fetch] Successfully fetched from Upstash:', {
      clubSlug,
      eventsCount: data.events.length,
      validationsCount: Object.keys(data.validations).length,
      currentEventId: data.currentEventId || 'none',
    });

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[API /fetch] Error fetching from Upstash:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * OPTIONS /api/events/fetch
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
