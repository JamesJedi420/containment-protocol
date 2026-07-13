import { describe, expect, it } from 'vitest'
import { EXAMPLE_COUNTER_MEMETIC_PLAN } from '../domain/counterMemeticUptakeGate'
import { EXAMPLE_RUMOR_FORUM_PLATFORM } from '../domain/platformReachMultiplier'
import type {
  Spe947PersistedCounterMemeticPlan,
  Spe947PersistedPlatform,
} from '../domain/spe947EvaluatorPersistence'
import {
  advanceSpe947CounterMemeticPlanForWeek,
  advanceSpe947PlatformForWeek,
} from '../domain/spe947EvaluatorWeeklyOrchestration'
import { buildWeeklySpe947EvaluatorTransitionReportNotes } from '../domain/spe947EvaluatorWeeklyReportNotes'
import {
  composeSpe947EvaluatorWeeklyTransitionSummaries,
  formatSpe947EvaluatorWeeklyTransitionNoteContent,
} from '../domain/spe947EvaluatorSurfacing'

function propagatingPlan(
  overrides: Partial<Spe947PersistedCounterMemeticPlan> = {}
): Spe947PersistedCounterMemeticPlan {
  return Object.freeze({
    ...EXAMPLE_COUNTER_MEMETIC_PLAN,
    elapsedPropagationWeeks: 0,
    uptakeState: 'partial' as const,
    ...overrides,
  })
}

function platformWithDeltas(
  overrides: Partial<Spe947PersistedPlatform> = {}
): Spe947PersistedPlatform {
  return Object.freeze({
    id: EXAMPLE_RUMOR_FORUM_PLATFORM.id,
    label: EXAMPLE_RUMOR_FORUM_PLATFORM.label,
    reachFactor: EXAMPLE_RUMOR_FORUM_PLATFORM.reachFactor,
    viewsPerScaleUnit: EXAMPLE_RUMOR_FORUM_PLATFORM.viewsPerScaleUnit,
    viewCount: 100,
    weeklyViewDelta: 50,
    uptimeState: 'online' as const,
    weeklyUptimeState: 'degraded' as const,
    ...overrides,
  })
}

