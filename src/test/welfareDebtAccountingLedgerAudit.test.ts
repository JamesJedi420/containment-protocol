import { describe, expect, it } from 'vitest'
import { ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE } from '../domain/coerciveContainedPersonProtocolRegistry'
import { INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE } from '../domain/containedPersonIntegratedHealthBundleRegistry'
import {
  buildWelfareDebtAccountingLedgerAuditReport,
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  sanitizeWelfareDebtAccountingRecords,
  summarizeWelfareDebtAccountingRecords,
  validateWelfareDebtAccountingRecord,
  WELFARE_DEBT_CATEGORIES,
  type WelfareDebtAccountingRecord,
} from '../domain/welfareDebtAccountingRegistry'

function warningOnlyRecord(): WelfareDebtAccountingRecord {
  return {
    id: 'welfare-debt:warning-only-escalated',
    label: 'Escalated welfare debt without mitigation path',
    subjectRef: 'subject:warning-only',
    debtCategory: 'coerced_medication',
    severityBand: 'critical',
    mitigationState: 'escalated',
    sourceProcedureLabel: 'forced sedation stabilization cycle',
    reviewOwnerLabel: 'psychiatric review panel',
    containmentBenefitScore: 0.64,
  }
}

describe('welfareDebtAccountingLedgerAudit (SPE-1888 slice 4)', () => {
  it('returns zeroed summary for empty map without throw', () => {
    const summary = summarizeWelfareDebtAccountingRecords({})
    const report = buildWelfareDebtAccountingLedgerAuditReport({ records: {} })

    expect(summary.totalRecords).toBe(0)
    expect(summary.unresolvedCount).toBe(0)
    expect(summary.escalatedCount).toBe(0)
    expect(summary.mitigatedCount).toBe(0)
    expect(summary.categoryBreakdown).toHaveLength(WELFARE_DEBT_CATEGORIES.length)
    expect(summary.categoryBreakdown.every((entry) => entry.count === 0)).toBe(true)

    expect(report.isEmpty).toBe(true)
    expect(report.lines[0]).toBe('Welfare-debt ledger audit: welfare-debt-ledger')
    expect(report.lines[2]).toContain('Records: 0')
  })

  it('counts unresolved, escalated, mitigated, and terminal states from hydrated records', () => {
    const mitigatedRecord: WelfareDebtAccountingRecord = {
      id: 'welfare-debt:mitigated-entry',
      label: 'Mitigated welfare debt entry',
      subjectRef: 'subject:mitigated',
      debtCategory: 'privilege_deprivation',
      severityBand: 'moderate',
      mitigationState: 'mitigated',
      sourceProcedureLabel: 'privilege suspension cycle',
      reviewOwnerLabel: 'ethics review board',
      mitigationPathLabel: 'restored visitation rights',
      containmentBenefitScore: 0.42,
    }

    const waivedRecord: WelfareDebtAccountingRecord = {
      id: 'welfare-debt:waived-entry',
      label: 'Waived welfare debt entry',
      subjectRef: 'subject:waived',
      debtCategory: 'coerced_participation',
      severityBand: 'low',
      mitigationState: 'waived',
      sourceProcedureLabel: 'coerced interview participation',
      reviewOwnerLabel: 'ethics review board',
      mitigationPathLabel: 'institutional waiver',
      containmentBenefitScore: 0.88,
    }

    const deniedRecord: WelfareDebtAccountingRecord = {
      id: 'welfare-debt:denied-entry',
      label: 'Denied welfare debt entry',
      subjectRef: 'subject:denied',
      debtCategory: 'coercive_interview',
      severityBand: 'moderate',
      mitigationState: 'denied',
      sourceProcedureLabel: 'coercive interview cycle',
      reviewOwnerLabel: 'ethics review board',
      mitigationPathLabel: 'institutional denial',
      containmentBenefitScore: 0.91,
    }

    const acknowledgedRecord: WelfareDebtAccountingRecord = {
      ...COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      id: 'welfare-debt:acknowledged-entry',
      mitigationState: 'acknowledged',
    }

    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
      [mitigatedRecord.id]: mitigatedRecord,
      [waivedRecord.id]: waivedRecord,
      [deniedRecord.id]: deniedRecord,
      [acknowledgedRecord.id]: acknowledgedRecord,
    }

    const summary = summarizeWelfareDebtAccountingRecords(records)

    expect(summary.totalRecords).toBe(6)
    expect(summary.unresolvedCount).toBe(1)
    expect(summary.escalatedCount).toBe(1)
    expect(summary.mitigatedCount).toBe(1)
    expect(summary.acknowledgedCount).toBe(1)
    expect(summary.waivedCount).toBe(1)
    expect(summary.deniedCount).toBe(1)
  })

  it('includes warning-only hydrated records in warningOnlyCount', () => {
    const warningRecord = warningOnlyRecord()
    expect(validateWelfareDebtAccountingRecord(warningRecord).valid).toBe(true)

    const summary = summarizeWelfareDebtAccountingRecords({
      [warningRecord.id]: warningRecord,
    })

    expect(summary.totalRecords).toBe(1)
    expect(summary.escalatedCount).toBe(1)
    expect(summary.warningOnlyCount).toBe(1)
  })

  it('emits category breakdown in canonical category order', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    }

    const summary = summarizeWelfareDebtAccountingRecords(records)

    expect(summary.categoryBreakdown.map((entry) => entry.category)).toEqual([
      ...WELFARE_DEBT_CATEGORIES,
    ])
    expect(
      summary.categoryBreakdown.find((entry) => entry.category === 'harmful_restraint')?.count
    ).toBe(1)
    expect(
      summary.categoryBreakdown.find((entry) => entry.category === 'coerced_medication')?.count
    ).toBe(1)
  })

  it('does not re-surface invalid hydrate drops in audit summary', () => {
    const hydrated = sanitizeWelfareDebtAccountingRecords({
      valid: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      invalid: {
        id: '',
        label: 'Dropped invalid entry',
        subjectRef: 'subject:invalid',
        debtCategory: 'not_a_category',
        severityBand: 'high',
        mitigationState: 'unresolved',
        sourceProcedureLabel: 'invalid',
        reviewOwnerLabel: 'invalid',
      },
    })

    const summary = summarizeWelfareDebtAccountingRecords(hydrated)

    expect(Object.keys(hydrated)).toEqual([COERCIVE_RESTRAINT_LEDGER_FIXTURE.id])
    expect(summary.totalRecords).toBe(1)
    expect(summary.unresolvedCount).toBe(1)
  })

  it('builds byte-stable audit report lines on repeated calls', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
      [FORCED_SEDATION_CYCLE_FIXTURE.id]: FORCED_SEDATION_CYCLE_FIXTURE,
    }

    const first = buildWelfareDebtAccountingLedgerAuditReport({
      records,
      week: 4,
      auditId: 'weekly-routing',
    })
    const second = buildWelfareDebtAccountingLedgerAuditReport({
      records,
      week: 4,
      auditId: 'weekly-routing',
    })

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.lines[1]).toBe('Week: 4')
    expect(first.lines[3]).toContain('harmful_restraint=1')
    expect(first.lines[3]).toContain('coerced_medication=1')
    expect(first.crossLinkLines).toEqual([])
  })

  it('appends cross-link audit lines when optional registry maps are provided', () => {
    const records = {
      [COERCIVE_RESTRAINT_LEDGER_FIXTURE.id]: COERCIVE_RESTRAINT_LEDGER_FIXTURE,
    }

    const report = buildWelfareDebtAccountingLedgerAuditReport({
      records,
      week: 2,
      integratedHealthBundles: {
        [INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE.id]:
          INTEGRATED_HEALTH_BUNDLE_WITH_FIELD_LINKS_FIXTURE,
      },
      coerciveProtocolRecords: {
        [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]:
          ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      },
    })

    expect(report.crossLinkLines.length).toBe(1)
    expect(report.crossLinkLines[0]).toContain(COERCIVE_RESTRAINT_LEDGER_FIXTURE.id)
    expect(report.crossLinkLines[0]).toContain('integrated-health:subject:contained-person-field-links')
    expect(report.lines.length).toBeGreaterThan(4)
    expect(report.lines.at(-1)).toBe(report.crossLinkLines[0])
  })
})
