import { clamp } from './math'
import { LIVE_REGISTRY_CALIBRATION } from './sim/calibration'

export type LiveRegistryEntityClass = 'anomaly' | 'staff' | 'external' | 'signature'

export type LiveRegistryTruthState =
  | 'confirmed'
  | 'suspected'
  | 'inferred'
  | 'false_positive'
  | 'missing'

export type LiveRegistryOperationalState =
  | 'active'
  | 'contained'
  | 'loose'
  | 'assigned'
  | 'compromised'
  | 'transferred'

export type LiveRegistryTransitionKind = 'operational_state' | 'truth_state' | 'both'

export interface LiveRegistryTransitionRecord {
  week: number
  reasonCode: string
  triggerSource: string
  kind: LiveRegistryTransitionKind
  fromOperationalState: LiveRegistryOperationalState
  toOperationalState: LiveRegistryOperationalState
  fromTruthState: LiveRegistryTruthState
  toTruthState: LiveRegistryTruthState
}

export type LiveRegistryAlertType =
  | 'appearance'
  | 'disappearance'
  | 'escape'
  | 'compromise'
  | 'transfer'
  | 'confirmation'
  | 'confidence_drop'

export type LiveRegistryAlertSeverity = 'info' | 'warning' | 'high' | 'critical'

export interface LiveRegistryAlert {
  entryId: string
  type: LiveRegistryAlertType
  severity: LiveRegistryAlertSeverity
  week: number
  summary: string
  reasonCode: string
}

export interface LiveRegistryEntry {
  id: string
  entityId: string
  entityClass: LiveRegistryEntityClass
  label: string
  operationalState: LiveRegistryOperationalState
  truthState: LiveRegistryTruthState
  confidence: number
  locationTag?: string
  linkedCaseIds: string[]
  createdWeek: number
  lastUpdatedWeek: number
  transitionLog: LiveRegistryTransitionRecord[]
}

export interface CreateLiveRegistryEntryInput {
  id: string
  entityId: string
  entityClass: LiveRegistryEntityClass
  label: string
  operationalState: LiveRegistryOperationalState
  truthState: LiveRegistryTruthState
  confidence: number
  locationTag?: string
  linkedCaseIds?: string[]
  week: number
}

export interface UpdateLiveRegistryEntryInput {
  operationalState?: LiveRegistryOperationalState
  truthState?: LiveRegistryTruthState
  confidence?: number
  locationTag?: string
  linkedCaseIds?: string[]
  week: number
  reasonCode: string
  triggerSource?: string
}

export interface LiveRegistryFilterInput {
  entityClasses?: LiveRegistryEntityClass[]
  operationalStates?: LiveRegistryOperationalState[]
  truthStates?: LiveRegistryTruthState[]
  minimumConfidence?: number
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueStrings(values: string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeString).filter((value) => value.length > 0))]
}

function normalizeWeek(value: number) {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0))
}

function normalizeConfidence(value: number) {
  return Number(clamp(Number.isFinite(value) ? value : 0, 0, 1).toFixed(4))
}

export function createLiveRegistryEntry(input: CreateLiveRegistryEntryInput): LiveRegistryEntry {
  const week = normalizeWeek(input.week)

  return {
    id: normalizeString(input.id),
    entityId: normalizeString(input.entityId),
    entityClass: input.entityClass,
    label: normalizeString(input.label),
    operationalState: input.operationalState,
    truthState: input.truthState,
    confidence: normalizeConfidence(input.confidence),
    ...(normalizeString(input.locationTag).length > 0
      ? { locationTag: normalizeString(input.locationTag) }
      : {}),
    linkedCaseIds: uniqueStrings(input.linkedCaseIds),
    createdWeek: week,
    lastUpdatedWeek: week,
    transitionLog: [],
  }
}

export function recordRegistryTransition(
  entry: LiveRegistryEntry,
  input: {
    week: number
    reasonCode: string
    triggerSource?: string
    fromOperationalState?: LiveRegistryOperationalState
    fromTruthState?: LiveRegistryTruthState
  }
): LiveRegistryEntry {
  const fromOperationalState = input.fromOperationalState ?? entry.operationalState
  const fromTruthState = input.fromTruthState ?? entry.truthState

  const kind: LiveRegistryTransitionKind =
    fromOperationalState !== entry.operationalState && fromTruthState !== entry.truthState
      ? 'both'
      : fromOperationalState !== entry.operationalState
        ? 'operational_state'
        : fromTruthState !== entry.truthState
          ? 'truth_state'
          : 'both'

  const record: LiveRegistryTransitionRecord = {
    week: normalizeWeek(input.week),
    reasonCode: normalizeString(input.reasonCode) || 'state-change',
    triggerSource: normalizeString(input.triggerSource) || 'live-registry',
    kind,
    fromOperationalState,
    toOperationalState: entry.operationalState,
    fromTruthState,
    toTruthState: entry.truthState,
  }

  return {
    ...entry,
    lastUpdatedWeek: normalizeWeek(input.week),
    transitionLog: [...entry.transitionLog, record],
  }
}

