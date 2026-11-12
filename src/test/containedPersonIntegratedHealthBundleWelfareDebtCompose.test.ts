import { describe, expect, it } from 'vitest'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  sanitizeWelfareDebtAccountingRecords,
} from '../domain/welfareDebtAccountingRegistry'
import { composeWelfareDebtIntoIntegratedHealthBundles } from '../domain/containedPersonIntegratedHealthBundleCompose'
import type { ContainedPersonIntegratedHealthBundle } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  WELFARE_DEBT_WIRED_REF_PREFIX,
  deriveWelfareDebtBundleFragmentsFromRecords,
} from '../domain/welfareDebtAccountingHealthBundleLinks'

describe('containedPersonIntegratedHealthBundleCompose welfare debt (SPE-1889 slice 10)', () => {
  it('is a no-op for an empty bundle map and empty fragments without throw', () => {
    expect(composeWelfareDebtIntoIntegratedHealthBundles({}, [])).toEqual({})
    expect(composeWelfareDebtIntoIntegratedHealthBundles(null, [])).toEqual({})
  })

  it('merges derived welfare-debt links onto bundles keyed by subjectRef', () => {
    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    })

    const composed = composeWelfareDebtIntoIntegratedHealthBundles({}, fragments)

    expect(Object.keys(composed)).toEqual([
      COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef,
      FORCED_SEDATION_CYCLE_FIXTURE.subjectRef,
    ])

    const restraintBundle = composed[COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef]
    const sedationBundle = composed[FORCED_SEDATION_CYCLE_FIXTURE.subjectRef]

    expect(restraintBundle?.welfareDebtAccountingLinks).toHaveLength(1)
    expect(restraintBundle?.welfareDebtAccountingLinks?.[0]?.severityBand).toBe('high')
    expect(restraintBundle?.welfareDebtAccountingLinks?.[0]?.mitigationState).toBe('unresolved')
    expect(sedationBundle?.welfareDebtAccountingLinks?.[0]?.mitigationState).toBe('escalated')
  })

  it('preserves authored bundle fields while replacing prior wired links by ref prefix', () => {
    const subjectRef = COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef
    const seeded: ContainedPersonIntegratedHealthBundle = {
      id: subjectRef,
      label: 'Authored bundle label',
      subjectRef,
      confidence: 0.82,
      welfareDebtAccountingLinks: [
        {
          debtRef: 'welfare-debt:authored-manual-link',
          wiredRef: 'manual:welfare-debt:authored-manual-link',
          severityBand: 'low',
          mitigationState: 'mitigated',
          containmentBenefitScore: 0.2,
        },
        {
          debtRef: 'welfare-debt:stale-wired',
          wiredRef: `${WELFARE_DEBT_WIRED_REF_PREFIX}welfare-debt:stale-wired`,
          severityBand: 'moderate',
          mitigationState: 'acknowledged',
          containmentBenefitScore: 0.4,
        },
      ],
    }

    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    })

    const composed = composeWelfareDebtIntoIntegratedHealthBundles(
      { [subjectRef]: seeded },
      fragments
    )
    const bundle = composed[subjectRef]

    expect(bundle?.label).toBe('Authored bundle label')
    expect(bundle?.confidence).toBe(0.82)
    expect(bundle?.welfareDebtAccountingLinks).toHaveLength(2)
    expect(
      bundle?.welfareDebtAccountingLinks?.some(
        (link) => link.wiredRef === 'manual:welfare-debt:authored-manual-link'
      )
    ).toBe(true)
    expect(
      bundle?.welfareDebtAccountingLinks?.some(
        (link) => link.debtRef === COERCIVE_RESTRAINT_LEDGER_FIXTURE.id
      )
    ).toBe(true)
    expect(
      bundle?.welfareDebtAccountingLinks?.some((link) => link.debtRef === 'welfare-debt:stale-wired')
    ).toBe(false)
  })

  it('strips wired welfare-debt links without removing bundles that still have custody status links', () => {
    const subjectRef = COERCIVE_RESTRAINT_LEDGER_FIXTURE.subjectRef
    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    })
    const seeded = composeWelfareDebtIntoIntegratedHealthBundles({}, fragments)
    const withCustody: ContainedPersonIntegratedHealthBundle = {
      ...seeded[subjectRef]!,
      custodyStatusLinks: [
        {
          custodyRef: 'custody-status:retained',
          wiredRef: 'custody-status:custody-status:retained',
          custodyStage: 'contained_person',
          formerRoleCategory: 'hostile_actor',
          restrictionLevel: 'elevated',
          rightsReviewPending: true,
        },
      ],
    }

    const stripped = composeWelfareDebtIntoIntegratedHealthBundles(
      { [subjectRef]: withCustody },
      []
    )

    expect(stripped[subjectRef]?.welfareDebtAccountingLinks).toBeUndefined()
    expect(stripped[subjectRef]?.custodyStatusLinks).toHaveLength(1)
  })

  it('is idempotent when re-applied with the same fragments', () => {
    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    })

    const first = composeWelfareDebtIntoIntegratedHealthBundles({}, fragments)
    const second = composeWelfareDebtIntoIntegratedHealthBundles(first, fragments)

    expect(second).toBe(first)
  })
})

describe('welfareDebtAccountingRegistry persistence (SPE-1888 slice 1)', () => {
  it('defaults starting state to an empty welfare-debt accounting map', async () => {
    const { createStartingState } = await import('../data/startingState')
    expect(createStartingState().welfareDebtAccountingRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeWelfareDebtAccountingRecords(
      {
        valid: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
        sedation: FORCED_SEDATION_CYCLE_FIXTURE,
        duplicate: {
          ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'subject:test',
          debtCategory: 'harmful_restraint',
          severityBand: 'high',
          mitigationState: 'unresolved',
          sourceProcedureLabel: 'test',
          reviewOwnerLabel: 'reviewer',
        },
      },
      fallback
    )

    expect(sanitized['welfare-debt:coercive-restraint-ledger-12']).toEqual(
      COERCIVE_RESTRAINT_LEDGER_FIXTURE
    )
    expect(sanitized['welfare-debt:forced-sedation-cycle-3']).toEqual(FORCED_SEDATION_CYCLE_FIXTURE)
    expect(sanitized.invalid).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(2)
  })
})
