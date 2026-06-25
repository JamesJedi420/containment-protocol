import {
  projectAffiliationPersonStatusSnapshot,
  type AffiliationPersonStatusRecord,
  type AffiliationPersonStatusRecordsMap,
  type AffiliationPersonStatusSnapshot,
} from './affiliationPersonStatusRecords'
import type { EntityWelfareReclassificationRecordsMap } from './entityWelfareReclassificationRegistry'
import type { Agent, Team } from './models'
import type { Candidate } from './recruitment'

export interface AffiliationPersonStatusMissionRoutingEvidenceEntry {
  readonly record: AffiliationPersonStatusRecord
  readonly snapshot: AffiliationPersonStatusSnapshot
}

export function selectAffiliationPersonStatusMissionRoutingEvidence(input: {
  readonly records: AffiliationPersonStatusRecordsMap | null | undefined
  readonly team: Pick<Team, 'id'>
  readonly members: readonly Pick<Agent, 'id'>[]
  readonly candidates?: readonly Candidate[] | Record<string, Candidate> | null
  readonly entityWelfareReclassificationRecords?: EntityWelfareReclassificationRecordsMap | null
}): readonly AffiliationPersonStatusMissionRoutingEvidenceEntry[] {
  const records = input.records ?? {}
  const subjectIds = new Set([input.team.id, ...input.members.map((member) => member.id)])

  return Object.freeze(
    Object.keys(records)
      .sort((left, right) => left.localeCompare(right))
      .filter((recordId) => subjectIds.has(records[recordId]?.subjectId ?? ''))
      .map((recordId) => {
        const record = records[recordId]!
        return Object.freeze({
          record,
          snapshot: projectAffiliationPersonStatusSnapshot({
            record,
            candidates: input.candidates,
            entityWelfareReclassificationRecords: input.entityWelfareReclassificationRecords,
          }),
        })
      })
  )
}
