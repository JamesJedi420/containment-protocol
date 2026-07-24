// SPE-93: External support reliability and trust state — targeted tests
import { describe, it, expect } from 'vitest'
import {
  deriveAssetTrustBand,
  applyAssetReliabilityDrift,
  resolveAssetSupportOutcome,
  createContractorAsset,
} from '../domain/externalSupport'
import { applyRallySupportStaffAction } from '../domain/hub/supportActions'
import { createStartingState } from '../data/startingState'
import type { ExternalSupportAsset, GameState } from '../domain/models'

// ---------------------------------------------------------------------------
// Trust band derivation
// ---------------------------------------------------------------------------

describe('deriveAssetTrustBand', () => {
  it('returns high for reliability >= 70', () => {
    expect(deriveAssetTrustBand(70)).toBe('high')
    expect(deriveAssetTrustBand(100)).toBe('high')
  })

  it('returns moderate for 40–69', () => {
    expect(deriveAssetTrustBand(40)).toBe('moderate')
    expect(deriveAssetTrustBand(69)).toBe('moderate')
  })

  it('returns degraded for 15–39', () => {
    expect(deriveAssetTrustBand(15)).toBe('degraded')
    expect(deriveAssetTrustBand(39)).toBe('degraded')
  })

  it('returns failed for < 15', () => {
    expect(deriveAssetTrustBand(14)).toBe('failed')
    expect(deriveAssetTrustBand(0)).toBe('failed')
  })
})

// ---------------------------------------------------------------------------
// Reliability drift
// ---------------------------------------------------------------------------

describe('applyAssetReliabilityDrift', () => {
  const base = createContractorAsset('c1', 'Local Contractor', 50)

  it('support_delivered increases reliability by 12', () => {
    const { asset } = applyAssetReliabilityDrift(base, 'support_delivered')
    expect(asset.reliability).toBe(62)
  })

  it('support_failed decreases reliability by 20', () => {
    const { asset } = applyAssetReliabilityDrift(base, 'support_failed')
    expect(asset.reliability).toBe(30)
  })

  it('support_partial decreases reliability by 6', () => {
    const { asset } = applyAssetReliabilityDrift(base, 'support_partial')
    expect(asset.reliability).toBe(44)
  })

  it('week_idle decreases reliability by 3', () => {
    const { asset } = applyAssetReliabilityDrift(base, 'week_idle')
    expect(asset.reliability).toBe(47)
  })

  it('clamps at 0 and 100', () => {
    const floor = createContractorAsset('c-low', 'Low Asset', 5)
    const { asset: drifted } = applyAssetReliabilityDrift(floor, 'support_failed')
    expect(drifted.reliability).toBe(0)

    const ceil = createContractorAsset('c-high', 'High Asset', 95)
    const { asset: boosted } = applyAssetReliabilityDrift(ceil, 'support_delivered')
    expect(boosted.reliability).toBe(100)
  })

  it('records a drift reason on the asset', () => {
    const { asset } = applyAssetReliabilityDrift(base, 'support_delivered')
    expect(asset.lastDriftReason).toContain('Local Contractor')
    expect(asset.lastDriftReason).toContain('improved')
  })

  it('notes band transitions in the reason', () => {
    // Start at 45 (moderate), fail hard → lands at 25 (degraded)
    const near = createContractorAsset('c-near', 'Near Asset', 45)
    const { driftReason } = applyAssetReliabilityDrift(near, 'support_failed')
    expect(driftReason).toContain('moderate')
    expect(driftReason).toContain('degraded')
  })

  it('SPE-2700: standing-shaped scale softens or hardens negative drift only', () => {
    const base = createContractorAsset('c1', 'Local Contractor', 50)
    const forgiven = applyAssetReliabilityDrift(base, 'support_failed', {
      trustFailureDriftScale: 0.88,
    })
    const hardened = applyAssetReliabilityDrift(base, 'support_failed', {
      trustFailureDriftScale: 1.12,
    })
    const delivered = applyAssetReliabilityDrift(base, 'support_delivered', {
      trustFailureDriftScale: 1.12,
    })

    expect(forgiven.asset.reliability).toBe(32) // 50 + round(-20 * 0.88)
    expect(hardened.asset.reliability).toBe(28) // 50 + round(-20 * 1.12)
    expect(delivered.asset.reliability).toBe(62) // positive drift unscaled
  })
})

// ---------------------------------------------------------------------------
// Support outcome resolution
// ---------------------------------------------------------------------------

describe('resolveAssetSupportOutcome', () => {
  it('high trust adds 2 and triggers support_delivered', () => {
    const asset = createContractorAsset('c-high', 'High Asset', 80)
    const { modifiedScore, driftTrigger, outcomeReason } = resolveAssetSupportOutcome(asset, 2)
    expect(modifiedScore).toBe(4)
    expect(driftTrigger).toBe('support_delivered')
    expect(outcomeReason).toContain('+2')
    expect(outcomeReason).toContain('high')
  })

  it('moderate trust adds 1 and triggers support_delivered', () => {
    const asset = createContractorAsset('c-mid', 'Mid Asset', 55)
    const { modifiedScore, driftTrigger } = resolveAssetSupportOutcome(asset, 2)
    expect(modifiedScore).toBe(3)
    expect(driftTrigger).toBe('support_delivered')
  })

  it('degraded trust adds 0 and triggers support_partial', () => {
    const asset = createContractorAsset('c-deg', 'Degraded Asset', 25)
    const { modifiedScore, driftTrigger, outcomeReason } = resolveAssetSupportOutcome(asset, 2)
    expect(modifiedScore).toBe(2)
    expect(driftTrigger).toBe('support_partial')
    expect(outcomeReason).toContain('degraded')
  })

  it('failed trust subtracts 1 and triggers support_failed', () => {
    const asset = createContractorAsset('c-fail', 'Failed Asset', 5)
    const { modifiedScore, driftTrigger, outcomeReason } = resolveAssetSupportOutcome(asset, 2)
    expect(modifiedScore).toBe(1)
    expect(driftTrigger).toBe('support_failed')
    expect(outcomeReason).toContain('failed')
  })
})

