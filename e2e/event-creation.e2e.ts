/**
 * E2E: Event Creation Flow
 *
 * ISO 25010 §6.1 Functional Suitability — Functional correctness
 * ISO 25010 §6.3 Usability — User error protection
 * ISO 25010 §6.4 Reliability — Fault tolerance (validation errors)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Browser, Page } from 'puppeteer';
import { launchBrowser, newPage, freshVisit, typeInto, waitForText } from './helpers';

const SEL_EVENT_NAME = '#eventName';
const SEL_TOURNAMENT_NAME = '#tournament-name-0';
const SEL_TOURNAMENT_URL = '#tournament-url-0';
const BTN_SUBMIT_TEXT = "l'événement";

/** Complete onboarding — after this, EventForm is already visible */
async function completeOnboarding(page: Page): Promise<void> {
  await freshVisit(page);
  await typeInto(page, '#clubName', 'E2E Club');
  await page.click('button[type="submit"]');
  await waitForText(page, 'nouvel');
}

/** Click a button by its visible text content */
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

describe('E2E: Event Creation — ISO 25010 §6.1', () => {
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
    await completeOnboarding(page);
  });

  it('affiche le formulaire EventForm après l\'onboarding', async () => {
    await waitForText(page, 'nouvel');
    const hasEventName = await page.$(SEL_EVENT_NAME);
    expect(hasEventName).not.toBeNull();
    const hasTournamentName = await page.$(SEL_TOURNAMENT_NAME);
    expect(hasTournamentName).not.toBeNull();
    const hasTournamentUrl = await page.$(SEL_TOURNAMENT_URL);
    expect(hasTournamentUrl).not.toBeNull();
  });

  it('affiche EmptyState après annulation du formulaire', async () => {
    await clickButtonByText(page, 'Annuler');
    await waitForText(page, 'Aucun');

    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('Aucun');
  });

  it('valide : nom d\'événement obligatoire', async () => {
    await typeInto(page, SEL_TOURNAMENT_NAME, 'U12');
    await typeInto(page, SEL_TOURNAMENT_URL, 'https://echecs.asso.fr/Resultats.aspx?URL=test');

    await clickButtonByText(page, BTN_SUBMIT_TEXT);

    const alertExists = await page.waitForSelector('[role="alert"]', { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    expect(alertExists).toBe(true);
  });

  it('crée un événement avec des données valides', async () => {
    await typeInto(page, SEL_EVENT_NAME, 'Championnat E2E');
    await typeInto(page, SEL_TOURNAMENT_NAME, 'U12');
    await typeInto(page, SEL_TOURNAMENT_URL, 'https://echecs.asso.fr/Resultats.aspx?URL=test');

    await clickButtonByText(page, BTN_SUBMIT_TEXT);

    await waitForText(page, 'U12');
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('U12');
  });

  it('persiste l\'événement après rechargement', async () => {
    await typeInto(page, SEL_EVENT_NAME, 'Persist Test');
    await typeInto(page, SEL_TOURNAMENT_NAME, 'Open');
    await typeInto(page, SEL_TOURNAMENT_URL, 'https://echecs.asso.fr/Resultats.aspx?URL=persist');

    await clickButtonByText(page, BTN_SUBMIT_TEXT);
    await waitForText(page, 'Open');

    await page.reload({ waitUntil: 'networkidle0' });

    await waitForText(page, 'Open');
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('Open');
  });
});
