export const clamp = (n: number, min: number, max: number) => {
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)

  return Math.max(lower, Math.min(upper, n))
}

export function dot(a: Record<string, number>, b: Record<string, number>) {
  let sum = 0
  for (const k of Object.keys(a)) sum += (a[k] ?? 0) * (b[k] ?? 0)
  return sum
}

export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
export function normalizeSeed(seed: number) {
  if (!Number.isFinite(seed)) {
    return 1
  }

  return Math.abs(Math.trunc(seed)) >>> 0 || 1
}

const RNG_MULTIPLIER = 1664525
const RNG_INCREMENT = 1013904223
const RNG_MODULUS = 2 ** 32

export function nextSeed(seed: number) {
  return (Math.imul(normalizeSeed(seed), RNG_MULTIPLIER) + RNG_INCREMENT) >>> 0
}

export function createSeededRng(seed: number) {
  let state = normalizeSeed(seed)

  return {
    next: () => {
      state = nextSeed(state)
      return state / RNG_MODULUS
    },
    getState: () => state,
  }
}

export function randInt(rng: () => number, min: number, max: number) {
  const lower = Math.min(min, max)
  const upper = Math.max(min, max)

  return Math.floor(rng() * (upper - lower + 1)) + lower
}

/** Compatibility helper for existing sim code. */
export const roll = (
  probability: number,
  rng: () => number
): boolean => {
  const normalizedProbability = Number.isFinite(probability) ? clamp(probability, 0, 1) : 0

  return rng() < normalizedProbability
}
