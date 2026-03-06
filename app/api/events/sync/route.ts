import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { saveEvents, saveValidations, saveCurrentEventId } from '@/lib/kv';
import { verifySyncToken } from '@/lib/hmac';
import { syncBodySchema } from '@/lib/schemas';
import type { ValidationState } from '@/types';

/**
 * POST /api/events/sync
 * Sync events from client to Vercel KV
 */
const MAX_BODY_SIZE = 1_048_576; // 1 MB

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large. Maximum size is 1MB.' },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate body structure with Zod
    const parsed = syncBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { clubSlug, events, currentEventId } = parsed.data;
    const validations = parsed.data.validations as ValidationState;

    // Verify HMAC token
    const token = req.headers.get('X-Sync-Token');
    if (!token || !await verifySyncToken(clubSlug, token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return apiError('/sync', error);
  }
}
