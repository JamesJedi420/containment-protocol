/**
 * SPE-2106 slice 1: unexplained location registry for low-threat site intake.
 *
 * Pure deterministic registry for persistent anomalous places warranting securing
 * and cover-up below full containment-project priority — distinct from minor objects,
 * brief events, and full facility/case lifecycle.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type UnexplainedLocationId = string

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

export type EffectGeometry =
  | 'point'
  | 'room'
  | 'building'
  | 'route'
  | 'radius'
  | 'volume'
  | 'civic_boundary'
  | 'orbital_zone'

export const EFFECT_GEOMETRIES: readonly EffectGeometry[] = [
  'point',
  'room',
  'building',
  'route',
  'radius',
  'volume',
  'civic_boundary',
  'orbital_zone',
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

export type SecurityControlTag =
  | 'physical_exclusion'
  | 'legal_ownership'
  | 'public_cover'
  | 'sensor_monitoring'
  | 'staff_presence'
  | 'map_manipulation'
  | 'minimal_response'

export const SECURITY_CONTROL_TAGS: readonly SecurityControlTag[] = [
  'physical_exclusion',
  'legal_ownership',
  'public_cover',
  'sensor_monitoring',
  'staff_presence',
  'map_manipulation',
  'minimal_response',
] as const

export type UnexplainedLocationLifecycleState =
  | 'active'
  | 'monitor_only'
  | 'utility_use'
  | 'public_managed'
  | 'neutralized'
  | 'archived'
  | 'destroyed'
  | 'disputed'
  | 'pending_reactivation'

export const UNEXPLAINED_LOCATION_LIFECYCLE_STATES: readonly UnexplainedLocationLifecycleState[] =
  [
    'active',
    'monitor_only',
    'utility_use',
    'public_managed',
    'neutralized',
    'archived',
    'destroyed',
    'disputed',
    'pending_reactivation',
  ] as const

export type UnexplainedLocationMapLayer = 'public' | 'agency' | 'sensor' | 'inferred_route'

export const UNEXPLAINED_LOCATION_MAP_LAYERS: readonly UnexplainedLocationMapLayer[] = [
  'public',
  'agency',
  'sensor',
  'inferred_route',
] as const

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PopulationSelector {
  readonly kind: PopulationSelectorKind
  readonly value: string
}

export interface UnexplainedLocationStatusHistoryEntry {
  readonly fromState: UnexplainedLocationLifecycleState
  readonly toState: UnexplainedLocationLifecycleState
  readonly week: number
  readonly note?: string
}

export interface UnexplainedLocationUpdateLedgerEntry {
  readonly week: number
  readonly field: string
  readonly note?: string
}

export interface UnexplainedLocationRecord {
  readonly id: UnexplainedLocationId
  readonly label: string
  readonly descriptionStub?: string
  readonly effectGeometry: EffectGeometry
  readonly effectDomainTags: readonly EffectDomainTag[]
  readonly populationSelectors: readonly PopulationSelector[]
  readonly discoveryWeek?: number
  readonly containmentWeek?: number
  readonly securityControlTags?: readonly SecurityControlTag[]
  readonly coverStoryCode?: string
  readonly monitoringCadenceWeeks?: number
  readonly lifecycleState: UnexplainedLocationLifecycleState
  readonly latentSeverityScore: number
  readonly accessProbability?: number
  readonly lowPriority?: boolean
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
  readonly disputedFields?: readonly string[]
  readonly contradictionRefs?: readonly string[]
  readonly neutralizationAuthorizationRef?: string
  readonly mapLayerPolicy?: string
  readonly locationTag?: string
  readonly intakeTopicRef?: string
  readonly statusHistory?: readonly UnexplainedLocationStatusHistoryEntry[]
  readonly updateLedger?: readonly UnexplainedLocationUpdateLedgerEntry[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type UnexplainedLocationValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_effect_geometry'
  | 'invalid_effect_domain_tag'
  | 'invalid_population_selector_kind'
  | 'empty_population_selector_value'
  | 'invalid_security_control_tag'
  | 'invalid_lifecycle_state'
  | 'invalid_latent_severity_score'
  | 'invalid_access_probability'
  | 'invalid_confidence'
  | 'invalid_discovery_week'
  | 'invalid_containment_week'
  | 'invalid_monitoring_cadence'
  | 'invalid_status_history_state'
  | 'invalid_status_history_week'
  | 'neutralized_without_authorization'
  | 'low_priority_without_latent_severity'
  | 'disputed_without_contradiction_refs'
  | 'map_suppression_without_layer_policy'
  | 'severity_underestimate'

export interface UnexplainedLocationValidationIssue {
  readonly code: UnexplainedLocationValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface UnexplainedLocationValidationResult {
  readonly valid: boolean
  readonly issues: readonly UnexplainedLocationValidationIssue[]
}

export interface UnexplainedLocationValidationPolicy {
  readonly requireNeutralizationAuthorization?: boolean
}

// ---------------------------------------------------------------------------
// Map projection
// ---------------------------------------------------------------------------

export interface UnexplainedLocationMapProjectionPolicy {
  readonly minimumConfidence?: number
  readonly redactUnknown?: boolean
  readonly suppressRedactedLocation?: boolean
}

export interface UnexplainedLocationMapLayerProjection {
  readonly layer: UnexplainedLocationMapLayer
  readonly locationTag: string | null
  readonly effectGeometry: EffectGeometry
  readonly confidence: number | null
  readonly suppressed: boolean
  readonly unknownFields: readonly string[]
}

export interface UnexplainedLocationMapProjection {
  readonly locationId: UnexplainedLocationId
  readonly layers: readonly UnexplainedLocationMapLayerProjection[]
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const EFFECT_DOMAIN_TAG_SET = new Set<string>(EFFECT_DOMAIN_TAGS)
const EFFECT_GEOMETRY_SET = new Set<string>(EFFECT_GEOMETRIES)
const POPULATION_SELECTOR_KIND_SET = new Set<string>(POPULATION_SELECTOR_KINDS)
const SECURITY_CONTROL_TAG_SET = new Set<string>(SECURITY_CONTROL_TAGS)
const LIFECYCLE_STATE_SET = new Set<string>(UNEXPLAINED_LOCATION_LIFECYCLE_STATES)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value : []
}

function asPopulationSelectors(value: unknown): readonly PopulationSelector[] {
  return Array.isArray(value) ? value : []
}

function asStatusHistory(
  value: unknown
): readonly UnexplainedLocationStatusHistoryEntry[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: UnexplainedLocationValidationIssue[],
  issue: UnexplainedLocationValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: UnexplainedLocationValidationIssue[]) {
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

function isValidUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function isValidSeverityScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function freezeValidationResult(
  issues: UnexplainedLocationValidationIssue[]
): UnexplainedLocationValidationResult {
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

function hasSecurityTag(
  record: UnexplainedLocationRecord,
  tag: SecurityControlTag
): boolean {
  return asStringArray(record.securityControlTags).includes(tag)
}

function resolveConfidence(
  record: UnexplainedLocationRecord,
  policy: UnexplainedLocationMapProjectionPolicy
): number | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const unknownFields = asStringArray(record.unknownFields)

  if (redactedFields.has('confidence')) {
    return null
  }

  const confidence = record.confidence ?? null
  if (confidence !== null && policy.minimumConfidence !== undefined && confidence < policy.minimumConfidence) {
    return null
  }

  if (policy.redactUnknown === true && unknownFields.includes('confidence')) {
    return null
  }

  return confidence
}

function resolveLocationTag(
  record: UnexplainedLocationRecord,
  policy: UnexplainedLocationMapProjectionPolicy
): string | null {
  const redactedFields = new Set(asStringArray(record.redactedFields))
  const locationRedacted =
    redactedFields.has('locationTag') ||
    (policy.suppressRedactedLocation === true && redactedFields.has('location'))

  if (locationRedacted) {
    return null
  }

  return normalizeToken(record.locationTag ?? '') || null
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isEffectDomainTag(value: string): value is EffectDomainTag {
  return EFFECT_DOMAIN_TAG_SET.has(value)
}

export function isEffectGeometry(value: string): value is EffectGeometry {
  return EFFECT_GEOMETRY_SET.has(value)
}

export function isPopulationSelectorKind(value: string): value is PopulationSelectorKind {
  return POPULATION_SELECTOR_KIND_SET.has(value)
}

export function isSecurityControlTag(value: string): value is SecurityControlTag {
  return SECURITY_CONTROL_TAG_SET.has(value)
}

export function isUnexplainedLocationLifecycleState(
  value: string
): value is UnexplainedLocationLifecycleState {
  return LIFECYCLE_STATE_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateUnexplainedLocationRecord(
  record: UnexplainedLocationRecord,
  policy: UnexplainedLocationValidationPolicy = {}
): UnexplainedLocationValidationResult {
  const issues: UnexplainedLocationValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Unexplained location record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Unexplained location record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isEffectGeometry(record.effectGeometry)) {
    pushIssue(issues, {
      code: 'invalid_effect_geometry',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} has invalid effectGeometry ${String(record.effectGeometry)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const tag of asStringArray(record.effectDomainTags)) {
    if (!isEffectDomainTag(tag)) {
      pushIssue(issues, {
        code: 'invalid_effect_domain_tag',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} has invalid effectDomainTag ${String(tag)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const selector of asPopulationSelectors(record.populationSelectors)) {
    if (!selector || typeof selector !== 'object') {
      pushIssue(issues, {
        code: 'invalid_population_selector_kind',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} has invalid population selector entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isPopulationSelectorKind(selector.kind)) {
      pushIssue(issues, {
        code: 'invalid_population_selector_kind',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} has invalid population selector kind ${String(selector.kind)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!normalizeToken(selector.value)) {
      pushIssue(issues, {
        code: 'empty_population_selector_value',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} declares an empty population selector value.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  for (const tag of asStringArray(record.securityControlTags)) {
    if (!isSecurityControlTag(tag)) {
      pushIssue(issues, {
        code: 'invalid_security_control_tag',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} has invalid securityControlTag ${String(tag)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (!isUnexplainedLocationLifecycleState(record.lifecycleState)) {
    pushIssue(issues, {
      code: 'invalid_lifecycle_state',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} has invalid lifecycleState ${String(record.lifecycleState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isValidSeverityScore(record.latentSeverityScore)) {
    pushIssue(issues, {
      code: 'invalid_latent_severity_score',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} latentSeverityScore must be a finite number between 0 and 100.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.accessProbability !== undefined && !isValidUnitInterval(record.accessProbability)) {
    pushIssue(issues, {
      code: 'invalid_access_probability',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} accessProbability must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitInterval(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.discoveryWeek !== undefined && !isFiniteWeek(record.discoveryWeek)) {
    pushIssue(issues, {
      code: 'invalid_discovery_week',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} has invalid discoveryWeek.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.containmentWeek !== undefined && !isFiniteWeek(record.containmentWeek)) {
    pushIssue(issues, {
      code: 'invalid_containment_week',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} has invalid containmentWeek.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.monitoringCadenceWeeks !== undefined &&
    (!isFiniteWeek(record.monitoringCadenceWeeks) || record.monitoringCadenceWeeks === 0)
  ) {
    pushIssue(issues, {
      code: 'invalid_monitoring_cadence',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} has invalid monitoringCadenceWeeks.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const entry of asStatusHistory(record.statusHistory)) {
    if (!entry || typeof entry !== 'object') {
      pushIssue(issues, {
        code: 'invalid_status_history_state',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} statusHistory contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    if (!isUnexplainedLocationLifecycleState(entry.fromState) || !isUnexplainedLocationLifecycleState(entry.toState)) {
      pushIssue(issues, {
        code: 'invalid_status_history_state',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} statusHistory contains invalid lifecycle state.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isFiniteWeek(entry.week)) {
      pushIssue(issues, {
        code: 'invalid_status_history_week',
        severity: 'error',
        detail: `Unexplained location ${id || '(unknown)'} statusHistory contains invalid week.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }

  if (
    record.lifecycleState === 'neutralized' &&
    policy.requireNeutralizationAuthorization === true &&
    !normalizeToken(record.neutralizationAuthorizationRef ?? '')
  ) {
    pushIssue(issues, {
      code: 'neutralized_without_authorization',
      severity: 'error',
      detail: `Unexplained location ${id || '(unknown)'} is neutralized without neutralizationAuthorizationRef.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.lowPriority === true && record.latentSeverityScore === undefined) {
    pushIssue(issues, {
      code: 'low_priority_without_latent_severity',
      severity: 'warning',
      detail: `Unexplained location ${id || '(unknown)'} is low_priority without latentSeverityScore.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.lifecycleState === 'disputed' &&
    asStringArray(record.contradictionRefs).every((ref) => !normalizeToken(ref))
  ) {
    pushIssue(issues, {
      code: 'disputed_without_contradiction_refs',
      severity: 'warning',
      detail: `Unexplained location ${id || '(unknown)'} is disputed without contradiction refs.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (hasSecurityTag(record, 'map_manipulation') && !normalizeToken(record.mapLayerPolicy ?? '')) {
    pushIssue(issues, {
      code: 'map_suppression_without_layer_policy',
      severity: 'warning',
      detail: `Unexplained location ${id || '(unknown)'} declares map_manipulation without mapLayerPolicy.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.lowPriority === true &&
    record.latentSeverityScore === 0 &&
    record.lifecycleState === 'public_managed'
  ) {
    pushIssue(issues, {
      code: 'severity_underestimate',
      severity: 'warning',
      detail: `Unexplained location ${id || '(unknown)'} low_priority with latentSeverityScore 0 under public_managed posture risks severity underestimate.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Projects record-derived location visibility across map layers.
 * Does not assert objective truth — only what the record declares.
 */
