import type { PartialResolutionRule } from './models'

/** Saved missions keep their own outcome rule; never infer one from a current template. */
export function normalizePartialResolutionRule(value: unknown): Required<PartialResolutionRule> {
  const stageDelta =
    value !== null && typeof value === 'object' && !Array.isArray(value) && 'stageDelta' in value
      ? value.stageDelta
      : undefined
  return {
    stageDelta:
      typeof stageDelta === 'number' && Number.isSafeInteger(stageDelta) && stageDelta >= 0
        ? stageDelta
        : 0,
  }
}
