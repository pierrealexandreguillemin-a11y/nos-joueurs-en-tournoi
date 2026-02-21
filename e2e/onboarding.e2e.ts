/**
 * E2E: Club Onboarding Flow
 *
 * ISO 25010 §6.1 Functional Suitability — Functional completeness
 * ISO 25010 §6.3 Usability — User error protection
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Browser, Page } from 'puppeteer';
import { launchBrowser, newPage, freshVisit, typeInto, waitForText, exists } from './helpers';

const SEL_CLUB_NAME = '#clubName';
const SEL_SUBMIT_BTN = 'button[type="submit"]';

describe('E2E: Club Onboarding — ISO 25010 §6.1', () => {
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
    await freshVisit(page);
  });

  it('affiche l\'écran d\'onboarding pour un nouveau visiteur', async () => {
    await page.waitForSelector(SEL_CLUB_NAME);

    const title = await page.$eval('h1', (el) => el.textContent);
    expect(title).toContain('NOS JOUEURS EN TOURNOI');

    await waitForText(page, 'Identifiez votre club');
    expect(await exists(page, SEL_SUBMIT_BTN)).toBe(true);
  });

  it('le bouton Commencer est désactivé avec un champ vide', async () => {
    await page.waitForSelector(SEL_CLUB_NAME);

    const disabled = await page.$eval(SEL_SUBMIT_BTN, (el) =>
      (el as HTMLButtonElement).disabled,
    );
    expect(disabled).toBe(true);
  });

  it('affiche le slug preview en temps réel', async () => {
    await typeInto(page, SEL_CLUB_NAME, 'Hay Chess');

    await waitForText(page, 'hay-chess');
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('hay-chess');
  });

  it('enregistre le club et redirige vers la page principale', async () => {
    await typeInto(page, SEL_CLUB_NAME, 'Hay Chess');
    await page.click(SEL_SUBMIT_BTN);

    await waitForText(page, 'nouvel');
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).toContain('nouvel');
  });

  it('persiste le club après rechargement de page', async () => {
    await typeInto(page, SEL_CLUB_NAME, 'Hay Chess');
    await page.click(SEL_SUBMIT_BTN);
    await waitForText(page, 'nouvel');

    await page.reload({ waitUntil: 'networkidle0' });

    await waitForText(page, 'NOS JOUEURS EN TOURNOI');
    const hasOnboarding = await page.evaluate(() => {
      const label = document.querySelector('label[for="clubName"]');
      return label?.textContent?.includes('Nom de votre club') ?? false;
    });
    expect(hasOnboarding).toBe(false);
  });
});
