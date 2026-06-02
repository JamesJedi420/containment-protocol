import { describe, expect, it } from 'vitest'
import {
  BINDING_STRENGTHS,
  BREACH_CONSEQUENCES,
  COMPLIANCE_DECAY_BANDS,
  COMPLIANCE_STATES,
  DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
  VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
  projectComplianceDecay,
  validateRuleDocumentComplianceRecord,
  type RuleDocumentComplianceRecord,
} from '../domain/ruleDocumentComplianceContainmentRegistry'

function baseRecord(
  overrides: Partial<RuleDocumentComplianceRecord> = {}
): RuleDocumentComplianceRecord {
  return {
    id: 'rule-document-compliance:test-base',
    label: 'Test rule document compliance',
    documentRef: 'document:test-conduct-code',
    bindingStrength: 'contractual',
    complianceState: 'compliant',
    physicalCopyRequired: false,
    ...overrides,
  }
}

describe('ruleDocumentComplianceContainmentRegistry (SPE-2123 slice 1)', () => {
  it('validates voluntary compliant fixture with physicalCopyRequired', () => {
    const result = validateRuleDocumentComplianceRecord(
      VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE
    )

    expect(result.valid).toBe(true)
    expect(VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.bindingStrength).toBe('voluntary')
    expect(VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.complianceState).toBe('compliant')
    expect(VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.physicalCopyRequired).toBe(true)
  })

  it('validates drifting-to-breach fixture with escalate_review consequence', () => {
    const result = validateRuleDocumentComplianceRecord(
      DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE
    )

    expect(result.valid).toBe(true)
    expect(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.complianceState).toBe('breach')
    expect(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.breachConsequence).toBe('escalate_review')
  })

  it('projects low drift for voluntary compliant physical-copy binding', () => {
    const projection = projectComplianceDecay(VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE, {
      currentWeek: 2,
    })

    expect(projection.driftProbabilityPerWeek).not.toBeNull()
    expect(projection.driftProbabilityPerWeek!).toBeLessThan(0.2)
    expect(projection.complianceDecayBand).toBe('stable')
    expect(projection.revisionAuditSymptoms).toHaveLength(1)
  })

  it('projects critical decay band for breach state', () => {
    const projection = projectComplianceDecay(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE)

    expect(projection.driftProbabilityPerWeek).toBe(1)
    expect(projection.complianceDecayBand).toBe('critical')
    expect(projection.revisionAuditSymptoms.length).toBeGreaterThan(0)
  })

  it('errors when breach state has no breachConsequence', () => {
    const result = validateRuleDocumentComplianceRecord(
      baseRecord({
        complianceState: 'breach',
        breachConsequence: undefined,
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some((issue) => issue.code === 'breach_without_breach_consequence')
    ).toBe(true)
  })

  it('warns when compelled binding has no auditorAssigneeRefs', () => {
    const result = validateRuleDocumentComplianceRecord(
      baseRecord({
        bindingStrength: 'compelled',
        auditorAssigneeRefs: undefined,
      })
    )

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'compelled_binding_without_auditor')
    ).toBe(true)
  })

  it('errors when documentRef is missing', () => {
    const result = validateRuleDocumentComplianceRecord(
      baseRecord({
        documentRef: '   ',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'missing_document_ref')).toBe(true)
  })

  it('errors on franchise token in record id', () => {
    const result = validateRuleDocumentComplianceRecord(
      baseRecord({
        id: 'rule-document-compliance:foundation-binding',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_id')).toBe(true)
  })

  it('errors on branded object number in revisionHistoryRefs', () => {
    const result = validateRuleDocumentComplianceRecord(
      baseRecord({
        revisionHistoryRefs: ['revision:SCP-049-conduct-v1'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'branded_object_number_in_field')).toBe(
      true
    )
  })

  it('preserves revisionHistoryRefs order in audit symptom projection', () => {
    const projection = projectComplianceDecay({
      ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      revisionHistoryRefs: [
        'revision:procedure-binding-v2',
        'audit:drift-signal-week-14',
        'revision:procedure-binding-v10',
      ],
    })

    expect(projection.revisionAuditSymptoms.map((entry) => entry.ref)).toEqual([
      'revision:procedure-binding-v2',
      'audit:drift-signal-week-14',
      'revision:procedure-binding-v10',
    ])
  })

  it('redacts drift probability when complianceState is unknown to policy', () => {
    const projection = projectComplianceDecay(
      {
        ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
        unknownFields: ['complianceState'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.driftProbabilityPerWeek).toBeNull()
    expect(projection.complianceDecayBand).toBeNull()
    expect(projection.redacted).toBe(true)
  })

  it('redacts revision audit symptoms when policy requests unknown redaction', () => {
    const projection = projectComplianceDecay(
      {
        ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
        unknownFields: ['revisionHistoryRefs'],
      },
      {
        redactUnknown: true,
      }
    )

    expect(projection.revisionAuditSymptoms).toHaveLength(0)
    expect(projection.redacted).toBe(true)
  })

  it('suppresses audit gap hints when hidden conflict labels are suppressed', () => {
    const projection = projectComplianceDecay(VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE, {
      suppressHiddenConflictLabels: true,
    })

    expect(projection.revisionAuditSymptoms.every((entry) => entry.auditGapHint === null)).toBe(
      true
    )
  })

  it('returns byte-stable validation results on repeated calls', () => {
    const first = validateRuleDocumentComplianceRecord(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE)
    const second = validateRuleDocumentComplianceRecord(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE)

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('exports stable union catalogs', () => {
    expect(BINDING_STRENGTHS).toEqual(['voluntary', 'contractual', 'compelled'])
    expect(COMPLIANCE_STATES).toEqual(['compliant', 'drifting', 'breach', 'unknown'])
    expect(BREACH_CONSEQUENCES).toEqual(['recontain', 'escalate_review', 'terminate_protocol'])
    expect(COMPLIANCE_DECAY_BANDS).toEqual(['stable', 'elevated', 'critical'])
  })
})
