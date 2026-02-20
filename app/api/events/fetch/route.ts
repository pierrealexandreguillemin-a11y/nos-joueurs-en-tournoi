import { NextRequest, NextResponse } from 'next/server';
import { getStorageData } from '@/lib/kv';

const SLUG_REGEX = /^[a-z0-9-]{1,40}$/;

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
        { status: 400 }
      );
    }

    // Fetch all data from Upstash KV
    const data = await getStorageData(clubSlug);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /fetch] Error fetching from Upstash:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
