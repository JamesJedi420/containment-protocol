/**
 * SPE-1309 slice 5: read-only surfacing for cognitive hazard simulation triggers.
 *
 * Formats trigger resolution output for weekly report notes and read-side routing —
 * safe labels only; no hidden truth beyond registry projections.
 */

import type {
  CognitiveHazardExposureRecordsMap,
  CognitiveHazardTriggerChannel,
} from './cognitiveHazardEngine'
import {
  composeCognitiveHazardSimulationTriggerSubjectSummaries,
  type CognitiveHazardSimulationTriggerKind,
  type CognitiveHazardSimulationTriggerSubjectSummary,
} from './cognitiveHazardSimulationTriggers'

function formatTriggerChannelLabel(channel: CognitiveHazardTriggerChannel): string {
  return channel
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

export function formatCognitiveHazardSimulationTriggerKindLabel(
  kind: CognitiveHazardSimulationTriggerKind
): string {
  switch (kind) {
    case 'agent_duty_degraded':
      return 'Agent duty degraded'
    case 'knowledge_integrity_degraded':
      return 'Knowledge integrity degraded'
    case 'procedure_restriction_active':
      return 'Procedure restriction active'
  }
}

export function formatCognitiveHazardSimulationTriggerSummaryLabels(
  summary: CognitiveHazardSimulationTriggerSubjectSummary
): {
  readonly triggerKindLabels: readonly string[]
  readonly triggerChannelLabels: readonly string[]
} {
  return Object.freeze({
    triggerKindLabels: Object.freeze(
      summary.triggerKinds.map((kind) => formatCognitiveHazardSimulationTriggerKindLabel(kind))
    ),
    triggerChannelLabels: Object.freeze(
      summary.activeTriggerChannels.map((channel) => formatTriggerChannelLabel(channel))
    ),
  })
}

export function formatCognitiveHazardSimulationTriggerNoteContent(
  summary: CognitiveHazardSimulationTriggerSubjectSummary
): string {
  const { triggerKindLabels, triggerChannelLabels } =
    formatCognitiveHazardSimulationTriggerSummaryLabels(summary)
  const kindSegment =
    triggerKindLabels.length > 0 ? triggerKindLabels.join('; ') : 'no active effect flags'
  const channelSegment =
    triggerChannelLabels.length > 0 ? triggerChannelLabels.join('; ') : 'no active trigger channels'

  return `Cognitive hazard simulation trigger — ${summary.subjectRef}: ${summary.recordIds.length} exposure record(s), review band ${summary.exposureReviewBand}. Effects: ${kindSegment}. Channels: ${channelSegment}.`
}

export function composeAllCognitiveHazardSimulationTriggerSubjectSummaries(input: {
  records: CognitiveHazardExposureRecordsMap | null | undefined
  priorRecords?: CognitiveHazardExposureRecordsMap | null | undefined
}): readonly CognitiveHazardSimulationTriggerSubjectSummary[] {
  return composeCognitiveHazardSimulationTriggerSubjectSummaries(
    input.records,
    input.priorRecords
  )
}

export function summarizeCognitiveHazardSimulationTriggerFingerprint(
  summaries: readonly CognitiveHazardSimulationTriggerSubjectSummary[]
): string {
  return summaries
    .map((summary) => summary.structuredReasons.join('|'))
    .sort((left, right) => left.localeCompare(right))
    .join(';;')
}
