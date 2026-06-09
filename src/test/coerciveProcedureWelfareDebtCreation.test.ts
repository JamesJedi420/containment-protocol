import { describe, expect, it } from 'vitest'
import { HOSTILE_ACTOR_CONTAINED_HOLD_FIXTURE } from '../domain/containedPersonCustodyStatusRegistry'
import { COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE } from '../domain/containedPersonMedicationRegimenRegistry'
import {
  EXTENDED_MECHANICAL_RESTRAINT_ANCHOR,
  FORCED_SEDATION_STABILIZATION_ANCHOR,
} from '../domain/coerciveProcedureRegistry'
import {
  applyCoerciveProcedureWelfareDebtCreationTick,
  buildWelfareDebtAccountingRecordForCoerciveProcedureExecution,
  hasContainmentOrSecurityImprovement,
  resolveCoerciveProcedureExecutionDrafts,
  resolveCoerciveProcedureExecutionDraftsFromCustodyStatus,
  resolveCoerciveProcedureExecutionDraftsFromMedicationRegimens,
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
