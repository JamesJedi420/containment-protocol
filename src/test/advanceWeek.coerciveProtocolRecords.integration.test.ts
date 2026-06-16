import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
} from '../domain/containedPersonMedicationRegimenRegistry'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import { applyWeeklyCoerciveProtocolTick } from '../domain/coerciveContainedPersonProtocolWeeklyOrchestration'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { COERCIVE_RESTRAINT_LEDGER_FIXTURE } from '../domain/welfareDebtAccountingRegistry'
import { composeWelfareDebtCrossLinksForCoerciveProtocolRecord } from '../domain/welfareDebtAccountingCrossLinks'
import { getCoerciveContainedPersonProtocolMirrorView } from '../features/operations/coerciveContainedPersonProtocolMirrorView'

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
    const reticked = applyWeeklyCoerciveProtocolTick(
      recordsAfterAdvance,
      once.week,
      once.coerciveContainedPersonProtocolWeeklyProjectionSnapshots
    )

    expect(reticked.records).toBe(recordsAfterAdvance)
    expect(reticked.snapshots).toBe(once.coerciveContainedPersonProtocolWeeklyProjectionSnapshots)
    expect(reticked.records[ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]).toBe(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
  })

  it('persists weekly projection snapshots through advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const snapshot =
      nextState.coerciveContainedPersonProtocolWeeklyProjectionSnapshots?.[
        EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id
      ]

    expect(snapshot?.week).toBe(5)
    expect(snapshot?.tradeoff).toEqual(
      projectContainmentCareTradeoff(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    )
    expect(snapshot?.riskReview).toEqual(
      projectCoerciveProtocolRiskReview(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    )
  })
})

describe('advanceWeek coercive protocol records integration (SPE-1882 slice 11)', () => {
  it('mirror reads hydrated snapshots after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const view = getCoerciveContainedPersonProtocolMirrorView(nextState)
    const snapshot =
      nextState.coerciveContainedPersonProtocolWeeklyProjectionSnapshots?.[
        EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id
      ]

    expect(view.summary.weeklySnapshotCount).toBe(1)
    expect(view.records[0]?.coercionRiskScoreLabel).toBe(
      snapshot?.riskReview.coercionRiskScore?.toFixed(2)
    )
    expect(view.records[0]?.welfareDebtImpactLabel).toBe(snapshot?.tradeoff.welfareDebtImpactLabel)
  })
})

describe('advanceWeek coercive protocol records integration (SPE-1882 slice 12)', () => {
  it('mirror reads welfare-debt cross-links from persisted ledger records after advanceWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    const debtId = `welfare-debt:${ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.procedureRef}:subject:cooperative-field-asset-31`
    state.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }
    state.welfareDebtAccountingRecords = {
      [debtId]: {
        ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        id: debtId,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
      },
    }

    const nextState = advanceWeek(state)
    const view = getCoerciveContainedPersonProtocolMirrorView(nextState)

    expect(view.summary.welfareDebtLinkedRecordCount).toBe(1)
    expect(view.records[0]?.welfareDebtCrossLinkLabels).toEqual([`welfare-debt:${debtId}`])
  })
})

describe('advanceWeek coercive protocol records integration (SPE-1882 slice 13)', () => {
  it('creates welfare-debt ledger entries from compromised-care protocol records and links by procedure_ref', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const debtId = `welfare-debt:${ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.procedureRef}:${ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef}`
    const debtRecord = nextState.welfareDebtAccountingRecords?.[debtId]

    expect(debtRecord?.debtCategory).toBe('harmful_restraint')
    expect(
      composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
        ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
        { welfareDebtRecords: nextState.welfareDebtAccountingRecords }
      )
    ).toEqual([
      expect.objectContaining({
        debtRef: debtId,
        coerciveProtocolId: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id,
        subjectRef: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.subjectRef,
        matchKind: 'procedure_ref',
      }),
    ])

    const view = getCoerciveContainedPersonProtocolMirrorView(nextState)

    expect(view.summary.welfareDebtLinkedRecordCount).toBe(1)
    expect(view.records[0]?.welfareDebtCrossLinkLabels).toEqual([`welfare-debt:${debtId}`])
  })
})

describe('advanceWeek coercive protocol records integration (SPE-1882 slice 14)', () => {
  it('creates protocol-only staff-exclusion welfare debt and links by procedure_ref', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.coerciveContainedPersonProtocolRecords = {
      [STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.id]:
        STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const debtId = `welfare-debt:${STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.procedureRef}:${STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.subjectRef}`
    const debtRecord = nextState.welfareDebtAccountingRecords?.[debtId]

    expect(debtRecord?.debtCategory).toBe('punitive_handling')
    expect(
      composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
        STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
        { welfareDebtRecords: nextState.welfareDebtAccountingRecords }
      )
    ).toEqual([
      expect.objectContaining({
        debtRef: debtId,
        coerciveProtocolId: STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.id,
        subjectRef: STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.subjectRef,
        matchKind: 'procedure_ref',
      }),
    ])
  })

  it('creates protocol-only forced-isolation welfare debt from canonical compromised-care fixture', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 2
    state.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const nextState = advanceWeek(state)
    const debtId = `welfare-debt:${ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.procedureRef}:${ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef}`
    const debtRecord = nextState.welfareDebtAccountingRecords?.[debtId]

    expect(debtRecord?.debtCategory).toBe('forced_isolation')
    expect(
      composeWelfareDebtCrossLinksForCoerciveProtocolRecord(
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
        {
          welfareDebtRecords: nextState.welfareDebtAccountingRecords,
        }
      )
    ).toEqual([
      expect.objectContaining({
        debtRef: debtId,
        coerciveProtocolId: ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id,
        subjectRef: ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.subjectRef,
        matchKind: 'procedure_ref',
      }),
    ])

    const view = getCoerciveContainedPersonProtocolMirrorView(nextState)

    expect(view.summary.welfareDebtLinkedRecordCount).toBe(1)
    expect(view.records[0]?.welfareDebtCrossLinkLabels).toEqual([`welfare-debt:${debtId}`])
  })
})
