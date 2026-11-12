import { describe, expect, it } from 'vitest'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  type WelfareDebtAccountingRecord,
} from '../domain/welfareDebtAccountingRegistry'
import {
  WELFARE_DEBT_WIRED_REF_PREFIX,
  deriveWelfareDebtBundleFragmentsFromRecords,
} from '../domain/welfareDebtAccountingHealthBundleLinks'

function baseRecord(overrides: Partial<WelfareDebtAccountingRecord> = {}): WelfareDebtAccountingRecord {
  return {
    id: 'welfare-debt:test-base',
    label: 'Test base welfare debt',
    subjectRef: 'subject:test-base',
    debtCategory: 'privilege_deprivation',
    severityBand: 'moderate',
    mitigationState: 'acknowledged',
    sourceProcedureLabel: 'test procedure',
    reviewOwnerLabel: 'ethics review board',
    ...overrides,
  }
}

describe('welfareDebtAccountingHealthBundleLinks (SPE-1889 slice 10)', () => {
  it('returns an empty frozen array for an empty map without throw', () => {
    expect(deriveWelfareDebtBundleFragmentsFromRecords({})).toEqual([])
    expect(deriveWelfareDebtBundleFragmentsFromRecords(null)).toEqual([])
    expect(deriveWelfareDebtBundleFragmentsFromRecords(undefined)).toEqual([])
  })

  it('groups welfare-debt records by subjectRef in deterministic subject order', () => {
    const sharedSubject = 'subject:contained-person-field-links'
    const secondRecord = baseRecord({
      id: 'welfare-debt:second-entry',
      label: 'Second welfare debt entry',
      subjectRef: sharedSubject,
    })

    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [secondRecord.id]: secondRecord,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    })

    expect(fragments).toHaveLength(2)
    expect(fragments.map((fragment) => fragment.subjectRef)).toEqual([
      sharedSubject,
      FORCED_SEDATION_CYCLE_FIXTURE.subjectRef,
    ])
    expect(fragments[0]?.welfareDebtAccountingLinks).toHaveLength(2)
    expect(fragments[0]?.welfareDebtAccountingLinks.map((link) => link.debtRef)).toEqual([
      COERCIVE_RESTRAINT_LEDGER_FIXTURE.id,
      secondRecord.id,
    ])
  })

  it('uses welfare-debt wired ref prefix on derived links', () => {
    const [fragment] = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    })

    expect(fragment?.welfareDebtAccountingLinks[0]?.wiredRef).toBe(
      `${WELFARE_DEBT_WIRED_REF_PREFIX}${COERCIVE_RESTRAINT_LEDGER_FIXTURE.id}`
    )
  })

  it('includes warning-only welfare-debt records in derived fragments', () => {
    const warningOnly = baseRecord({
      id: 'welfare-debt:warning-only-escalated',
      mitigationState: 'escalated',
      mitigationPathLabel: undefined,
    })

    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [warningOnly.id]: warningOnly,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.welfareDebtAccountingLinks).toHaveLength(1)
    expect(fragments[0]?.welfareDebtAccountingLinks[0]?.mitigationState).toBe('escalated')
  })

  it('skips invalid records without re-surfacing dropped payloads', () => {
    const fragments = deriveWelfareDebtBundleFragmentsFromRecords({
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      invalid: {
        id: '',
        label: 'bad',
        subjectRef: 'subject:test',
        debtCategory: 'harmful_restraint',
        severityBand: 'high',
        mitigationState: 'unresolved',
        sourceProcedureLabel: 'test',
        reviewOwnerLabel: 'reviewer',
      } as WelfareDebtAccountingRecord,
    })

    expect(fragments).toHaveLength(1)
    expect(fragments[0]?.welfareDebtAccountingLinks).toHaveLength(1)
  })

  it('is deterministic on repeated derive calls', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    }

    const first = deriveWelfareDebtBundleFragmentsFromRecords(records)
    const second = deriveWelfareDebtBundleFragmentsFromRecords(records)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
