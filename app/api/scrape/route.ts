import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { scrapeBodySchema } from '@/lib/schemas';

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * POST /api/scrape
 * Scrape a web page and return its HTML content
 * Used for FFE tournament data scraping
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate body with Zod schema
    const parsed = scrapeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: URL must be a valid URL (max 2048 chars)' },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    // Validate protocol (SSRF prevention)
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    // Validate hostname (SSRF prevention — strict whitelist)
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname !== 'echecs.asso.fr' && hostname !== 'www.echecs.asso.fr') {
      return NextResponse.json(
        { error: 'Only FFE URLs are allowed' },
        { status: 403 }
      );
    }

    // Fetch the page HTML from server-side
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`FFE server returned ${response.status}`);
    }

    // Validate response content-type and size
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
      throw new Error('FFE returned non-HTML content');
    }

    const html = await response.text();

    if (html.length > 5_000_000) {
      throw new Error('FFE response too large (> 5 MB)');
    }

    // Check if HTML is empty or invalid
    if (!html || html.length < 100) {
      throw new Error('Invalid or empty HTML response from FFE');
    }

    return NextResponse.json(
      { success: true, html },
      { status: 200 }
    );
  } catch (error) {
    return apiError('/scrape', error);
  }
}
