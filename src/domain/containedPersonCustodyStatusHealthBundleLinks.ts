/**
 * SPE-1889 slice 9: derive integrated health bundle fragments from persisted
 * contained-person custody status records.
 *
 * Pure deterministic projection — consumes hydrated records only; includes
 * warning-only records; does not re-surface invalid or dropped entries.
 */

import {
  projectCustodyDisposition,
  validateCustodyStatusRecord,
  type CustodyStatusRecord,
  type CustodyStatusRecordsMap,
} from './containedPersonCustodyStatusRegistry'
import { type CustodyStatusLink } from './containedPersonIntegratedHealthBundleRegistry'

export const CUSTODY_STATUS_WIRED_REF_PREFIX = 'custody-status:'

export interface DerivedCustodyStatusBundleFragment {
  readonly subjectRef: string
  readonly label: string
  readonly custodyStatusLinks: readonly CustodyStatusLink[]
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildWiredRef(custodyRef: string): string {
  return `${CUSTODY_STATUS_WIRED_REF_PREFIX}${custodyRef}`
}

function deriveLinkForRecord(record: CustodyStatusRecord): CustodyStatusLink | null {
  const custodyRef = normalizeToken(record.id)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!custodyRef || !subjectRef) {
    return null
  }

  if (!validateCustodyStatusRecord(record).valid) {
    return null
  }

  const projection = projectCustodyDisposition(record)

  return Object.freeze({
    custodyRef,
    wiredRef: buildWiredRef(custodyRef),
    custodyStage: projection.custodyStage,
    formerRoleCategory: projection.formerRoleCategory,
    restrictionLevel: projection.restrictionLevel,
    rightsReviewPending: projection.rightsReviewPending,
  })
}

function buildBundleLabel(
  subjectRef: string,
  records: readonly CustodyStatusRecord[]
): string {
  const firstLabel = normalizeToken(records[0]?.label ?? '')
  if (firstLabel) {
    return firstLabel
  }

  return `Contained person ${subjectRef}`
}

/**
 * Derives integrated health bundle fragments grouped by subjectRef from hydrated custody records.
 * Empty map returns an empty frozen array without throw.
 */
export function deriveCustodyStatusBundleFragmentsFromRecords(
  records: CustodyStatusRecordsMap | null | undefined
): readonly DerivedCustodyStatusBundleFragment[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const recordsBySubject = new Map<string, CustodyStatusRecord[]>()

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

  const fragments: DerivedCustodyStatusBundleFragment[] = []

  for (const subjectRef of [...recordsBySubject.keys()].sort((left, right) =>
    left.localeCompare(right)
  )) {
    const subjectRecords = recordsBySubject.get(subjectRef) ?? []
    const links: CustodyStatusLink[] = []

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
        custodyStatusLinks: Object.freeze(links),
      })
    )
  }

  return Object.freeze(fragments)
}
