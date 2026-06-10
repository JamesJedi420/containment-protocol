import { describe, expect, it } from 'vitest'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  classifyCoerciveProtocolHandlingPosture,
  evaluateCoerciveProtocolContradictionChecks,
  evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck,
  evaluateRoutineForceAuthorizationContradictionCheck,
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

describe('coerciveContainedPersonProtocolRegistry contradiction checks (SPE-1882 slice 6)', () => {
  it('triggers routine-force sibling aligned with contradiction risk flags', () => {
    const review = projectCoerciveProtocolRiskReview(ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE)
    const check = evaluateRoutineForceAuthorizationContradictionCheck(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )

    expect(review.contradictionRiskFlags).toContain('routine_force_authorization')
    expect(check.triggered).toBe(true)
    expect(check.flag).toBe('routine_force_authorization')
    expect(check.blocksProcedure).toBe(false)
    expect(check.issues.length).toBeGreaterThan(0)
    expect(check.issues.every((issue) => issue.severity === 'warning')).toBe(true)
    expect(check.issues.map((issue) => issue.code)).toEqual([
      'routine_force_low_consent_confidence',
      'routine_force_masks_care_harm',
      'routine_force_operational_default',
      'routine_force_undocumented_refusal_override',
    ])
  })

  it('flags voluntary handling contradictions when routine force is the default', () => {
    const voluntaryRoutineForce = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      id: 'coercive-protocol:voluntary-routine-force',
      handlingMode: 'voluntary' as const,
    }
    const check = evaluateRoutineForceAuthorizationContradictionCheck(voluntaryRoutineForce)

    expect(check.triggered).toBe(true)
    expect(
      check.issues.some((issue) => issue.code === 'routine_force_contradicts_voluntary_handling')
    ).toBe(true)
  })

  it('returns non-triggered no-op for proportional force policy', () => {
    const check = evaluateRoutineForceAuthorizationContradictionCheck(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE
    )

    expect(check.triggered).toBe(false)
    expect(check.blocksProcedure).toBe(false)
    expect(check.issues).toEqual([])
  })

  it('propagates redacted and unknown metadata into sibling output', () => {
    const redacted = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      redactedFields: ['forcePolicy'],
      unknownFields: ['refusalHandling'],
    }
    const check = evaluateRoutineForceAuthorizationContradictionCheck(redacted)

    expect(check.triggered).toBe(true)
    expect(check.redacted).toBe(true)
    expect(check.unknownFields).toEqual(['refusalHandling'])
  })

  it('returns triggered siblings only from aggregator in deterministic order', () => {
    const triggered = evaluateCoerciveProtocolContradictionChecks(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
    const skipped = evaluateCoerciveProtocolContradictionChecks(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)

    expect(triggered.map((check) => check.flag)).toEqual([
      'generalized_procedure_without_subject_fit',
      'routine_force_authorization',
    ])
    expect(skipped).toEqual([])
  })

  it('returns byte-stable contradiction-check output on repeated calls', () => {
    const first = evaluateRoutineForceAuthorizationContradictionCheck(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
    const second = evaluateRoutineForceAuthorizationContradictionCheck(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

describe('coerciveContainedPersonProtocolRegistry contradiction checks (SPE-1882 slice 7)', () => {
  it('triggers generalized-subject-fit sibling aligned with contradiction risk flags', () => {
    const review = projectCoerciveProtocolRiskReview(ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE)
    const check = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )

    expect(review.contradictionRiskFlags).toContain('generalized_procedure_without_subject_fit')
    expect(check.triggered).toBe(true)
    expect(check.flag).toBe('generalized_procedure_without_subject_fit')
    expect(check.blocksProcedure).toBe(false)
    expect(check.issues.length).toBeGreaterThan(0)
    expect(check.issues.every((issue) => issue.severity === 'warning')).toBe(true)
    expect(check.issues.map((issue) => issue.code)).toEqual([
      'generalized_procedure_compliance_metric_only',
      'generalized_procedure_low_consent_confidence',
      'generalized_procedure_masks_care_harm',
      'generalized_procedure_without_subject_fit_validation',
    ])
  })

  it('flags voluntary handling contradictions when subject fit is generalized', () => {
    const voluntaryGeneralized = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      id: 'coercive-protocol:voluntary-generalized',
      handlingMode: 'voluntary' as const,
    }
    const check = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(voluntaryGeneralized)

    expect(check.triggered).toBe(true)
    expect(
      check.issues.some((issue) => issue.code === 'generalized_procedure_contradicts_voluntary_handling')
    ).toBe(true)
  })

  it('returns non-triggered no-op when subject-fit validation ref is present', () => {
    const validatedGeneralized = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      id: 'coercive-protocol:validated-generalized',
      subjectFitValidationRef: 'review-artifact:generalized-fit-review-31',
    }
    const check = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(validatedGeneralized)

    expect(check.triggered).toBe(false)
    expect(check.blocksProcedure).toBe(false)
    expect(check.issues).toEqual([])
  })

  it('returns non-triggered no-op for validated subject-fit state', () => {
    const check = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE
    )

    expect(check.triggered).toBe(false)
    expect(check.blocksProcedure).toBe(false)
    expect(check.issues).toEqual([])
  })

  it('propagates redacted and unknown metadata into sibling output', () => {
    const redacted = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      redactedFields: ['subjectFitState'],
      unknownFields: ['subjectFitValidationRef'],
    }
    const check = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(redacted)

    expect(check.triggered).toBe(true)
    expect(check.redacted).toBe(true)
    expect(check.unknownFields).toEqual(['subjectFitValidationRef'])
  })

  it('returns byte-stable generalized-subject-fit output on repeated calls', () => {
    const first = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
    const second = evaluateGeneralizedProcedureWithoutSubjectFitContradictionCheck(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})
