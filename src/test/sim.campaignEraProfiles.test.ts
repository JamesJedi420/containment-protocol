import { describe, expect, it } from 'vitest'
import {
  createCampaignEraProfilePacket,
  deriveCampaignEraOverlay,
  hasSuppressedInteractionSurface,
  type CampaignEraProfileInput,
} from '../domain/campaignEraProfiles'

function makeMixedEraProfile(): CampaignEraProfileInput {
  return {
    profileId: 'profile:frontier-cathedral-blackpowder',
    label: 'Frontier Cathedral Blackpowder',
    eraLayers: ['medieval', 'renaissance', 'colonial'],
    allowedRoles: ['officer', 'preacher', 'scholar', 'forester', 'gunsmith'],
    suppressedRoles: ['wizard', 'bard'],
    availableEquipmentCategories: [
      'blackpowder',
      'field_medicine',
      'plate_armor',
      'ritual_implements',
    ],
    suppressedEquipmentCategories: ['printing_press'],
    enabledPowerFamilies: ['alchemy', 'folk_rite', 'miracle'],
    suppressedPowerFamilies: ['arcane'],
    moneyModel: 'mercantile_credit',
    prevalentMonsterFamilies: ['frontier_predator', 'occult_revenant'],
    settlementStyleHints: ['cathedral_city', 'colonial_outpost', 'fortified_market_town'],
    suppressedInteractionSurfaces: ['wizard_colleges', 'bardic_spellcasting'],
  }
}

describe('campaignEraProfiles', () => {
  it('builds a deterministic mixed-era campaign profile packet', () => {
    const packet = createCampaignEraProfilePacket(makeMixedEraProfile())

    expect(packet).toEqual({
      profileId: 'profile:frontier-cathedral-blackpowder',
      label: 'Frontier Cathedral Blackpowder',
      eraLayers: ['colonial', 'medieval', 'renaissance'],
      allowedRoles: ['forester', 'gunsmith', 'officer', 'preacher', 'scholar'],
      suppressedRoles: ['bard', 'wizard'],
      availableEquipmentCategories: [
        'blackpowder',
        'field_medicine',
        'plate_armor',
        'ritual_implements',
      ],
      suppressedEquipmentCategories: ['printing_press'],
      enabledPowerFamilies: ['alchemy', 'folk_rite', 'miracle'],
      suppressedPowerFamilies: ['arcane'],
      moneyModel: 'mercantile_credit',
      prevalentMonsterFamilies: ['frontier_predator', 'occult_revenant'],
      settlementStyleHints: ['cathedral_city', 'colonial_outpost', 'fortified_market_town'],
      suppressedInteractionSurfaces: ['bardic_spellcasting', 'wizard_colleges'],
    })
  })

  it('rewrites multiple subsystem-facing outputs at once through one era overlay', () => {
    const overlay = deriveCampaignEraOverlay(createCampaignEraProfilePacket(makeMixedEraProfile()))

    expect(overlay.mixedEra).toBe(true)
    expect(overlay.roleAccess).toEqual({
      allowed: ['forester', 'gunsmith', 'officer', 'preacher', 'scholar'],
      suppressed: ['bard', 'wizard'],
    })
    expect(overlay.equipmentAvailability).toEqual({
      available: ['blackpowder', 'field_medicine', 'plate_armor', 'ritual_implements'],
      suppressed: ['printing_press'],
    })
    expect(overlay.powerAvailability).toEqual({
      enabled: ['alchemy', 'folk_rite', 'miracle'],
      suppressed: ['arcane'],
    })
    expect(overlay.moneyModel).toBe('mercantile_credit')
    expect(overlay.settlementStyleHints).toEqual([
      'cathedral_city',
      'colonial_outpost',
      'fortified_market_town',
    ])
  })

  it('suppresses interaction surfaces because of era state', () => {
    const packet = createCampaignEraProfilePacket(makeMixedEraProfile())
    const overlay = deriveCampaignEraOverlay(packet)

    expect(hasSuppressedInteractionSurface(packet)).toBe(true)
    expect(overlay.suppressedInteractionSurfaces).toEqual([
      'bardic_spellcasting',
      'wizard_colleges',
    ])
    expect(overlay.powerAvailability.suppressed).toContain('arcane')
  })

  it('correctly flags single-era profiles as not mixed-era and empty-suppressed profiles as having no suppressed surfaces', () => {
    const singleEraPacket = createCampaignEraProfilePacket({
      profileId: 'profile:pure-medieval',
      label: 'Pure Medieval',
      eraLayers: ['medieval'],
      allowedRoles: ['officer', 'preacher'],
      availableEquipmentCategories: ['plate_armor', 'ritual_implements'],
      enabledPowerFamilies: ['miracle', 'folk_rite'],
      moneyModel: 'coinage',
      prevalentMonsterFamilies: ['undead', 'goblinoid'],
      settlementStyleHints: ['fortified_market_town', 'cathedral_city'],
    })
    const overlay = deriveCampaignEraOverlay(singleEraPacket)

    expect(overlay.mixedEra).toBe(false)
    expect(hasSuppressedInteractionSurface(singleEraPacket)).toBe(false)
    expect(overlay.suppressedInteractionSurfaces).toEqual([])
    expect(overlay.roleAccess.suppressed).toEqual([])
    expect(overlay.powerAvailability.suppressed).toEqual([])
  })

  it('remains deterministic for identical mixed-era profile input', () => {
    const firstPacket = createCampaignEraProfilePacket(makeMixedEraProfile())
    const secondPacket = createCampaignEraProfilePacket(makeMixedEraProfile())

    expect(secondPacket).toEqual(firstPacket)
    expect(deriveCampaignEraOverlay(secondPacket)).toEqual(deriveCampaignEraOverlay(firstPacket))
  })
})
