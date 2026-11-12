/**
 * SPE-1889 slice 10: derive integrated health bundle fragments from persisted
 * welfare-debt accounting records.
 *
 * Pure deterministic projection — consumes hydrated records only; includes
 * warning-only records; does not re-surface invalid or dropped entries.
 */

import {
  projectWelfareDebtAccounting,
  validateWelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecord,
  type WelfareDebtAccountingRecordsMap,
} from './welfareDebtAccountingRegistry'
import { type WelfareDebtAccountingLink } from './containedPersonIntegratedHealthBundleRegistry'

export const WELFARE_DEBT_WIRED_REF_PREFIX = 'welfare-debt:'

export interface DerivedWelfareDebtBundleFragment {
  readonly subjectRef: string
  readonly label: string
  readonly welfareDebtAccountingLinks: readonly WelfareDebtAccountingLink[]
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildWiredRef(debtRef: string): string {
  return `${WELFARE_DEBT_WIRED_REF_PREFIX}${debtRef}`
}

function deriveLinkForRecord(record: WelfareDebtAccountingRecord): WelfareDebtAccountingLink | null {
  const debtRef = normalizeToken(record.id)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!debtRef || !subjectRef) {
    return null
  }

  if (!validateWelfareDebtAccountingRecord(record).valid) {
    return null
  }

  const projection = projectWelfareDebtAccounting(record)

  return Object.freeze({
    debtRef,
    wiredRef: buildWiredRef(debtRef),
    severityBand: projection.severityBand,
    mitigationState: projection.mitigationState,
    containmentBenefitScore: projection.containmentBenefitScore,
  })
}

function buildBundleLabel(
  subjectRef: string,
  records: readonly WelfareDebtAccountingRecord[]
): string {
  const firstLabel = normalizeToken(records[0]?.label ?? '')
  if (firstLabel) {
    return firstLabel
  }

  return `Contained person ${subjectRef}`
}

/**
 * Derives integrated health bundle fragments grouped by subjectRef from hydrated welfare-debt records.
 * Empty map returns an empty frozen array without throw.
 */
export function deriveWelfareDebtBundleFragmentsFromRecords(
  records: WelfareDebtAccountingRecordsMap | null | undefined
): readonly DerivedWelfareDebtBundleFragment[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const recordsBySubject = new Map<string, WelfareDebtAccountingRecord[]>()

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

  const fragments: DerivedWelfareDebtBundleFragment[] = []

  for (const subjectRef of [...recordsBySubject.keys()].sort((left, right) =>
    left.localeCompare(right)
  )) {
    const subjectRecords = recordsBySubject.get(subjectRef) ?? []
    const links: WelfareDebtAccountingLink[] = []

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
        welfareDebtAccountingLinks: Object.freeze(links),
      })
    )
  }

  return Object.freeze(fragments)
}
