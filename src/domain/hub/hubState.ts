// Canonical bounded hub-state generator for SPE-53
import type { GameState } from '../models'
import { buildFactionStates } from '../factions'
import { inspectDistortion } from '../shared/distortion'

export interface HubOpportunity {
  id: string
  label: string
  detail: string
  factionId: string
  confidence: number // 0-1, reliability/confidence
  misleading?: boolean
  /** Optional: minimum sanction level required to access this opportunity */
  requiredSanctionLevel?: 'sanctioned' | 'covert' | 'tolerated' | 'unsanctioned'
  /** Explanation for access gating (blocked, risky, costly, etc) */
  accessExplanation?: string
  /** Resulting access state for this opportunity */
  accessState?: 'allowed' | 'blocked' | 'risky' | 'costly'
}

export interface HubRumor {
  id: string
  label: string
  detail: string
  confidence: number // 0-1
  misleading?: boolean
  filtered?: boolean
}

export interface HubState {
  districtKey: string
  factionPresence: Record<string, number>
  opportunities: HubOpportunity[]
  rumors: HubRumor[]
}

// Deterministic bounded hub-state generator
export function generateHubState(game: GameState): HubState {
  // For this pass, support two static districts
  const districts = ['central_hub', 'industrial_zone']
  // Faction presence: use standing as presence proxy
  const factionPresence: Record<string, number> = {}
  const factions = buildFactionStates(game)
  for (const f of factions) {
    factionPresence[f.id] = f.standing
  }

  // Generate up to 2 opportunities and 2 rumors per district, from top 2 factions by standing
  const sortedFactions = [...factions].sort((a, b) => b.standing - a.standing)
  const topFactions = sortedFactions.slice(0, 2)

  // Pick district (static for now)
  const districtKey = districts[0]

  // Gather recent case outcomes (last report if available)
  let recentOutcomes: string[] = []
  if (Array.isArray(game.reports) && game.reports.length > 0) {
    const lastReport = game.reports[game.reports.length - 1]
    recentOutcomes = [
      ...(lastReport.resolvedCases ?? []),
      ...(lastReport.failedCases ?? []),
      ...(lastReport.partialCases ?? []),
      ...(lastReport.unresolvedTriggers ?? []),
    ]
  }

  // Opportunities: one per top faction if available, boost confidence if recent success, lower if recent fail
  // SPE-53: Legitimacy gating for the first opportunity (bounded pass)
  const playerLegitimacy = game.legitimacy?.sanctionLevel ?? 'unsanctioned'
  // For this pass, only the first opportunity (from the top faction) is gated
  const opportunities: HubOpportunity[] = topFactions.flatMap((f, i) =>
    f.opportunities.slice(0, 1).map((opp) => {
      const distortion = inspectDistortion(f.distortion)
      let confidence = Math.max(0.5, Math.min(1, f.reliability / 100))
      // If any resolved case in last report, boost confidence
      if (recentOutcomes.length > 0 && recentOutcomes.some((id) => id && id.startsWith('case'))) {
        confidence = Math.min(1, confidence + 0.1)
      }
      // If any failed/unresolved case, lower confidence
      if (recentOutcomes.length > 0 && recentOutcomes.some((id) => id && id.startsWith('fail'))) {
        confidence = Math.max(0.2, confidence - 0.2)
      }
      // Only the first opportunity is gated for this pass
      let requiredSanctionLevel: 'sanctioned' | 'covert' | 'tolerated' | 'unsanctioned' | undefined = undefined
      let accessExplanation: string | undefined = undefined
      let accessState: 'allowed' | 'blocked' | 'risky' | 'costly' = 'allowed'
      if (i === 0) {
        requiredSanctionLevel = 'sanctioned'
        if (playerLegitimacy === 'sanctioned') {
          accessState = 'allowed'
          accessExplanation = 'Action is sanctioned and authorized.'
        } else if (playerLegitimacy === 'covert') {
          accessState = 'risky'
          accessExplanation = 'Action is covert; risk of fallout if discovered.'
        } else if (playerLegitimacy === 'tolerated') {
          accessState = 'costly'
          accessExplanation = 'Action is tolerated but politically costly.'
        } else {
          accessState = 'blocked'
          accessExplanation = 'Action is unsanctioned and blocked by protocol.'
        }
      }
      return {
        id: `opportunity-${f.id}`,
        label: opp.label ?? 'Unknown Opportunity',
        detail: opp.detail ?? f.opportunityDetail ?? 'No detail.',
        factionId: f.id,
        confidence,
        misleading: distortion.primary === 'misleading',
        requiredSanctionLevel,
        accessExplanation,
        accessState,
      }
    })
  )

  // Rumors: one per top faction, confidence affected by recent outcomes
  const rumors: HubRumor[] = topFactions.map((f) => {
    const distortion = inspectDistortion(f.distortion)
    let rumorConfidence = Math.max(0.2, Math.min(1, 1 - f.distortion / 100))
    if (recentOutcomes.length > 0 && recentOutcomes.some((id) => id && id.startsWith('fail'))) {
      rumorConfidence = Math.max(0.2, rumorConfidence - 0.2)
    }
    return {
      id: `rumor-${f.id}`,
      label: f.hostileDetail ?? 'Unknown Rumor',
      detail: f.feedback ?? 'No details.',
      confidence: rumorConfidence,
      misleading: distortion.primary === 'misleading',
      filtered: rumorConfidence < 0.5,
    }
  })

  return {
    districtKey,
    factionPresence,
    opportunities,
    rumors,
  }
}
