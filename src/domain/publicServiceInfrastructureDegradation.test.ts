import { describe, expect, it } from 'vitest'

import {
  applyServiceDegradation,
  applyServiceRecoveryStep,
  createDistrictServiceRegistry,
  parseDistrictServiceRegistry,
  parseDistrictServiceReliabilityRecord,
  projectPublicServiceCoexistenceWithDistrictCadence,
  projectServiceDownstreamOutputs,
  PUBLIC_SERVICE_CATEGORIES,
  serializeDistrictServiceRegistry,
  type DistrictServiceReliabilityRecord,
  type ServiceProvenance,
} from './publicServiceInfrastructureDegradation'

function baseProvenance(overrides?: Partial<ServiceProvenance>): ServiceProvenance {
  return Object.freeze({
    kind: 'field_update',
    sourceRef: 'field:ops-1',
    ...overrides,
  })
}

function functionalRecord(
  districtId: string,
  serviceCategory: (typeof PUBLIC_SERVICE_CATEGORIES)[number],
): DistrictServiceReliabilityRecord {
  return Object.freeze({
    districtId,
    serviceCategory,
    reliabilityState: 'functional',
    downstreamUseFlags: Object.freeze([]),
    provenance: baseProvenance(),
    reasonCodes: Object.freeze(['seed:functional']),
  })
}

function seedAllCategories(districtId: string): readonly DistrictServiceReliabilityRecord[] {
  return Object.freeze(PUBLIC_SERVICE_CATEGORIES.map((category) => functionalRecord(districtId, category)))
}

describe('publicServiceInfrastructureDegradation', () => {
  it('creates a multi-category district registry with round-trip serialize/parse', () => {
    const districtId = 'district:north-quarter'
    const registry = createDistrictServiceRegistry(districtId, seedAllCategories(districtId))
    expect(registry).not.toBeNull()
    expect(registry!.records).toHaveLength(PUBLIC_SERVICE_CATEGORIES.length)

    const json = serializeDistrictServiceRegistry(registry!)
    const parsed = parseDistrictServiceRegistry(json)
    expect(parsed).toEqual(registry)
  })

  it('applies deterministic degradation transitions', () => {
    const districtId = 'district:central'
    const water = functionalRecord(districtId, 'water')
    const degraded = applyServiceDegradation(water, 'supply_shock', baseProvenance({ kind: 'sensor_reading' }))
    expect(degraded).not.toBeNull()
    expect(degraded!.reliabilityState).toBe('degraded')
    expect(degraded!.degradationCause).toBe('supply_shock')
    expect(degraded!.reasonCodes).toContain('degrade:supply_shock')
    expect(degraded!.reasonCodes).toContain('state:functional_to_degraded')

    const again = applyServiceDegradation(degraded!, 'supply_shock', baseProvenance())
    expect(again!.reliabilityState).toBe('unavailable')
  })

  it('walks partial recovery without instant baseline restoration', () => {
    const districtId = 'district:harbor'
    let roads = functionalRecord(districtId, 'roads')
    roads = applyServiceDegradation(roads, 'sabotage', baseProvenance())!
    expect(roads.reliabilityState).toBe('interrupted')

    roads = applyServiceDegradation(roads, 'partial_recovery', baseProvenance({ kind: 'report' }))!
    expect(roads.reliabilityState).toBe('recovering')
    expect(roads.recoveryState).toBe('partial')

    roads = applyServiceRecoveryStep(roads)!
    expect(roads.reliabilityState).toBe('strained')
    expect(roads.recoveryState).toBe('stabilizing')

    roads = applyServiceRecoveryStep(roads)!
    expect(roads.reliabilityState).toBe('functional')
    expect(roads.recoveryState).toBeUndefined()
  })

  it('projects downstream consumer outputs when severity crosses thresholds', () => {
    const districtId = 'district:metro'
    const seeds = seedAllCategories(districtId)
    let registry = createDistrictServiceRegistry(districtId, seeds)!
    const baseline = projectServiceDownstreamOutputs(registry)!
    expect(baseline.flags.medical_access).toBe(false)
    expect(baseline.flags.route_planning).toBe(false)

    const clinics = applyServiceDegradation(
      functionalRecord(districtId, 'clinics'),
      'contamination',
      baseProvenance(),
    )!
    registry = createDistrictServiceRegistry(districtId, [
      ...seeds.filter((r) => r.serviceCategory !== 'clinics'),
      clinics,
    ])!
    const withClinicImpact = projectServiceDownstreamOutputs(registry)!
    expect(withClinicImpact.flags.medical_access).toBe(true)
    expect(withClinicImpact.reasonCodes.some((c) => c.startsWith('impact:clinics'))).toBe(true)
  })

  it('records provenance and reason codes on degrade', () => {
    const record = functionalRecord('district:ridge', 'communications')
    const next = applyServiceDegradation(
      record,
      'authority_failure',
      baseProvenance({ kind: 'authority_claim', sourceRef: 'authority:city-hall', observedAtWeek: 12 }),
    )
    expect(next!.provenance.kind).toBe('authority_claim')
    expect(next!.provenance.observedAtWeek).toBe(12)
    expect(next!.reliabilityState).toBe('unavailable')
    expect(next!.reasonCodes).toContain('degrade:authority_failure')
  })

  it('rejects malformed records and registry payloads fail-closed', () => {
    expect(parseDistrictServiceReliabilityRecord(null)).toBeNull()
    expect(parseDistrictServiceReliabilityRecord({ districtId: '', serviceCategory: 'water' })).toBeNull()
    expect(
      parseDistrictServiceReliabilityRecord({
        districtId: 'district:x',
        serviceCategory: 'not_a_service',
        reliabilityState: 'functional',
        downstreamUseFlags: [],
        provenance: { kind: 'observation', sourceRef: 'a' },
        reasonCodes: ['ok'],
      }),
    ).toBeNull()

    const districtId = 'district:bad'
    const dupRegistry = {
      schemaVersion: 'spe-3363.v1',
      districtId,
      records: [
        functionalRecord(districtId, 'water'),
        functionalRecord(districtId, 'water'),
      ],
    }
    expect(parseDistrictServiceRegistry(dupRegistry)).toBeNull()
    expect(
      createDistrictServiceRegistry(districtId, [
        functionalRecord(districtId, 'water'),
        functionalRecord(districtId, 'water'),
      ]),
    ).toBeNull()
    expect(parseDistrictServiceRegistry({ schemaVersion: 'spe-3363.v0', districtId, records: [] })).toBeNull()
    expect(applyServiceDegradation(functionalRecord(districtId, 'water'), 'overload', { kind: 'bad', sourceRef: 'x' } as never)).toBeNull()
  })

  it('coexists with caller-owned district cadence and crisis phase stubs', () => {
    const districtId = 'district:delta'
    const markets = applyServiceDegradation(
      functionalRecord(districtId, 'markets'),
      'supply_shock',
      baseProvenance(),
    )!
    const registry = createDistrictServiceRegistry(districtId, [
      functionalRecord(districtId, 'water'),
      markets,
    ])!

    const coexist = projectPublicServiceCoexistenceWithDistrictCadence({
      registry,
      cadenceBand: 'crisis',
      crisisPhase: 'acute',
    })
    expect(coexist).not.toBeNull()
    expect(coexist!.effectiveCrisisAmplifier).toBe(true)
    expect(coexist!.cadenceStressReasonCodes).toContain('cadence:crisis_amplifier')
    expect(coexist!.downstream.flags.market_failure_signal).toBe(true)
  })
})
