// Targeted test for protocol material deterministic resolution (SPE-48)
import { describe, it, expect } from 'vitest'
import { protocolMaterialTemplates } from '../protocolMaterialTemplates'
import { resolvePreparation } from '../protocolMaterialRuntime'

describe('ProtocolMaterialTemplate deterministic resolution', () => {
  const template = protocolMaterialTemplates[0]
  it('succeeds with correct skill and method', () => {
    const result = resolvePreparation(template, {
      agentSkill: 3,
      method: 'distillation',
      delivery: 'injection',
    })
    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.effect).toBe(template.effect.effectType)
    } else {
      throw new Error('Expected success outcome')
    }
  })
  it('fails with insufficient skill', () => {
    const result = resolvePreparation(template, {
      agentSkill: 1,
      method: 'distillation',
      delivery: 'injection',
    })
    expect(result.outcome).toBe('failure')
    if (result.outcome === 'failure') {
      expect(result.reason).toMatch(/skill/i)
    } else {
      throw new Error('Expected failure outcome')
    }
  })
  it('fails with wrong method', () => {
    const result = resolvePreparation(template, {
      agentSkill: 3,
      method: 'extraction',
      delivery: 'injection',
    })
    expect(result.outcome).toBe('failure')
    if (result.outcome === 'failure') {
      expect(result.reason).toMatch(/method/i)
    } else {
      throw new Error('Expected failure outcome')
    }
  })
})
