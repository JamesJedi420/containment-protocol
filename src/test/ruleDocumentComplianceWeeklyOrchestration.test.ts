import { describe, expect, it } from 'vitest'
import {
  VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
  DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
  projectComplianceDecay,
  type RuleDocumentComplianceRecord,
} from '../domain/ruleDocumentComplianceContainmentRegistry'
import {
  advanceRuleDocumentComplianceRecordForWeek,
  applyWeeklyRuleDocumentComplianceTick,
  resolveTargetComplianceStateFromDecayBand,
  resolveTargetComplianceStateFromProjection,
} from '../domain/ruleDocumentComplianceWeeklyOrchestration'

function baseRecord(
  overrides: Partial<RuleDocumentComplianceRecord> = {}
): RuleDocumentComplianceRecord {
  return {
    id: 'rule-document-compliance:weekly-orchestration-test',
    label: 'Weekly orchestration test record',
    documentRef: 'document:test-conduct-code',
    bindingStrength: 'contractual',
    complianceState: 'compliant',
    physicalCopyRequired: false,
    ...overrides,
  }
}

describe('ruleDocumentComplianceWeeklyOrchestration (SPE-2123 slice 3)', () => {
  it('is a no-op for an empty map without throwing', () => {
    expect(applyWeeklyRuleDocumentComplianceTick({}, 12)).toEqual({})
    expect(applyWeeklyRuleDocumentComplianceTick(undefined, 12)).toEqual({})
  })

  it('resolves elevated-band target as drifting for compliant and unknown states', () => {
    const compliant = baseRecord()
    const unknown = baseRecord({ complianceState: 'unknown' })

    expect(resolveTargetComplianceStateFromDecayBand(compliant, 'elevated')).toBe('drifting')
    expect(resolveTargetComplianceStateFromDecayBand(unknown, 'elevated')).toBe('drifting')
    expect(resolveTargetComplianceStateFromDecayBand(baseRecord({ complianceState: 'drifting' }), 'elevated')).toBeUndefined()
  })

  it('resolves critical-band target as breach when breachConsequence is declared', () => {
    const record = baseRecord({
      breachConsequence: 'escalate_review',
    })

    expect(resolveTargetComplianceStateFromDecayBand(record, 'critical')).toBe('breach')
    expect(resolveTargetComplianceStateFromDecayBand(baseRecord({ complianceState: 'drifting', breachConsequence: 'recontain' }), 'critical')).toBe('breach')
  })

  it('resolves critical-band target as drifting when breachConsequence is absent', () => {
    const record = baseRecord({ complianceState: 'compliant' })

    expect(resolveTargetComplianceStateFromDecayBand(record, 'critical')).toBe('drifting')
    expect(resolveTargetComplianceStateFromDecayBand(baseRecord({ complianceState: 'drifting' }), 'critical')).toBeUndefined()
  })

  it('leaves records unchanged while projected decay band is stable', () => {
    const record = VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE
    const projection = projectComplianceDecay(record, { currentWeek: 2 })

    expect(projection.complianceDecayBand).toBe('stable')
    expect(advanceRuleDocumentComplianceRecordForWeek(record, 2)).toBe(record)
  })

  it('advances compliant records to drifting when projected band is elevated', () => {
    const record = baseRecord({ id: 'rule-document-compliance:elevated-drift' })
    const week = 140
    const projection = projectComplianceDecay(record, { currentWeek: week })

    expect(projection.complianceDecayBand).toBe('elevated')
    expect(resolveTargetComplianceStateFromProjection(record, projection)).toBe('drifting')

    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, week)

    expect(advanced).not.toBe(record)
    expect(advanced.complianceState).toBe('drifting')
    expect(advanced.documentRef).toBe(record.documentRef)
  })

  it('advances to breach when projected band is critical and breachConsequence is declared', () => {
    const record = baseRecord({
      id: 'rule-document-compliance:critical-breach',
      breachConsequence: 'escalate_review',
    })
    const week = 300
    const projection = projectComplianceDecay(record, { currentWeek: week })

    expect(projection.complianceDecayBand).toBe('critical')
    expect(resolveTargetComplianceStateFromProjection(record, projection)).toBe('breach')

    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, week)

    expect(advanced).not.toBe(record)
    expect(advanced.complianceState).toBe('breach')
    expect(advanced.breachConsequence).toBe('escalate_review')
  })

  it('leaves breach records unchanged at drift probability 1', () => {
    const record = DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE
    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, 52)

    expect(advanced).toBe(record)
    expect(advanced.complianceState).toBe('breach')
  })

  it('leaves records with redacted projection inputs unchanged', () => {
    const redactedRecord = {
      ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      redactedFields: ['complianceState'],
    }
    const unknownRecord = {
      ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      id: 'rule-document-compliance:unknown-compliance-state',
      unknownFields: ['complianceState'],
    }

    expect(advanceRuleDocumentComplianceRecordForWeek(redactedRecord, 200)).toBe(redactedRecord)
    expect(advanceRuleDocumentComplianceRecordForWeek(unknownRecord, 200)).toBe(unknownRecord)
    expect(projectComplianceDecay(redactedRecord, { currentWeek: 200 }).complianceDecayBand).toBeNull()
    expect(
      projectComplianceDecay(unknownRecord, { currentWeek: 200, redactUnknown: true })
        .complianceDecayBand
    ).toBeNull()
  })

  it('is idempotent when re-applied after advance for the same week', () => {
    const record = baseRecord({
      id: 'rule-document-compliance:idempotent-elevated',
      breachConsequence: 'terminate_protocol',
    })
    const week = 140
    const once = advanceRuleDocumentComplianceRecordForWeek(record, week)
    const twice = advanceRuleDocumentComplianceRecordForWeek(once, week)

    expect(twice).toBe(once)
    expect(twice.complianceState).toBe('drifting')
  })

  it('reverts invalid post-mutation records to the prior record', () => {
    const record = baseRecord({
      id: 'rule-document-compliance:invalid-breach-candidate',
      complianceState: 'drifting',
      breachConsequence: undefined,
    })
    const week = 300
    const projection = projectComplianceDecay(record, { currentWeek: week })

    expect(projection.complianceDecayBand).toBe('critical')
    expect(resolveTargetComplianceStateFromDecayBand(record, 'critical')).toBeUndefined()

    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, week)

    expect(advanced).toBe(record)
  })

  it('still advances warnings-only records when band warrants transition', () => {
    const record = baseRecord({
      id: 'rule-document-compliance:warning-only-compelled',
      bindingStrength: 'compelled',
      auditorAssigneeRefs: undefined,
    })
    const week = 200
    const projection = projectComplianceDecay(record, { currentWeek: week })

    expect(projection.complianceDecayBand).toBe('elevated')

    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, week)

    expect(advanced).not.toBe(record)
    expect(advanced.complianceState).toBe('drifting')
  })

  it('feeds updated compliance state into projection-only reads after band advance', () => {
    const record = baseRecord({ id: 'rule-document-compliance:projection-read-after-tick' })
    const week = 140
    const before = projectComplianceDecay(record, { currentWeek: week })
    const advanced = advanceRuleDocumentComplianceRecordForWeek(record, week)
    const after = projectComplianceDecay(advanced, { currentWeek: week })

    expect(before.complianceState).toBe('compliant')
    expect(after.complianceState).toBe('drifting')
    expect(after.driftProbabilityPerWeek).not.toBeNull()
    expect(after.driftProbabilityPerWeek!).toBeGreaterThan(before.driftProbabilityPerWeek ?? 0)
  })

  it('applies map tick in stable id order without mutating unrelated records', () => {
    const stableRecord = VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE
    const elevatedRecord = baseRecord({ id: 'rule-document-compliance:z-elevated-drift' })
    const week = 140

    const next = applyWeeklyRuleDocumentComplianceTick(
      {
        [elevatedRecord.id]: elevatedRecord,
        [stableRecord.id]: stableRecord,
      },
      week
    )

    expect(next[stableRecord.id]).toBe(stableRecord)
    expect(next[elevatedRecord.id]?.complianceState).toBe('drifting')
  })
})
