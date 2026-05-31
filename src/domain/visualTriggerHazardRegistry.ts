/**
 * SPE-2111 slice 1: visual-trigger hazard registry.
 *
 * Pure deterministic registry for anomalies whose hazardous feature propagates through
 * sight, recordings, and derivative media — plus exposure-created pursuit targets —
 * distinct from jump-scare chase logic and GameState persistence.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type VisualTriggerHazardId = string

export type TriggerMedium =
  | 'direct_sight'
  | 'photo'
  | 'video_frame'
  | 'thumbnail'
  | 'sensor_feed'
  | 'background_fragment'

export const TRIGGER_MEDIA: readonly TriggerMedium[] = [
  'direct_sight',
  'photo',
  'video_frame',
  'thumbnail',
  'sensor_feed',
  'background_fragment',
] as const

export type AwarenessRequirement =
  | 'conscious'
  | 'subconscious_retinal'
  | 'machine_preprocess'

export const AWARENESS_REQUIREMENTS: readonly AwarenessRequirement[] = [
  'conscious',
  'subconscious_retinal',
  'machine_preprocess',
] as const

export type DerivativeHazardProfile =
  | 'full'
  | 'partial'
  | 'artistic_exempt'
  | 'unknown'
  | 'distorted'
  | 'latent'

export const DERIVATIVE_HAZARD_PROFILES: readonly DerivativeHazardProfile[] = [
  'full',
  'partial',
  'artistic_exempt',
  'unknown',
  'distorted',
  'latent',
] as const

export type PursuitState = 'dormant' | 'distressed' | 'active_pursuit' | 'resolved'

export const PURSUIT_STATES: readonly PursuitState[] = [
  'dormant',
  'distressed',
  'active_pursuit',
  'resolved',
] as const

export type OcclusionState = 'exposed' | 'covered' | 'filtered'

export const OCCLUSION_STATES: readonly OcclusionState[] = [
  'exposed',
  'covered',
  'filtered',
] as const

export type ObserverAwarenessBand = 'unaware' | 'peripheral' | 'conscious' | 'heightened' | 'full'

export const OBSERVER_AWARENESS_BANDS: readonly ObserverAwarenessBand[] = [
  'unaware',
  'peripheral',
  'conscious',
  'heightened',
  'full',
] as const

export type EvidenceCorruptionBand = 'none' | 'minor' | 'moderate' | 'severe'

export const EVIDENCE_CORRUPTION_BANDS: readonly EvidenceCorruptionBand[] = [
  'none',
  'minor',
  'moderate',
  'severe',
] as const

export type MediaCustody = 'internal_archive' | 'public_host' | 'partner_custody' | 'unknown'

export const MEDIA_CUSTODIES: readonly MediaCustody[] = [
  'internal_archive',
  'public_host',
  'partner_custody',
  'unknown',
] as const

export type MediaDeletionStatus =
  | 'intact'
  | 'pending'
  | 'partial'
  | 'claimed_complete'
  | 'verified'

export const MEDIA_DELETION_STATUSES: readonly MediaDeletionStatus[] = [
  'intact',
  'pending',
  'partial',
  'claimed_complete',
  'verified',
] as const

export type MediaStorageScope = 'local' | 'network' | 'broadcast' | 'offline'

export const MEDIA_STORAGE_SCOPES: readonly MediaStorageScope[] = [
  'local',
  'network',
  'broadcast',
  'offline',
] as const

export type MediaSweepStatus = 'none' | 'scheduled' | 'in_progress' | 'complete' | 'failed'

export const MEDIA_SWEEP_STATUSES: readonly MediaSweepStatus[] = [
  'none',
  'scheduled',
  'in_progress',
  'complete',
  'failed',
] as const

export type DisposalComplianceAction = 'sweep' | 'occlusion' | 'redaction'

export type ExposureEscalationBand = 'local' | 'regional' | 'broadcast'

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface PresentationMismatchProfile {
  readonly limbProportionDrift?: number
  readonly featureOcclusion?: number
  readonly nonstandardMovement?: number
  readonly cameraSpecificReveal?: number
}

export interface MediaAccessHistoryEntry {
  readonly week: number
  readonly actorRef: string
  readonly action: string
}

export interface HazardousMediaInstance {
  readonly mediaInstanceId: string
  readonly custody: MediaCustody
  readonly deletionStatus: MediaDeletionStatus
  readonly storageScope: MediaStorageScope
  readonly accessHistory?: readonly MediaAccessHistoryEntry[]
  readonly sweepStatus: MediaSweepStatus
  readonly disposalDeadlineWeek: number
  readonly copyRepostChainRefs?: readonly string[]
  readonly derivativeHazardProfile?: DerivativeHazardProfile
}

export interface VisualTriggerHazardRecord {
  readonly id: VisualTriggerHazardId
  readonly label: string
  readonly summary?: string
  readonly triggerMedium: TriggerMedium
  readonly awarenessRequirement: AwarenessRequirement
  readonly derivativeHazardProfile: DerivativeHazardProfile
  readonly pursuitState: PursuitState
  readonly targetInstanceIds?: readonly string[]
  readonly occlusionState: OcclusionState
  readonly latentActivation?: boolean
  readonly presentationMismatchProfile?: PresentationMismatchProfile
  readonly hazardousMediaInstances?: readonly HazardousMediaInstance[]
  readonly observerAwarenessBand?: ObserverAwarenessBand
  readonly filterLatencyWeeks?: number
  readonly exposurePathWeeks?: number
  readonly filterFailureMode?: string
  readonly confidence?: number
  readonly unknownFields?: readonly string[]
  readonly redactedFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type VisualTriggerHazardValidationCode =
  | 'missing_id'
  | 'missing_label'
  | 'invalid_trigger_medium'
  | 'invalid_awareness_requirement'
  | 'invalid_derivative_hazard_profile'
  | 'invalid_pursuit_state'
  | 'invalid_occlusion_state'
  | 'invalid_observer_awareness_band'
  | 'invalid_confidence'
  | 'invalid_filter_latency_weeks'
  | 'invalid_exposure_path_weeks'
  | 'invalid_presentation_mismatch_score'
  | 'empty_target_instance_id'
  | 'active_pursuit_without_target'
  | 'invalid_media_instance_id'
  | 'invalid_media_custody'
  | 'invalid_media_deletion_status'
  | 'invalid_media_storage_scope'
  | 'invalid_media_sweep_status'
  | 'invalid_media_disposal_deadline_week'
  | 'invalid_media_access_history_week'
  | 'empty_media_access_actor_ref'
  | 'empty_media_access_action'
  | 'invalid_media_derivative_profile'
  | 'filter_latency_below_exposure_without_failure_mode'
  | 'franchise_token_in_id'
  | 'franchise_token_in_label'
  | 'franchise_token_in_field'
  | 'branded_object_number_in_id'
  | 'branded_object_number_in_label'
  | 'branded_object_number_in_field'

export interface VisualTriggerHazardValidationIssue {
  readonly code: VisualTriggerHazardValidationCode
  readonly detail: string
  readonly severity: 'error' | 'warning'
  readonly relatedIds?: readonly string[]
}

export interface VisualTriggerHazardValidationResult {
  readonly valid: boolean
  readonly issues: readonly VisualTriggerHazardValidationIssue[]
}

// ---------------------------------------------------------------------------
// Observer awareness escalation
// ---------------------------------------------------------------------------

export interface ObserverAwarenessEscalationResult {
  readonly pursuitPressure: number
  readonly manifestationRisk: number
  readonly communicationFailure: boolean
  readonly dreamIntrusion: boolean
  readonly evidenceCorruptionBand: EvidenceCorruptionBand
  readonly pursuitState: PursuitState
}

// ---------------------------------------------------------------------------
// Derivative hazard resolution
// ---------------------------------------------------------------------------

export interface EffectiveDerivativeHazard {
  readonly inheritsFullTrigger: boolean
  readonly hazardWeight: number
}

// ---------------------------------------------------------------------------
// Disposal compliance
// ---------------------------------------------------------------------------

export interface DisposalDeadlineComplianceResult {
  readonly compliant: boolean
  readonly requiredActions: readonly DisposalComplianceAction[]
  /** Media instances still inside the pre-deadline compliance window. */
  readonly pendingComplianceMediaInstanceIds: readonly string[]
}

