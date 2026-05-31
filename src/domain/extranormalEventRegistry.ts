/**
 * SPE-2105 slice 1: extranormal event registry for brief incident intake.
 *
 * Pure deterministic registry for short-lived incidents resolved through cover-up,
 * monitoring windows, and record repair — distinct from full case lifecycle.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ExtranormalEventId = string

export type EffectDomainTag =
  | 'biological'
  | 'spatial'
  | 'temporal'
  | 'media'
  | 'cognitive'
  | 'animal'
  | 'environmental'
  | 'infrastructural'
  | 'jurisdictional'
  | 'record_affecting'

export const EFFECT_DOMAIN_TAGS: readonly EffectDomainTag[] = [
  'biological',
  'spatial',
  'temporal',
  'media',
  'cognitive',
  'animal',
  'environmental',
  'infrastructural',
  'jurisdictional',
  'record_affecting',
] as const

export type AffectedAreaGeometry =
  | 'point'
  | 'room'
  | 'building'
  | 'route'
  | 'radius'
  | 'civic_boundary'
  | 'river'
  | 'broadcast_reach'
  | 'species_wide'
  | 'worldwide'

export const AFFECTED_AREA_GEOMETRIES: readonly AffectedAreaGeometry[] = [
  'point',
  'room',
  'building',
  'route',
  'radius',
  'civic_boundary',
  'river',
  'broadcast_reach',
  'species_wide',
  'worldwide',
] as const

export type PopulationSelectorKind =
  | 'location'
  | 'role'
  | 'name'
  | 'species'
  | 'staff'
  | 'viewer'
  | 'memory_state'

export const POPULATION_SELECTOR_KINDS: readonly PopulationSelectorKind[] = [
  'location',
  'role',
  'name',
  'species',
  'staff',
  'viewer',
  'memory_state',
] as const

export type EvidenceType =
  | 'witness_statement'
  | 'media_capture'
  | 'physical_trace'
  | 'sensor_reading'
  | 'record_anomaly'
  | 'corroborating_document'

export const EVIDENCE_TYPES: readonly EvidenceType[] = [
  'witness_statement',
  'media_capture',
  'physical_trace',
  'sensor_reading',
  'record_anomaly',
  'corroborating_document',
] as const

export type WitnessResponseClass =
  | 'cooperative'
  | 'evasive'
  | 'unavailable'
  | 'compromised'
  | 'fabricated'

export const WITNESS_RESPONSE_CLASSES: readonly WitnessResponseClass[] = [
  'cooperative',
  'evasive',
  'unavailable',
  'compromised',
  'fabricated',
] as const

export type ExtranormalClosureState =
  | 'sourceless_closed'
  | 'escalated_to_case'
  | 'unrecovered_followup'
  | 'monitor_only'
  | 'public_hoax_left'

export const EXTRANORMAL_CLOSURE_STATES: readonly ExtranormalClosureState[] = [
  'sourceless_closed',
  'escalated_to_case',
  'unrecovered_followup',
  'monitor_only',
  'public_hoax_left',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface OccurrenceWindow {
  readonly startWeek?: number
  readonly endWeek?: number
  readonly intervalToken?: string
}

export interface PopulationSelector {
  readonly kind: PopulationSelectorKind
  readonly value: string
}

export interface SimilarEventClusterRef {
  readonly eventId: ExtranormalEventId
  readonly confidence?: number
}

export interface ExtranormalEventRecord {
  readonly id: ExtranormalEventId
  readonly label: string
  readonly occurrenceWindow: OccurrenceWindow
  readonly effectDomainTags: readonly EffectDomainTag[]
  readonly affectedAreaGeometry: AffectedAreaGeometry
  readonly populationSelectors: readonly PopulationSelector[]
  readonly evidenceTypes?: readonly EvidenceType[]
  readonly coverStoryCode?: string
  readonly witnessPlan?: string
  readonly witnessResponseClass?: WitnessResponseClass
  readonly monitoringUntilWeek?: number
  readonly closureState?: ExtranormalClosureState
  readonly resolved?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
  readonly similarEventCluster?: readonly SimilarEventClusterRef[]
  readonly escalatedCaseRef?: string
  readonly observerClassTags?: readonly string[]
  readonly themeRef?: string
  readonly dangerProfileRef?: string
  readonly procedurePatternRefs?: readonly string[]
  readonly locationTag?: string
  readonly summary?: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ExtranormalEventValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_occurrence_window'
  | 'invalid_effect_domain_tag'
  | 'invalid_affected_area_geometry'
  | 'invalid_population_selector_kind'
  | 'empty_population_selector_value'
  | 'invalid_evidence_type'
  | 'invalid_witness_response_class'
  | 'invalid_closure_state'
  | 'invalid_confidence'
  | 'invalid_cluster_confidence'
  | 'empty_cluster_event_id'
  | 'cover_story_without_witness_plan'
  | 'monitoring_without_closure_state'
  | 'similarity_cluster_without_confidence'
  | 'escalated_to_case_missing_target'
  | 'closure_collapse'

export interface ExtranormalEventValidationIssue {
  readonly code: ExtranormalEventValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface ExtranormalEventValidationResult {
  readonly valid: boolean
  readonly issues: readonly ExtranormalEventValidationIssue[]
}

// ---------------------------------------------------------------------------
// Map projection
// ---------------------------------------------------------------------------

export interface ExtranormalEventMapProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressRedactedLocation?: boolean
}

export interface ExtranormalEventMapProjection {
  readonly eventId: ExtranormalEventId
  readonly locationTag: string | null
  readonly affectedAreaGeometry: AffectedAreaGeometry
  readonly confidence: number | null
  readonly redacted: boolean
  readonly unknownFields: readonly string[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const EFFECT_DOMAIN_TAG_SET = new Set<string>(EFFECT_DOMAIN_TAGS)
const AFFECTED_AREA_GEOMETRY_SET = new Set<string>(AFFECTED_AREA_GEOMETRIES)
const POPULATION_SELECTOR_KIND_SET = new Set<string>(POPULATION_SELECTOR_KINDS)
const EVIDENCE_TYPE_SET = new Set<string>(EVIDENCE_TYPES)
const WITNESS_RESPONSE_CLASS_SET = new Set<string>(WITNESS_RESPONSE_CLASSES)
const CLOSURE_STATE_SET = new Set<string>(EXTRANORMAL_CLOSURE_STATES)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
    (left, right) => left.localeCompare(right)
  )
}

function pushIssue(
  issues: ExtranormalEventValidationIssue[],
  issue: ExtranormalEventValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: ExtranormalEventValidationIssue[]) {
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

function isFiniteWeek(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value === Math.trunc(value)
}

function isValidConfidence(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function hasOccurrenceWindow(window: OccurrenceWindow | null | undefined): boolean {
  if (!window || typeof window !== 'object') {
    return false
  }

  const intervalToken = normalizeToken(window.intervalToken)
  if (intervalToken) {
    return true
  }

  return isFiniteWeek(window.startWeek)
}

function freezeValidationResult(
  issues: ExtranormalEventValidationIssue[]
): ExtranormalEventValidationResult {
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

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isEffectDomainTag(value: string): value is EffectDomainTag {
  return EFFECT_DOMAIN_TAG_SET.has(value)
}

export function isAffectedAreaGeometry(value: string): value is AffectedAreaGeometry {
  return AFFECTED_AREA_GEOMETRY_SET.has(value)
}

export function isPopulationSelectorKind(value: string): value is PopulationSelectorKind {
  return POPULATION_SELECTOR_KIND_SET.has(value)
}

export function isEvidenceType(value: string): value is EvidenceType {
  return EVIDENCE_TYPE_SET.has(value)
}

export function isWitnessResponseClass(value: string): value is WitnessResponseClass {
  return WITNESS_RESPONSE_CLASS_SET.has(value)
}

export function isExtranormalClosureState(value: string): value is ExtranormalClosureState {
  return CLOSURE_STATE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateExtranormalEventRecord(
  record: ExtranormalEventRecord
): ExtranormalEventValidationResult {
  const issues: ExtranormalEventValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Extranormal event record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Extranormal event record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!hasOccurrenceWindow(record.occurrenceWindow)) {
    pushIssue(issues, {
      code: 'invalid_occurrence_window',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} requires startWeek or intervalToken.`,
      relatedIds: id ? [id] : undefined,
    })
  } else {
    const { startWeek, endWeek } = record.occurrenceWindow ?? {}
    if (startWeek !== undefined && !isFiniteWeek(startWeek)) {
      pushIssue(issues, {
        code: 'invalid_occurrence_window',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} has invalid startWeek.`,
        relatedIds: id ? [id] : undefined,
      })
    }
    if (endWeek !== undefined && !isFiniteWeek(endWeek)) {
      pushIssue(issues, {
        code: 'invalid_occurrence_window',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} has invalid endWeek.`,
        relatedIds: id ? [id] : undefined,
      })
    }
    if (
      isFiniteWeek(startWeek) &&
      isFiniteWeek(endWeek) &&
      endWeek < startWeek
    ) {
      pushIssue(issues, {
        code: 'invalid_occurrence_window',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} endWeek precedes startWeek.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const tag of record.effectDomainTags ?? []) {
    if (!isEffectDomainTag(tag)) {
      pushIssue(issues, {
        code: 'invalid_effect_domain_tag',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} has invalid effectDomainTag ${String(tag)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isAffectedAreaGeometry(record.affectedAreaGeometry)) {
    pushIssue(issues, {
      code: 'invalid_affected_area_geometry',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} has invalid affectedAreaGeometry ${String(record.affectedAreaGeometry)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const selector of record.populationSelectors ?? []) {
    if (!isPopulationSelectorKind(selector.kind)) {
      pushIssue(issues, {
        code: 'invalid_population_selector_kind',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} has invalid population selector kind ${String(selector.kind)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!normalizeToken(selector.value)) {
      pushIssue(issues, {
        code: 'empty_population_selector_value',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} declares an empty population selector value.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const evidenceType of record.evidenceTypes ?? []) {
    if (!isEvidenceType(evidenceType)) {
      pushIssue(issues, {
        code: 'invalid_evidence_type',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} has invalid evidenceType ${String(evidenceType)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (
    record.witnessResponseClass !== undefined &&
    !isWitnessResponseClass(record.witnessResponseClass)
  ) {
    pushIssue(issues, {
      code: 'invalid_witness_response_class',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} has invalid witnessResponseClass ${String(record.witnessResponseClass)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.closureState !== undefined && !isExtranormalClosureState(record.closureState)) {
    pushIssue(issues, {
      code: 'invalid_closure_state',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} has invalid closureState ${String(record.closureState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidConfidence(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const coverStoryCode = normalizeToken(record.coverStoryCode ?? '')
  const witnessPlan = normalizeToken(record.witnessPlan ?? '')

  if (coverStoryCode && !witnessPlan) {
    pushIssue(issues, {
      code: 'cover_story_without_witness_plan',
      severity: 'warning',
      detail: `Extranormal event ${id || '(unknown)'} declares coverStoryCode without witnessPlan.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.monitoringUntilWeek !== undefined && record.closureState === undefined) {
    pushIssue(issues, {
      code: 'monitoring_without_closure_state',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} declares monitoringUntilWeek without closureState.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.monitoringUntilWeek !== undefined &&
    !isFiniteWeek(record.monitoringUntilWeek)
  ) {
    pushIssue(issues, {
      code: 'invalid_occurrence_window',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} has invalid monitoringUntilWeek.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  const cluster = record.similarEventCluster ?? []
  if (cluster.length > 0 && record.confidence === undefined) {
    pushIssue(issues, {
      code: 'similarity_cluster_without_confidence',
      severity: 'warning',
      detail: `Extranormal event ${id || '(unknown)'} links similar events without record confidence.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const ref of cluster) {
    const clusterId = normalizeToken(ref.eventId)
    if (!clusterId) {
      pushIssue(issues, {
        code: 'empty_cluster_event_id',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} declares an empty similar-event cluster ref.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (ref.confidence !== undefined && !isValidConfidence(ref.confidence)) {
      pushIssue(issues, {
        code: 'invalid_cluster_confidence',
        severity: 'error',
        detail: `Extranormal event ${id || '(unknown)'} cluster ref ${clusterId} has invalid confidence.`,
        relatedIds: uniqueSorted([id, clusterId]),
      })
    }
  }

  if (record.closureState === 'escalated_to_case' && !normalizeToken(record.escalatedCaseRef ?? '')) {
    pushIssue(issues, {
      code: 'escalated_to_case_missing_target',
      severity: 'error',
      detail: `Extranormal event ${id || '(unknown)'} with escalated_to_case requires escalatedCaseRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.resolved === true &&
    !coverStoryCode &&
    record.monitoringUntilWeek === undefined
  ) {
    pushIssue(issues, {
      code: 'closure_collapse',
      severity: 'warning',
      detail: `Extranormal event ${id || '(unknown)'} is resolved without coverStoryCode or monitoringUntilWeek.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects record-derived location and confidence for map surfaces.
 * Does not assert objective truth — only what the record declares.
 */
