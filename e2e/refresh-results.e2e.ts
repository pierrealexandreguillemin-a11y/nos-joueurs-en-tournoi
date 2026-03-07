/**
 * E2E: Refresh Results Flow (with mocked FFE responses)
 *
 * ISO 25010 §6.1 Functional Suitability — Functional completeness
 * ISO 25010 §6.4 Reliability — Fault tolerance
 *
 * Uses Puppeteer request interception to mock /api/scrape responses
 * with realistic FFE HTML, testing the full 2-phase refresh flow:
 *   Phase 1: Stats page → club detection
 *   Phase 2: Ls + Ga pages → player results display
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Browser, Page, HTTPRequest } from 'puppeteer';
import { launchBrowser, newPage, freshVisit, typeInto, waitForText } from './helpers';

// ── Mock HTML fixtures (matching real FFE structure) ──────────────────────────

const STATS_HTML = `
<html><body>
<table>
  <tr class="papi_liste_t"><td>Répartition par clubs</td></tr>
  <tr class="papi_liste_t"><td>3 clubs représentés</td></tr>
  <tr><td class="papi_liste_c">E2E Club</td><td class="papi_liste_c">2</td></tr>
  <tr><td class="papi_liste_c">Other Club</td><td class="papi_liste_c">1</td></tr>
  <tr><td class="papi_liste_c">Third Club</td><td class="papi_liste_c">1</td></tr>
</table>
</body></html>`;

const LIST_HTML = `
<html><body>
<table>
  <tr><td>1</td><td>&nbsp;</td><td>MARTIN Alice</td><td>1450</td><td></td><td></td><td></td><td>E2E Club</td></tr>
  <tr><td>2</td><td>&nbsp;</td><td>DURAND Bob</td><td>1320</td><td></td><td></td><td></td><td>E2E Club</td></tr>
  <tr><td>3</td><td>&nbsp;</td><td>MOREAU Claire</td><td>1600</td><td></td><td></td><td></td><td>Other Club</td></tr>
  <tr><td>4</td><td>&nbsp;</td><td>PETIT David</td><td>1500</td><td></td><td></td><td></td><td>Third Club</td></tr>
</table>
</body></html>`;

function makeCells(cells: string[]): string {
  return cells.map(c => '<td>' + c + '</td>').join('');
}

function makePlayerBox(name: string, ranking: number, elo: string, points: string, rounds: string[][]) {
  const roundRows = rounds.map(r => '<tr>' + makeCells(r) + '</tr>').join('');
  return `
    <tr><td>
      <div class="papi_joueur_box">
        <b>${name}</b>
        <table>
          <tr><td></td><td>${ranking}</td><td></td><td></td><td>${elo}</td><td></td><td></td><td></td><td>${points}</td><td>10</td><td>20</td></tr>
          ${roundRows}
        </table>
      </div>
    </td><td>1500</td></tr>`;
}

const RESULTS_HTML = `
<html><body>
<table>
  ${makePlayerBox('MARTIN ALICE', 1, '1450', '1.5', [
    ['1', '', '1', '', '', 'MOREAU CLAIRE', '', '', '', '', '', '', ''],
    ['2', '', '½', '', '', 'PETIT DAVID', '', '', '', '', '', '', ''],
  ])}
  ${makePlayerBox('DURAND BOB', 2, '1320', '1', [
    ['1', '', '0', '', '', 'PETIT DAVID', '', '', '', '', '', '', ''],
    ['2', '', '1', '', '', 'MOREAU CLAIRE', '', '', '', '', '', '', ''],
  ])}
  ${makePlayerBox('MOREAU CLAIRE', 3, '1600', '1', [
    ['1', '', '0', '', '', 'MARTIN ALICE', '', '', '', '', '', '', ''],
    ['2', '', '1', '', '', 'DURAND BOB', '', '', '', '', '', '', ''],
  ])}
  ${makePlayerBox('PETIT DAVID', 4, '1500', '0.5', [
    ['1', '', '1', '', '', 'DURAND BOB', '', '', '', '', '', '', ''],
    ['2', '', '½', '', '', 'MARTIN ALICE', '', '', '', '', '', '', ''],
  ])}
</table>
</body></html>`;

// ── Request interception ─────────────────────────────────────────────────────

/** Determine which mock HTML to return based on the URL being scraped */
function getMockResponse(scrapedUrl: string): string {
  if (scrapedUrl.includes('Action=Stats')) return STATS_HTML;
  if (scrapedUrl.includes('Action=Ls')) return LIST_HTML;
  return RESULTS_HTML; // Action=Ga or other
}

async function setupScrapeInterception(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    const url = req.url();
    if (req.method() === 'POST' && url.includes('/api/scrape')) {
      const postData = req.postData();
      const scrapedUrl = postData ? JSON.parse(postData).url ?? '' : '';
      const html = getMockResponse(scrapedUrl);
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, html, url: scrapedUrl }),
      });
    } else {
      req.continue();
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const FFE_URL = 'https://echecs.asso.fr/Resultats.aspx?URL=Tournois/Id/999/999&Action=Ga';

async function clickButtonByText(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent?.includes(t)) {
        btn.click();
        return;
      }
    }
  }, text);
}

async function setupWithEvent(page: Page): Promise<void> {
  await freshVisit(page);
  await typeInto(page, '#clubName', 'E2E Club');
  await page.click('button[type="submit"]');
  await waitForText(page, 'nouvel');

  // Create event
  await typeInto(page, '#eventName', 'Tournoi E2E');
  await typeInto(page, '#tournament-name-0', 'Open');
  await typeInto(page, '#tournament-url-0', FFE_URL);
  await clickButtonByText(page, "l'événement");
  await waitForText(page, 'Open');
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('E2E: Refresh Results — ISO 25010 §6.1', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await newPage(browser);
    await setupScrapeInterception(page);
    await setupWithEvent(page);
  });

  it('Phase 1 : détecte les clubs après Actualiser', async () => {
    await clickButtonByText(page, 'Actualiser');

    // Wait for club dropdown to appear with detected clubs
    await waitForText(page, 'E2E Club');
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('E2E Club');
  });

  it('Phase 2 : affiche les résultats filtrés après sélection du club', async () => {
    await clickButtonByText(page, 'Actualiser');
    await waitForText(page, 'Choisissez votre club');

    // Select club from native <select>
    await page.select('#club-select', 'E2E Club');
    await clickButtonByText(page, 'Valider');

    // Wait for filtered results
    await waitForText(page, 'MARTIN', 10_000);
    const pageText = await page.evaluate(() => document.body.innerText);

    // Our club players should appear
    expect(pageText).toContain('MARTIN');
    expect(pageText).toContain('DURAND');
  });

  it('affiche les points des joueurs du club', async () => {
    await clickButtonByText(page, 'Actualiser');
    await waitForText(page, 'Choisissez votre club');

    await page.select('#club-select', 'E2E Club');
    await clickButtonByText(page, 'Valider');

    await waitForText(page, 'MARTIN', 10_000);
    const pageText = await page.evaluate(() => document.body.innerText);

    // Points should be displayed
    expect(pageText).toContain('1.5');
  });
});
