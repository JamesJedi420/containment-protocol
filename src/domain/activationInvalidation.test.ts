import { describe, expect, it } from 'vitest'
import {
  evaluateMidActivationInvalidation,
  lookupActivationInvalidation,
  parseActivationInvalidation,
} from './activationInvalidation'

describe('activationInvalidation', () => {
  const valid = {
    id: 'inv-1',
    channelId: 'ch-speech',
    reason: 'channel-broken',
    outcome: 'fail',
    inspectableMessage: 'Sustaining speech channel broken mid-activation',
  }

  it('parses a valid invalidation', () => {
    const result = parseActivationInvalidation(valid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.invalidation.id).toBe('inv-1')
      expect(result.invalidation.outcome).toBe('fail')
    }
  })

  it('rejects unknown reason', () => {
    const result = parseActivationInvalidation({ ...valid, reason: 'unknown' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid-reason')
  })

  it('rejects missing boundary fields', () => {
    const result = parseActivationInvalidation({ id: 'x', channelId: 'c' })
    expect(result.ok).toBe(false)
  })

  it('looks up deterministically', () => {
    const catalog = [valid, { ...valid, id: 'inv-2' }]
    const found = lookupActivationInvalidation(catalog, 'inv-1')
    expect(found.ok).toBe(true)
    const missing = lookupActivationInvalidation(catalog, 'missing')
    expect(missing.ok).toBe(false)
  })

  it('evaluates mid-activation failure when channel not sustained', () => {
    const rule = parseActivationInvalidation(valid)
    expect(rule.ok).toBe(true)
    if (!rule.ok) return
    const broken = evaluateMidActivationInvalidation(
      { channelId: 'ch-speech', sustained: false },
      [rule.invalidation]
    )
    expect(broken).not.toBeNull()
    expect(broken?.outcome).toBe('fail')
    expect(broken?.inspectableMessage).toContain('broken')

    const sustained = evaluateMidActivationInvalidation(
      { channelId: 'ch-speech', sustained: true },
      [rule.invalidation]
    )
    expect(sustained).toBeNull()
  })

  it('distinguishes collapse outcome from fail', () => {
    const collapse = {
      ...valid,
      id: 'inv-collapse',
      outcome: 'collapse',
      reason: 'concentration-broken',
      inspectableMessage: 'Concentration collapsed; activation terminated differently from depletion',
    }
    const result = parseActivationInvalidation(collapse)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.invalidation.outcome).toBe('collapse')
  })
})
