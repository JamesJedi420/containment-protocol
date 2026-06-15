import { describe, expect, it } from 'vitest'
import {
  COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE,
  HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
  PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE,
} from '../domain/containedPersonCustodyStatusRegistry'
import {
  COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE,
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
} from '../domain/containedPersonMedicationRegimenRegistry'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_ANCHOR,
  COERCED_HIGH_RISK_PERSONNEL_SOURCING_ANCHOR,
  EXTENDED_MECHANICAL_RESTRAINT_ANCHOR,
  FORCED_SEDATION_STABILIZATION_ANCHOR,
  PRIVILEGE_SUSPENSION_ENFORCEMENT_ANCHOR,
  STAFF_EXCLUSION_SUPPORT_DUTY_ANCHOR,
} from '../domain/coerciveProcedureRegistry'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
} from '../domain/coerciveContainedPersonProtocolRegistry'
import {
  applyCoerciveProcedureWelfareDebtCreationTick,
  buildWelfareDebtAccountingRecordForCoerciveProcedureExecution,
  hasContainmentOrSecurityImprovement,
  resolveCoerciveProcedureExecutionDrafts,
  resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords,
  resolveCoerciveProcedureExecutionDraftsFromCustodyStatus,
  resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens,
  resolveCoerciveProcedureExecutionDraftsFromRegimenCustodyCombos,
  resolveContainmentBenefitScoreFromExecution,
  resolveWelfareDebtSeverityBandForCoerciveProcedure,
  type CoerciveProcedureExecutionDraft,
} from '../domain/coerciveProcedureWelfareDebtCreation'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  validateWelfareDebtAccountingRecord,
} from '../domain/welfareDebtAccountingRegistry'

function sedationDraft(
  overrides: Partial<CoerciveProcedureExecutionDraft> = {}
): CoerciveProcedureExecutionDraft {
  return {
    executionKey:
      'coercive-procedure:forced-sedation-stabilization:subject:cooperative-field-asset-22',
    subjectRef: 'subject:cooperative-field-asset-22',
    procedureRef: 'coercive-procedure:forced-sedation-stabilization',
    priorContainmentScore: 0.38,
    postContainmentScore: 0.64,
    week: 4,
    adverseReactionFlag: true,
    ...overrides,
  }
}

