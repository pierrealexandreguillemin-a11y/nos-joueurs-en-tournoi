import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getServerState } from '@/lib/db';
import { verifySyncToken } from '@/lib/hmac';
import { clubSlugSchema } from '@/lib/schemas';

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * GET /api/events/fetch?clubSlug=xxx
 * Pull the club's full server state (events, tombstones, validation cells)
 */
export async function GET(req: NextRequest) {
  try {
    const clubSlugRaw = req.nextUrl.searchParams.get('clubSlug');

    // Validate clubSlug with Zod
    const parsed = clubSlugSchema.safeParse(clubSlugRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid or missing clubSlug. Must match /^[a-z0-9-]{1,40}$/' },
        { status: 400 }
      );
    }

    const clubSlug = parsed.data;

    // Verify HMAC token
    const token = req.headers.get('X-Sync-Token');
    if (!token || !await verifySyncToken(clubSlug, token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all data from the Postgres store
    const data = await getServerState(clubSlug);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiError('/fetch', error);
  }
}
