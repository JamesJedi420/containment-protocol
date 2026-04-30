// SPE-1045 slice 2: deterministic projection layer for live registry ingestion.
// Pure functions only; no UI, no GameState rewrites, no map-layer presentation.
// Derives LiveRegistryEntry records from structured source declarations using explicit
// non-omniscient visibility rules — hidden/uncertain entities appear only through
// partial detection or inference.

import { LIVE_REGISTRY_CALIBRATION } from './sim/calibration'
import { clamp } from './math'
import { createLiveRegistryEntry } from './liveRegistry'
import type {
  LiveRegistryEntry,
  LiveRegistryEntityClass,
  LiveRegistryOperationalState,
  LiveRegistryTruthState,
} from './liveRegistry'
import type { PhysicalityState, ActorClass, UnifiedActorDeclaration } from './actorTaxonomy'

// ---------------------------------------------------------------------------
// Detection context
// ---------------------------------------------------------------------------

/**
 * Describes how (and how well) an actor was detected during an observation pass.
 * `detectionStrength` is a 0..1 scalar; 0 = fully undetected, 1 = definitive.
 */
export type DetectionMethod = 'direct' | 'inference' | 'residue' | 'undetected'

export interface DetectionContext {
  detectionStrength: number
  detectionMethod: DetectionMethod
  observingAgentId?: string
}

// ---------------------------------------------------------------------------
// Source input shapes
// ---------------------------------------------------------------------------

/**
 * Minimal anomaly actor source — a declared anomaly entity projected into the
 * registry.  Uses UnifiedActorDeclaration fields relevant to visibility
 * determination.
 */
export interface AnomalySourceInput {
  /**
   * Stable entity identifier (not the registry entry id).
   */
  entityId: string
  label: string
  actorClass: ActorClass
  physicality: PhysicalityState
  behaviorState: UnifiedActorDeclaration['behaviorState']
  locationTag?: string
  /**
   * Optional case IDs already known to be linked to this actor.
   */
  linkedCaseIds?: string[]
}

/**
 * Staff / agency operative source.  Staff are always visible to the registry
 * at confirmed / high confidence; detection context is not required.
 */
export interface StaffSourceInput {
  entityId: string
  label: string
  currentAssignment?: 'idle' | 'assigned' | 'training' | 'recovering' | 'unavailable'
  locationTag?: string
  linkedCaseIds?: string[]
}

/**
 * Non-agency external actor (civilian informant, rival operative, unknown
 * third party).  Appears at suspected/inferred confidence unless detection is
 * high enough to confirm.
 */
export interface ExternalSourceInput {
  entityId: string
  label: string
  inferenceStrength: number // 0..1
  locationTag?: string
  linkedCaseIds?: string[]
}

// ---------------------------------------------------------------------------
// Registry source set (aggregate input for buildRegistryFromSources)
// ---------------------------------------------------------------------------

export interface RegistrySourceSet {
  anomalies?: AnomalySourceInput[]
  staff?: StaffSourceInput[]
  externalActors?: ExternalSourceInput[]
}

// ---------------------------------------------------------------------------
// Live-vs-historical context link
// ---------------------------------------------------------------------------

/**
 * A compact reference that attaches incident / archive context to a live entry.
 * Proves the live-vs-historical linkage without expanding the archive system.
 */
export interface RegistryContextLink {
  caseId?: string
  archiveRef?: string
  sourceTag?: string
}

// ---------------------------------------------------------------------------
// Internal calibration thresholds (drawn from LIVE_REGISTRY_CALIBRATION or
// local constants).  These keep visibility rules in one place.
// ---------------------------------------------------------------------------

/** Minimum detection strength for a nonphysical/projected actor to appear as a
 *  suspected anomaly entry rather than a mere signature entry. */
const NONPHYSICAL_SUSPECTED_THRESHOLD: number =
  ('nonphysicalSuspectedThreshold' in LIVE_REGISTRY_CALIBRATION
    ? (LIVE_REGISTRY_CALIBRATION as unknown as Record<string, number>)['nonphysicalSuspectedThreshold']
    : undefined) ?? 0.55

/** Minimum detection strength to promote a suspected entry to confirmed. */
const CONFIRMED_DETECTION_THRESHOLD: number =
  ('confirmedDetectionThreshold' in LIVE_REGISTRY_CALIBRATION
    ? (LIVE_REGISTRY_CALIBRATION as unknown as Record<string, number>)['confirmedDetectionThreshold']
    : undefined) ?? 0.8

/** Minimum inference strength for an external actor to be recorded. */
const EXTERNAL_MINIMUM_INFERENCE: number =
  ('externalMinimumInference' in LIVE_REGISTRY_CALIBRATION
    ? (LIVE_REGISTRY_CALIBRATION as unknown as Record<string, number>)['externalMinimumInference']
    : undefined) ?? 0.2

// ---------------------------------------------------------------------------
// Physicality → visibility helpers
// ---------------------------------------------------------------------------

