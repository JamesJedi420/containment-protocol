/** SPE-715 mid-use activation invalidation. Distinct from depletion or refusal. */
export const INVALIDATION_REASONS = Object.freeze([
  'channel-broken',
  'prerequisite-broken',
  'contact-lost',
  'concentration-broken',
  'formation-broken',
  'alignment-broken',
] as const)
export type InvalidationReason = (typeof INVALIDATION_REASONS)[number]

export interface ActivationInvalidation {
  readonly id: string
  readonly channelId: string
  readonly reason: InvalidationReason
  readonly outcome: 'fail' | 'collapse' | 'terminate'
  readonly inspectableMessage: string
}

export type InvalidationResult =
  | { readonly ok: true; readonly invalidation: ActivationInvalidation }
  | { readonly ok: false; readonly reason: string }

function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function parseActivationInvalidation(input: unknown): InvalidationResult {
  if (!record(input) || !text(input.id) || !text(input.channelId) || !text(input.inspectableMessage)) {
    return { ok: false, reason: 'invalid-invalidation' }
  }
  if (
    typeof input.reason !== 'string' ||
    !INVALIDATION_REASONS.some((r) => r === input.reason)
  ) {
    return { ok: false, reason: 'invalid-reason' }
  }
  if (
    input.outcome !== 'fail' &&
    input.outcome !== 'collapse' &&
    input.outcome !== 'terminate'
  ) {
    return { ok: false, reason: 'invalid-outcome' }
  }
  return {
    ok: true,
    invalidation: Object.freeze({
      id: input.id,
      channelId: input.channelId,
      reason: input.reason as InvalidationReason,
      outcome: input.outcome,
      inspectableMessage: input.inspectableMessage,
    }),
  }
}

export function lookupActivationInvalidation(
  catalog: readonly unknown[],
  id: string
): InvalidationResult {
  if (!Array.isArray(catalog) || !text(id)) return { ok: false, reason: 'invalid-lookup' }
  const seen = new Set<string>()
  let found: ActivationInvalidation | undefined
  let invalid = false
  let duplicate = false
  for (const entry of catalog) {
    const result = parseActivationInvalidation(entry)
    if (!result.ok) {
      invalid = true
      continue
    }
    if (seen.has(result.invalidation.id)) duplicate = true
    seen.add(result.invalidation.id)
    if (result.invalidation.id === id) found = result.invalidation
  }
  if (invalid) return { ok: false, reason: 'invalid-catalog' }
  if (duplicate) return { ok: false, reason: 'duplicate-id' }
  return found ? { ok: true, invalidation: found } : { ok: false, reason: 'not-found' }
}

/** Deterministic mid-activation check. Returns invalidation if sustaining condition broken. */
export function evaluateMidActivationInvalidation(
  active: { readonly channelId: string; readonly sustained: boolean },
  rules: readonly ActivationInvalidation[]
): ActivationInvalidation | null {
  if (!record(active) || !text(active.channelId) || typeof active.sustained !== 'boolean') return null
  if (active.sustained) return null
  for (const rule of rules) {
    const parsed = parseActivationInvalidation(rule)
    if (parsed.ok && parsed.invalidation.channelId === active.channelId) {
      return parsed.invalidation
    }
  }
  return null
}
