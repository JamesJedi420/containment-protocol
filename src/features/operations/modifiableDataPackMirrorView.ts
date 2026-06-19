import type { GameState } from '../../domain/models'
import type { ModifiableDataPackRecord } from '../../domain/modifiableDataPackValidation'
import {
  formatModifiableDataPackImportStatusLabel,
  formatModifiableDataPackKindLabel,
  formatModifiableDataPackSectionSummary,
  summarizeModifiableDataPackRecords,
} from '../../domain/modifiableDataPackSurfacing'

export interface ModifiableDataPackMirrorRecordView {
  packId: string
  schemaVersion: string
  packKindLabel: string
  authorRef: string
  issueLinkLabel: string
  importStatusLabel: string
  sectionSummaryLabel: string
  reasonCodeCount: number
}

export interface ModifiableDataPackMirrorSummaryView {
  totalRecords: number
  appliedCount: number
  needsRevisionCount: number
  totalSectionCount: number
  week: number
}

export interface ModifiableDataPackMirrorView {
  isEmpty: boolean
  summary: ModifiableDataPackMirrorSummaryView
  records: readonly ModifiableDataPackMirrorRecordView[]
}

function listPersistedRecords(game: GameState): ModifiableDataPackRecord[] {
  const map = game.modifiableDataPackRecords ?? {}
  return Object.values(map).sort((left, right) => left.packId.localeCompare(right.packId))
}

function toRecordView(record: ModifiableDataPackRecord): ModifiableDataPackMirrorRecordView {
  return Object.freeze({
    packId: record.packId,
    schemaVersion: record.schemaVersion,
    packKindLabel: formatModifiableDataPackKindLabel(record.packKind),
    authorRef: record.authorRef,
    issueLinkLabel: record.issueLink.trim() ? record.issueLink : '—',
    importStatusLabel: formatModifiableDataPackImportStatusLabel(record.importStatus),
    sectionSummaryLabel: formatModifiableDataPackSectionSummary(record),
    reasonCodeCount: record.reasonCodes.length,
  })
}

/** Read-only mirror over hydrated `modifiableDataPackRecords`; does not re-validate hidden truth. */
export function getModifiableDataPackMirrorView(game: GameState): ModifiableDataPackMirrorView {
  const records = listPersistedRecords(game)
  const counts = summarizeModifiableDataPackRecords(game.modifiableDataPackRecords)

  return Object.freeze({
    isEmpty: records.length === 0,
    summary: Object.freeze({
      ...counts,
      week: game.week,
    }),
    records: Object.freeze(records.map((record) => toRecordView(record))),
  })
}
