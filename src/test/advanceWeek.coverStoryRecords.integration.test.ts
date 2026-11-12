import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
  COVER_STORY_STRESSED_FIXTURE,
  projectCoverStoryLifecycleView,
} from '../domain/coverStoryLifecycleRegistry'
import { COVER_NARRATIVE_TRUTH_LAYER_FIXTURE } from '../domain/truthLayerRecordRegistry'
import { applyWeeklyCoverStoryTick } from '../domain/coverStoryWeeklyOrchestration'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek cover-story records integration (SPE-1347 slice 2)', () => {
  it('is a no-op for an empty cover-story map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coverStoryRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.coverStoryRecords).toEqual({})
    expect(nextState.coverStoryWeeklyProjectionSnapshots).toEqual({})
  })

  it('preserves fixture record references byte-stable after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coverStoryRecords = {
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.week).toBe(5)
    expect(nextState.coverStoryRecords?.[COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]).toBe(
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE
    )
    expect(nextState.coverStoryRecords?.[COVER_STORY_STRESSED_FIXTURE.id]).toBe(
      COVER_STORY_STRESSED_FIXTURE
    )
  })

  it('persists weekly lifecycle projection snapshots through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const snapshot =
      nextState.coverStoryWeeklyProjectionSnapshots?.[COVER_STORY_STRESSED_FIXTURE.id]

    expect(snapshot?.week).toBe(5)
    expect(snapshot?.lifecycle).toEqual(projectCoverStoryLifecycleView(COVER_STORY_STRESSED_FIXTURE))
    expect(snapshot?.lifecycle.coverStressActive).toBe(true)
    expect(snapshot?.lifecycle.repairInProgress).toBe(false)
  })

  it('is idempotent when cover-story tick is re-applied at the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }

    const once = advanceWeek(state)
    const recordsAfterAdvance = once.coverStoryRecords ?? {}
    const reticked = applyWeeklyCoverStoryTick(
      recordsAfterAdvance,
      once.week,
      once.coverStoryWeeklyProjectionSnapshots,
      {
        contradictionInput: {
          priorIntakeReports: state.informationIntakeReports,
          nextIntakeReports: once.informationIntakeReports,
          truthLayerRecords: once.truthLayerRecords,
          ruleDocumentComplianceRecords: once.ruleDocumentComplianceRecords,
          extranormalEventRecords: once.extranormalEventRecords,
          cases: once.cases,
        },
      }
    )

    expect(reticked.records).toBe(recordsAfterAdvance)
    expect(reticked.snapshots).toBe(once.coverStoryWeeklyProjectionSnapshots)
    expect(reticked.records[COVER_STORY_STRESSED_FIXTURE.id]).toBe(COVER_STORY_STRESSED_FIXTURE)
  })

  it('advances a stressed cover story toward collapsed through weekly accumulation triggers', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 20
    state.truthLayerRecords = {
      [COVER_NARRATIVE_TRUTH_LAYER_FIXTURE.id]: COVER_NARRATIVE_TRUTH_LAYER_FIXTURE,
    }
    state.coverStoryRecords = {
      [COVER_STORY_STRESSED_FIXTURE.id]: {
        ...COVER_STORY_STRESSED_FIXTURE,
        contradictionChannels: [
          {
            channel: 'witness_testimony',
            accumulationScore: 0.86,
            lastUpdatedWeek: 19,
            sourceRef: 'witness:contractor-shift-log',
          },
          {
            channel: 'institutional_records',
            accumulationScore: 0.86,
            lastUpdatedWeek: 19,
            sourceRef: 'record:seal-inspection-summary',
          },
        ],
        contradictionPressure: 0.86,
      },
    }

    const nextState = advanceWeek(state)
    const record = nextState.coverStoryRecords?.[COVER_STORY_STRESSED_FIXTURE.id]

    expect(record?.lifecyclePhase).toBe('collapsed')
    expect(record?.transitionHistory?.at(-1)?.event).toBe('cover_collapsed')
    expect(
      nextState.coverStoryWeeklyProjectionSnapshots?.[COVER_STORY_STRESSED_FIXTURE.id]?.lifecycle
        .coverCollapsed
    ).toBe(true)
  })

  it('preserves validation fixture byte-stable through advanceWeek tick', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 30
    state.coverStoryRecords = {
      [COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]: COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE,
      [COVER_STORY_STRESSED_FIXTURE.id]: COVER_STORY_STRESSED_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.coverStoryRecords?.[COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE.id]).toEqual(
      COASTAL_CAMPUS_COVER_STORY_MAINTAINED_FIXTURE
    )
    expect(nextState.coverStoryRecords?.[COVER_STORY_STRESSED_FIXTURE.id]).toEqual(
      COVER_STORY_STRESSED_FIXTURE
    )
  })
})
