import { NextRequest, NextResponse } from 'next/server';
import { saveEvents, saveValidations, saveCurrentEventId } from '@/lib/kv';
import { SLUG_REGEX } from '@/lib/validation';
import type { StorageData } from '@/types';

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
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events)) {
      console.error('[API /sync] Invalid events data');
      return NextResponse.json(
        { error: 'Invalid events data' },
        { status: 400 }
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

    return NextResponse.json(
      {
        success: true,
        synced: events.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /sync] Error syncing to Upstash:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
