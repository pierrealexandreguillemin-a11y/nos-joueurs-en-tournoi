/**
 * E2E: Lighthouse Performance & Accessibility Audit
 *
 * ISO 25010 §6.2 Performance Efficiency — Time behaviour
 * ISO 25010 §6.3 Usability — Accessibility
 *
 * Runs Lighthouse against the deployed app and verifies minimum scores.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { BASE_URL } from './helpers';

const THRESHOLDS = {
  accessibility: 80,
  'best-practices': 80,
  seo: 85,
  // Performance threshold kept low — Vercel cold starts + FFE scraping latency
  performance: 40,
};

describe('E2E: Lighthouse Audit — ISO 25010 §6.2/§6.3', () => {
  let chrome: chromeLauncher.LaunchedChrome;

  beforeAll(async () => {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });
  });

  afterAll(async () => {
    try {
      await chrome.kill();
    } catch {
      // Windows EPERM on temp dir cleanup — safe to ignore
    }
  });

  it('meets minimum Lighthouse scores', async () => {
    const result = await lighthouse(BASE_URL, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: Object.keys(THRESHOLDS),
    });

    expect(result).toBeDefined();
    const { categories } = result!.lhr;

    const scores: Record<string, number> = {};
    for (const [key, threshold] of Object.entries(THRESHOLDS)) {
      const score = Math.round((categories[key]?.score ?? 0) * 100);
      scores[key] = score;
      expect(score, `${key}: ${score} < ${threshold}`).toBeGreaterThanOrEqual(threshold);
    }

    // Log scores for visibility
    console.warn('Lighthouse scores:', scores);
  });
});
