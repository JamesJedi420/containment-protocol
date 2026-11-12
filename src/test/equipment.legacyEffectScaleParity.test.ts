import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildAgentEquipmentSummary,
  getEquipmentDefinition,
  isEquipmentPrerequisiteSatisfied,
  mergeEquipmentStatModifiers,
  resolveEquippedItems,
} from '../domain/equipment'
import { computeTeamScore } from '../domain/sim/scoring'

function buildAdvancedReconAgent() {
  const base = createStartingState().agents.a_mina

  return {
    ...base,
    role: 'field_recon' as const,
    level: 2,
    progression: {
      ...base.progression!,
      level: 2,
      certifications: {
        ...base.progression?.certifications,
        'field-systems-cert': {
          certificationId: 'field-systems-cert',
          state: 'certified' as const,
        },
      },
    },
    equipmentSlots: {
      headgear: 'advanced_recon_suite',
      secondary: 'anomaly_scanner',
    },
    equipmentEffectScales: {
      advanced_recon_suite: 2,
      anomaly_scanner: 1,
    },
  }
}

describe('legacy equipment effect-scale parity', () => {
  it('preserves base, contextual, and enchantment scaling through canonical item resolution', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      kind: 'case' as const,
      tags: ['field', 'evidence'],
      requiredTags: [],
      preferredTags: [],
    }
    const advancedItem = resolveEquippedItems(buildAdvancedReconAgent(), {
      caseData: currentCase,
    }).find((item) => item.id === 'advanced_recon_suite')

    expect(advancedItem).toMatchObject({
      legacyEffectScale: 2,
      rarity: 'rare',
      contextActive: true,
      baseModifiers: {
        tactical: { awareness: 8, reaction: 4 },
        cognitive: { analysis: 4, investigation: 4 },
        technical: { equipment: 2, anomaly: 0 },
      },
      activeModifiers: {
        tactical: { awareness: 4, reaction: 2 },
        cognitive: { analysis: 2, investigation: 2 },
      },
      statModifiers: {
        tactical: { awareness: 14, reaction: 8 },
        cognitive: { analysis: 8, investigation: 8 },
        technical: { equipment: 2, anomaly: 0 },
      },
    })
    expect(advancedItem?.activeEnchantments.map((enchantment) => enchantment.id)).toEqual([
      'clarity',
      'vigilance',
    ])
  })

  it('preserves set bonuses, prerequisites, loadout aggregation, and rarity independence', () => {
    const state = createStartingState()
    const base = state.agents.a_ava
    const setAgent = {
      ...base,
      role: 'hunter' as const,
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
        utility1: 'combat_stims',
      },
    }
    const items = resolveEquippedItems(setAgent)
    const withoutSet = mergeEquipmentStatModifiers(items, false)
    const withSet = mergeEquipmentStatModifiers(items, true)
    const advancedAgent = buildAdvancedReconAgent()
    const lowLevelAgent = {
      ...advancedAgent,
      level: 1,
      progression: { ...advancedAgent.progression, level: 1 },
    }

    expect(withSet.physical?.strength).toBe((withoutSet.physical?.strength ?? 0) + 3)
    expect(withSet.physical?.endurance).toBe((withoutSet.physical?.endurance ?? 0) + 4)
    expect(withSet.tactical?.awareness).toBe((withoutSet.tactical?.awareness ?? 0) + 1)
    expect(withSet.tactical?.reaction).toBe((withoutSet.tactical?.reaction ?? 0) + 3)
    expect(withSet.stability?.resistance).toBe((withoutSet.stability?.resistance ?? 0) + 1)
    expect(isEquipmentPrerequisiteSatisfied(lowLevelAgent, 'advanced_recon_suite')).toBe(false)
    expect(isEquipmentPrerequisiteSatisfied(advancedAgent, 'advanced_recon_suite')).toBe(true)
    expect(buildAgentEquipmentSummary(advancedAgent).loadoutEffectScale).toBe(3)
    expect(getEquipmentDefinition('advanced_recon_suite')).toMatchObject({
      legacyEffectScale: 2,
      rarity: 'rare',
    })
    expect(getEquipmentDefinition('ritual_components')).toMatchObject({
      legacyEffectScale: 1,
      rarity: 'rare',
    })
  })

  it('keeps canonical scoring deterministic with the renamed aggregate', () => {
    const state = createStartingState()
    const currentCase = {
      ...state.cases['case-001'],
      tags: ['field', 'evidence', 'analysis'],
      requiredTags: [],
      preferredTags: [],
    }
    const agent = buildAdvancedReconAgent()
    const first = computeTeamScore([agent], currentCase)
    const second = computeTeamScore([agent], currentCase)

    expect(second).toEqual(first)
    expect(first.equipmentSummary.loadout.loadoutEffectScale).toBe(3)
    expect(first.score).toBeCloseTo(58.492, 12)
  })
})
