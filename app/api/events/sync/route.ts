import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { applySync, getServerState } from '@/lib/db';
import { verifySyncToken } from '@/lib/hmac';
import { syncBodySchema } from '@/lib/schemas';

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * POST /api/events/sync
 * Push what changed on a phone, answer with the club's full server state (push + pull in one request)
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

    const { clubSlug, events, deletedEventIds, cells } = parsed.data;

    // Verify HMAC token
    const token = req.headers.get('X-Sync-Token');
    if (!token || !await verifySyncToken(clubSlug, token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await applySync(clubSlug, { events, deletedEventIds, cells });
    const data = await getServerState(clubSlug);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return apiError('/sync', error);
  }
}
