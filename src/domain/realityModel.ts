import { clamp } from './math'

export type RealityExistenceMode =
  | 'physical'
  | 'abstract'
  | 'potential'
  | 'perceptual_only'
  | 'recorded_only'
  | 'partially_instantiated'

export type RealityDeviationFamily =
  | 'none'
  | 'perception_masking'
  | 'false_continuity'
  | 'spatial_folding'
  | 'symbolic_override'
  | 'future_pressure_fixed'
  | 'future_pressure_conditional'
  | 'future_pressure_false'

export type RealityRuleDomain = 'presence' | 'future_pressure'

export type RealityObservationEvidence = 'clear' | 'contradicted' | 'false_reading'

export type RealityObservationStatus =
  | 'aligned'
  | 'uncertain'
  | 'contradicted'
  | 'false_reading'

export type RealityBaselineRuleId =
  | 'presence_tracks_instantiation'
  | 'future_records_are_advisory'

export type RealityRuleResolution = 'baseline' | 'override'

export interface RealityStateInput {
  packetId: string
  subjectId: string
  label: string
  actualState: string
  perceivedState?: string
  believedState?: string
  existenceMode: RealityExistenceMode
  ruleDomain: RealityRuleDomain
  deviationFamily?: RealityDeviationFamily
  confidence?: number
  evidence?: RealityObservationEvidence
}

export interface RealityRuleSurface {
  domain: RealityRuleDomain
  baselineRuleId: RealityBaselineRuleId
  baselineSummary: string
  resolution: RealityRuleResolution
  effectiveSummary: string
  deviationFamily: RealityDeviationFamily
}

export interface RealityTruthGap {
  actualVsPerceived: boolean
  perceivedVsBelieved: boolean
  actualVsBelieved: boolean
}

export interface RealityStatePacket {
  packetId: string
  subjectId: string
  label: string
  actualState: string
  perceivedState: string
  believedState: string
  existenceMode: RealityExistenceMode
  deviationFamily: RealityDeviationFamily
  confidence: number
  evidence: RealityObservationEvidence
  observationStatus: RealityObservationStatus
  truthGap: RealityTruthGap
  ruleSurface: RealityRuleSurface
}

export interface RealityOperationalAssessment {
  packetId: string
  subjectId: string
  visibilityTrust: 'trusted' | 'qualified' | 'rejected'
  decisionMode:
    | 'act_on_visible_state'
    | 'verify_before_commit'
    | 'treat_as_false_reading'
    | 'treat_as_record_only'
  recommendedAction:
    | 'physical_commitment'
    | 'verification_pass'
    | 'signature_containment'
    | 'archive_review'
  reasonCodes: string[]
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(
    new Set(values.map((value) => normalizeString(value)).filter((value) => value.length > 0))
  ).sort((left, right) => left.localeCompare(right))
}

function normalizeConfidence(value: number | undefined) {
  return Number(clamp(Number.isFinite(value) ? (value as number) : 0.5, 0, 1).toFixed(4))
}

export function resolveRealityRuleSurface(
  domain: RealityRuleDomain,
  deviationFamily: RealityDeviationFamily
): RealityRuleSurface {
  if (domain === 'future_pressure') {
    const baselineSummary =
      'Future-facing records are advisory and conditionally falsifiable unless a declared family overrides them.'

    if (deviationFamily === 'future_pressure_fixed') {
      return {
        domain,
        baselineRuleId: 'future_records_are_advisory',
        baselineSummary,
        resolution: 'override',
        effectiveSummary:
          'Declared future-pressure family marks the record as fixed-course for current interpretation.',
        deviationFamily,
      }
    }

    if (deviationFamily === 'future_pressure_false') {
      return {
        domain,
        baselineRuleId: 'future_records_are_advisory',
        baselineSummary,
        resolution: 'override',
        effectiveSummary:
          'Declared future-pressure family marks the record as manipulative or false rather than predictive.',
        deviationFamily,
      }
    }

    if (deviationFamily === 'future_pressure_conditional') {
      return {
        domain,
        baselineRuleId: 'future_records_are_advisory',
        baselineSummary,
        resolution: 'override',
        effectiveSummary:
          'Declared future-pressure family keeps the record contingent on unmet conditions rather than absolute.',
        deviationFamily,
      }
    }

    return {
      domain,
      baselineRuleId: 'future_records_are_advisory',
      baselineSummary,
      resolution: 'baseline',
      effectiveSummary: baselineSummary,
      deviationFamily,
    }
  }

  const baselineSummary =
    'Visible presence is treated as operationally real only when the subject is instantiated rather than merely perceived or recorded.'

  if (deviationFamily === 'perception_masking' || deviationFamily === 'false_continuity') {
    return {
      domain,
      baselineRuleId: 'presence_tracks_instantiation',
      baselineSummary,
      resolution: 'override',
      effectiveSummary:
        'Declared perception deviation means visible state may diverge from instantiated state and requires verification.',
      deviationFamily,
    }
  }

  if (deviationFamily === 'spatial_folding' || deviationFamily === 'symbolic_override') {
    return {
      domain,
      baselineRuleId: 'presence_tracks_instantiation',
      baselineSummary,
      resolution: 'override',
      effectiveSummary:
        'Declared reality override means baseline presence assumptions may fail under the active rule family.',
      deviationFamily,
    }
  }

  return {
    domain,
    baselineRuleId: 'presence_tracks_instantiation',
    baselineSummary,
    resolution: 'baseline',
    effectiveSummary: baselineSummary,
    deviationFamily,
  }
}