export function projectExtranormalEventForMap(
  record: ExtranormalEventRecord,
  policy: ExtranormalEventMapProjectionPolicy = {}
): ExtranormalEventMapProjection {
  const redactedFields = new Set(record.redactedFields ?? [])
  const unknownFields = Object.freeze([...(record.unknownFields ?? [])].sort((a, b) => a.localeCompare(b)))

  const locationRedacted =
    redactedFields.has('locationTag') ||
    (policy.suppressRedactedLocation === true && redactedFields.has('location'))
  const locationTag = locationRedacted ? null : normalizeToken(record.locationTag ?? '') || null

  let confidence = record.confidence ?? null
  if (redactedFields.has('confidence')) {
    confidence = null
  } else if (
    confidence !== null &&
    policy.minimumConfidence !== undefined &&
    confidence < policy.minimumConfidence
  ) {
    confidence = null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    confidence = null
  }

  const redacted =
    locationRedacted ||
    redactedFields.has('confidence') ||
    (confidence === null && record.confidence !== undefined && policy.minimumConfidence !== undefined)

  return Object.freeze({
    eventId: normalizeToken(record.id) || '(unknown)',
    locationTag,
    affectedAreaGeometry: record.affectedAreaGeometry,
    confidence,
    redacted,
    unknownFields,
  })
}

