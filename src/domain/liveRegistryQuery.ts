// SPE-1045 slice 3: deterministic registry view/query surfaces.
// Pure query logic on top of built LiveRegistryEntry collections.
// No map-layer presentation, no UI, no GameState rewrites.
// Covers: extended filtering (location, case linkage), certainty clustering,
// triage priority scoring, prioritized sorting, and a structured registry digest.

import { LIVE_REGISTRY_QUERY_CALIBRATION } from './sim/calibration'
import type {
  LiveRegistryEntry,
  LiveRegistryEntityClass,
  LiveRegistryOperationalState,
  LiveRegistryTruthState,
} from './liveRegistry'

// ---------------------------------------------------------------------------
// Extended filter
// ---------------------------------------------------------------------------

/**
 * Superset of the basic slice-1 filter — adds location and case-linkage
 * predicates so callers can build focused registry views without loading
 * all entries.
 */
export interface RegistryQueryFilter {
  /** Restrict to these entity classes (empty/absent = all). */
  entityClasses?: LiveRegistryEntityClass[]
  /** Restrict to these operational states (empty/absent = all). */
  operationalStates?: LiveRegistryOperationalState[]
  /** Restrict to these truth states (empty/absent = all). */
  truthStates?: LiveRegistryTruthState[]
  /** Minimum confidence inclusive (0..1). */
  minimumConfidence?: number
  /** Exact locationTag match. Absent = all locations. */
  locationTag?: string
  /** Only entries whose linkedCaseIds includes this case id. */
  linkedCaseId?: string
}

// ---------------------------------------------------------------------------
// Certainty cluster
// ---------------------------------------------------------------------------

/**
 * Entries grouped by certainty tier.
 * `confirmed`  → truthState === 'confirmed'
 * `suspected`  → truthState === 'suspected'
 * `unresolved` → truthState === 'inferred' | 'false_positive' | 'missing'
 */
export interface CertaintyCluster {
  confirmed: LiveRegistryEntry[]
  suspected: LiveRegistryEntry[]
  unresolved: LiveRegistryEntry[]
}

// ---------------------------------------------------------------------------
// Registry digest
// ---------------------------------------------------------------------------

/**
 * Structured snapshot of registry state at a given week.
 * Groups entries by role and provides a triage-priority top list.
 */
export interface RegistryDigest {
  week: number
  /** Active confirmed or suspected anomaly/signature entries (threats). */
  confirmedThreats: LiveRegistryEntry[]
  suspectedThreats: LiveRegistryEntry[]
  inferredSignatures: LiveRegistryEntry[]
  staffEntries: LiveRegistryEntry[]
  externalEntries: LiveRegistryEntry[]
  /** Top-N entries by triage priority score across ALL classes. */
  topPriorityEntries: LiveRegistryEntry[]
  /** Count of non-contained active anomaly entries. */
  activeThreatCount: number
  /**
   * True when activeThreatCount >= LIVE_REGISTRY_QUERY_CALIBRATION.overloadThreshold.
   * Signals that operators should triage rather than handle in sequence.
   */
  overloadFlag: boolean
}

// ---------------------------------------------------------------------------
// Triage priority score
// ---------------------------------------------------------------------------

// Operational state weights — higher means more urgent attention needed.
const OP_STATE_WEIGHT: Record<LiveRegistryOperationalState, number> = {
  loose: 100,
  compromised: 80,
  active: 60,
  assigned: 50,
  contained: 20,
  transferred: 10,
}

// Entity class modifier — anomalies and unknowns rank above staff for triage.
const CLASS_WEIGHT: Record<LiveRegistryEntityClass, number> = {
  anomaly: 40,
  signature: 30,
  external: 20,
  staff: 0,
}

// Certainty modifier — confirmed threats need action; confirmed staff is routine.
// For threats: higher certainty = more urgently actionable.
const TRUTH_STATE_WEIGHT: Record<LiveRegistryTruthState, number> = {
  confirmed: 30,
  suspected: 20,
  inferred: 10,
  missing: 8,
  false_positive: 0,
}

/**
 * Compute a deterministic integer triage priority score for a single entry.
 * Higher score = should appear earlier in an operator triage queue.
 *
 * Score components:
 * - Operational state urgency (0..100)
 * - Entity class modifier    (0..40)
 * - Truth-state actionability (0..30)
 * - Confidence bonus         (0..10, rounded)
 *
 * Maximum possible score: 180
 */
export function computeEntryTriagePriority(entry: LiveRegistryEntry): number {
  return (
    OP_STATE_WEIGHT[entry.operationalState] +
    CLASS_WEIGHT[entry.entityClass] +
    TRUTH_STATE_WEIGHT[entry.truthState] +
    Math.round(entry.confidence * 10)
  )
}

// ---------------------------------------------------------------------------
// Core query function
// ---------------------------------------------------------------------------

/**
 * Filter and sort registry entries using an extended predicate set.
 * Results are ordered by triage priority (descending) then by id (ascending)
 * for full determinism.
 */