// ---------------------------------------------------------------------------
// SPE-93: Live path — rally support action modified by contractor asset
// ---------------------------------------------------------------------------

describe('SPE-93: applyRallySupportStaffAction with contractor asset', () => {
  function makeState(asset?: ExternalSupportAsset): GameState {
    const base = createStartingState()
    return {
      ...base,
      agency: {
        ...(base.agency ?? { containmentRating: 0, clearanceLevel: 1, funding: 100 }),
        supportAvailable: 3,
      },
      supportAvailable: 3,
      externalSupportAssets: asset ? { [asset.id]: asset } : undefined,
    }
  }

  it('without contractor: restores base amount, no asset note', () => {
    const state = makeState()
    const { nextState, note } = applyRallySupportStaffAction(state, 2)
    expect(nextState.agency?.supportAvailable).toBe(5)
    expect(note?.content).not.toContain('Trust level')
    expect(note?.metadata.contractorAssetId).toBeNull()
  })

  it('with high-trust contractor: bonus is base+2, note explains reason', () => {
    const asset = createContractorAsset('c-high', 'Frontline Contractor', 80)
    const state = makeState(asset)
    const { nextState, note } = applyRallySupportStaffAction(state, 2)
    // base 2 + 2 (high contractor) = 4, prev 3 → next 7
    expect(nextState.agency?.supportAvailable).toBe(7)
    expect(note?.content).toContain('Frontline Contractor')
    expect(note?.content).toContain('high')
    expect(note?.metadata.contractorAssetId).toBe('c-high')
  })

  it('with moderate-trust contractor: bonus is base+1', () => {
    const asset = createContractorAsset('c-mid', 'Mid Contractor', 55)
    const state = makeState(asset)
    const { nextState } = applyRallySupportStaffAction(state, 2)
    // base 2 + 1 (moderate) = 3, prev 3 → next 6
    expect(nextState.agency?.supportAvailable).toBe(6)
  })

  it('with degraded contractor: no bonus change, note explains no benefit', () => {
    const asset = createContractorAsset('c-deg', 'Degraded Contractor', 25)
    const state = makeState(asset)
    const { nextState, note } = applyRallySupportStaffAction(state, 2)
    // base 2 + 0 = 2, prev 3 → next 5
    expect(nextState.agency?.supportAvailable).toBe(5)
    expect(note?.content).toContain('degraded')
  })

  it('with failed contractor: support penalised, note explains failure', () => {
    const asset = createContractorAsset('c-fail', 'Failed Contractor', 5)
    const state = makeState(asset)
    const { nextState, note } = applyRallySupportStaffAction(state, 2)
    // base 2 − 1 (failed) = 1, prev 3 → next 4
    expect(nextState.agency?.supportAvailable).toBe(4)
    expect(note?.content).toContain('failed')
  })

  it('contractor reliability drifts after the rally action', () => {
    const asset = createContractorAsset('c-track', 'Tracking Contractor', 75)
    const state = makeState(asset)
    const { nextState } = applyRallySupportStaffAction(state, 2)
    const updatedAsset = nextState.externalSupportAssets?.['c-track']
    // high trust → support_delivered → +12 → 87
    expect(updatedAsset?.reliability).toBe(87)
    expect(updatedAsset?.lastDriftReason).toContain('improved')
  })

  it('deterministic: same state produces same result', () => {
    const asset = createContractorAsset('c-det', 'Det Contractor', 60)
    const state = makeState(asset)
    const r1 = applyRallySupportStaffAction(state, 2)
    const r2 = applyRallySupportStaffAction(state, 2)
    expect(r1.nextState.agency?.supportAvailable).toBe(r2.nextState.agency?.supportAvailable)
    expect(r1.note?.content).toBe(r2.note?.content)
  })

  it('SPE-2700: high vs low standing diverges failed-contractor reliability drift', () => {
    const asset = createContractorAsset('c-fail', 'Failed Contractor', 25)
    const weakReports = [
      {
        week: 1,
        resolvedCases: [],
        partialCases: [],
        failedCases: ['f1', 'f2', 'f3', 'f4', 'f5'],
        unresolvedTriggers: ['u1', 'u2', 'u3', 'u4'],
      },
    ] as GameState['reports']
    const strongReports = [
      {
        week: 1,
        resolvedCases: Array.from({ length: 10 }, (_, i) => `r${i}`),
        partialCases: [],
        failedCases: [],
        unresolvedTriggers: [],
      },
    ] as GameState['reports']

    const weakState = { ...makeState(asset), reports: weakReports, events: [] as GameState['events'] }
    const strongState = {
      ...makeState(asset),
      reports: strongReports,
      events: [] as GameState['events'],
    }

    const weakNext = applyRallySupportStaffAction(weakState, 2)
    const strongNext = applyRallySupportStaffAction(strongState, 2)

    const weakReliability = weakNext.nextState.externalSupportAssets?.['c-fail']?.reliability
    const strongReliability = strongNext.nextState.externalSupportAssets?.['c-fail']?.reliability

    // degraded → support_partial (−6 base); high standing softens, low standing hardens
    expect(strongReliability).toBeGreaterThan(weakReliability!)
  })
})
