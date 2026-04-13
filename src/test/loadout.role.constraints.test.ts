import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildAgentLoadoutReadinessSummary,
  getRoleCompatibleEquipmentDefinitions,
  validateAgentLoadoutAssignment,
} from '../domain/equipment'
import { equipAgentItem } from '../domain/sim/equipment'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('role-specific loadouts', () => {
  it('returns deterministic role-compatible options per slot', () => {
    const first = getRoleCompatibleEquipmentDefinitions('utility1', 'tech')
    const second = getRoleCompatibleEquipmentDefinitions('utility1', 'tech')

    expect(second).toEqual(first)
    expect(first.length).toBeGreaterThan(0)
  })

  it('validates role and slot constraints explicitly', () => {
    const state = createStartingState()
    const tech = state.agents.a_rook

    const valid = validateAgentLoadoutAssignment(tech, 'utility1', 'signal_jammers')
    const invalidRole = validateAgentLoadoutAssignment(tech, 'utility1', 'medkits')
    const invalidSlot = validateAgentLoadoutAssignment(tech, 'armor', 'signal_jammers')

    expect(valid.valid).toBe(true)
    expect(invalidRole.valid).toBe(false)
    expect(invalidRole.blockingIssues).toContain('role-incompatible')
    expect(invalidSlot.valid).toBe(false)
    expect(invalidSlot.blockingIssues).toContain('slot-incompatible')
  })

  it('returns structured validation details with inventory implications and readiness projections', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const result = validateAgentLoadoutAssignment(state.agents.a_rook, 'utility1', 'signal_jammers', {
      state,
    })

    expect(result.valid).toBe(true)
    expect(result.blockingIssues).toEqual([])
    expect(result.conflicts).toEqual([])
    expect(result.readinessSummary.current.agentId).toBe('a_rook')
    expect(result.readinessSummary.projected.agentId).toBe('a_rook')
    expect(result.inventoryImplications).toMatchObject({
      availableStock: 1,
      consumesFromStock: true,
      deltas: expect.arrayContaining([
        expect.objectContaining({ itemId: 'signal_jammers', delta: -1 }),
      ]),
    })
  })

  it('applies deterministic prerequisite gates for advanced equipment', () => {
    const state = createStartingState()
    state.inventory.advanced_recon_suite = 1
    state.agents.a_rook = {
      ...state.agents.a_rook,
      level: 1,
      progression: {
        ...(state.agents.a_rook.progression ?? {
          xp: 0,
          level: 1,
          potentialTier: 'B',
          growthProfile: 'balanced',
        }),
        level: 1,
      },
    }

    const result = validateAgentLoadoutAssignment(
      state.agents.a_rook,
      'headgear',
      'advanced_recon_suite',
      { state }
    )

    expect(result.valid).toBe(false)
    expect(result.blockingIssues).toContain('prerequisite-level-gate')
  })

  it('blocks loadout assignments when required certifications are missing', () => {
    const state = createStartingState()
    state.inventory.advanced_recon_suite = 1
    state.agents.a_rook = {
      ...state.agents.a_rook,
      level: 2,
      progression: {
        ...(state.agents.a_rook.progression ?? {
          xp: 0,
          level: 2,
          potentialTier: 'B',
          growthProfile: 'balanced',
        }),
        level: 2,
        certifications: {
          ...(state.agents.a_rook.progression?.certifications ?? {}),
        },
      },
    }

    const result = validateAgentLoadoutAssignment(
      state.agents.a_rook,
      'headgear',
      'advanced_recon_suite',
      { state }
    )

    expect(result.valid).toBe(false)
    expect(result.blockingIssues).toContain('prerequisite-certification-gate')
    expect(result.warnings.some((warning) => warning.startsWith('missing-certifications:'))).toBe(
      true
    )
  })

  it('surfaces singleton lock and inventory-unavailable when no transferable owner exists', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 0
    state.agents.a_mina = {
      ...state.agents.a_mina,
      equipmentSlots: {
        ...(state.agents.a_mina.equipmentSlots ?? {}),
        utility1: 'signal_jammers',
      },
      equipment: {
        ...(state.agents.a_mina.equipment ?? {}),
        signal_jammers: 1,
      },
      assignment: {
        state: 'assigned',
        teamId: 't_nightwatch',
        caseId: 'case-001',
        startedWeek: 1,
      },
    }

    const result = validateAgentLoadoutAssignment(state.agents.a_casey, 'utility1', 'signal_jammers', {
      state,
    })

    expect(result.valid).toBe(false)
    expect(result.blockingIssues).toEqual(
      expect.arrayContaining(['inventory-unavailable', 'singleton-locked'])
    )
  })

  it('builds compact readiness summaries for downstream systems', () => {
    const state = createStartingState()
    state.inventory.signal_jammers = 1

    const equipped = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')
    const readiness = buildAgentLoadoutReadinessSummary(equipped.agents.a_rook)

    expect(readiness).toMatchObject({
      agentId: 'a_rook',
      role: 'tech',
      equippedItemCount: 1,
      compatibleItemCount: 1,
    })
    expect(['ready', 'partial', 'blocked']).toContain(readiness.readiness)
  })

  it('preserves equipped loadouts through save/load', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')

    const roundTripped = loadGameSave(serializeGameSave(state))

    expect(roundTripped.agents.a_rook.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(roundTripped.inventory.signal_jammers).toBe(0)
  })
})
