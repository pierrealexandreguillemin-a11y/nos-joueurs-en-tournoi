import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSyncToken, verifySyncToken, TOKEN_MAX_AGE_MS } from './hmac';

describe('HMAC sync tokens', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates a hex:timestamp format token', async () => {
    const token = await generateSyncToken('hay-chess');
    expect(token).toMatch(/^[0-9a-f]{64}:\d+$/);
  });

  it('generates deterministic tokens at the same timestamp', async () => {
    const t1 = await generateSyncToken('hay-chess');
    const t2 = await generateSyncToken('hay-chess');
    expect(t1).toBe(t2);
  });

  it('generates different tokens at different times for same slug', async () => {
    const t1 = await generateSyncToken('hay-chess');
    vi.advanceTimersByTime(1000);
    const t2 = await generateSyncToken('hay-chess');
    expect(t1).not.toBe(t2);
  });

  it('generates different tokens for different slugs', async () => {
    const t1 = await generateSyncToken('club-a');
    const t2 = await generateSyncToken('club-b');
    expect(t1).not.toBe(t2);
  });

  it('verifies a valid token', async () => {
    const token = await generateSyncToken('hay-chess');
    const valid = await verifySyncToken('hay-chess', token);
    expect(valid).toBe(true);
  });

  it('valid token within 5-min window', async () => {
    const token = await generateSyncToken('hay-chess');
    vi.advanceTimersByTime(TOKEN_MAX_AGE_MS - 1000); // 4 min
    const valid = await verifySyncToken('hay-chess', token);
    expect(valid).toBe(true);
  });

  it('rejects expired token (after 5 min)', async () => {
    const token = await generateSyncToken('hay-chess');
    vi.advanceTimersByTime(TOKEN_MAX_AGE_MS + 1);
    const valid = await verifySyncToken('hay-chess', token);
    expect(valid).toBe(false);
  });

  it('rejects token with tampered timestamp', async () => {
    const token = await generateSyncToken('hay-chess');
    const [hex] = token.split(':');
    const tampered = `${hex}:${Date.now() - 1000}`;
    const valid = await verifySyncToken('hay-chess', tampered);
    expect(valid).toBe(false);
  });

  it('rejects old format token without timestamp separator', async () => {
    // Simulate an old-format token (just hex, no colon+timestamp)
    const valid = await verifySyncToken('hay-chess', 'a'.repeat(64));
    expect(valid).toBe(false);
  });

  it('rejects an invalid token', async () => {
    const valid = await verifySyncToken('hay-chess', 'bad-token');
    expect(valid).toBe(false);
  });

  it('rejects an empty token', async () => {
    const valid = await verifySyncToken('hay-chess', '');
    expect(valid).toBe(false);
  });

  it('rejects a token from a different slug', async () => {
    const token = await generateSyncToken('club-a');
    const valid = await verifySyncToken('club-b', token);
    expect(valid).toBe(false);
  });

  it('returns empty string from generateSyncToken when crypto.subtle is unavailable', async () => {
    const original = globalThis.crypto;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      const token = await generateSyncToken('hay-chess');
      expect(token).toBe('');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('crypto.subtle is not available'));
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
      warnSpy.mockRestore();
    }
  });

  it('returns false from verifySyncToken when crypto.subtle is unavailable', async () => {
    const original = globalThis.crypto;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    try {
      const valid = await verifySyncToken('hay-chess', 'some-token:123');
      expect(valid).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('crypto.subtle is not available'));
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
      warnSpy.mockRestore();
    }
  });
});
