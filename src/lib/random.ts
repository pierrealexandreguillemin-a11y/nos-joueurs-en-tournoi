/**
 * Cryptographically-secure random float in [0, 1).
 * Drop-in replacement for Math.random() that satisfies sonarjs/pseudo-random.
 */
export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 0x100000000;
}
