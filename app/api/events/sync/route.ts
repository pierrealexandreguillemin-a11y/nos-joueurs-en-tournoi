import { NextRequest, NextResponse } from 'next/server';
import { saveEvents, saveValidations, saveCurrentEventId } from '@/lib/kv';
import type { StorageData } from '@/types';

const SLUG_REGEX = /^[a-z0-9-]{1,40}$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
};

/**
 * POST /api/events/sync
 * Sync events from client to Vercel KV
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clubSlug, events, validations, currentEventId } = body as Partial<StorageData> & { clubSlug?: string };

    // Validate clubSlug
    if (!clubSlug || !SLUG_REGEX.test(clubSlug)) {
      return NextResponse.json(
        { error: 'Invalid or missing clubSlug. Must match /^[a-z0-9-]{1,40}$/' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    console.log('[API /sync] Received sync request:', {
      clubSlug,
      eventsCount: events?.length || 0,
      validationsCount: validations ? Object.keys(validations).length : 0,
      currentEventId: currentEventId || 'none',
    });

    if (!events || !Array.isArray(events)) {
      console.error('[API /sync] Invalid events data');
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Save all data to Upstash KV in parallel
    await Promise.all([
      saveEvents(events, clubSlug),
      validations && Object.keys(validations).length > 0
        ? saveValidations(validations, clubSlug)
        : Promise.resolve(),
      currentEventId ? saveCurrentEventId(currentEventId, clubSlug) : Promise.resolve(),
    ]);

    console.log('[API /sync] Successfully synced to Upstash KV:', events.length, 'events for club', clubSlug);

    return NextResponse.json(
      {
        success: true,
        synced: events.length,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error('[API /sync] Error syncing to Upstash:', error);
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
 * OPTIONS /api/events/sync
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
