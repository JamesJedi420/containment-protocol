import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { COERCIVE_RESTRAINT_LEDGER_FIXTURE } from '../domain/welfareDebtAccountingRegistry'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek welfare-debt cross-link integration (SPE-1888 slice 8)', () => {
  it('is a no-op for welfare-debt cross-link notes when sibling maps are empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const crossLinkNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'welfare_debt.accounting_cross_link') ??
      []

    expect(crossLinkNotes).toEqual([])
  })

  it('surfaces welfare-debt cross-link notes when linked fixtures coexist', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }
    state.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
        INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const weeklyReport = nextState.reports[nextState.reports.length - 1]
    const crossLinkNotes =
      weeklyReport?.notes?.filter((note) => note.type === 'welfare_debt.accounting_cross_link') ??
      []

    expect(crossLinkNotes.length).toBeGreaterThan(0)
    expect(crossLinkNotes[0]?.content).toContain('Welfare-debt cross-link')
    expect(crossLinkNotes[0]?.content).toContain(COERCIVE_RESTRAINT_LEDGER_FIXTURE.id)
    expect(crossLinkNotes[0]?.content).toContain('integrated-health:')
  })
})
