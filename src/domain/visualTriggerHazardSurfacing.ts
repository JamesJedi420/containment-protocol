/**
 * SPE-2489 slice 5: read-only surfacing for visual-trigger hazard weekly transitions.
 *
 * Compares pre-tick vs post-tick persisted records and formats transition summaries
 * for weekly report notes — safe labels only; no hidden truth beyond registry fields.
 */

import type {
  HazardousMediaInstance,
  ObserverAwarenessBand,
  PursuitState,
  VisualTriggerHazardRecord,
  VisualTriggerHazardRecordsMap,
} from './visualTriggerHazardRegistry'

export type VisualTriggerHazardWeeklyTransitionKind =
  | 'awareness_band_advanced'
  | 'pursuit_state_changed'
  | 'sweep_status_advanced'

export interface VisualTriggerHazardWeeklyTransitionSummary {
  readonly recordId: string
  readonly label: string
  readonly transitionKinds: readonly VisualTriggerHazardWeeklyTransitionKind[]
  readonly priorPursuitState: PursuitState
  readonly nextPursuitState: PursuitState
  readonly priorObserverAwarenessBand: ObserverAwarenessBand
  readonly nextObserverAwarenessBand: ObserverAwarenessBand
  readonly advancedSweepMediaInstanceIds: readonly string[]
  readonly structuredReasons: readonly string[]
}

function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function resolveAwarenessBand(record: VisualTriggerHazardRecord): ObserverAwarenessBand {
  return record.observerAwarenessBand ?? 'unaware'
}

function listAdvancedSweepMediaInstanceIds(
  priorInstances: readonly HazardousMediaInstance[] | undefined,
  nextInstances: readonly HazardousMediaInstance[] | undefined
): readonly string[] {
  const priorById = new Map(
    (priorInstances ?? []).map((instance) => [instance.mediaInstanceId, instance] as const)
  )
  const advanced: string[] = []

  for (const nextInstance of nextInstances ?? []) {
    const priorInstance = priorById.get(nextInstance.mediaInstanceId)
    if (!priorInstance) {
      continue
    }

    if (priorInstance.sweepStatus !== nextInstance.sweepStatus) {
      advanced.push(nextInstance.mediaInstanceId)
    }
  }

  return Object.freeze(advanced.sort((left, right) => left.localeCompare(right)))
}

function composeWeeklyTransitionSummary(input: {
  priorRecord: VisualTriggerHazardRecord
  nextRecord: VisualTriggerHazardRecord
}): VisualTriggerHazardWeeklyTransitionSummary | undefined {
  const transitionKinds: VisualTriggerHazardWeeklyTransitionKind[] = []
  const structuredReasons: string[] = []

  const priorAwareness = resolveAwarenessBand(input.priorRecord)
  const nextAwareness = resolveAwarenessBand(input.nextRecord)
  if (priorAwareness !== nextAwareness) {
    transitionKinds.push('awareness_band_advanced')
    structuredReasons.push(`awareness:${priorAwareness}->${nextAwareness}`)
  }

  const priorPursuit = input.priorRecord.pursuitState
  const nextPursuit = input.nextRecord.pursuitState
  if (priorPursuit !== nextPursuit) {
    transitionKinds.push('pursuit_state_changed')
    structuredReasons.push(`pursuit:${priorPursuit}->${nextPursuit}`)
  }

  const advancedSweepMediaInstanceIds = listAdvancedSweepMediaInstanceIds(
    input.priorRecord.hazardousMediaInstances,
    input.nextRecord.hazardousMediaInstances
  )
  if (advancedSweepMediaInstanceIds.length > 0) {
    transitionKinds.push('sweep_status_advanced')
    structuredReasons.push(`sweep:${advancedSweepMediaInstanceIds.join(',')}`)
  }

  if (transitionKinds.length === 0) {
    return undefined
  }

  return Object.freeze({
    recordId: input.nextRecord.id,
    label: input.nextRecord.label,
    transitionKinds: Object.freeze(
      [...transitionKinds].sort((left, right) => left.localeCompare(right))
    ),
    priorPursuitState: priorPursuit,
    nextPursuitState: nextPursuit,
    priorObserverAwarenessBand: priorAwareness,
    nextObserverAwarenessBand: nextAwareness,
    advancedSweepMediaInstanceIds,
    structuredReasons: Object.freeze(structuredReasons),
  })
}

/**
 * Builds transition summaries for records that changed during the weekly tick.
 */
export function composeVisualTriggerHazardWeeklyTransitionSummaries(input: {
  priorRecords: VisualTriggerHazardRecordsMap | null | undefined
  nextRecords: VisualTriggerHazardRecordsMap | null | undefined
}): readonly VisualTriggerHazardWeeklyTransitionSummary[] {
  const priorRecords = input.priorRecords ?? {}
  const nextRecords = input.nextRecords ?? {}
  const recordIds = Object.keys(nextRecords).sort((left, right) => left.localeCompare(right))

  if (recordIds.length === 0) {
    return []
  }

  const summaries: VisualTriggerHazardWeeklyTransitionSummary[] = []

  for (const recordId of recordIds) {
    const nextRecord = nextRecords[recordId]
    const priorRecord = priorRecords[recordId]
    if (!nextRecord || !priorRecord) {
      continue
    }

    const summary = composeWeeklyTransitionSummary({ priorRecord, nextRecord })
    if (summary) {
      summaries.push(summary)
    }
  }

  return Object.freeze(summaries)
}

export function formatVisualTriggerHazardWeeklyTransitionKindLabel(
  kind: VisualTriggerHazardWeeklyTransitionKind
): string {
  switch (kind) {
    case 'awareness_band_advanced':
      return 'Observer awareness band advanced'
    case 'pursuit_state_changed':
      return 'Pursuit state changed'
    case 'sweep_status_advanced':
      return 'Disposal sweep status advanced'
  }
}

export function formatVisualTriggerHazardWeeklyTransitionNoteContent(
  summary: VisualTriggerHazardWeeklyTransitionSummary
): string {
  const kindLabels = summary.transitionKinds.map((kind) =>
    formatVisualTriggerHazardWeeklyTransitionKindLabel(kind)
  )
  const sweepSegment =
    summary.advancedSweepMediaInstanceIds.length > 0
      ? ` Sweep media: ${summary.advancedSweepMediaInstanceIds.join(', ')}.`
      : ''

  return `Visual-trigger hazard weekly transition — ${summary.label}: ${kindLabels.join('; ')}. Pursuit ${formatEnumLabel(summary.priorPursuitState)} → ${formatEnumLabel(summary.nextPursuitState)}; awareness ${formatEnumLabel(summary.priorObserverAwarenessBand)} → ${formatEnumLabel(summary.nextObserverAwarenessBand)}.${sweepSegment}`
}