export function updateLiveRegistryEntry(
  entry: LiveRegistryEntry,
  patch: UpdateLiveRegistryEntryInput
): LiveRegistryEntry {
  const next: LiveRegistryEntry = {
    ...entry,
    ...(patch.operationalState ? { operationalState: patch.operationalState } : {}),
    ...(patch.truthState ? { truthState: patch.truthState } : {}),
    ...(typeof patch.confidence === 'number'
      ? { confidence: normalizeConfidence(patch.confidence) }
      : {}),
    ...(patch.locationTag !== undefined
      ? normalizeString(patch.locationTag).length > 0
        ? { locationTag: normalizeString(patch.locationTag) }
        : { locationTag: undefined }
      : {}),
    ...(patch.linkedCaseIds ? { linkedCaseIds: uniqueStrings(patch.linkedCaseIds) } : {}),
    lastUpdatedWeek: normalizeWeek(patch.week),
  }

  const operationalChanged = entry.operationalState !== next.operationalState
  const truthChanged = entry.truthState !== next.truthState

  if (!operationalChanged && !truthChanged) {
    return next
  }

  return recordRegistryTransition(next, {
    week: patch.week,
    reasonCode: patch.reasonCode,
    triggerSource: patch.triggerSource,
    fromOperationalState: entry.operationalState,
    fromTruthState: entry.truthState,
  })
}

export function deriveRegistryAlerts(
  previous: LiveRegistryEntry,
  next: LiveRegistryEntry
): LiveRegistryAlert[] {
  const alerts: LiveRegistryAlert[] = []
  const week = Math.max(previous.lastUpdatedWeek, next.lastUpdatedWeek)

  if (
    previous.operationalState === 'contained' &&
    next.operationalState === 'loose'
  ) {
    alerts.push({
      entryId: next.id,
      type: 'escape',
      severity: LIVE_REGISTRY_CALIBRATION.alertSeverities.escape,
      week,
      summary: `${next.label} escaped containment`,
      reasonCode: 'contained-to-loose',
    })
  }

  if (previous.operationalState !== 'compromised' && next.operationalState === 'compromised') {
    alerts.push({
      entryId: next.id,
      type: 'compromise',
      severity: LIVE_REGISTRY_CALIBRATION.alertSeverities.compromise,
      week,
      summary: `${next.label} is now compromised`,
      reasonCode: 'state-compromised',
    })
  }

  if (previous.operationalState !== 'transferred' && next.operationalState === 'transferred') {
    alerts.push({
      entryId: next.id,
      type: 'transfer',
      severity: LIVE_REGISTRY_CALIBRATION.alertSeverities.transfer,
      week,
      summary: `${next.label} transferred zones`,
      reasonCode: 'state-transferred',
    })
  }

  if (previous.truthState === 'inferred' && next.truthState === 'confirmed') {
    alerts.push({
      entryId: next.id,
      type: 'confirmation',
      severity: LIVE_REGISTRY_CALIBRATION.alertSeverities.confirmation,
      week,
      summary: `${next.label} identity confirmed`,
      reasonCode: 'inferred-to-confirmed',
    })
  }

  if (
    previous.confidence >= LIVE_REGISTRY_CALIBRATION.confidenceDropThreshold &&
    next.confidence < LIVE_REGISTRY_CALIBRATION.confidenceDropThreshold
  ) {
    alerts.push({
      entryId: next.id,
      type: 'confidence_drop',
      severity: LIVE_REGISTRY_CALIBRATION.alertSeverities.confidenceDrop,
      week,
      summary: `${next.label} confidence dropped below operational threshold`,
      reasonCode: 'confidence-drop-threshold',
    })
  }

  return alerts
}

export function filterLiveRegistryEntries(
  entries: LiveRegistryEntry[],
  filter: LiveRegistryFilterInput = {}
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
        ? entry.confidence >= normalizeConfidence(filter.minimumConfidence)
        : true
    )
    .sort(
      (left, right) =>
        right.lastUpdatedWeek - left.lastUpdatedWeek || left.id.localeCompare(right.id)
    )
}
