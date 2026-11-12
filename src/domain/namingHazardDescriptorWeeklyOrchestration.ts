/**
 * SPE-2116 slice 4: weekly orchestration for persisted naming-hazard descriptor records.
 *
 * Pure deterministic tick: substitution-policy hardening and confidence erosion
 * using existing record fields only. Does not add persistence fields or wire UI.
 */

import {
  validateNamingHazardDescriptorRecord,
  type MapLabelMode,
  type NamingHazardDescriptorRecord,
  type NamingHazardDescriptorRecordsMap,
  type UiSubstitutionPolicy,
} from './namingHazardDescriptorRegistry'

const ORCHESTRATION_WEEK_TOKEN_PREFIX = 'orchestration_week:'
const CONFIDENCE_EROSION_STEP = 0.02
const CONFIDENCE_FLOOR = 0.25

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function sortedUniqueStrings(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)))
}

function orchestrationWeekToken(week: number): string {
  return `${ORCHESTRATION_WEEK_TOKEN_PREFIX}${normalizeWeek(week)}`
}

function hasOrchestrationWeekMarker(record: NamingHazardDescriptorRecord, week: number): boolean {
  return asStringArray(record.unknownFields).includes(orchestrationWeekToken(week))
}

function appendOrchestrationWeekMarker(
  unknownFields: readonly string[] | undefined,
  week: number
): readonly string[] {
  return sortedUniqueStrings([...asStringArray(unknownFields), orchestrationWeekToken(week)])
}

function freezeRecord(record: NamingHazardDescriptorRecord): NamingHazardDescriptorRecord {
  return Object.freeze({ ...record })
}

function resolveNextUiSubstitutionPolicy(
  policy: UiSubstitutionPolicy
): UiSubstitutionPolicy | undefined {
  if (policy === 'redacted') {
    return undefined
  }

  if (policy === 'pool_descriptor') {
    return 'pool_with_grid_fallback'
  }

  if (policy === 'pool_with_grid_fallback' || policy === 'grid_ref') {
    return 'redacted'
  }

  return undefined
}

function resolveNextMapLabelModeForRedactedPolicy(
  mapLabelMode: MapLabelMode
): MapLabelMode | undefined {
  return mapLabelMode === 'redacted' ? undefined : 'redacted'
}

function resolveNextConfidenceErosion(
  record: NamingHazardDescriptorRecord
): Pick<NamingHazardDescriptorRecord, 'confidence' | 'redactedFields'> | undefined {
  if (record.uiSubstitutionPolicy === 'redacted') {
    return undefined
  }

  if (record.confidence === undefined) {
    return undefined
  }

  const redactedFields = asStringArray(record.redactedFields)
  if (redactedFields.includes('confidence')) {
    return undefined
  }

  const nextConfidence = Math.max(CONFIDENCE_FLOOR, record.confidence - CONFIDENCE_EROSION_STEP)
  const reachedFloor = nextConfidence <= CONFIDENCE_FLOOR

  if (reachedFloor) {
    return {
      confidence: CONFIDENCE_FLOOR,
      redactedFields: sortedUniqueStrings([...redactedFields, 'confidence']),
    }
  }

  if (nextConfidence === record.confidence) {
    return undefined
  }

  return { confidence: nextConfidence }
}

function buildSubstitutionHardeningCandidate(
  record: NamingHazardDescriptorRecord,
  week: number
): NamingHazardDescriptorRecord | undefined {
  if (!record.trueNameForbidden || record.uiSubstitutionPolicy === 'redacted') {
    return undefined
  }

  const nextPolicy = resolveNextUiSubstitutionPolicy(record.uiSubstitutionPolicy)
  if (!nextPolicy) {
    return undefined
  }

  const nextMapLabelMode =
    nextPolicy === 'redacted'
      ? resolveNextMapLabelModeForRedactedPolicy(record.mapLabelMode)
      : undefined

  return {
    ...record,
    uiSubstitutionPolicy: nextPolicy,
    ...(nextMapLabelMode ? { mapLabelMode: nextMapLabelMode } : {}),
    unknownFields: appendOrchestrationWeekMarker(record.unknownFields, week),
  }
}

function buildConfidenceErosionCandidate(
  record: NamingHazardDescriptorRecord,
  week: number
): NamingHazardDescriptorRecord | undefined {
  const erosion = resolveNextConfidenceErosion(record)
  if (!erosion) {
    return undefined
  }

  return {
    ...record,
    ...erosion,
    unknownFields: appendOrchestrationWeekMarker(record.unknownFields, week),
  }
}

function buildWeeklyAdvanceCandidate(
  record: NamingHazardDescriptorRecord,
  week: number
): NamingHazardDescriptorRecord | undefined {
  if (hasOrchestrationWeekMarker(record, week)) {
    return undefined
  }

  const substitutionCandidate = buildSubstitutionHardeningCandidate(record, week)
  if (substitutionCandidate) {
    return substitutionCandidate
  }

  return buildConfidenceErosionCandidate(record, week)
}

/**
 * Advances one record for the simulation week: substitution hardening or confidence erosion.
 * Returns the same reference when no bounded field changes.
 */
export function advanceNamingHazardDescriptorRecordForWeek(
  record: NamingHazardDescriptorRecord,
  week: number
): NamingHazardDescriptorRecord {
  const normalizedWeek = normalizeWeek(week)
  const candidate = buildWeeklyAdvanceCandidate(record, normalizedWeek)

  if (!candidate) {
    return record
  }

  if (!validateNamingHazardDescriptorRecord(candidate).valid) {
    return record
  }

  return freezeRecord(candidate)
}

/**
 * Applies one weekly orchestration pass over persisted naming-hazard descriptor records.
 * Empty map is a no-op. Re-applying after advance is idempotent for the same week.
 */
export function applyWeeklyNamingHazardDescriptorTick(
  records: NamingHazardDescriptorRecordsMap | null | undefined,
  week: number
): NamingHazardDescriptorRecordsMap {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const normalizedWeek = normalizeWeek(week)
  const next: NamingHazardDescriptorRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, normalizedWeek)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}
