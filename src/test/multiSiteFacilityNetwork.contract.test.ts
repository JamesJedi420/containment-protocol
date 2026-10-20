import { describe, expect, it } from 'vitest'
import {
  MULTI_SITE_NETWORK_PRIMARY_ID,
  MULTI_SITE_NETWORK_REMOTE_ID,
  evaluateCrossSiteTransfer,
  projectLocalOperationUnderDesync,
  projectSiteNetworkMode,
} from '../domain/multiSiteFacilityNetwork'

const primary = MULTI_SITE_NETWORK_PRIMARY_ID
const remote = MULTI_SITE_NETWORK_REMOTE_ID

const alignedTransfer = {
  sourceSiteId: primary,
  destinationSiteId: remote,
  payloadKind: 'asset' as const,
  sourceSchemaId: 'schema:containment-v1',
  destinationSchemaId: 'schema:containment-v1',
  sourceContainmentClass: 'class:stable',
  destinationContainmentClass: 'class:stable',
  requiredSharedService: 'logistics' as const,
  sharedServiceStatus: 'live' as const,
}

const intactLocal = {
  localStaffingIntact: true,
  localZoningIntact: true,
} as const

describe('SPE-1020 multi-site facility network and transfer compatibility', () => {
  it('supports isolated vs networked modes with different risks and benefits', () => {
    expect(
      projectSiteNetworkMode({
        siteId: primary,
        mode: 'isolated',
        sharedServicesEnabled: false,
      })
    ).toMatchObject({
      mode: 'isolated',
      localControlGain: true,
      stabilityGain: true,
      capabilityReachGain: false,
      dependencyRisk: false,
      networkingStrictlyBetter: false,
    })

    expect(
      projectSiteNetworkMode({
        siteId: remote,
        mode: 'networked',
        sharedServicesEnabled: true,
      })
    ).toMatchObject({
      mode: 'networked',
      localControlGain: false,
      capabilityReachGain: true,
      researchSharingGain: true,
      logisticsReachGain: true,
      dependencyRisk: true,
      networkingStrictlyBetter: false,
    })
  })

  it('rejects contradictory mode flags and malformed site-mode packets', () => {
    expect(
      projectSiteNetworkMode({
        siteId: primary,
        mode: 'isolated',
        sharedServicesEnabled: true,
      })
    ).toBeUndefined()
    expect(
      projectSiteNetworkMode({
        siteId: primary,
        mode: 'networked',
        sharedServicesEnabled: false,
      })
    ).toBeUndefined()
    expect(projectSiteNetworkMode(null)).toBeUndefined()
    expect(projectSiteNetworkMode({ siteId: '', mode: 'isolated' })).toBeUndefined()
  })

  it.each([
    [
      'schema mismatch fails',
      { payloadKind: 'anomaly' as const, destinationSchemaId: 'schema:containment-v2' },
      {
        outcome: 'failed',
        failureReason: 'schema_mismatch',
        transitInstability: true,
        seamlessMovement: false,
      },
    ],
    [
      'containment mismatch destabilizes',
      { destinationContainmentClass: 'class:volatile' },
      {
        outcome: 'destabilized',
        failureReason: 'containment_assumption_mismatch',
        transitInstability: true,
      },
    ],
    [
      'degraded service fails',
      {
        payloadKind: 'personnel' as const,
        requiredSharedService: 'identity' as const,
        sharedServiceStatus: 'degraded' as const,
      },
      { outcome: 'failed', failureReason: 'service_compatibility_mismatch' },
    ],
    [
      'stale service destabilizes',
      {
        payloadKind: 'personnel' as const,
        requiredSharedService: 'research' as const,
        sharedServiceStatus: 'stale' as const,
      },
      {
        outcome: 'destabilized',
        failureReason: 'service_compatibility_mismatch',
        transitInstability: true,
      },
    ],
    [
      'aligned live transfer allows',
      {},
      {
        outcome: 'allowed',
        failureReason: 'none',
        transitInstability: false,
        seamlessMovement: false,
      },
    ],
  ])('%s', (_label, override, expected) => {
    expect(evaluateCrossSiteTransfer({ ...alignedTransfer, ...override })).toMatchObject(
      expected
    )
  })

  it('rejects same-site or malformed transfer packets', () => {
    expect(
      evaluateCrossSiteTransfer({
        ...alignedTransfer,
        destinationSiteId: primary,
      })
    ).toBeUndefined()
    expect(evaluateCrossSiteTransfer({})).toBeUndefined()
  })

  it.each([
    [
      'stale research continues locally',
      {
        siteId: remote,
        siteMode: 'networked' as const,
        sharedServiceKind: 'research' as const,
        sharedServiceStatus: 'stale' as const,
        ...intactLocal,
      },
      {
        localOperationContinues: true,
        sharedServiceUsable: false,
        desyncActive: true,
        unifiedLiveStateAssumed: false,
      },
    ],
    [
      'missing classification continues locally',
      {
        siteId: remote,
        siteMode: 'networked' as const,
        sharedServiceKind: 'classification' as const,
        sharedServiceStatus: 'missing' as const,
        ...intactLocal,
      },
      {
        localOperationContinues: true,
        sharedServiceUsable: false,
        desyncActive: true,
      },
    ],
    [
      'degraded identity stops when zoning broken',
      {
        siteId: primary,
        siteMode: 'isolated' as const,
        sharedServiceKind: 'identity' as const,
        sharedServiceStatus: 'degraded' as const,
        localStaffingIntact: true,
        localZoningIntact: false,
      },
      { localOperationContinues: false, desyncActive: true },
    ],
    [
      'live logistics remains usable',
      {
        siteId: primary,
        siteMode: 'networked' as const,
        sharedServiceKind: 'logistics' as const,
        sharedServiceStatus: 'live' as const,
        ...intactLocal,
      },
      {
        localOperationContinues: true,
        sharedServiceUsable: true,
        desyncActive: false,
      },
    ],
  ])('%s', (_label, input, expected) => {
    expect(projectLocalOperationUnderDesync(input)).toMatchObject(expected)
  })
})
