/**
 * SPE-1309 slice 4: compose SPE-2108 propagation-resistance tags into cognitive hazard
 * exposure trigger channels.
 *
 * Pure deterministic merge — reads persisted self-censoring information records and merges
 * inferred trigger channels into linked cognitive hazard exposure records without mutating
 * SPE-2108 / SPE-2116 weekly hooks.
 */

import type {
  CognitiveHazardExposureRecord,
  CognitiveHazardExposureRecordsMap,
} from './cognitiveHazardEngine'
import { validateCognitiveHazardExposureRecord } from './cognitiveHazardEngine'
import { mergePropagationResistanceTriggerChannels } from './cognitiveHazardWeeklyOrchestration'
import type {
  PropagationResistanceTag,
  SelfCensoringInformationRecord,
} from './selfCensoringInformationRegistry'

export type CognitiveHazardSiblingLinkMatchKind = 'parent_case_ref' | 'info_record_id'

export interface CognitiveHazardSiblingLink {
  readonly exposureRecordId: string
  readonly selfCensoringInformationId: string
  readonly matchKind: CognitiveHazardSiblingLinkMatchKind
  readonly linkedRef: string
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().toLowerCase()
}

/** Expand a subject or case ref into normalized match keys (namespace prefix variants). */
export function resolveCognitiveHazardSiblingRefKeys(ref: string): readonly string[] {
  const normalized = normalizeToken(ref)
  if (!normalized) {
    return []
  }

  const keys = new Set<string>([normalized])
  const prefixes = ['case:', 'agent:', 'topic:', 'info:'] as const

  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      const stripped = normalized.slice(prefix.length)
      if (stripped) {
        keys.add(stripped)
        keys.add(`${prefix}${stripped}`)
      }
    }
  }

  return Object.freeze([...keys].sort((left, right) => left.localeCompare(right)))
}

function siblingRefKeysOverlap(leftRef: string, rightRef: string): boolean {
  const leftKeys = new Set(resolveCognitiveHazardSiblingRefKeys(leftRef))
  if (leftKeys.size === 0) {
    return false
  }

  for (const key of resolveCognitiveHazardSiblingRefKeys(rightRef)) {
    if (leftKeys.has(key)) {
      return true
    }
  }

  return false
}

function resolveSiblingLinkMatch(
  exposureRecord: CognitiveHazardExposureRecord,
  infoRecord: SelfCensoringInformationRecord
): CognitiveHazardSiblingLink | null {
  const subjectRef = normalizeToken(exposureRecord.subjectRef)
  if (!subjectRef) {
    return null
  }

  const parentCaseRef = normalizeToken(infoRecord.parentCaseRef ?? '')
  if (parentCaseRef && siblingRefKeysOverlap(subjectRef, parentCaseRef)) {
    return {
      exposureRecordId: exposureRecord.id,
      selfCensoringInformationId: infoRecord.id,
      matchKind: 'parent_case_ref',
      linkedRef: parentCaseRef,
    }
  }

  const infoRecordId = normalizeToken(infoRecord.id)
  if (infoRecordId && siblingRefKeysOverlap(subjectRef, infoRecordId)) {
    return {
      exposureRecordId: exposureRecord.id,
      selfCensoringInformationId: infoRecord.id,
      matchKind: 'info_record_id',
      linkedRef: infoRecordId,
    }
  }

  return null
}

/** Whether persisted sibling records link via explicit subject/case ref contract. */
export function refsLinkCognitiveHazardExposureToSelfCensoringInformation(
  exposureRecord: CognitiveHazardExposureRecord,
  infoRecord: SelfCensoringInformationRecord
): boolean {
  return resolveSiblingLinkMatch(exposureRecord, infoRecord) !== null
}

export function listSelfCensoringInformationRecordsForExposureRecord(
  exposureRecord: CognitiveHazardExposureRecord,
  selfCensoringRecords: Record<string, SelfCensoringInformationRecord> | null | undefined
): SelfCensoringInformationRecord[] {
  if (!selfCensoringRecords) {
    return []
  }

  const linked: SelfCensoringInformationRecord[] = []

  for (const recordId of Object.keys(selfCensoringRecords).sort((left, right) =>
    left.localeCompare(right)
  )) {
    const record = selfCensoringRecords[recordId]
    if (!record) {
      continue
    }

    if (refsLinkCognitiveHazardExposureToSelfCensoringInformation(exposureRecord, record)) {
      linked.push(record)
    }
  }

  return linked
}

