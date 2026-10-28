import { describe, expect, it } from 'vitest'
import {
  createProcessSafetyCoverageRule,
  evaluateProcessSafetyCoverage,
} from '../domain/processSafetyCoverage'

describe('SPE-870 threshold-triggered process safety coverage', () => {
  const classRule = createProcessSafetyCoverageRule({
    ruleId: 'rule-biohazard-class',
    label: 'Named biohazard class coverage',
    hazardClasses: ['biohazard-tier-3'],
  })

  const quantityRule = createProcessSafetyCoverageRule({
    ruleId: 'rule-bulk-quantity',
    label: 'Bulk inventory threshold',
    hazardClasses: [],
    quantityThreshold: 100,
  })

  it('covers a process because it matches a named hazard class', () => {
    const state = evaluateProcessSafetyCoverage({
      process: {
        processId: 'proc-culture-bay',
        hazardClass: 'biohazard-tier-3',
        quantity: 5,
      },
      rules: [classRule, quantityRule],
    })
    expect(state.covered).toBe(true)
    expect(state.triggerBasis).toBe('hazard_class')
    expect(state.matchedRuleIds).toEqual(['rule-biohazard-class'])
    expect(state.reasons).toContain('rule-biohazard-class:hazard-class:biohazard-tier-3')
  })

  it('covers a process because quantity alone crosses a broad threshold', () => {
    const state = evaluateProcessSafetyCoverage({
      process: {
        processId: 'proc-solvent-store',
        hazardClass: 'industrial-solvent',
        quantity: 120,
      },
      rules: [classRule, quantityRule],
    })
    expect(state.covered).toBe(true)
    expect(state.triggerBasis).toBe('quantity_threshold')
    expect(state.matchedRuleIds).toEqual(['rule-bulk-quantity'])
    expect(state.quantityThresholdProximity).toBe(0)
  })

  it('changes coverage when inventory or classification changes', () => {
    const before = evaluateProcessSafetyCoverage({
      process: {
        processId: 'proc-solvent-store',
        hazardClass: 'industrial-solvent',
        quantity: 40,
      },
      rules: [classRule, quantityRule],
    })
    expect(before.covered).toBe(false)
    expect(before.triggerBasis).toBe('none')
    expect(before.quantityThresholdProximity).toBe(60)

    const afterQty = evaluateProcessSafetyCoverage({
      process: {
        processId: 'proc-solvent-store',
        hazardClass: 'industrial-solvent',
        quantity: 100,
      },
      rules: [classRule, quantityRule],
    })
    expect(afterQty.covered).toBe(true)
    expect(afterQty.triggerBasis).toBe('quantity_threshold')

    const afterClass = evaluateProcessSafetyCoverage({
      process: {
        processId: 'proc-solvent-store',
        hazardClass: 'biohazard-tier-3',
        quantity: 40,
      },
      rules: [classRule, quantityRule],
    })
    expect(afterClass.covered).toBe(true)
    expect(afterClass.triggerBasis).toBe('hazard_class')

    expect(
      evaluateProcessSafetyCoverage({
        process: {
          processId: 'proc-solvent-store',
          hazardClass: 'industrial-solvent',
          quantity: 40,
        },
        rules: [classRule, quantityRule],
      }),
    ).toEqual(before)
  })

  it('rejects empty rules and reports both bases when class and quantity match', () => {
    expect(() =>
      createProcessSafetyCoverageRule({
        ruleId: 'rule-empty',
        label: 'Empty',
        hazardClasses: [],
      }),
    ).toThrow(/requires hazardClasses and\/or quantityThreshold/)

    const both = evaluateProcessSafetyCoverage({
      process: {
        processId: 'proc-mixed',
        hazardClass: 'biohazard-tier-3',
        quantity: 150,
      },
      rules: [classRule, quantityRule],
    })
    expect(both.triggerBasis).toBe('both')
    expect(both.matchedRuleIds).toEqual(['rule-biohazard-class', 'rule-bulk-quantity'])
  })
})
