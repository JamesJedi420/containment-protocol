import { describe, expect, it } from 'vitest'
import { parseActivationChannel, ACTIVATION_CHANNEL_KINDS } from './activationChannels'

describe('activationChannels SPE-576 shell', () => {
  it('accepts a valid channel', () => {
    const result = parseActivationChannel({
      id: 'ch-1',
      kind: 'speech',
      triggerRef: 'trig-1',
      requiredSignals: ['sig-a'],
      costTypeRef: 'cost-1',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.channel.kind).toBe('speech')
    }
  })

  it('rejects invalid kind', () => {
    const result = parseActivationChannel({
      id: 'ch-1',
      kind: 'invalid',
      triggerRef: 'trig-1',
      requiredSignals: ['sig-a'],
      costTypeRef: 'cost-1',
    })
    expect(result.ok).toBe(false)
  })

  it('exports kinds', () => {
    expect(ACTIVATION_CHANNEL_KINDS).toContain('speech')
  })
})
