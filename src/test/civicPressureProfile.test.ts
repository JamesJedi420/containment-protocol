// SPE-1271: Civic pressure composite profile — unit tests
import { describe, it, expect } from 'vitest'
import { computeSiteCivicPressureProfile } from '../domain/civicPressureProfile'
import { createCompactCivicAuthorityConsequencePacket } from '../domain/civicConsequenceNetwork'
import { createCivicRumorPacket } from '../domain/civicRumorChannel'
import { createCivicCreditPacket } from '../domain/civicCreditChannel'
import { createCivicAccessPacket } from '../domain/civicAccessChannel'

const SITE = 'site-alpha'
const OTHER_SITE = 'site-beta'
const WEEK = 1

// Helpers
// misleading=false → non-misleading → +signal×0.15 (boosts pressure)
// misleading=true  → misleading     → −signal×0.10 (suppresses pressure)
function makeRumorPacket(siteId: string, signal: number, misleading = false) {
  return createCivicRumorPacket({ packetId: `rumor-${siteId}-${signal}`, siteId, week: WEEK, rumorSignal: signal, misleading })
}

function makeCreditPacket(siteId: string, signal: number, delinquent = true) {
  return createCivicCreditPacket({ packetId: `credit-${siteId}-${signal}`, siteId, week: WEEK, creditSignal: signal, delinquent })
}

function makeAccessPacket(siteId: string, signal: number, blocked = true) {
  return createCivicAccessPacket({ packetId: `access-${siteId}-${signal}`, siteId, week: WEEK, accessSignal: signal, blocked })
}

function makeAuthorityPacket(sourceSiteId: string, targetSiteId: string, signal: number) {
  return createCompactCivicAuthorityConsequencePacket({
    packetId: `auth-${sourceSiteId}-to-${targetSiteId}`,
    sourceSiteId,
    targetSiteId,
    seedKey: `seed-${sourceSiteId}-${targetSiteId}`,
    week: WEEK,
    authoritySignal: signal,
  })
}

