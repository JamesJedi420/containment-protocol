import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
} from '../domain/containedPersonMedicationRegimenRegistry'
import {
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
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

describe('advanceWeek coercive protocol records integration (SPE-1882 slice 2)', () => {
  it('preserves coercive protocol records through advanceWeek without mutation', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.coerciveContainedPersonProtocolRecords).toEqual(
      state.coerciveContainedPersonProtocolRecords
    )
  })

  it('does not break welfare-debt creation when coercive protocol records are present', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 3
    state.containedPersonMedicationRegimenRecords = {
      [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
    }
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const record =
      nextState.welfareDebtAccountingRecords?.[
        'welfare-debt:coercive-procedure:forced-sedation-stabilization:subject:cooperative-field-asset-22'
      ]

    expect(nextState.coerciveContainedPersonProtocolRecords).toEqual(
      state.coerciveContainedPersonProtocolRecords
    )
    expect(record?.debtCategory).toBe('coerced_medication')
    expect(record?.severityBand).toBe('critical')
  })
})
