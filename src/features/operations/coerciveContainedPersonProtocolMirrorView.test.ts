import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
  evaluateCoerciveProtocolContradictionChecks,
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
  validateCoerciveProtocolRecord,
  type CoerciveProtocolRecord,
} from '../../domain/coerciveContainedPersonProtocolRegistry'
import {
  INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE,
  INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
} from '../../domain/containedPersonIntegratedHealthBundleRegistry'
import { PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE } from '../../domain/psychologicalResilienceRegistry'
import { SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE } from '../../domain/surveillanceCapacityInterventionTuningRegistry'
import {
  formatCoerciveProtocolEnumLabel,
  getCoerciveContainedPersonProtocolMirrorView,
} from './coerciveContainedPersonProtocolMirrorView'

function warningOnlyRecord(): CoerciveProtocolRecord {
  return {
    id: 'coercive-protocol:compelled-undocumented',
    label: 'Compelled protocol without documented authorization',
    subjectRef: 'subject:cooperative-field-asset-41',
    handlingMode: 'compelled',
    subjectFitState: 'validated',
    authorizationSource: 'undocumented',
    forcePolicy: 'proportional',
    consentConfidence: 0.25,
    refusalHandling: 'documented_override',
    isolationBurdenScore: 0.4,
    surveillanceBurdenScore: 0.35,
    containmentStabilityGain: 0.55,
    personhoodHarmRisk: 0.48,
    trustDamageRisk: 0.42,
    legitimacyRisk: 0.38,
    welfareDebtImpactLabel: 'coerced restraint welfare debt likely',
    confidence: 0.71,
  }
}

describe('coerciveContainedPersonProtocolMirrorView (SPE-1882 slice 4)', () => {
  it('returns empty mirror when coerciveContainedPersonProtocolRecords map is empty', () => {
    const game = createStartingState()

    expect(game.coerciveContainedPersonProtocolRecords).toEqual({})

    const view = getCoerciveContainedPersonProtocolMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors handling mode, tradeoff scores, and coercion risk from hydrated records', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]
    const tradeoff = projectContainmentCareTradeoff(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)
    const riskReview = projectCoerciveProtocolRiskReview(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)

    expect(view.isEmpty).toBe(false)
    expect(record?.handlingModeLabel).toBe('Emergency')
    expect(record?.handlingPostureLabel).toBe('Emergency')
    expect(record?.containmentStabilityGainLabel).toBe(tradeoff.containmentStabilityGain.toFixed(2))
    expect(record?.coercionRiskScoreLabel).toBe(riskReview.coercionRiskScore.toFixed(2))
    expect(record?.medicationRegimenRefLabel).toBe('medication-regimen:coercive-sedative-beta')
    expect(record?.custodyStatusRefLabel).toBe('custody-status:former-hostile-hold')
    expect(record?.procedureRefLabel).toBe('coercive-procedure:forced-sedation-stabilization')
  })

  it('shows stable containment and abusive posture summary counts', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const abusiveRecord = view.records.find(
      (record) => record.id === ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id
    )

    expect(view.summary.stableContainmentDominatesCareCount).toBe(1)
    expect(view.summary.abusivePostureCount).toBe(1)
    expect(view.summary.contradictionFlaggedCount).toBe(1)
    expect(abusiveRecord?.handlingPostureLabel).toBe('Abusive')
    expect(abusiveRecord?.contradictionRiskFlagLabels).toContain('Surveillance Isolation Burden')
    expect(abusiveRecord?.stableContainmentDominatesCareLabel).toBe('—')
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = warningOnlyRecord()
    expect(validateCoerciveProtocolRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
    expect(record?.handlingModeLabel).toBe('Compelled')
  })

  it('surfaces contradiction flags for routine force generalized fixture', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(view.summary.contradictionFlaggedCount).toBe(1)
    expect(record?.contradictionRiskFlagLabels).toContain('Routine Force Authorization')
    expect(record?.contradictionRiskFlagLabels).toContain(
      'Generalized Procedure Without Subject Fit'
    )
    expect(record?.subjectFitValidationRefLabel).toBe('—')
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id,
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id,
    ])

    const first = JSON.stringify(getCoerciveContainedPersonProtocolMirrorView(game))
    const second = JSON.stringify(getCoerciveContainedPersonProtocolMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatCoerciveProtocolEnumLabel('court_order')).toBe('Court Order')
    expect(formatCoerciveProtocolEnumLabel('routine_force_authorization')).toBe(
      'Routine Force Authorization'
    )
  })
})

