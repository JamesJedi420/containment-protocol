/**
 * SPE-1309 slice 5: weekly report notes for cognitive hazard simulation triggers.
 *
 * Emits deterministic notes when post-tick exposure records resolve active triggers —
 * no new persistence.
 */

import type { CognitiveHazardExposureRecordsMap } from './cognitiveHazardEngine'
import {
  composeAllCognitiveHazardSimulationTriggerSubjectSummaries,
  formatCognitiveHazardSimulationTriggerNoteContent,
} from './cognitiveHazardSimulationTriggerSurfacing'
import type { ReportNote } from './models'
import { createDeterministicReportNote } from './reportNotes'

/**
 * Builds weekly report notes when cognitive hazard exposure records resolve simulation triggers.
 */
export function buildWeeklyCognitiveHazardSimulationTriggerReportNotes(input: {
  nextRecords: CognitiveHazardExposureRecordsMap | null | undefined
  priorRecords?: CognitiveHazardExposureRecordsMap | null | undefined
  week: number
  sequenceStart: number
  baseTimestamp?: number
}): ReportNote[] {
  const nextSummaries = composeAllCognitiveHazardSimulationTriggerSubjectSummaries({
    records: input.nextRecords,
    priorRecords: input.priorRecords,
  })

  if (nextSummaries.length === 0) {
    return []
  }

  const notes: ReportNote[] = []
  let sequence = input.sequenceStart

  for (const summary of nextSummaries) {
    notes.push(
      createDeterministicReportNote(
        formatCognitiveHazardSimulationTriggerNoteContent(summary),
        input.week,
        sequence,
        input.baseTimestamp,
        'cognitive_hazard.simulation_trigger',
        {
          subjectRef: summary.subjectRef,
          linkedRecordCount: summary.recordIds.length,
          exposureReviewBand: summary.exposureReviewBand,
          triggerKinds: [...summary.triggerKinds],
          activeTriggerChannels: [...summary.activeTriggerChannels],
          structuredReasons: [...summary.structuredReasons],
          week: input.week,
        }
      )
    )
    sequence += 1
  }

  return notes
}
