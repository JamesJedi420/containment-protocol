/** SPE-780: resolve explicitly authored overlap; no effect execution or ticking. */
export interface StackEffect {
  readonly id: string
  readonly family: string
  readonly magnitude: number
  readonly duration: number
}

export type StackPolicy =
  | { readonly kind: 'strongest' | 'reject-duplicate' | 'extend-duration' }
  | { readonly kind: 'cap-total'; readonly cap: number }
  | { readonly kind: 'cancel-opposed'; readonly opposedFamily: string }

export type StackResult =
  | {
      readonly ok: true
      readonly outcome: string
      readonly retained: readonly StackEffect[]
      readonly effectiveMagnitude?: number
    }
  | { readonly ok: false; readonly reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}
function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
function parseEffect(value: unknown): StackEffect | undefined {
  if (
    !isRecord(value) ||
    !text(value.id) ||
    !text(value.family) ||
    !count(value.magnitude) ||
    !count(value.duration)
  )
    return undefined
  return Object.freeze({
    id: value.id,
    family: value.family,
    magnitude: value.magnitude,
    duration: value.duration,
  })
}

/** Existing instances are already authoritative; this returns a proposed overlap result only. */
export function resolveEffectStack(
  policy: StackPolicy,
  existing: readonly StackEffect[],
  incoming: StackEffect
): StackResult {
  if (!isRecord(policy) || !Array.isArray(existing)) return { ok: false, reason: 'invalid-input' }
  const next = parseEffect(incoming)
  const prior = Array.from(existing, parseEffect)
  if (!next || prior.some((entry) => !entry)) return { ok: false, reason: 'invalid-effect' }
  const active = prior as StackEffect[]
  const ids = [...active.map((entry) => entry.id), next.id]
  if (new Set(ids).size !== ids.length) return { ok: false, reason: 'duplicate-id' }
  const result = (
    outcome: string,
    retained: StackEffect[],
    effectiveMagnitude?: number
  ): StackResult => ({
    ok: true,
    outcome,
    retained: Object.freeze(retained.sort((a, b) => compare(a.id, b.id))),
    ...(effectiveMagnitude === undefined ? {} : { effectiveMagnitude }),
  })
  if (policy.kind === 'cancel-opposed') {
    if (
      !text(policy.opposedFamily) ||
      policy.opposedFamily === next.family ||
      active.some((entry) => entry.family !== policy.opposedFamily)
    )
      return { ok: false, reason: 'invalid-opposition' }
    if (active.length > 1) return { ok: false, reason: 'ambiguous-opposition' }
    return active.length === 1 ? result('canceled', []) : result('accepted', [next])
  }
  if (active.some((entry) => entry.family !== next.family))
    return { ok: false, reason: 'family-mismatch' }
  switch (policy.kind) {
    case 'strongest': {
      const ranked = [...active, next].sort(
        (a, b) => b.magnitude - a.magnitude || compare(a.id, b.id)
      )
      return result('strongest', [ranked[0]])
    }
    case 'reject-duplicate':
      return active.length ? result('rejected', active) : result('accepted', [next])
    case 'extend-duration': {
      if (active.length > 1) return { ok: false, reason: 'ambiguous-extension' }
      if (active.length === 0) return result('accepted', [next])
      const duration = active[0].duration + next.duration
      if (!Number.isSafeInteger(duration)) return { ok: false, reason: 'duration-overflow' }
      return result('extended', [Object.freeze({ ...active[0], duration })])
    }
    case 'cap-total': {
      if (!count(policy.cap)) return { ok: false, reason: 'invalid-cap' }
      let total = 0
      for (const entry of [...active, next]) total += Math.min(entry.magnitude, policy.cap - total)
      return result('capped', [...active, next], total)
    }
    default:
      return { ok: false, reason: 'invalid-policy' }
  }
}
