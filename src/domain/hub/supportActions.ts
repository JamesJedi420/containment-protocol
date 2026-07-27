// SPE-38: Hub action to restore support pool
import type { GameState } from '../models'
import {
  resolveAssetSupportOutcome,
  applyAssetReliabilityDrift,
  resolvePersistedExternalSupportAuthorityConsequence,
} from '../externalSupport'
import { applyFactionRecruitInteraction } from '../factions'
import { buildSupportRestoredNote } from '../reportNotes.support'
import { buildRivalPressure } from '../rivalPressure'

/**
 * Deterministic hub action: "Rally Support Staff" restores supportAvailable by a fixed amount.
 * If a contractor asset is present in externalSupportAssets, its reliability modifies the
 * amount restored and the asset's reliability drifts based on the outcome.
 * Negative drift is standing-shaped via rival comparative pressure (SPE-2700).
 * One persisted contractor/faction aid edge may apply a bounded post-outcome reputation
 * consequence once per campaign week (SPE-2722). Returns updated GameState and a note for
 * reporting.
 */
export function applyRallySupportStaffAction(state: GameState, amount: number = 2) {
  if (!state.agency) return { nextState: state, note: null }
  const prev = state.agency.supportAvailable ?? 0

  // Find the first contractor in deterministic code-unit ID order (if any).
  const assets = state.externalSupportAssets ?? {}
  const contractor = Object.values(assets)
    .filter((asset) => asset.assetClass === 'contractor')
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))[0]

  let effectiveAmount = amount
  let assetReason: string | null = null
  let authorityReason: string | null = null
  let authorityEdgeId: string | null = null
  let authorityFactionId: string | null = null
  let authorityReputationDelta = 0
  let updatedAssets = assets
  let updatedFactions = state.factions

  if (contractor) {
    const outcome = resolveAssetSupportOutcome(contractor, amount)
    effectiveAmount = Math.max(0, outcome.modifiedScore)
    assetReason = outcome.outcomeReason
    const { trustFailureDriftScale } = buildRivalPressure(state)
    const drifted = applyAssetReliabilityDrift(contractor, outcome.driftTrigger, {
      trustFailureDriftScale,
    })
    let updatedContractor = drifted.asset

    const authorityConsequence = resolvePersistedExternalSupportAuthorityConsequence(
      state,
      contractor
    )
    if (authorityConsequence && state.factions?.[authorityConsequence.factionId]) {
      const faction = state.factions[authorityConsequence.factionId]
      const reputationBefore = faction.reputation ?? 0
      const reputationAfter = Math.max(
        -100,
        Math.min(100, reputationBefore + authorityConsequence.reputationDelta)
      )
      authorityReputationDelta = reputationAfter - reputationBefore

      if (authorityReputationDelta !== 0) {
        updatedContractor = {
          ...updatedContractor,
          lastAuthorityConsequenceWeek: state.week,
        }
        updatedFactions = applyFactionRecruitInteraction(state.factions, {
          factionId: authorityConsequence.factionId,
          reputationDelta: authorityReputationDelta,
        })
        authorityEdgeId = authorityConsequence.edgeId
        authorityFactionId = authorityConsequence.factionId
        authorityReason =
          `Authority edge ${authorityConsequence.edgeId} shifted ` +
          `${authorityConsequence.factionId} faction reputation ` +
          `${authorityReputationDelta > 0 ? '+' : ''}${authorityReputationDelta} ` +
          `(${authorityConsequence.reasonCode}).`
      }
    }

    updatedAssets = { ...assets, [contractor.id]: updatedContractor }
  }

  const next = prev + effectiveAmount

  const nextState: GameState = {
    ...state,
    agency: {
      ...state.agency,
      supportAvailable: next,
    },
    supportAvailable: next, // legacy compatibility
    externalSupportAssets: contractor ? updatedAssets : state.externalSupportAssets,
    factions: updatedFactions,
  }

  const baseNote = buildSupportRestoredNote(effectiveAmount, prev, next, state.week)
  const note = {
    ...baseNote,
    content: [baseNote.content, assetReason, authorityReason].filter(Boolean).join(' '),
    metadata: {
      ...baseNote.metadata,
      contractorAssetId: contractor?.id ?? null,
      authorityEdgeId,
      authorityFactionId,
      authorityReputationDelta,
    },
  }
  return { nextState, note }
}
