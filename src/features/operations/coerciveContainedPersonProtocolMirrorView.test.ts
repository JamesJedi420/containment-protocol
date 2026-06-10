import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  projectCoerciveProtocolRiskReview,
  projectContainmentCareTradeoff,
  validateCoerciveProtocolRecord,
  type CoerciveProtocolRecord,
} from '../../domain/coerciveContainedPersonProtocolRegistry'
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