export function projectUnexplainedLocationForMap(
  record: UnexplainedLocationRecord,
  policy: UnexplainedLocationMapProjectionPolicy = {}
): UnexplainedLocationMapProjection {
  const locationId = normalizeToken(record.id) || '(unknown)'
  const locationTag = resolveLocationTag(record, policy)
  const confidence = resolveConfidence(record, policy)
  const unknownFields = Object.freeze(
    [...asStringArray(record.unknownFields)].sort((a, b) => a.localeCompare(b))
  )
  const mapSuppressed = hasSecurityTag(record, 'map_manipulation')

  const publicLayer = Object.freeze({
    layer: 'public' as const,
    locationTag: mapSuppressed || !hasSecurityTag(record, 'public_cover') ? null : locationTag,
    effectGeometry: record.effectGeometry,
    confidence: mapSuppressed ? null : confidence,
    suppressed: mapSuppressed,
    unknownFields,
  })

  const agencyLayer = Object.freeze({
    layer: 'agency' as const,
    locationTag,
    effectGeometry: record.effectGeometry,
    confidence,
    suppressed: false,
    unknownFields,
  })

  const sensorLayer = Object.freeze({
    layer: 'sensor' as const,
    locationTag: hasSecurityTag(record, 'sensor_monitoring') ? locationTag : null,
    effectGeometry: record.effectGeometry,
    confidence: hasSecurityTag(record, 'sensor_monitoring') ? confidence : null,
    suppressed: mapSuppressed && !hasSecurityTag(record, 'sensor_monitoring'),
    unknownFields,
  })

  const inferredRouteLayer = Object.freeze({
    layer: 'inferred_route' as const,
    locationTag:
      record.effectGeometry === 'route' && (record.accessProbability ?? 0) > 0 ? locationTag : null,
    effectGeometry: record.effectGeometry,
    confidence:
      record.effectGeometry === 'route' && (record.accessProbability ?? 0) > 0 ? confidence : null,
    suppressed: mapSuppressed && record.effectGeometry !== 'route',
    unknownFields,
  })

  return Object.freeze({
    locationId,
    layers: Object.freeze([publicLayer, agencyLayer, sensorLayer, inferredRouteLayer]),
  })
}

