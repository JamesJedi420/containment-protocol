import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
  EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
  ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
  sanitizeCoerciveProtocolRecords,
  validateCoerciveProtocolRecord,
} from '../domain/coerciveContainedPersonProtocolRegistry'

describe('coerciveContainedPersonProtocolRegistry persistence (SPE-1882 slice 2)', () => {
  it('defaults starting state to an empty coercive protocol map', () => {
    expect(createStartingState().coerciveContainedPersonProtocolRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeCoerciveProtocolRecords(
      {
        valid: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
        generalized: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
        'wrong-key': {
          ...EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
          id: 'coercive-protocol:routine-force-generalized',
        },
        duplicate: {
          ...EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          subjectRef: 'subject:test',
          handlingMode: 'unknown',
          subjectFitState: 'validated',
          authorizationSource: 'court_order',
          forcePolicy: 'proportional',
          consentConfidence: 0.5,
          refusalHandling: 'accommodated',
          isolationBurdenScore: 0.5,
          surveillanceBurdenScore: 0.5,
          containmentStabilityGain: 0.5,
          personhoodHarmRisk: 0.5,
          trustDamageRisk: 0.5,
          legitimacyRisk: 0.5,
          welfareDebtImpactLabel: 'test',
        },
        franchiseLabel: {
          id: 'coercive-protocol:franchise',
          label: 'SCP division sedation protocol',
          subjectRef: 'subject:test',
          handlingMode: 'emergency',
          subjectFitState: 'validated',
          authorizationSource: 'emergency_directive',
          forcePolicy: 'proportional',
          consentConfidence: 0.2,
          refusalHandling: 'documented_override',
          isolationBurdenScore: 0.4,
          surveillanceBurdenScore: 0.4,
          containmentStabilityGain: 0.7,
          personhoodHarmRisk: 0.5,
          trustDamageRisk: 0.5,
          legitimacyRisk: 0.4,
          welfareDebtImpactLabel: 'test',
        },
        brandedObjectId: {
          id: 'coercive-protocol:scp-049-sedation',
          label: 'Archive sedation protocol',
          subjectRef: 'subject:test',
          handlingMode: 'emergency',
          subjectFitState: 'validated',
          authorizationSource: 'emergency_directive',
          forcePolicy: 'proportional',
          consentConfidence: 0.2,
          refusalHandling: 'documented_override',
          isolationBurdenScore: 0.4,
          surveillanceBurdenScore: 0.4,
          containmentStabilityGain: 0.7,
          personhoodHarmRisk: 0.5,
          trustDamageRisk: 0.5,
          legitimacyRisk: 0.4,
          welfareDebtImpactLabel: 'test',
        },
        outOfRangeScore: {
          id: 'coercive-protocol:out-of-range',
          label: 'Out of range score',
          subjectRef: 'subject:test',
          handlingMode: 'compelled',
          subjectFitState: 'validated',
          authorizationSource: 'facility_policy',
          forcePolicy: 'routine_default',
          consentConfidence: 1.5,
          refusalHandling: 'ignored',
          isolationBurdenScore: 0.5,
          surveillanceBurdenScore: 0.5,
          containmentStabilityGain: 0.5,
          personhoodHarmRisk: 0.5,
          trustDamageRisk: 0.5,
          legitimacyRisk: 0.5,
          welfareDebtImpactLabel: 'test',
        },
      },
      fallback
    )

    expect(sanitized['coercive-protocol:emergency-sedation-stabilization']).toEqual(
      EMERGENCY_SEDATION_PROTOCOL_FIXTURE
    )
    expect(sanitized['coercive-protocol:routine-force-generalized']).toEqual(
      ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.outOfRangeScore).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'coercive-protocol:emergency-sedation-stabilization',
      'coercive-protocol:routine-force-generalized',
    ])
  })

  it('persists warning-only records that remain valid on hydrate', () => {
    const warningOnly = {
      id: 'coercive-protocol:warning-only-compelled',
      label: 'Warning-only compelled protocol',
      subjectRef: 'subject:cooperative-field-asset-9',
      handlingMode: 'compelled' as const,
      subjectFitState: 'generalized' as const,
      authorizationSource: 'undocumented' as const,
      forcePolicy: 'routine_default' as const,
      consentConfidence: 0.15,
      refusalHandling: 'ignored' as const,
      isolationBurdenScore: 0.55,
      surveillanceBurdenScore: 0.48,
      containmentStabilityGain: 0.62,
      personhoodHarmRisk: 0.58,
      trustDamageRisk: 0.52,
      legitimacyRisk: 0.49,
      welfareDebtImpactLabel: 'harmful restraint welfare debt likely',
    }

    expect(validateCoerciveProtocolRecord(warningOnly).valid).toBe(true)

    const sanitized = sanitizeCoerciveProtocolRecords({ [warningOnly.id]: warningOnly }, {})

    expect(sanitized[warningOnly.id]).toEqual(warningOnly)
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.coerciveContainedPersonProtocolRecords = {
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
      [ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]: ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE,
      [ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE.id]:
        ABUSIVE_SURVEILLANCE_ISOLATION_PROTOCOL_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.coerciveContainedPersonProtocolRecords).toEqual(
      state.coerciveContainedPersonProtocolRecords
    )
    expect(
      loaded.coerciveContainedPersonProtocolRecords?.[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]
        ?.procedureRef
    ).toBe(EMERGENCY_SEDATION_PROTOCOL_FIXTURE.procedureRef)
    expect(
      loaded.coerciveContainedPersonProtocolRecords?.[ROUTINE_FORCE_GENERALIZED_PROTOCOL_FIXTURE.id]
        ?.complianceMetricOnly
    ).toBe(true)
  })

  it('hydrates persisted coercive protocol records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        coerciveContainedPersonProtocolRecords: {
          [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
          invalid: {
            id: 'coercive-protocol:invalid',
            label: 'SCP division sedation protocol',
            subjectRef: 'subject:test',
            handlingMode: 'emergency',
            subjectFitState: 'validated',
            authorizationSource: 'emergency_directive',
            forcePolicy: 'proportional',
            consentConfidence: 0.2,
            refusalHandling: 'documented_override',
            isolationBurdenScore: 0.4,
            surveillanceBurdenScore: 0.4,
            containmentStabilityGain: 0.7,
            personhoodHarmRisk: 0.5,
            trustDamageRisk: 0.5,
            legitimacyRisk: 0.4,
            welfareDebtImpactLabel: 'test',
          },
        },
      },
      fallback
    )

    expect(hydrated.coerciveContainedPersonProtocolRecords).toEqual({
      [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE,
    })
  })

  it('repeated sanitize is byte-stable for fixture records', () => {
    const first = sanitizeCoerciveProtocolRecords(
      { [EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]: EMERGENCY_SEDATION_PROTOCOL_FIXTURE },
      {}
    )
    const second = sanitizeCoerciveProtocolRecords(first, {})

    expect(second).toEqual(first)
    expect(validateCoerciveProtocolRecord(EMERGENCY_SEDATION_PROTOCOL_FIXTURE)).toEqual(
      validateCoerciveProtocolRecord(second[EMERGENCY_SEDATION_PROTOCOL_FIXTURE.id]!)
    )
  })
})
