import { describe, expect, it } from 'vitest'
import {
  COERCIVE_RESTRAINT_LEDGER_FIXTURE,
  FORCED_SEDATION_CYCLE_FIXTURE,
  advanceWelfareDebtAccountingRecordForWeek,
  applyWeeklyWelfareDebtAccountingTick,
  isWelfareDebtReviewDueWeek,
  resolveNextWelfareDebtSeverityBand,
  type WelfareDebtAccountingRecord,
} from '../domain/welfareDebtAccountingRegistry'

function baseRecord(
  overrides: Partial<WelfareDebtAccountingRecord> = {}
): WelfareDebtAccountingRecord {
  return {
    id: 'welfare-debt:weekly-orchestration-test',
    label: 'Weekly orchestration test record',
    subjectRef: 'subject:weekly-orchestration-test',
    debtCategory: 'harmful_restraint',
    severityBand: 'moderate',
    mitigationState: 'unresolved',
    sourceProcedureLabel: 'extended mechanical restraint cycle',
    reviewOwnerLabel: 'ethics review board',
    containmentBenefitScore: 0.3,
    ...overrides,
  }
}

describe('welfareDebtAccountingWeeklyOrchestration (SPE-1888 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyWelfareDebtAccountingTick({}, 12)).toEqual({})
    expect(applyWeeklyWelfareDebtAccountingTick(undefined, 12)).toEqual({})
  })

  it('resolves review due weeks and severity ladder steps', () => {
    expect(isWelfareDebtReviewDueWeek(1, 'harmful_restraint')).toBe(true)
    expect(isWelfareDebtReviewDueWeek(3, 'harmful_restraint')).toBe(true)
    expect(isWelfareDebtReviewDueWeek(1, 'forced_isolation')).toBe(false)
    expect(isWelfareDebtReviewDueWeek(2, 'forced_isolation')).toBe(true)
    expect(isWelfareDebtReviewDueWeek(3, 'coerced_participation')).toBe(false)
    expect(isWelfareDebtReviewDueWeek(4, 'coerced_participation')).toBe(true)
    expect(resolveNextWelfareDebtSeverityBand('moderate')).toBe('high')
    expect(resolveNextWelfareDebtSeverityBand('critical')).toBeUndefined()
  })

  it('acknowledges unresolved debt on high-pressure review due weeks', () => {
    const record = baseRecord()
    const advanced = advanceWelfareDebtAccountingRecordForWeek(record, 1)

    expect(advanced).not.toBe(record)
    expect(advanced.mitigationState).toBe('escalated')
    expect(advanced.severityBand).toBe('high')
  })

  it('acknowledges restraint ledger fixture without escalation when containment benefit is high', () => {
    const advanced = advanceWelfareDebtAccountingRecordForWeek(COERCIVE_RESTRAINT_LEDGER_FIXTURE, 1)

    expect(advanced).not.toBe(COERCIVE_RESTRAINT_LEDGER_FIXTURE)
    expect(advanced.mitigationState).toBe('acknowledged')
    expect(advanced.severityBand).toBe('high')
    expect(advanced.containmentBenefitScore).toBe(0.71)
  })

  it('leaves medium-pressure records unchanged on non-due weeks', () => {
    const record = baseRecord({
      debtCategory: 'forced_isolation',
      mitigationState: 'unresolved',
    })

    const advanced = advanceWelfareDebtAccountingRecordForWeek(record, 1)

    expect(advanced).toBe(record)
  })

  it('is idempotent when re-applied after advance for the same week', () => {
    const record = baseRecord()
    const once = advanceWelfareDebtAccountingRecordForWeek(record, 1)
    const twice = advanceWelfareDebtAccountingRecordForWeek(once, 1)

    expect(twice).toBe(once)
    expect(twice.mitigationState).toBe('escalated')
  })

  it('preserves terminal mitigation states without mutation', () => {
    const mitigated = baseRecord({ mitigationState: 'mitigated' })
    const waived = baseRecord({ mitigationState: 'waived' })
    const denied = baseRecord({ mitigationState: 'denied' })

    expect(advanceWelfareDebtAccountingRecordForWeek(mitigated, 10)).toBe(mitigated)
    expect(advanceWelfareDebtAccountingRecordForWeek(waived, 10)).toBe(waived)
    expect(advanceWelfareDebtAccountingRecordForWeek(denied, 10)).toBe(denied)
  })

  it('preserves synced escalated fixtures without mutation', () => {
    const advanced = advanceWelfareDebtAccountingRecordForWeek(FORCED_SEDATION_CYCLE_FIXTURE, 12)

    expect(advanced).toBe(FORCED_SEDATION_CYCLE_FIXTURE)
    expect(advanced.mitigationState).toBe('escalated')
    expect(advanced.severityBand).toBe('critical')
  })

  it('does not mutate invalid post-tick records', () => {
    const record = baseRecord({
      reviewOwnerLabel: '',
    })

    const advanced = advanceWelfareDebtAccountingRecordForWeek(record, 1)

    expect(advanced).toBe(record)
  })

  it('preserves warning-only validation records after tick', () => {
    const warningOnly = {
      ...FORCED_SEDATION_CYCLE_FIXTURE,
      id: 'welfare-debt:warning-only-escalated',
      mitigationPathLabel: undefined,
    }

    const advanced = advanceWelfareDebtAccountingRecordForWeek(warningOnly, 12)

    expect(advanced).toBe(warningOnly)
  })

  it('applies tick in stable id order without mutating unchanged records', () => {
    const active = baseRecord({ id: 'welfare-debt:weekly-active' })
    const terminal = FORCED_SEDATION_CYCLE_FIXTURE
    const map = {
      [terminal.id]: terminal,
      [active.id]: active,
    }

    const next = applyWeeklyWelfareDebtAccountingTick(map, 6)

    expect(next[active.id]?.mitigationState).toBe('escalated')
    expect(next[terminal.id]).toBe(terminal)
  })
})
