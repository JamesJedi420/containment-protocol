import { describe, expect, it } from 'vitest'
import { isCampaignScarId } from '../domain/campaignScarDegradedState'
import {
  isLivingButLostMoraleMemoryCategory,
  isLivingButLostMoraleMemoryGroupKind,
  isLivingButLostMoraleMemoryKind,
  isLivingButLostMoraleMemoryOutcomeKind,
  listLivingButLostMoraleMemoryKinds,
  projectLivingButLostMoraleMemory,
  validateLivingButLostMoraleMemoryInput,
} from '../domain/livingButLostMoraleMemoryCatalog'

describe('SPE-1051 living-but-lost / morale-memory catalog (slice 3)', () => {
  it('exposes authored catalog kinds beyond trauma scar morale_memory_drag', () => {
    expect(listLivingButLostMoraleMemoryKinds()).toEqual([
      'guilt',
      'distrust',
      'refusal',
      'protective_custody',
    ])
    expect(isLivingButLostMoraleMemoryKind('guilt')).toBe(true)
    expect(isLivingButLostMoraleMemoryKind('morale_memory_drag')).toBe(false)
    expect(isLivingButLostMoraleMemoryKind('institutionalization')).toBe(false)
    expect(isLivingButLostMoraleMemoryKind('fugue')).toBe(false)
    expect(isLivingButLostMoraleMemoryCategory('morale_memory')).toBe(true)
    expect(isLivingButLostMoraleMemoryCategory('living_but_lost')).toBe(true)
    expect(isLivingButLostMoraleMemoryGroupKind('survivor')).toBe(true)
    expect(isLivingButLostMoraleMemoryGroupKind('staff')).toBe(true)
    expect(isLivingButLostMoraleMemoryGroupKind('faction')).toBe(false)
    expect(isLivingButLostMoraleMemoryOutcomeKind('persistent_after_loss')).toBe(true)
    expect(isLivingButLostMoraleMemoryOutcomeKind('game_over')).toBe(false)
  })

  it('AC: configured survivor or staff group retains a persistent effect after loss', () => {
    const survivor = projectLivingButLostMoraleMemory({
      effectKind: 'guilt',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(survivor).toBeDefined()
    if (!survivor) throw new Error('missing projection')

    expect(survivor.outcomeKind).toBe('persistent_after_loss')
    expect(survivor.retainedByGroupId).toBe('survivor-cell-a')
    expect(survivor.retainedByGroupKind).toBe('survivor')
    expect(survivor.firedEffectKinds).toEqual(['guilt'])
    expect(survivor.activeEffects).toHaveLength(1)
    expect(survivor.activeEffects[0]).toMatchObject({
      effectKind: 'guilt',
      category: 'morale_memory',
      moraleMemoryDrag: 10,
      livingButLostBurden: 0,
      persistsAcrossPersonnelTurnover: true,
    })
    expect(survivor.relatedScarId).toBe('survivor_trauma_scar')
    expect(isCampaignScarId(survivor.relatedScarId)).toBe(true)

    const staffLost = projectLivingButLostMoraleMemory({
      effectKind: 'protective_custody',
      retainedByGroupId: 'staff-wing-b',
      retainedByGroupKind: 'staff',
    })
    expect(staffLost?.firedEffectKinds).toEqual(['protective_custody'])
    expect(staffLost?.activeEffects[0]).toMatchObject({
      effectKind: 'protective_custody',
      category: 'living_but_lost',
      livingButLostBurden: 20,
      persistsAcrossPersonnelTurnover: true,
    })
  })

  it('projects each authored catalog kind with stable category effects', () => {
    for (const kind of listLivingButLostMoraleMemoryKinds()) {
      const projection = projectLivingButLostMoraleMemory({
        effectKind: kind,
        retainedByGroupId: 'group-1',
        retainedByGroupKind: 'staff',
      })
      expect(projection?.firedEffectKinds).toEqual([kind])
      expect(projection?.activeEffects[0]?.persistsAcrossPersonnelTurnover).toBe(true)
      if (kind === 'protective_custody') {
        expect(projection?.activeEffects[0]?.category).toBe('living_but_lost')
        expect(projection?.activeEffects[0]?.livingButLostBurden).toBeGreaterThan(0)
      } else {
        expect(projection?.activeEffects[0]?.category).toBe('morale_memory')
        expect(projection?.activeEffects[0]?.moraleMemoryDrag).toBeGreaterThan(0)
      }
    }
  })

  it('fail-closes omit and malformed inputs', () => {
    expect(projectLivingButLostMoraleMemory(null)).toBeUndefined()
    expect(projectLivingButLostMoraleMemory(undefined)).toBeUndefined()
    expect(projectLivingButLostMoraleMemory({} as never)).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'guilt',
        retainedByGroupId: '',
        retainedByGroupKind: 'survivor',
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'guilt',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'faction' as 'survivor',
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'fugue' as 'guilt',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'survivor',
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'morale_memory_drag' as 'guilt',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'survivor',
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'survivor',
      } as never)
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'survivor',
        priorEffectKinds: [],
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'distrust',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'staff',
        personnelTurnoverCount: -1,
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'distrust',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'staff',
        personnelTurnoverCount: Number.NaN,
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'refusal',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'staff',
        relatedScarId: 'not_a_scar' as 'survivor_trauma_scar',
      })
    ).toBeUndefined()
    expect(
      projectLivingButLostMoraleMemory({
        effectKind: 'guilt',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'survivor',
        priorEffectKinds: ['not_an_effect' as 'guilt'],
      })
    ).toBeUndefined()
    expect(validateLivingButLostMoraleMemoryInput([])).toBe(false)
    expect(validateLivingButLostMoraleMemoryInput('guilt')).toBe(false)
    expect(
      validateLivingButLostMoraleMemoryInput({
        effectKind: 'guilt',
        retainedByGroupId: 'g1',
        retainedByGroupKind: 'survivor',
      })
    ).toBe(true)
  })

  it('persists catalog effects across personnel turnover via priorEffectKinds', () => {
    const first = projectLivingButLostMoraleMemory({
      effectKind: 'distrust',
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(first?.firedEffectKinds).toEqual(['distrust'])

    const afterTurnover = projectLivingButLostMoraleMemory({
      retainedByGroupId: 'survivor-cell-a',
      retainedByGroupKind: 'survivor',
      personnelTurnoverCount: 8,
      priorEffectKinds: first!.firedEffectKinds,
      relatedScarId: 'survivor_trauma_scar',
    })
    expect(afterTurnover?.outcomeKind).toBe('persistent_after_loss')
    expect(afterTurnover?.firedEffectKinds).toEqual(['distrust'])
    expect(afterTurnover?.personnelTurnoverCount).toBe(8)
    expect(
      afterTurnover?.activeEffects.every((effect) => effect.persistsAcrossPersonnelTurnover)
    ).toBe(true)
    expect(afterTurnover?.relatedScarId).toBe('survivor_trauma_scar')

    const merged = projectLivingButLostMoraleMemory({
      effectKind: 'refusal',
      retainedByGroupId: 'staff-wing-b',
      retainedByGroupKind: 'staff',
      personnelTurnoverCount: 3,
      priorEffectKinds: ['guilt', 'protective_custody'],
    })
    expect(merged?.firedEffectKinds).toEqual(['guilt', 'refusal', 'protective_custody'])
    expect(merged?.activeEffects.map((effect) => effect.effectKind)).toEqual([
      'guilt',
      'refusal',
      'protective_custody',
    ])
  })

  it('returns immutable byte-stable projections on repeat calls', () => {
    const input = Object.freeze({
      effectKind: 'protective_custody' as const,
      retainedByGroupId: 'staff-wing-b',
      retainedByGroupKind: 'staff' as const,
      priorEffectKinds: Object.freeze(['guilt', 'distrust'] as const),
      personnelTurnoverCount: 2,
      relatedScarId: 'survivor_trauma_scar' as const,
    })
    const first = projectLivingButLostMoraleMemory(input)
    const second = projectLivingButLostMoraleMemory(input)
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first!.activeEffects)).toBe(true)
    expect(Object.isFrozen(first!.activeEffects[0])).toBe(true)
    expect(Object.isFrozen(first!.firedEffectKinds)).toBe(true)
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.activeEffects[0].moraleMemoryDrag = 999
    }).toThrow()
  })
})
