import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildCampaignModuleCompatibilityReport,
  buildCampaignRulesSummary,
  createSeedCampaignLedger,
  getCampaignSettingEffectiveAt,
  getCurrentCampaignRulesLedger,
  sanitizeCampaignLedger,
} from '../domain/campaignLedger'
import { hydrateGame } from '../app/store/runTransfer'

describe('SPE-1734 campaign ledger', () => {
  it('seeds a ledger in starting state with two run modifiers and two enabled modules', () => {
    const game = createStartingState()
    expect(game.campaignLedger).toBeDefined()
    const ledger = getCurrentCampaignRulesLedger(game)
    expect(ledger.runStateModifiers.length).toBeGreaterThanOrEqual(2)
    expect(ledger.moduleToggles.filter((t) => t.enabled).length).toBeGreaterThanOrEqual(2)
    expect(ledger.compatibility.notes.length).toBeGreaterThan(0)
  })

  it('resolves effective tone by week using setting history', () => {
    const game = createStartingState()
    expect(getCampaignSettingEffectiveAt(game, 'toneScopeLabel', 1)).toContain('tactical containment')
    expect(getCampaignSettingEffectiveAt(game, 'toneScopeLabel', 2)).toContain('surreal anomaly')
  })

  it('hydrates missing ledger from fallback without throwing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame({ week: 5, rngSeed: 1, rngState: 1 }, fallback)
    expect(hydrated.campaignLedger).toBeDefined()
    expect(getCurrentCampaignRulesLedger(hydrated).profile.organizationName.length).toBeGreaterThan(0)
  })

  it('sanitizes malformed persisted ledger deterministically', () => {
    const fallback = createSeedCampaignLedger()
    const sanitized = sanitizeCampaignLedger(
      {
        profile: { organizationName: 123 },
        runStateModifiers: [{ id: '', label: 'x', value: 'y' }],
        settingHistory: [{ id: '', settingId: 'toneScopeLabel', value: 'bad', effectiveFromWeek: 0 }],
      },
      fallback
    )
    expect(sanitized.profile.organizationName).toBe(fallback.profile.organizationName)
    expect(sanitized.runStateModifiers).toEqual([])
    expect(sanitized.settingHistory).toEqual([])
  })

  it('535-537 dedupes modifiers/toggles by key (latest wins) and preserves explicit empty arrays', () => {
    const fallback = createSeedCampaignLedger()

    const sanitized = sanitizeCampaignLedger(
      {
        ...fallback,
        runStateModifiers: [
          { id: 'challenge_posture', label: 'Old', value: 'old' },
          { id: 'challenge_posture', label: 'New', value: 'new' },
        ],
        moduleToggles: [
          { moduleId: 'courier_network', label: 'Old', enabled: false },
          { moduleId: 'courier_network', label: 'New', enabled: true },
        ],
      },
      fallback
    )

    expect(sanitized.runStateModifiers).toEqual([
      { id: 'challenge_posture', label: 'New', value: 'new' },
    ])
    expect(sanitized.moduleToggles).toEqual([
      { moduleId: 'courier_network', label: 'New', enabled: true },
    ])

    const cleared = sanitizeCampaignLedger(
      { ...fallback, runStateModifiers: [], moduleToggles: [] },
      fallback
    )
    expect(cleared.runStateModifiers).toEqual([])
    expect(cleared.moduleToggles).toEqual([])
  })

  it('538 dedupes setting history by id and settingId+effectiveFromWeek', () => {
    const fallback = createSeedCampaignLedger()
    const sanitized = sanitizeCampaignLedger(
      {
        ...fallback,
        settingHistory: [
          {
            id: 'hist_a',
            settingId: 'toneScopeLabel',
            value: 'A-old',
            effectiveFromWeek: 2,
            changedAtWeek: 1,
            source: 'seed',
          },
          {
            id: 'hist_a',
            settingId: 'toneScopeLabel',
            value: 'A-new',
            effectiveFromWeek: 2,
            changedAtWeek: 1,
            source: 'seed',
          },
          {
            id: 'hist_b',
            settingId: 'toneScopeLabel',
            value: 'B-wins',
            effectiveFromWeek: 2,
            changedAtWeek: 2,
            source: 'seed',
          },
        ],
      },
      fallback,
      5
    )

    expect(sanitized.settingHistory).toHaveLength(1)
    expect(sanitized.settingHistory[0]).toMatchObject({
      id: 'hist_b',
      value: 'B-wins',
      effectiveFromWeek: 2,
      changedAtWeek: 2,
    })
  })

  it('keeps the chronologically latest setting history rows when capping past 200 entries', () => {
    const base = createSeedCampaignLedger()
    const many = Array.from({ length: 250 }, (_, index) => {
      const week = index + 1
      return {
        id: `hist_tone_${week}`,
        settingId: 'toneScopeLabel',
        value: `VALUE_${week}`,
        effectiveFromWeek: week,
        changedAtWeek: week - 1,
        source: 'seed' as const,
      }
    })
    // Newest-first order would lose late weeks if we capped before sorting.
    many.reverse()

    const game = createStartingState()
    game.campaignLedger = { ...base, settingHistory: many }

    expect(getCurrentCampaignRulesLedger(game).settingHistory).toHaveLength(200)
    expect(getCampaignSettingEffectiveAt(game, 'toneScopeLabel', 250)).toBe('VALUE_250')
  })

  it('preserves intentionally empty persisted setting history', () => {
    const base = createSeedCampaignLedger()
    const sanitized = sanitizeCampaignLedger({ ...base, settingHistory: [] }, base)
    expect(sanitized.settingHistory).toEqual([])
  })

  it('550 dedupes trimmed compatibility notes and warnings (latest wins)', () => {
    const fallback = createSeedCampaignLedger()

    const sanitized = sanitizeCampaignLedger(
      {
        ...fallback,
        compatibility: {
          compatible: true,
          notes: [' Courier note ', 'Courier note', ''],
          warnings: [' warn ', 'warn', ' duplicate warn '],
        },
      },
      fallback
    )

    expect(sanitized.compatibility.notes).toEqual(['Courier note'])
    expect(sanitized.compatibility.warnings).toEqual(['warn', 'duplicate warn'])
  })

  it('preserves intentionally empty compatibility notes through sanitize, hydrate, and summary', () => {
    const base = createSeedCampaignLedger()
    const clearedNotes = {
      ...base,
      compatibility: { ...base.compatibility, notes: [] },
    }
    expect(sanitizeCampaignLedger(clearedNotes, base).compatibility.notes).toEqual([])

    const game = createStartingState()
    game.campaignLedger = clearedNotes
    expect(getCurrentCampaignRulesLedger(game).compatibility.notes).toEqual([])

    const summary = buildCampaignRulesSummary(game)
    expect(summary.compatibilitySummary).toBe('Compatibility · OK (No additional notes.)')
    expect(summary.compatibilitySummary).not.toContain('Courier logistics')

    const seed = createStartingState()
    const hydrated = hydrateGame({ ...seed, campaignLedger: clearedNotes }, seed)
    expect(hydrated.campaignLedger?.compatibility.notes).toEqual([])
  })

  it('builds a compatibility report from enabled modules', () => {
    const game = createStartingState()
    const report = buildCampaignModuleCompatibilityReport(game)
    expect(report.activeModuleIds).toContain('courier_network')
    expect(report.activeModuleIds).toContain('weekly_directives')
    expect(report.compatible).toBe(true)
    expect(report.notes[0]).toMatch(/directive/i)
  })

  it('builds a campaign rules summary for downstream surfaces', () => {
    const game = createStartingState()
    const summary = buildCampaignRulesSummary(game)
    expect(summary.headline).toMatch(/Containment Protocol/)
    expect(summary.lines.some((l) => l.includes('Mid-Atlantic'))).toBe(true)
    expect(summary.compatibilitySummary).toMatch(/Compatibility/)
  })

  it('558 reconciles activeRulesProfileId with registry, label match, and compatibility warnings', () => {
    const fallback = createSeedCampaignLedger()

    const unknownProfile = sanitizeCampaignLedger(
      {
        ...fallback,
        activeRulesProfileId: 'phantom-profile',
        activeRulesProfileLabel: 'Phantom label',
      },
      fallback
    )

    expect(unknownProfile.activeRulesProfileId).toBe('baseline-standard')
    expect(unknownProfile.activeRulesProfileLabel).toBe('Baseline standard containment')
    expect(unknownProfile.compatibility.compatible).toBe(false)
    expect(unknownProfile.compatibility.warnings.some((w) => /unknown active rules profile/i.test(w))).toBe(
      true
    )

    const mismatchedLabel = sanitizeCampaignLedger(
      {
        ...fallback,
        activeRulesProfileLabel: 'Wrong label',
      },
      fallback
    )

    expect(mismatchedLabel.activeRulesProfileLabel).toBe('Baseline standard containment')
    expect(mismatchedLabel.compatibility.compatible).toBe(false)
    expect(
      mismatchedLabel.compatibility.warnings.some((w) => /did not match registry/i.test(w))
    ).toBe(true)
  })

  it('reflects live game.config for mirrored challenge and duration lines (Front Desk presets)', () => {
    const game = createStartingState()
    game.config.challengeModeEnabled = true
    game.config.durationModel = 'attrition'
    const summary = buildCampaignRulesSummary(game)
    expect(summary.lines.some((l) => /Challenge posture · .*challenge mode on/i.test(l))).toBe(true)
    expect(summary.lines.some((l) => /Attrition model/i.test(l))).toBe(true)
  })
})
