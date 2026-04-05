import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  getEquipmentCatalogEntries,
  resolveEquippedItems,
  validateEquipmentCatalogDefinitions,
  type EquipmentDefinition,
} from '../domain/equipment'

function buildCatalogRecord() {
  return Object.fromEntries(
    getEquipmentCatalogEntries().map((definition) => [definition.id, definition])
  ) as Record<string, EquipmentDefinition>
}

describe('equipment catalog validation', () => {
  it('accepts the live catalog and keeps repeated reads deterministic', () => {
    const first = getEquipmentCatalogEntries()
    const second = getEquipmentCatalogEntries()

    expect(second).toEqual(first)
    expect(() => validateEquipmentCatalogDefinitions(buildCatalogRecord())).not.toThrow()
  })

  it('rejects affix and randomness-style fields in item definitions', () => {
    const invalidCatalog = {
      prototype_item: {
        id: 'prototype_item',
        name: 'Prototype Item',
        slot: 'utility1',
        quality: 1,
        tags: ['analysis'],
        allowedSlots: ['utility1'],
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
        },
        affixes: ['unstable'],
      },
    } as unknown as Record<string, EquipmentDefinition>

    expect(() => validateEquipmentCatalogDefinitions(invalidCatalog)).toThrow(
      /deterministic item design forbids/i
    )
  })

  it('rejects variance-style fields in item context rules', () => {
    const invalidCatalog = {
      prototype_item: {
        id: 'prototype_item',
        name: 'Prototype Item',
        slot: 'utility1',
        quality: 1,
        tags: ['analysis'],
        allowedSlots: ['utility1'],
        statModifiers: {
          cognitive: { analysis: 1, investigation: 1 },
        },
        contextModifiers: [
          {
            rule: {
              requiredTags: ['analysis'],
              variance: 2,
            },
            statModifiers: {
              cognitive: { analysis: 1, investigation: 0 },
            },
          },
        ],
      },
    } as unknown as Record<string, EquipmentDefinition>

    expect(() => validateEquipmentCatalogDefinitions(invalidCatalog)).toThrow(
      /deterministic item design forbids|unexpected key/i
    )
  })

  it('resolves equipped items consistently for the same agent and context', () => {
    const state = createStartingState()
    const agent = {
      ...state.agents.a_ava,
      equipmentSlots: {
        primary: 'silver_rounds',
        armor: 'field_plate',
      },
      equipment: {
        silver_rounds: 2,
        field_plate: 1,
      },
    }
    const currentCase = {
      ...state.cases['case-001'],
      kind: 'raid' as const,
      tags: ['combat', 'breach', 'threat'],
      requiredTags: [],
      preferredTags: [],
    }

    const first = resolveEquippedItems(agent, { caseData: currentCase, teamTags: ['breach'] })
    const second = resolveEquippedItems(agent, { caseData: currentCase, teamTags: ['breach'] })

    expect(second).toEqual(first)
  })
})
