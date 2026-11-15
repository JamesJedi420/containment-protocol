/** SPE-713 channel signals only; legality, effects and resource spending remain external. */
export const ACTIVATION_CHANNEL_KINDS = Object.freeze([
  'speech',
  'touch',
  'formation',
  'intent',
  'contact',
  'paired_hardware',
  'physical_disturbance',
] as const)
export type ActivationChannelKind = (typeof ACTIVATION_CHANNEL_KINDS)[number]

export interface ActivationChannel {
  readonly id: string
  readonly kind: ActivationChannelKind
  readonly triggerRef: string
  readonly requiredSignals: readonly string[]
  readonly costTypeRef: string
}

export type ChannelResult =
  | { readonly ok: true; readonly channel: ActivationChannel }
  | { readonly ok: false; readonly reason: string }

function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function parseActivationChannel(input: unknown): ChannelResult {
  if (!record(input) || !text(input.id) || !text(input.triggerRef) || !text(input.costTypeRef)) {
    return { ok: false, reason: 'invalid-channel' }
  }
  if (
    typeof input.kind !== 'string' ||
    !ACTIVATION_CHANNEL_KINDS.some((kind) => kind === input.kind)
  ) {
    return { ok: false, reason: 'invalid-kind' }
  }
  if (
    !Array.isArray(input.requiredSignals) ||
    input.requiredSignals.length === 0 ||
    !Array.from(input.requiredSignals).every(text) ||
    new Set(input.requiredSignals).size !== input.requiredSignals.length
  ) {
    return { ok: false, reason: 'invalid-signals' }
  }
  return {
    ok: true,
    channel: Object.freeze({
      id: input.id,
      kind: input.kind as ActivationChannelKind,
      triggerRef: input.triggerRef,
      requiredSignals: Object.freeze([...input.requiredSignals].sort(compare)),
      costTypeRef: input.costTypeRef,
    }),
  }
}

/** Validates the entire caller-supplied catalog before returning a named channel. */
export function lookupActivationChannel(catalog: readonly unknown[], id: string): ChannelResult {
  if (!Array.isArray(catalog) || !text(id)) return { ok: false, reason: 'invalid-lookup' }
  const seen = new Set<string>()
  let found: ActivationChannel | undefined
  let invalid = false
  let duplicate = false
  for (const entry of catalog) {
    const result = parseActivationChannel(entry)
    if (!result.ok) {
      invalid = true
      continue
    }
    if (seen.has(result.channel.id)) duplicate = true
    seen.add(result.channel.id)
    if (result.channel.id === id) found = result.channel
  }
  if (invalid) return { ok: false, reason: 'invalid-catalog' }
  if (duplicate) return { ok: false, reason: 'duplicate-id' }
  return found ? { ok: true, channel: found } : { ok: false, reason: 'not-found' }
}

/** Match observed channel signals only. A match does not authorize or execute an action. */
export function matchesActivationSignals(
  channel: ActivationChannel,
  observed: {
    readonly kind: ActivationChannelKind
    readonly triggerRef: string
    readonly signals: readonly string[]
  }
): boolean {
  const parsed = parseActivationChannel(channel)
  if (
    !parsed.ok ||
    !record(observed) ||
    !Array.isArray(observed.signals) ||
    !Array.from(observed.signals).every(text)
  )
    return false
  return (
    observed.kind === parsed.channel.kind &&
    observed.triggerRef === parsed.channel.triggerRef &&
    parsed.channel.requiredSignals.every((signal) => observed.signals.includes(signal))
  )
}
