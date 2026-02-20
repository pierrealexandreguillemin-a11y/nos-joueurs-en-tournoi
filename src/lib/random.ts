/**
 * Cryptographically-secure random float in [0, 1).
 * Drop-in replacement for Math.random() that satisfies sonarjs/pseudo-random.
 */
const _buf = new Uint32Array(1);
export function secureRandom(): number {
  return crypto.getRandomValues(_buf)[0] / 0x100000000;
}