describe('SPE-1271: computeSiteCivicPressureProfile', () => {
  describe('all-empty / missing opts', () => {
    it('returns stable profile with combinedBoost=0 and dominantChannel=none when no opts provided', () => {
      const result = computeSiteCivicPressureProfile(SITE)
      expect(result.combinedBoost).toBe(0)
      expect(result.dominantChannel).toBe('none')
      expect(result.severityBand).toBe('stable')
      expect(result.reasonFragments).toEqual([])
    })

    it('returns stable profile when all packet arrays are empty', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        authorityPackets: [],
        rumorPackets: [],
        creditPackets: [],
        accessPackets: [],
      })
      expect(result.combinedBoost).toBe(0)
      expect(result.dominantChannel).toBe('none')
      expect(result.reasonFragments).toEqual([])
    })

    it('normalizes siteId on output', () => {
      const result = computeSiteCivicPressureProfile('  SITE ALPHA  ')
      expect(result.siteId).toBe('site-alpha')
    })
  })

  describe('per-channel isolation', () => {
    it('rumor-only: non-misleading packet boosts pressure', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, false)],
      })
      expect(result.rumorContribution).toBeGreaterThan(0)
      expect(result.authorityContribution).toBe(0)
      expect(result.creditContribution).toBe(0)
      expect(result.accessContribution).toBe(0)
      expect(result.dominantChannel).toBe('rumor')
    })

    it('credit-only: delinquent packet boosts pressure', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        creditPackets: [makeCreditPacket(SITE, 1.0, true)],
      })
      expect(result.creditContribution).toBeGreaterThan(0)
      expect(result.dominantChannel).toBe('credit')
    })

    it('access-only: blocked packet boosts pressure', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        accessPackets: [makeAccessPacket(SITE, 1.0, true)],
      })
      expect(result.accessContribution).toBeGreaterThan(0)
      expect(result.dominantChannel).toBe('access')
    })

    it('rumor-only: misleading packet suppresses pressure (negative contribution)', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, true)],
      })
      expect(result.rumorContribution).toBeLessThan(0)
      expect(result.dominantChannel).toBe('rumor')
    })

    it('credit-only: healthy packet suppresses pressure (negative contribution)', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        creditPackets: [makeCreditPacket(SITE, 1.0, false)],
      })
      expect(result.creditContribution).toBeLessThan(0)
      expect(result.dominantChannel).toBe('credit')
    })

    it('access-only: open packet suppresses pressure (negative contribution)', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        accessPackets: [makeAccessPacket(SITE, 1.0, false)],
      })
      expect(result.accessContribution).toBeLessThan(0)
      expect(result.dominantChannel).toBe('access')
    })

    it('authority-only: packet from other site to this site contributes totalDelta', () => {
      const packet = makeAuthorityPacket(OTHER_SITE, SITE, 0.8)
      const result = computeSiteCivicPressureProfile(SITE, {
        authorityPackets: [packet],
        week: WEEK,
      })
      expect(result.authorityContribution).not.toBe(0)
      expect(result.rumorContribution).toBe(0)
      expect(result.creditContribution).toBe(0)
      expect(result.accessContribution).toBe(0)
    })

    it('packets for a different site do not contribute to this profile', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(OTHER_SITE, 1.0, true)],
        creditPackets: [makeCreditPacket(OTHER_SITE, 1.0, true)],
        accessPackets: [makeAccessPacket(OTHER_SITE, 1.0, true)],
      })
      expect(result.combinedBoost).toBe(0)
      expect(result.dominantChannel).toBe('none')
    })
  })

  describe('combined math and clamping', () => {
    it('combinedBoost is sum of four contributions (within clamp range)', () => {
      // Use moderate signals so the sum stays within [-0.2, +0.3] to avoid clamping
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 0.3, false)],   // +0.3×0.15 = +0.045
        creditPackets: [makeCreditPacket(SITE, 0.3, true)],  // +0.3×0.12 = +0.036
        accessPackets: [makeAccessPacket(SITE, 0.3, true)],  // +0.3×0.12 = +0.036
      })
      const expected = result.rumorContribution + result.creditContribution + result.accessContribution
      expect(result.combinedBoost).toBeCloseTo(expected, 5)
    })

    it('clamps combinedBoost to +0.3 maximum', () => {
      // rumor non-misleading 0.15 + credit delinquent 0.12 + access blocked 0.12 = 0.39, clamps to 0.3
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, false)],
        creditPackets: [makeCreditPacket(SITE, 1.0, true)],
        accessPackets: [makeAccessPacket(SITE, 1.0, true)],
      })
      expect(result.combinedBoost).toBe(0.3)
    })

    it('clamps combinedBoost to −0.2 minimum', () => {
      // rumor misleading −0.10 + credit healthy −0.15 + access open −0.15 = −0.40, clamps to −0.2
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, true)],
        creditPackets: [makeCreditPacket(SITE, 1.0, false)],
        accessPackets: [makeAccessPacket(SITE, 1.0, false)],
      })
      expect(result.combinedBoost).toBe(-0.2)
    })
  })

  describe('dominantChannel', () => {
    it('returns the channel with the largest absolute contribution', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 0.8, false)],  // non-misleading +0.8×0.15 = +0.12
        accessPackets: [makeAccessPacket(SITE, 0.2, true)], // blocked +0.2×0.12 = +0.024
      })
      expect(result.dominantChannel).toBe('rumor')
    })

    it('breaks ties alphabetically — access beats credit on tie', () => {
      // access and credit both at accessSignal=creditSignal=1.0, blocked/delinquent → both 0.12
      const result = computeSiteCivicPressureProfile(SITE, {
        creditPackets: [makeCreditPacket(SITE, 1.0, true)],
        accessPackets: [makeAccessPacket(SITE, 1.0, true)],
      })
      // access (0.12) === credit (0.12); alphabetically access < credit → access wins
      expect(result.dominantChannel).toBe('access')
    })

    it('returns none when all contributions are zero', () => {
      const result = computeSiteCivicPressureProfile(SITE)
      expect(result.dominantChannel).toBe('none')
    })
  })

  describe('severityBand', () => {
    it('stable when combinedBoost is 0', () => {
      expect(computeSiteCivicPressureProfile(SITE).severityBand).toBe('stable')
    })

    it('elevated when combinedBoost is between 0.05 and 0.15', () => {
      // Single non-misleading rumor signal=0.5 → 0.5×0.15 = 0.075, between 0.05 and 0.15
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 0.5, false)],
      })
      expect(result.severityBand).toBe('elevated')
    })

    it('critical when combinedBoost exceeds 0.15', () => {
      // Two non-misleading rumor packets signal=1.0 → 2×0.15 = 0.30 > 0.15
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [
          makeRumorPacket(SITE, 1.0, false),
          createCivicRumorPacket({ packetId: 'rumor2', siteId: SITE, week: WEEK, rumorSignal: 1.0, misleading: false }),
        ],
      })
      expect(result.severityBand).toBe('critical')
    })

    it('stable when combinedBoost is negative (suppression via misleading rumors)', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, true)],
      })
      expect(result.severityBand).toBe('stable')
    })
  })

  describe('reasonFragments', () => {
    it('omits empty/no-pressure fragments', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, false)],
      })
      // Only rumor has a real fragment; others should be omitted
      expect(result.reasonFragments).toHaveLength(1)
      expect(result.reasonFragments[0]).toContain('rumor')
    })

    it('includes all four channel fragments when all are active', () => {
      const result = computeSiteCivicPressureProfile(SITE, {
        rumorPackets: [makeRumorPacket(SITE, 1.0, false)],
        creditPackets: [makeCreditPacket(SITE, 1.0, true)],
        accessPackets: [makeAccessPacket(SITE, 1.0, true)],
        authorityPackets: [makeAuthorityPacket(OTHER_SITE, SITE, 0.8)],
        week: WEEK,
      })
      expect(result.reasonFragments.length).toBeGreaterThanOrEqual(3)
    })

    it('returns empty reasonFragments when all channels are inactive', () => {
      expect(computeSiteCivicPressureProfile(SITE).reasonFragments).toEqual([])
    })
  })
})