// ---------------------------------------------------------------------------
// Exposure chain projection
// ---------------------------------------------------------------------------

export interface ExposureChainRiskPolicy {
  readonly broadcastThreshold?: number
  readonly repostAmplification?: number
  readonly minimumConfidence?: number
}

export interface ExposureChainRiskProjection {
  readonly recordId: VisualTriggerHazardId
  readonly broadcastRiskScore: number
  readonly repostChainDepth: number
  readonly latentActivationForecast: boolean
  readonly requiredCountermeasures: readonly string[]
  readonly escalationBand: ExposureEscalationBand
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const TRIGGER_MEDIUM_SET = new Set<string>(TRIGGER_MEDIA)
const AWARENESS_REQUIREMENT_SET = new Set<string>(AWARENESS_REQUIREMENTS)
const DERIVATIVE_HAZARD_PROFILE_SET = new Set<string>(DERIVATIVE_HAZARD_PROFILES)
const PURSUIT_STATE_SET = new Set<string>(PURSUIT_STATES)
const OCCLUSION_STATE_SET = new Set<string>(OCCLUSION_STATES)
const OBSERVER_AWARENESS_BAND_SET = new Set<string>(OBSERVER_AWARENESS_BANDS)
const MEDIA_CUSTODY_SET = new Set<string>(MEDIA_CUSTODIES)
const MEDIA_DELETION_STATUS_SET = new Set<string>(MEDIA_DELETION_STATUSES)
const MEDIA_STORAGE_SCOPE_SET = new Set<string>(MEDIA_STORAGE_SCOPES)
const MEDIA_SWEEP_STATUS_SET = new Set<string>(MEDIA_SWEEP_STATUSES)

const OBSERVER_AWARENESS_BAND_ORDER: Readonly<Record<ObserverAwarenessBand, number>> = {
  unaware: 0,
  peripheral: 1,
  conscious: 2,
  heightened: 3,
  full: 4,
}

const DERIVATIVE_HAZARD_WEIGHTS: Readonly<Record<DerivativeHazardProfile, number>> = {
  full: 1,
  partial: 0.5,
  artistic_exempt: 0,
  unknown: 0.3,
  distorted: 0.7,
  latent: 0.2,
}

const TRIGGER_MEDIUM_EXPOSURE_WEIGHT: Readonly<Partial<Record<TriggerMedium, number>>> = {
  direct_sight: 0.15,
  photo: 0.35,
  video_frame: 0.45,
  thumbnail: 0.25,
  sensor_feed: 0.55,
  background_fragment: 0.4,
}

const STORAGE_SCOPE_EXPOSURE_WEIGHT: Readonly<Record<MediaStorageScope, number>> = {
  local: 0.1,
  offline: 0.05,
  network: 0.45,
  broadcast: 0.85,
}

export const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency|goi-|group of interest|broken masquerade|masquerade breach|wiki\.|wikidot)\b/i