describe('coerciveProcedureWelfareDebtCreation (SPE-1888 slice 5)', () => {
  it('requires containment or security improvement before creating debt', () => {
    const draft = sedationDraft({ postContainmentScore: 0.3 })

    expect(hasContainmentOrSecurityImprovement(draft)).toBe(false)
    expect(
      buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
        draft,
        FORCED_SEDATION_STABILIZATION_ANCHOR
      )
    ).toBeUndefined()
  })

  it('classifies severity from category pressure and adverse reaction without erasing debt at high benefit', () => {
    const draft = sedationDraft({ postContainmentScore: 0.91 })

    expect(resolveWelfareDebtSeverityBandForCoerciveProcedure(
      FORCED_SEDATION_STABILIZATION_ANCHOR,
      draft
    )).toBe('critical')
    expect(resolveContainmentBenefitScoreFromExecution(draft)).toBe(0.91)

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      FORCED_SEDATION_STABILIZATION_ANCHOR
    )

    expect(created).toBeDefined()
    expect(created?.containmentBenefitScore).toBe(0.91)
    expect(created?.severityBand).toBe('critical')
    expect(created?.mitigationState).toBe('unresolved')
    expect(validateWelfareDebtAccountingRecord(created!).valid).toBe(true)
  })

  it('builds restraint debt with high severity and containment benefit from custody anchor', () => {
    const draft: CoerciveProcedureExecutionDraft = {
      executionKey:
        'coercive-procedure:extended-mechanical-restraint:subject:cooperative-field-asset-17',
      subjectRef: 'subject:cooperative-field-asset-17',
      procedureRef: 'coercive-procedure:extended-mechanical-restraint',
      priorContainmentScore: 0.38,
      postContainmentScore: 0.71,
      week: 3,
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      EXTENDED_MECHANICAL_RESTRAINT_ANCHOR
    )

    expect(created?.debtCategory).toBe('harmful_restraint')
    expect(created?.severityBand).toBe('high')
    expect(created?.containmentBenefitScore).toBe(0.71)
    expect(created?.sourceProcedureLabel).toBe('extended mechanical restraint cycle')
  })

  it('derives deterministic execution drafts from compelled medication regimen fixture', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens(
      {
        [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
      },
      6
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.postContainmentScore).toBe(0.64)
    expect(drafts[0]?.adverseReactionFlag).toBe(true)
  })

  it('derives deterministic execution drafts from elevated custody status fixture', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCustodyStatus(
      {
        [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      },
      6
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.postContainmentScore).toBe(0.81)
    expect(drafts[0]?.procedureRef).toBe('coercive-procedure:extended-mechanical-restraint')
  })

  it('merges medication and custody drafts without duplicate execution keys', () => {
    const drafts = resolveCoerciveProcedureExecutionDrafts(
      {
        [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
      },
      {
        [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
      },
      2
    )

    expect(drafts).toHaveLength(2)
    expect(drafts.map((draft) => draft.executionKey)).toEqual([
      'coercive-procedure:extended-mechanical-restraint:subject:cooperative-field-asset-17',
      'coercive-procedure:forced-sedation-stabilization:subject:cooperative-field-asset-22',
    ])
  })

  it('is idempotent when re-applying creation tick with the same drafts', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens(
      {
        [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
      },
      1
    )

    const once = applyCoerciveProcedureWelfareDebtCreationTick({}, drafts)
    const twice = applyCoerciveProcedureWelfareDebtCreationTick(once, drafts)

    expect(Object.keys(once)).toHaveLength(1)
    expect(twice).toBe(once)
  })

  it('preserves authored fixtures when ids do not collide', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens(
      {
        [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
      },
      1
    )

    const next = applyCoerciveProcedureWelfareDebtCreationTick(
      {
        [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      },
      drafts
    )

    expect(next[COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]).toEqual(COERCIVE_RESTRAINT_LEDGER_FIXTURE)
    expect(Object.keys(next)).toHaveLength(2)
  })
})

describe('coerciveProcedureWelfareDebtCreation (SPE-1888 slice 6)', () => {
  it('classifies privilege-deprivation severity as moderate distinct from restraint high band', () => {
    const draft: CoerciveProcedureExecutionDraft = {
      executionKey:
        'coercive-procedure:privilege-suspension-enforcement:subject:cooperative-field-asset-31',
      subjectRef: 'subject:cooperative-field-asset-31',
      procedureRef: 'coercive-procedure:privilege-suspension-enforcement',
      priorContainmentScore: 0.38,
      postContainmentScore: 0.68,
      week: 2,
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      PRIVILEGE_SUSPENSION_ENFORCEMENT_ANCHOR
    )

    expect(created?.debtCategory).toBe('privilege_deprivation')
    expect(created?.severityBand).toBe('moderate')
    expect(created?.sourceProcedureLabel).toBe('privilege suspension cycle')
  })

  it('still creates privilege-deprivation debt when containment benefit is high', () => {
    const draft: CoerciveProcedureExecutionDraft = {
      executionKey:
        'coercive-procedure:privilege-suspension-enforcement:subject:cooperative-field-asset-31',
      subjectRef: 'subject:cooperative-field-asset-31',
      procedureRef: 'coercive-procedure:privilege-suspension-enforcement',
      priorContainmentScore: 0.38,
      postContainmentScore: 0.91,
      week: 2,
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      PRIVILEGE_SUSPENSION_ENFORCEMENT_ANCHOR
    )

    expect(created?.containmentBenefitScore).toBe(0.91)
    expect(created?.mitigationState).toBe('unresolved')
    expect(created?.severityBand).toBe('moderate')
  })

  it('classifies personnel-sourcing severity as high from category and coercion pressure', () => {
    const draft: CoerciveProcedureExecutionDraft = {
      executionKey:
        'coercive-procedure:coerced-high-risk-personnel-sourcing:subject:cooperative-field-asset-41',
      subjectRef: 'subject:cooperative-field-asset-41',
      procedureRef: 'coercive-procedure:coerced-high-risk-personnel-sourcing',
      priorContainmentScore: 0.38,
      postContainmentScore: 0.74,
      week: 3,
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      COERCED_HIGH_RISK_PERSONNEL_SOURCING_ANCHOR
    )

    expect(created?.debtCategory).toBe('high_risk_personnel_sourcing')
    expect(created?.severityBand).toBe('high')
    expect(created?.sourceProcedureLabel).toBe('coerced high-risk personnel sourcing cycle')
  })

  it('derives privilege-deprivation drafts from privilege-suspended custody escalation', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCustodyStatus(
      {
        [PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE.id]: PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE,
      },
      4
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.procedureRef).toBe('coercive-procedure:privilege-suspension-enforcement')
    expect(drafts[0]?.postContainmentScore).toBe(0.68)
  })

  it('derives personnel-sourcing drafts only when regimen and custody combo match subject', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromRegimenCustodyCombos(
      {
        [COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE.id]: COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE,
      },
      {
        [COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE.id]: COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE,
      },
      5
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.postContainmentScore).toBe(0.74)
    expect(drafts[0]?.procedureRef).toBe('coercive-procedure:coerced-high-risk-personnel-sourcing')
  })

  it('does not derive personnel-sourcing drafts when regimen and custody subjects diverge', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromRegimenCustodyCombos(
      {
        [COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE.id]: COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE,
      },
      {
        [COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE.id]: {
          ...COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE,
          subjectRef: 'subject:mismatched-field-asset-99',
        },
      },
      5
    )

    expect(drafts).toHaveLength(0)
  })

  it('merges slice 5 and slice 6 drafts without duplicate execution keys', () => {
    const drafts = resolveCoerciveProcedureExecutionDrafts(
      {
        [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
        [COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE.id]: COERCED_PERSONNEL_SCREENING_REGIMEN_FIXTURE,
      },
      {
        [HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE.id]: HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE,
        [PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE.id]: PRIVILEGE_SUSPENDED_CONTAINED_HOLD_FIXTURE,
        [COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE.id]: COERCED_PERSONNEL_SOURCE_HOLD_FIXTURE,
      },
      2
    )

    expect(drafts).toHaveLength(4)
    expect(drafts.map((draft) => draft.procedureRef)).toEqual([
      'coercive-procedure:coerced-high-risk-personnel-sourcing',
      'coercive-procedure:extended-mechanical-restraint',
      'coercive-procedure:forced-sedation-stabilization',
      'coercive-procedure:privilege-suspension-enforcement',
    ])
  })
})