function isPhysical(physicality: PhysicalityState): boolean {
  return (
    physicality === 'physical' ||
    physicality === 'semi_physical' ||
    physicality === 'anchored' ||
    physicality === 'possessed' ||
    physicality === 'vessel_bound'
  )
}

function isNonPhysicalOrProjected(physicality: PhysicalityState): boolean {
  return physicality === 'nonphysical' || physicality === 'projected'
}

// ---------------------------------------------------------------------------
// ID generation helpers (deterministic, scoped per projection call)
// ---------------------------------------------------------------------------

function makeEntryId(prefix: string, entityId: string): string {
  return `${prefix}-${entityId}`
}

// ---------------------------------------------------------------------------
// Projection functions
// ---------------------------------------------------------------------------

/**
 * Project a physical anomaly actor with a given detection context into a live
 * registry entry.
 *
 * - Physical actors that are directly detected appear as confirmed/active entries.
 * - Physical actors with inference or residue detection appear as suspected entries.
 * - Undetected physical actors do NOT appear in the registry (returns null).
 */
export function projectPhysicalAnomalyToEntry(
  source: AnomalySourceInput,
  detection: DetectionContext,
  week: number
): LiveRegistryEntry | null {
  const strength = clamp(detection.detectionStrength, 0, 1)

  if (detection.detectionMethod === 'undetected' || strength <= 0) {
    return null
  }

  const operationalState: LiveRegistryOperationalState =
    source.behaviorState === 'contained' ? 'contained' : 'active'

  let truthState: LiveRegistryTruthState
  if (strength >= CONFIRMED_DETECTION_THRESHOLD || detection.detectionMethod === 'direct') {
    truthState = 'confirmed'
  } else {
    truthState = 'suspected'
  }

  return createLiveRegistryEntry({
    id: makeEntryId('reg-anom', source.entityId),
    entityId: source.entityId,
    entityClass: 'anomaly',
    label: source.label,
    operationalState,
    truthState,
    confidence: Number(strength.toFixed(4)),
    locationTag: source.locationTag,
    linkedCaseIds: source.linkedCaseIds ?? [],
    week,
  })
}

/**
 * Project a nonphysical or projected anomaly actor into a live registry entry.
 *
 * - Strong detection (>= NONPHYSICAL_SUSPECTED_THRESHOLD) → suspected anomaly entry.
 * - Very strong detection (>= CONFIRMED_DETECTION_THRESHOLD) → confirmed anomaly entry.
 * - Weak detection (residue/inference but < threshold) → inferred signature entry.
 * - No detection (method === 'undetected' or strength === 0) → null; actor is invisible.
 */
export function projectNonPhysicalAnomalyToEntry(
  source: AnomalySourceInput,
  detection: DetectionContext,
  week: number
): LiveRegistryEntry | null {
  const strength = clamp(detection.detectionStrength, 0, 1)

  if (detection.detectionMethod === 'undetected' || strength <= 0) {
    return null
  }

  // Residue/inference with strength below suspected threshold → signature only
  if (
    strength < NONPHYSICAL_SUSPECTED_THRESHOLD &&
    (detection.detectionMethod === 'residue' || detection.detectionMethod === 'inference')
  ) {
    return createLiveRegistryEntry({
      id: makeEntryId('reg-sig', source.entityId),
      entityId: source.entityId,
      entityClass: 'signature',
      label: `Unresolved signature (${source.label})`,
      operationalState: 'active',
      truthState: 'inferred',
      confidence: Number(strength.toFixed(4)),
      locationTag: source.locationTag,
      linkedCaseIds: source.linkedCaseIds ?? [],
      week,
    })
  }

  // Above suspected threshold or direct detection
  const entityClass: LiveRegistryEntityClass = 'anomaly'
  const truthState: LiveRegistryTruthState =
    strength >= CONFIRMED_DETECTION_THRESHOLD && detection.detectionMethod === 'direct'
      ? 'confirmed'
      : 'suspected'

  const operationalState: LiveRegistryOperationalState =
    source.behaviorState === 'contained' ? 'contained' : 'active'

  return createLiveRegistryEntry({
    id: makeEntryId('reg-anom', source.entityId),
    entityId: source.entityId,
    entityClass,
    label: source.label,
    operationalState,
    truthState,
    confidence: Number(strength.toFixed(4)),
    locationTag: source.locationTag,
    linkedCaseIds: source.linkedCaseIds ?? [],
    week,
  })
}

/**
 * Dispatch helper that routes to the appropriate projection function based on
 * the actor's physicality.  This is the primary entry point for anomaly
 * projection from a declared actor source.
 */
export function projectAnomalyToRegistryEntry(
  source: AnomalySourceInput,
  detection: DetectionContext,
  week: number
): LiveRegistryEntry | null {
  if (isNonPhysicalOrProjected(source.physicality)) {
    return projectNonPhysicalAnomalyToEntry(source, detection, week)
  }
  if (isPhysical(source.physicality)) {
    return projectPhysicalAnomalyToEntry(source, detection, week)
  }
  // Unknown physicality — treat conservatively as nonphysical
  return projectNonPhysicalAnomalyToEntry(source, detection, week)
}

