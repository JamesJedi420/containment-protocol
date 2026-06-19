/**
 * SPE-2492 slice 1: read-only surfacing for modifiable data-pack records.
 *
 * CP-neutral labels only; no validation or import side effects from surfacing helpers.
 */

import type {
  ModifiableDataPackImportStatus,
  ModifiableDataPackKind,
  ModifiableDataPackRecord,
  ModifiableDataPackRecordsMap,
} from './modifiableDataPackValidation'

export function formatModifiableDataPackKindLabel(kind: ModifiableDataPackKind | string): string {
  return kind
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatModifiableDataPackImportStatusLabel(
  status: ModifiableDataPackImportStatus | string
): string {
  return status
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function summarizeModifiableDataPackRecords(
  records: ModifiableDataPackRecordsMap | null | undefined
): {
  readonly totalRecords: number
  readonly appliedCount: number
  readonly needsRevisionCount: number
  readonly totalSectionCount: number
} {
  const safeRecords = records ?? {}
  const values = Object.values(safeRecords)

  return Object.freeze({
    totalRecords: values.length,
    appliedCount: values.filter((record) => record.importStatus === 'applied').length,
    needsRevisionCount: values.filter((record) => record.importStatus === 'needs_revision').length,
    totalSectionCount: values.reduce(
      (sum, record) => sum + record.modifiableSections.length,
      0
    ),
  })
}

export function formatModifiableDataPackSectionSummary(record: ModifiableDataPackRecord): string {
  const count = record.modifiableSections.length
  if (count === 0) {
    return 'No sections'
  }

  if (count === 1) {
    return `1 section (${record.modifiableSections[0]?.sectionKey ?? '—'})`
  }

  return `${count} sections`
}
