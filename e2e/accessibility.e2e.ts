/**
 * E2E: Accessibility — WCAG 2.1 AA
 *
 * ISO 25010 §6.3.6 Accessibility
 * Uses @axe-core/puppeteer (already in devDependencies)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Browser, Page } from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { launchBrowser, newPage, freshVisit, typeInto, waitForText } from './helpers';

/** Format axe violations for readable test output */
function formatViolations(violations: Awaited<ReturnType<AxePuppeteer['analyze']>>['violations']) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
  }));
}

describe('E2E: Accessibility WCAG 2.1 AA — ISO 25010 §6.3.6', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await launchBrowser();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('onboarding page — aucune violation WCAG 2.1 AA', async () => {
    page = await newPage(browser);
    await freshVisit(page);
    await page.waitForSelector('#clubName');

    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(formatViolations(results.violations)).toEqual([]);
  });

  it('page principale avec EventForm — aucune violation WCAG 2.1 AA', async () => {
    page = await newPage(browser);
    await freshVisit(page);
    await typeInto(page, '#clubName', 'A11y Club');
    await page.click('button[type="submit"]');
    // Après onboarding → EventForm visible
    await waitForText(page, 'nouvel');

    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(formatViolations(results.violations)).toEqual([]);
  });

  it('page principale avec événement créé — aucune violation WCAG 2.1 AA', async () => {
    page = await newPage(browser);
    await freshVisit(page);
    await typeInto(page, '#clubName', 'A11y Club');
    await page.click('button[type="submit"]');
    await waitForText(page, 'nouvel');

    // Créer un événement
    await typeInto(page, '#eventName', 'A11y Event');
    await typeInto(page, '#tournament-name-0', 'U12');
    await typeInto(page, '#tournament-url-0', 'https://echecs.asso.fr/Resultats.aspx?URL=a11y');

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.includes("l'événement")) {
          btn.click();
          return;
        }
      }
    });
    await waitForText(page, 'U12');

    const results = await new AxePuppeteer(page)
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(formatViolations(results.violations)).toEqual([]);
  });
});
