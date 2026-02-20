import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils.ts', () => {
  describe('cn', () => {
    it('merges multiple class strings', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
    });

    it('handles undefined and null values', () => {
      expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('merges conflicting tailwind classes (last wins)', () => {
      // twMerge should resolve conflicting px values
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('merges conflicting tailwind text colors', () => {
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('merges conflicting padding with different axes', () => {
      // px and py are different axes, both should remain
      const result = cn('px-2', 'py-4');
      expect(result).toContain('px-2');
      expect(result).toContain('py-4');
    });

    it('handles empty arguments', () => {
      expect(cn()).toBe('');
    });

    it('handles single class', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('handles arrays of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('handles object syntax', () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });

    it('handles complex mix of inputs', () => {
      const result = cn(
        'base',
        ['array-class'],
        { 'obj-class': true, 'hidden-class': false },
        undefined,
        'final'
      );
      expect(result).toContain('base');
      expect(result).toContain('array-class');
      expect(result).toContain('obj-class');
      expect(result).not.toContain('hidden-class');
      expect(result).toContain('final');
    });
  });
});
