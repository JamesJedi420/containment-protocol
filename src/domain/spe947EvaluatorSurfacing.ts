/**
 * SPE-2596 / SPE-947: read-only surfacing for SPE-947 evaluator weekly transitions.
 *
 * Compares pre-tick vs post-tick persisted spe947* maps and formats transition
 * summaries for weekly report notes — safe labels only; no hidden evaluator truth.
 */

import type { PlatformUptimeState } from './platformOperationDegrade'
import type {
  Spe947CounterMemeticPlanRecordsMap,
  Spe947PersistedCounterMemeticPlan,
  Spe947PersistedPlatform,
  Spe947PlatformRecordsMap,
} from './spe947EvaluatorPersistence'

export type Spe947EvaluatorWeeklyTransitionKind =
  | 'plan_elapsed_weeks_advanced'
  | 'platform_view_count_changed'
  | 'platform_uptime_state_changed'

export type Spe947EvaluatorWeeklyEntityKind = 'plan' | 'platform'

export interface Spe947EvaluatorWeeklyTransitionSummary {
  readonly entityKind: Spe947EvaluatorWeeklyEntityKind
  readonly recordId: string
  readonly label: string
  readonly transitionKinds: readonly Spe947EvaluatorWeeklyTransitionKind[]
  readonly priorElapsedPropagationWeeks: number | null
  readonly nextElapsedPropagationWeeks: number | null
  readonly priorViewCount: number | null
  readonly nextViewCount: number | null
  readonly priorUptimeState: PlatformUptimeState | null
  readonly nextUptimeState: PlatformUptimeState | null
  readonly structuredReasons: readonly string[]
}

function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

function composePlanWeeklyTransitionSummary(input: {
  priorPlan: Spe947PersistedCounterMemeticPlan
  nextPlan: Spe947PersistedCounterMemeticPlan
}): Spe947EvaluatorWeeklyTransitionSummary | undefined {
  if (input.priorPlan.elapsedPropagationWeeks === input.nextPlan.elapsedPropagationWeeks) {
    return undefined
  }

  return Object.freeze({
    entityKind: 'plan' as const,
    recordId: input.nextPlan.id,
    label: input.nextPlan.label,
    transitionKinds: Object.freeze(['plan_elapsed_weeks_advanced'] as const),
    priorElapsedPropagationWeeks: input.priorPlan.elapsedPropagationWeeks,
    nextElapsedPropagationWeeks: input.nextPlan.elapsedPropagationWeeks,
    priorViewCount: null,
    nextViewCount: null,
    priorUptimeState: null,
    nextUptimeState: null,
    structuredReasons: Object.freeze([
      `elapsed:${input.priorPlan.elapsedPropagationWeeks}->${input.nextPlan.elapsedPropagationWeeks}`,
    ]),
  })
}

function composePlatformWeeklyTransitionSummary(input: {
  priorPlatform: Spe947PersistedPlatform
  nextPlatform: Spe947PersistedPlatform
}): Spe947EvaluatorWeeklyTransitionSummary | undefined {
  // Match SPE-2577 tick semantics: missing viewCount is treated as 0 when applying deltas.
  const priorViewCount = input.priorPlatform.viewCount ?? 0
  const nextViewCount = input.nextPlatform.viewCount ?? 0
  const priorUptimeState = input.priorPlatform.uptimeState ?? null
  const nextUptimeState = input.nextPlatform.uptimeState ?? null

  const changes: Array<{
    kind: Spe947EvaluatorWeeklyTransitionKind
    reason: string
  }> = []

  if (priorViewCount !== nextViewCount) {
    changes.push({
      kind: 'platform_view_count_changed',
      reason: `viewCount:${String(priorViewCount)}->${String(nextViewCount)}`,
    })
  }

  if (priorUptimeState !== nextUptimeState) {
    changes.push({
      kind: 'platform_uptime_state_changed',
      reason: `uptime:${String(priorUptimeState)}->${String(nextUptimeState)}`,
    })
  }

  if (changes.length === 0) {
    return undefined
  }

  changes.sort((left, right) => left.kind.localeCompare(right.kind))

  return Object.freeze({
    entityKind: 'platform' as const,
    recordId: input.nextPlatform.id,
    label: input.nextPlatform.label,
    transitionKinds: Object.freeze(changes.map((change) => change.kind)),
    priorElapsedPropagationWeeks: null,
    nextElapsedPropagationWeeks: null,
    priorViewCount,
    nextViewCount,
    priorUptimeState,
    nextUptimeState,
    structuredReasons: Object.freeze(changes.map((change) => change.reason)),
  })
}

