// SPE-1267: Civic access pressure channel — slices 1–3 unit tests
import { describe, it, expect } from 'vitest'
import { createCivicAccessPacket, aggregateSiteAccessPressureModifier, decayAccessPackets } from '../domain/civicAccessChannel'

describe('SPE-1267: createCivicAccessPacket', () => {
  it('normalizes packetId and siteId tokens', () => {
    const p = createCivicAccessPacket({
      packetId: '  Sector 7 / Alpha ',
      siteId: '  NORTH GATE ',
      week: 3,
      accessSignal: 0.5,
    })
    expect(p.packetId).toBe('sector-7-alpha')
    expect(p.siteId).toBe('north-gate')
  })

  it('clamps accessSignal below 0 to 0', () => {
    const p = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: -0.5 })
    expect(p.accessSignal).toBe(0)
  })

  it('clamps accessSignal above 1 to 1', () => {
    const p = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: 2.5 })
    expect(p.accessSignal).toBe(1)
  })

  it('clamps decayRate to [0,1]', () => {
    const lo = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: 0.5, decayRate: -1 })
    const hi = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: 0.5, decayRate: 5 })
    expect(lo.decayRate).toBe(0)
    expect(hi.decayRate).toBe(1)
  })

  it('defaults decayRate to 0.05 when not provided', () => {
    const p = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: 0.5 })
    expect(p.decayRate).toBe(0.05)
  })

  it('defaults blocked to false when not provided', () => {
    const p = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: 0.5 })
    expect(p.blocked).toBe(false)
  })

  it('sets blocked to true when explicitly provided', () => {
    const p = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 1, accessSignal: 0.8, blocked: true })
    expect(p.blocked).toBe(true)
  })

  it('is deterministic — identical input produces identical output', () => {
    const input = { packetId: 'pkt-abc', siteId: 'site-x', week: 5, accessSignal: 0.6, blocked: false, decayRate: 0.1 }
    const a = createCivicAccessPacket(input)
    const b = createCivicAccessPacket(input)
    expect(a).toEqual(b)
  })

  it('normalizes week: fractional input truncated and floored at 1', () => {
    const p = createCivicAccessPacket({ packetId: 'p1', siteId: 's1', week: 0.9, accessSignal: 0.5 })
    expect(p.week).toBe(1)
  })
})

  function makePacket(overrides: {
    packetId: string
    siteId?: string
    accessSignal?: number
    blocked?: boolean
  }) {
    return createCivicAccessPacket({
      packetId: overrides.packetId,
      siteId: overrides.siteId ?? 'site-a',
      week: 1,
      accessSignal: overrides.accessSignal ?? 0.8,
      blocked: overrides.blocked,
    })
  }

  describe('SPE-1267: aggregateSiteAccessPressureModifier', () => {
    it('returns zero boost and no-access-pressure reason for empty packets', () => {
      const result = aggregateSiteAccessPressureModifier([], 'site-a')
      expect(result.pressureBoost).toBe(0)
      expect(result.reasonFragment).toBe('no access pressure')
      expect(result.appliedPacketIds).toEqual([])
    })

    it('returns zero boost and no-access-pressure reason for unmatched site', () => {
      const packets = [makePacket({ packetId: 'p1', siteId: 'site-b' })]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.pressureBoost).toBe(0)
      expect(result.reasonFragment).toBe('no access pressure')
    })

    it('open packets contribute negative boost (suppression)', () => {
      const packets = [makePacket({ packetId: 'p1', accessSignal: 1.0, blocked: false })]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.pressureBoost).toBeCloseTo(-0.15, 5)
      expect(result.blockedCount).toBe(0)
    })

    it('blocked packets contribute positive boost', () => {
      const packets = [makePacket({ packetId: 'p1', accessSignal: 1.0, blocked: true })]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.pressureBoost).toBeCloseTo(0.12, 5)
      expect(result.blockedCount).toBe(1)
    })

    it('mixed packets sum correctly', () => {
      const packets = [
        makePacket({ packetId: 'p1', accessSignal: 1.0, blocked: false }),
        makePacket({ packetId: 'p2', accessSignal: 1.0, blocked: true }),
      ]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.pressureBoost).toBeCloseTo(-0.03, 5) // −0.15 + 0.12
    })

    it('clamps pressureBoost to −0.2 minimum', () => {
      const packets = [
        makePacket({ packetId: 'p1', accessSignal: 1.0, blocked: false }),
        makePacket({ packetId: 'p2', accessSignal: 1.0, blocked: false }),
        makePacket({ packetId: 'p3', accessSignal: 1.0, blocked: false }),
      ]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.pressureBoost).toBe(-0.2)
    })

    it('clamps pressureBoost to +0.3 maximum', () => {
      const packets = [
        makePacket({ packetId: 'p1', accessSignal: 1.0, blocked: true }),
        makePacket({ packetId: 'p2', accessSignal: 1.0, blocked: true }),
        makePacket({ packetId: 'p3', accessSignal: 1.0, blocked: true }),
      ]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.pressureBoost).toBe(0.3)
    })

    it('appliedPacketIds are sorted alphabetically', () => {
      const packets = [
        makePacket({ packetId: 'zzz', siteId: 'site-a' }),
        makePacket({ packetId: 'aaa', siteId: 'site-a' }),
        makePacket({ packetId: 'mmm', siteId: 'site-a' }),
      ]
      const result = aggregateSiteAccessPressureModifier(packets, 'site-a')
      expect(result.appliedPacketIds).toEqual(['aaa', 'mmm', 'zzz'])
    })

    it('normalizes targetSiteId before matching', () => {
      const packets = [makePacket({ packetId: 'p1', siteId: 'site-a' })]
      const result = aggregateSiteAccessPressureModifier(packets, '  SITE-A  ')
      expect(result.appliedPacketIds).toContain('p1')
    })
  })

    describe('SPE-1267: decayAccessPackets', () => {
      function makeDecayPacket(accessSignal: number, decayRate = 0.1): ReturnType<typeof createCivicAccessPacket> {
        return createCivicAccessPacket({ packetId: 'p1', siteId: 'site-a', week: 1, accessSignal, decayRate })
      }

      it('reduces accessSignal by decayRate', () => {
        const result = decayAccessPackets([makeDecayPacket(0.5, 0.1)], 2)
        expect(result[0].accessSignal).toBeCloseTo(0.4, 5)
      })

      it('rounds to 3 decimal places', () => {
        const result = decayAccessPackets([makeDecayPacket(0.333, 0.1)], 2)
        expect(result[0].accessSignal).toBe(0.233)
      })

      it('drops packet when signal falls below 0.05', () => {
        const result = decayAccessPackets([makeDecayPacket(0.1, 0.1)], 2)
        expect(result).toHaveLength(0)
      })

      it('survives when signal equals exactly 0.05 after decay', () => {
        const result = decayAccessPackets([makeDecayPacket(0.15, 0.1)], 2)
        expect(result).toHaveLength(1)
        expect(result[0].accessSignal).toBe(0.05)
      })

      it('stores currentWeek on survivors', () => {
        const result = decayAccessPackets([makeDecayPacket(0.5, 0.1)], 7)
        expect(result[0].week).toBe(7)
      })

      it('does not mutate the input array', () => {
        const original = makeDecayPacket(0.5, 0.1)
        const input = [original]
        decayAccessPackets(input, 2)
        expect(input[0].accessSignal).toBe(0.5)
      })

      it('returns empty array for empty input', () => {
        expect(decayAccessPackets([], 1)).toEqual([])
      })
    })
