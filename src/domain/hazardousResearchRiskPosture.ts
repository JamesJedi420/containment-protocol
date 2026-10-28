/**
 * SPE-3344 — hazardous research risk posture and deterministic consequence routing.
 * Pure layer on SPE-3343 throughput execution; does not mutate foreign state.
 */

import type {
  ResearchCapabilityPacket,
  ResearchExecutionOutcome,
  ResearchExecutionTickResult,
} from './researchThroughputExecution'

export const HAZARDOUS_RESEARCH_RISK_POSTURE_SCHEMA_VERSION = 'spe-3344.v1' as const
export type HazardousResearchRiskPostureSchemaVersion =
  typeof HAZARDOUS_RESEARCH_RISK_POSTURE_SCHEMA_VERSION

export const HAZARDOUS_RESEARCH_POSTURE_MARKER_SCHEMA_VERSION =
  'spe-3344.posture.v1' as const

export const HAZARDOUS_RESEARCH_RISK_POSTURES = [
  'standard',
  'accelerated',
  'exceeding_limits',
] as const
export type HazardousResearchRiskPosture = (typeof HAZARDOUS_RESEARCH_RISK_POSTURES)[number]

export const HAZARDOUS_RESEARCH_DOWNSIDE_CHANNELS = [
  'contamination_exposure',
  'degraded_result',
  'equipment_strain',
  'facility_damage',
  'interruption',
  'invalid_result',
  'observation_exposure',
] as const
export type HazardousResearchDownsideChannel =
  (typeof HAZARDOUS_RESEARCH_DOWNSIDE_CHANNELS)[number]

export const HAZARDOUS_RESEARCH_CONSEQUENCE_KINDS = [
  'contamination_exposure',
  'degraded_result',
  'equipment_damage',
  'experiment_record_deviation',
  'interruption',
  'invalid_result',
  'progress_bonus',
  'resource_loss',
  'unexpected_discovery',
] as const
export type HazardousResearchConsequenceKind =
  (typeof HAZARDOUS_RESEARCH_CONSEQUENCE_KINDS)[number]

/** Throughput multiplier when posture is accelerated (explicit opt-in only). */
export const ACCELERATED_RISK_THROUGHPUT_MULTIPLIER = 1.35 as const

/** Throughput multiplier when posture exceeds normal limits. */
export const EXCEEDING_LIMITS_RISK_THROUGHPUT_MULTIPLIER = 1.7 as const

export const OWNER_REF_SPE_3179 = 'owner.SPE-3179' as const
export const OWNER_REF_SPE_1199 = 'owner.SPE-1199' as const
export const OWNER_REF_SPE_995 = 'owner.SPE-995' as const
export const OWNER_REF_SPE_1818 = 'owner.SPE-1818' as const
export const OWNER_REF_SPE_2051 = 'owner.SPE-2051' as const
export const OWNER_REF_SPE_1817 = 'owner.SPE-1817' as const
export const OWNER_REF_SPE_1910 = 'owner.SPE-1910' as const
export const OWNER_REF_SPE_3343 = 'owner.SPE-3343' as const

export interface HazardousResearchRiskGateInput {
  readonly authorized?: boolean
  readonly participantHarmRisk?: boolean
  readonly observationExposureRisk?: boolean
  readonly incidentProhibitionActive?: boolean
  readonly experimentRecordRef?: string
}

export interface HazardousResearchRiskPostureInput extends HazardousResearchRiskGateInput {
  readonly capability: ResearchCapabilityPacket
  readonly posture: HazardousResearchRiskPosture
}

export interface HazardousResearchRiskPostureResult {
  readonly allowed: boolean
  readonly posture: HazardousResearchRiskPosture
  readonly effectiveThroughputMultiplier: number
  readonly downsideChannels: readonly HazardousResearchDownsideChannel[]
  readonly reasonCodes: readonly string[]
  readonly explanation: string
}

