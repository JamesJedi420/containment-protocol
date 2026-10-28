import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildAgencyEstablishmentProjection } from './agencyEstablishmentProjection'
import { sanitizeCampaignLedger } from './campaignLedger'
import {
  createAnonymousCommandIdentity,
  projectCampaignCommandIdentity,
  resolvePresetCommandIdentity,
  sanitizeCampaignCommandIdentity,
  validateCampaignCommandIdentity,
} from './campaignCommandIdentity'

describe('campaignCommandIdentity (SPE-3172)', () => {
  it('supports anonymous, preset, and custom modes through one schema', () => {
    const anonymous = createAnonymousCommandIdentity()
    expect(anonymous.mode).toBe('anonymous')
    expect(anonymous.displayName).toBeNull()

    const preset = resolvePresetCommandIdentity('director-measured')
    expect(preset?.mode).toBe('preset')
    expect(preset?.displayName).toBe('Director Hale')

    const custom = validateCampaignCommandIdentity({
      mode: 'custom',
      displayName: 'Jordan Quill',
      title: 'Acting Director',
      pronouns: 'he/him',
      biography: 'A custom managerial persona.',
    })
    expect(custom.ok).toBe(true)
    if (!custom.ok) return
    expect(custom.identity.mode).toBe('custom')
    expect(custom.identity.displayName).toBe('Jordan Quill')
    expect(custom.identity.presetId).toBeNull()
  })

  it('fails closed on malformed identity and hydrates legacy absence to anonymous', () => {
    expect(validateCampaignCommandIdentity({ mode: 'custom' }).ok).toBe(false)
    expect(validateCampaignCommandIdentity({ mode: 'preset', presetId: 'nope' }).ok).toBe(
      false
    )
    expect(sanitizeCampaignCommandIdentity(undefined).mode).toBe('anonymous')
    expect(sanitizeCampaignCommandIdentity(5).mode).toBe('anonymous')
    expect(sanitizeCampaignCommandIdentity({ mode: 'wizard' }).mode).toBe('anonymous')
  })

  it('round-trips through campaign ledger sanitize without copying organization fields', () => {
    const base = createStartingState().campaignLedger!
    const withPersona = sanitizeCampaignLedger(
      {
        ...base,
        commandIdentity: {
          mode: 'custom',
          displayName: 'Jordan Quill',
          title: 'Acting Director',
        },
      },
      base
    )
    expect(withPersona.commandIdentity?.displayName).toBe('Jordan Quill')
    expect(withPersona.profile.organizationName).toBe(base.profile.organizationName)
    expect(withPersona.commandIdentity).not.toHaveProperty('organizationName')

    const legacy = sanitizeCampaignLedger(
      {
        profile: base.profile,
        activeRulesProfileId: base.activeRulesProfileId,
        activeRulesProfileLabel: base.activeRulesProfileLabel,
        runStateModifiers: base.runStateModifiers,
        moduleToggles: base.moduleToggles,
        settingHistory: base.settingHistory,
        compatibility: base.compatibility,
      },
      base
    )
    expect(legacy.commandIdentity?.mode).toBe('anonymous')
  })

  it('projects into agency-establishment without mutating simulation outcomes', () => {
    const game = createStartingState()
    const beforeFunding = game.funding
    const beforeWeek = game.week
    game.campaignLedger = sanitizeCampaignLedger(
      {
        ...game.campaignLedger,
        commandIdentity: resolvePresetCommandIdentity('founder-stern'),
      },
      game.campaignLedger!
    )

    const projection = buildAgencyEstablishmentProjection(game)
    expect(projection.commandIdentity.mode).toBe('preset')
    expect(projection.commandIdentity.displayName).toBe('Founder Voss')
    expect(projection.commandIdentity.organizationName).toBe(
      game.campaignLedger!.profile.organizationName
    )
    expect(projection.commandIdentity.isAnonymous).toBe(false)
    expect(game.funding).toBe(beforeFunding)
    expect(game.week).toBe(beforeWeek)

    const consumer = projectCampaignCommandIdentity(game.campaignLedger!.commandIdentity!)
    expect(JSON.stringify(consumer)).not.toMatch(/actorId|health|inventory|clearance/i)
  })
})
