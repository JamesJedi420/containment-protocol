/**
 * SPE-1309 slice 1: unified cognitive hazard engine domain anchor.
 *
 * Pure deterministic exposure state model with explicit trigger channels,
 * fear/memetic/memory impairment dimensions, and countermeasure posture —
 * distinct from sibling antimemetic (SPE-2108), naming-hazard (SPE-2116), and
 * psychological-resilience (SPE-1615) registries.
 */

import {
  BRANDED_OBJECT_NUMBER_PATTERN,
  FRANCHISE_TOKEN_PATTERN,
} from './containedPersonTherapeuticCareRegistry'
import type { PropagationResistanceTag } from './selfCensoringInformationRegistry'

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type CognitiveHazardExposureId = string

export type CognitiveHazardTriggerChannel =
  | 'direct_perception'
  | 'recording_mediated'
  | 'reference_description'
  | 'memory_interaction'

export const COGNITIVE_HAZARD_TRIGGER_CHANNELS: readonly CognitiveHazardTriggerChannel[] = [
  'direct_perception',
  'recording_mediated',
  'reference_description',
  'memory_interaction',
] as const

export type CognitiveHazardMemoryImpairmentBand =
  | 'intact'
  | 'fragmented'
  | 'compromised'
  | 'erased'

export const COGNITIVE_HAZARD_MEMORY_IMPAIRMENT_BANDS: readonly CognitiveHazardMemoryImpairmentBand[] =
  [
    'intact',
    'fragmented',
    'compromised',
    'erased',
  ] as const

export type CognitiveHazardCountermeasurePosture =
  | 'none'
  | 'amnestic_protocol'
  | 'mnestic_reinforcement'
  | 'shielding_active'
  | 'procedure_restricted'
  | 'failed'

export const COGNITIVE_HAZARD_COUNTERMEASURE_POSTURES: readonly CognitiveHazardCountermeasurePosture[] =
  [
    'none',
    'amnestic_protocol',
    'mnestic_reinforcement',
    'shielding_active',
    'procedure_restricted',
    'failed',
  ] as const

