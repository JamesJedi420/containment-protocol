// SPE-1266: Civic credit pressure channel — slices 1–2 unit tests
import { describe, it, expect } from 'vitest'
import { createCivicCreditPacket, aggregateSiteCreditPressureModifier } from '../domain/civicCreditChannel'

describe('SPE-1266: createCivicCreditPacket', () => {
  it('normalizes packetId and siteId tokens', () => {
    const p = createCivicCreditPacket({
      packetId: '  Sector 7 / Alpha ',
      siteId: '  NORTH GATE ',
      week: 3,
      creditSignal: 0.5,
    })
    expect(p.packetId).toBe('sector-7-alpha')
    expect(p.siteId).toBe('north-gate')
  })

  it('clamps creditSignal below 0 to 0', () => {
    const p = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: -0.5 })
    expect(p.creditSignal).toBe(0)
  })

  it('clamps creditSignal above 1 to 1', () => {
    const p = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: 2.5 })
    expect(p.creditSignal).toBe(1)
  })

  it('clamps decayRate to [0,1]', () => {
    const lo = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: 0.5, decayRate: -1 })
    const hi = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: 0.5, decayRate: 5 })
    expect(lo.decayRate).toBe(0)
    expect(hi.decayRate).toBe(1)
  })

  it('defaults decayRate to 0.05 when not provided', () => {
    const p = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: 0.5 })
    expect(p.decayRate).toBe(0.05)
  })

  it('defaults delinquent to false when not provided', () => {
    const p = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: 0.5 })
    expect(p.delinquent).toBe(false)
  })

  it('sets delinquent to true when explicitly provided', () => {
    const p = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 1, creditSignal: 0.8, delinquent: true })
    expect(p.delinquent).toBe(true)
  })

  it('is deterministic — identical input produces identical output', () => {
    const input = { packetId: 'pkt-abc', siteId: 'site-x', week: 5, creditSignal: 0.6, delinquent: false, decayRate: 0.1 }
    const a = createCivicCreditPacket(input)
    const b = createCivicCreditPacket(input)
    expect(a).toEqual(b)
  })

  it('normalizes week: fractional input truncated and floored at 1', () => {
    const p = createCivicCreditPacket({ packetId: 'p1', siteId: 's1', week: 0.9, creditSignal: 0.5 })
    expect(p.week).toBe(1)
  })
})

function makePacket(overrides: {
  packetId: string
  siteId?: string
  creditSignal?: number
  delinquent?: boolean
}) {
  return createCivicCreditPacket({
    packetId: overrides.packetId,
    siteId: overrides.siteId ?? 'site-a',
    week: 1,
    creditSignal: overrides.creditSignal ?? 0.8,
    delinquent: overrides.delinquent,
  })
}

describe('SPE-1266: aggregateSiteCreditPressureModifier', () => {
  it('returns zero boost and no-credit-pressure reason for empty packets', () => {
    const result = aggregateSiteCreditPressureModifier([], 'site-a')
    expect(result.pressureBoost).toBe(0)
    expect(result.delinquentCount).toBe(0)
    expect(result.appliedPacketIds).toEqual([])
    expect(result.reasonFragment).toBe('no credit pressure')
  })

  it('returns zero boost when no packets match target site', () => {
    const packets = [makePacket({ packetId: 'p1', siteId: 'site-b' })]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    expect(result.pressureBoost).toBe(0)
    expect(result.appliedPacketIds).toEqual([])
  })

  it('healthy (non-delinquent) packet suppresses pressure: -signal * 0.15', () => {
    const packets = [makePacket({ packetId: 'p1', creditSignal: 1.0, delinquent: false })]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    expect(result.pressureBoost).toBeCloseTo(-0.15, 5)
    expect(result.delinquentCount).toBe(0)
  })

  it('delinquent packet increases pressure: +signal * 0.12', () => {
    const packets = [makePacket({ packetId: 'p1', creditSignal: 1.0, delinquent: true })]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    expect(result.pressureBoost).toBeCloseTo(0.12, 5)
    expect(result.delinquentCount).toBe(1)
  })

  it('mixed: delinquent dominates suppression when signal is high enough', () => {
    const packets = [
      makePacket({ packetId: 'p1', creditSignal: 0.5, delinquent: false }),  // -0.075
      makePacket({ packetId: 'p2', creditSignal: 1.0, delinquent: true }),   // +0.12
    ]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    // -0.075 + 0.12 = +0.045
    expect(result.pressureBoost).toBeCloseTo(0.045, 5)
    expect(result.delinquentCount).toBe(1)
  })

  it('clamps boost to -0.2 floor when many healthy packets', () => {
    const packets = [
      makePacket({ packetId: 'p1', creditSignal: 1.0, delinquent: false }), // -0.15
      makePacket({ packetId: 'p2', creditSignal: 1.0, delinquent: false }), // -0.15 => -0.30 => clamp to -0.20
    ]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    expect(result.pressureBoost).toBe(-0.2)
  })

  it('clamps boost to +0.3 ceiling when many delinquent packets', () => {
    const packets = [
      makePacket({ packetId: 'p1', creditSignal: 1.0, delinquent: true }), // +0.12
      makePacket({ packetId: 'p2', creditSignal: 1.0, delinquent: true }), // +0.12
      makePacket({ packetId: 'p3', creditSignal: 1.0, delinquent: true }), // +0.12 => 0.36 => clamp to 0.30
    ]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    expect(result.pressureBoost).toBe(0.3)
  })

  it('appliedPacketIds are sorted alphabetically (stable)', () => {
    const packets = [
      makePacket({ packetId: 'p3', siteId: 'site-a' }),
      makePacket({ packetId: 'p1', siteId: 'site-a' }),
      makePacket({ packetId: 'p2', siteId: 'site-a' }),
    ]
    const result = aggregateSiteCreditPressureModifier(packets, 'site-a')
    expect(result.appliedPacketIds).toEqual(['p1', 'p2', 'p3'])
  })

  it('normalizes targetSiteId token before matching', () => {
    const packets = [makePacket({ packetId: 'p1', siteId: 'site-a' })]
    const result = aggregateSiteCreditPressureModifier(packets, '  SITE A  ')
    expect(result.siteId).toBe('site-a')
    expect(result.appliedPacketIds).toEqual(['p1'])
  })
})