// ---------------------------------------------------------------------------
// Persistence (SPE-2106 slice 2)
// ---------------------------------------------------------------------------

export type UnexplainedLocationRecordsMap = Record<UnexplainedLocationId, UnexplainedLocationRecord>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function parseStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return uniqueSorted(
    value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry)
  )
}

function parseEffectDomainTags(value: unknown): readonly EffectDomainTag[] {
  if (!Array.isArray(value)) {
    return []
  }

  const tags: EffectDomainTag[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== 'string' || !isEffectDomainTag(entry) || seen.has(entry)) {
      continue
    }

    seen.add(entry)
    tags.push(entry)
  }

  return tags
}

function parsePopulationSelectors(value: unknown): readonly PopulationSelector[] {
  if (!Array.isArray(value)) {
    return []
  }

  const selectors: PopulationSelector[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const kind = typeof entry.kind === 'string' ? entry.kind : ''
    const selectorValue = normalizeToken(entry.value)
    if (!isPopulationSelectorKind(kind) || !selectorValue) {
      continue
    }

    const key = `${kind}:${selectorValue}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    selectors.push({ kind, value: selectorValue })
  }

  return selectors
}

function parseSecurityControlTags(value: unknown): readonly SecurityControlTag[] {
  if (!Array.isArray(value)) {
    return []
  }

  const tags: SecurityControlTag[] = []
  const seen = new Set<string>()

  for (const entry of value) {
    if (typeof entry !== 'string' || !isSecurityControlTag(entry) || seen.has(entry)) {
      continue
    }

    seen.add(entry)
    tags.push(entry)
  }

  return tags
}

function parseStatusHistory(value: unknown): readonly UnexplainedLocationStatusHistoryEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const history: UnexplainedLocationStatusHistoryEntry[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const fromState = typeof entry.fromState === 'string' ? entry.fromState : ''
    const toState = typeof entry.toState === 'string' ? entry.toState : ''
    const week = entry.week
    const note =
      typeof entry.note === 'string' && entry.note.trim().length > 0 ? entry.note.trim() : undefined

    if (
      !isUnexplainedLocationLifecycleState(fromState) ||
      !isUnexplainedLocationLifecycleState(toState) ||
      !isFiniteWeek(week)
    ) {
      continue
    }

    history.push({
      fromState,
      toState,
      week,
      ...(note ? { note } : {}),
    })
  }

  return history
}

function parseUpdateLedger(value: unknown): readonly UnexplainedLocationUpdateLedgerEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const ledger: UnexplainedLocationUpdateLedgerEntry[] = []

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue
    }

    const week = entry.week
    const field = normalizeToken(entry.field)
    const note =
      typeof entry.note === 'string' && entry.note.trim().length > 0 ? entry.note.trim() : undefined

    if (!isFiniteWeek(week) || !field) {
      continue
    }

    ledger.push({
      week,
      field,
      ...(note ? { note } : {}),
    })
  }

  return ledger
}

function sanitizeUnexplainedLocationRecordEntry(value: unknown): UnexplainedLocationRecord | null {
  if (!isRecord(value)) {
    return null
  }

  const id = normalizeToken(value.id)
  const label = normalizeToken(value.label)
  const effectGeometry = typeof value.effectGeometry === 'string' ? value.effectGeometry : ''
  const effectDomainTags = parseEffectDomainTags(value.effectDomainTags)
  const populationSelectors = parsePopulationSelectors(value.populationSelectors)
  const lifecycleState = typeof value.lifecycleState === 'string' ? value.lifecycleState : ''
  const latentSeverityScore = value.latentSeverityScore

  if (
    !id ||
    !label ||
    !isEffectGeometry(effectGeometry) ||
    !isUnexplainedLocationLifecycleState(lifecycleState) ||
    !isValidSeverityScore(latentSeverityScore)
  ) {
    return null
  }

  const securityControlTags = parseSecurityControlTags(value.securityControlTags)
  const statusHistory = parseStatusHistory(value.statusHistory)
  const updateLedger = parseUpdateLedger(value.updateLedger)
  const unknownFields = parseStringList(value.unknownFields)
  const redactedFields = parseStringList(value.redactedFields)
  const disputedFields = parseStringList(value.disputedFields)
  const contradictionRefs = parseStringList(value.contradictionRefs)

  const descriptionStub =
    typeof value.descriptionStub === 'string' && value.descriptionStub.trim().length > 0
      ? value.descriptionStub.trim()
      : undefined
  const coverStoryCode = normalizeToken(value.coverStoryCode ?? '') || undefined
  const mapLayerPolicy = normalizeToken(value.mapLayerPolicy ?? '') || undefined
  const locationTag = normalizeToken(value.locationTag ?? '') || undefined
  const intakeTopicRef = normalizeToken(value.intakeTopicRef ?? '') || undefined
  const neutralizationAuthorizationRef =
    normalizeToken(value.neutralizationAuthorizationRef ?? '') || undefined

  const discoveryWeek = value.discoveryWeek
  const containmentWeek = value.containmentWeek
  const monitoringCadenceWeeks = value.monitoringCadenceWeeks
  const accessProbability = value.accessProbability
  const confidence = value.confidence
  const lowPriority = value.lowPriority === true ? true : undefined

  const record: UnexplainedLocationRecord = {
    id,
    label,
    effectGeometry,
    effectDomainTags,
    populationSelectors,
    lifecycleState,
    latentSeverityScore,
    ...(descriptionStub ? { descriptionStub } : {}),
    ...(isFiniteWeek(discoveryWeek) ? { discoveryWeek } : {}),
    ...(isFiniteWeek(containmentWeek) ? { containmentWeek } : {}),
    ...(securityControlTags.length > 0 ? { securityControlTags } : {}),
    ...(coverStoryCode ? { coverStoryCode } : {}),
    ...(isFiniteWeek(monitoringCadenceWeeks) && monitoringCadenceWeeks !== 0
      ? { monitoringCadenceWeeks }
      : {}),
    ...(isValidUnitInterval(accessProbability) ? { accessProbability } : {}),
    ...(lowPriority ? { lowPriority } : {}),
    ...(isValidUnitInterval(confidence) ? { confidence } : {}),
    ...(unknownFields.length > 0 ? { unknownFields } : {}),
    ...(redactedFields.length > 0 ? { redactedFields } : {}),
    ...(disputedFields.length > 0 ? { disputedFields } : {}),
    ...(contradictionRefs.length > 0 ? { contradictionRefs } : {}),
    ...(neutralizationAuthorizationRef ? { neutralizationAuthorizationRef } : {}),
    ...(mapLayerPolicy ? { mapLayerPolicy } : {}),
    ...(locationTag ? { locationTag } : {}),
    ...(intakeTopicRef ? { intakeTopicRef } : {}),
    ...(statusHistory.length > 0 ? { statusHistory } : {}),
    ...(updateLedger.length > 0 ? { updateLedger } : {}),
  }

  if (!validateUnexplainedLocationRecord(record).valid) {
    return null
  }

  return record
}

/** Hydration: canonical location map keyed by location id; drops invalid and duplicate-id entries. */
export function sanitizeUnexplainedLocationRecords(
  value: unknown,
  fallback: UnexplainedLocationRecordsMap = {}
): UnexplainedLocationRecordsMap {
  if (!isRecord(value)) {
    return fallback
  }

  const next: UnexplainedLocationRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeUnexplainedLocationRecordEntry(entry)
    if (!record || seenIds.has(record.id)) {
      continue
    }

    seenIds.add(record.id)
    next[record.id] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

function defineLocation(record: UnexplainedLocationRecord): UnexplainedLocationRecord {
  return Object.freeze({ ...record })
}

/** Remote site under monitor-only posture with map suppression and low remote access probability. */
export const REMOTE_MONITOR_SITE_FIXTURE: UnexplainedLocationRecord = defineLocation({
  id: 'location:remote-ridge-station',
  label: 'Remote ridge relay station',
  descriptionStub: 'Persistent low-amplitude spatial drift near decommissioned relay hardware.',
  effectGeometry: 'radius',
  effectDomainTags: ['spatial', 'infrastructural'],
  populationSelectors: [
    { kind: 'location', value: 'north-ridge-relay' },
    { kind: 'staff', value: 'remote-inspection-crew' },
  ],
  discoveryWeek: 8,
  containmentWeek: 10,
  securityControlTags: [
    'physical_exclusion',
    'sensor_monitoring',
    'map_manipulation',
    'minimal_response',
  ],
  coverStoryCode: 'utility-relay-maintenance',
  monitoringCadenceWeeks: 4,
  lifecycleState: 'monitor_only',
  latentSeverityScore: 22,
  accessProbability: 0.08,
  lowPriority: true,
  confidence: 0.54,
  mapLayerPolicy: 'policy:public-map-suppress-north-ridge',
  locationTag: 'site:north-ridge-relay',
})

/** Lifecycle chain preserving append-only statusHistory across active → utility_use → archived. */
export const LIFECYCLE_CHAIN_LOCATION_FIXTURE: UnexplainedLocationRecord = defineLocation({
  id: 'location:canal-pump-house',
  label: 'Canal pump house annex',
  descriptionStub: 'Low-threat annex repurposed for municipal utility after perimeter securing.',
  effectGeometry: 'building',
  effectDomainTags: ['environmental', 'spatial'],
  populationSelectors: [{ kind: 'location', value: 'east-canal-pump-annex' }],
  discoveryWeek: 4,
  containmentWeek: 6,
  securityControlTags: ['physical_exclusion', 'public_cover', 'staff_presence'],
  coverStoryCode: 'municipal-pump-retrofit',
  monitoringCadenceWeeks: 12,
  lifecycleState: 'archived',
  latentSeverityScore: 18,
  accessProbability: 0.35,
  lowPriority: true,
  confidence: 0.71,
  locationTag: 'site:east-canal-pump',
  statusHistory: [
    { fromState: 'active', toState: 'utility_use', week: 14, note: 'Repurposed under utility cover.' },
    { fromState: 'utility_use', toState: 'archived', week: 52, note: 'Monitoring cadence retired.' },
  ],
})

/** Canal-bridge intake grid linked to mixed-source intake via intakeTopicRef. */
export const CANAL_BRIDGE_LOCATION_FIXTURE: UnexplainedLocationRecord = defineLocation({
  id: 'location:canal-bridge-intake-grid',
  label: 'East canal bridge intake grid',
  descriptionStub: 'Low-threat spatial drift zone near east canal lock intake hardware.',
  effectGeometry: 'building',
  effectDomainTags: ['spatial', 'environmental'],
  populationSelectors: [{ kind: 'location', value: 'east-canal-locker' }],
  discoveryWeek: 11,
  containmentWeek: 13,
  securityControlTags: ['physical_exclusion', 'sensor_monitoring', 'public_cover'],
  coverStoryCode: 'municipal-canal-maintenance',
  monitoringCadenceWeeks: 8,
  lifecycleState: 'active',
  latentSeverityScore: 16,
  accessProbability: 0.22,
  lowPriority: true,
  confidence: 0.49,
  locationTag: 'site:east-canal-locker',
  intakeTopicRef: 'topic:canal-bridge-incident',
})
