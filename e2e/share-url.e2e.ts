/**
 * E2E: Share URL Import Flow
 *
 * ISO 25010 §6.1 Functional Suitability — Functional completeness
 * Tests the ?share= URL parameter that imports a shared event.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser, Page } from 'puppeteer';
import { compressToEncodedURIComponent } from 'lz-string';
import { launchBrowser, newPage, freshVisit, typeInto, waitForText, BASE_URL } from './helpers';

/** Build a compressed share parameter for a test event */
function buildShareParam(): string {
  const exportedData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    event: {
      id: 'shared-evt-1',
      name: 'Championnat Partagé',
      createdAt: '2024-06-15T10:00:00.000Z',
      tournaments: [
        {
          id: 'shared-trn-1',
          name: 'Open A',
          url: 'https://echecs.asso.fr/Resultats.aspx?URL=shared',
          lastUpdate: '2024-06-15T12:00:00.000Z',
          players: [],
        },
      ],
    },
    validations: {},
  };
  return compressToEncodedURIComponent(JSON.stringify(exportedData));
}

/** Complete onboarding to establish club identity */
async function completeOnboarding(page: Page): Promise<void> {
  await freshVisit(page);
  await typeInto(page, '#clubName', 'Share Test Club');
  await page.click('button[type="submit"]');
  await waitForText(page, 'nouvel');
}

describe('E2E: Share URL Import — ISO 25010 §6.1', () => {
  let browser: Browser;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('importe un événement partagé via ?share= URL', async () => {
    const page = await newPage(browser);

    // 1. Complete onboarding to establish identity
    await completeOnboarding(page);

    // 2. Navigate to the share URL
    const shareParam = buildShareParam();
    await page.goto(`${BASE_URL}/?share=${shareParam}`, { waitUntil: 'networkidle0' });

    // 3. The shared event should be imported and displayed
    // Wait for the tournament tab name from the shared event
    await waitForText(page, 'Open A');

    // 4. Verify the imported event is active (empty players → "Aucune donnée")
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('Aucune donnée');
  });

  it('affiche une erreur pour un lien de partage invalide', async () => {
    const page = await newPage(browser);

    // 1. Complete onboarding first
    await completeOnboarding(page);

    // 2. Navigate with invalid share parameter
    await page.goto(`${BASE_URL}/?share=invalid-garbage-data`, { waitUntil: 'networkidle0' });

    // 3. Wait for the page to process the invalid share param
    await waitForText(page, 'NOS JOUEURS EN TOURNOI');

    // 4. Verify graceful degradation: no crash, no spurious import
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('NOS JOUEURS EN TOURNOI');
    // EventForm visible = no event was imported from invalid data
    expect(pageText).toContain('nouvel événement');

    // 5. Share param cleaned from URL
    const url = page.url();
    expect(url).not.toContain('share=');
  });
});
