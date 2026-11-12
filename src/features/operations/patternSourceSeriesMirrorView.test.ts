import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  EXPRESSION_RISK_PROVISIONAL_FIXTURE,
  HIGH_READINESS_QUEUE_FIXTURE,
  LOW_READINESS_RECENT_QUEUE_FIXTURE,
  SERIES_HUB_OPEN_ENTRY_FIXTURE,
} from '../../domain/patternSourceSeriesRegistry'
import {
  formatPatternSourceSeriesEnumLabel,
  getPatternSourceSeriesMirrorView,
} from './patternSourceSeriesMirrorView'

describe('patternSourceSeriesMirrorView (SPE-2110 slice 4)', () => {
  it('returns empty mirror when patternSourceSeriesRecords map is empty', () => {
    const game = createStartingState()

    expect(game.patternSourceSeriesRecords).toEqual({})

    const view = getPatternSourceSeriesMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.queueEntries).toEqual([])
    expect(view.records).toEqual([])
  })

  it('projects queue rank from readiness-first policy, not publication recency', () => {
    const game = createStartingState()
    game.patternSourceSeriesRecords = {
      [HIGH_READINESS_QUEUE_FIXTURE.id]: HIGH_READINESS_QUEUE_FIXTURE,
      [LOW_READINESS_RECENT_QUEUE_FIXTURE.id]: LOW_READINESS_RECENT_QUEUE_FIXTURE,
    }

    const view = getPatternSourceSeriesMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.queueEntries[0]?.recordId).toBe(HIGH_READINESS_QUEUE_FIXTURE.id)
    expect(view.queueEntries[0]?.rank).toBe(1)
    expect(view.queueEntries[1]?.recordId).toBe(LOW_READINESS_RECENT_QUEUE_FIXTURE.id)
    expect(view.queueEntries[1]?.rank).toBe(2)

    const highReadinessRecord = view.records.find(
      (record) => record.id === HIGH_READINESS_QUEUE_FIXTURE.id
    )
    const recentRecord = view.records.find(
      (record) => record.id === LOW_READINESS_RECENT_QUEUE_FIXTURE.id
    )

    expect(highReadinessRecord?.queueRankLabel).toBe('1')
    expect(recentRecord?.queueRankLabel).toBe('2')
  })

  it('mirrors persisted record fields without re-validating hidden truth', () => {
    const game = createStartingState()
    game.patternSourceSeriesRecords = {
      [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
      [EXPRESSION_RISK_PROVISIONAL_FIXTURE.id]: EXPRESSION_RISK_PROVISIONAL_FIXTURE,
    }

    const view = getPatternSourceSeriesMirrorView(game)
    const hubRecord = view.records.find((record) => record.id === SERIES_HUB_OPEN_ENTRY_FIXTURE.id)
    const provisionalRecord = view.records.find(
      (record) => record.id === EXPRESSION_RISK_PROVISIONAL_FIXTURE.id
    )

    expect(hubRecord?.title).toBe(SERIES_HUB_OPEN_ENTRY_FIXTURE.title)
    expect(hubRecord?.editorialStatusLabels).toEqual(
      expect.arrayContaining(['Open Entry', 'Completed', 'High Signal'])
    )
    expect(hubRecord?.linkedClusterCount).toBe(2)
    expect(provisionalRecord?.expressionRiskCount).toBe(3)
    expect(provisionalRecord?.normalizationStateLabel).toBe('Provisional')
    expect(provisionalRecord?.hasAdaptationNote).toBe(false)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPatternSourceSeriesEnumLabel('blurb_triaged')).toBe('Blurb Triaged')
    expect(formatPatternSourceSeriesEnumLabel('series_hub')).toBe('Series Hub')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.patternSourceSeriesRecords = {
      [SERIES_HUB_OPEN_ENTRY_FIXTURE.id]: SERIES_HUB_OPEN_ENTRY_FIXTURE,
    }

    const first = JSON.stringify(getPatternSourceSeriesMirrorView(game))
    const second = JSON.stringify(getPatternSourceSeriesMirrorView(game))

    expect(first).toBe(second)
  })
})
