/**
 * HMAC-SHA256 sync token generation & verification.
 * Uses Web Crypto API (works in browser + Next.js edge runtime).
 * Token format: hex64:timestamp (anti-replay with 5-min window).
 */

const SYNC_SECRET = process.env.NEXT_PUBLIC_SYNC_SECRET || 'default-dev-secret';

export const TOKEN_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

async function hmacDigest(message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SYNC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateSyncToken(slug: string): Promise<string> {
  const timestamp = Date.now();
  const message = `${slug}:${timestamp}`;
  const digest = await hmacDigest(message);
  return `${bufferToHex(digest)}:${timestamp}`;
}

export async function verifySyncToken(slug: string, token: string): Promise<boolean> {
  if (!token) return false;

  const separatorIndex = token.lastIndexOf(':');
  if (separatorIndex === -1) return false;

  const hex = token.slice(0, separatorIndex);
  const timestampStr = token.slice(separatorIndex + 1);
  const timestamp = Number(timestampStr);

  if (!Number.isFinite(timestamp)) return false;

  // Anti-replay: reject tokens older than 5 minutes
  if (Date.now() - timestamp > TOKEN_MAX_AGE_MS) return false;

  // Recompute HMAC for the slug:timestamp message
  const message = `${slug}:${timestamp}`;
  const digest = await hmacDigest(message);
  const expected = bufferToHex(digest);

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== hex.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ hex.charCodeAt(i);
  }
  return mismatch === 0;
}
