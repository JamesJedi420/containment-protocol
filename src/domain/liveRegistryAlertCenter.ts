// SPE-1045 slice 4: alert-center / worklist orchestration.
// Pure functions only; no UI, no GameState rewrites, no map-layer presentation.
// Closes the gap where `appearance` and `disappearance` LiveRegistryAlertTypes
// were declared but never fired.  Adds dedup, suppression, escalation, and a
// fully ordered operator worklist derived from alerts + registry state.

import { LIVE_REGISTRY_ALERT_CENTER_CALIBRATION } from './sim/calibration'
import type {
  LiveRegistryAlert,
  LiveRegistryAlertSeverity,
  LiveRegistryEntry,
  LiveRegistryEntityClass,
} from './liveRegistry'

// ---------------------------------------------------------------------------
// Work-item types
// ---------------------------------------------------------------------------

/**
 * Describes what an operator should *do* in response to an alert.
 *
 * - `investigate`  → new appearance or inferred signature — send recon
 * - `respond`      → entity is loose — dispatch responder
 * - `contain`      → confirmed active threat — assign containment
 * - `verify`       → suspected/inferred — dispatch recon for verification
 * - `monitor`      → watch — no immediate field action required
 * - `escalate`     → requires immediate command-level attention
 */
export type WorkItemKind =
  | 'investigate'
  | 'respond'
  | 'contain'
  | 'verify'
  | 'monitor'
  | 'escalate'

export type WorkItemPriority = 'critical' | 'high' | 'normal' | 'low'

export interface RegistryWorkItem {
  /** Deterministic id: `wi-${entryId}-${alertType}` */
  id: string
  entryId: string
  entryLabel: string
  entityClass: LiveRegistryEntityClass
  kind: WorkItemKind
  priority: WorkItemPriority
  alertType: LiveRegistryAlert['type']
  alertSeverity: LiveRegistryAlertSeverity
  reasonCode: string
  week: number
  /**
   * Number of duplicate alerts suppressed into this work item.
   * 0 = no duplicates; >0 = this item absorbed additional alerts.
   */
  suppressionCount: number
  /**
   * True when the entry's operational state triggered automatic priority
   * promotion (loose or compromised entries).
   */
  escalated: boolean
}

// ---------------------------------------------------------------------------
// Alert worklist
// ---------------------------------------------------------------------------

export interface AlertWorklist {
  week: number
  /** Work items ordered by priority (critical → low) then entryId. */
  items: RegistryWorkItem[]
  criticalCount: number
  escalatedCount: number
  /** Total number of alerts merged or suppressed (not the surviving item count). */
  suppressedAlertCount: number
  /**
   * True when escalatedCount >= LIVE_REGISTRY_ALERT_CENTER_CALIBRATION.escalationOverloadThreshold.
   */
  overloadFlag: boolean
}

// ---------------------------------------------------------------------------
// Appearance / disappearance alert derivation
// (fills the gap not covered by deriveRegistryAlerts in liveRegistry.ts)
// ---------------------------------------------------------------------------

/**
 * Derive an `appearance` alert for a freshly projected or newly created entry.
 *
 * Call this for entries that have no previous registry presence — i.e.,
 * the first time an entity materialises in the live registry.  Do not call
 * for updates to existing entries.
 *
 * Returns null when the entry's truth state is `false_positive` (suppressed
 * at derivation time — there is nothing actionable about a confirmed false lead).
 */
export function deriveAppearanceAlert(
  entry: LiveRegistryEntry,
  week: number
): LiveRegistryAlert | null {
  if (entry.truthState === 'false_positive') {
    return null
  }

  const severity: LiveRegistryAlertSeverity =
    entry.entityClass === 'anomaly' || entry.entityClass === 'signature'
      ? entry.operationalState === 'loose'
        ? 'critical'
        : 'warning'
      : entry.entityClass === 'external'
        ? 'info'
        : 'info'

  return {
    entryId: entry.id,
    type: 'appearance',
    severity,
    week,
    summary: `${entry.label} appeared in registry (${entry.entityClass} / ${entry.truthState})`,
    reasonCode: 'new-registry-entry',
  }
}

/**
 * Derive a `disappearance` alert for entries that have moved to the `missing`
 * operational truth state, i.e., previously tracked entities that are no
 * longer observable.
 *
 * Returns null when the entry truth state is not `missing`.
 */
