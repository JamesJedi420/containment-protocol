// SPE-38: Hub action to restore support pool
import type { GameState } from '../models'
import {
  resolveAssetSupportOutcome,
  applyAssetReliabilityDrift,
} from '../externalSupport'

/**
 * Deterministic hub action: "Rally Support Staff" restores supportAvailable by a fixed amount.
 * If a contractor asset is present in externalSupportAssets, its reliability modifies the
 * amount restored and the asset's reliability drifts based on the outcome.
 * Returns updated GameState and a note for reporting.
 */
export function applyRallySupportStaffAction(state: GameState, amount: number = 2) {
  if (!state.agency) return { nextState: state, note: null }
  const prev = state.agency.supportAvailable ?? 0

  // Find the first active contractor asset (if any).
  const assets = state.externalSupportAssets ?? {}
  const contractor = Object.values(assets).find(a => a.assetClass === 'contractor')

  let effectiveAmount = amount
  let assetReason: string | null = null
  let updatedAssets = assets

  if (contractor) {
    const outcome = resolveAssetSupportOutcome(contractor, amount)
    effectiveAmount = Math.max(0, outcome.modifiedScore)
    assetReason = outcome.outcomeReason
    const drifted = applyAssetReliabilityDrift(contractor, outcome.driftTrigger)
    updatedAssets = { ...assets, [contractor.id]: drifted.asset }
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
  }

  const baseContent = `Support staff rallied: +${effectiveAmount} support restored (now ${next}).`
  const note = {
    id: `note-support-restored-${state.week}`,
    content: assetReason ? `${baseContent} ${assetReason}` : baseContent,
    timestamp: Date.now(),
    type: 'support.restored',
    metadata: { prev, next, amount: effectiveAmount, week: state.week, contractorAssetId: contractor?.id ?? null },
  }
  return { nextState, note }
}
