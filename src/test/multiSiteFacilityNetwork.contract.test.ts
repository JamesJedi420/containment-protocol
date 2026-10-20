import { describe, expect, it } from 'vitest'
import {
  MULTI_SITE_NETWORK_PRIMARY_ID,
  MULTI_SITE_NETWORK_REMOTE_ID,
  evaluateCrossSiteTransfer,
  projectLocalOperationUnderDesync,
  projectSiteNetworkMode,
} from '../domain/multiSiteFacilityNetwork'

describe('SPE-1020 multi-site facility network and transfer compatibility', () => {
  it('supports isolated vs networked modes with different risks and benefits', () => {
    const isolated = projectSiteNetworkMode({
      siteId: MULTI_SITE_NETWORK_PRIMARY_ID,
      mode: 'isolated',
      sharedServicesEnabled: false,
    })
    expect(isolated).toMatchObject({
      mode: 'isolated',
      localControlGain: true,
      stabilityGain: true,
      capabilityReachGain: false,
      researchSharingGain: false,
      logisticsReachGain: false,
      dependencyRisk: false,
      networkingStrictlyBetter: false,
    })

    const networked = projectSiteNetworkMode({
      siteId: MULTI_SITE_NETWORK_REMOTE_ID,
      mode: 'networked',
      sharedServicesEnabled: true,
    })
    expect(networked).toMatchObject({
      mode: 'networked',
      localControlGain: false,
      stabilityGain: false,
      capabilityReachGain: true,
      researchSharingGain: true,
      logisticsReachGain: true,
      dependencyRisk: true,
      networkingStrictlyBetter: false,
    })
  })

  it('rejects contradictory mode / shared-service flags and malformed input', () => {
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
        sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        destinationSiteId: MULTI_SITE_NETWORK_REMOTE_ID,
        payloadKind: 'anomaly',
        sourceSchemaId: 'schema:containment-v1',
        destinationSchemaId: 'schema:containment-v2',
        sourceContainmentClass: 'class:stable',
        destinationContainmentClass: 'class:stable',
        requiredSharedService: 'classification',
        sharedServiceStatus: 'live',
      })
    ).toMatchObject({
      outcome: 'failed',
      failureReason: 'schema_mismatch',
      transitInstability: true,
      seamlessMovement: false,
    })

    expect(
      evaluateCrossSiteTransfer({
        sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        destinationSiteId: MULTI_SITE_NETWORK_REMOTE_ID,
        payloadKind: 'asset',
        sourceSchemaId: 'schema:containment-v1',
        destinationSchemaId: 'schema:containment-v1',
        sourceContainmentClass: 'class:stable',
        destinationContainmentClass: 'class:volatile',
        requiredSharedService: 'logistics',
        sharedServiceStatus: 'live',
      })
    ).toMatchObject({
      outcome: 'destabilized',
      failureReason: 'containment_assumption_mismatch',
      transitInstability: true,
    })

    expect(
      evaluateCrossSiteTransfer({
        sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        destinationSiteId: MULTI_SITE_NETWORK_REMOTE_ID,
        payloadKind: 'personnel',
        sourceSchemaId: 'schema:containment-v1',
        destinationSchemaId: 'schema:containment-v1',
        sourceContainmentClass: 'class:stable',
        destinationContainmentClass: 'class:stable',
        requiredSharedService: 'identity',
        sharedServiceStatus: 'degraded',
      })
    ).toMatchObject({
      outcome: 'failed',
      failureReason: 'service_compatibility_mismatch',
    })

    expect(
      evaluateCrossSiteTransfer({
        sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        destinationSiteId: MULTI_SITE_NETWORK_REMOTE_ID,
        payloadKind: 'personnel',
        sourceSchemaId: 'schema:containment-v1',
        destinationSchemaId: 'schema:containment-v1',
        sourceContainmentClass: 'class:stable',
        destinationContainmentClass: 'class:stable',
        requiredSharedService: 'research',
        sharedServiceStatus: 'stale',
      })
    ).toMatchObject({
      outcome: 'destabilized',
      failureReason: 'service_compatibility_mismatch',
      transitInstability: true,
    })

    expect(
      evaluateCrossSiteTransfer({
        sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        destinationSiteId: MULTI_SITE_NETWORK_REMOTE_ID,
        payloadKind: 'asset',
        sourceSchemaId: 'schema:containment-v1',
        destinationSchemaId: 'schema:containment-v1',
        sourceContainmentClass: 'class:stable',
        destinationContainmentClass: 'class:stable',
        requiredSharedService: 'logistics',
        sharedServiceStatus: 'live',
      })
    ).toMatchObject({
      outcome: 'allowed',
      failureReason: 'none',
      transitInstability: false,
      seamlessMovement: false,
    })
  })

  it('rejects same-site or malformed transfer packets', () => {
    expect(
      evaluateCrossSiteTransfer({
        sourceSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        destinationSiteId: MULTI_SITE_NETWORK_PRIMARY_ID,
        payloadKind: 'asset',
        sourceSchemaId: 'schema:a',
        destinationSchemaId: 'schema:a',
        sourceContainmentClass: 'class:stable',
        destinationContainmentClass: 'class:stable',
        requiredSharedService: 'logistics',
        sharedServiceStatus: 'live',
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
