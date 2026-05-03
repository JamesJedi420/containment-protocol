/**
 * Focused tests for SPE-27 Capability Dissemination Domain Seam
 */
import { evaluateCapabilityDissemination, CapabilityDisseminationInput, CapabilityDisseminationResultKind } from '../domain/capabilityDissemination'

describe('Capability Dissemination Domain Seam', () => {
  it('allows direct transfer when transferable and recipient eligible', () => {
    const input: CapabilityDisseminationInput = {
      capabilityId: 'cap-1',
      kind: 'skill',
      sourceOwnerId: 'agent-A',
      recipientId: 'agent-B',
      transferable: true,
      recipientEligible: true,
    }
    const result = evaluateCapabilityDissemination(input)
    expect(result.kind).toBe('transferable')
    expect(result.reason).toMatch(/eligible/)
  })

  it('blocks transfer if capability is non-transferable', () => {
    const input: CapabilityDisseminationInput = {
      capabilityId: 'cap-2',
      kind: 'protocol',
      sourceOwnerId: 'agent-A',
      recipientId: 'agent-B',
      transferable: false,
      recipientEligible: true,
    }
    const result = evaluateCapabilityDissemination(input)
    expect(result.kind).toBe('blocked')
    expect(result.reason).toMatch(/non-transferable/)
  })

  it('requires teaching if not eligible but teaching is offered', () => {
    const input: CapabilityDisseminationInput = {
      capabilityId: 'cap-3',
      kind: 'knowledge',
      sourceOwnerId: 'agent-A',
      recipientId: 'agent-B',
      transferable: true,
      recipientEligible: false,
      teachingOffered: true,
    }
    const result = evaluateCapabilityDissemination(input)
    expect(result.kind).toBe('requires_teaching')
    expect(result.teachingWeeks).toBeGreaterThanOrEqual(1)
    expect(result.reason).toMatch(/teaching/)
  })

  it('blocks transfer if not eligible and teaching is not offered', () => {
    const input: CapabilityDisseminationInput = {
      capabilityId: 'cap-4',
      kind: 'protocol',
      sourceOwnerId: 'agent-A',
      recipientId: 'agent-B',
      transferable: true,
      recipientEligible: false,
      teachingOffered: false,
    }
    const result = evaluateCapabilityDissemination(input)
    expect(result.kind).toBe('blocked')
    expect(result.reason).toMatch(/not eligible/)
  })

  it('defaults to blocked if eligibility and transferability are both undefined', () => {
    const input: CapabilityDisseminationInput = {
      capabilityId: 'cap-5',
      kind: 'other',
      sourceOwnerId: 'agent-A',
      recipientId: 'agent-B',
    }
    const result = evaluateCapabilityDissemination(input)
    expect(result.kind).toBe('blocked')
  })
})