function defineEvent(record: ExtranormalEventRecord): ExtranormalEventRecord {
  return Object.freeze({ ...record })
}

/** Brief incident resolved via cover story and six-month monitoring window. */
export const BRIEF_COVER_UP_EVENT_FIXTURE: ExtranormalEventRecord = defineEvent({
  id: 'event:brief-reservoir-glow',
  label: 'Reservoir perimeter glow',
  summary: 'Short-lived luminous disturbance near municipal intake; no persistent object secured.',
  occurrenceWindow: { startWeek: 12, endWeek: 12 },
  effectDomainTags: ['environmental', 'media', 'record_affecting'],
  affectedAreaGeometry: 'radius',
  populationSelectors: [
    { kind: 'location', value: 'north-reservoir-ring' },
    { kind: 'viewer', value: 'night-shift-utility' },
  ],
  evidenceTypes: ['witness_statement', 'media_capture'],
  coverStoryCode: 'maintenance-lamp-test',
  witnessPlan: 'utility-crew-debrief',
  witnessResponseClass: 'cooperative',
  monitoringUntilWeek: 38,
  closureState: 'sourceless_closed',
  resolved: true,
  confidence: 0.62,
  locationTag: 'site:north-reservoir',
})

/** Paired cluster member — linked without shared_source_id or causation claim. */
export const CLUSTER_SIBLING_EVENT_FIXTURE: ExtranormalEventRecord = defineEvent({
  id: 'event:brief-canal-shimmer',
  label: 'Canal shimmer echo',
  summary: 'Similar luminous pattern reported downstream one week later.',
  occurrenceWindow: { startWeek: 13, endWeek: 13 },
  effectDomainTags: ['environmental', 'spatial'],
  affectedAreaGeometry: 'river',
  populationSelectors: [{ kind: 'location', value: 'east-canal-span' }],
  evidenceTypes: ['witness_statement'],
  coverStoryCode: 'atmospheric-refraction-advisory',
  witnessPlan: 'canal-patrol-debrief',
  closureState: 'sourceless_closed',
  resolved: true,
  confidence: 0.48,
  similarEventCluster: [{ eventId: 'event:brief-reservoir-glow', confidence: 0.41 }],
  locationTag: 'site:east-canal',
})

export const BRIEF_COVER_UP_EVENT_WITH_CLUSTER: ExtranormalEventRecord = defineEvent({
  ...BRIEF_COVER_UP_EVENT_FIXTURE,
  similarEventCluster: [{ eventId: 'event:brief-canal-shimmer', confidence: 0.39 }],
  observerClassTags: ['civilian-witness'],
  themeRef: 'theme:luminous-water-disturbance',
  dangerProfileRef: 'danger:low-transient-glow',
  procedurePatternRefs: ['procedure:cover-story-monitoring'],
})
