import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_SCAR_IDS,
  isCampaignScarId,
  listCampaignScarIds,
  projectCampaignScarDegradedState,
} from '../domain/campaignScarDegradedState'
import {
  listLivingButLostMoraleMemoryKinds,
  projectLivingButLostMoraleMemory,
} from '../domain/livingButLostMoraleMemoryCatalog'
import {
  isPostLossAdaptationUnlockId,
  isPostLossAdaptationUnlockOutcomeKind,
  listPostLossAdaptationUnlockIds,
  POST_LOSS_PRIMARY_ADAPTATION_UNLOCK_ID,
  projectPostLossAdaptationUnlock,
  validatePostLossAdaptationUnlockInput,
} from '../domain/postLossAdaptationUnlock'

describe('SPE-1051 post-loss adaptation unlock (slice 4)', () => {
  it('exposes the smallest authored unlock set naming a real adaptation', () => {
    expect(listPostLossAdaptationUnlockIds()).toEqual(['stricter_access_rules'])
    expect(POST_LOSS_PRIMARY_ADAPTATION_UNLOCK_ID).toBe('stricter_access_rules')
    expect(isPostLossAdaptationUnlockId('stricter_access_rules')).toBe(true)
    expect(isPostLossAdaptationUnlockId('trauma_care_authority')).toBe(false)
    expect(isPostLossAdaptationUnlockId('forbidden_countermeasures')).toBe(false)
    expect(isPostLossAdaptationUnlockId('better_audits')).toBe(false)
    expect(isPostLossAdaptationUnlockOutcomeKind('adaptation_unlocked')).toBe(true)
    expect(isPostLossAdaptationUnlockOutcomeKind('game_over')).toBe(false)
    expect(isPostLossAdaptationUnlockOutcomeKind('true_defeat')).toBe(false)
  })

  it('AC: configured prior scar history unlocks one named post-loss adaptation', () => {
    const projection = projectPostLossAdaptationUnlock({
      priorScarIds: ['survivor_trauma_scar', 'site_abandonment_scar'],
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('adaptation_unlocked')
    expect(projection.unlockId).toBe('stricter_access_rules')
    expect(projection.preservesPriorCollapseHistory).toBe(true)
    // Authored scar registry order, not input order.
    expect(projection.contributingScarIds).toEqual([
      'site_abandonment_scar',
      'survivor_trauma_scar',
    ])
    expect(projection.contributingMoraleMemoryKinds).toEqual([])
    expect(projection.contributingScarIds.every(isCampaignScarId)).toBe(true)
  })

  it('AC: configured prior catalog history unlocks the same named adaptation', () => {
    const projection = projectPostLossAdaptationUnlock({
      priorMoraleMemoryKinds: ['protective_custody', 'guilt'],
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.outcomeKind).toBe('adaptation_unlocked')
    expect(projection.unlockId).toBe('stricter_access_rules')
    expect(projection.preservesPriorCollapseHistory).toBe(true)
    expect(projection.contributingScarIds).toEqual([])
    // Authored catalog order, not input order.
    expect(projection.contributingMoraleMemoryKinds).toEqual(['guilt', 'protective_custody'])
  })

  it('unlocks from combined scar and catalog prior history without inventing extra unlocks', () => {
    const projection = projectPostLossAdaptationUnlock({
      priorScarIds: ['compromised_doctrine_scar'],
      priorMoraleMemoryKinds: ['distrust', 'refusal'],
    })
    expect(projection?.unlockId).toBe('stricter_access_rules')
    expect(projection?.contributingScarIds).toEqual(['compromised_doctrine_scar'])
    expect(projection?.contributingMoraleMemoryKinds).toEqual(['distrust', 'refusal'])
    expect(listPostLossAdaptationUnlockIds()).toHaveLength(1)
  })

  it('dedupes duplicate history ids deterministically', () => {
    const projection = projectPostLossAdaptationUnlock({
      priorScarIds: ['strained_logistics_scar', 'strained_logistics_scar', 'site_abandonment_scar'],
      priorMoraleMemoryKinds: ['guilt', 'guilt', 'refusal'],
    })
    expect(projection?.contributingScarIds).toEqual([
      'site_abandonment_scar',
      'strained_logistics_scar',
    ])
    expect(projection?.contributingMoraleMemoryKinds).toEqual(['guilt', 'refusal'])
  })

  it('fail-closes omit, empty, unknown, and malformed inputs', () => {
    expect(projectPostLossAdaptationUnlock(null)).toBeUndefined()
    expect(projectPostLossAdaptationUnlock(undefined)).toBeUndefined()
    expect(projectPostLossAdaptationUnlock({} as never)).toBeUndefined()
    expect(projectPostLossAdaptationUnlock({ priorScarIds: [] })).toBeUndefined()
    expect(projectPostLossAdaptationUnlock({ priorMoraleMemoryKinds: [] })).toBeUndefined()
    expect(
      projectPostLossAdaptationUnlock({
        priorScarIds: [],
        priorMoraleMemoryKinds: [],
      })
    ).toBeUndefined()
    expect(
      projectPostLossAdaptationUnlock({
        priorScarIds: ['unknown_scar' as 'site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(
      projectPostLossAdaptationUnlock({
        priorMoraleMemoryKinds: ['institutionalization' as 'guilt'],
      })
    ).toBeUndefined()
    expect(
      projectPostLossAdaptationUnlock({
        priorScarIds: 'site_abandonment_scar' as unknown as readonly ['site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(
      projectPostLossAdaptationUnlock({
        priorMoraleMemoryKinds: 'guilt' as unknown as readonly ['guilt'],
      })
    ).toBeUndefined()
    expect(
      projectPostLossAdaptationUnlock({
        priorScarIds: [null as unknown as 'site_abandonment_scar'],
      })
    ).toBeUndefined()
    expect(validatePostLossAdaptationUnlockInput([])).toBe(false)
    expect(validatePostLossAdaptationUnlockInput('stricter_access_rules')).toBe(false)
    expect(
      validatePostLossAdaptationUnlockInput({
        priorScarIds: ['site_abandonment_scar'],
      })
    ).toBe(true)
  })

  it('is deterministic for identical prior history', () => {
    const input = {
      priorScarIds: ['survivor_trauma_scar', 'site_abandonment_scar'] as const,
      priorMoraleMemoryKinds: ['guilt', 'protective_custody'] as const,
    }
    const a = projectPostLossAdaptationUnlock(input)
    const b = projectPostLossAdaptationUnlock(input)
    expect(a).toEqual(b)
    expect(a).toEqual({
      outcomeKind: 'adaptation_unlocked',
      unlockId: 'stricter_access_rules',
      contributingScarIds: ['site_abandonment_scar', 'survivor_trauma_scar'],
      contributingMoraleMemoryKinds: ['guilt', 'protective_custody'],
      preservesPriorCollapseHistory: true,
    })
  })

  it('does not erase or rewrite original scar or catalog projections', () => {
    const scarProjection = projectCampaignScarDegradedState({
      siteDamage: 80,
      priorScarIds: ['site_abandonment_scar'],
      personnelTurnoverCount: 3,
    })
    expect(scarProjection?.firedScarIds).toContain('site_abandonment_scar')
    expect(scarProjection?.outcomeKind).toBe('degraded_survivable')

    const catalogProjection = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      priorEffectKinds: ['guilt'],
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(catalogProjection?.firedEffectKinds).toEqual(['guilt'])
    expect(catalogProjection?.outcomeKind).toBe('persistent_after_loss')

    const unlock = projectPostLossAdaptationUnlock({
      priorScarIds: scarProjection?.firedScarIds ?? [],
      priorMoraleMemoryKinds: catalogProjection?.firedEffectKinds ?? [],
    })
    expect(unlock?.unlockId).toBe('stricter_access_rules')
    expect(unlock?.preservesPriorCollapseHistory).toBe(true)

    // Re-project originals after unlock — still intact (no shared mutation).
    const scarAgain = projectCampaignScarDegradedState({
      siteDamage: 80,
      priorScarIds: ['site_abandonment_scar'],
      personnelTurnoverCount: 3,
    })
    const catalogAgain = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      priorEffectKinds: ['guilt'],
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(scarAgain).toEqual(scarProjection)
    expect(catalogAgain).toEqual(catalogProjection)

    // Registry / catalog surfaces remain unchanged by this unlock module.
    expect(listCampaignScarIds()).toEqual([...CAMPAIGN_SCAR_IDS])
    expect(listLivingButLostMoraleMemoryKinds()).toEqual([
      'guilt',
      'distrust',
      'refusal',
      'protective_custody',
    ])
  })
})
