import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { aggregateEquipmentKitEffects, resolveAgentEquipmentKits } from '../domain/kits'

describe('equipment kits', () => {
  it('activates cumulative breach-response thresholds at 2 and 4 pieces', () => {
    const state = createStartingState()
    const caseData = {
      ...state.cases['case-001'],
      kind: 'raid' as const,
      tags: ['breach', 'combat', 'threat'],
      requiredTags: [],
      preferredTags: [],
    }
    const twoPieceAgent = {
      ...state.agents.a_ava,
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
      },
      equipment: {},
    }
    const fourPieceAgent = {
      ...state.agents.a_ava,
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
        headgear: 'breach_visor',
        utility1: 'signal_jammers',
      },
      equipment: {},
    }

    const twoPieceKit = resolveAgentEquipmentKits(twoPieceAgent, {
      agent: twoPieceAgent,
      phase: 'evaluation',
      caseData,
    }).find((kit) => kit.id === 'breach-response-kit')
    const fourPieceKit = resolveAgentEquipmentKits(fourPieceAgent, {
      agent: fourPieceAgent,
      phase: 'evaluation',
      caseData,
    }).find((kit) => kit.id === 'breach-response-kit')

    expect(twoPieceKit).toMatchObject({
      matchedPieceCount: 2,
      activeThresholds: [2],
      highestActiveThreshold: 2,
      statModifiers: {},
    })
    expect(twoPieceKit?.effectivenessMultiplier).toBeCloseTo(1.03, 6)

    expect(fourPieceKit).toMatchObject({
      matchedPieceCount: 4,
      activeThresholds: [2, 4],
      highestActiveThreshold: 4,
      statModifiers: {},
    })
    expect(fourPieceKit?.effectivenessMultiplier).toBeCloseTo(1.0712, 6)
  })

  it('stacks multiple active kits for the same operative deterministically', () => {
    const state = createStartingState()
    const caseData = {
      ...state.cases['case-001'],
      kind: 'raid' as const,
      tags: ['breach', 'combat', 'signal', 'analysis', 'evidence', 'witness'],
      requiredTags: [],
      preferredTags: [],
    }
    const agent = {
      ...state.agents.a_mina,
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
        headgear: 'breach_visor',
        utility1: 'signal_jammers',
        utility2: 'emf_sensors',
      },
      equipment: {},
    }

    const kits = resolveAgentEquipmentKits(agent, {
      agent,
      phase: 'evaluation',
      caseData,
    })
    const effects = aggregateEquipmentKitEffects(kits)

    expect(kits.map((kit) => kit.id)).toEqual(
      expect.arrayContaining(['breach-response-kit', 'investigation-survey-suite'])
    )
    expect(kits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'breach-response-kit',
          activeThresholds: [2, 4],
          highestActiveThreshold: 4,
        }),
        expect.objectContaining({
          id: 'investigation-survey-suite',
          activeThresholds: [2, 3],
          highestActiveThreshold: 3,
        }),
      ])
    )
    expect(effects.statModifiers).toEqual({})
    expect(effects.effectivenessMultiplier).toBeCloseTo(1.1585028, 6)
  })
})
