import { describe, it, expect } from 'vitest';
import { generateSyncToken, verifySyncToken } from './hmac';

describe('HMAC sync tokens', () => {
  it('generates a hex string token', async () => {
    const token = await generateSyncToken('hay-chess');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates deterministic tokens for the same slug', async () => {
    const t1 = await generateSyncToken('hay-chess');
    const t2 = await generateSyncToken('hay-chess');
    expect(t1).toBe(t2);
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
});