describe('coerciveContainedPersonProtocolMirrorView (SPE-1882 slice 10)', () => {
  it('returns empty contradiction check views for no-trigger fixture', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(evaluateCoerciveProtocolContradictionChecks(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)).toEqual(
      []
    )
    expect(record?.contradictionCheckViews).toEqual([])
  })

  it('surfaces triggered sibling issue detail in deterministic flag order', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]
    const triggered = evaluateCoerciveProtocolContradictionChecks(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )

    expect(record?.contradictionCheckViews.map((check) => check.flagLabel)).toEqual([
      'Compliance Metric Masks Harm',
      'Generalized Procedure Without Subject Fit',
      'Routine Force Authorization',
    ])
    expect(record?.contradictionCheckViews.map((check) => check.issueDetailLabels.length)).toEqual(
      triggered.map((check) => check.issues.length)
    )
    expect(
      record?.contradictionCheckViews.every(
        (check, index) =>
          check.issueDetailLabels.join('\n') ===
          triggered[index]?.issues.map((issue) => issue.detail).join('\n')
      )
    ).toBe(true)
  })

  it('surfaces single surveillance-isolation sibling for abusive fixture', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]
    const triggered = evaluateCoerciveProtocolContradictionChecks(
      ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE
    )

    expect(record?.contradictionCheckViews).toHaveLength(1)
    expect(record?.contradictionCheckViews[0]?.flagLabel).toBe('Surveillance Isolation Burden')
    expect(record?.contradictionCheckViews[0]?.issueDetailLabels).toEqual(
      triggered[0]?.issues.map((issue) => issue.detail)
    )
  })

  it('propagates redacted and unknown metadata into contradiction check views', () => {
    const redacted = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      redactedFields: ['forcePolicy'],
      unknownFields: ['refusalHandling'],
    }
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [redacted.id]: redacted,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(record?.contradictionCheckViews.length).toBeGreaterThan(0)
    expect(record?.contradictionCheckViews.every((check) => check.redacted)).toBe(true)
    expect(record?.contradictionCheckViews[0]?.unknownFieldLabels).toEqual(['refusalHandling'])
  })

  it('surfaces four triggered siblings for quad-flag fixture', () => {
    const quadFlag = {
      ...ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      id: 'coercive-protocol:quad-flag-contradiction',
      isolationBurdenScore: 0.72,
      surveillanceBurdenScore: 0.71,
    }
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [quadFlag.id]: quadFlag,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(record?.contradictionCheckViews.map((check) => check.flagLabel)).toEqual([
      'Compliance Metric Masks Harm',
      'Generalized Procedure Without Subject Fit',
      'Routine Force Authorization',
      'Surveillance Isolation Burden',
    ])
  })
})

describe('coerciveContainedPersonProtocolMirrorView (SPE-2429 slice 2)', () => {
  it('returns zero cross-system tension counts when integrated health bundles are absent', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)

    expect(view.summary.integratedHealthLinkedSubjectCount).toBe(0)
    expect(view.summary.crossSystemTensionSubjectCount).toBe(0)
    expect(view.records[0]?.crossSystemTensionFlagLabels).toEqual([])
  })

  it('surfaces cross-system tension flags when protocol and bundle share subject ref', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    game.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(view.summary.integratedHealthLinkedSubjectCount).toBe(1)
    expect(view.summary.crossSystemTensionSubjectCount).toBe(1)
    expect(record?.crossSystemTensionFlagLabels).toEqual([
      'Monitoring Substitutes Contact Signal',
      'Surveillance Burden Low Humane Care Risk',
      'Surveillance Burden No Active Contact Channel',
      'Surveillance Burden Stable Mental State',
    ])
  })
})

