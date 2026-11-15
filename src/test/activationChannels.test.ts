import { describe, expect, it } from 'vitest'
import {
  lookupActivationChannel,
  matchesActivationSignals,
  parseActivationChannel,
} from '../domain/activationChannels'

describe('activation channel grammar', () => {
  const catalog = [
    {
      id: 'channel:speech',
      kind: 'speech',
      triggerRef: 'trigger:phrase',
      requiredSignals: ['signal:voice'],
      costTypeRef: 'cost:breath',
    },
    {
      id: 'channel:formation',
      kind: 'formation',
      triggerRef: 'trigger:formation',
      requiredSignals: ['signal:positions'],
      costTypeRef: 'cost:time',
    },
    {
      id: 'channel:impact',
      kind: 'physical_disturbance',
      triggerRef: 'trigger:impact',
      requiredSignals: ['signal:impact'],
      costTypeRef: 'cost:material',
    },
  ]

  it('resolves three authored channels with distinct signals, triggers and cost references', () => {
    for (const entry of catalog) {
      const result = lookupActivationChannel(catalog, entry.id)
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error(result.reason)
      expect(result.channel.costTypeRef).toBe(entry.costTypeRef)
      expect(
        matchesActivationSignals(result.channel, {
          kind: result.channel.kind,
          triggerRef: entry.triggerRef,
          signals: entry.requiredSignals,
        })
      ).toBe(true)
    }
  })

  it('requires the configured nonverbal path for a synthetic item action', () => {
    const item = { actionRef: 'action:prepare', channelRef: 'channel:formation' }
    const channel = lookupActivationChannel(catalog, item.channelRef)
    if (!channel.ok) throw new Error(channel.reason)
    expect(
      matchesActivationSignals(channel.channel, {
        kind: 'speech',
        triggerRef: 'trigger:phrase',
        signals: ['signal:voice'],
      })
    ).toBe(false)
    expect(
      matchesActivationSignals(channel.channel, {
        kind: 'formation',
        triggerRef: 'trigger:formation',
        signals: ['signal:positions'],
      })
    ).toBe(true)
  })

  it('does not treat unrelated movement as the authored impact trigger', () => {
    const channel = lookupActivationChannel(catalog, 'channel:impact')
    if (!channel.ok) throw new Error(channel.reason)
    expect(
      matchesActivationSignals(channel.channel, {
        kind: 'physical_disturbance',
        triggerRef: 'trigger:displacement',
        signals: ['signal:impact'],
      })
    ).toBe(false)
    expect(
      matchesActivationSignals(channel.channel, {
        kind: 'physical_disturbance',
        triggerRef: 'trigger:impact',
        signals: [],
      })
    ).toBe(false)
  })

  it('rejects malformed or duplicate declarations and produces stable copied output', () => {
    expect(parseActivationChannel({ ...catalog[0], requiredSignals: new Array(1) })).toMatchObject({
      ok: false,
      reason: 'invalid-signals',
    })
    expect(parseActivationChannel({ ...catalog[0], kind: 'unknown' })).toMatchObject({
      ok: false,
      reason: 'invalid-kind',
    })
    const valid = parseActivationChannel(catalog[0])
    if (!valid.ok) throw new Error(valid.reason)
    expect(
      matchesActivationSignals(
        { ...valid.channel, requiredSignals: [] },
        {
          kind: 'speech',
          triggerRef: 'trigger:phrase',
          signals: [],
        }
      )
    ).toBe(false)
    expect(lookupActivationChannel([catalog[0], catalog[0]], catalog[0].id)).toMatchObject({
      ok: false,
      reason: 'duplicate-id',
    })
    const invalid = { ...catalog[1], kind: 'unknown' }
    expect(lookupActivationChannel([catalog[0], catalog[0], invalid], catalog[0].id)).toEqual({
      ok: false,
      reason: 'invalid-catalog',
    })
    expect(lookupActivationChannel([invalid, catalog[0], catalog[0]], catalog[0].id)).toEqual({
      ok: false,
      reason: 'invalid-catalog',
    })
    const first = lookupActivationChannel(catalog, catalog[0].id)
    expect(first).toEqual(lookupActivationChannel([...catalog].reverse(), catalog[0].id))
    if (!first.ok) throw new Error(first.reason)
    expect(Object.isFrozen(first.channel.requiredSignals)).toBe(true)
  })
})
