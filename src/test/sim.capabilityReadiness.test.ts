/**
 * Focused tests for SPE-1339 Learned-vs-Operationally-Ready Separation Domain Seam
 */
import { evaluateCapabilityReadiness, CapabilityReadinessInput, CapabilityReadinessResultKind } from '../domain/capabilityReadiness'

describe('Capability Readiness Domain Seam', () => {
  it('marks as operationally ready when learned and conditions met', () => {
    const input: CapabilityReadinessInput = {
      capabilityId: 'cap-1',
      kind: 'skill',
      ownerId: 'agent-A',
      learned: true,
      readinessConditionsMet: true,
    }
    const result = evaluateCapabilityReadiness(input)
    expect(result.kind).toBe('operationally_ready')
    expect(result.reason).toMatch(/learned and operational readiness conditions are met/)
  })

  it('marks as operationally ready when inherently ready', () => {
    const input: CapabilityReadinessInput = {
      capabilityId: 'cap-2',
      kind: 'protocol',
      ownerId: 'agent-A',
      learned: true,
      inherentlyReady: true,
    }
    const result = evaluateCapabilityReadiness(input)
    expect(result.kind).toBe('operationally_ready')
    expect(result.reason).toMatch(/learned and operational readiness conditions are met/)
  })

  it('marks as learned but not ready when learned but conditions not met', () => {
    const input: CapabilityReadinessInput = {
      capabilityId: 'cap-3',
      kind: 'knowledge',
      ownerId: 'agent-A',
      learned: true,
      readinessConditionsMet: false,
      inherentlyReady: false,
    }
    const result = evaluateCapabilityReadiness(input)
    expect(result.kind).toBe('learned_but_not_ready')
    expect(result.readinessWeeks).toBeGreaterThanOrEqual(1)
    expect(result.reason).toMatch(/learned but operational readiness conditions are not met/)
  })

  it('blocks if capability has not been learned', () => {
    const input: CapabilityReadinessInput = {
      capabilityId: 'cap-4',
      kind: 'other',
      ownerId: 'agent-A',
      learned: false,
    }
    const result = evaluateCapabilityReadiness(input)
    expect(result.kind).toBe('blocked')
    expect(result.reason).toMatch(/has not been learned/)
  })
})