export function deriveDisappearanceAlert(
  entry: LiveRegistryEntry,
  week: number
): LiveRegistryAlert | null {
  if (entry.truthState !== 'missing') {
    return null
  }

  return {
    entryId: entry.id,
    type: 'disappearance',
    severity: entry.entityClass === 'anomaly' ? 'high' : 'warning',
    week,
    summary: `${entry.label} can no longer be located (missing)`,
    reasonCode: 'entry-gone-missing',
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

/**
 * Collapse alerts with identical `entryId + type + week` into one alert.
 *
 * The surviving alert is the first occurrence.  The number of collapsed
 * duplicates is returned as `suppressionCount` on the work-item that wraps it
 * (not tracked inside LiveRegistryAlert itself to avoid model changes).
 *
 * Returns a map from `entryId|type|week` to `{ alert, suppressionCount }`.
 */
export function deduplicateAlerts(
  alerts: LiveRegistryAlert[]
): Map<string, { alert: LiveRegistryAlert; suppressionCount: number }> {
  const seen = new Map<string, { alert: LiveRegistryAlert; suppressionCount: number }>()

  for (const alert of alerts) {
    const key = `${alert.entryId}|${alert.type}|${alert.week}`
    const existing = seen.get(key)
    if (existing == null) {
      seen.set(key, { alert, suppressionCount: 0 })
    } else {
      existing.suppressionCount += 1
    }
  }

  return seen
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

/**
 * Suppress alerts whose corresponding entry meets a suppression condition.
 *
 * Suppression rules applied (in order):
 * 1. `appearance` alert for a `false_positive` entry → suppressed.
 * 2. Any alert for an entry whose `operationalState` is `contained` and
 *    `truthState` is `confirmed` AND alert type is `confidence_drop` →
 *    suppressed (contained confirmed entities don't need reconfirmation).
 *
 * Returns the surviving alerts as an array (order preserved).
 */
export function suppressAlerts(
  deduplicated: Map<string, { alert: LiveRegistryAlert; suppressionCount: number }>,
  entryIndex: Map<string, LiveRegistryEntry>
): Array<{ alert: LiveRegistryAlert; suppressionCount: number }> {
  const surviving: Array<{ alert: LiveRegistryAlert; suppressionCount: number }> = []

  for (const [, record] of deduplicated) {
    const { alert } = record
    const entry = entryIndex.get(alert.entryId)

    // Rule 1: appearance on false positive
    if (alert.type === 'appearance' && entry?.truthState === 'false_positive') {
      continue
    }

    // Rule 2: confidence_drop on contained+confirmed
    if (
      alert.type === 'confidence_drop' &&
      entry?.operationalState === 'contained' &&
      entry.truthState === 'confirmed'
    ) {
      continue
    }

    surviving.push(record)
  }

  return surviving
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

/**
 * Promote alert severity when the associated entry is in a critical operational
 * state (`loose` or `compromised`).
 *
 * This mutates neither the original alert nor the entry — it returns a new
 * alert with updated severity and sets `escalated = true` on the work items
 * built downstream.
 */
export function escalateAlert(
  alert: LiveRegistryAlert,
  entry: LiveRegistryEntry | undefined
): { alert: LiveRegistryAlert; escalated: boolean } {
  if (entry == null) {
    return { alert, escalated: false }
  }

  const requiresEscalation =
    entry.operationalState === 'loose' || entry.operationalState === 'compromised'

  if (!requiresEscalation) {
    return { alert, escalated: false }
  }

  const promotedSeverity: LiveRegistryAlertSeverity = 'critical'

  return {
    alert:
      alert.severity === promotedSeverity
        ? alert
        : { ...alert, severity: promotedSeverity, reasonCode: `${alert.reasonCode}|escalated` },
    escalated: true,
  }
}

// ---------------------------------------------------------------------------
// Alert → WorkItem mapping
// ---------------------------------------------------------------------------

const ALERT_TYPE_TO_KIND: Record<LiveRegistryAlert['type'], WorkItemKind> = {
  appearance: 'investigate',
  disappearance: 'investigate',
  escape: 'respond',
  compromise: 'escalate',
  transfer: 'monitor',
  confirmation: 'contain',
  confidence_drop: 'verify',
}

const SEVERITY_TO_PRIORITY: Record<LiveRegistryAlertSeverity, WorkItemPriority> = {
  critical: 'critical',
  high: 'high',
  warning: 'normal',
  info: 'low',
}

const WORK_ITEM_PRIORITY_ORDER: Record<WorkItemPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
}

/**
 * Convert a single (possibly escalated) alert into a RegistryWorkItem.
 */
export function alertToWorkItem(
  alert: LiveRegistryAlert,
  entry: LiveRegistryEntry,
  suppressionCount: number,
  escalated: boolean
): RegistryWorkItem {
  const kind: WorkItemKind = ALERT_TYPE_TO_KIND[alert.type]
  const basePriority: WorkItemPriority = SEVERITY_TO_PRIORITY[alert.severity]

  // `confirmation` alert for a non-anomaly entity means nothing actionable to contain
  const resolvedKind: WorkItemKind =
    kind === 'contain' && entry.entityClass !== 'anomaly' && entry.entityClass !== 'signature'
      ? 'monitor'
      : kind

  return {
    id: `wi-${entry.id}-${alert.type}`,
    entryId: entry.id,
    entryLabel: entry.label,
    entityClass: entry.entityClass,
    kind: resolvedKind,
    priority: basePriority,
    alertType: alert.type,
    alertSeverity: alert.severity,
    reasonCode: alert.reasonCode,
    week: alert.week,
    suppressionCount,
    escalated,
  }
}

// ---------------------------------------------------------------------------
// Full worklist pipeline
// ---------------------------------------------------------------------------

/**
 * Build a fully ordered operator worklist from a list of alerts and the
 * current registry entry index.
 *
 * Pipeline:
 * 1. Deduplicate alerts (same entryId + type + week → single item, suppression count tracked).
 * 2. Suppress alerts that match suppression rules.
 * 3. Escalate remaining alerts whose entries are in loose/compromised states.
 * 4. Convert surviving alerts to work items.
 * 5. Sort work items by priority (critical first) then by entryId (stable).
 * 6. Compute aggregate counts and overload flag.
 *
 * Entries not found in the entryIndex are skipped (no orphan work items).
 */
export function buildAlertWorklist(
  alerts: LiveRegistryAlert[],
  entryIndex: Map<string, LiveRegistryEntry>,
  week: number
): AlertWorklist {
  // Step 1: Deduplicate
  const deduplicated = deduplicateAlerts(alerts)

  // Step 2: Suppress
  const surviving = suppressAlerts(deduplicated, entryIndex)

  // Total suppressed = sum of all suppressionCounts across surviving
  // PLUS any alerts discarded entirely by suppression rules.
  const totalAlertsIn = alerts.length
  const survivingAlertCount = surviving.length
  // Dedup-merged = sum of suppressionCounts on survivors
  const dupMerged = surviving.reduce((acc, r) => acc + r.suppressionCount, 0)
  const suppressedAlertCount = totalAlertsIn - survivingAlertCount - dupMerged

  // Step 3 & 4: Escalate and convert to work items
  const items: RegistryWorkItem[] = []

  for (const { alert, suppressionCount } of surviving) {
    const entry = entryIndex.get(alert.entryId)
    if (entry == null) continue

    const { alert: escalatedAlert, escalated } = escalateAlert(alert, entry)
    items.push(alertToWorkItem(escalatedAlert, entry, suppressionCount, escalated))
  }

  // Step 5: Sort
  items.sort(
    (a, b) =>
      WORK_ITEM_PRIORITY_ORDER[a.priority] - WORK_ITEM_PRIORITY_ORDER[b.priority] ||
      a.entryId.localeCompare(b.entryId)
  )

  const criticalCount = items.filter((i) => i.priority === 'critical').length
  const escalatedCount = items.filter((i) => i.escalated).length

  return {
    week,
    items,
    criticalCount,
    escalatedCount,
    suppressedAlertCount: suppressedAlertCount < 0 ? 0 : suppressedAlertCount,
    overloadFlag:
      escalatedCount >= LIVE_REGISTRY_ALERT_CENTER_CALIBRATION.escalationOverloadThreshold,
  }
}

// ---------------------------------------------------------------------------
// Convenience builder
// ---------------------------------------------------------------------------

/**
 * Build an entry index (Map<id, entry>) from a flat list.
 * Convenience for callers that hold a plain array of entries.
 */
export function buildEntryIndex(entries: LiveRegistryEntry[]): Map<string, LiveRegistryEntry> {
  const index = new Map<string, LiveRegistryEntry>()
  for (const entry of entries) {
    index.set(entry.id, entry)
  }
  return index
}