export interface HazardousResearchConsequenceIntent {
  readonly kind: HazardousResearchConsequenceKind
  readonly targetRef: string
  readonly magnitude: number
  readonly reasonCodes: readonly string[]
  readonly projectId: string
  readonly experimentRecordRef?: string
  readonly tickOutcome: ResearchExecutionOutcome
}

export interface HazardousResearchConsequenceApplyInput {
  readonly projectId: string
  readonly tick: Pick<
    ResearchExecutionTickResult,
    'outcome' | 'progressDelta' | 'reasonCodes' | 'explanationSummary'
  >
  readonly postureResolution: HazardousResearchRiskPostureResult
  readonly experimentRecordRef?: string
  readonly participantHarmRisk?: boolean
  /** When true, emit an optional claim-routed intent (never implied by reliability failure). */
  readonly explicitlyRouteClaimInvalidation?: boolean
}

export interface HazardousResearchPostureSelectionMarker {
  readonly schemaVersion: typeof HAZARDOUS_RESEARCH_POSTURE_MARKER_SCHEMA_VERSION
  readonly posture: HazardousResearchRiskPosture
  readonly experimentRecordRef?: string
}

function round4(value: number): number {
  return Number(value.toFixed(4))
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values.filter((v) => v.length > 0))].sort())
}

