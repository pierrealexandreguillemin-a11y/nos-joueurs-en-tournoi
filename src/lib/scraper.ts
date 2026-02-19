/**
 * FFE Scraper — client-side fetch wrapper for /api/scrape
 *
 * Centralizes:
 * - POST to /api/scrape with URL
 * - HTTP error classification (404, 500, other)
 * - HTML extraction from response
 */

const SCRAPE_ENDPOINT = '/api/scrape';
const SCRAPE_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Throw a classified scrape error based on HTTP status
 */
export function throwScrapeError(status: number, context: string): never {
  if (status === 404) {
    throw new Error('Tournoi introuvable sur le site FFE');
  } else if (status === 500) {
    throw new Error('Le serveur FFE rencontre des problèmes');
  } else {
    throw new Error(`Erreur lors du chargement ${context} (${status})`);
  }
}

/**
 * Scrape a single FFE URL via the /api/scrape proxy
 * @returns The raw HTML string
 */
export async function scrapeFFE(url: string, context: string = 'des données FFE'): Promise<string> {
  const response = await fetch(SCRAPE_ENDPOINT, {
    method: 'POST',
    headers: SCRAPE_HEADERS,
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throwScrapeError(response.status, context);
  }

  const data = await response.json();
  return data.html;
}

/**
 * Scrape two FFE URLs in parallel (list + results)
 * @returns Tuple of [listHtml, resultsHtml]
 */
export async function scrapeFFEPair(
  listUrl: string,
  resultsUrl: string,
): Promise<[string, string]> {
  const [resList, resResults] = await Promise.all([
    fetch(SCRAPE_ENDPOINT, {
      method: 'POST',
      headers: SCRAPE_HEADERS,
      body: JSON.stringify({ url: listUrl }),
    }),
    fetch(SCRAPE_ENDPOINT, {
      method: 'POST',
      headers: SCRAPE_HEADERS,
      body: JSON.stringify({ url: resultsUrl }),
    }),
  ]);

  if (!resList.ok || !resResults.ok) {
    const status = !resList.ok ? resList.status : resResults.status;
    throwScrapeError(status, 'des résultats FFE');
  }

  const [dataList, dataResults] = await Promise.all([
    resList.json(),
    resResults.json(),
  ]);

  return [dataList.html, dataResults.html];
}
