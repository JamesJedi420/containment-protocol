import { describe, expect, it } from 'vitest'
import {
  COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  COVER_STORY_COLLAPSED_FIXTURE,
  COVER_STORY_STRESSED_FIXTURE,
  projectCoverStoryLifecycleView,
} from '../domain/coverStoryLifecycleRegistry'
import {
  applyWeeklyCoverStoryTick,
  buildCoverStoryWeeklyProjectionBundle,
  projectCoverStoryRecordsForWeek,
} from '../domain/coverStoryWeeklyOrchestration'

describe('coverStoryWeeklyOrchestration (SPE-1347 slice 2)', () => {
  it('is a no-op for an empty cover-story map without throwing', () => {
    const records = {}
    const snapshots = {}

    expect(applyWeeklyCoverStoryTick(records, 4, snapshots)).toEqual({
      records,
      snapshots,
    })
    expect(projectCoverStoryRecordsForWeek(records, 4)).toEqual([])
  })

  it('is a no-op for null or undefined maps', () => {
    expect(applyWeeklyCoverStoryTick(null, 2)).toEqual({ records: {}, snapshots: {} })
    expect(applyWeeklyCoverStoryTick(undefined, 2)).toEqual({ records: {}, snapshots: {} })
    expect(projectCoverStoryRecordsForWeek(null, 2)).toEqual([])
  })

  it('builds projection bundles matching registry lifecycle helper', () => {
    const bundle = buildCoverStoryWeeklyProjectionBundle(COVER_STORY_STRESSED_FIXTURE, 7)

    expect(bundle.recordId).toBe(COVER_STORY_STRESSED_FIXTURE.id)
    expect(bundle.week).toBe(7)
    expect(bundle.lifecycle).toEqual(projectCoverStoryLifecycleView(COVER_STORY_STRESSED_FIXTURE))
    expect(bundle.lifecycle.coverStressActive).toBe(true)
    expect(bundle.lifecycle.repairInProgress).toBe(false)
    expect(bundle.lifecycle.contradictionPressure).toBe(0.67)
  })

  it('projects records in stable sorted id order', () => {
    const records = {
      [COVER_STORY_COLLAPSED_FIXTURE.id]: COVER_STORY_COLLAPSED_FIXTURE,
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }

    const bundles = projectCoverStoryRecordsForWeek(records, 3)

    expect(bundles.map((bundle) => bundle.recordId)).toEqual([
      COVER_STORY_COLLAPSED_FIXTURE.id,
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id,
    ])
    expect(bundles.every((bundle) => bundle.week === 3)).toBe(true)
  })

  it('preserves source records when tick runs projections', () => {
    const records = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }

    const next = applyWeeklyCoverStoryTick(records, 5)

    expect(next.records).toBe(records)
    expect(next.records[COVER_STORY_STRESSED_FIXTURE.id]).toBe(COVER_STORY_STRESSED_FIXTURE)
    expect(next.records[COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]).toBe(
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE
    )
  })

  it('is idempotent when re-applied at the same week', () => {
    const records = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }

    const once = applyWeeklyCoverStoryTick(records, 4)
    const twice = applyWeeklyCoverStoryTick(once.records, 4, once.snapshots)

    expect(twice.records).toBe(once.records)
    expect(twice.snapshots).toBe(once.snapshots)
    expect(twice.records).toBe(records)
  })

  it('normalizes non-finite week values to week 1 for projection bundles', () => {
    const bundle = buildCoverStoryWeeklyProjectionBundle(
      COVER_STORY_STRESSED_FIXTURE,
      Number.NaN
    )

    expect(bundle.week).toBe(1)
  })

  it('persists weekly lifecycle projection snapshots keyed by record id', () => {
    const records = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
      [COVER_STORY_COLLAPSED_FIXTURE.id]: COVER_STORY_COLLAPSED_FIXTURE,
    }

    const tick = applyWeeklyCoverStoryTick(records, 6)

    expect(Object.keys(tick.snapshots).sort()).toEqual([
      COVER_STORY_COLLAPSED_FIXTURE.id,
      COVER_STORY_STRESSED_FIXTURE.id,
    ])
    expect(tick.snapshots[COVER_STORY_STRESSED_FIXTURE.id]?.week).toBe(6)
    expect(tick.snapshots[COVER_STORY_STRESSED_FIXTURE.id]?.lifecycle).toEqual(
      projectCoverStoryLifecycleView(COVER_STORY_STRESSED_FIXTURE)
    )
    expect(tick.snapshots[COVER_STORY_COLLAPSED_FIXTURE.id]?.lifecycle.coverCollapsed).toBe(true)
  })

  it('updates snapshots when week advances and prunes removed record ids', () => {
    const records = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
      [COVER_STORY_COLLAPSED_FIXTURE.id]: COVER_STORY_COLLAPSED_FIXTURE,
    }

    const weekFour = applyWeeklyCoverStoryTick(records, 4)
    const weekFiveRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }
    const weekFive = applyWeeklyCoverStoryTick(
      weekFiveRecords,
      5,
      weekFour.snapshots
    )

    expect(weekFive.snapshots[COVER_STORY_STRESSED_FIXTURE.id]?.week).toBe(5)
    expect(weekFive.snapshots[COVER_STORY_COLLAPSED_FIXTURE.id]).toBeUndefined()
  })

  it('does not reveal hidden operational truth in lifecycle projections', () => {
    const bundle = buildCoverStoryWeeklyProjectionBundle(COVER_STORY_STRESSED_FIXTURE, 23)

    expect(bundle.lifecycle.contradictionChannelHints).toEqual([
      'digital_traces',
      'witness_testimony',
    ])
    expect(bundle.lifecycle.contradictionPressure).toBe(0.67)
    expect(bundle.lifecycle.summary).toBe(COVER_STORY_STRESSED_FIXTURE.summary ?? null)
  })
})