describe('coerciveProcedureWelfareDebtCreation (SPE-1882 slice 13)', () => {
  it('derives compromised-care protocol drafts from stableContainmentDominatesCare fixtures', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      {
        [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
        [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      },
      4
    )

    expect(drafts).toHaveLength(2)
    expect(drafts.map((draft) => draft.executionKey)).toEqual([
      'coercive-procedure:extended-mechanical-restraint:subject:cooperative-field-asset-31',
      'coercive-procedure:forced-sedation-stabilization:subject:cooperative-field-asset-17',
    ])
    expect(drafts[0]?.postContainmentScore).toBe(0.71)
    expect(drafts[1]?.postContainmentScore).toBe(0.78)
  })

  it('skips protocol records without compromised-care posture even when procedureRef resolves', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      {
        [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
          ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      },
      2
    )

    expect(drafts).toHaveLength(0)
  })

  it('skips protocol records without resolvable procedureRef', () => {
    const withoutProcedureRef = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      procedureRef: undefined,
    }
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      { [withoutProcedureRef.id]: withoutProcedureRef },
      2
    )

    expect(drafts).toHaveLength(0)
  })

  it('does not treat welfareDebtImpactLabel alone as a creation gate', () => {
    const labelOnly = {
      ...ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      procedureRef: 'coercive-procedure:forced-sedation-stabilization',
    }
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      { [labelOnly.id]: labelOnly },
      3
    )

    expect(drafts).toHaveLength(0)
  })

  it('prefers regimen/custody drafts over protocol drafts on duplicate execution keys', () => {
    const drafts = resolveCoerciveProcedureExecutionDrafts(
      {
        [COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE.id]: COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
      },
      {},
      2,
      {
        [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: {
          ...EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
          subjectRef: 'subject:cooperative-field-asset-22',
          procedureRef: 'coercive-procedure:forced-sedation-stabilization',
        },
      }
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.executionKey).toBe(
      'coercive-procedure:forced-sedation-stabilization:subject:cooperative-field-asset-22'
    )
    expect(drafts[0]?.postContainmentScore).toBe(0.64)
    expect(drafts[0]?.adverseReactionFlag).toBe(true)
  })
})

