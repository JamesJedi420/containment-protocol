import { describe, expect, it } from 'vitest'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  classifyCoerciveProtocolHandlingPosture,
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
  validateCoerciveProtocolRecord,
} from '../domain/coerciveContainedPersonProtocolRegistry'

describe('coerciveContainedPersonProtocolRegistry (SPE-1882 slice 1)', () => {
  it('validates emergency sedation protocol fixture without errors', () => {
    const result = validateCoerciveProtocolRecord(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    expect(result.valid).toBe(true)
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('classifies handling posture for emergency, compelled, and abusive modes', () => {
    expect(classifyCoerciveProtocolHandlingPosture(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)).toBe(
      'emergency'
    )

    const compelled = {
      ...EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      id: 'coercive-protocol:compelled-restraint',
      handlingMode: 'compelled' as const,
      authorizationSource: 'facility_policy' as const,
    }
    expect(classifyCoerciveProtocolHandlingPosture(compelled)).toBe('compelled')

    expect(
      classifyCoerciveProtocolHandlingPosture(ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE)
    ).toBe('abusive')
  })

  it('projects containment stability gain alongside personhood and trust harm', () => {
    const tradeoff = projectContainmentCareTradeoff(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)

    expect(tradeoff.containmentStabilityGain).toBeGreaterThan(0.5)
    expect(tradeoff.personhoodHarmRisk).toBeGreaterThan(0.4)
    expect(tradeoff.trustDamageRisk).toBeGreaterThan(0.3)
    expect(tradeoff.legitimacyRisk).toBeGreaterThan(0.2)
    expect(tradeoff.stableContainmentDominatesCare).toBe(true)
    expect(tradeoff.welfareDebtImpactLabel).toContain('coerced medication')
  })

  it('flags routine force and generalized subject fit as contradiction risks', () => {
    const review = projectCoerciveProtocolRiskReview(ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE)

    expect(review.coercionRiskScore).toBeGreaterThan(0.5)
    expect(review.contradictionRiskFlags).toContain('routine_force_authorization')
    expect(review.contradictionRiskFlags).toContain('generalized_procedure_without_subject_fit')
    expect(review.blocksProcedure).toBe(false)
  })

  it('flags surveillance isolation burden without blocking abusive protocol review', () => {
    const review = projectCoerciveProtocolRiskReview(ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE)

    expect(review.contradictionRiskFlags).toContain('surveillance_isolation_burden')
    expect(review.handlingPosture).toBe('abusive')
    expect(review.blocksProcedure).toBe(false)
  })

  it('links medication and custody owner refs without duplicating regimen fields', () => {
    const record = EMERGENCY_SEDATION_PROTOCOL_FIXTURE

    expect(record.medicationRegimenRef).toBe('medication-regimen:coercive-sedative-beta')
    expect(record.custodyStatusRef).toBe('custody-status:former-hostile-hold')
    expect(record.procedureRef).toBe('coercive-procedure:forced-sedation-stabilization')
    expect(record).not.toHaveProperty('deliveryVector')
    expect(record).not.toHaveProperty('dosageCadenceLabel')
  })

  it('returns warning for generalized subject fit without validation artifact', () => {
    const result = validateCoerciveProtocolRecord(ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE)

    expect(result.valid).toBe(true)
    expect(
      result.issues.some((issue) => issue.code === 'generalized_subject_fit_without_validation')
    ).toBe(true)
  })

  it('rejects franchise tokens in record label', () => {
    const invalid = {
      ...EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      id: 'coercive-protocol:franchise-label',
      label: 'SCP division sedation protocol',
    }

    const result = validateCoerciveProtocolRecord(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('returns byte-stable validation on repeated calls', () => {
    const first = validateCoerciveProtocolRecord(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    const second = validateCoerciveProtocolRecord(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
