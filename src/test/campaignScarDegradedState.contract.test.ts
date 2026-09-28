import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_SCAR_IMMEDIATE_LOSS_BOUND,
  isCampaignScarBand,
  isCampaignScarId,
  isCampaignScarModifierId,
  isCampaignScarOutcomeKind,
  listCampaignScarIds,
  listCampaignScarModifierIds,
  projectCampaignScarDegradedState,
  validateCampaignScarDegradedInput,
} from '../domain/campaignScarDegradedState'

describe('SPE-1051 campaign scar / degraded-state registry (slice 1)', () => {
  it('exposes authored scar ids and named modifiers', () => {
    expect(listCampaignScarIds()).toEqual([
      'site_abandonment_scar',
      'strained_logistics_scar',
      'compromised_doctrine_scar',
      'survivor_trauma_scar',
    ])
    expect(listCampaignScarModifierIds()).toEqual([
      'degraded_site_access',
      'logistics_backlog_drag',
      'doctrine_constraint_tightening',
      'morale_memory_drag',
    ])
    expect(isCampaignScarId('site_abandonment_scar')).toBe(true)
    expect(isCampaignScarId('true_defeat')).toBe(false)
    expect(isCampaignScarModifierId('morale_memory_drag')).toBe(true)
    expect(isCampaignScarModifierId('game_over')).toBe(false)
    expect(isCampaignScarBand('critical')).toBe(true)
    expect(isCampaignScarBand('true_defeat')).toBe(false)
    expect(isCampaignScarOutcomeKind('degraded_survivable')).toBe(true)
    expect(isCampaignScarOutcomeKind('game_over')).toBe(false)
  })

  it('AC1: threshold above immediate-loss floor yields degraded scar, not game over', () => {
    expect(projectCampaignScarDegradedState({ siteDamage: 14 })).toMatchObject({
      outcomeKind: 'idle',
      activeScars: [],
      firedScarIds: [],
    })

    const degraded = projectCampaignScarDegradedState({ siteDamage: 15 })
    expect(degraded?.outcomeKind).toBe('degraded_survivable')
    expect(degraded?.firedScarIds).toEqual(['site_abandonment_scar'])
    expect(degraded?.activeScars[0]).toMatchObject({
      scarId: 'site_abandonment_scar',
      band: 'degraded',
      modifierId: 'degraded_site_access',
      triggerKey: 'siteDamage',
      triggerValue: 15,
      chainedFrom: null,
      survivesPersonnelTurnover: true,
    })
    expect(degraded!.activeScars[0]!.effects.siteAccessPenalty).toBe(20)

    // Above immediate-loss bound still projects degraded_survivable (no game-over).
    const nearBound = projectCampaignScarDegradedState({
      siteDamage: CAMPAIGN_SCAR_IMMEDIATE_LOSS_BOUND,
    })
    expect(nearBound?.outcomeKind).toBe('degraded_survivable')
    expect(nearBound?.activeScars[0]?.band).toBe('critical')
    expect(isCampaignScarOutcomeKind(nearBound?.outcomeKind)).toBe(true)
    expect(nearBound?.outcomeKind).not.toBe('game_over')
  })

  it('AC2: cascade links at least two contributing scars', () => {
    const projection = projectCampaignScarDegradedState({ siteDamage: 35 })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('degraded_survivable')
    expect(projection.firedScarIds).toEqual(['site_abandonment_scar', 'strained_logistics_scar'])
    expect(projection.activeScars).toHaveLength(2)
    expect(projection.cascadeContributorScarIds).toEqual([
      'site_abandonment_scar',
      'strained_logistics_scar',
    ])

    const primary = projection.activeScars[0]!
    const chained = projection.activeScars[1]!
    expect(primary).toMatchObject({
      scarId: 'site_abandonment_scar',
      band: 'critical',
      modifierId: 'degraded_site_access',
      chainedFrom: null,
    })
    expect(chained).toMatchObject({
      scarId: 'strained_logistics_scar',
      band: 'degraded',
      modifierId: 'logistics_backlog_drag',
      chainedFrom: 'site_abandonment_scar',
      survivesPersonnelTurnover: true,
    })
    expect(chained.effects.logisticsDrag).toBeGreaterThan(0)
  })

  it('fail-closes omit and malformed inputs', () => {
    expect(projectCampaignScarDegradedState(null)).toBeUndefined()
    expect(projectCampaignScarDegradedState(undefined)).toBeUndefined()
    expect(projectCampaignScarDegradedState({ siteDamage: -1 })).toBeUndefined()
    expect(projectCampaignScarDegradedState({ siteDamage: Number.NaN })).toBeUndefined()
    expect(
      projectCampaignScarDegradedState({ siteDamage: Number.POSITIVE_INFINITY })
    ).toBeUndefined()
    expect(
      projectCampaignScarDegradedState({
        staffLoss: 10,
        confidenceLoss: -0.5,
      })
    ).toBeUndefined()
    expect(
      projectCampaignScarDegradedState({
        priorScarIds: ['not_a_scar' as 'site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(validateCampaignScarDegradedInput([])).toBe(false)
    expect(validateCampaignScarDegradedInput('siteDamage')).toBe(false)
    expect(validateCampaignScarDegradedInput({})).toBe(true)
    expect(
      validateCampaignScarDegradedInput({
        priorScarIds: 'site_abandonment_scar',
      })
    ).toBe(false)
  })

  it('AC3: scars persist under personnel-turnover input', () => {
    const first = projectCampaignScarDegradedState({ siteDamage: 20, staffLoss: 12 })
    expect(first?.firedScarIds).toEqual(['site_abandonment_scar', 'survivor_trauma_scar'])

    const afterTurnover = projectCampaignScarDegradedState({
      personnelTurnoverCount: 8,
      priorScarIds: first!.firedScarIds,
    })
    expect(afterTurnover?.outcomeKind).toBe('degraded_survivable')
    expect(afterTurnover?.firedScarIds).toEqual(['site_abandonment_scar', 'survivor_trauma_scar'])
    expect(afterTurnover?.activeScars.every((scar) => scar.survivesPersonnelTurnover)).toBe(true)
    expect(afterTurnover?.activeScars[0]).toMatchObject({
      scarId: 'site_abandonment_scar',
      band: 'degraded',
      modifierId: 'degraded_site_access',
    })
    expect(afterTurnover?.activeScars[1]).toMatchObject({
      scarId: 'survivor_trauma_scar',
      band: 'degraded',
      modifierId: 'morale_memory_drag',
    })

    // Turnover alone with no priors and no triggers stays idle.
    expect(projectCampaignScarDegradedState({ personnelTurnoverCount: 99 })).toMatchObject({
      outcomeKind: 'idle',
      activeScars: [],
    })
  })

  it('fires doctrine scar from confidence loss; breach folds into site abandonment', () => {
    const doctrine = projectCampaignScarDegradedState({ confidenceLoss: 45 })
    expect(doctrine?.firedScarIds).toEqual(['compromised_doctrine_scar'])
    expect(doctrine?.activeScars[0]).toMatchObject({
      band: 'critical',
      modifierId: 'doctrine_constraint_tightening',
    })

    const breachOnly = projectCampaignScarDegradedState({ breachSeverity: 35 })
    expect(breachOnly?.firedScarIds).toEqual(['site_abandonment_scar', 'strained_logistics_scar'])
    expect(breachOnly?.activeScars[0]?.triggerValue).toBe(35)
  })

  it('returns immutable byte-stable projections on repeat calls', () => {
    const input = Object.freeze({
      siteDamage: 35,
      staffLoss: 10,
      confidenceLoss: 20,
      personnelTurnoverCount: 3,
    })
    const first = projectCampaignScarDegradedState(input)
    const second = projectCampaignScarDegradedState(input)
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first!.activeScars)).toBe(true)
    expect(Object.isFrozen(first!.activeScars[0])).toBe(true)
    expect(Object.isFrozen(first!.activeScars[0]!.effects)).toBe(true)
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.activeScars[0].effects.siteAccessPenalty = 999
    }).toThrow()
  })
})
