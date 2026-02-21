/**
 * E2E Helpers — Puppeteer utilities for all E2E tests
 */
import puppeteer, { type Browser, type Page } from 'puppeteer';

export const PORT = 3099;
export const BASE_URL = `http://localhost:${PORT}`;

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
}

export async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  return page;
}

export async function goto(page: Page, path = '/'): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle0' });
}

export async function clearAppState(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

/** Navigate to the app with a clean localStorage (new user) */
export async function freshVisit(page: Page): Promise<void> {
  await goto(page);
  await clearAppState(page);
  await page.reload({ waitUntil: 'networkidle0' });
}

/** Type into an input identified by CSS selector, clearing it first */
export async function typeInto(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector);
  await page.click(selector, { count: 3 }); // select all
  await page.type(selector, text);
}

/** Get visible text content of an element */
export async function textOf(page: Page, selector: string): Promise<string> {
  await page.waitForSelector(selector);
  return page.$eval(selector, (el) => el.textContent?.trim() ?? '');
}

/** Check if element exists in the page */
export async function exists(page: Page, selector: string): Promise<boolean> {
  return (await page.$(selector)) !== null;
}

/** Wait for text to appear anywhere in the page body */
export async function waitForText(page: Page, text: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    (t: string) => document.body.innerText.includes(t),
    { timeout },
    text,
  );
}