describe('spe947EvaluatorSurfacing (SPE-2596 slice 1)', () => {
  it('returns no summaries for empty maps', () => {
    expect(
      composeSpe947EvaluatorWeeklyTransitionSummaries({
        priorPlatforms: {},
        nextPlatforms: {},
        priorPlans: {},
        nextPlans: {},
      })
    ).toEqual([])
  })

  it('returns no summaries when records are unchanged', () => {
    const plan = propagatingPlan()
    const platform = platformWithDeltas({
      weeklyViewDelta: undefined,
      weeklyUptimeState: undefined,
    })

    expect(
      composeSpe947EvaluatorWeeklyTransitionSummaries({
        priorPlatforms: { [platform.id]: platform },
        nextPlatforms: { [platform.id]: platform },
        priorPlans: { [plan.id]: plan },
        nextPlans: { [plan.id]: plan },
      })
    ).toEqual([])
  })

  it('surfaces plan elapsed-week advancement', () => {
    const priorPlan = propagatingPlan()
    const nextPlan = advanceSpe947CounterMemeticPlanForWeek(priorPlan, 5)

    const summaries = composeSpe947EvaluatorWeeklyTransitionSummaries({
      priorPlatforms: {},
      nextPlatforms: {},
      priorPlans: { [priorPlan.id]: priorPlan },
      nextPlans: { [priorPlan.id]: nextPlan },
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.entityKind).toBe('plan')
    expect(summaries[0]?.transitionKinds).toEqual(['plan_elapsed_weeks_advanced'])
    expect(summaries[0]?.priorElapsedPropagationWeeks).toBe(0)
    expect(summaries[0]?.nextElapsedPropagationWeeks).toBe(1)
    expect(formatSpe947EvaluatorWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      priorPlan.label
    )
  })

  it('surfaces platform view and uptime transitions', () => {
    const priorPlatform = platformWithDeltas()
    const nextPlatform = advanceSpe947PlatformForWeek(priorPlatform, 8)

    const summaries = composeSpe947EvaluatorWeeklyTransitionSummaries({
      priorPlatforms: { [priorPlatform.id]: priorPlatform },
      nextPlatforms: { [priorPlatform.id]: nextPlatform },
      priorPlans: {},
      nextPlans: {},
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.entityKind).toBe('platform')
    expect(summaries[0]?.transitionKinds).toContain('platform_view_count_changed')
    expect(summaries[0]?.transitionKinds).toContain('platform_uptime_state_changed')
    expect(summaries[0]?.nextViewCount).toBe(150)
    expect(summaries[0]?.nextUptimeState).toBe('degraded')
  })

  it('does not surface notes when only lastWeeklyTickWeek changes', () => {
    const priorPlatform = platformWithDeltas({
      weeklyViewDelta: 0,
      weeklyUptimeState: 'online',
      uptimeState: 'online',
      viewCount: 100,
    })
    const nextPlatform = advanceSpe947PlatformForWeek(priorPlatform, 8)

    expect(nextPlatform.lastWeeklyTickWeek).toBe(8)
    expect(nextPlatform.viewCount).toBe(100)
    expect(nextPlatform.uptimeState).toBe('online')

    expect(
      composeSpe947EvaluatorWeeklyTransitionSummaries({
        priorPlatforms: { [priorPlatform.id]: priorPlatform },
        nextPlatforms: { [priorPlatform.id]: nextPlatform },
        priorPlans: {},
        nextPlans: {},
      })
    ).toEqual([])
  })

  it('treats missing prior viewCount as 0 so zero-delta materialization stays quiet', () => {
    const priorPlatform = platformWithDeltas({
      viewCount: undefined,
      weeklyViewDelta: 0,
      weeklyUptimeState: undefined,
      uptimeState: 'online',
    })
    const nextPlatform = advanceSpe947PlatformForWeek(priorPlatform, 8)

    expect(nextPlatform.viewCount).toBe(0)
    expect(
      composeSpe947EvaluatorWeeklyTransitionSummaries({
        priorPlatforms: { [priorPlatform.id]: priorPlatform },
        nextPlatforms: { [priorPlatform.id]: nextPlatform },
        priorPlans: {},
        nextPlans: {},
      })
    ).toEqual([])
  })

  it('surfaces missing prior viewCount as 0 when a non-zero delta applies', () => {
    const priorPlatform = platformWithDeltas({
      viewCount: undefined,
      weeklyViewDelta: 40,
      weeklyUptimeState: undefined,
      uptimeState: 'online',
    })
    const nextPlatform = advanceSpe947PlatformForWeek(priorPlatform, 8)

    const summaries = composeSpe947EvaluatorWeeklyTransitionSummaries({
      priorPlatforms: { [priorPlatform.id]: priorPlatform },
      nextPlatforms: { [priorPlatform.id]: nextPlatform },
      priorPlans: {},
      nextPlans: {},
    })

    expect(summaries).toHaveLength(1)
    expect(summaries[0]?.priorViewCount).toBe(0)
    expect(summaries[0]?.nextViewCount).toBe(40)
    expect(formatSpe947EvaluatorWeeklyTransitionNoteContent(summaries[0]!)).toContain(
      'Views 0 → 40'
    )
  })

  it('keeps structuredReasons aligned with sorted transitionKinds', () => {
    const priorPlatform = platformWithDeltas()
    const nextPlatform = advanceSpe947PlatformForWeek(priorPlatform, 8)

    const summaries = composeSpe947EvaluatorWeeklyTransitionSummaries({
      priorPlatforms: { [priorPlatform.id]: priorPlatform },
      nextPlatforms: { [priorPlatform.id]: nextPlatform },
      priorPlans: {},
      nextPlans: {},
    })

    expect(summaries[0]?.transitionKinds).toEqual([
      'platform_uptime_state_changed',
      'platform_view_count_changed',
    ])
    expect(summaries[0]?.structuredReasons).toEqual([
      'uptime:online->degraded',
      'viewCount:100->150',
    ])
  })
})

describe('spe947EvaluatorWeeklyReportNotes (SPE-2596 slice 1)', () => {
  it('returns no notes when no transitions occur', () => {
    const plan = propagatingPlan()

    expect(
      buildWeeklySpe947EvaluatorTransitionReportNotes({
        priorPlatforms: {},
        nextPlatforms: {},
        priorPlans: { [plan.id]: plan },
        nextPlans: { [plan.id]: plan },
        week: 5,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits typed weekly transition notes for plan and platform changes', () => {
    const priorPlan = propagatingPlan()
    const nextPlan = advanceSpe947CounterMemeticPlanForWeek(priorPlan, 5)
    const priorPlatform = platformWithDeltas()
    const nextPlatform = advanceSpe947PlatformForWeek(priorPlatform, 5)

    const notes = buildWeeklySpe947EvaluatorTransitionReportNotes({
      priorPlatforms: { [priorPlatform.id]: priorPlatform },
      nextPlatforms: { [priorPlatform.id]: nextPlatform },
      priorPlans: { [priorPlan.id]: priorPlan },
      nextPlans: { [priorPlan.id]: nextPlan },
      week: 5,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(2)
    expect(notes.every((note) => note.type === 'spe947_evaluator.weekly_transition')).toBe(true)
    expect(notes.map((note) => note.metadata?.recordId).sort()).toEqual(
      [EXAMPLE_COUNTER_MEMETIC_PLAN.id, EXAMPLE_RUMOR_FORUM_PLATFORM.id].sort()
    )
    expect(notes[0]?.content).toContain('Hazardous-content weekly transition')
  })

  it('does not duplicate notes when re-composing identical prior/next maps', () => {
    const priorPlan = propagatingPlan()
    const nextPlan = advanceSpe947CounterMemeticPlanForWeek(priorPlan, 5)
    const once = buildWeeklySpe947EvaluatorTransitionReportNotes({
      priorPlatforms: {},
      nextPlatforms: {},
      priorPlans: { [priorPlan.id]: priorPlan },
      nextPlans: { [priorPlan.id]: nextPlan },
      week: 5,
      sequenceStart: 1,
    })
    const sameWeekNoop = buildWeeklySpe947EvaluatorTransitionReportNotes({
      priorPlatforms: {},
      nextPlatforms: {},
      priorPlans: { [priorPlan.id]: nextPlan },
      nextPlans: { [priorPlan.id]: nextPlan },
      week: 5,
      sequenceStart: 1,
    })

    expect(once).toHaveLength(1)
    expect(sameWeekNoop).toEqual([])
  })
})
