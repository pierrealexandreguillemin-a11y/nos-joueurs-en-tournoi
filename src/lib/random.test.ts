import { describe, it, expect } from 'vitest';
import { secureRandom } from './random';

describe('random.ts', () => {
  describe('secureRandom', () => {
    it('returns a number', () => {
      const result = secureRandom();
      expect(typeof result).toBe('number');
    });

    it('returns a value >= 0', () => {
      for (let i = 0; i < 100; i++) {
        expect(secureRandom()).toBeGreaterThanOrEqual(0);
      }
    });

    it('returns a value < 1', () => {
      for (let i = 0; i < 100; i++) {
        expect(secureRandom()).toBeLessThan(1);
      }
    });

    it('never returns a negative value', () => {
      for (let i = 0; i < 100; i++) {
        expect(secureRandom()).not.toBeLessThan(0);
      }
    });

    it('never returns exactly 1', () => {
      for (let i = 0; i < 100; i++) {
        expect(secureRandom()).not.toBe(1);
      }
    });

    it('returns different values on successive calls (statistical test)', () => {
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        values.add(secureRandom());
      }
      // It is statistically near-impossible for 100 cryptographic random values to all be the same
      expect(values.size).toBeGreaterThan(1);
      // In practice, they should all be unique (collisions in 2^32 space are extremely unlikely with 100 draws)
      expect(values.size).toBe(100);
    });

    it('produces values distributed across [0, 1)', () => {
      // Generate many values and check they are spread across the range
      const values: number[] = [];
      for (let i = 0; i < 1000; i++) {
        values.push(secureRandom());
      }

      const hasLow = values.some(v => v < 0.25);
      const hasMidLow = values.some(v => v >= 0.25 && v < 0.5);
      const hasMidHigh = values.some(v => v >= 0.5 && v < 0.75);
      const hasHigh = values.some(v => v >= 0.75);

      expect(hasLow).toBe(true);
      expect(hasMidLow).toBe(true);
      expect(hasMidHigh).toBe(true);
      expect(hasHigh).toBe(true);
    });
  });
});
