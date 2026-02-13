import { NextResponse } from 'next/server';
import { getStorageData } from '@/lib/kv';

/**
 * GET /api/events/fetch
 * Fetch all events from Vercel KV
 */
export async function GET() {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  };

  try {
    console.log('[API /fetch] Fetching data from Upstash KV...');

    // Fetch all data from Upstash KV
    const data = await getStorageData();

    console.log('[API /fetch] ✅ Successfully fetched from Upstash:', {
      eventsCount: data.events.length,
      validationsCount: Object.keys(data.validations).length,
      currentEventId: data.currentEventId || 'none',
    });

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[API /fetch] ❌ Error fetching from Upstash:', error);
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
 * OPTIONS /api/events/fetch
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
