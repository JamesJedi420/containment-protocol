import { describe, expect, it } from 'vitest'

import {
  createDistrictServiceRegistry,
  PUBLIC_SERVICE_CATEGORIES,
  type DistrictServiceReliabilityRecord,
  type ServiceProvenance,
} from './publicServiceInfrastructureDegradation'
import {
  MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
  parsePublicGuidanceMessagePacket,
  validatePublicGuidanceAgainstServices,
  type PublicGuidanceMessagePacket,
} from './messageToServiceAvailabilityValidation'

function baseProvenance(): ServiceProvenance {
  return Object.freeze({
    kind: 'field_update',
    sourceRef: 'field:ops-1',
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

function seedAllFunctional(districtId: string): readonly DistrictServiceReliabilityRecord[] {
  return Object.freeze(
    PUBLIC_SERVICE_CATEGORIES.map((category) => functionalRecord(districtId, category)),
  )
}

function basePacket(
  overrides?: Partial<Omit<PublicGuidanceMessagePacket, 'schemaVersion'>>,
): PublicGuidanceMessagePacket {
  const districtId = overrides?.districtId ?? 'district:central'
  return Object.freeze({
    schemaVersion: MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
    messageId: overrides?.messageId ?? 'message:evac-1',
    districtId,
    recommendedAction: overrides?.recommendedAction ?? 'evacuation',
    requiredServiceCategories: overrides?.requiredServiceCategories ?? Object.freeze([]),
    audienceProfiles:
      overrides?.audienceProfiles ??
      Object.freeze([
        Object.freeze({
          audienceId: 'audience:general',
          mobilityOk: true,
          languageOk: true,
          moneyOk: true,
          suppliesOk: true,
          infrastructureOk: true,
        }),
      ]),
  })
}

describe('messageToServiceAvailabilityValidation (SPE-862)', () => {
  it('blocks release when a supporting service is unavailable', () => {
    const districtId = 'district:metro'
    const seeds = seedAllFunctional(districtId)
    const roadsUnavailable = Object.freeze({
      ...functionalRecord(districtId, 'roads'),
      reliabilityState: 'unavailable' as const,
      reasonCodes: Object.freeze(['degrade:authority_failure']),
    })
    const registry = createDistrictServiceRegistry(districtId, [
      ...seeds.filter((record) => record.serviceCategory !== 'roads'),
      roadsUnavailable,
    ])!

    const result = validatePublicGuidanceAgainstServices({
      packet: basePacket({ districtId, recommendedAction: 'evacuation' }),
      registry,
    })

    expect(result.disposition).toBe('block')
    expect(result.reasonCodes).toContain('service:blocked:roads:unavailable')
    expect(result.serviceChecks.find((check) => check.category === 'roads')?.available).toBe(
      false,
    )
  })

  it('allows one audience to comply while another cannot because access differs', () => {
    const districtId = 'district:ridge'
    const registry = createDistrictServiceRegistry(districtId, seedAllFunctional(districtId))!

    const result = validatePublicGuidanceAgainstServices({
      packet: basePacket({
        districtId,
        recommendedAction: 'evacuation',
        audienceProfiles: Object.freeze([
          Object.freeze({
            audienceId: 'audience:mobile',
            mobilityOk: true,
            languageOk: true,
            moneyOk: true,
            suppliesOk: true,
            infrastructureOk: true,
          }),
          Object.freeze({
            audienceId: 'audience:immobile',
            mobilityOk: false,
            languageOk: true,
            moneyOk: true,
            suppliesOk: true,
            infrastructureOk: true,
          }),
        ]),
      }),
      registry,
    })

    expect(result.disposition).toBe('revise')
    expect(result.reasonCodes).toContain('audience:partial_compliance')
    const mobile = result.audienceResults.find((entry) => entry.audienceId === 'audience:mobile')
    const immobile = result.audienceResults.find(
      (entry) => entry.audienceId === 'audience:immobile',
    )
    expect(mobile?.canComply).toBe(true)
    expect(immobile?.canComply).toBe(false)
    expect(immobile?.blockers).toContain('audience:mobilityOk_false')
  })

  it('revises before release when services are strained and blocks when overloaded', () => {
    const districtId = 'district:harbor'
    const seeds = seedAllFunctional(districtId)
    const strainedClinics = Object.freeze({
      ...functionalRecord(districtId, 'clinics'),
      reliabilityState: 'strained' as const,
    })
    const registryStrained = createDistrictServiceRegistry(districtId, [
      ...seeds.filter((record) => record.serviceCategory !== 'clinics'),
      strainedClinics,
    ])!

    const reviseResult = validatePublicGuidanceAgainstServices({
      packet: basePacket({ districtId, recommendedAction: 'screening' }),
      registry: registryStrained,
    })
    expect(reviseResult.disposition).toBe('revise')
    expect(reviseResult.reasonCodes).toContain('service:strained:clinics:strained')

    const overloadedNodes = Object.freeze({
      ...functionalRecord(districtId, 'public_response_nodes'),
      reliabilityState: 'overloaded' as const,
    })
    const registryBlocked = createDistrictServiceRegistry(districtId, [
      ...seeds.filter((record) => record.serviceCategory !== 'public_response_nodes'),
      overloadedNodes,
    ])!

    const blockResult = validatePublicGuidanceAgainstServices({
      packet: basePacket({ districtId, recommendedAction: 'hotline' }),
      registry: registryBlocked,
    })
    expect(blockResult.disposition).toBe('block')
    expect(blockResult.reasonCodes).toContain(
      'service:blocked:public_response_nodes:overloaded',
    )
  })

  it('consumes SPE-3363 registry projection outputs for guidance validation impact', () => {
    const districtId = 'district:delta'
    const seeds = seedAllFunctional(districtId)
    const communicationsDown = Object.freeze({
      ...functionalRecord(districtId, 'communications'),
      reliabilityState: 'interrupted' as const,
    })
    const registry = createDistrictServiceRegistry(districtId, [
      ...seeds.filter((record) => record.serviceCategory !== 'communications'),
      communicationsDown,
    ])!

    const result = validatePublicGuidanceAgainstServices({
      packet: basePacket({ districtId, recommendedAction: 'hotline' }),
      registry,
    })

    expect(result.reasonCodes).toContain('registry:guidance_validation_impacted')
    expect(result.disposition).toBe('block')
    expect(result.serviceChecks.some((check) => check.category === 'communications')).toBe(true)
  })

  it('fail-closes on malformed packet and registry payloads', () => {
    const districtId = 'district:bad'
    const registry = createDistrictServiceRegistry(districtId, seedAllFunctional(districtId))!

    expect(
      validatePublicGuidanceAgainstServices({
        packet: { messageId: 'missing-schema' },
        registry,
      }).disposition,
    ).toBe('block')
    expect(
      validatePublicGuidanceAgainstServices({
        packet: basePacket({ districtId }),
        registry: { schemaVersion: 'wrong', districtId, records: [] },
      }).reasonCodes,
    ).toContain('validation:malformed_registry')

    expect(parsePublicGuidanceMessagePacket(null)).toBeNull()
    expect(
      parsePublicGuidanceMessagePacket({
        schemaVersion: MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
        messageId: 'm',
        districtId,
        recommendedAction: 'not_real',
        requiredServiceCategories: [],
        audienceProfiles: [],
      }),
    ).toBeNull()
  })

  it('releases when services are functional and all audiences can comply', () => {
    const districtId = 'district:clear'
    const registry = createDistrictServiceRegistry(districtId, seedAllFunctional(districtId))!

    const result = validatePublicGuidanceAgainstServices({
      packet: basePacket({ districtId, recommendedAction: 'supply_collection' }),
      registry,
    })

    expect(result.disposition).toBe('release')
    expect(result.serviceChecks.every((check) => check.available)).toBe(true)
  })
})
