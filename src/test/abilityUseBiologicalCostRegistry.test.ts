import { describe, expect, it } from 'vitest'
import {
  VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE,
  VALID_REVIEW_THRESHOLD_BIOLOGICAL_COST_FIXTURE,
  accumulateAbilityUseBiologicalCost,
  projectAbilityUseBiologicalCost,
  validateAbilityUseBiologicalCostRecord,
  type AbilityUseBiologicalCostRecord,
} from '../domain/abilityUseBiologicalCostRegistry'

function baseRecord(
  overrides: Partial<AbilityUseBiologicalCostRecord> = {}
): AbilityUseBiologicalCostRecord {
  return {
    ...VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE,
    id: 'ability-bio-cost:test-base',
    ...overrides,
  }
}

describe('abilityUseBiologicalCostRegistry (SPE-2142 slice 1)', () => {
  it('validates a bounded low-risk record with unique organ-stress refs', () => {
    const result = validateAbilityUseBiologicalCostRecord(VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('validates an elevated multi-use record with granted consent and active monitoring', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      VALID_REVIEW_THRESHOLD_BIOLOGICAL_COST_FIXTURE
    )

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('rejects missing consent when immunodeficiency risk exceeds the review threshold', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      baseRecord({
        id: 'ability-bio-cost:missing-consent',
        immunodeficiencyRisk: 'elevated',
        healthDebtSeverity: 'moderate',
        accumulatedHealthDebtUnits: 12,
        consentState: 'pending',
        monitoringState: 'active',
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some((issue) => issue.code === 'consent_required_above_review_threshold')
    ).toBe(true)
  })

  it('rejects missing monitoring when use count exceeds the review threshold', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      baseRecord({
        id: 'ability-bio-cost:missing-monitoring',
        useCount: 4,
        immunodeficiencyRisk: 'elevated',
        healthDebtSeverity: 'moderate',
        accumulatedHealthDebtUnits: 15,
        consentState: 'granted',
        monitoringState: 'overdue',
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some((issue) => issue.code === 'monitoring_required_above_review_threshold')
    ).toBe(true)
  })

  it('rejects empty organ-stress references', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      baseRecord({
        id: 'ability-bio-cost:empty-organs',
        organStressRefs: [],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'empty_organ_stress_refs')).toBe(true)
  })

  it('rejects duplicate organ-stress references', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      baseRecord({
        id: 'ability-bio-cost:dup-organs',
        organStressRefs: ['organ-stress:nervous', 'organ-stress:nervous'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'duplicate_organ_stress_ref')).toBe(true)
  })

  it('rejects severity below immunodeficiency risk', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      baseRecord({
        id: 'ability-bio-cost:severity-mismatch',
        immunodeficiencyRisk: 'high',
        healthDebtSeverity: 'low',
        accumulatedHealthDebtUnits: 5,
        consentState: 'granted',
        monitoringState: 'active',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'severity_inconsistent_with_risk')).toBe(
      true
    )
  })

  it('keeps immediate activation cost distinguishable from accumulated health debt', () => {
    const projection = projectAbilityUseBiologicalCost(
      VALID_REVIEW_THRESHOLD_BIOLOGICAL_COST_FIXTURE
    )

    expect(projection.immediateActivationCostKind).toBe('vitality_sacrifice')
    expect(projection.immediateActivationCostUnits).toBe(12)
    expect(projection.accumulatedHealthDebtUnits).toBe(28)
    expect(projection.hasAccumulatedBiologicalDebt).toBe(true)
    expect(projection.immediateActivationCostUnits).not.toBe(projection.accumulatedHealthDebtUnits)
  })

  it('accumulates repeated use into higher debt without collapsing activation cost', () => {
    const next = accumulateAbilityUseBiologicalCost({
      previous: VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE,
      additionalUses: 2,
      immediateActivationCostKind: 'blood_loss',
      immediateActivationCostUnits: 7,
      additionalHealthDebtUnits: 20,
      organStressRefsToAdd: ['organ-stress:hepatic'],
      immunodeficiencyRisk: 'elevated',
      consentState: 'granted',
      monitoringState: 'active',
    })

    expect(next.useCount).toBe(3)
    expect(next.immediateActivationCostKind).toBe('blood_loss')
    expect(next.immediateActivationCostUnits).toBe(7)
    expect(next.accumulatedHealthDebtUnits).toBe(23)
    expect(next.organStressRefs).toEqual([
      'organ-stress:hematologic',
      'organ-stress:hepatic',
      'organ-stress:nervous',
    ])
    expect(next.healthDebtSeverity).toBe('moderate')

    const validation = validateAbilityUseBiologicalCostRecord(next)
    expect(validation.valid).toBe(true)
  })

  it('projects stable downstream fields for consumers', () => {
    const first = projectAbilityUseBiologicalCost(VALID_REVIEW_THRESHOLD_BIOLOGICAL_COST_FIXTURE)
    const second = projectAbilityUseBiologicalCost(VALID_REVIEW_THRESHOLD_BIOLOGICAL_COST_FIXTURE)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.requiresReview).toBe(true)
    expect(first.organStressRefs).toEqual(['organ-stress:endocrine', 'organ-stress:immune'])
    expect(first.consentObligationRef).toBe('consent:ability-use-beta')
    expect(first.monitoringObligationRef).toBe('monitor:ability-bio-beta')
    expect(first.readinessRef).toBe('readiness:operative-beta')
  })

  it('rejects franchise tokens in labels', () => {
    const result = validateAbilityUseBiologicalCostRecord(
      baseRecord({
        id: 'ability-bio-cost:franchise',
        label: 'SCP anomalous ability biological cost',
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('returns byte-stable validation on repeated calls', () => {
    const first = validateAbilityUseBiologicalCostRecord(VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE)
    const second = validateAbilityUseBiologicalCostRecord(VALID_LOW_RISK_BIOLOGICAL_COST_FIXTURE)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