describe('coerciveContainedPersonProtocolMirrorView (SPE-2439 slice 4)', () => {
  it('surfaces surveillance-tuning tension flags when tuning records coexist', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }
    game.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }
    game.surveillanceInterventionTuningRecords = {
      [SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE.id]: SURVEILLANCE_TUNING_SUBJECT_22_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(view.summary.crossSystemTensionSubjectCount).toBe(1)
    expect(record?.crossSystemTensionFlagLabels).toEqual([
      'Monitoring Substitutes Contact Signal',
      'Surveillance Burden Low Humane Care Risk',
      'Surveillance Burden No Active Contact Channel',
      'Surveillance Burden Stable Mental State',
      'Surveillance Tuning Monitoring Exceeds Contact',
      'Surveillance Tuning Sustained Under Collateral Strain',
    ])
    expect(record?.crossSystemTensionFlagLabels.join('; ')).not.toContain('0.88')
  })
})

describe('coerciveContainedPersonProtocolMirrorView (SPE-2440 slice 5)', () => {
  it('surfaces psychological-resilience tension flags when resilience records coexist', () => {
    const protocolWithOperatorLink = {
      ...ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
      subjectFitValidationRef: PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.operatorRef,
    }
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [protocolWithOperatorLink.id]: protocolWithOperatorLink,
    }
    game.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_SURVEILLANCE_TENSION_FIXTURE,
    }
    game.psychologicalResilienceRecords = {
      [PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE.id]:
        PSYCHOLOGICAL_RESILIENCE_STAGED_DEPLETION_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(view.summary.crossSystemTensionSubjectCount).toBe(1)
    expect(record?.crossSystemTensionFlagLabels).toEqual([
      'Monitoring Substitutes Contact Signal',
      'Psychological Resilience Duty Reliability Degraded',
      'Psychological Resilience Exposure Elevated',
      'Surveillance Burden Low Humane Care Risk',
      'Surveillance Burden No Active Contact Channel',
      'Surveillance Burden Stable Mental State',
    ])
    expect(record?.crossSystemTensionFlagLabels.join('; ')).not.toContain('0.72')
    expect(record?.crossSystemTensionFlagLabels.join('; ')).not.toContain('0.79')
  })
})

describe('coerciveContainedPersonProtocolMirrorView (SPE-2442 slice 6)', () => {
  it('surfaces staff-duty tension flags when staff-exclusion fixtures coexist', () => {
    const game = createStartingState()
    game.coerciveContainedPersonProtocolRecords = {
      [STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE.id]:
        STAFF_EXCLUSION_SUPPORT_DUTY_PROTOCOL_FIXTURE,
    }
    game.containedPersonIntegratedHealthBundles = {
      [INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE.subjectRef]:
        INTEGRATED_HEALTH_BUNDLE_STAFF_EXCLUSION_TENSION_FIXTURE,
    }

    const view = getCoerciveContainedPersonProtocolMirrorView(game)
    const record = view.records[0]

    expect(view.summary.integratedHealthLinkedSubjectCount).toBe(1)
    expect(view.summary.crossSystemTensionSubjectCount).toBe(1)
    expect(record?.crossSystemTensionFlagLabels).toEqual([
      'Staff Exclusion Accommodation Access Not Routed',
      'Staff Exclusion Bundle No Active Contact Cross Tension',
      'Staff Exclusion Exposure Risk Not Separated',
      'Staff Exclusion Medical Access Not Routed',
      'Staff Exclusion Support Duty Obligation Elevated',
    ])
    expect(record?.crossSystemTensionFlagLabels.join('; ')).not.toContain('0.81')
    expect(record?.crossSystemTensionFlagLabels.join('; ')).not.toContain('excludes staff')
  })
})