export const BRANDED_OBJECT_NUMBER_PATTERN = /\b(scp-\d{3,4}|object class:\s*(safe|euclid|keter|thaumiel|apollyon))\b/i

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function asHazardousMediaInstances(value: unknown): readonly HazardousMediaInstance[] {
  return Array.isArray(value) ? value : []
}

function asMediaAccessHistory(value: unknown): readonly MediaAccessHistoryEntry[] {
  return Array.isArray(value) ? value : []
}

function pushIssue(
  issues: VisualTriggerHazardValidationIssue[],
  issue: VisualTriggerHazardValidationIssue
) {
  issues.push(issue)
}

function sortValidationIssues(issues: VisualTriggerHazardValidationIssue[]) {
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

function isValidUnitScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function freezeValidationResult(
  issues: VisualTriggerHazardValidationIssue[]
): VisualTriggerHazardValidationResult {
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

function containsFranchiseToken(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && FRANCHISE_TOKEN_PATTERN.test(token)
}

function containsBrandedObjectNumber(value: string): boolean {
  const token = normalizeToken(value)
  return token.length > 0 && BRANDED_OBJECT_NUMBER_PATTERN.test(token)
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function roundBand(value: number): number {
  return Math.round(value * 1000) / 1000
}

function defineRecord(record: VisualTriggerHazardRecord): VisualTriggerHazardRecord {
  return Object.freeze({ ...record })
}

function scanCpNeutralStringField(
  issues: VisualTriggerHazardValidationIssue[],
  id: string,
  field: string,
  value: string | undefined,
  franchiseCode: VisualTriggerHazardValidationCode = 'franchise_token_in_field'
) {
  const token = normalizeToken(value ?? '')
  if (!token) {
    return
  }

  if (containsFranchiseToken(token)) {
    pushIssue(issues, {
      code: franchiseCode,
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} field ${field} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(token)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_field',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} field ${field} contains an imported object number token.`,
      relatedIds: id ? [id] : undefined,
    })
  }
}

function validatePresentationMismatchProfile(
  issues: VisualTriggerHazardValidationIssue[],
  id: string,
  profile: PresentationMismatchProfile | undefined
) {
  if (!profile || typeof profile !== 'object') {
    return
  }

  const fields: Array<{ field: string; value: number | undefined }> = [
    { field: 'presentationMismatchProfile.limbProportionDrift', value: profile.limbProportionDrift },
    { field: 'presentationMismatchProfile.featureOcclusion', value: profile.featureOcclusion },
    { field: 'presentationMismatchProfile.nonstandardMovement', value: profile.nonstandardMovement },
    { field: 'presentationMismatchProfile.cameraSpecificReveal', value: profile.cameraSpecificReveal },
  ]

  for (const { field, value } of fields) {
    if (value !== undefined && !isValidUnitScore(value)) {
      pushIssue(issues, {
        code: 'invalid_presentation_mismatch_score',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} ${field} must be a finite number between 0 and 1.`,
        relatedIds: id ? [id] : undefined,
      })
    }
  }
}

function resolveAwarenessBandOrder(band: ObserverAwarenessBand | undefined): number {
  if (band === undefined || !OBSERVER_AWARENESS_BAND_SET.has(band)) {
    return OBSERVER_AWARENESS_BAND_ORDER.unaware
  }

  return OBSERVER_AWARENESS_BAND_ORDER[band]
}

function resolvePursuitStateFromPressure(
  currentState: PursuitState,
  pursuitPressure: number
): PursuitState {
  if (currentState === 'resolved') {
    return 'resolved'
  }

  if (pursuitPressure >= 0.75) {
    return 'active_pursuit'
  }

  if (pursuitPressure >= 0.4) {
    return 'distressed'
  }

  if (currentState === 'active_pursuit' || currentState === 'distressed') {
    return pursuitPressure >= 0.2 ? 'distressed' : 'dormant'
  }

  return 'dormant'
}

function resolveEvidenceCorruptionBand(
  awarenessRequirement: AwarenessRequirement,
  band: ObserverAwarenessBand
): EvidenceCorruptionBand {
  const order = resolveAwarenessBandOrder(band)

  if (awarenessRequirement !== 'machine_preprocess') {
    if (order >= 4) {
      return 'moderate'
    }

    if (order >= 3) {
      return 'minor'
    }

    return 'none'
  }

  if (order >= 3) {
    return 'severe'
  }

  if (order >= 2) {
    return 'moderate'
  }

  if (order >= 1) {
    return 'minor'
  }

  return 'none'
}

function resolveMaxRepostDepth(instances: readonly HazardousMediaInstance[]): number {
  let depth = 0

  for (const instance of instances) {
    if (!instance || typeof instance !== 'object') {
      continue
    }

    const chainLength = asStringArray(instance.copyRepostChainRefs).filter(Boolean).length
    depth = Math.max(depth, chainLength)
  }

  return depth
}

function resolveBroadcastRiskScore(
  record: VisualTriggerHazardRecord,
  repostAmplification = 1
): number {
  const triggerWeight = TRIGGER_MEDIUM_EXPOSURE_WEIGHT[record.triggerMedium] ?? 0.2
  const derivative = resolveEffectiveDerivativeHazard(
    record.derivativeHazardProfile,
    record.latentActivation === true
  )
  const instances = asHazardousMediaInstances(record.hazardousMediaInstances)

  let storageBoost = 0
  for (const instance of instances) {
    if (instance && typeof instance === 'object' && isMediaStorageScope(instance.storageScope)) {
      storageBoost = Math.max(storageBoost, STORAGE_SCOPE_EXPOSURE_WEIGHT[instance.storageScope])
    }
  }

  const repostDepth = resolveMaxRepostDepth(instances)
  const repostBoost = Math.min(0.35, repostDepth * 0.08 * repostAmplification)
  const latentBoost = record.latentActivation === true ? 0.15 : 0

  return roundBand(
    clampUnit(triggerWeight * derivative.hazardWeight + storageBoost * 0.5 + repostBoost + latentBoost)
  )
}

function resolveEscalationBand(score: number, broadcastThreshold = 0.72): ExposureEscalationBand {
  if (score >= broadcastThreshold) {
    return 'broadcast'
  }

  const regionalThreshold = broadcastThreshold * (0.42 / 0.72)
  if (score >= regionalThreshold) {
    return 'regional'
  }

  return 'local'
}

function resolveRequiredCountermeasures(
  record: VisualTriggerHazardRecord,
  score: number,
  broadcastThreshold = 0.72
): readonly string[] {
  const measures = new Set<string>()

  if (record.occlusionState !== 'covered') {
    measures.add('occlusion_barrier')
  }

  if (record.occlusionState !== 'filtered') {
    measures.add('visual_filter')
  }

  for (const instance of asHazardousMediaInstances(record.hazardousMediaInstances)) {
    if (!instance || typeof instance !== 'object') {
      continue
    }

    if (instance.sweepStatus !== 'complete' && instance.sweepStatus !== 'in_progress') {
      measures.add('media_sweep')
    }

    if (instance.deletionStatus === 'intact' || instance.deletionStatus === 'partial') {
      measures.add('custody_redaction')
    }

    if (asStringArray(instance.copyRepostChainRefs).length > 0) {
      measures.add('repost_chain_trace')
    }
  }

  if (score >= broadcastThreshold) {
    measures.add('broadcast_takedown')
  }

  if (record.awarenessRequirement === 'subconscious_retinal') {
    measures.add('retinal_exposure_review')
  }

  return Object.freeze([...measures].sort((left, right) => left.localeCompare(right)))
}

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isTriggerMedium(value: string): value is TriggerMedium {
  return TRIGGER_MEDIUM_SET.has(value)
}

export function isAwarenessRequirement(value: string): value is AwarenessRequirement {
  return AWARENESS_REQUIREMENT_SET.has(value)
}

export function isDerivativeHazardProfile(value: string): value is DerivativeHazardProfile {
  return DERIVATIVE_HAZARD_PROFILE_SET.has(value)
}

export function isPursuitState(value: string): value is PursuitState {
  return PURSUIT_STATE_SET.has(value)
}

export function isOcclusionState(value: string): value is OcclusionState {
  return OCCLUSION_STATE_SET.has(value)
}

export function isObserverAwarenessBand(value: string): value is ObserverAwarenessBand {
  return OBSERVER_AWARENESS_BAND_SET.has(value)
}

export function isMediaCustody(value: string): value is MediaCustody {
  return MEDIA_CUSTODY_SET.has(value)
}

export function isMediaDeletionStatus(value: string): value is MediaDeletionStatus {
  return MEDIA_DELETION_STATUS_SET.has(value)
}

export function isMediaStorageScope(value: string): value is MediaStorageScope {
  return MEDIA_STORAGE_SCOPE_SET.has(value)
}

export function isMediaSweepStatus(value: string): value is MediaSweepStatus {
  return MEDIA_SWEEP_STATUS_SET.has(value)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves whether a derivative profile inherits the full trigger hazard weight.
 * artistic_exempt and inactive latent profiles do not inherit full trigger behavior.
 */
export function resolveEffectiveDerivativeHazard(
  profile: DerivativeHazardProfile,
  latentActivation = false
): EffectiveDerivativeHazard {
  if (profile === 'artistic_exempt') {
    return Object.freeze({
      inheritsFullTrigger: false,
      hazardWeight: 0,
    })
  }

  if (profile === 'latent' && !latentActivation) {
    return Object.freeze({
      inheritsFullTrigger: false,
      hazardWeight: DERIVATIVE_HAZARD_WEIGHTS.latent,
    })
  }

  const hazardWeight = profile === 'latent' && latentActivation ? 0.85 : DERIVATIVE_HAZARD_WEIGHTS[profile]

  return Object.freeze({
    inheritsFullTrigger: profile === 'full' || (profile === 'latent' && latentActivation),
    hazardWeight,
  })
}

/**
 * Deterministic escalation when observer or audience awareness increases.
 * Paired with awarenessRequirement — no random rolls.
 */
export function observerAwarenessEscalation(
  record: VisualTriggerHazardRecord,
  priorBand: ObserverAwarenessBand,
  nextBand: ObserverAwarenessBand
): ObserverAwarenessEscalationResult {
  const priorOrder = resolveAwarenessBandOrder(priorBand)
  const nextOrder = resolveAwarenessBandOrder(nextBand)
  const delta = Math.max(0, nextOrder - priorOrder)

  const requirementMultiplier =
    record.awarenessRequirement === 'subconscious_retinal'
      ? 1.15
      : record.awarenessRequirement === 'machine_preprocess'
        ? 0.95
        : 1

  const derivative = resolveEffectiveDerivativeHazard(
    record.derivativeHazardProfile,
    record.latentActivation === true
  )

  if (derivative.hazardWeight === 0) {
    return Object.freeze({
      pursuitPressure: 0,
      manifestationRisk: 0,
      communicationFailure: false,
      dreamIntrusion: false,
      evidenceCorruptionBand: 'none' as EvidenceCorruptionBand,
      pursuitState: record.pursuitState === 'resolved' ? 'resolved' : 'dormant',
    })
  }

  const basePressure = nextOrder * 0.18 * requirementMultiplier * derivative.hazardWeight
  const pursuitPressure = roundBand(clampUnit(basePressure + delta * 0.12 * derivative.hazardWeight))
  const manifestationRisk = roundBand(
    clampUnit(pursuitPressure * 0.85 + (record.latentActivation === true ? 0.1 : 0))
  )

  const communicationFailure =
    nextOrder >= 3 &&
    (record.awarenessRequirement === 'conscious' || record.awarenessRequirement === 'machine_preprocess')

  const dreamIntrusion =
    record.awarenessRequirement === 'subconscious_retinal' && nextOrder >= 2 && delta > 0

  const evidenceCorruptionBand = resolveEvidenceCorruptionBand(
    record.awarenessRequirement,
    nextBand
  )

  const pursuitState = resolvePursuitStateFromPressure(record.pursuitState, pursuitPressure)

  return Object.freeze({
    pursuitPressure,
    manifestationRisk,
    communicationFailure,
    dreamIntrusion,
    evidenceCorruptionBand,
    pursuitState,
  })
}

/**
 * When occlusion covers the hazard, active pursuit may resolve deterministically.
 */
export function resolvePursuitStateAfterOcclusion(record: VisualTriggerHazardRecord): PursuitState {
  if (record.occlusionState !== 'covered') {
    return record.pursuitState
  }

  if (record.pursuitState === 'active_pursuit' || record.pursuitState === 'distressed') {
    return 'resolved'
  }

  return record.pursuitState
}

/**
 * Before disposalDeadlineWeek, media instances require sweep/occlusion/redaction posture.
 */
export function resolveDisposalDeadlineCompliance(
  record: VisualTriggerHazardRecord,
  currentWeek: number
): DisposalDeadlineComplianceResult {
  const requiredActions = new Set<DisposalComplianceAction>()
  const pendingComplianceMediaInstanceIds: string[] = []

  for (const instance of asHazardousMediaInstances(record.hazardousMediaInstances)) {
    if (!instance || typeof instance !== 'object') {
      continue
    }

    const mediaInstanceId = normalizeToken(instance.mediaInstanceId)
    if (!mediaInstanceId) {
      continue
    }

    // Compliance window: required actions must be complete before disposalDeadlineWeek.
    if (currentWeek >= instance.disposalDeadlineWeek) {
      continue
    }

    pendingComplianceMediaInstanceIds.push(mediaInstanceId)

    if (instance.sweepStatus !== 'complete' && instance.sweepStatus !== 'in_progress') {
      requiredActions.add('sweep')
    }

    if (record.occlusionState !== 'covered' && record.occlusionState !== 'filtered') {
      requiredActions.add('occlusion')
    }

    if (
      instance.deletionStatus === 'intact' ||
      instance.deletionStatus === 'pending' ||
      instance.deletionStatus === 'partial'
    ) {
      requiredActions.add('redaction')
    }
  }

  return Object.freeze({
    compliant: pendingComplianceMediaInstanceIds.length === 0 || requiredActions.size === 0,
    requiredActions: Object.freeze(
      [...requiredActions].sort((left, right) => left.localeCompare(right))
    ),
    pendingComplianceMediaInstanceIds: Object.freeze(
      [...pendingComplianceMediaInstanceIds].sort()
    ),
  })
}

export function validateVisualTriggerHazardRecord(
  record: VisualTriggerHazardRecord
): VisualTriggerHazardValidationResult {
  if (!record || typeof record !== 'object') {
    return freezeValidationResult([
      {
        code: 'missing_id',
        severity: 'error',
        detail: 'Visual trigger hazard record is missing id.',
      },
      {
        code: 'missing_label',
        severity: 'error',
        detail: 'Visual trigger hazard record is missing label.',
      },
      {
        code: 'invalid_trigger_medium',
        severity: 'error',
        detail: 'Visual trigger hazard record (unknown) has invalid triggerMedium undefined.',
      },
      {
        code: 'invalid_awareness_requirement',
        severity: 'error',
        detail: 'Visual trigger hazard record (unknown) has invalid awarenessRequirement undefined.',
      },
      {
        code: 'invalid_derivative_hazard_profile',
        severity: 'error',
        detail: 'Visual trigger hazard record (unknown) has invalid derivativeHazardProfile undefined.',
      },
      {
        code: 'invalid_pursuit_state',
        severity: 'error',
        detail: 'Visual trigger hazard record (unknown) has invalid pursuitState undefined.',
      },
      {
        code: 'invalid_occlusion_state',
        severity: 'error',
        detail: 'Visual trigger hazard record (unknown) has invalid occlusionState undefined.',
      },
    ])
  }

  const issues: VisualTriggerHazardValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      severity: 'error',
      detail: 'Visual trigger hazard record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      severity: 'error',
      detail: 'Visual trigger hazard record is missing label.',
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(id)) {
    pushIssue(issues, {
      code: 'franchise_token_in_id',
      severity: 'error',
      detail: `Visual trigger hazard record id ${id || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(id)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_id',
      severity: 'error',
      detail: `Visual trigger hazard record id ${id || '(unknown)'} contains an imported object number token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsFranchiseToken(label)) {
    pushIssue(issues, {
      code: 'franchise_token_in_label',
      severity: 'error',
      detail: `Visual trigger hazard record label ${label || '(unknown)'} contains a franchise or source-literal token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (containsBrandedObjectNumber(label)) {
    pushIssue(issues, {
      code: 'branded_object_number_in_label',
      severity: 'error',
      detail: `Visual trigger hazard record label ${label || '(unknown)'} contains an imported object number token.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  scanCpNeutralStringField(issues, id, 'summary', record.summary)
  scanCpNeutralStringField(issues, id, 'filterFailureMode', record.filterFailureMode)

  if (!isTriggerMedium(record.triggerMedium)) {
    pushIssue(issues, {
      code: 'invalid_trigger_medium',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} has invalid triggerMedium ${String(record.triggerMedium)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isAwarenessRequirement(record.awarenessRequirement)) {
    pushIssue(issues, {
      code: 'invalid_awareness_requirement',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} has invalid awarenessRequirement ${String(record.awarenessRequirement)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isDerivativeHazardProfile(record.derivativeHazardProfile)) {
    pushIssue(issues, {
      code: 'invalid_derivative_hazard_profile',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} has invalid derivativeHazardProfile ${String(record.derivativeHazardProfile)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isPursuitState(record.pursuitState)) {
    pushIssue(issues, {
      code: 'invalid_pursuit_state',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} has invalid pursuitState ${String(record.pursuitState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isOcclusionState(record.occlusionState)) {
    pushIssue(issues, {
      code: 'invalid_occlusion_state',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} has invalid occlusionState ${String(record.occlusionState)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (
    record.observerAwarenessBand !== undefined &&
    !isObserverAwarenessBand(record.observerAwarenessBand)
  ) {
    pushIssue(issues, {
      code: 'invalid_observer_awareness_band',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} has invalid observerAwarenessBand ${String(record.observerAwarenessBand)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.confidence !== undefined && !isValidUnitScore(record.confidence)) {
    pushIssue(issues, {
      code: 'invalid_confidence',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} confidence must be a finite number between 0 and 1.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.filterLatencyWeeks !== undefined && !isFiniteWeek(record.filterLatencyWeeks)) {
    pushIssue(issues, {
      code: 'invalid_filter_latency_weeks',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} filterLatencyWeeks must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (record.exposurePathWeeks !== undefined && !isFiniteWeek(record.exposurePathWeeks)) {
    pushIssue(issues, {
      code: 'invalid_exposure_path_weeks',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} exposurePathWeeks must be a non-negative integer.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  validatePresentationMismatchProfile(issues, id, record.presentationMismatchProfile)

  const targetInstanceIds = asStringArray(record.targetInstanceIds)
  for (const targetId of targetInstanceIds) {
    if (!normalizeToken(targetId)) {
      pushIssue(issues, {
        code: 'empty_target_instance_id',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} targetInstanceIds contains empty id.`,
        relatedIds: id ? [id] : undefined,
      })
    } else {
      scanCpNeutralStringField(issues, id, 'targetInstanceIds', targetId)
    }
  }

  if (
    record.pursuitState === 'active_pursuit' &&
    targetInstanceIds.filter((entry) => normalizeToken(entry)).length === 0
  ) {
    pushIssue(issues, {
      code: 'active_pursuit_without_target',
      severity: 'error',
      detail: `Visual trigger hazard record ${id || '(unknown)'} is active_pursuit without targetInstanceIds.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  for (const instance of asHazardousMediaInstances(record.hazardousMediaInstances)) {
    if (!instance || typeof instance !== 'object') {
      pushIssue(issues, {
        code: 'invalid_media_instance_id',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} hazardousMediaInstances contains invalid entry.`,
        relatedIds: id ? [id] : undefined,
      })
      continue
    }

    const mediaInstanceId = normalizeToken(instance.mediaInstanceId)
    if (!mediaInstanceId) {
      pushIssue(issues, {
        code: 'invalid_media_instance_id',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} hazardousMediaInstances requires mediaInstanceId.`,
        relatedIds: id ? [id] : undefined,
      })
    } else {
      scanCpNeutralStringField(issues, id, 'hazardousMediaInstances.mediaInstanceId', mediaInstanceId)
    }

    if (!isMediaCustody(instance.custody)) {
      pushIssue(issues, {
        code: 'invalid_media_custody',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} media instance ${mediaInstanceId || '(unknown)'} has invalid custody ${String(instance.custody)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isMediaDeletionStatus(instance.deletionStatus)) {
      pushIssue(issues, {
        code: 'invalid_media_deletion_status',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} media instance ${mediaInstanceId || '(unknown)'} has invalid deletionStatus ${String(instance.deletionStatus)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isMediaStorageScope(instance.storageScope)) {
      pushIssue(issues, {
        code: 'invalid_media_storage_scope',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} media instance ${mediaInstanceId || '(unknown)'} has invalid storageScope ${String(instance.storageScope)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isMediaSweepStatus(instance.sweepStatus)) {
      pushIssue(issues, {
        code: 'invalid_media_sweep_status',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} media instance ${mediaInstanceId || '(unknown)'} has invalid sweepStatus ${String(instance.sweepStatus)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (!isFiniteWeek(instance.disposalDeadlineWeek)) {
      pushIssue(issues, {
        code: 'invalid_media_disposal_deadline_week',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} media instance ${mediaInstanceId || '(unknown)'} disposalDeadlineWeek must be a non-negative integer.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    if (
      instance.derivativeHazardProfile !== undefined &&
      !isDerivativeHazardProfile(instance.derivativeHazardProfile)
    ) {
      pushIssue(issues, {
        code: 'invalid_media_derivative_profile',
        severity: 'error',
        detail: `Visual trigger hazard record ${id || '(unknown)'} media instance ${mediaInstanceId || '(unknown)'} has invalid derivativeHazardProfile ${String(instance.derivativeHazardProfile)}.`,
        relatedIds: id ? [id] : undefined,
      })
    }

    for (const entry of asMediaAccessHistory(instance.accessHistory)) {
      if (!entry || typeof entry !== 'object') {
        continue
      }

      if (!isFiniteWeek(entry.week)) {
        pushIssue(issues, {
          code: 'invalid_media_access_history_week',
          severity: 'error',
          detail: `Visual trigger hazard record ${id || '(unknown)'} media accessHistory contains invalid week.`,
          relatedIds: id ? [id] : undefined,
        })
      }

      if (!normalizeToken(entry.actorRef)) {
        pushIssue(issues, {
          code: 'empty_media_access_actor_ref',
          severity: 'error',
          detail: `Visual trigger hazard record ${id || '(unknown)'} media accessHistory requires actorRef.`,
          relatedIds: id ? [id] : undefined,
        })
      }

      if (!normalizeToken(entry.action)) {
        pushIssue(issues, {
          code: 'empty_media_access_action',
          severity: 'error',
          detail: `Visual trigger hazard record ${id || '(unknown)'} media accessHistory requires action.`,
          relatedIds: id ? [id] : undefined,
        })
      }
    }

    for (const chainRef of asStringArray(instance.copyRepostChainRefs)) {
      scanCpNeutralStringField(issues, id, 'copyRepostChainRefs', chainRef)
    }
  }

  if (
    typeof record.filterLatencyWeeks === 'number' &&
    typeof record.exposurePathWeeks === 'number' &&
    record.filterLatencyWeeks < record.exposurePathWeeks &&
    !normalizeToken(record.filterFailureMode ?? '')
  ) {
    pushIssue(issues, {
      code: 'filter_latency_below_exposure_without_failure_mode',
      severity: 'warning',
      detail: `Visual trigger hazard record ${id || '(unknown)'} filterLatencyWeeks is shorter than exposurePathWeeks without documented filterFailureMode.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return freezeValidationResult(issues)
}

/**
 * Broadcast-scale escalation forecast from media custody, repost chains, and derivative hazard.
 */
export function projectExposureChainRisk(
  record: VisualTriggerHazardRecord,
  policy: ExposureChainRiskPolicy = {}
): ExposureChainRiskProjection {
  if (!record || typeof record !== 'object') {
    return Object.freeze({
      recordId: '(unknown)',
      broadcastRiskScore: 0,
      repostChainDepth: 0,
      latentActivationForecast: false,
      requiredCountermeasures: Object.freeze([] as readonly string[]),
      escalationBand: 'local' as ExposureEscalationBand,
    })
  }

  const recordId = normalizeToken(record.id) || '(unknown)'
  const repostAmplification = policy.repostAmplification ?? 1
  const broadcastRiskScore = resolveBroadcastRiskScore(record, repostAmplification)
  const repostChainDepth = resolveMaxRepostDepth(asHazardousMediaInstances(record.hazardousMediaInstances))
  const latentActivationForecast =
    record.derivativeHazardProfile === 'latent' || record.latentActivation === true

  const threshold = policy.broadcastThreshold ?? 0.72
  const escalationBand = resolveEscalationBand(broadcastRiskScore, threshold)

  const confidence = record.confidence ?? 1
  const requiredCountermeasures =
    policy.minimumConfidence !== undefined && confidence < policy.minimumConfidence
      ? Object.freeze([] as readonly string[])
      : resolveRequiredCountermeasures(record, broadcastRiskScore, threshold)

  return Object.freeze({
    recordId,
    broadcastRiskScore,
    repostChainDepth,
    latentActivationForecast,
    requiredCountermeasures,
    escalationBand,
  })
}

/** background_fragment trigger with years-later latent activation. */
export const BACKGROUND_FRAGMENT_LATENT_FIXTURE: VisualTriggerHazardRecord = defineRecord({
  id: 'visual-trigger:public-broadcast-background-fragment',
  label: 'Peripheral broadcast background fragment hazard',
  summary: 'Hazard dormant in archived footage until latent activation years after initial exposure.',
  triggerMedium: 'background_fragment',
  awarenessRequirement: 'subconscious_retinal',
  derivativeHazardProfile: 'latent',
  pursuitState: 'dormant',
  occlusionState: 'exposed',
  latentActivation: true,
  observerAwarenessBand: 'peripheral',
  hazardousMediaInstances: [
    {
      mediaInstanceId: 'media:archive-segment-14',
      custody: 'public_host',
      deletionStatus: 'intact',
      storageScope: 'broadcast',
      sweepStatus: 'none',
      disposalDeadlineWeek: 312,
      copyRepostChainRefs: ['repost:clip-mirror-3', 'repost:regional-feed-9'],
      accessHistory: [{ week: 48, actorRef: 'actor:archive-reviewer', action: 'flagged_for_review' }],
    },
  ],
  confidence: 0.62,
})

/** subconscious_retinal exposure with filter latency shorter than exposure path. */
export const SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE: VisualTriggerHazardRecord = defineRecord({
  id: 'visual-trigger:retinal-filter-latency-gap',
  label: 'Retinal exposure with countermeasure latency gap',
  summary: 'Subconscious retinal trigger outruns deployed visual filter latency.',
  triggerMedium: 'video_frame',
  awarenessRequirement: 'subconscious_retinal',
  derivativeHazardProfile: 'full',
  pursuitState: 'distressed',
  targetInstanceIds: ['target:viewer-queue-7'],
  occlusionState: 'filtered',
  filterLatencyWeeks: 2,
  exposurePathWeeks: 5,
  observerAwarenessBand: 'conscious',
  presentationMismatchProfile: {
    limbProportionDrift: 0.41,
    featureOcclusion: 0.28,
    nonstandardMovement: 0.55,
    cameraSpecificReveal: 0.67,
  },
  confidence: 0.71,
})

/** artistic_exempt derivative on repost chain — does not inherit full trigger profile. */
export const ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE: VisualTriggerHazardRecord = defineRecord({
  id: 'visual-trigger:stylized-repost-derivative',
  label: 'Stylized repost derivative with artistic exemption',
  summary: 'Fan edit derivative marked artistic_exempt; full trigger weight suppressed.',
  triggerMedium: 'thumbnail',
  awarenessRequirement: 'conscious',
  derivativeHazardProfile: 'full',
  pursuitState: 'dormant',
  occlusionState: 'exposed',
  hazardousMediaInstances: [
    {
      mediaInstanceId: 'media:stylized-edit-2',
      custody: 'public_host',
      deletionStatus: 'intact',
      storageScope: 'network',
      sweepStatus: 'scheduled',
      disposalDeadlineWeek: 84,
      derivativeHazardProfile: 'artistic_exempt',
      copyRepostChainRefs: ['repost:fan-edit-chain-1'],
    },
  ],
  confidence: 0.44,
})

/** Disposal deadline forces sweep/occlusion/redaction before deadline week. */
export const DISPOSAL_DEADLINE_SWEEP_FIXTURE: VisualTriggerHazardRecord = defineRecord({
  id: 'visual-trigger:pending-disposal-sweep',
  label: 'Pending disposal sweep with exposed custody',
  summary: 'Media instance approaching disposal deadline without completed sweep or redaction.',
  triggerMedium: 'photo',
  awarenessRequirement: 'conscious',
  derivativeHazardProfile: 'partial',
  pursuitState: 'dormant',
  occlusionState: 'exposed',
  hazardousMediaInstances: [
    {
      mediaInstanceId: 'media:custody-roll-11',
      custody: 'internal_archive',
      deletionStatus: 'pending',
      storageScope: 'local',
      sweepStatus: 'scheduled',
      disposalDeadlineWeek: 40,
      accessHistory: [{ week: 28, actorRef: 'actor:custody-clerk', action: 'queued_for_sweep' }],
    },
  ],
  confidence: 0.53,
})

/** Covered occlusion allows pursuit resolution from active pursuit. */
export const COVERED_PURSUIT_RESOLUTION_FIXTURE: VisualTriggerHazardRecord = defineRecord({
  id: 'visual-trigger:covered-pursuit-resolution',
  label: 'Covered hazard with active pursuit target',
  summary: 'Occlusion barrier applied; pursuit may resolve without neutralization.',
  triggerMedium: 'direct_sight',
  awarenessRequirement: 'conscious',
  derivativeHazardProfile: 'full',
  pursuitState: 'active_pursuit',
  targetInstanceIds: ['target:field-team-4'],
  occlusionState: 'covered',
  confidence: 0.66,
})
