/**
 * HMAC-SHA256 sync token generation & verification.
 * Uses Web Crypto API (works in browser + Next.js edge runtime).
 */

const SYNC_SECRET = process.env.NEXT_PUBLIC_SYNC_SECRET || 'default-dev-secret';

async function hmacDigest(slug: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SYNC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(slug));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateSyncToken(slug: string): Promise<string> {
  const digest = await hmacDigest(slug);
  return bufferToHex(digest);
}

export async function verifySyncToken(slug: string, token: string): Promise<boolean> {
  if (!token) return false;
  const expected = await generateSyncToken(slug);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return mismatch === 0;
}