/**
 * Builds transition summaries for spe947* records that changed during the weekly tick.
 * Empty maps and unchanged records yield []. Sort is byte-stable by recordId.
 */
export function composeSpe947EvaluatorWeeklyTransitionSummaries(input: {
  priorPlatforms: Spe947PlatformRecordsMap | null | undefined
  nextPlatforms: Spe947PlatformRecordsMap | null | undefined
  priorPlans: Spe947CounterMemeticPlanRecordsMap | null | undefined
  nextPlans: Spe947CounterMemeticPlanRecordsMap | null | undefined
}): readonly Spe947EvaluatorWeeklyTransitionSummary[] {
  const priorPlatforms = input.priorPlatforms ?? {}
  const nextPlatforms = input.nextPlatforms ?? {}
  const priorPlans = input.priorPlans ?? {}
  const nextPlans = input.nextPlans ?? {}
  const summaries: Spe947EvaluatorWeeklyTransitionSummary[] = []

  for (const planId of Object.keys(nextPlans).sort((left, right) => left.localeCompare(right))) {
    const nextPlan = nextPlans[planId]
    const priorPlan = priorPlans[planId]
    if (!nextPlan || !priorPlan) {
      continue
    }

    const summary = composePlanWeeklyTransitionSummary({ priorPlan, nextPlan })
    if (summary) {
      summaries.push(summary)
    }
  }

  for (const platformId of Object.keys(nextPlatforms).sort((left, right) =>
    left.localeCompare(right)
  )) {
    const nextPlatform = nextPlatforms[platformId]
    const priorPlatform = priorPlatforms[platformId]
    if (!nextPlatform || !priorPlatform) {
      continue
    }

    const summary = composePlatformWeeklyTransitionSummary({ priorPlatform, nextPlatform })
    if (summary) {
      summaries.push(summary)
    }
  }

  return Object.freeze(
    [...summaries].sort((left, right) => left.recordId.localeCompare(right.recordId))
  )
}

export function formatSpe947EvaluatorWeeklyTransitionKindLabel(
  kind: Spe947EvaluatorWeeklyTransitionKind
): string {
  switch (kind) {
    case 'plan_elapsed_weeks_advanced':
      return 'Plan elapsed weeks advanced'
    case 'platform_view_count_changed':
      return 'Platform view count changed'
    case 'platform_uptime_state_changed':
      return 'Platform uptime state changed'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}

export function formatSpe947EvaluatorWeeklyTransitionNoteContent(
  summary: Spe947EvaluatorWeeklyTransitionSummary
): string {
  const kindLabels = summary.transitionKinds.map((kind) =>
    formatSpe947EvaluatorWeeklyTransitionKindLabel(kind)
  )

  if (summary.entityKind === 'plan') {
    return `Hazardous-content weekly transition — ${summary.label}: ${kindLabels.join('; ')}. Elapsed ${String(summary.priorElapsedPropagationWeeks)} → ${String(summary.nextElapsedPropagationWeeks)}.`
  }

  const viewSegment =
    summary.priorViewCount !== summary.nextViewCount
      ? ` Views ${String(summary.priorViewCount)} → ${String(summary.nextViewCount)}.`
      : ''
  const uptimeSegment =
    summary.priorUptimeState !== summary.nextUptimeState
      ? ` Uptime ${summary.priorUptimeState != null ? formatEnumLabel(summary.priorUptimeState) : '—'} → ${summary.nextUptimeState != null ? formatEnumLabel(summary.nextUptimeState) : '—'}.`
      : ''

  return `Hazardous-content weekly transition — ${summary.label}: ${kindLabels.join('; ')}.${viewSegment}${uptimeSegment}`
}