export type CognitiveHazardExposureReviewBand = 'stable' | 'elevated' | 'critical'

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface CognitiveHazardExposureRecord {
  readonly id: CognitiveHazardExposureId
  readonly label: string
  readonly summary?: string
  readonly subjectRef: string
  readonly activeTriggerChannels: readonly CognitiveHazardTriggerChannel[]
  readonly fearPressure: number
  readonly memeticExposure: number
  readonly memoryImpairmentBand: CognitiveHazardMemoryImpairmentBand
  readonly countermeasurePosture: CognitiveHazardCountermeasurePosture
  readonly countermeasureRefs?: readonly string[]
  readonly knowledgeIntegrityDegraded?: boolean
  readonly procedureRestrictionActive?: boolean
  readonly agentDutyDegraded?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type CognitiveHazardValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'missing_subject_ref'
  | 'invalid_trigger_channel'
  | 'invalid_fear_pressure'
  | 'invalid_memetic_exposure'
  | 'invalid_memory_impairment_band'
  | 'invalid_countermeasure_posture'
  | 'invalid_confidence'
  | 'failed_countermeasure_without_refs'
  | 'erased_memory_without_knowledge_degradation'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface CognitiveHazardValidationIssue {
  readonly code: CognitiveHazardValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface CognitiveHazardValidationResult {
  readonly valid: boolean
  readonly issues: readonly CognitiveHazardValidationIssue[]
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

export interface CognitiveHazardProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly elevatedExposureThreshold?: number
  readonly criticalExposureThreshold?: number
}

export interface CognitiveHazardExposureReview {
  readonly recordId: CognitiveHazardExposureId
  readonly label: string
  readonly subjectRef: string
  readonly activeTriggerChannels: readonly CognitiveHazardTriggerChannel[]
  readonly triggerChannelLabels: readonly string[]
  readonly fearPressure: number | null
  readonly memeticExposure: number | null
  readonly aggregateExposurePressure: number | null
  readonly memoryImpairmentBand: CognitiveHazardMemoryImpairmentBand
  readonly memoryImpairmentAdvanced: boolean
  readonly countermeasurePosture: CognitiveHazardCountermeasurePosture
  readonly countermeasureFailed: boolean
  readonly countermeasureShieldingActive: boolean
  readonly exposureReviewBand: CognitiveHazardExposureReviewBand
  readonly agentDutyDegraded: boolean
  readonly knowledgeIntegrityDegraded: boolean
  readonly procedureRestrictionActive: boolean
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const TRIGGER_CHANNEL_SET = new Set<string>(COGNITIVE_HAZARD_TRIGGER_CHANNELS)
const MEMORY_IMPAIRMENT_BAND_SET = new Set<string>(COGNITIVE_HAZARD_MEMORY_IMPAIRMENT_BANDS)
const COUNTERMEASURE_POSTURE_SET = new Set<string>(COGNITIVE_HAZARD_COUNTERMEASURE_POSTURES)

const DEFAULT_ELEVATED_EXPOSURE_THRESHOLD = 0.45
const DEFAULT_CRITICAL_EXPOSURE_THRESHOLD = 0.75

const ADVANCED_MEMORY_IMPAIRMENT_BANDS: ReadonlySet<CognitiveHazardMemoryImpairmentBand> = new Set([
  'compromised',
  'erased',
])

const PROPAGATION_TO_TRIGGER_CHANNEL: Readonly<
  Partial<Record<PropagationResistanceTag, CognitiveHazardTriggerChannel>>
> = {
  forgetting: 'memory_interaction',
  aversion: 'direct_perception',
  record_decay: 'recording_mediated',
  cognition_fail: 'memory_interaction',
  transmission_block: 'recording_mediated',
  retrieval_block: 'reference_description',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function sortedStringArray(value: unknown): readonly string[] {
  return Object.freeze(
    [...asStringArray(value)].sort((left, right) => left.localeCompare(right))
  )
}

function pushIssue(
  issues: CognitiveHazardValidationIssue[],
  issue: CognitiveHazardValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: CognitiveHazardValidationIssue[]) {
  return [...issues].sort((left, right) => {
    const codeCompare = left.code.localeCompare(right.code)
    if (codeCompare !== 0) {
      return codeCompare
    }

    const severityCompare = left.severity.localeCompare(right.severity)
    if (severityCompare !== 0) {
      return severityCompare
    }

    return left.detail.localeCompare(right.detail)
  })
}

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function roundUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(clampUnit(value) * 1000) / 1000
}

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function freezeValidationResult(
  issues: CognitiveHazardValidationIssue[]
): CognitiveHazardValidationResult {
  const sortedIssues = sortValidationIssues(issues)
  const hasError = sortedIssues.some((issue) => issue.severity === 'error')

  return Object.freeze({
    valid: !hasError,
    issues: Object.freeze(
      sortedIssues.map((issue) =>
        Object.freeze({
          ...issue,
          ...(issue.relatedIds ? { relatedIds: Object.freeze([...issue.relatedIds]) } : {}),
        })
      )
    ),
  })
}

function scanForbiddenTokens(
  issues: CognitiveHazardValidationIssue[],
  id: string,
  label: string,
  record: CognitiveHazardExposureRecord
) {
  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Cognitive hazard exposure record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Cognitive hazard exposure record id ${id || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Cognitive hazard exposure record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Cognitive hazard exposure record label ${label || '(unknown)'} contains a branded object number.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const stringFields: Array<[string, string | undefined]> = [
    ['summary', record.summary],
    ['subjectRef', record.subjectRef],
  ]

  for (const [fieldName, fieldValue] of stringFields) {
    const token = normalizeToken(fieldValue)
    if (token.length === 0) {
      continue
    }

    if (containsFranchiseToken(token)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: `Cognitive hazard exposure record field ${fieldName} contains a franchise or source-literal token.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(token)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: `Cognitive hazard exposure record field ${fieldName} contains a branded object number.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const ref of asStringArray(record.countermeasureRefs)) {
    if (containsFranchiseToken(ref)) {
      pushIssue(issues, {
        code: 'franchise_token_in_field',
        severity: 'error',
        detail: 'Cognitive hazard exposure record countermeasureRefs contains a franchise or source-literal token.',
        relatedIds: id ? [id] : undefined,
      })
    }

    if (containsBrandedObjectNumber(ref)) {
      pushIssue(issues, {
        code: 'branded_object_number_in_field',
        severity: 'error',
        detail: 'Cognitive hazard exposure record countermeasureRefs contains a branded object number.',
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function sortedTriggerChannels(
  channels: readonly CognitiveHazardTriggerChannel[] | undefined
): readonly CognitiveHazardTriggerChannel[] {
  return Object.freeze(
    [...(channels ?? [])]
      .filter((channel): channel is CognitiveHazardTriggerChannel =>
        TRIGGER_CHANNEL_SET.has(channel)
      )
      .sort((left, right) => left.localeCompare(right))
  )
}

function formatTriggerChannelLabel(channel: CognitiveHazardTriggerChannel): string {
  return channel
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function resolveOptionalUnitScore(
  record: CognitiveHazardExposureRecord,
  field: 'fearPressure' | 'memeticExposure' | 'confidence',
  policy: CognitiveHazardProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (
    redactedFields.has(field) ||
    (policy.redactUnknown === true && unknownFields.includes(field))
  ) {
    return null
  }

  const value = record[field]
  return isValidUnitScore(value) ? roundUnit(value) : null
}

function resolveConfidence(
  record: CognitiveHazardExposureRecord,
  policy: CognitiveHazardProjectionPolicy
): number | null {
  const confidence = resolveOptionalUnitScore(record, 'confidence', policy)
  if (confidence === null) {
    return null
  }

  if (
    typeof policy.minimumConfidence === 'number' &&
    Number.isFinite(policy.minimumConfidence) &&
    confidence < clampUnit(policy.minimumConfidence)
  ) {
    return null
  }

  return confidence
}

function resolveAggregateExposurePressure(
  fearPressure: number | null,
  memeticExposure: number | null
): number | null {
  if (fearPressure === null && memeticExposure === null) {
    return null
  }

  const fear = fearPressure ?? 0
  const memetic = memeticExposure ?? 0
  return roundUnit(Math.max(fear, memetic))
}

function resolveExposureReviewBand(
  aggregateExposurePressure: number | null,
  memoryImpairmentBand: CognitiveHazardMemoryImpairmentBand,
  countermeasureFailed: boolean,
  policy: CognitiveHazardProjectionPolicy
): CognitiveHazardExposureReviewBand {
  const elevatedThreshold =
    typeof policy.elevatedExposureThreshold === 'number' &&
    Number.isFinite(policy.elevatedExposureThreshold)
      ? clampUnit(policy.elevatedExposureThreshold)
      : DEFAULT_ELEVATED_EXPOSURE_THRESHOLD

  const criticalThreshold =
    typeof policy.criticalExposureThreshold === 'number' &&
    Number.isFinite(policy.criticalExposureThreshold)
      ? clampUnit(policy.criticalExposureThreshold)
      : DEFAULT_CRITICAL_EXPOSURE_THRESHOLD

  if (
    memoryImpairmentBand === 'erased' ||
    countermeasureFailed ||
    (aggregateExposurePressure !== null && aggregateExposurePressure >= criticalThreshold)
  ) {
    return 'critical'
  }

  if (
    ADVANCED_MEMORY_IMPAIRMENT_BANDS.has(memoryImpairmentBand) ||
    (aggregateExposurePressure !== null && aggregateExposurePressure >= elevatedThreshold)
  ) {
    return 'elevated'
  }

  return 'stable'
}

function resolveKnowledgeIntegrityDegraded(
  record: CognitiveHazardExposureRecord
): boolean {
  if (record.knowledgeIntegrityDegraded === true) {
    return true
  }

  return (
    record.memoryImpairmentBand === 'fragmented' ||
    record.memoryImpairmentBand === 'compromised' ||
    record.memoryImpairmentBand === 'erased'
  )
}

function resolveAgentDutyDegraded(record: CognitiveHazardExposureRecord): boolean {
  if (record.agentDutyDegraded === true) {
    return true
  }

  return (
    record.memoryImpairmentBand === 'compromised' ||
    record.memoryImpairmentBand === 'erased' ||
    record.countermeasurePosture === 'failed'
  )
}

function resolveProcedureRestrictionActive(record: CognitiveHazardExposureRecord): boolean {
  if (record.procedureRestrictionActive === true) {
    return true
  }

  return (
    record.countermeasurePosture === 'procedure_restricted' ||
    record.countermeasurePosture === 'shielding_active'
  )
}

// ---------------------------------------------------------------------------
// Sibling attach helper
// ---------------------------------------------------------------------------

/** Maps SPE-2108 propagation resistance tags onto engine trigger channels. */
export function inferTriggerChannelsFromPropagationResistance(
  tags: readonly PropagationResistanceTag[] | undefined
): readonly CognitiveHazardTriggerChannel[] {
  const channels = new Set<CognitiveHazardTriggerChannel>()

  for (const tag of tags ?? []) {
    const mapped = PROPAGATION_TO_TRIGGER_CHANNEL[tag]
    if (mapped) {
      channels.add(mapped)
    }
  }

  return Object.freeze(
    [...channels].sort((left, right) => left.localeCompare(right))
  )
}

// ---------------------------------------------------------------------------
// Validation + projection API
// ---------------------------------------------------------------------------

export function validateCognitiveHazardExposureRecord(
  record: CognitiveHazardExposureRecord
): CognitiveHazardValidationResult {
  const issues: CognitiveHazardValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)
  const subjectRef = normalizeToken(record.subjectRef)

  if (id.length === 0) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Cognitive hazard exposure record is missing id.',
    })
  }

  if (label.length === 0) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Cognitive hazard exposure record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (subjectRef.length === 0) {
    pushIssue(issues, {
      code: 'missing_subject_ref',
      severity: 'error',
      detail: 'Cognitive hazard exposure record is missing subjectRef.',
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const channel of record.activeTriggerChannels ?? []) {
    if (!TRIGGER_CHANNEL_SET.has(channel)) {
      pushIssue(issues, {
        code: 'invalid_trigger_channel',
        severity: 'error',
        detail: `Cognitive hazard exposure record has invalid trigger channel ${String(channel)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isValidUnitScore(record.fearPressure)) {
    pushIssue(issues, {
      code: 'invalid_fear_pressure',
      severity: 'error',
      detail: 'Cognitive hazard exposure record fearPressure must be a finite unit score in 0..1.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidUnitScore(record.memeticExposure)) {
    pushIssue(issues, {
      code: 'invalid_memetic_exposure',
      severity: 'error',
      detail: 'Cognitive hazard exposure record memeticExposure must be a finite unit score in 0..1.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!MEMORY_IMPAIRMENT_BAND_SET.has(record.memoryImpairmentBand)) {
    pushIssue(issues, {
      code: 'invalid_memory_impairment_band',
      severity: 'error',
      detail: `Cognitive hazard exposure record has invalid memoryImpairmentBand ${String(record.memoryImpairmentBand)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!COUNTERMEASURE_POSTURE_SET.has(record.countermeasurePosture)) {
    pushIssue(issues, {
      code: 'invalid_countermeasure_posture',
      severity: 'error',
      detail: `Cognitive hazard exposure record has invalid countermeasurePosture ${String(record.countermeasurePosture)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: 'Cognitive hazard exposure record confidence must be a finite unit score in 0..1.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.countermeasurePosture === 'failed' &&
    asStringArray(record.countermeasureRefs).length === 0
  ) {
    pushIssue(issues, {
      code: 'failed_countermeasure_without_refs',
      severity: 'warning',
      detail:
        'Cognitive hazard exposure record countermeasurePosture is failed without countermeasureRefs.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.memoryImpairmentBand === 'erased' &&
    record.knowledgeIntegrityDegraded !== true
  ) {
    pushIssue(issues, {
      code: 'erased_memory_without_knowledge_degradation',
      severity: 'warning',
      detail:
        'Cognitive hazard exposure record memoryImpairmentBand is erased without knowledgeIntegrityDegraded flag.',
      relatedIds: id ? [id] : undefined,
    })
  }

  scanForbiddenTokens(issues, id, label, record)

  return freezeValidationResult(issues)
}

/** Projects unified cognitive hazard exposure review from a validated record shape. */
export function projectCognitiveHazardExposureReview(
  record: CognitiveHazardExposureRecord,
  policy: CognitiveHazardProjectionPolicy = {}
): CognitiveHazardExposureReview {
  const activeTriggerChannels = sortedTriggerChannels(record.activeTriggerChannels)
  const fearPressure = resolveOptionalUnitScore(record, 'fearPressure', policy)
  const memeticExposure = resolveOptionalUnitScore(record, 'memeticExposure', policy)
  const aggregateExposurePressure = resolveAggregateExposurePressure(fearPressure, memeticExposure)
  const countermeasureFailed = record.countermeasurePosture === 'failed'
  const countermeasureShieldingActive =
    record.countermeasurePosture === 'shielding_active' ||
    record.countermeasurePosture === 'procedure_restricted'
  const memoryImpairmentAdvanced = ADVANCED_MEMORY_IMPAIRMENT_BANDS.has(
    record.memoryImpairmentBand
  )
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = sortedStringArray(record.unknownFields)

  return Object.freeze({
    recordId: record.id,
    label: record.label,
    subjectRef: record.subjectRef,
    activeTriggerChannels,
    triggerChannelLabels: Object.freeze(
      activeTriggerChannels.map((channel) => formatTriggerChannelLabel(channel))
    ),
    fearPressure,
    memeticExposure,
    aggregateExposurePressure,
    memoryImpairmentBand: record.memoryImpairmentBand,
    memoryImpairmentAdvanced,
    countermeasurePosture: record.countermeasurePosture,
    countermeasureFailed,
    countermeasureShieldingActive,
    exposureReviewBand: resolveExposureReviewBand(
      aggregateExposurePressure,
      record.memoryImpairmentBand,
      countermeasureFailed,
      policy
    ),
    agentDutyDegraded: resolveAgentDutyDegraded(record),
    knowledgeIntegrityDegraded: resolveKnowledgeIntegrityDegraded(record),
    procedureRestrictionActive: resolveProcedureRestrictionActive(record),
    confidence: resolveConfidence(record, policy),
    redacted: redactedFields.size > 0,
    unknownFields,
  })
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const COGNITIVE_HAZARD_STABLE_SUBJECT_FIXTURE: CognitiveHazardExposureRecord =
  Object.freeze({
    id: 'cognitive-hazard:stable-subject-1',
    label: 'Stable briefing-room exposure profile',
    subjectRef: 'agent:field-analyst-7',
    activeTriggerChannels: Object.freeze(['reference_description'] as const),
    fearPressure: 0.12,
    memeticExposure: 0.08,
    memoryImpairmentBand: 'intact',
    countermeasurePosture: 'none',
    confidence: 0.82,
  })

export const COGNITIVE_HAZARD_MEMETIC_ESCALATION_FIXTURE: CognitiveHazardExposureRecord =
  Object.freeze({
    id: 'cognitive-hazard:memetic-escalation-1',
    label: 'Elevated memetic contact profile',
    summary: 'Repeated direct and descriptive exposure without shielding.',
    subjectRef: 'agent:containment-liaison-3',
    activeTriggerChannels: Object.freeze([
      'direct_perception',
      'reference_description',
    ] as const),
    fearPressure: 0.58,
    memeticExposure: 0.71,
    memoryImpairmentBand: 'fragmented',
    countermeasurePosture: 'mnestic_reinforcement',
    countermeasureRefs: Object.freeze(['procedure:mnestic-reinforcement-cycle-2'] as const),
    knowledgeIntegrityDegraded: true,
    confidence: 0.64,
  })

export const COGNITIVE_HAZARD_FAILED_COUNTERMEASURE_FIXTURE: CognitiveHazardExposureRecord =
  Object.freeze({
    id: 'cognitive-hazard:failed-countermeasure-1',
    label: 'Failed amnestic protocol exposure profile',
    subjectRef: 'agent:archive-clerk-11',
    activeTriggerChannels: Object.freeze([
      'memory_interaction',
      'recording_mediated',
    ] as const),
    fearPressure: 0.41,
    memeticExposure: 0.86,
    memoryImpairmentBand: 'erased',
    countermeasurePosture: 'failed',
    knowledgeIntegrityDegraded: true,
    agentDutyDegraded: true,
    procedureRestrictionActive: true,
    confidence: 0.39,
  })