function sortedChannels(
  channels: readonly HazardousResearchDownsideChannel[],
): readonly HazardousResearchDownsideChannel[] {
  return Object.freeze(
    [...new Set(channels)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  )
}

function isRiskPosture(value: unknown): value is HazardousResearchRiskPosture {
  return (
    typeof value === 'string' &&
    (HAZARDOUS_RESEARCH_RISK_POSTURES as readonly string[]).includes(value)
  )
}

function validateCapabilityLight(capability: ResearchCapabilityPacket): readonly string[] {
  const reasons: string[] = []
  if (!Number.isFinite(capability.difficulty) || capability.difficulty <= 0) {
    reasons.push('invalid_difficulty')
  }
  return sortedUnique(reasons)
}

function baseDownsideChannelsForPosture(
  posture: HazardousResearchRiskPosture,
): HazardousResearchDownsideChannel[] {
  switch (posture) {
    case 'standard':
      return []
    case 'accelerated':
      return ['degraded_result', 'equipment_strain']
    case 'exceeding_limits':
      return [
        'contamination_exposure',
        'facility_damage',
        'invalid_result',
        'interruption',
      ]
    default: {
      const _exhaustive: never = posture
      throw new Error(`Unhandled risk posture: ${String(_exhaustive)}`)
    }
  }
}

function throughputMultiplierForPosture(posture: HazardousResearchRiskPosture): number {
  switch (posture) {
    case 'standard':
      return 1
    case 'accelerated':
      return ACCELERATED_RISK_THROUGHPUT_MULTIPLIER
    case 'exceeding_limits':
      return EXCEEDING_LIMITS_RISK_THROUGHPUT_MULTIPLIER
    default: {
      const _exhaustive: never = posture
      throw new Error(`Unhandled risk posture: ${String(_exhaustive)}`)
    }
  }
}

/**
 * Resolve explicit hazardous research posture against capability and safety gates.
 * Authorization is recorded but never treated as participant safety.
 */
export function resolveHazardousResearchRiskPosture(
  input: HazardousResearchRiskPostureInput,
): HazardousResearchRiskPostureResult {
  const { capability, posture } = input
  const reasonCodes: string[] = []

  if (!isRiskPosture(posture)) {
    return Object.freeze({
      allowed: false,
      posture: 'standard',
      effectiveThroughputMultiplier: 0,
      downsideChannels: Object.freeze([]),
      reasonCodes: sortedUnique(['invalid_risk_posture']),
      explanation: 'Risk posture must be explicit and bounded.',
    })
  }

  const malformed = validateCapabilityLight(capability)
  if (malformed.length > 0) {
    return Object.freeze({
      allowed: false,
      posture,
      effectiveThroughputMultiplier: 0,
      downsideChannels: Object.freeze([]),
      reasonCodes: sortedUnique(['rejected_malformed', ...malformed]),
      explanation: 'Malformed capability packet for hazardous posture resolution.',
    })
  }

  if (input.incidentProhibitionActive === true) {
    return Object.freeze({
      allowed: false,
      posture,
      effectiveThroughputMultiplier: 0,
      downsideChannels: Object.freeze([]),
      reasonCodes: sortedUnique(['incident_prohibition_active']),
      explanation: 'Incident-derived prohibition blocks hazardous research posture.',
    })
  }

  if (input.authorized === true) {
    reasonCodes.push('authorization_not_equivalent_to_safety')
  }
  if (input.participantHarmRisk === true) {
    reasonCodes.push('participant_harm_risk_present')
  }
  if (input.observationExposureRisk === true) {
    reasonCodes.push('observation_exposure_risk_present')
  }

  const downside = baseDownsideChannelsForPosture(posture)
  if (input.observationExposureRisk === true) {
    downside.push('observation_exposure')
  }

  const multiplier = throughputMultiplierForPosture(posture)
  let explanation: string
  switch (posture) {
    case 'standard':
      explanation = 'Standard research posture; no additional hazardous downside channels.'
      break
    case 'accelerated':
      explanation =
        'Accelerated hazardous posture increases throughput with degraded-result and equipment-strain exposure.'
      break
    case 'exceeding_limits':
      explanation =
        'Exceeding-limits posture maximizes throughput with contamination, facility, validity, and interruption exposure.'
      break
    default: {
      const _exhaustive: never = posture
      throw new Error(`Unhandled risk posture: ${String(_exhaustive)}`)
    }
  }

  return Object.freeze({
    allowed: true,
    posture,
    effectiveThroughputMultiplier: multiplier,
    downsideChannels: sortedChannels(downside),
    reasonCodes: sortedUnique(reasonCodes),
    explanation,
  })
}

function channelShouldEmitIntent(
  channel: HazardousResearchDownsideChannel,
  posture: HazardousResearchRiskPosture,
  tickOutcome: ResearchExecutionOutcome,
  progressDelta: number,
): boolean {
  switch (channel) {
    case 'degraded_result':
      return (
        tickOutcome === 'degraded' ||
        (posture === 'accelerated' && progressDelta > 0) ||
        posture === 'exceeding_limits'
      )
    case 'equipment_strain':
      return posture === 'accelerated' || posture === 'exceeding_limits'
    case 'contamination_exposure':
      return posture === 'exceeding_limits'
    case 'facility_damage':
      return posture === 'exceeding_limits'
    case 'invalid_result':
      return (
        posture === 'exceeding_limits' &&
        (tickOutcome === 'blocked' || tickOutcome === 'degraded' || tickOutcome === 'interrupted')
      )
    case 'interruption':
      return tickOutcome === 'interrupted' || (posture === 'exceeding_limits' && tickOutcome === 'blocked')
    case 'observation_exposure':
      return true
    default: {
      const _exhaustive: never = channel
      throw new Error(`Unhandled downside channel: ${String(_exhaustive)}`)
    }
  }
}

function intentForChannel(
  channel: HazardousResearchDownsideChannel,
  input: HazardousResearchConsequenceApplyInput,
  recordRef: string | undefined,
): HazardousResearchConsequenceIntent | null {
  const { tick, postureResolution, projectId } = input

  switch (channel) {
    case 'degraded_result':
      return Object.freeze({
        kind: 'degraded_result',
        targetRef: OWNER_REF_SPE_995,
        magnitude: round4(Math.max(0.1, tick.progressDelta * 0.25)),
        reasonCodes: sortedUnique([
          'execution_reliability_degraded',
          'not_claim_invalidation',
          ...tick.reasonCodes,
        ]),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    case 'equipment_strain':
      return Object.freeze({
        kind: 'equipment_damage',
        targetRef: OWNER_REF_SPE_3343,
        magnitude: round4(postureResolution.effectiveThroughputMultiplier - 1),
        reasonCodes: sortedUnique(['equipment_strain_from_risk_posture']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    case 'contamination_exposure':
      return Object.freeze({
        kind: 'contamination_exposure',
        targetRef: OWNER_REF_SPE_1818,
        magnitude: 1,
        reasonCodes: sortedUnique(['hazardous_research_contamination_channel']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    case 'facility_damage':
      return Object.freeze({
        kind: 'resource_loss',
        targetRef: OWNER_REF_SPE_3343,
        magnitude: round4(0.5 + postureResolution.effectiveThroughputMultiplier * 0.1),
        reasonCodes: sortedUnique(['facility_stress_from_exceeding_limits']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    case 'invalid_result':
      return Object.freeze({
        kind: 'invalid_result',
        targetRef: OWNER_REF_SPE_995,
        magnitude: 1,
        reasonCodes: sortedUnique([
          'execution_reliability_failure',
          'not_claim_invalidation',
        ]),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    case 'interruption':
      return Object.freeze({
        kind: 'interruption',
        targetRef: OWNER_REF_SPE_1817,
        magnitude: 1,
        reasonCodes: sortedUnique(['risk_posture_interruption_channel']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    case 'observation_exposure':
      return Object.freeze({
        kind: 'contamination_exposure',
        targetRef: OWNER_REF_SPE_1818,
        magnitude: 1,
        reasonCodes: sortedUnique(['observation_exposure_not_automatically_safe']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      })
    default: {
      const _exhaustive: never = channel
      throw new Error(`Unhandled downside channel: ${String(_exhaustive)}`)
    }
  }
}

function sortConsequenceIntents(
  intents: readonly HazardousResearchConsequenceIntent[],
): readonly HazardousResearchConsequenceIntent[] {
  return Object.freeze(
    [...intents].sort((left, right) => {
      const kindCmp = left.kind < right.kind ? -1 : left.kind > right.kind ? 1 : 0
      if (kindCmp !== 0) return kindCmp
      return left.targetRef < right.targetRef ? -1 : left.targetRef > right.targetRef ? 1 : 0
    }),
  )
}

/**
 * Map a SPE-3343 execution tick and posture resolution to ordered owner-routed intents.
 * Does not mutate runtime, claims, or experiment records.
 */
export function applyHazardousResearchConsequences(
  input: HazardousResearchConsequenceApplyInput,
): readonly HazardousResearchConsequenceIntent[] {
  const { tick, postureResolution, projectId } = input
  const recordRef = input.experimentRecordRef?.trim() || undefined
  const intents: HazardousResearchConsequenceIntent[] = []

  if (!postureResolution.allowed) {
    intents.push(
      Object.freeze({
        kind: 'interruption',
        targetRef: OWNER_REF_SPE_1817,
        magnitude: 1,
        reasonCodes: sortedUnique([
          'hazardous_posture_blocked',
          ...postureResolution.reasonCodes,
        ]),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      }),
    )
    return sortConsequenceIntents(intents)
  }

  const riskyPosture = postureResolution.posture !== 'standard'

  if (riskyPosture) {
    intents.push(
      Object.freeze({
        kind: 'experiment_record_deviation',
        targetRef: OWNER_REF_SPE_3179,
        magnitude: round4(tick.progressDelta),
        reasonCodes: sortedUnique([
          'planned_vs_actual_deviation',
          ...postureResolution.reasonCodes,
          ...tick.reasonCodes,
        ]),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      }),
    )
  }

  if (
    postureResolution.effectiveThroughputMultiplier > 1 &&
    (tick.outcome === 'progressed' || tick.outcome === 'degraded' || tick.outcome === 'completed') &&
    tick.progressDelta > 0
  ) {
    const bonus = round4(
      tick.progressDelta * (postureResolution.effectiveThroughputMultiplier - 1),
    )
    if (bonus > 0) {
      intents.push(
        Object.freeze({
          kind: 'progress_bonus',
          targetRef: OWNER_REF_SPE_3343,
          magnitude: bonus,
          reasonCodes: sortedUnique(['risk_posture_throughput_bonus']),
          projectId,
          experimentRecordRef: recordRef,
          tickOutcome: tick.outcome,
        }),
      )
    }
  }

  if (
    postureResolution.posture === 'exceeding_limits' &&
    tick.outcome === 'progressed' &&
    tick.progressDelta >= 0.5
  ) {
    intents.push(
      Object.freeze({
        kind: 'unexpected_discovery',
        targetRef: OWNER_REF_SPE_1910,
        magnitude: round4(tick.progressDelta),
        reasonCodes: sortedUnique(['unexpected_discovery_from_high_risk_run']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      }),
    )
  }

  if (input.participantHarmRisk === true) {
    intents.push(
      Object.freeze({
        kind: 'experiment_record_deviation',
        targetRef: OWNER_REF_SPE_2051,
        magnitude: 1,
        reasonCodes: sortedUnique([
          'authorized_test_not_equivalent_to_participant_safety',
        ]),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      }),
    )
  }

  for (const channel of postureResolution.downsideChannels) {
    if (
      !channelShouldEmitIntent(
        channel,
        postureResolution.posture,
        tick.outcome,
        tick.progressDelta,
      )
    ) {
      continue
    }
    const intent = intentForChannel(channel, input, recordRef)
    if (intent) {
      intents.push(intent)
    }
  }

  if (input.explicitlyRouteClaimInvalidation === true) {
    intents.push(
      Object.freeze({
        kind: 'invalid_result',
        targetRef: OWNER_REF_SPE_1199,
        magnitude: 1,
        reasonCodes: sortedUnique(['explicit_claim_invalidation_route']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      }),
    )
  }

  if (intents.length === 0 && riskyPosture) {
    intents.push(
      Object.freeze({
        kind: 'experiment_record_deviation',
        targetRef: OWNER_REF_SPE_3179,
        magnitude: 0,
        reasonCodes: sortedUnique(['durable_harmful_consequence_minimum']),
        projectId,
        experimentRecordRef: recordRef,
        tickOutcome: tick.outcome,
      }),
    )
  }

  return sortConsequenceIntents(intents)
}

export function serializeHazardousResearchPostureSelection(
  marker: HazardousResearchPostureSelectionMarker,
): string {
  const payload = {
    schemaVersion: marker.schemaVersion,
    posture: marker.posture,
    ...(marker.experimentRecordRef
      ? { experimentRecordRef: marker.experimentRecordRef }
      : {}),
  }
  return JSON.stringify(payload)
}

export function parseHazardousResearchPostureSelection(
  raw: unknown,
): HazardousResearchPostureSelectionMarker | null {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  if (record.schemaVersion !== HAZARDOUS_RESEARCH_POSTURE_MARKER_SCHEMA_VERSION) {
    return null
  }
  if (!isRiskPosture(record.posture)) return null
  if (record.experimentRecordRef !== undefined) {
    if (typeof record.experimentRecordRef !== 'string') return null
    if (record.experimentRecordRef.trim() === '') return null
  }
  return Object.freeze({
    schemaVersion: HAZARDOUS_RESEARCH_POSTURE_MARKER_SCHEMA_VERSION,
    posture: record.posture,
    ...(typeof record.experimentRecordRef === 'string'
      ? { experimentRecordRef: record.experimentRecordRef.trim() }
      : {}),
  })
}

export function assertHazardousResearchConsequenceKindExhaustive(
  kind: HazardousResearchConsequenceKind,
): void {
  if (!(HAZARDOUS_RESEARCH_CONSEQUENCE_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`Unknown hazardous research consequence kind: ${kind}`)
  }
}
