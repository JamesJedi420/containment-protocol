/**
 * Focused tests for SPE-1417 Capability Rollout Breadth & Progressive Expansion Domain Seam
 */
import {
  evaluateCapabilityRollout,
  type CapabilityRolloutInput,
} from '../domain/capabilityRollout'

describe('Capability Rollout Breadth Domain Seam', () => {
  it('blocks expansion when at narrow breadth and no conditions are met', () => {
    const input: CapabilityRolloutInput = {
      state: {
        capabilityId: 'cap-rollout-1',
        initialTier: 'narrow',
        currentTier: 'narrow',
        orgAccessUnlocked: false,
      },
      conditions: {},
    }
    const result = evaluateCapabilityRollout(input)
    expect(result.kind).toBe('blocked')
    expect(result.nextTier).toBeUndefined()
  })

  it('blocks expansion when at unit breadth and no conditions are met', () => {
    const input: CapabilityRolloutInput = {
      state: {
        capabilityId: 'cap-rollout-2',
        initialTier: 'narrow',
        currentTier: 'unit',
        orgAccessUnlocked: false,
      },
      conditions: {
        teachingPassComplete: false,
        requiredInfrastructurePresent: false,
        propagationProgressSufficient: false,
      },
    }
    const result = evaluateCapabilityRollout(input)
    expect(result.kind).toBe('blocked')
    expect(result.nextTier).toBeUndefined()
  })

  it('can expand from narrow to unit when teaching pass is complete', () => {
    const input: CapabilityRolloutInput = {
      state: {
        capabilityId: 'cap-rollout-3',
        initialTier: 'narrow',
        currentTier: 'narrow',
        orgAccessUnlocked: false,
      },
      conditions: {
        teachingPassComplete: true,
      },
    }
    const result = evaluateCapabilityRollout(input)
    expect(result.kind).toBe('can_expand')
    expect(result.nextTier).toBe('unit')
    expect(result.orgAccessUnlocked).toBeUndefined()
  })

  it('can expand from unit to organization when required infrastructure is present', () => {
    const input: CapabilityRolloutInput = {
      state: {
        capabilityId: 'cap-rollout-4',
        initialTier: 'narrow',
        currentTier: 'unit',
        orgAccessUnlocked: false,
      },
      conditions: {
        requiredInfrastructurePresent: true,
      },
    }
    const result = evaluateCapabilityRollout(input)
    expect(result.kind).toBe('can_expand')
    expect(result.nextTier).toBe('organization')
    expect(result.orgAccessUnlocked).toBe(true)
  })

  it('returns at_max_breadth when already at organization tier', () => {
    const input: CapabilityRolloutInput = {
      state: {
        capabilityId: 'cap-rollout-5',
        initialTier: 'narrow',
        currentTier: 'organization',
        orgAccessUnlocked: true,
      },
      conditions: {
        teachingPassComplete: true,
        requiredInfrastructurePresent: true,
        propagationProgressSufficient: true,
      },
    }
    const result = evaluateCapabilityRollout(input)
    expect(result.kind).toBe('at_max_breadth')
    expect(result.nextTier).toBeUndefined()
  })
})
