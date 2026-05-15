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
    expect(sanitized.runStateModifiers.length).toBeGreaterThanOrEqual(2)
    expect(sanitized.settingHistory.every((row) => row.id.length > 0)).toBe(true)
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

  it('reflects live game.config for mirrored challenge and duration lines (Front Desk presets)', () => {
    const game = createStartingState()
    game.config.challengeModeEnabled = true
    game.config.durationModel = 'attrition'
    const summary = buildCampaignRulesSummary(game)
    expect(summary.lines.some((l) => /Challenge posture · .*challenge mode on/i.test(l))).toBe(true)
    expect(summary.lines.some((l) => /Attrition model/i.test(l))).toBe(true)
  })
})
