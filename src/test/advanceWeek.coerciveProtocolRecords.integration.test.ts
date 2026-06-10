import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
} from '../domain/containedPersonMedicationRegimenRegistry'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import { applyWeeklyCoerciveProtocolTick } from '../domain/coerciveContainedPersonProtocolWeeklyOrchestration'
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

describe('advanceWeek coercive protocol records integration (SPE-1882 slice 3)', () => {
  it('is a no-op for an empty protocol map without throwing', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {}

    const nextState = advanceWeek(state)

    expect(nextState.coerciveContainedPersonProtocolRecords).toEqual({})
  })

  it('preserves fixture record references byte-stable after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)

    expect(nextState.week).toBe(5)
    expect(
      nextState.coerciveContainedPersonProtocolRecords?.[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]
    ).toBe(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    expect(
      nextState.coerciveContainedPersonProtocolRecords?.[
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id
      ]
    ).toBe(ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE)
  })

  it('preserves owner refs on protocol records after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const nextRecord =
      nextState.coerciveContainedPersonProtocolRecords?.[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]

    expect(nextRecord?.medicationRegimenRef).toBe(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE.medicationRegimenRef
    )
    expect(nextRecord?.custodyStatusRef).toBe(EMERGENCY_SEDATION_PROTOCOL_FIXTURE.custodyStatusRef)
    expect(nextRecord?.procedureRef).toBe(EMERGENCY_SEDATION_PROTOCOL_FIXTURE.procedureRef)
  })

  it('is idempotent when protocol tick is re-applied at the post-advance week', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const once = advanceWeek(state)
    const recordsAfterAdvance = once.coerciveContainedPersonProtocolRecords ?? {}
    const reticked = applyWeeklyCoerciveProtocolTick(recordsAfterAdvance, once.week)

    expect(reticked).toBe(recordsAfterAdvance)
    expect(reticked[ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]).toBe(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
  })
})
