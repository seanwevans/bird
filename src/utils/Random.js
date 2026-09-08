/**
 * Deterministic pseudo random numbers.
 *
 * The simulator is meant to replay identically from a given initial state and
 * input sequence, so scenery that differs on every load would break that
 * promise. `createSeededRandom` is a drop-in replacement for `Math.random`
 * that always produces the same stream for a given seed.
 */

/** mulberry32: small, fast, and good enough for scenery placement. */
export function createSeededRandom(seed = 1) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
