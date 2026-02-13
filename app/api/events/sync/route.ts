import { NextRequest, NextResponse } from 'next/server';
import { saveEvents, saveValidations, saveCurrentEventId } from '@/lib/kv';
import type { StorageData } from '@/types';

/**
 * POST /api/events/sync
 * Sync events from client to Vercel KV
 */
export async function POST(req: NextRequest) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  };

  try {
    const body = await req.json();
    const { events, validations, currentEventId } = body as Partial<StorageData>;

    console.log('[API /sync] Received sync request:', {
      eventsCount: events?.length || 0,
      validationsCount: validations ? Object.keys(validations).length : 0,
      currentEventId: currentEventId || 'none',
    });

    if (!events || !Array.isArray(events)) {
      console.error('[API /sync] Invalid events data');
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400, headers }
      );
    }

    // Save all data to Upstash KV in parallel
    await Promise.all([
      saveEvents(events),
      validations && Object.keys(validations).length > 0
        ? saveValidations(validations)
        : Promise.resolve(),
      currentEventId ? saveCurrentEventId(currentEventId) : Promise.resolve(),
    ]);

    console.log('[API /sync] ✅ Successfully synced to Upstash KV:', events.length, 'events');

    return NextResponse.json(
      {
        success: true,
        synced: events.length,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[API /sync] ❌ Error syncing to Upstash:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers }
    );
  }
}

/**
 * OPTIONS /api/events/sync
 * CORS preflight
 */
export async function OPTIONS() {
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  };

  return new NextResponse(null, { status: 200, headers });
}
