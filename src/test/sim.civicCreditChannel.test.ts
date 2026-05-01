// SPE-1266: Civic credit pressure channel — slice 1 unit tests
import { describe, it, expect } from 'vitest'
import { createCivicCreditPacket } from '../domain/civicCreditChannel'

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
