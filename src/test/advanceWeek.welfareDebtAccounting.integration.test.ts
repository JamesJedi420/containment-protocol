import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  type WelfareDebtAccountingRecord,
} from '../domain/welfareDebtAccountingRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { applyWeeklyWelfareDebtAccountingTick } from '../domain/welfareDebtAccountingRegistry'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

function weeklyActiveRecord(): WelfareDebtAccountingRecord {
  return {
    id: 'welfare-debt:advance-week-weekly-active',
    label: 'Advance week weekly active welfare debt',
    subjectRef: 'subject:advance-week-weekly-active',
    debtCategory: 'harmful_restraint',
    severityBand: 'moderate',
    mitigationState: 'unresolved',
    sourceProcedureLabel: 'extended mechanical restraint cycle',
    reviewOwnerLabel: 'ethics review board',
    containmentBenefitScore: 0.3,
  }
}

describe('advanceWeek welfare-debt accounting integration (SPE-1888 slice 3)', () => {
  it('is a no-op for an empty welfare-debt map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.welfareDebtAccountingRecords).toEqual({})
  })

  it('acknowledges and escalates low-benefit debt after advanceWeek on review due weeks', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    const record = weeklyActiveRecord()
    state.welfareDebtAccountingRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.welfareDebtAccountingRecords?.[record.id]

    expect(nextState.week).toBe(5)
    expect(nextRecord?.mitigationState).toBe('escalated')
    expect(nextRecord?.severityBand).toBe('high')
    expect(nextRecord?.reviewOwnerLabel).toBe(record.reviewOwnerLabel)
  })

  it('acknowledges restraint ledger fixture without escalation when containment benefit is high', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.welfareDebtAccountingRecords?.[COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]

    expect(nextState.week).toBe(3)
    expect(nextRecord?.mitigationState).toBe('acknowledged')
    expect(nextRecord?.severityBand).toBe('high')
  })

  it('leaves medium-pressure records unchanged on non-due weeks after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    const record = {
      ...weeklyActiveRecord(),
      id: 'welfare-debt:advance-week-biweekly',
      debtCategory: 'forced_isolation' as const,
    }
    state.welfareDebtAccountingRecords = {
      [record.id]: record,
    }

    const nextState = advanceWeek(state)
    const nextRecord = nextState.welfareDebtAccountingRecords?.[record.id]

    expect(nextState.week).toBe(3)
    expect(nextRecord?.mitigationState).toBe('unresolved')
    expect(nextRecord).toBe(record)
  })

  it('preserves synced escalated fixtures without mutation after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 5
    state.welfareDebtAccountingRecords = {
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(
      nextState.welfareDebtAccountingRecords?.[FORCED_SEDATION_CYCLE_FIXTURE.id]
    ).toBe(FORCED_SEDATION_CYCLE_FIXTURE)
    expect(
      nextState.welfareDebtAccountingRecords?.[COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]
    ).toEqual(
      expect.objectContaining({
        mitigationState: 'acknowledged',
      })
    )
  })

  it('is idempotent when welfare-debt tick is re-applied at the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    const record = weeklyActiveRecord()
    state.welfareDebtAccountingRecords = {
      [record.id]: record,
    }

    const once = advanceWeek(state)
    const recordsAfterAdvance = once.welfareDebtAccountingRecords ?? {}
    const reticked = applyWeeklyWelfareDebtAccountingTick(recordsAfterAdvance, once.week)

    expect(reticked).toBe(recordsAfterAdvance)
    expect(reticked[record.id]).toEqual(once.welfareDebtAccountingRecords?.[record.id])
  })
})
