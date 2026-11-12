/**
 * SPE-1309 slice 5: simulation trigger resolution from composed exposure records.
 *
 * Consumes post-compose `activeTriggerChannels` and projected effect flags without
 * mutating SPE-2108 / SPE-2116 weekly hooks or slice 1–4 compose/tick contracts.
 */

import {
  projectCognitiveHazardExposureReview,
  type CognitiveHazardExposureRecord,
  type CognitiveHazardExposureRecordsMap,
  type CognitiveHazardExposureReviewBand,
  type CognitiveHazardTriggerChannel,
} from './cognitiveHazardEngine'
import { resolveCognitiveHazardSiblingRefKeys } from './cognitiveHazardSiblingCompose'

export type CognitiveHazardSimulationTriggerKind =
  | 'agent_duty_degraded'
  | 'knowledge_integrity_degraded'
  | 'procedure_restriction_active'

export const COGNITIVE_HAZARD_SIMULATION_TRIGGER_KINDS: readonly CognitiveHazardSimulationTriggerKind[] =
  Object.freeze([
    'agent_duty_degraded',
    'knowledge_integrity_degraded',
    'procedure_restriction_active',
  ] as const)

export interface CognitiveHazardSimulationTrigger {
  readonly recordId: string
  readonly subjectRef: string
  readonly label: string
  readonly activeTriggerChannels: readonly CognitiveHazardTriggerChannel[]
  readonly triggerKinds: readonly CognitiveHazardSimulationTriggerKind[]
  readonly exposureReviewBand: CognitiveHazardExposureReviewBand
}

export interface CognitiveHazardSimulationTriggerSubjectSummary {
  readonly subjectRef: string
  readonly recordIds: readonly string[]
  readonly triggerKinds: readonly CognitiveHazardSimulationTriggerKind[]
  readonly activeTriggerChannels: readonly CognitiveHazardTriggerChannel[]
  readonly exposureReviewBand: CognitiveHazardExposureReviewBand
  readonly structuredReasons: readonly string[]
}

function sortedUniqueTriggerKinds(
  kinds: readonly CognitiveHazardSimulationTriggerKind[]
): readonly CognitiveHazardSimulationTriggerKind[] {
  return Object.freeze([...new Set(kinds)].sort((left, right) => left.localeCompare(right)))
}

function sortedUniqueTriggerChannels(
  channels: readonly CognitiveHazardTriggerChannel[]
): readonly CognitiveHazardTriggerChannel[] {
  return Object.freeze([...new Set(channels)].sort((left, right) => left.localeCompare(right)))
}

function resolveActiveSimulationTriggerKinds(input: {
  agentDutyDegraded: boolean
  knowledgeIntegrityDegraded: boolean
  procedureRestrictionActive: boolean
  activeTriggerChannels: readonly CognitiveHazardTriggerChannel[]
}): readonly CognitiveHazardSimulationTriggerKind[] {
  if (input.activeTriggerChannels.length === 0) {
    return Object.freeze([] as CognitiveHazardSimulationTriggerKind[])
  }

  const kinds: CognitiveHazardSimulationTriggerKind[] = []

  if (input.agentDutyDegraded) {
    kinds.push('agent_duty_degraded')
  }

  if (input.knowledgeIntegrityDegraded) {
    kinds.push('knowledge_integrity_degraded')
  }

  if (input.procedureRestrictionActive) {
    kinds.push('procedure_restriction_active')
  }

  return sortedUniqueTriggerKinds(kinds)
}

function resolveExposureReviewBandPriority(
  band: CognitiveHazardExposureReviewBand
): number {
  switch (band) {
    case 'critical':
      return 3
    case 'elevated':
      return 2
    case 'stable':
      return 1
  }
}

function maxExposureReviewBand(
  left: CognitiveHazardExposureReviewBand,
  right: CognitiveHazardExposureReviewBand
): CognitiveHazardExposureReviewBand {
  return resolveExposureReviewBandPriority(left) >= resolveExposureReviewBandPriority(right)
    ? left
    : right
}

/** Terminal erased posture must not re-fire triggers when unchanged week-over-week. */
export function shouldEmitCognitiveHazardSimulationTrigger(
  record: CognitiveHazardExposureRecord,
  priorRecord: CognitiveHazardExposureRecord | undefined,
  triggerKinds: readonly CognitiveHazardSimulationTriggerKind[]
): boolean {
  if (triggerKinds.length === 0) {
    return false
  }

  if (
    record.memoryImpairmentBand === 'erased' &&
    priorRecord?.memoryImpairmentBand === 'erased'
  ) {
    return false
  }

  return true
}