export function listCognitiveHazardSiblingLinks(
  exposureRecords: CognitiveHazardExposureRecordsMap | null | undefined,
  selfCensoringRecords: Record<string, SelfCensoringInformationRecord> | null | undefined
): readonly CognitiveHazardSiblingLink[] {
  const safeExposureRecords = exposureRecords ?? {}
  const safeSelfCensoringRecords = selfCensoringRecords ?? {}
  const links: CognitiveHazardSiblingLink[] = []

  for (const exposureRecordId of Object.keys(safeExposureRecords).sort((left, right) =>
    left.localeCompare(right)
  )) {
    const exposureRecord = safeExposureRecords[exposureRecordId]
    if (!exposureRecord) {
      continue
    }

    for (const infoRecordId of Object.keys(safeSelfCensoringRecords).sort((left, right) =>
      left.localeCompare(right)
    )) {
      const infoRecord = safeSelfCensoringRecords[infoRecordId]
      if (!infoRecord) {
        continue
      }

      const link = resolveSiblingLinkMatch(exposureRecord, infoRecord)
      if (link) {
        links.push(link)
      }
    }
  }

  return Object.freeze(links)
}

function sortedUniquePropagationResistanceTags(
  records: readonly SelfCensoringInformationRecord[]
): readonly PropagationResistanceTag[] {
  const tags = new Set<PropagationResistanceTag>()

  for (const record of records) {
    for (const tag of record.propagationResistance ?? []) {
      tags.add(tag)
    }
  }

  return Object.freeze([...tags].sort((left, right) => left.localeCompare(right)))
}

/** Collect propagation-resistance tags from sibling records linked to one exposure record. */
export function derivePropagationResistanceTagsForExposureRecord(
  exposureRecord: CognitiveHazardExposureRecord,
  selfCensoringRecords: Record<string, SelfCensoringInformationRecord> | null | undefined
): readonly PropagationResistanceTag[] {
  return sortedUniquePropagationResistanceTags(
    listSelfCensoringInformationRecordsForExposureRecord(exposureRecord, selfCensoringRecords)
  )
}

function composeExposureRecordTriggerChannels(
  record: CognitiveHazardExposureRecord,
  selfCensoringRecords: Record<string, SelfCensoringInformationRecord> | null | undefined
): CognitiveHazardExposureRecord {
  const tags = derivePropagationResistanceTagsForExposureRecord(record, selfCensoringRecords)
  const merged = mergePropagationResistanceTriggerChannels(record, tags)
  if (!merged) {
    return record
  }

  if (!validateCognitiveHazardExposureRecord(merged).valid) {
    return record
  }

  return Object.freeze(merged)
}

/**
 * Merges sibling propagation-resistance tags into linked cognitive hazard exposure records.
 * Empty exposure map or empty sibling map is a no-op.
 */
export function composeSelfCensoringPropagationIntoCognitiveHazardExposureRecords(
  exposureRecords: CognitiveHazardExposureRecordsMap | null | undefined,
  selfCensoringRecords: Record<string, SelfCensoringInformationRecord> | null | undefined
): CognitiveHazardExposureRecordsMap {
  const safeExposureRecords = exposureRecords ?? {}
  const safeSelfCensoringRecords = selfCensoringRecords ?? {}
  const exposureRecordIds = Object.keys(safeExposureRecords)
  const siblingRecordIds = Object.keys(safeSelfCensoringRecords)

  if (exposureRecordIds.length === 0 || siblingRecordIds.length === 0) {
    return safeExposureRecords
  }

  const next: CognitiveHazardExposureRecordsMap = { ...safeExposureRecords }
  let changed = false

  for (const recordId of exposureRecordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeExposureRecords[recordId]
    if (!record) {
      continue
    }

    const composed = composeExposureRecordTriggerChannels(record, safeSelfCensoringRecords)
    if (composed !== record) {
      next[recordId] = composed
      changed = true
    }
  }

  return changed ? next : safeExposureRecords
}
