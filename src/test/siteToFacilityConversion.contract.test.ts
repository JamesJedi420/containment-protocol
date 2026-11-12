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

const base = {
  siteId: CONVERSION_SITE_ID,
  plotId: CONVERSION_PLOT_ID,
  regionId: CONVERSION_REGION_ID,
  recipe: 'reclaimed_tower' as const,
  ownershipPermissionGranted: true,
  hazardConfidence: 'verified_clear' as const,
  terrainBuildable: true,
  staffingAndMaterialsReady: true,
  siteStable: true,
}

describe('SPE-3362 site-to-facility conversion', () => {
  it('converts a cleared site while preserving site and plot identity', () => {
    const conversion = evaluateSiteToFacilityConversion(base)
    expect(conversion).toMatchObject({
      outcome: 'approved',
      preservesSiteIdentity: true,
      preservesPlotIdentity: true,
      siteId: CONVERSION_SITE_ID,
      plotId: CONVERSION_PLOT_ID,
      facilityAssetId: `facility-from:${CONVERSION_SITE_ID}`,
    })
  })

  it('blocks on hard failures and conditions on unresolved hazard only when otherwise clear', () => {
    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        ownershipPermissionGranted: false,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'missing_claim_or_permission',
    })

    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        hazardConfidence: 'verified_hazard',
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'verified_hazard',
    })

    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        terrainBuildable: false,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'terrain_not_buildable',
    })

    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        staffingAndMaterialsReady: false,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'insufficient_staffing_or_materials',
    })

    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        siteStable: false,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'unstable_site_state',
    })

    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        hazardConfidence: 'unknown',
      })
    ).toMatchObject({
      outcome: 'conditional',
      blockReason: 'unresolved_hazard',
      facilityAssetId: null,
    })

    expect(
      evaluateSiteToFacilityConversion({
        ...base,
        hazardConfidence: 'suspected',
        terrainBuildable: false,
      })
    ).toMatchObject({
      outcome: 'blocked',
      blockReason: 'terrain_not_buildable',
    })
  })

  it('emits register and map packets without duplicating those owners', () => {
    const conversion = evaluateSiteToFacilityConversion({
      ...base,
      recipe: 'converted_outpost',
    })!

    const register = projectConversionRegisterOutput({ conversion })
    expect(register).toMatchObject({
      registerEntryPresent: true,
      facilityAssetId: `facility-from:${CONVERSION_SITE_ID}`,
      recipe: 'converted_outpost',
      duplicatesFacilityOwner: false,
    })

    expect(
      projectConversionRegisterOutput({
        conversion: { ...conversion, facilityAssetId: null },
      })
    ).toBeUndefined()

    const map = projectConversionMapOutput({ conversion })
    expect(map).toMatchObject({
      mapMarkerPresent: true,
      regionId: CONVERSION_REGION_ID,
      duplicatesMapOwner: false,
    })

    expect(
      projectConversionMapOutput({
        conversion: { ...conversion, facilityAssetId: null },
      })
    ).toBeUndefined()
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