export function deriveRealityStatePacket(input: RealityStateInput): RealityStatePacket {
  const actualState = normalizeString(input.actualState)
  const perceivedState = normalizeString(input.perceivedState) || actualState
  const believedState = normalizeString(input.believedState) || perceivedState
  const deviationFamily = input.deviationFamily ?? 'none'
  const evidence = input.evidence ?? 'clear'
  const truthGap: RealityTruthGap = {
    actualVsPerceived: actualState !== perceivedState,
    perceivedVsBelieved: perceivedState !== believedState,
    actualVsBelieved: actualState !== believedState,
  }

  let observationStatus: RealityObservationStatus
  if (!truthGap.actualVsPerceived && !truthGap.perceivedVsBelieved && evidence === 'clear') {
    observationStatus = 'aligned'
  } else if (evidence === 'false_reading') {
    observationStatus = 'false_reading'
  } else if (evidence === 'contradicted') {
    observationStatus = 'contradicted'
  } else {
    observationStatus = 'uncertain'
  }

  return {
    packetId: normalizeString(input.packetId),
    subjectId: normalizeString(input.subjectId),
    label: normalizeString(input.label),
    actualState,
    perceivedState,
    believedState,
    existenceMode: input.existenceMode,
    deviationFamily,
    confidence: normalizeConfidence(input.confidence),
    evidence,
    observationStatus,
    truthGap,
    ruleSurface: resolveRealityRuleSurface(input.ruleDomain, deviationFamily),
  }
}

export function projectOperationalRealityAssessment(
  packet: RealityStatePacket
): RealityOperationalAssessment {
  const reasonCodes: string[] = []

  if (packet.observationStatus === 'false_reading') {
    reasonCodes.push('false-reading')
    if (packet.ruleSurface.resolution === 'override') {
      reasonCodes.push('rule-override')
    }

    return {
      packetId: packet.packetId,
      subjectId: packet.subjectId,
      visibilityTrust: 'rejected',
      decisionMode: 'treat_as_false_reading',
      recommendedAction: 'verification_pass',
      reasonCodes: uniqueSorted(reasonCodes),
    }
  }

  if (packet.existenceMode === 'recorded_only' || packet.existenceMode === 'abstract') {
    reasonCodes.push('record-only')
    if (packet.ruleSurface.resolution === 'override') {
      reasonCodes.push('rule-override')
    }

    return {
      packetId: packet.packetId,
      subjectId: packet.subjectId,
      visibilityTrust: 'qualified',
      decisionMode: 'treat_as_record_only',
      recommendedAction: 'archive_review',
      reasonCodes: uniqueSorted(reasonCodes),
    }
  }

  if (packet.existenceMode === 'partially_instantiated') {
    reasonCodes.push('partial-instantiation')
    if (packet.truthGap.actualVsPerceived) {
      reasonCodes.push('truth-gap')
    }

    return {
      packetId: packet.packetId,
      subjectId: packet.subjectId,
      visibilityTrust: 'qualified',
      decisionMode: 'verify_before_commit',
      recommendedAction: 'signature_containment',
      reasonCodes: uniqueSorted(reasonCodes),
    }
  }

  if (
    packet.ruleSurface.resolution === 'override' ||
    packet.observationStatus === 'contradicted' ||
    packet.observationStatus === 'uncertain' ||
    packet.truthGap.actualVsPerceived ||
    packet.confidence < 0.75
  ) {
    if (packet.ruleSurface.resolution === 'override') {
      reasonCodes.push('rule-override')
    }
    if (packet.observationStatus === 'contradicted') {
      reasonCodes.push('contradicted')
    }
    if (packet.observationStatus === 'uncertain') {
      reasonCodes.push('uncertain')
    }
    if (packet.truthGap.actualVsPerceived) {
      reasonCodes.push('truth-gap')
    }
    if (packet.confidence < 0.75) {
      reasonCodes.push('low-confidence')
    }

    return {
      packetId: packet.packetId,
      subjectId: packet.subjectId,
      visibilityTrust: 'qualified',
      decisionMode: 'verify_before_commit',
      recommendedAction: 'verification_pass',
      reasonCodes: uniqueSorted(reasonCodes),
    }
  }

  return {
    packetId: packet.packetId,
    subjectId: packet.subjectId,
    visibilityTrust: 'trusted',
    decisionMode: 'act_on_visible_state',
    recommendedAction: 'physical_commitment',
    reasonCodes: [],
  }
}
