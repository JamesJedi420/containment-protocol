import { describe, expect, it } from 'vitest'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  validateWelfareDebtAccountingRecord,
  projectWelfareDebtAccounting,
} from '../domain/welfareDebtAccountingRegistry'

describe('welfareDebtAccountingRegistry (SPE-1888 slice 1)', () => {
  it('validates coercive restraint ledger fixture without errors', () => {
    const result = validateWelfareDebtAccountingRecord(COERCIVE_RESTRAINT_LEDGER_FIXTURE)
    expect(result.valid).toBe(true)
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('projects welfare-debt accounting link fields from restraint ledger record', () => {
    const projection = projectWelfareDebtAccounting(COERCIVE_RESTRAINT_LEDGER_FIXTURE)

    expect(projection.severityBand).toBe('high')
    expect(projection.mitigationState).toBe('unresolved')
    expect(projection.containmentBenefitScore).toBe(0.71)
  })

  it('returns warning-only validation for escalated record without mitigation path', () => {
    const warningOnly = {
      ...FORCED_SEDATION_CYCLE_FIXTURE,
      id: 'welfare-debt:warning-only-escalated',
      mitigationPathLabel: undefined,
    }

    const result = validateWelfareDebtAccountingRecord(warningOnly)
    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'escalated_without_mitigation_path')
    ).toBe(true)
  })

  it('rejects franchise tokens in record label', () => {
    const invalid = {
      ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      id: 'welfare-debt:franchise-label',
      label: 'SCP division welfare debt',
    }

    const result = validateWelfareDebtAccountingRecord(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('returns byte-stable validation on repeated calls', () => {
    const first = validateWelfareDebtAccountingRecord(COERCIVE_RESTRAINT_LEDGER_FIXTURE)
    const second = validateWelfareDebtAccountingRecord(COERCIVE_RESTRAINT_LEDGER_FIXTURE)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
