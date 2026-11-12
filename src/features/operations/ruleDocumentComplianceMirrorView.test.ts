import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
  VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
  type RuleDocumentComplianceRecord,
} from '../../domain/ruleDocumentComplianceContainmentRegistry'
import {
  formatRuleDocumentComplianceEnumLabel,
  getRuleDocumentComplianceMirrorView,
} from './ruleDocumentComplianceMirrorView'

function compelledWithoutAuditorFixture(): RuleDocumentComplianceRecord {
  return {
    id: 'rule-document-compliance:compelled-no-auditor',
    label: 'Compelled binding without auditor',
    documentRef: 'document:compelled-conduct-code',
    bindingStrength: 'compelled',
    complianceState: 'unknown',
    physicalCopyRequired: false,
  }
}

describe('ruleDocumentComplianceMirrorView (SPE-2123 slice 4)', () => {
  it('returns empty mirror when ruleDocumentComplianceRecords map is empty', () => {
    const game = createStartingState()

    expect(game.ruleDocumentComplianceRecords).toEqual({})

    const view = getRuleDocumentComplianceMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors persisted fields and compliance decay projection at current week', () => {
    const game = createStartingState()
    game.week = 12
    game.ruleDocumentComplianceRecords = {
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      [DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id]: DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
    }

    const view = getRuleDocumentComplianceMirrorView(game)
    const voluntary = view.records.find(
      (record) => record.id === VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id
    )
    const breach = view.records.find(
      (record) => record.id === DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id
    )

    expect(view.isEmpty).toBe(false)
    expect(view.summary.totalRecords).toBe(2)
    expect(view.summary.breachCount).toBe(1)
    expect(view.summary.criticalBandCount).toBe(1)
    expect(view.summary.week).toBe(12)
    expect(voluntary?.complianceStateLabel).toBe('Compliant')
    expect(voluntary?.complianceDecayBandLabel).toBe('Stable')
    expect(voluntary?.revisionAuditSymptoms).toHaveLength(1)
    expect(breach?.complianceStateLabel).toBe('Breach')
    expect(breach?.complianceDecayBandLabel).toBe('Critical')
    expect(breach?.driftProbabilityLabel).toBe('1.000')
    expect(breach?.breachConsequenceLabel).toBe('Escalate Review')
    expect(breach?.revisionAuditSymptoms.length).toBeGreaterThan(0)
  })

  it('surfaces validation warnings for warnings-only records', () => {
    const game = createStartingState()
    const fixture = compelledWithoutAuditorFixture()
    game.ruleDocumentComplianceRecords = {
      [fixture.id]: fixture,
    }

    const view = getRuleDocumentComplianceMirrorView(game)
    const record = view.records[0]

    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.validationWarningLabels[0]).toContain('compelled binding')
  })

  it('renders redacted projection fields as legibility gaps', () => {
    const game = createStartingState()
    game.ruleDocumentComplianceRecords = {
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: {
        ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
        redactedFields: ['bindingStrength', 'complianceState', 'confidence'],
      },
    }

    const view = getRuleDocumentComplianceMirrorView(game)
    const record = view.records[0]

    expect(record?.driftProbabilityLabel).toBe('—')
    expect(record?.complianceDecayBandLabel).toBe('—')
    expect(record?.confidenceLabel).toBe('—')
    expect(record?.redacted).toBe(true)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatRuleDocumentComplianceEnumLabel('escalate_review')).toBe('Escalate Review')
    expect(formatRuleDocumentComplianceEnumLabel('physical_copy_required')).toBe(
      'Physical Copy Required'
    )
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.ruleDocumentComplianceRecords = {
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      [DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id]: DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
    }

    const first = JSON.stringify(getRuleDocumentComplianceMirrorView(game))
    const second = JSON.stringify(getRuleDocumentComplianceMirrorView(game))

    expect(first).toBe(second)
  })
})