export function queryRegistryEntries(
  entries: LiveRegistryEntry[],
  filter: RegistryQueryFilter = {}
): LiveRegistryEntry[] {
  return entries
    .filter((entry) =>
      filter.entityClasses && filter.entityClasses.length > 0
        ? filter.entityClasses.includes(entry.entityClass)
        : true
    )
    .filter((entry) =>
      filter.operationalStates && filter.operationalStates.length > 0
        ? filter.operationalStates.includes(entry.operationalState)
        : true
    )
    .filter((entry) =>
      filter.truthStates && filter.truthStates.length > 0
        ? filter.truthStates.includes(entry.truthState)
        : true
    )
    .filter((entry) =>
      typeof filter.minimumConfidence === 'number'
        ? entry.confidence >= filter.minimumConfidence
        : true
    )
    .filter((entry) =>
      filter.locationTag != null && filter.locationTag.length > 0
        ? entry.locationTag === filter.locationTag
        : true
    )
    .filter((entry) =>
      filter.linkedCaseId != null && filter.linkedCaseId.length > 0
        ? entry.linkedCaseIds.includes(filter.linkedCaseId)
        : true
    )
    .sort(
      (left, right) =>
        computeEntryTriagePriority(right) - computeEntryTriagePriority(left) ||
        left.id.localeCompare(right.id)
    )
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Return entries sorted by triage priority, highest first.
 * Tie-breaks by id for determinism.  Does not mutate the input array.
 */
export function sortByTriagePriority(entries: LiveRegistryEntry[]): LiveRegistryEntry[] {
  return [...entries].sort(
    (left, right) =>
      computeEntryTriagePriority(right) - computeEntryTriagePriority(left) ||
      left.id.localeCompare(right.id)
  )
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

/**
 * Group entries by location tag into a stable record.
 * Entries with no locationTag are grouped under the key `'(unknown)'`.
 * Within each group, entries are sorted by triage priority.
 */
export function clusterByLocation(
  entries: LiveRegistryEntry[]
): Record<string, LiveRegistryEntry[]> {
  const clusters: Record<string, LiveRegistryEntry[]> = {}

  for (const entry of entries) {
    const key = entry.locationTag ?? '(unknown)'
    if (clusters[key] == null) {
      clusters[key] = []
    }
    clusters[key].push(entry)
  }

  for (const key of Object.keys(clusters)) {
    clusters[key] = sortByTriagePriority(clusters[key])
  }

  return clusters
}

/**
 * Group entries by certainty tier.
 * Within each tier, entries are sorted by triage priority.
 */
export function clusterByCertainty(entries: LiveRegistryEntry[]): CertaintyCluster {
  const confirmed: LiveRegistryEntry[] = []
  const suspected: LiveRegistryEntry[] = []
  const unresolved: LiveRegistryEntry[] = []

  for (const entry of entries) {
    if (entry.truthState === 'confirmed') {
      confirmed.push(entry)
    } else if (entry.truthState === 'suspected') {
      suspected.push(entry)
    } else {
      unresolved.push(entry)
    }
  }

  return {
    confirmed: sortByTriagePriority(confirmed),
    suspected: sortByTriagePriority(suspected),
    unresolved: sortByTriagePriority(unresolved),
  }
}

// ---------------------------------------------------------------------------
// Registry digest
// ---------------------------------------------------------------------------

/**
 * Build a structured registry digest from a flat entry list.
 *
 * The digest provides:
 * - Pre-grouped lists by role/class
 * - A top-N priority queue across all classes
 * - Active threat count and an overload flag for operator triage
 *
 * This is a pure projection — the source entries are not mutated.
 */
export function buildRegistryDigest(
  entries: LiveRegistryEntry[],
  week: number
): RegistryDigest {
  const confirmedThreats: LiveRegistryEntry[] = []
  const suspectedThreats: LiveRegistryEntry[] = []
  const inferredSignatures: LiveRegistryEntry[] = []
  const staffEntries: LiveRegistryEntry[] = []
  const externalEntries: LiveRegistryEntry[] = []

  for (const entry of entries) {
    if (entry.entityClass === 'staff') {
      staffEntries.push(entry)
    } else if (entry.entityClass === 'external') {
      externalEntries.push(entry)
    } else if (entry.entityClass === 'signature') {
      inferredSignatures.push(entry)
    } else if (entry.entityClass === 'anomaly') {
      if (entry.truthState === 'confirmed') {
        confirmedThreats.push(entry)
      } else {
        suspectedThreats.push(entry)
      }
    }
  }

  // Active threat = non-contained, non-transferred anomaly or signature entries
  const activeThreatCount = [...confirmedThreats, ...suspectedThreats, ...inferredSignatures].filter(
    (e) => e.operationalState !== 'contained' && e.operationalState !== 'transferred'
  ).length

  const topN = LIVE_REGISTRY_QUERY_CALIBRATION.digestTopN
  const topPriorityEntries = sortByTriagePriority(entries).slice(0, topN)

  return {
    week,
    confirmedThreats: sortByTriagePriority(confirmedThreats),
    suspectedThreats: sortByTriagePriority(suspectedThreats),
    inferredSignatures: sortByTriagePriority(inferredSignatures),
    staffEntries: sortByTriagePriority(staffEntries),
    externalEntries: sortByTriagePriority(externalEntries),
    topPriorityEntries,
    activeThreatCount,
    overloadFlag: activeThreatCount >= LIVE_REGISTRY_QUERY_CALIBRATION.overloadThreshold,
  }
}
