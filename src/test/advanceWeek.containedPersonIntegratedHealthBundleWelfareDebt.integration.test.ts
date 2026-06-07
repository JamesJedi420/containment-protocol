import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
} from '../domain/welfareDebtAccountingRegistry'
import { HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE } from '../domain/containedPersonCustodyStatusRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { deriveWelfareDebtBundleFragmentsFromRecords } from '../domain/welfareDebtAccountingHealthBundleLinks'
import { composeWelfareDebtIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek contained-person integrated health bundle welfare-debt integration (SPE-1889 slice 10)', () => {
  it('is a no-op for empty welfare-debt and bundle maps without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {}
    state.containedPersonIntegratedHealthBundles = {}

    const nextState = advanceWeek(state)

    expect(nextState.containedPersonIntegratedHealthBundles ?? {}).toEqual({})
  })

  it('composes integrated health bundles from welfare-debt records after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const bundles = nextState.containedPersonIntegratedHealthBundles ?? {}

    expect(Object.keys(bundles)).toEqual([
      COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef,
      FORCED_SEDATION_CYCLE_FIXTURE.subjectRef,
    ])

    const restraintBundle = bundles[COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef]
    expect(restraintBundle?.welfareDebtAccountingLinks?.[0]?.severityBand).toBe('high')
    expect(restraintBundle?.welfareDebtAccountingLinks?.[0]?.mitigationState).toBe('acknowledged')
  })

  it('matches standalone derive + compose output for the same hydrated welfare-debt map', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const fragments = deriveWelfareDebtBundleFragmentsFromRecords(
      nextState.welfareDebtAccountingRecords
    )
    const composed = composeWelfareDebtIntoIntegratedHealthBundles({}, fragments)

    expect(
      nextState.containedPersonIntegratedHealthBundles?.[
        COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef
      ]?.welfareDebtAccountingLinks
    ).toEqual(
      composed[COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef]?.welfareDebtAccountingLinks
    )
  })

  it('leaves custody status compose behavior unchanged when welfare-debt map is empty', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {}
    state.containedPersonCustodyStatusRecords = {
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const bundle = nextState.containedPersonIntegratedHealthBundles?.[
      HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.subjectRef
    ]

    expect(bundle?.custodyStatusLinks).toHaveLength(1)
    expect(bundle?.welfareDebtAccountingLinks).toBeUndefined()
  })
})
