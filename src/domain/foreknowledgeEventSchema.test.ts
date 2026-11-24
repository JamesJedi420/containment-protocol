import { describe, expect, it } from 'vitest'
import {
  FOREKNOWLEDGE_EVENT_SCHEMA_OWNER,
  FOREKNOWLEDGE_EVENT_SCHEMA_VERSION,
  SAMPLE_FOREKNOWLEDGE_EVENT,
  isCurrentlyActionable,
  parseForeknowledgeEventRecord,
  projectResponsibilityPressure,
} from './foreknowledgeEventSchema'

describe('SPE-1125 foreknowledge event schema', () => {
  it('exports owner and schema version', () => {
    expect(FOREKNOWLEDGE_EVENT_SCHEMA_OWNER).toBe('SPE-1125')
    expect(FOREKNOWLEDGE_EVENT_SCHEMA_VERSION).toBe('spe-1125.v1')
  })

  it('authors and parses a sample conditional forecast event', () => {
    const parsed = parseForeknowledgeEventRecord(SAMPLE_FOREKNOWLEDGE_EVENT)
    expect(parsed).not.toBeNull()
    expect(parsed).toEqual(SAMPLE_FOREKNOWLEDGE_EVENT)
    expect(parsed?.truthState).toBe('conditional_forecast')
    expect(parsed?.fixity).toBe('conditional')
  })

  it('rejects malformed records fail-closed', () => {
    expect(parseForeknowledgeEventRecord({ ...SAMPLE_FOREKNOWLEDGE_EVENT, id: '__proto__' })).toBeNull()
    expect(parseForeknowledgeEventRecord({ ...SAMPLE_FOREKNOWLEDGE_EVENT, confidence: 101 })).toBeNull()
    expect(parseForeknowledgeEventRecord({ ...SAMPLE_FOREKNOWLEDGE_EVENT, truthState: 'absolute' })).toBeNull()
    expect(
      parseForeknowledgeEventRecord({
        ...SAMPLE_FOREKNOWLEDGE_EVENT,
        horizon: { startWeek: 20, endWeek: 10 },
      }),
    ).toBeNull()
  })

  it('varies responsibility pressure by observer identity and disclosure posture', () => {
    const baseline = projectResponsibilityPressure(SAMPLE_FOREKNOWLEDGE_EVENT, 'field_lead:ops-3', 14)
    const mismatched = projectResponsibilityPressure(SAMPLE_FOREKNOWLEDGE_EVENT, 'analyst:other', 14)
    expect(mismatched.effectivePressure).toBeLessThan(baseline.effectivePressure)
    expect(mismatched.preservesUncertainty).toBe(true)

    const restricted = parseForeknowledgeEventRecord({
      ...SAMPLE_FOREKNOWLEDGE_EVENT,
      disclosurePosture: 'restricted',
    })!
    const restrictedProjection = projectResponsibilityPressure(restricted, 'field_lead:ops-3', 14)
    expect(restrictedProjection.effectivePressure).toBeGreaterThan(baseline.effectivePressure)
  })

  it('elevates pressure for perceived fixed fate without locking outcomes', () => {
    const fixed = parseForeknowledgeEventRecord({
      ...SAMPLE_FOREKNOWLEDGE_EVENT,
      fixity: 'fixed',
      truthState: 'fixed_fate',
    })!
    const projection = projectResponsibilityPressure(fixed, 'field_lead:ops-3', 14)
    expect(projection.effectivePressure).toBeGreaterThan(SAMPLE_FOREKNOWLEDGE_EVENT.responsibilityPressure)
    expect(projection.reason).toContain('fixed fate')
    expect(projection.preservesUncertainty).toBe(true)
  })

  it('marks forecast non-actionable when horizon expires', () => {
    expect(isCurrentlyActionable(SAMPLE_FOREKNOWLEDGE_EVENT, 14)).toBe(true)
    expect(isCurrentlyActionable(SAMPLE_FOREKNOWLEDGE_EVENT, 17)).toBe(false)

    const expiredProjection = projectResponsibilityPressure(SAMPLE_FOREKNOWLEDGE_EVENT, 'field_lead:ops-3', 17)
    expect(expiredProjection.effectivePressure).toBeLessThan(SAMPLE_FOREKNOWLEDGE_EVENT.responsibilityPressure)
    expect(expiredProjection.reason).toContain('horizon expired')
  })

  it('reduces pressure and preserves provenance when explicitly non-actionable', () => {
    const contradicted = parseForeknowledgeEventRecord({
      ...SAMPLE_FOREKNOWLEDGE_EVENT,
      nonActionableReason: 'contradicted',
    })!
    expect(isCurrentlyActionable(contradicted)).toBe(false)
    const projection = projectResponsibilityPressure(contradicted)
    expect(projection.effectivePressure).toBeLessThan(SAMPLE_FOREKNOWLEDGE_EVENT.responsibilityPressure)
    expect(projection.reason).toContain('contradicted')
    expect(projection.preservesUncertainty).toBe(true)
  })
})
