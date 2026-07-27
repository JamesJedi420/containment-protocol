// SPE-93: External support reliability and trust state — targeted tests
import { describe, it, expect } from 'vitest'
import {
  deriveAssetTrustBand,
  applyAssetReliabilityDrift,
  resolveAssetSupportOutcome,
  createContractorAsset,
  resolvePersistedExternalSupportAuthorityConsequence,
} from '../domain/externalSupport'
import { applyRallySupportStaffAction } from '../domain/hub/supportActions'
import { createStartingState } from '../data/startingState'
import type { ExternalSupportAsset, GameState } from '../domain/models'
import type { AuthorityGraphState } from '../domain/authorityGraphPersistence'

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
    const idleForgiven = applyAssetReliabilityDrift(base, 'week_idle', {
      trustFailureDriftScale: 0.7,
    })

    expect(forgiven.asset.reliability).toBe(32) // 50 + round(-20 * 0.88)
    expect(hardened.asset.reliability).toBe(28) // 50 + round(-20 * 1.12)
    expect(delivered.asset.reliability).toBe(62) // positive drift unscaled
    expect(idleForgiven.asset.reliability).toBe(48) // 50 + round(-3 * 0.7) = 50 - 2
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
    expect(r1.note).toEqual(r2.note)
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

describe('SPE-2722: persisted authority consequence for contractor support', () => {
  function authorityGraphState(
    options: {
      assetNodeId?: string
      assetAliasId?: string
      factionAliasId?: string
      linkedFactionIds?: string[]
      edges?: AuthorityGraphState['graph']['edges']
    } = {}
  ): AuthorityGraphState {
    const assetNodeId = options.assetNodeId ?? 'contractor-node'
    return {
      graph: {
        nodes: [
          {
            id: assetNodeId,
            nodeType: 'contractor',
            label: 'Regional Support Contractor',
            aliases: options.assetAliasId
              ? [
                  {
                    aliasId: options.assetAliasId,
                    label: 'Support Asset Alias',
                    confidence: 'verified',
                  },
                ]
              : undefined,
            linkedFactionIds: options.linkedFactionIds ?? ['faction-civic'],
          },
          {
            id: 'faction-civic',
            nodeType: 'faction',
            label: 'Civic Coordination Union',
            aliases: options.factionAliasId
              ? [
                  {
                    aliasId: options.factionAliasId,
                    label: 'Civic Union Alias',
                    confidence: 'verified',
                  },
                ]
              : undefined,
          },
        ],
        edges: options.edges ?? [
          {
            id: 'contractor-alliance',
            kind: 'alliance',
            fromNodeId: assetNodeId,
            toNodeId: 'faction-civic',
            status: 'current',
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'spe-2722-test' },
            strength: 70,
            pressureChannels: ['aid'],
          },
        ],
      },
      mutationHistory: [],
    }
  }

  function authorityState(
    asset = createContractorAsset('contractor-node', 'Regional Contractor', 80),
    graphState: AuthorityGraphState | unknown = authorityGraphState()
  ): GameState {
    const base = createStartingState()
    return {
      ...base,
      agency: {
        ...base.agency!,
        supportAvailable: 3,
      },
      supportAvailable: 3,
      externalSupportAssets: { [asset.id]: asset },
      factions: {
        'faction-civic': {
          id: 'faction-civic',
          name: 'Civic Coordination Union',
          reputation: 10,
        },
      },
      authorityGraphState: graphState as AuthorityGraphState,
      legitimacy: {
        sanctionLevel: 'sanctioned',
        operationalCoverLevel: 'deniable',
        falloutRisk: 'none',
      },
    }
  }

  it('derives one bounded faction consequence from a sanitized persisted edge', () => {
    const state = authorityState()
    const asset = state.externalSupportAssets!['contractor-node']

    expect(resolvePersistedExternalSupportAuthorityConsequence(state, asset)).toEqual({
      assetId: 'contractor-node',
      authorityNodeId: 'contractor-node',
      factionId: 'faction-civic',
      edgeId: 'contractor-alliance',
      reasonCode: 'alliance_aid',
      magnitude: 70,
      reputationDelta: 1,
    })

    const result = applyRallySupportStaffAction(state, 2)
    expect(result.nextState.factions?.['faction-civic']?.reputation).toBe(11)
    expect(result.nextState.factions?.['faction-civic']?.reputationTier).toBe('neutral')
    expect(result.nextState.externalSupportAssets?.['contractor-node']).toMatchObject({
      reliability: 92,
      lastAuthorityConsequenceWeek: state.week,
    })
    expect(result.note?.content).toContain('Authority edge contractor-alliance')
    expect(result.note?.metadata).toMatchObject({
      authorityEdgeId: 'contractor-alliance',
      authorityFactionId: 'faction-civic',
      authorityReputationDelta: 1,
    })
  })

  it('maps a denying aid edge to one bounded negative reputation point', () => {
    const asset = createContractorAsset('contractor-node', 'Regional Contractor', 80)
    const state = authorityState(
      asset,
      authorityGraphState({
        edges: [
          {
            id: 'contractor-rivalry',
            kind: 'rivalry',
            fromNodeId: 'contractor-node',
            toNodeId: 'faction-civic',
            status: 'current',
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'spe-2722-rivalry-test' },
            strength: 70,
            pressureChannels: ['aid'],
          },
        ],
      })
    )

    const result = applyRallySupportStaffAction(state, 2)

    expect(result.nextState.factions?.['faction-civic']?.reputation).toBe(9)
    expect(result.note?.metadata.authorityReputationDelta).toBe(-1)
  })

  it('uses the empty fallback for missing assets, graph nodes, faction refs, and legacy graphs', () => {
    const noAsset = authorityState()
    noAsset.externalSupportAssets = undefined
    expect(applyRallySupportStaffAction(noAsset, 2).nextState.factions).toEqual(noAsset.factions)

    const missingNode = authorityState(
      createContractorAsset('missing-contractor', 'Missing Contractor', 80)
    )
    expect(
      resolvePersistedExternalSupportAuthorityConsequence(
        missingNode,
        missingNode.externalSupportAssets!['missing-contractor']
      )
    ).toBeNull()

    const missingFaction = authorityState(
      createContractorAsset('contractor-node', 'Regional Contractor', 80),
      authorityGraphState({ linkedFactionIds: ['missing-faction'] })
    )
    expect(
      resolvePersistedExternalSupportAuthorityConsequence(
        missingFaction,
        missingFaction.externalSupportAssets!['contractor-node']
      )
    ).toBeNull()

    const legacy = authorityState(
      createContractorAsset('contractor-node', 'Regional Contractor', 80),
      { graph: 'legacy-malformed' }
    )
    expect(
      resolvePersistedExternalSupportAuthorityConsequence(
        legacy,
        legacy.externalSupportAssets!['contractor-node']
      )
    ).toBeNull()

    const informant = {
      ...createContractorAsset('contractor-node', 'Informant', 80),
      assetClass: 'informant' as const,
    }
    expect(
      resolvePersistedExternalSupportAuthorityConsequence(authorityState(informant), informant)
    ).toBeNull()
  })

  it('does not apply hidden future or contradicted authority claims', () => {
    const asset = createContractorAsset('contractor-node', 'Regional Contractor', 80)
    const hidden = authorityState(
      asset,
      authorityGraphState({
        edges: [
          {
            id: 'hidden-alliance',
            kind: 'alliance',
            fromNodeId: 'contractor-node',
            toNodeId: 'faction-civic',
            status: 'hidden',
            hiddenUntilWeek: 10_000,
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'spe-2722-hidden-test' },
            strength: 70,
            pressureChannels: ['aid'],
          },
        ],
      })
    )
    const contradicted = authorityState(
      asset,
      authorityGraphState({
        edges: [
          {
            id: 'contradicted-alliance',
            kind: 'alliance',
            fromNodeId: 'contractor-node',
            toNodeId: 'faction-civic',
            status: 'contradicted',
            sourceConfidence: 'contradicted',
            provenance: { sourceTag: 'spe-2722-contradicted-test' },
            strength: 70,
            pressureChannels: ['aid'],
          },
        ],
      })
    )

    expect(resolvePersistedExternalSupportAuthorityConsequence(hidden, asset)).toBeNull()
    expect(resolvePersistedExternalSupportAuthorityConsequence(contradicted, asset)).toBeNull()
  })

  it('resolves the contractor ID through a persisted authority-node alias', () => {
    const aliasAsset = createContractorAsset('contractor-alias', 'Alias Contractor', 80)
    const state = authorityState(
      aliasAsset,
      authorityGraphState({
        assetNodeId: 'contractor-canonical',
        assetAliasId: 'contractor-alias',
        edges: [
          {
            id: 'alias-patronage',
            kind: 'patronage',
            fromNodeId: 'contractor-canonical',
            toNodeId: 'faction-civic',
            status: 'current',
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'spe-2722-alias-test' },
            strength: 60,
            pressureChannels: ['aid'],
          },
        ],
      })
    )

    expect(resolvePersistedExternalSupportAuthorityConsequence(state, aliasAsset)).toMatchObject({
      authorityNodeId: 'contractor-canonical',
      factionId: 'faction-civic',
      edgeId: 'alias-patronage',
      reputationDelta: 1,
    })
  })

  it('resolves an explicitly linked faction alias to the live faction record', () => {
    const asset = createContractorAsset('contractor-node', 'Regional Contractor', 80)
    const state = authorityState(
      asset,
      authorityGraphState({
        factionAliasId: 'civic-union-alias',
        linkedFactionIds: ['civic-union-alias'],
      })
    )

    expect(resolvePersistedExternalSupportAuthorityConsequence(state, asset)).toMatchObject({
      authorityNodeId: 'contractor-node',
      factionId: 'faction-civic',
      edgeId: 'contractor-alliance',
    })
  })

  it('selects the first eligible edge in code-unit order and replays without input mutation', () => {
    const state = authorityState(
      createContractorAsset('contractor-node', 'Regional Contractor', 80),
      authorityGraphState({
        edges: [
          {
            id: 'z-rivalry',
            kind: 'rivalry',
            fromNodeId: 'contractor-node',
            toNodeId: 'faction-civic',
            status: 'current',
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'spe-2722-z' },
            strength: 90,
            pressureChannels: ['aid'],
          },
          {
            id: 'a-alliance',
            kind: 'alliance',
            fromNodeId: 'contractor-node',
            toNodeId: 'faction-civic',
            status: 'current',
            sourceConfidence: 'verified',
            provenance: { sourceTag: 'spe-2722-a' },
            strength: 40,
            pressureChannels: ['aid'],
          },
        ],
      })
    )
    const before = structuredClone(state)
    const asset = state.externalSupportAssets!['contractor-node']

    const first = resolvePersistedExternalSupportAuthorityConsequence(state, asset)
    const second = resolvePersistedExternalSupportAuthorityConsequence(
      structuredClone(state),
      structuredClone(asset)
    )

    expect(first).toEqual(second)
    expect(first).toMatchObject({ edgeId: 'a-alliance', reputationDelta: 1 })
    expect(state).toEqual(before)
  })

  it('isolates the triggering support amount and blocks duplicate faction application in one week', () => {
    const state = authorityState()
    const emptyGraphState = {
      ...state,
      authorityGraphState: { graph: { nodes: [], edges: [] }, mutationHistory: [] },
    }

    const graphBacked = applyRallySupportStaffAction(state, 2)
    const emptyFallback = applyRallySupportStaffAction(emptyGraphState, 2)
    expect(graphBacked.nextState.agency?.supportAvailable).toBe(
      emptyFallback.nextState.agency?.supportAvailable
    )
    expect(graphBacked.nextState.agency?.supportAvailable).toBe(7)

    const repeated = applyRallySupportStaffAction(graphBacked.nextState, 2)
    expect(repeated.nextState.factions?.['faction-civic']?.reputation).toBe(11)
    expect(repeated.note?.metadata.authorityEdgeId).toBeNull()
    expect(repeated.note?.metadata.authorityReputationDelta).toBe(0)
  })

  it('does not change market or institutional-legitimacy/operational-cover state', () => {
    const state = authorityState()
    const marketBefore = structuredClone(state.market)
    const legitimacyBefore = structuredClone(state.legitimacy)

    const result = applyRallySupportStaffAction(state, 2)

    expect(result.nextState.market).toEqual(marketBefore)
    expect(result.nextState.legitimacy).toEqual(legitimacyBefore)
  })
})
