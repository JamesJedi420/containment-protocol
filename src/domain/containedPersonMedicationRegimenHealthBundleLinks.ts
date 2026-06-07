/**
 * SPE-1889 slice 8: derive integrated health bundle fragments from persisted
 * contained-person medication regimen records.
 *
 * Pure deterministic projection — consumes hydrated records only; includes
 * warning-only records; does not re-surface invalid or dropped entries.
 */

import {
  projectMedicationInteractionRisk,
  validateMedicationRegimenRecord,
  type MedicationRegimenRecord,
  type MedicationRegimenRecordsMap,
} from './containedPersonMedicationRegimenRegistry'
import { type MedicationRegimenLink } from './containedPersonIntegratedHealthBundleRegistry'

export const MEDICATION_REGIMEN_WIRED_REF_PREFIX = 'medication-regimen:'

export interface DerivedMedicationRegimenBundleFragment {
  readonly subjectRef: string
  readonly label: string
  readonly medicationRegimenLinks: readonly MedicationRegimenLink[]
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildWiredRef(regimenRef: string): string {
  return `${MEDICATION_REGIMEN_WIRED_REF_PREFIX}${regimenRef}`
}

function deriveLinkForRecord(record: MedicationRegimenRecord): MedicationRegimenLink | null {
  const regimenRef = normalizeToken(record.id)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!regimenRef || !subjectRef) {
    return null
  }

  if (!validateMedicationRegimenRecord(record).valid) {
    return null
  }

  const projection = projectMedicationInteractionRisk(record)

  return Object.freeze({
    regimenRef,
    wiredRef: buildWiredRef(regimenRef),
    consentStatus: projection.consentStatus,
    deliveryVector: projection.deliveryVector,
    interactionRiskScore: projection.interactionRiskScore,
    adverseReactionFlag: projection.adverseReactionFlag,
  })
}

function buildBundleLabel(
  subjectRef: string,
  records: readonly MedicationRegimenRecord[]
): string {
  const firstLabel = normalizeToken(records[0]?.label ?? '')
  if (firstLabel) {
    return firstLabel
  }

  return `Contained person ${subjectRef}`
}

/**
 * Derives integrated health bundle fragments grouped by subjectRef from hydrated regimen records.
 * Empty map returns an empty frozen array without throw.
 */
export function deriveMedicationRegimenBundleFragmentsFromRecords(
  records: MedicationRegimenRecordsMap | null | undefined
): readonly DerivedMedicationRegimenBundleFragment[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const recordsBySubject = new Map<string, MedicationRegimenRecord[]>()

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const subjectRef = normalizeToken(record.subjectRef)
    if (!subjectRef) {
      continue
    }

    const existing = recordsBySubject.get(subjectRef) ?? []
    existing.push(record)
    recordsBySubject.set(subjectRef, existing)
  }

  const fragments: DerivedMedicationRegimenBundleFragment[] = []

  for (const subjectRef of [...recordsBySubject.keys()].sort((left, right) =>
    left.localeCompare(right)
  )) {
    const subjectRecords = recordsBySubject.get(subjectRef) ?? []
    const links: MedicationRegimenLink[] = []

    for (const record of subjectRecords.sort((left, right) => left.id.localeCompare(right.id))) {
      const link = deriveLinkForRecord(record)
      if (link) {
        links.push(link)
      }
    }

    if (links.length === 0) {
      continue
    }

    fragments.push(
      Object.freeze({
        subjectRef,
        label: buildBundleLabel(subjectRef, subjectRecords),
        medicationRegimenLinks: Object.freeze(links),
      })
    )
  }

  return Object.freeze(fragments)
}
