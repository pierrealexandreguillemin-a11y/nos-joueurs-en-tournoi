import { describe, it, expect, beforeEach } from 'vitest';
import {
  slugifyClubName,
  getStorageKeyForSlug,
  getClubIdentity,
  setClubIdentity,
  clearClubIdentity,
  migrateLegacyData,
} from './club';

describe('club.ts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('slugifyClubName — QG-1: déterminisme', () => {
    it('même entrée → même slug (idempotent)', () => {
      const slug1 = slugifyClubName('Hay Chess');
      const slug2 = slugifyClubName('Hay Chess');
      expect(slug1).toBe(slug2);
    });

    it('"Hay Chess" → "hay-chess"', () => {
      expect(slugifyClubName('Hay Chess')).toBe('hay-chess');
    });

    it('slug non-vide pour toute entrée non-vide', () => {
      expect(slugifyClubName('a').length).toBeGreaterThan(0);
      expect(slugifyClubName('Club 123').length).toBeGreaterThan(0);
    });
  });

  describe('slugifyClubName — QG-2: résistance aux variantes', () => {
    it('supprime les accents : "Échecs Club Échirolles" → "echecs-club-echirolles"', () => {
      expect(slugifyClubName('Échecs Club Échirolles')).toBe('echecs-club-echirolles');
    });

    it('normalise la casse : "HAY CHESS" et "hay chess" → même slug', () => {
      expect(slugifyClubName('HAY CHESS')).toBe(slugifyClubName('hay chess'));
    });

    it('normalise les espaces multiples : "Hay   Chess" → "hay-chess"', () => {
      expect(slugifyClubName('Hay   Chess')).toBe('hay-chess');
    });

    it('supprime les caractères spéciaux : "Club d\'Échecs (Paris)" → "club-d-echecs-paris"', () => {
      expect(slugifyClubName("Club d'Échecs (Paris)")).toBe('club-d-echecs-paris');
    });

    it('tronque à 40 caractères max', () => {
      const longName = 'A'.repeat(100);
      expect(slugifyClubName(longName).length).toBeLessThanOrEqual(40);
    });

    it('pas de tirets en début/fin : " -Hay Chess- " → "hay-chess"', () => {
      expect(slugifyClubName(' -Hay Chess- ')).toBe('hay-chess');
    });

    it('entrée vide → lance une erreur', () => {
      expect(() => slugifyClubName('')).toThrow();
      expect(() => slugifyClubName('   ')).toThrow();
    });
  });

  describe('slugifyClubName — BVA: limites de longueur', () => {
    it('39 caractères → non tronqué', () => {
      const input = 'a'.repeat(39);
      const slug = slugifyClubName(input);
      expect(slug).toBe('a'.repeat(39));
      expect(slug.length).toBe(39);
    });

    it('40 caractères → longueur exacte 40 (limite)', () => {
      const input = 'a'.repeat(40);
      const slug = slugifyClubName(input);
      expect(slug.length).toBe(40);
    });

    it('41 caractères → tronqué à ≤ 40', () => {
      const input = 'a'.repeat(41);
      const slug = slugifyClubName(input);
      expect(slug.length).toBeLessThanOrEqual(40);
    });
  });

  describe('slugifyClubName — EP: entrées spéciales', () => {
    it('entrée numérique seule "12345" → "12345"', () => {
      expect(slugifyClubName('12345')).toBe('12345');
    });

    it('entrée emoji "♟️ Club" → slug valide sans emoji', () => {
      const slug = slugifyClubName('♟️ Club');
      expect(slug).toBe('club');
      expect(slug.length).toBeGreaterThan(0);
    });

    it('entrée unicode non-latin "клуб" → lance une erreur', () => {
      expect(() => slugifyClubName('клуб')).toThrow();
    });

    it('entrée avec uniquement des caractères spéciaux "!!!" → lance une erreur', () => {
      expect(() => slugifyClubName('!!!')).toThrow();
    });
  });

  describe('getStorageKeyForSlug', () => {
    it('retourne "nos-joueurs-en-tournoi:{slug}"', () => {
      expect(getStorageKeyForSlug('hay-chess')).toBe('nos-joueurs-en-tournoi:hay-chess');
    });
  });

  describe('getClubIdentity / setClubIdentity / clearClubIdentity', () => {
    it('retourne null quand pas d\'identité', () => {
      expect(getClubIdentity()).toBeNull();
    });

    it('setClubIdentity persiste et retourne ClubIdentity correcte', () => {
      const identity = setClubIdentity('Hay Chess');
      expect(identity.clubName).toBe('Hay Chess');
      expect(identity.clubSlug).toBe('hay-chess');
      expect(identity.createdAt).toBeTruthy();

      const retrieved = getClubIdentity();
      expect(retrieved).toEqual(identity);
    });

    it('clearClubIdentity supprime l\'identité', () => {
      setClubIdentity('Hay Chess');
      clearClubIdentity();
      expect(getClubIdentity()).toBeNull();
    });

    it('setClubIdentity crée un slug correct', () => {
      const identity = setClubIdentity('Échecs Club Échirolles');
      expect(identity.clubSlug).toBe('echecs-club-echirolles');
    });
  });

  describe('migration legacy — QG-7', () => {
    it('migrateLegacyData(slug) copie les données de l\'ancienne clé vers la nouvelle', () => {
      const legacyData = JSON.stringify({
        currentEventId: 'event-1',
        events: [{ id: 'event-1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      });
      localStorage.setItem('nos-joueurs-en-tournoi', legacyData);

      migrateLegacyData('hay-chess');

      const newData = localStorage.getItem('nos-joueurs-en-tournoi:hay-chess');
      expect(newData).toBe(legacyData);
    });

    it('l\'ancienne clé reste intacte après migration', () => {
      const legacyData = JSON.stringify({
        currentEventId: 'event-1',
        events: [{ id: 'event-1', name: 'Test', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      });
      localStorage.setItem('nos-joueurs-en-tournoi', legacyData);

      migrateLegacyData('hay-chess');

      expect(localStorage.getItem('nos-joueurs-en-tournoi')).toBe(legacyData);
    });

    it('migration no-op si ancienne clé vide', () => {
      migrateLegacyData('hay-chess');

      expect(localStorage.getItem('nos-joueurs-en-tournoi:hay-chess')).toBeNull();
    });

    it('migration no-op si nouvelle clé déjà peuplée', () => {
      const legacyData = JSON.stringify({
        currentEventId: 'event-1',
        events: [{ id: 'event-1', name: 'Legacy', createdAt: '2024-01-01', tournaments: [] }],
        validations: {},
      });
      const existingData = JSON.stringify({
        currentEventId: 'event-2',
        events: [{ id: 'event-2', name: 'Existing', createdAt: '2024-06-01', tournaments: [] }],
        validations: {},
      });
      localStorage.setItem('nos-joueurs-en-tournoi', legacyData);
      localStorage.setItem('nos-joueurs-en-tournoi:hay-chess', existingData);

      migrateLegacyData('hay-chess');

      // The existing data should NOT be overwritten
      expect(localStorage.getItem('nos-joueurs-en-tournoi:hay-chess')).toBe(existingData);
    });
  });
});
