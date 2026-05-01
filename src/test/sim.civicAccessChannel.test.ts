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
