/** Shared fail-closed integer / id guards for pure domain packets. */

export function assertSafeIntegerInRange(
  value: unknown,
  label: string,
  min: number,
  max: number
): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be a safe integer ${min}–${max}`)
  }
  return value
}

export function assertNonEmptyId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`)
  }
  return value.trim()
}
