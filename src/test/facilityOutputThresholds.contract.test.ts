import { describe, expect, it } from 'vitest'
import {
  FACILITY_OUTPUT_FACILITY_ID,
  evaluateFacilityOutputThresholds,
  metFacilityOutputReadiness,
  type FacilityOutputReadiness,
} from '../domain/facilityOutputThresholds'

function readiness(overrides: Partial<FacilityOutputReadiness> = {}): FacilityOutputReadiness {
  return {
    ...metFacilityOutputReadiness(),
    ...overrides,
  }
}

describe('SPE-1481 facility output thresholds', () => {
  it('keeps the representative facility nonproductive under construction even when readiness is met', () => {
    const result = evaluateFacilityOutputThresholds({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'under_construction',
      readiness: metFacilityOutputReadiness(),
    })
    expect(result).toEqual({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'under_construction',
      productive: false,
      bundle: {
        intel: 0,
        containmentCapacity: 0,
        serviceOutput: 0,
        revenue: 0,
      },
      blockedReasons: ['phase_nonproductive'],
    })
  })

  it('differs output bundles across construction, initial activation, and stable operation', () => {
    const construction = evaluateFacilityOutputThresholds({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'under_construction',
      readiness: metFacilityOutputReadiness(),
    })
    const initial = evaluateFacilityOutputThresholds({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'initial_activation',
      readiness: metFacilityOutputReadiness(),
    })
    const stable = evaluateFacilityOutputThresholds({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'stable_operation',
      readiness: metFacilityOutputReadiness(),
    })

    expect(construction).toMatchObject({
      productive: false,
      bundle: {
        intel: 0,
        containmentCapacity: 0,
        serviceOutput: 0,
        revenue: 0,
      },
      blockedReasons: ['phase_nonproductive'],
    })
    expect(initial).toMatchObject({
      productive: true,
      bundle: {
        intel: 1,
        containmentCapacity: 1,
        serviceOutput: 1,
        revenue: 0,
      },
      blockedReasons: [],
    })
    expect(stable).toMatchObject({
      productive: true,
      bundle: {
        intel: 2,
        containmentCapacity: 2,
        serviceOutput: 2,
        revenue: 1,
      },
      blockedReasons: [],
    })
    expect(construction.bundle).not.toEqual(initial.bundle)
    expect(initial.bundle).not.toEqual(stable.bundle)
  })

  it('blocks productive output with an explicit reason when staffing is unmet', () => {
    const result = evaluateFacilityOutputThresholds({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'stable_operation',
      readiness: readiness({ staffing: 'unmet' }),
    })
    expect(result).toEqual({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'stable_operation',
      productive: false,
      bundle: {
        intel: 0,
        containmentCapacity: 0,
        serviceOutput: 0,
        revenue: 0,
      },
      blockedReasons: ['insufficient_staffing'],
    })
  })

  it('lists every unmet readiness axis as a stable blocked reason', () => {
    const result = evaluateFacilityOutputThresholds({
      facilityId: FACILITY_OUTPUT_FACILITY_ID,
      phase: 'initial_activation',
      readiness: readiness({
        security: 'unmet',
        power: 'unmet',
        storage: 'unmet',
        communications: 'unmet',
      }),
    })
    expect(result.productive).toBe(false)
    expect(result.bundle).toEqual({
      intel: 0,
      containmentCapacity: 0,
      serviceOutput: 0,
      revenue: 0,
    })
    expect(result.blockedReasons).toEqual([
      'weak_security',
      'absent_power',
      'missing_storage',
      'broken_comms',
    ])
  })

  it('fails closed on malformed readiness packets', () => {
    expect(
      evaluateFacilityOutputThresholds({
        facilityId: FACILITY_OUTPUT_FACILITY_ID,
        phase: 'stable_operation',
        readiness: { staffing: 'met' },
      }).blockedReasons
    ).toEqual(['malformed_readiness'])
    const nullResult = evaluateFacilityOutputThresholds(null)
    expect(nullResult.productive).toBe(false)
    expect(nullResult.blockedReasons).toEqual(['malformed_readiness'])
    expect(
      evaluateFacilityOutputThresholds({
        facilityId: 'facility:other',
        phase: 'stable_operation',
        readiness: metFacilityOutputReadiness(),
      }).blockedReasons
    ).toEqual(['malformed_readiness'])
  })
})