/**
 * Project a staff member into a live registry entry.
 *
 * Staff are always visible to the registry (they work for the agency).
 * Confidence is fixed at 1.0; truth state is always confirmed.
 */
export function projectStaffToRegistryEntry(
  source: StaffSourceInput,
  week: number
): LiveRegistryEntry {
  const assignmentToOp: Record<NonNullable<StaffSourceInput['currentAssignment']>, LiveRegistryOperationalState> = {
    idle: 'active',
    assigned: 'assigned',
    training: 'active',
    recovering: 'active',
    unavailable: 'active',
  }

  const operationalState: LiveRegistryOperationalState =
    source.currentAssignment != null
      ? assignmentToOp[source.currentAssignment]
      : 'active'

  return createLiveRegistryEntry({
    id: makeEntryId('reg-staff', source.entityId),
    entityId: source.entityId,
    entityClass: 'staff',
    label: source.label,
    operationalState,
    truthState: 'confirmed',
    confidence: 1,
    locationTag: source.locationTag,
    linkedCaseIds: source.linkedCaseIds ?? [],
    week,
  })
}

/**
 * Project an external (non-agency) actor into a live registry entry.
 *
 * - inferenceStrength < EXTERNAL_MINIMUM_INFERENCE → actor is not recorded (null).
 * - Otherwise appears as a suspected or inferred external entry depending on
 *   inference strength.
 */
export function projectExternalActorToRegistryEntry(
  source: ExternalSourceInput,
  week: number
): LiveRegistryEntry | null {
  const strength = clamp(source.inferenceStrength, 0, 1)

  if (strength < EXTERNAL_MINIMUM_INFERENCE) {
    return null
  }

  const truthState: LiveRegistryTruthState = strength >= NONPHYSICAL_SUSPECTED_THRESHOLD ? 'suspected' : 'inferred'

  return createLiveRegistryEntry({
    id: makeEntryId('reg-ext', source.entityId),
    entityId: source.entityId,
    entityClass: 'external',
    label: source.label,
    operationalState: 'active',
    truthState,
    confidence: Number(strength.toFixed(4)),
    locationTag: source.locationTag,
    linkedCaseIds: source.linkedCaseIds ?? [],
    week,
  })
}

// ---------------------------------------------------------------------------
// Aggregate projection
// ---------------------------------------------------------------------------

/**
 * Build a list of live registry entries from a mixed source set.
 *
 * Each anomaly must supply its own DetectionContext.  Staff are always
 * projected unconditionally.  External actors are filtered by
 * inferenceStrength.
 *
 * Returns only the entries that pass their respective visibility rules —
 * there is no omniscient roster behavior.
 */
export function buildRegistryFromSources(
  sources: RegistrySourceSet,
  anomalyDetections: Map<string, DetectionContext>,
  week: number
): LiveRegistryEntry[] {
  const entries: LiveRegistryEntry[] = []

  for (const anomaly of sources.anomalies ?? []) {
    const detection = anomalyDetections.get(anomaly.entityId) ?? {
      detectionStrength: 0,
      detectionMethod: 'undetected' as DetectionMethod,
    }
    const entry = projectAnomalyToRegistryEntry(anomaly, detection, week)
    if (entry !== null) {
      entries.push(entry)
    }
  }

  for (const staff of sources.staff ?? []) {
    entries.push(projectStaffToRegistryEntry(staff, week))
  }

  for (const external of sources.externalActors ?? []) {
    const entry = projectExternalActorToRegistryEntry(external, week)
    if (entry !== null) {
      entries.push(entry)
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Live-vs-historical context linkage
// ---------------------------------------------------------------------------

/**
 * Attach incident / archive context to an existing live registry entry.
 *
 * This is a pure update — it merges the new link information without
 * overwriting unrelated fields or mutating the original entry.
 */
export function attachContextLink(
  entry: LiveRegistryEntry,
  link: RegistryContextLink
): LiveRegistryEntry {
  const newCaseIds = link.caseId ? [link.caseId] : []
  const merged = new Set([...entry.linkedCaseIds, ...newCaseIds])

  const archiveTag =
    link.archiveRef != null ? `archive:${link.archiveRef}` : null
  const sourceTagValue = link.sourceTag != null ? `source:${link.sourceTag}` : null

  const additionalTags = [archiveTag, sourceTagValue].filter((t): t is string => t !== null)

  return {
    ...entry,
    linkedCaseIds: [...merged],
    // Store archive/source refs as additional linked case id markers to keep
    // the surface minimal and avoid model changes.
    ...(additionalTags.length > 0
      ? {
          linkedCaseIds: [
            ...merged,
            ...additionalTags.filter((t) => !merged.has(t)),
          ],
        }
      : {}),
  }
}
