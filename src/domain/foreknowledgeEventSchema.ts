/**
 * SPE-1125 — bounded foreknowledge event schema (pure domain, slice 1).
 *
 * Authored future-knowledge events carry explicit truth-state fields so
 * prophecies, forecasts, and predictive anomalies remain inspectable without
 * ad-hoc inevitability rules or a universal prophecy simulator.
 *
 * Downstream consumers must preserve source/confidence/provenance; this module
 * does not promote a forecast to exact truth.
 */

export const FOREKNOWLEDGE_EVENT_SCHEMA_OWNER = 'SPE-1125' as const
export const FOREKNOWLEDGE_EVENT_SCHEMA_VERSION = 'spe-1125.v1' as const

export const FOREKNOWLEDGE_TRUTH_STATES = [
  'fixed_fate',
  'conditional_forecast',
  'manipulative_false_prophecy',
  'statistical_prediction',
  'self_fulfilling_record',
] as const
export type ForeknowledgeTruthState = (typeof FOREKNOWLEDGE_TRUTH_STATES)[number]

export const FOREKNOWLEDGE_FIXITY = ['fixed', 'conditional', 'falsifiable', 'open'] as const
export type ForeknowledgeFixity = (typeof FOREKNOWLEDGE_FIXITY)[number]

export const DISCLOSURE_POSTURES = ['restricted', 'selective', 'public', 'sealed'] as const
export type DisclosurePosture = (typeof DISCLOSURE_POSTURES)[number]

export const NON_ACTIONABLE_REASONS = [
  'contradicted',
  'superseded',
  'stale',
  'invalidated',
  'fulfilled',
  'horizon_expired',
] as const
export type NonActionableReason = (typeof NON_ACTIONABLE_REASONS)[number]

export interface ForecastHorizon {
  readonly startWeek: number
  readonly endWeek: number
}

export interface ForeknowledgeEventRecord {
  readonly id: string
  readonly source: string
  readonly confidence: number // 0-100, provisional
  readonly truthState: ForeknowledgeTruthState
  readonly fixity: ForeknowledgeFixity
  readonly selfFulfillmentRisk: number // 0-100
  readonly avoidability: number // 0-100, higher = more avoidable
  readonly observerIdentity?: string
  readonly contradictionConditions?: string
  readonly disclosurePosture: DisclosurePosture
  readonly responsibilityPressure: number // 0-100
  readonly horizon?: ForecastHorizon
  readonly nonActionableReason?: NonActionableReason
}

