/**
 * SPE-2122 slice 5 / SPE-2109: compose population-emergence-derived normalization
 * inputs into persisted public disclosure records.
 *
 * Pure deterministic merge — strips prior wired inputs by population-emergence ref prefix,
 * preserves authored normalization inputs, and appends fresh derived inputs on qualifying
 * disclosure records only.
 */

import {
  validatePublicDisclosureRecord,
  type AwarenessLevel,
  type NormalizationInput,
  type PublicDisclosureRecord,
  type PublicDisclosureRecordsMap,
} from './publicDisclosureStateRegistry'

const POPULATION_EMERGENCE_REF_PREFIX = 'population-emergence:'

const DISCLOSURE_AWARENESS_LEVELS_FOR_EMERGENCE_WIRE = new Set<AwarenessLevel>([
  'official_disclosure',
  'normalization',
])

function isWiredPopulationEmergenceInput(input: NormalizationInput): boolean {
  const ref = typeof input.ref === 'string' ? input.ref.trim() : ''
  return ref.startsWith(POPULATION_EMERGENCE_REF_PREFIX)
}

function sortNormalizationInputs(inputs: readonly NormalizationInput[]): readonly NormalizationInput[] {
  return Object.freeze(
    [...inputs].sort((left, right) => {
      const refCompare = (left.ref ?? '').localeCompare(right.ref ?? '')
      if (refCompare !== 0) {
        return refCompare
      }

      const kindCompare = left.kind.localeCompare(right.kind)
      if (kindCompare !== 0) {
        return kindCompare
      }

      return left.descriptor.localeCompare(right.descriptor)
    })
  )
}

function mergeNormalizationInputs(
  existing: readonly NormalizationInput[] | undefined,
  derived: readonly NormalizationInput[]
): readonly NormalizationInput[] {
  const preserved = (existing ?? []).filter((input) => !isWiredPopulationEmergenceInput(input))
  return sortNormalizationInputs([...preserved, ...derived])
}

function qualifiesForEmergenceWire(record: PublicDisclosureRecord): boolean {
  return DISCLOSURE_AWARENESS_LEVELS_FOR_EMERGENCE_WIRE.has(record.awarenessLevel)
}

function composeRecordNormalizationInputs(
  record: PublicDisclosureRecord,
  derivedInputs: readonly NormalizationInput[]
): PublicDisclosureRecord {
  const merged = mergeNormalizationInputs(record.normalizationInputs, derivedInputs)
  const existing = record.normalizationInputs ?? []

  if (
    merged.length === existing.length &&
    merged.every((input, index) => {
      const prior = existing[index]
      return (
        prior &&
        prior.kind === input.kind &&
        prior.descriptor === input.descriptor &&
        prior.ref === input.ref
      )
    })
  ) {
    return record
  }

  const candidate: PublicDisclosureRecord =
    merged.length > 0
      ? {
          ...record,
          normalizationInputs: merged,
        }
      : {
          ...record,
          normalizationInputs: undefined,
        }

  if (!validatePublicDisclosureRecord(candidate).valid) {
    return record
  }

  return Object.freeze(candidate)
}

/**
 * Merges population-emergence-derived normalization inputs into qualifying disclosure records.
 * Empty disclosure map or empty derived inputs with no prior wired inputs is a no-op.
 */
export function composePopulationEmergenceNormalizationIntoDisclosureRecords(
  disclosureRecords: PublicDisclosureRecordsMap | null | undefined,
  derivedInputs: readonly NormalizationInput[]
): PublicDisclosureRecordsMap {
  const safeRecords = disclosureRecords ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const next: PublicDisclosureRecordsMap = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    if (!qualifiesForEmergenceWire(record)) {
      if ((record.normalizationInputs ?? []).some(isWiredPopulationEmergenceInput)) {
        const stripped = composeRecordNormalizationInputs(record, [])
        if (stripped !== record) {
          next[recordId] = stripped
          changed = true
        }
      }
      continue
    }

    const composed = composeRecordNormalizationInputs(record, derivedInputs)
    if (composed !== record) {
      next[recordId] = composed
      changed = true
    }
  }

  return changed ? next : safeRecords
}
