// SPE-1265: Civic rumor pressure channel — unit tests
import { describe, it, expect } from 'vitest'
import {
  createCivicRumorPacket,
  extractRumorPacketsFromHubState,
  aggregateSiteRumorPressureModifier,
  decayRumorPackets,
  type CivicRumorPacket,
} from '../domain/civicRumorChannel'
import type { HubRumor } from '../domain/hub/hubState'

// ─── Slice 1: createCivicRumorPacket ───────────────────────────────────────

describe('createCivicRumorPacket', () => {
  it('normalizes token fields and clamps rumorSignal and decayRate', () => {
    const p = createCivicRumorPacket({
      packetId: 'Rumor A',
      siteId: 'Central HUB',
      week: 3,
      rumorSignal: 0.8,
      decayRate: 0.2,
    })
    expect(p.packetId).toBe('rumor-a')
    expect(p.siteId).toBe('central-hub')
    expect(p.week).toBe(3)
    expect(p.rumorSignal).toBe(0.8)
    expect(p.decayRate).toBe(0.2)
    expect(p.misleading).toBe(false)
  })

  it('clamps rumorSignal above 1 to 1', () => {
    const p = createCivicRumorPacket({ packetId: 'x', siteId: 'site', week: 1, rumorSignal: 2.5 })
    expect(p.rumorSignal).toBe(1)
  })

  it('clamps rumorSignal below 0 to 0', () => {
    const p = createCivicRumorPacket({ packetId: 'x', siteId: 'site', week: 1, rumorSignal: -0.5 })
    expect(p.rumorSignal).toBe(0)
  })

  it('clamps decayRate above 1 to 1', () => {
    const p = createCivicRumorPacket({ packetId: 'x', siteId: 'site', week: 1, rumorSignal: 0.5, decayRate: 5 })
    expect(p.decayRate).toBe(1)
  })

  it('defaults decayRate to 0.1 when omitted', () => {
    const p = createCivicRumorPacket({ packetId: 'x', siteId: 'site', week: 1, rumorSignal: 0.5 })
    expect(p.decayRate).toBe(0.1)
  })

  it('normalizes week to at least 1', () => {
    const p = createCivicRumorPacket({ packetId: 'x', siteId: 'site', week: 0, rumorSignal: 0.5 })
    expect(p.week).toBe(1)
  })

  it('sets misleading from input', () => {
    const p = createCivicRumorPacket({ packetId: 'x', siteId: 'site', week: 1, rumorSignal: 0.5, misleading: true })
    expect(p.misleading).toBe(true)
  })
})

// ─── Slice 1: extractRumorPacketsFromHubState ───────────────────────────────

describe('extractRumorPacketsFromHubState', () => {
  const rumors: HubRumor[] = [
    { id: 'r1', label: 'Rumor 1', detail: 'Detail', confidence: 0.9, misleading: false, filtered: false },
    { id: 'r2', label: 'Rumor 2', detail: 'Detail', confidence: 0.4, misleading: true, filtered: false },
    { id: 'r3', label: 'Rumor 3', detail: 'Detail', confidence: 0.6, misleading: false, filtered: true },
  ]

  it('drops filtered rumors', () => {
    const packets = extractRumorPacketsFromHubState(rumors, 'site-a', 1)
    expect(packets).toHaveLength(2)
    expect(packets.every((p) => p.packetId !== 'rumor-r3')).toBe(true)
  })

  it('assigns decayRate as clamp(1 - confidence, 0.05, 0.95)', () => {
    const packets = extractRumorPacketsFromHubState(rumors, 'site-a', 1)
    const r1 = packets.find((p) => p.packetId === 'rumor-r1')!
    const r2 = packets.find((p) => p.packetId === 'rumor-r2')!
    expect(r1.decayRate).toBeCloseTo(0.1)  // 1 - 0.9 = 0.1
    expect(r2.decayRate).toBeCloseTo(0.6)  // 1 - 0.4 = 0.6
  })

  it('assigns rumorSignal from confidence', () => {
    const packets = extractRumorPacketsFromHubState(rumors, 'site-a', 1)
    const r1 = packets.find((p) => p.packetId === 'rumor-r1')!
    expect(r1.rumorSignal).toBeCloseTo(0.9)
  })

  it('returns packets sorted by packetId', () => {
    const packets = extractRumorPacketsFromHubState(rumors, 'site-a', 1)
    const ids = packets.map((p) => p.packetId)
    expect(ids).toEqual([...ids].sort())
  })

  it('returns empty array for empty input', () => {
    expect(extractRumorPacketsFromHubState([], 'site-a', 1)).toEqual([])
  })

  it('returns empty array when all rumors are filtered', () => {
    const filtered: HubRumor[] = [
      { id: 'f1', label: 'F', detail: 'D', confidence: 0.8, filtered: true },
    ]
    expect(extractRumorPacketsFromHubState(filtered, 'site-a', 1)).toEqual([])
  })
})

