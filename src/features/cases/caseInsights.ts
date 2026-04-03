import {
  type CaseInstance,
  type PerformanceMetricSummary,
  type GameState,
  type Team,
} from '../../domain/models'
import type { CaseEquipmentSummary } from '../../domain/sim/scoring'
import {
  buildResolutionPreviewState,
  previewCaseOutcome,
  type CaseOutcomePreviewBlockReason,
  type OutcomeOdds,
} from '../../domain/sim/resolve'

export type CaseAssignmentBlockReason = CaseOutcomePreviewBlockReason

export interface CaseAssignmentBlockedTeamView {
  team: Team
  reason: CaseAssignmentBlockReason
  detail: string
}

export interface CaseAssignmentEligibleTeamView {
  team: Team
  odds: OutcomeOdds
  performanceSummary: PerformanceMetricSummary
  equipmentSummary: CaseEquipmentSummary
}

export interface CaseAssignmentInsights {
  availableTeams: CaseAssignmentEligibleTeamView[]
  blockedTeams: CaseAssignmentBlockedTeamView[]
}

export function getCaseAssignmentInsights(currentCase: CaseInstance, game: GameState) {
  const previewState = buildResolutionPreviewState(game)
  const availableTeams: CaseAssignmentEligibleTeamView[] = []
  const blockedTeams: CaseAssignmentBlockedTeamView[] = []
  const assignedTeamIds = new Set(
    currentCase.assignedTeamIds.filter((teamId) => Boolean(game.teams[teamId]))
  )

  for (const team of Object.values(game.teams)) {
    if (assignedTeamIds.has(team.id)) {
      continue
    }

    const outcomePreview = previewCaseOutcome(team, currentCase, previewState)
    const resolutionPreview = outcomePreview.preview

    if (outcomePreview.blockedReason || !outcomePreview.odds || !resolutionPreview) {
      blockedTeams.push({
        team,
        reason: outcomePreview.blockedReason ?? 'resolved',
        detail: outcomePreview.blockedDetail ?? 'Assignment is currently blocked.',
      })
      continue
    }

    availableTeams.push({
      team,
      odds: outcomePreview.odds,
      performanceSummary: resolutionPreview.performanceSummary,
      equipmentSummary: resolutionPreview.equipmentSummary,
    })
  }

  availableTeams.sort(
    (left, right) =>
      right.odds.success - left.odds.success ||
      right.odds.partial - left.odds.partial ||
      left.team.name.localeCompare(right.team.name)
  )

  return {
    availableTeams,
    blockedTeams,
  } satisfies CaseAssignmentInsights
}
