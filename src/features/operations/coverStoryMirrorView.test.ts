import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  COVER_STORY_COLLAPSED_FIXTURE,
  COVER_STORY_STRESSED_FIXTURE,
  projectCoverStoryLifecycleView,
} from '../../domain/coverStoryLifecycleRegistry'
import { applyWeeklyCoverStoryTick } from '../../domain/coverStoryWeeklyOrchestration'
import {
  formatCoverStoryEnumLabel,
  getCoverStoryMirrorView,
} from './coverStoryMirrorView'

describe('coverStoryMirrorView (SPE-1347 slice 3)', () => {
  it('returns empty mirror when coverStoryRecords map is empty', () => {
    const game = createStartingState()

    expect(game.coverStoryRecords).toEqual({})

    const view = getCoverStoryMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.weeklySnapshotCount).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors lifecycle projection fields without hidden operational truth leakage', () => {
    const game = createStartingState()
    game.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }

    const view = getCoverStoryMirrorView(game)
    const record = view.records[0]
    const projection = projectCoverStoryLifecycleView(COVER_STORY_STRESSED_FIXTURE)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.coverStressActiveCount).toBe(1)
    expect(view.summary.coverCollapsedCount).toBe(0)
    expect(record?.lifecyclePhaseLabel).toBe('Stressed')
    expect(record?.coverStressActiveLabel).toBe('Yes')
    expect(record?.contradictionPressureLabel).toBe('0.67')
    expect(record?.coverCapacityScoreLabel).toBe('0.41')
    expect(record?.contradictionChannelHintsLabel).toBe('Digital Traces, Witness Testimony')
    expect(record?.latestRepairActionLabel).toBe('Reinforcement')
    expect(record?.coverMotivationLabel).toBe('Reputation Protection')
    expect(record?.label).not.toMatch(/foundation|scp|masquerade/i)
    expect(record?.summaryLabel).toBe(projection.summary)
  })

  it('displays persisted weekly lifecycle snapshot round-trip', () => {
    const game = createStartingState()
    game.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }
    const tick = applyWeeklyCoverStoryTick(game.coverStoryRecords, 12)
    game.coverStoryWeeklyProjectionSnapshots = tick.snapshots

    const view = getCoverStoryMirrorView(game)
    const record = view.records[0]

    expect(view.summary.weeklySnapshotCount).toBe(1)
    expect(record?.weeklySnapshot?.week).toBe(12)
    expect(record?.weeklySnapshot?.coverStressActiveLabel).toBe('Yes')
    expect(record?.weeklySnapshot?.contradictionPressureLabel).toBe('0.67')
    expect(record?.weeklySnapshot?.lifecyclePhaseLabel).toBe('Stressed')
  })

  it('mirrors collapsed and maintained fixtures with distinct lifecycle signals', () => {
    const game = createStartingState()
    game.coverStoryRecords = {
      [COVER_STORY_COLLAPSED_FIXTURE.id]: COVER_STORY_COLLAPSED_FIXTURE,
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
    }

    const view = getCoverStoryMirrorView(game)
    const collapsed = view.records.find((record) => record.id === COVER_STORY_COLLAPSED_FIXTURE.id)
    const maintained = view.records.find(
      (record) => record.id === COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id
    )

    expect(view.summary.coverCollapsedCount).toBe(1)
    expect(collapsed?.coverCollapsedLabel).toBe('Yes')
    expect(collapsed?.lifecyclePhaseLabel).toBe('Collapsed')
    expect(maintained?.lifecyclePhaseLabel).toBe('Maintained')
    expect(maintained?.coverStressActiveLabel).toBe('No')
    expect(maintained?.weeklySnapshot).toBeNull()
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatCoverStoryEnumLabel('witness_testimony')).toBe('Witness Testimony')
    expect(formatCoverStoryEnumLabel('institutional_face_saving')).toBe('Institutional Face Saving')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
      [COVER_STORY_COLLAPSED_FIXTURE.id]: COVER_STORY_COLLAPSED_FIXTURE,
    }
    const tick = applyWeeklyCoverStoryTick(game.coverStoryRecords, 8)
    game.coverStoryWeeklyProjectionSnapshots = tick.snapshots

    const first = JSON.stringify(getCoverStoryMirrorView(game))
    const second = JSON.stringify(getCoverStoryMirrorView(game))

    expect(first).toBe(second)
  })
})