// ─── Slice 2: aggregateSiteRumorPressureModifier ────────────────────────────

describe('aggregateSiteRumorPressureModifier', () => {
  function makePacket(overrides: Partial<CivicRumorPacket> = {}): CivicRumorPacket {
    return {
      packetId: 'p1',
      siteId: 'district-a',
      week: 1,
      rumorSignal: 0.8,
      misleading: false,
      decayRate: 0.1,
      ...overrides,
    }
  }

  it('returns zero boost for empty packets array', () => {
    const result = aggregateSiteRumorPressureModifier([], 'district-a')
    expect(result.pressureBoost).toBe(0)
    expect(result.appliedPacketIds).toEqual([])
  })

  it('returns zero boost when no packets match targetSiteId', () => {
    const result = aggregateSiteRumorPressureModifier([makePacket()], 'district-b')
    expect(result.pressureBoost).toBe(0)
    expect(result.appliedPacketIds).toEqual([])
  })

  it('computes positive boost for non-misleading packet (signal * 0.15)', () => {
    const result = aggregateSiteRumorPressureModifier([makePacket({ rumorSignal: 1.0 })], 'district-a')
    expect(result.pressureBoost).toBeCloseTo(0.15)
    expect(result.misleadingCount).toBe(0)
  })

  it('computes negative contribution for misleading packet (−signal * 0.10)', () => {
    const result = aggregateSiteRumorPressureModifier(
      [makePacket({ rumorSignal: 1.0, misleading: true })],
      'district-a'
    )
    expect(result.pressureBoost).toBeCloseTo(-0.1)
    expect(result.misleadingCount).toBe(1)
  })

  it('clamps boost to +0.3 maximum', () => {
    const packets = Array.from({ length: 20 }, (_, i) =>
      makePacket({ packetId: `p${i}`, rumorSignal: 1.0 })
    )
    const result = aggregateSiteRumorPressureModifier(packets, 'district-a')
    expect(result.pressureBoost).toBe(0.3)
  })

  it('clamps boost to −0.2 minimum', () => {
    const packets = Array.from({ length: 20 }, (_, i) =>
      makePacket({ packetId: `p${i}`, rumorSignal: 1.0, misleading: true })
    )
    const result = aggregateSiteRumorPressureModifier(packets, 'district-a')
    expect(result.pressureBoost).toBe(-0.2)
  })

  it('mixes positive and misleading contributions correctly', () => {
    const packets = [
      makePacket({ packetId: 'pa', rumorSignal: 0.8, misleading: false }),  // +0.12
      makePacket({ packetId: 'pb', rumorSignal: 0.5, misleading: true }),   // -0.05
    ]
    const result = aggregateSiteRumorPressureModifier(packets, 'district-a')
    expect(result.pressureBoost).toBeCloseTo(0.07)
    expect(result.misleadingCount).toBe(1)
  })

  it('normalizes targetSiteId for matching', () => {
    const result = aggregateSiteRumorPressureModifier([makePacket()], 'District A')
    expect(result.pressureBoost).toBeCloseTo(0.12) // 0.8 * 0.15 = 0.12
  })
})

// ─── Slice 4: decayRumorPackets ─────────────────────────────────────────────

describe('decayRumorPackets', () => {
  it('reduces rumorSignal by decayRate each call', () => {
    const p: CivicRumorPacket = {
      packetId: 'p1', siteId: 'site', week: 1, rumorSignal: 0.8, misleading: false, decayRate: 0.1,
    }
    const result = decayRumorPackets([p], 2)
    expect(result).toHaveLength(1)
    expect(result[0].rumorSignal).toBeCloseTo(0.7)
    expect(result[0].week).toBe(2)
  })

  it('drops packets where signal after decay falls below 0.05', () => {
    const p: CivicRumorPacket = {
      packetId: 'p1', siteId: 'site', week: 1, rumorSignal: 0.08, misleading: false, decayRate: 0.1,
    }
    const result = decayRumorPackets([p], 2)
    expect(result).toHaveLength(0)
  })

  it('keeps packets exactly at 0.05 threshold', () => {
    const p: CivicRumorPacket = {
      packetId: 'p1', siteId: 'site', week: 1, rumorSignal: 0.15, misleading: false, decayRate: 0.1,
    }
    const result = decayRumorPackets([p], 2)
    expect(result).toHaveLength(1)
    expect(result[0].rumorSignal).toBeCloseTo(0.05)
  })

  it('returns empty array for empty input', () => {
    expect(decayRumorPackets([], 2)).toEqual([])
  })

  it('does not mutate original packets', () => {
    const p: CivicRumorPacket = {
      packetId: 'p1', siteId: 'site', week: 1, rumorSignal: 0.8, misleading: false, decayRate: 0.1,
    }
    decayRumorPackets([p], 2)
    expect(p.rumorSignal).toBe(0.8)
    expect(p.week).toBe(1)
  })
})
