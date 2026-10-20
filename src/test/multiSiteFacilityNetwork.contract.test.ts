import { describe, expect, it } from 'vitest'
import {
  MULTI_SITE_NETWORK_PRIMARY_ID,
  MULTI_SITE_NETWORK_REMOTE_ID,
  evaluateCrossSiteTransfer,
  projectLocalOperationUnderDesync,
  projectSiteNetworkMode,
} from '../domain/multiSiteFacilityNetwork'

const alignedTransfer = {
  sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
  destinationSiteId: MULTI_SITE_NETWORK_REMOTE_ID,
  payloadKind: 'asset' as const,
  sourceSchemaId: 'schema:containment-v1',
  destinationSchemaId: 'schema:containment-v1',
  sourceContainmentClass: 'class:stable',
  destinationContainmentClass: 'class:stable',
  requiredSharedService: 'logistics' as const,
  sharedServiceStatus: 'live' as const,
}

describe('SPE-1020 multi-site facility network and transfer compatibility', () => {
  it('supports isolated vs networked modes with different risks and benefits', () => {
    expect(
      projectSiteNetworkMode({
        siteId: MULTI_SITE_NETWORK_PRIMARY_ID,
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
        siteId: MULTI_SITE_NETWORK_REMOTE_ID,
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
        siteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        mode: 'isolated',
        sharedServicesEnabled: true,
      })
    ).toBeUndefined()
    expect(
      projectSiteNetworkMode({
        siteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        mode: 'networked',
        sharedServicesEnabled: false,
      })
    ).toBeUndefined()
    expect(projectSiteNetworkMode(null)).toBeUndefined()
    expect(projectSiteNetworkMode({ siteId: '', mode: 'isolated' })).toBeUndefined()
  })

  it('fails or destabilizes transfers on schema, containment, or service mismatch', () => {
    expect(
      evaluateCrossSiteTransfer({
        ...alignedTransfer,
        payloadKind: 'anomaly',
        destinationSchemaId: 'schema:containment-v2',
      })
    ).toMatchObject({
      outcome: 'failed',
      failureReason: 'schema_mismatch',
      transitInstability: true,
      seamlessMovement: false,
    })

    expect(
      evaluateCrossSiteTransfer({
        ...alignedTransfer,
        destinationContainmentClass: 'class:volatile',
      })
    ).toMatchObject({
      outcome: 'destabilized',
      failureReason: 'containment_assumption_mismatch',
      transitInstability: true,
    })

    expect(
      evaluateCrossSiteTransfer({
        ...alignedTransfer,
        payloadKind: 'personnel',
        requiredSharedService: 'identity',
        sharedServiceStatus: 'degraded',
      })
    ).toMatchObject({
      outcome: 'failed',
      failureReason: 'service_compatibility_mismatch',
    })

    expect(
      evaluateCrossSiteTransfer({
        ...alignedTransfer,
        payloadKind: 'personnel',
        requiredSharedService: 'research',
        sharedServiceStatus: 'stale',
      })
    ).toMatchObject({
      outcome: 'destabilized',
      failureReason: 'service_compatibility_mismatch',
      transitInstability: true,
    })

    expect(evaluateCrossSiteTransfer(alignedTransfer)).toMatchObject({
      outcome: 'allowed',
      failureReason: 'none',
      transitInstability: false,
      seamlessMovement: false,
    })
  })

  it('rejects same-site or malformed transfer packets', () => {
    expect(
      evaluateCrossSiteTransfer({
        ...alignedTransfer,
        destinationSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
      })
    ).toBeUndefined()
    expect(evaluateCrossSiteTransfer({})).toBeUndefined()
  })

  it('continues local operation while a shared service is stale, missing, or degraded', () => {
    expect(
      projectLocalOperationUnderDesync({
        siteId: MULTI_SITE_NETWORK_REMOTE_ID,
        siteMode: 'networked',
        sharedServiceKind: 'research',
        sharedServiceStatus: 'stale',
        localStaffingIntact: true,
        localZoningIntact: true,
      })
    ).toMatchObject({
      localOperationContinues: true,
      sharedServiceUsable: false,
      desyncActive: true,
      unifiedLiveStateAssumed: false,
    })

    expect(
      projectLocalOperationUnderDesync({
        siteId: MULTI_SITE_NETWORK_REMOTE_ID,
        siteMode: 'networked',
        sharedServiceKind: 'classification',
        sharedServiceStatus: 'missing',
        localStaffingIntact: true,
        localZoningIntact: true,
      })
    ).toMatchObject({
      localOperationContinues: true,
      sharedServiceUsable: false,
      desyncActive: true,
    })

    expect(
      projectLocalOperationUnderDesync({
        siteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        siteMode: 'isolated',
        sharedServiceKind: 'identity',
        sharedServiceStatus: 'degraded',
        localStaffingIntact: true,
        localZoningIntact: false,
      })
    ).toMatchObject({
      localOperationContinues: false,
      desyncActive: true,
    })

    expect(
      projectLocalOperationUnderDesync({
        siteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        siteMode: 'networked',
        sharedServiceKind: 'logistics',
        sharedServiceStatus: 'live',
        localStaffingIntact: true,
        localZoningIntact: true,
      })
    ).toMatchObject({
      localOperationContinues: true,
      sharedServiceUsable: true,
      desyncActive: false,
    })
  })
})
