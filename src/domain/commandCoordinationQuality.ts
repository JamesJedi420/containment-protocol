/**
 * SPE-95 slice 1: bounded command-coordination quality signal under pressure.
 *
 * Pure deterministic helper. Computes a coordination-quality score from
 * bounded pressure inputs (overload, tier mismatch, crisis intensity,
 * span-of-control saturation, voice-loss fallback). Does not mutate
 * GameState, teams, or operations. Downstream consumers own application.
 */

export type CoordinationFallbackMode =
  | 'none'
  | 'gesture_only'
  | 'prebriefed'
  | 'role_substituted'

export const COORDINATION_FALLBACK_MODES: readonly CoordinationFallbackMode[] = [
  'none',
  'gesture_only',
  'prebriefed',
  'role_substituted',
] as const

export type CoordinationQualityBand = 'high' | 'adequate' | 'degraded' | 'critical'

export interface CoordinationQualityInput {
  /** Nominal concurrent coordination load (subordinates + tasks + exceptions). */
  concurrentLoad: number
  /** Configured effective span capacity for the current command structure. */
  spanCapacity: number
  /** Crisis intensity 0–1. */
  crisisIntensity: number
  /** True when a tier mismatch or handoff gap is present. */
  tierMismatch: boolean
  /** True when voice communication is lost. */
  voiceLoss: boolean
  /** Active fallback mode, if any. */
  fallbackMode: CoordinationFallbackMode
}

export interface CoordinationQualityResult {
  score: number // 0–100
  band: CoordinationQualityBand
  pressureReasons: readonly string[]
  fallbackMode: CoordinationFallbackMode
  explanation: string
}

const CLAMP = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export function assessCommandCoordinationQuality(
  input: CoordinationQualityInput,
): CoordinationQualityResult {
  const load = CLAMP(input.concurrentLoad, 0, 100)
  const capacity = Math.max(1, input.spanCapacity)
  const spanRatio = load / capacity
  const crisis = CLAMP(input.crisisIntensity, 0, 1)

  const reasons: string[] = []
  let penalty = 0

  if (spanRatio > 1) {
    const excess = spanRatio - 1
    penalty += Math.round(excess * 40)
    reasons.push('span-of-control saturation')
  }
  if (input.tierMismatch) {
    penalty += 15
    reasons.push('tier/handoff mismatch')
  }
  if (crisis > 0.6) {
    penalty += Math.round((crisis - 0.6) * 20)
    reasons.push('high crisis intensity')
  }
  if (input.voiceLoss && input.fallbackMode === 'none') {
    penalty += 20
    reasons.push('voice-loss without fallback')
  } else if (input.voiceLoss && input.fallbackMode !== 'none') {
    penalty += 8
    reasons.push(`voice-loss mitigated by ${input.fallbackMode}`)
  }

  const score = CLAMP(100 - penalty, 0, 100)
  let band: CoordinationQualityBand = 'high'
  if (score < 40) band = 'critical'
  else if (score < 60) band = 'degraded'
  else if (score < 80) band = 'adequate'

  const explanation =
    reasons.length === 0
      ? 'Coordination quality nominal; no significant pressure.'
      : `Coordination quality ${band} (${score}) due to: ${reasons.join(', ')}.`

  return {
    score,
    band,
    pressureReasons: reasons,
    fallbackMode: input.fallbackMode,
    explanation,
  }
}

/** Deterministic downstream example: operation success modifier. */
export function coordinationSuccessModifier(result: CoordinationQualityResult): number {
  switch (result.band) {
    case 'high':
      return 1.0
    case 'adequate':
      return 0.95
    case 'degraded':
      return 0.85
    case 'critical':
      return 0.7
  }
}
