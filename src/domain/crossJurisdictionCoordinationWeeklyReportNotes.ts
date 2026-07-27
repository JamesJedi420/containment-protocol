/**
 * SPE-2702: weekly report notes for cross-jurisdiction coordination packets.
 *
 * Emits deterministic notes from read-time distant-reappearance projections — no new persistence.
 */

import {
  projectCrossJurisdictionCoordinationPackets,
  type CrossJurisdictionCoordinationPacket,
} from './crossJurisdictionCoordinationPacket'
import type { InformationIntakeReportsMap } from './informationIntakeReport'
import type { CaseInstance, ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

export function formatCrossJurisdictionCoordinationNoteContent(
  packet: CrossJurisdictionCoordinationPacket,
  week: number
): string {
  return `Week ${week} — ${packet.summary}`
}

/** Builds weekly report notes when distant signature reappearance yields coordination packets. */
export function buildWeeklyCrossJurisdictionCoordinationReportNotes(input: {
  reports: InformationIntakeReportsMap | null | undefined
  cases: Record<string, Pick<CaseInstance, 'id' | 'tags' | 'regionTag' | 'status' | 'title'>> | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const packets = projectCrossJurisdictionCoordinationPackets({
    reports: input.reports,
    cases: input.cases,
  })

  if (packets.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const packet of packets) {
    notes.push(
      createDeterministicReportNote(
        formatCrossJurisdictionCoordinationNoteContent(packet, input.week),
        input.week,
        sequence,
        input.baseTimestamp,
        'agency.cross_jurisdiction_coordination',
        {
          packetId: packet.packetId,
          kind: packet.kind,
          topicRef: packet.topicRef,
          intakeReportId: packet.intakeReportId,
          signatureMatchBand: packet.signatureMatchBand,
          priorJurisdictionRef: packet.priorJurisdictionRef,
          currentJurisdictionRef: packet.currentJurisdictionRef,
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
