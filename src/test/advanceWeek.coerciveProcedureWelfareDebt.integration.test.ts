import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE,
  HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
  PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE,
} from '../domain/containedPersonCustodyStatusRegistry'
import {
  COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE,
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
} from '../domain/containedPersonMedicationRegimenRegistry'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import {
  applyCoerciveProcedureWelfareDebtCreationTick,
  resolveCoerciveProcedureExecutionDrafts,
} from '../domain/coerciveProcedureWelfareDebtCreation'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('advanceWeek coercive procedure welfare-debt integration (SPE-1888 slice 5)', () => {
  it('is a no-op when no coercive procedure anchors are present', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.welfareDebtAccountingRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.welfareDebtAccountingRecords).toEqual({})
  })

  it('creates welfare-debt records from compelled medication regimen through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 3
    state.containedPersonMedicationRegimenRecords = {
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.welfareDebtAccountingRecords?.[
        'welfare-debt:coercive-procedure:forced-sedation-stabilization:subject:cooperative-field-asset-22'
      ]

    expect(nextState.week).toBe(4)
    expect(record?.debtCategory).toBe('coerced_medication')
    expect(record?.severityBand).toBe('critical')
    expect(record?.mitigationState).toBe('acknowledged')
    expect(record?.containmentBenefitScore).toBe(0.64)
  })

  it('creates restraint welfare debt from elevated custody status through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 1
    state.containedPersonCustodyStatusRecords = {
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.welfareDebtAccountingRecords?.[
        'welfare-debt:coercive-procedure:extended-mechanical-restraint:subject:cooperative-field-asset-17'
      ]

    expect(record?.debtCategory).toBe('harmful_restraint')
    expect(record?.severityBand).toBe('high')
    expect(record?.mitigationState).toBe('acknowledged')
    expect(record?.containmentBenefitScore).toBe(0.81)
  })

  it('does not duplicate debt entries when advanceWeek runs again with the same anchors', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.containedPersonMedicationRegimenRecords = {
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    }

    const once = advanceWeek(state)
    const twice = advanceWeek(once)

    expect(Object.keys(once.welfareDebtAccountingRecords ?? {})).toHaveLength(1)
    expect(twice.welfareDebtAccountingRecords).toEqual(once.welfareDebtAccountingRecords)
  })

  it('matches standalone creation tick output for the same derived drafts', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 5
    state.containedPersonMedicationRegimenRecords = {
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    }
    state.containedPersonCustodyStatusRecords = {
      [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
    }

    const nextWeek = state.week + 1
    const drafts = resolveCoerciveProcedureExecutionDrafts(
      state.containedPersonMedicationRegimenRecords,
      state.containedPersonCustodyStatusRecords,
      nextWeek
    )
    const createdOnly = applyCoerciveProcedureWelfareDebtCreationTick({}, drafts)
    const viaAdvanceWeek = advanceWeek(state).welfareDebtAccountingRecords ?? {}

    for (const recordId of Object.keys(createdOnly)) {
      expect(viaAdvanceWeek[recordId]?.id).toBe(createdOnly[recordId]?.id)
      expect(viaAdvanceWeek[recordId]?.debtCategory).toBe(createdOnly[recordId]?.debtCategory)
      expect(viaAdvanceWeek[recordId]?.severityBand).toBe(createdOnly[recordId]?.severityBand)
      expect(viaAdvanceWeek[recordId]?.containmentBenefitScore).toBe(
        createdOnly[recordId]?.containmentBenefitScore
      )
    }
  })
})

describe('advanceWeek privilege-deprivation and personnel-sourcing welfare-debt (SPE-1888 slice 6)', () => {
  it('creates privilege-deprivation welfare debt from privilege-suspended custody through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.containedPersonCustodyStatusRecords = {
      [PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE.id]: PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.welfareDebtAccountingRecords?.[
        'welfare-debt:coercive-procedure:privilege-suspension-enforcement:subject:cooperative-field-asset-31'
      ]

    expect(record?.debtCategory).toBe('privilege_deprivation')
    expect(record?.severityBand).toBe('moderate')
    expect(record?.mitigationState).toBe('unresolved')
    expect(record?.containmentBenefitScore).toBe(0.68)
  })

  it('creates personnel-sourcing welfare debt from regimen/custody combo through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.containedPersonMedicationRegimenRecords = {
      [COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE.id]: COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE,
    }
    state.containedPersonCustodyStatusRecords = {
      [COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE.id]: COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.welfareDebtAccountingRecords?.[
        'welfare-debt:coercive-procedure:coerced-high-risk-personnel-sourcing:subject:cooperative-field-asset-41'
      ]

    expect(record?.debtCategory).toBe('high_risk_personnel_sourcing')
    expect(record?.severityBand).toBe('high')
    expect(record?.mitigationState).toBe('acknowledged')
    expect(record?.containmentBenefitScore).toBe(0.74)
  })

  it('does not duplicate slice 6 debt entries when advanceWeek runs again with the same anchors', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 1
    state.containedPersonCustodyStatusRecords = {
      [PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE.id]: PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE,
    }

    const once = advanceWeek(state)
    const twice = advanceWeek(once)

    expect(Object.keys(once.welfareDebtAccountingRecords ?? {})).toHaveLength(1)
    expect(twice.welfareDebtAccountingRecords).toEqual(once.welfareDebtAccountingRecords)
  })
})

describe('advanceWeek compromised-care protocol welfare-debt integration (SPE-1882 slice 13)', () => {
  it('creates welfare-debt records from compromised-care protocol records without regimen/custody anchors', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const recordId =
      'welfare-debt:coercive-procedure:extended-mechanical-restraint:subject:cooperative-field-asset-31'
    const record = nextState.welfareDebtAccountingRecords?.[recordId]

    expect(record?.debtCategory).toBe('harmful_restraint')
    expect(record?.severityBand).toBe('high')
    expect(record?.containmentBenefitScore).toBe(0.71)
  })

  it('does not duplicate protocol-derived debt when advanceWeek runs again on a quiet week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 1
    state.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const once = advanceWeek(state)
    const twice = advanceWeek(once)

    expect(Object.keys(once.welfareDebtAccountingRecords ?? {})).toHaveLength(1)
    expect(twice.welfareDebtAccountingRecords).toEqual(once.welfareDebtAccountingRecords)
  })

  it('matches standalone creation tick output for compromised-care protocol derived drafts', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 3
    state.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const nextWeek = state.week + 1
    const drafts = resolveCoerciveProcedureExecutionDrafts(
      state.containedPersonMedicationRegimenRecords,
      state.containedPersonCustodyStatusRecords,
      nextWeek,
      state.coerciveContainedPersonProtocolRecords
    )
    const createdOnly = applyCoerciveProcedureWelfareDebtCreationTick({}, drafts)
    const viaAdvanceWeek = advanceWeek(state).welfareDebtAccountingRecords ?? {}

    for (const recordId of Object.keys(createdOnly)) {
      expect(viaAdvanceWeek[recordId]?.id).toBe(createdOnly[recordId]?.id)
      expect(viaAdvanceWeek[recordId]?.debtCategory).toBe(createdOnly[recordId]?.debtCategory)
      expect(viaAdvanceWeek[recordId]?.severityBand).toBe(createdOnly[recordId]?.severityBand)
      expect(viaAdvanceWeek[recordId]?.containmentBenefitScore).toBe(
        createdOnly[recordId]?.containmentBenefitScore
      )
    }
  })
})
