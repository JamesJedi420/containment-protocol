/**
 * SPE-2122 slice 5: derive public-disclosure normalization inputs from persisted
 * mass anomalous population emergence records.
 *
 * Pure deterministic projection — consumes hydrated records only; does not re-surface
 * invalid or dropped entries. Governance-mode-specific input kinds with week-drift
 * surge context via resolvePopulationEmergenceGovernanceSurgeForWeek.
 */

import {
  FRANCHISE_TOKEN_PATTERN,
  BRANDED_OBJECT_NUMBER_PATTERN,
  validatePopulationEmergenceRecord,
  type GovernanceMode,
  type MassAnomalousPopulationEmergenceRecordsMap,
  type PopulationEmergenceRecord,
} from './massAnomalousPopulationEmergenceRegistry'
import { resolvePopulationEmergenceGovernanceSurgeForWeek } from './massAnomalousPopulationEmergenceWeeklyGovernance'
import type { NormalizationInput, NormalizationInputKind } from './publicDisclosureStateRegistry'

export interface DerivePopulationEmergenceNormalizationInputsPolicy {
  readonly week?: number
}

const GOVERNANCE_MODE_NORMALIZATION_KIND: Readonly<Record<GovernanceMode, NormalizationInputKind>> =
  {
    secrecy_restore: 'cleanup_front',
    managed_disclosure: 'mass_anomalous_population_emergence',
    collapsed_masquerade: 'community_integration_program',
  }

function normalizeWeek(week: number | undefined): number {
  if (typeof week !== 'number' || !Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function containsForbiddenToken(value: string): boolean {
  const token = normalizeToken(value)
  return (
    token.length > 0 &&
    (FRANCHISE_TOKEN_PATTERN.test(token) || BRANDED_OBJECT_NUMBER_PATTERN.test(token))
  )
}

function buildDescriptor(
  record: PopulationEmergenceRecord,
  week: number
): string | null {
  const label = normalizeToken(record.label)
  if (!label || containsForbiddenToken(label)) {
    return null
  }

  const projection = resolvePopulationEmergenceGovernanceSurgeForWeek(record, week)
  const backlogWeeks = record.registrationBacklogWeeks
  const surgeFragment =
    projection.governanceSurgeBand !== null
      ? `, governance surge ${projection.governanceSurgeBand}`
      : ''

  const descriptor = `${record.emergenceMagnitudeBand} ${record.governanceMode} population emergence normalization driver: ${label} (backlog ${backlogWeeks}w${surgeFragment})`

  if (!descriptor || containsForbiddenToken(descriptor)) {
    return null
  }

  return descriptor
}

function deriveInputForRecord(
  record: PopulationEmergenceRecord,
  week: number
): NormalizationInput | null {
  const recordId = normalizeToken(record.id)
  if (!recordId || containsForbiddenToken(recordId)) {
    return null
  }

  if (!validatePopulationEmergenceRecord(record).valid) {
    return null
  }

  const descriptor = buildDescriptor(record, week)
  if (!descriptor) {
    return null
  }

  const kind = GOVERNANCE_MODE_NORMALIZATION_KIND[record.governanceMode]

  return Object.freeze({
    kind,
    descriptor,
    ref: recordId,
  })
}

/**
 * Derives disclosure normalization inputs from hydrated population emergence records.
 * Empty map returns an empty frozen array without throw.
 */
export function deriveNormalizationInputsFromPopulationEmergenceRecords(
  records: MassAnomalousPopulationEmergenceRecordsMap | null | undefined,
  policy: DerivePopulationEmergenceNormalizationInputsPolicy = {}
): readonly NormalizationInput[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const week = normalizeWeek(policy.week)
  const inputs: NormalizationInput[] = []

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const input = deriveInputForRecord(record, week)
    if (input) {
      inputs.push(input)
    }
  }

  return Object.freeze(inputs)
}