describe('coerciveProcedureWelfareDebtCreation (SPE-1882 slice 14)', () => {
  it('derives staff-exclusion protocol draft from compromised-care fixture with anchor ref', () => {
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      {
        [STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.id]:
          STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
      },
      3
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.executionKey).toBe(
      'coercive-procedure:staff-exclusion-support-duty:subject:contained-support-personnel-09'
    )
    expect(drafts[0]?.postContainmentScore).toBe(0.77)
  })

  it('derives forced-isolation protocol draft when compromised-care posture is satisfied', () => {
    const compromisedCareSurveillance = {
      ...ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      containmentStabilityGain: 0.85,
    }
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      { [compromisedCareSurveillance.id]: compromisedCareSurveillance },
      4
    )

    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.procedureRef).toBe('coercive-procedure:abusive-surveillance-isolation')
    expect(drafts[0]?.postContainmentScore).toBe(0.85)
  })

  it('builds forced-isolation debt from abusive surveillance anchor', () => {
    const draft: CoerciveProcedureExecutionDraft = {
      executionKey:
        'coercive-procedure:abusive-surveillance-isolation:subject:cooperative-field-asset-22',
      subjectRef: 'subject:cooperative-field-asset-22',
      procedureRef: 'coercive-procedure:abusive-surveillance-isolation',
      priorContainmentScore: 0.38,
      postContainmentScore: 0.66,
      week: 2,
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      ABUSIVE_SURVEILLANCE_ISOLATION_ANCHOR
    )

    expect(created?.debtCategory).toBe('forced_isolation')
    expect(created?.severityBand).toBe('high')
    expect(created?.sourceProcedureLabel).toBe('abusive surveillance isolation cycle')
  })

  it('builds punitive-handling debt from staff-exclusion anchor', () => {
    const draft: CoerciveProcedureExecutionDraft = {
      executionKey:
        'coercive-procedure:staff-exclusion-support-duty:subject:contained-support-personnel-09',
      subjectRef: 'subject:contained-support-personnel-09',
      procedureRef: 'coercive-procedure:staff-exclusion-support-duty',
      priorContainmentScore: 0.38,
      postContainmentScore: 0.77,
      week: 2,
    }

    const created = buildWelfareDebtAccountingRecordForCoerciveProcedureExecution(
      draft,
      STAFF_EXCLUSION_SUPPORT_DUTY_ANCHOR
    )

    expect(created?.debtCategory).toBe('punitive_handling')
    expect(created?.severityBand).toBe('high')
    expect(created?.sourceProcedureLabel).toBe('staff exclusion support-service denial cycle')
  })

  it('does not treat welfareDebtImpactLabel alone as a creation gate for new anchors', () => {
    const labelOnly = {
      ...STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
      procedureRef: 'coercive-procedure:forced-sedation-stabilization',
      containmentStabilityGain: 0.4,
      personhoodHarmRisk: 0.9,
      trustDamageRisk: 0.9,
      legitimacyRisk: 0.9,
    }
    const drafts = resolveCoerciveProcedureExecutionDraftsFromCoerciveProtocolRecords(
      { [labelOnly.id]: labelOnly },
      3
    )

    expect(drafts).toHaveLength(0)
  })
})
