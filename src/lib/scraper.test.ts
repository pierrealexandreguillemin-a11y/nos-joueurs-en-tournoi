import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throwScrapeError, scrapeFFE, scrapeFFEPair } from './scraper';

describe('scraper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('throwScrapeError', () => {
    it('404 → "Tournoi introuvable"', () => {
      expect(() => throwScrapeError(404, 'test')).toThrow('Tournoi introuvable sur le site FFE');
    });

    it('500 → "serveur FFE"', () => {
      expect(() => throwScrapeError(500, 'test')).toThrow('Le serveur FFE rencontre des problèmes');
    });

    it('403 → message générique avec status', () => {
      expect(() => throwScrapeError(403, 'des données')).toThrow('Erreur lors du chargement des données (403)');
    });
  });

  describe('scrapeFFE', () => {
    it('lance throwScrapeError quand !response.ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }));

      await expect(scrapeFFE('https://ffe.test/tournoi')).rejects.toThrow('Tournoi introuvable');
    });

    it('retourne le HTML quand response.ok', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ html: '<html>OK</html>' }),
      }));

      const result = await scrapeFFE('https://ffe.test/tournoi');
      expect(result).toBe('<html>OK</html>');
    });
  });

  describe('scrapeFFEPair', () => {
    it('lance throwScrapeError quand seul le 2e fetch échoue', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ html: '<list>' }) })
        .mockResolvedValueOnce({ ok: false, status: 500 }),
      );

      await expect(scrapeFFEPair('https://ffe.test/list', 'https://ffe.test/results')).rejects.toThrow(
        'Le serveur FFE rencontre des problèmes',
      );
    });

    it('lance throwScrapeError quand seul le 1er fetch échoue (branche ternaire resList.status)', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ html: '<results>' }) }),
      );

      await expect(scrapeFFEPair('https://ffe.test/list', 'https://ffe.test/results')).rejects.toThrow(
        'Tournoi introuvable sur le site FFE',
      );
    });

    it('retourne les deux HTML quand les deux réponses sont ok', async () => {
      vi.stubGlobal('fetch', vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ html: '<list>' }) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ html: '<results>' }) }),
      );

      const [listHtml, resultsHtml] = await scrapeFFEPair('https://ffe.test/list', 'https://ffe.test/results');
      expect(listHtml).toBe('<list>');
      expect(resultsHtml).toBe('<results>');
    });
  });
});