const FORBIDDEN_IDS = new Set(['__proto__', 'constructor', 'prototype', 'toString', 'valueOf'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeId(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false
  const id = value.trim()
  if (FORBIDDEN_IDS.has(id)) return false
  if (id.includes('\0')) return false
  return true
}

function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isTruthState(value: unknown): value is ForeknowledgeTruthState {
  return typeof value === 'string' && (FOREKNOWLEDGE_TRUTH_STATES as readonly string[]).includes(value)
}

function isFixity(value: unknown): value is ForeknowledgeFixity {
  return typeof value === 'string' && (FOREKNOWLEDGE_FIXITY as readonly string[]).includes(value)
}

function isDisclosure(value: unknown): value is DisclosurePosture {
  return typeof value === 'string' && (DISCLOSURE_POSTURES as readonly string[]).includes(value)
}

function isNonActionableReason(value: unknown): value is NonActionableReason {
  return typeof value === 'string' && (NON_ACTIONABLE_REASONS as readonly string[]).includes(value)
}

function parseHorizon(raw: unknown): ForecastHorizon | undefined {
  if (raw === undefined) return undefined
  if (!isRecord(raw)) return undefined
  if (!isNonNegativeInt(raw.startWeek) || !isNonNegativeInt(raw.endWeek)) return undefined
  if (raw.endWeek < raw.startWeek) return undefined
  return Object.freeze({ startWeek: raw.startWeek, endWeek: raw.endWeek })
}

export function parseForeknowledgeEventRecord(raw: unknown): ForeknowledgeEventRecord | null {
  if (!isRecord(raw)) return null
  if (!isSafeId(raw.id) || !isNonEmptyString(raw.source)) return null
  if (!isScore(raw.confidence) || !isTruthState(raw.truthState) || !isFixity(raw.fixity)) return null
  if (!isScore(raw.selfFulfillmentRisk) || !isScore(raw.avoidability)) return null
  if (!isDisclosure(raw.disclosurePosture) || !isScore(raw.responsibilityPressure)) return null

  const horizon = parseHorizon(raw.horizon)
  if (raw.horizon !== undefined && horizon === undefined) return null

  const observerIdentity =
    raw.observerIdentity === undefined
      ? undefined
      : isNonEmptyString(raw.observerIdentity)
        ? raw.observerIdentity.trim()
        : undefined
  if (raw.observerIdentity !== undefined && observerIdentity === undefined) return null

  const contradictionConditions =
    raw.contradictionConditions === undefined
      ? undefined
      : isNonEmptyString(raw.contradictionConditions)
        ? raw.contradictionConditions.trim()
        : undefined
  if (raw.contradictionConditions !== undefined && contradictionConditions === undefined) return null

  const nonActionableReason =
    raw.nonActionableReason === undefined
      ? undefined
      : isNonActionableReason(raw.nonActionableReason)
        ? raw.nonActionableReason
        : undefined
  if (raw.nonActionableReason !== undefined && nonActionableReason === undefined) return null

  return Object.freeze({
    id: raw.id.trim(),
    source: raw.source.trim(),
    confidence: raw.confidence,
    truthState: raw.truthState,
    fixity: raw.fixity,
    selfFulfillmentRisk: raw.selfFulfillmentRisk,
    avoidability: raw.avoidability,
    ...(observerIdentity !== undefined ? { observerIdentity } : {}),
    ...(contradictionConditions !== undefined ? { contradictionConditions } : {}),
    disclosurePosture: raw.disclosurePosture,
    responsibilityPressure: raw.responsibilityPressure,
    ...(horizon !== undefined ? { horizon } : {}),
    ...(nonActionableReason !== undefined ? { nonActionableReason } : {}),
  })
}

/** Sample authored event distinguishing conditional/falsifiable pressure. */
export const SAMPLE_FOREKNOWLEDGE_EVENT: ForeknowledgeEventRecord = Object.freeze({
  id: 'forecast:canal-spillway-evacuation',
  source: 'witness-grid:canal-north',
  confidence: 62,
  truthState: 'conditional_forecast',
  fixity: 'conditional',
  selfFulfillmentRisk: 28,
  avoidability: 71,
  observerIdentity: 'field_lead:ops-3',
  contradictionConditions: 'instrument readings diverge from witness timeline',
  disclosurePosture: 'selective',
  responsibilityPressure: 54,
  horizon: Object.freeze({ startWeek: 12, endWeek: 16 }),
})

export interface ResponsibilityPressureProjection {
  readonly eventId: string
  readonly effectivePressure: number
  readonly reason: string
  readonly preservesUncertainty: true
}

/**
 * Downstream consumer: responsibility/morale pressure varies with observer,
 * disclosure, and perceived fixity without promoting the forecast to truth.
 */
export function projectResponsibilityPressure(
  event: ForeknowledgeEventRecord,
  currentObserver?: string,
  currentWeek?: number,
): ResponsibilityPressureProjection {
  let pressure = event.responsibilityPressure
  let reason = 'baseline responsibility pressure from authored fields'

  if (event.nonActionableReason !== undefined) {
    pressure = Math.max(0, pressure - 40)
    reason = `non-actionable (${event.nonActionableReason}); pressure reduced; provenance preserved`
  } else if (event.horizon !== undefined && currentWeek !== undefined && currentWeek > event.horizon.endWeek) {
    pressure = Math.max(0, pressure - 30)
    reason = 'horizon expired; forecast non-actionable; uncertainty preserved'
  } else if (currentObserver !== undefined && event.observerIdentity !== undefined && currentObserver !== event.observerIdentity) {
    pressure = Math.max(0, pressure - 15)
    reason = 'observer mismatch reduces perceived personal responsibility pressure'
  } else if (event.disclosurePosture === 'restricted' || event.disclosurePosture === 'sealed') {
    pressure = Math.min(100, pressure + 10)
    reason = 'restricted/sealed disclosure increases residual responsibility pressure for authorized observers'
  } else if (event.fixity === 'fixed') {
    pressure = Math.min(100, pressure + 12)
    reason = 'perceived fixed fate elevates responsibility pressure without locking outcomes'
  }

  return Object.freeze({
    eventId: event.id,
    effectivePressure: pressure,
    reason,
    preservesUncertainty: true,
  })
}

export function isCurrentlyActionable(
  event: ForeknowledgeEventRecord,
  currentWeek?: number,
): boolean {
  if (event.nonActionableReason !== undefined) return false
  if (event.horizon !== undefined && currentWeek !== undefined && currentWeek > event.horizon.endWeek) {
    return false
  }
  return true
}
