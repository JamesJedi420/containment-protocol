import { describe, expect, it } from 'vitest'
import {
  CONVERSION_PLOT_ID,
  CONVERSION_REGION_ID,
  CONVERSION_SITE_ID,
  evaluateSiteToFacilityConversion,
  projectConversionMapOutput,
  projectConversionRegisterOutput,
  projectConversionSiteHistory,
} from '../domain/siteToFacilityConversion'

describe('SPE-3362 site-to-facility conversion', () => {
  it('converts a cleared site while preserving site and plot identity', () => {
    const conversion = evaluateSiteToFacilityConversion({
      siteId: CONVERSION_SITE_ID,
      plotId: CONVERSION_PLOT_ID,
      regionId: CONVERSION_REGION_ID,
      recipe: 'reclaimed_tower',
      ownershipPermissionGranted: true,
      hazardConfidence: 'verified_clear',
      terrainBuildable: true,
      staffingAndMaterialsReady: true,
      siteStable: true,
    })
    expect(conversion).toMatchObject({
      outcome: 'approved',
      preservesSiteIdentity: true,
      preservesPlotIdentity: true,
      siteId: CONVERSION_SITE_ID,
      plotId: CONVERSION_PLOT_ID,
      facilityAssetId: `facility-from:${CONVERSION_SITE_ID}`,
    })
  })

  it('blocks or conditions conversion when permission/hazard/resources fail', () => {
    expect(
      evaluateSiteToFacilityConversion({
        siteId: CONVERSION_SITE_ID,
        plotId: CONVERSION_PLOT_ID,
        regionId: CONVERSION_REGION_ID,
        recipe: 'secured_lab',
        ownershipPermissionGranted: false,
        hazardConfidence: 'verified_clear',
        terrainBuildable: true,
        staffingAndMaterialsReady: true,
        siteStable: true,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'missing_claim_or_permission',
      facilityAssetId: null,
    })

    expect(
      evaluateSiteToFacilityConversion({
        siteId: CONVERSION_SITE_ID,
        plotId: CONVERSION_PLOT_ID,
        regionId: CONVERSION_REGION_ID,
        recipe: 'secured_lab',
        ownershipPermissionGranted: true,
        hazardConfidence: 'unknown',
        terrainBuildable: true,
        staffingAndMaterialsReady: true,
        siteStable: true,
      })
    ).toMatchObject({
      outcome: 'conditional',
      blockReason: 'unresolved_hazard',
      facilityAssetId: null,
    })

    expect(
      evaluateSiteToFacilityConversion({
        siteId: CONVERSION_SITE_ID,
        plotId: CONVERSION_PLOT_ID,
        regionId: CONVERSION_REGION_ID,
        recipe: 'stabilized_safehouse',
        ownershipPermissionGranted: true,
        hazardConfidence: 'verified_clear',
        terrainBuildable: true,
        staffingAndMaterialsReady: false,
        siteStable: true,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'insufficient_staffing_or_materials',
    })
  })

  it('emits register and map packets without duplicating those owners', () => {
    const conversion = evaluateSiteToFacilityConversion({
      siteId: CONVERSION_SITE_ID,
      plotId: CONVERSION_PLOT_ID,
      regionId: CONVERSION_REGION_ID,
      recipe: 'converted_outpost',
      ownershipPermissionGranted: true,
      hazardConfidence: 'verified_clear',
      terrainBuildable: true,
      staffingAndMaterialsReady: true,
      siteStable: true,
    })!

    const register = projectConversionRegisterOutput({ conversion })
    expect(register).toMatchObject({
      registerEntryPresent: true,
      facilityAssetId: `facility-from:${CONVERSION_SITE_ID}`,
      duplicatesFacilityOwner: false,
    })

    const map = projectConversionMapOutput({ conversion })
    expect(map).toMatchObject({
      mapMarkerPresent: true,
      regionId: CONVERSION_REGION_ID,
      duplicatesMapOwner: false,
    })
  })

  it('keeps site-state history inspectable after conversion', () => {
    const history = projectConversionSiteHistory({
      siteId: CONVERSION_SITE_ID,
      priorSiteState: 'reclaimed_unstable',
      conversionOutcome: 'approved',
      recipe: 'reclaimed_tower',
    })
    expect(history).toMatchObject({
      historyInspectable: true,
      priorSiteState: 'reclaimed_unstable',
      siteErased: false,
    })
  })

  it('fails closed on malformed packets', () => {
    expect(evaluateSiteToFacilityConversion(null)).toBeUndefined()
    expect(projectConversionRegisterOutput(null)).toBeUndefined()
    expect(projectConversionMapOutput(null)).toBeUndefined()
    expect(projectConversionSiteHistory(null)).toBeUndefined()
  })
})