export function resolveCognitiveHazardSimulationTriggerForRecord(
  record: CognitiveHazardExposureRecord,
  priorRecord: CognitiveHazardExposureRecord | undefined
): CognitiveHazardSimulationTrigger | null {
  const projection = projectCognitiveHazardExposureReview(record)
  const triggerKinds = resolveActiveSimulationTriggerKinds({
    agentDutyDegraded: projection.agentDutyDegraded,
    knowledgeIntegrityDegraded: projection.knowledgeIntegrityDegraded,
    procedureRestrictionActive: projection.procedureRestrictionActive,
    activeTriggerChannels: projection.activeTriggerChannels,
  })

  if (!shouldEmitCognitiveHazardSimulationTrigger(record, priorRecord, triggerKinds)) {
    return null
  }

  return Object.freeze({
    recordId: record.id,
    subjectRef: record.subjectRef,
    label: record.label,
    activeTriggerChannels: projection.activeTriggerChannels,
    triggerKinds,
    exposureReviewBand: projection.exposureReviewBand,
  })
}

/** Resolve simulation triggers for all exposure records with deterministic record-id ordering. */
export function resolveCognitiveHazardSimulationTriggers(
  records: CognitiveHazardExposureRecordsMap | null | undefined,
  priorRecords: CognitiveHazardExposureRecordsMap | null | undefined = undefined
): readonly CognitiveHazardSimulationTrigger[] {
  const safeRecords = records ?? {}
  const safePriorRecords = priorRecords ?? {}
  const recordIds = Object.keys(safeRecords)

  if (recordIds.length === 0) {
    return Object.freeze([] as CognitiveHazardSimulationTrigger[])
  }

  const triggers: CognitiveHazardSimulationTrigger[] = []

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const trigger = resolveCognitiveHazardSimulationTriggerForRecord(
      record,
      safePriorRecords[recordId]
    )
    if (trigger) {
      triggers.push(trigger)
    }
  }

  return Object.freeze(triggers)
}

function subjectRefsOverlap(leftRef: string, rightRef: string): boolean {
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

function buildStructuredReason(trigger: CognitiveHazardSimulationTrigger): string {
  return [
    trigger.recordId,
    trigger.exposureReviewBand,
    trigger.triggerKinds.join('+'),
    trigger.activeTriggerChannels.join('+'),
  ].join('|')
}

/** Group resolved triggers by subject ref for deterministic weekly surfacing and routing. */
export function composeCognitiveHazardSimulationTriggerSubjectSummaries(
  records: CognitiveHazardExposureRecordsMap | null | undefined,
  priorRecords: CognitiveHazardExposureRecordsMap | null | undefined = undefined
): readonly CognitiveHazardSimulationTriggerSubjectSummary[] {
  const triggers = resolveCognitiveHazardSimulationTriggers(records, priorRecords)
  if (triggers.length === 0) {
    return Object.freeze([] as CognitiveHazardSimulationTriggerSubjectSummary[])
  }

  const grouped = new Map<string, CognitiveHazardSimulationTrigger[]>()

  for (const trigger of triggers) {
    const existing = grouped.get(trigger.subjectRef) ?? []
    existing.push(trigger)
    grouped.set(trigger.subjectRef, existing)
  }

  const summaries: CognitiveHazardSimulationTriggerSubjectSummary[] = []

  for (const subjectRef of [...grouped.keys()].sort((left, right) => left.localeCompare(right))) {
    const subjectTriggers = grouped.get(subjectRef) ?? []
    const allRecordIds = Object.freeze(
      [...new Set(subjectTriggers.map((trigger) => trigger.recordId))].sort((left, right) =>
        left.localeCompare(right)
      )
    )
    const allKinds = sortedUniqueTriggerKinds(
      subjectTriggers.flatMap((trigger) => trigger.triggerKinds)
    )
    const allChannels = sortedUniqueTriggerChannels(
      subjectTriggers.flatMap((trigger) => trigger.activeTriggerChannels)
    )
    const exposureReviewBand = subjectTriggers.reduce(
      (current, trigger) => maxExposureReviewBand(current, trigger.exposureReviewBand),
      'stable' as CognitiveHazardExposureReviewBand
    )
    const structuredReasons = Object.freeze(
      subjectTriggers
        .map((trigger) => buildStructuredReason(trigger))
        .sort((left, right) => left.localeCompare(right))
    )

    summaries.push(
      Object.freeze({
        subjectRef,
        recordIds: allRecordIds,
        triggerKinds: allKinds,
        activeTriggerChannels: allChannels,
        exposureReviewBand,
        structuredReasons,
      })
    )
  }

  return Object.freeze(summaries)
}

/** Read-side routing helper: triggers linked to one subject ref via normalized key overlap. */
export function listCognitiveHazardSimulationTriggersForSubjectRef(
  records: CognitiveHazardExposureRecordsMap | null | undefined,
  subjectRef: string,
  priorRecords: CognitiveHazardExposureRecordsMap | null | undefined = undefined
): readonly CognitiveHazardSimulationTrigger[] {
  const normalizedSubjectRef = subjectRef.trim()
  if (!normalizedSubjectRef) {
    return Object.freeze([] as CognitiveHazardSimulationTrigger[])
  }

  return Object.freeze(
    resolveCognitiveHazardSimulationTriggers(records, priorRecords).filter((trigger) =>
      subjectRefsOverlap(trigger.subjectRef, normalizedSubjectRef)
    )
  )
}
