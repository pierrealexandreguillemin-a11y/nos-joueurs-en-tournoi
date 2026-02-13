import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/scrape
 * Scrape a web page and return its HTML content
 * Used for FFE tournament data scraping
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
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400, headers }
      );
    }

    // Validate that the URL is from FFE
    if (!url.includes('echecs.asso.fr')) {
      return NextResponse.json(
        { error: 'Only FFE URLs are allowed' },
        { status: 403, headers }
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

    const html = await response.text();

    // Check if HTML is empty or invalid
    if (!html || html.length < 100) {
      throw new Error('Invalid or empty HTML response from FFE');
    }

    return NextResponse.json(
      {
        success: true,
        html,
        url,
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      {
        error: 'Scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers }
    );
  }
}

/**
 * OPTIONS /api/scrape
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
