/**
 * Maps cumulative weekly score to agency clearance level from configured thresholds.
 * Level starts at 1; each met threshold (score >= threshold) adds one level.
 */
export function computeClearanceLevel(cumulativeScore: number, thresholds: number[]): number {
  const sortedThresholds = [...thresholds].sort((a, b) => a - b)

  if (sortedThresholds.length === 0) {
    return 1
  }

  let level = 1

  for (const threshold of sortedThresholds) {
    if (cumulativeScore >= threshold) {
      level += 1
      continue
    }

    break
  }

  return level
}

/** Hydration 572: clearance level cannot exceed the ladder implied by configured thresholds. */
export function resolveMaxClearanceLevel(thresholds: readonly number[]): number {
  return thresholds.length === 0 ? 1 : thresholds.length + 1
}
