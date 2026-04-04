import {
  type CaseInstance,
  type PerformanceMetricSummary,
  type GameState,
  type Team,
} from '../../domain/models'
import { buildResolutionPreviewState, previewCaseOutcome } from '../../domain/sim/resolve'
import type { CaseEquipmentSummary } from '../../domain/sim/scoring'
import { TEAM_INSIGHTS_PRIORITIZATION } from './teamInsightsConfig'

export interface TeamAssignableCaseView {
  currentCase: CaseInstance
  success: number
  partial: number
  fail: number
  performanceSummary: PerformanceMetricSummary
  equipmentSummary: CaseEquipmentSummary
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function getStagePressure(stage: number) {
  // Stage is usually in 1..5; normalize to 0..1 while staying resilient to out-of-range values.
  return clamp01((stage - 1) / 4)
}

function getDeadlinePressure(deadlineRemaining: number) {
  const boundedDeadline = Math.max(
    0,
    Math.min(TEAM_INSIGHTS_PRIORITIZATION.maxDeadlineForScoring, deadlineRemaining)
  )
  return 1 - boundedDeadline / TEAM_INSIGHTS_PRIORITIZATION.maxDeadlineForScoring
}

function getCaseUrgencyScore(currentCase: CaseInstance) {
  // Stage should dominate urgency, deadline refines it.
  return (
    getStagePressure(currentCase.stage) * TEAM_INSIGHTS_PRIORITIZATION.urgencyStageWeight +
    getDeadlinePressure(currentCase.deadlineRemaining) *
      TEAM_INSIGHTS_PRIORITIZATION.urgencyDeadlineWeight
  )
}

function getCaseViabilityScore(view: Pick<TeamAssignableCaseView, 'success' | 'partial'>) {
  return view.success + view.partial * TEAM_INSIGHTS_PRIORITIZATION.partialOddsValue
}

function getPrioritizationScore(view: TeamAssignableCaseView) {
  return (
    getCaseViabilityScore(view) * TEAM_INSIGHTS_PRIORITIZATION.viabilityWeight +
    getCaseUrgencyScore(view.currentCase) * TEAM_INSIGHTS_PRIORITIZATION.urgencyWeight
  )
}

export function getTeamAssignableCaseViews(team: Team, game: GameState, limit = 4) {
  const previewState = buildResolutionPreviewState(game)
  const views: TeamAssignableCaseView[] = []

  for (const currentCase of Object.values(game.cases)) {
    const outcomePreview = previewCaseOutcome(team, currentCase, previewState)

    if (outcomePreview.blockedReason || !outcomePreview.preview || !outcomePreview.odds) {
      continue
    }

    views.push({
      currentCase,
      success: outcomePreview.odds.success,
      partial: outcomePreview.odds.partial,
      fail: outcomePreview.odds.fail,
      performanceSummary: outcomePreview.preview.performanceSummary,
      equipmentSummary: outcomePreview.preview.equipmentSummary,
    })
  }

  return views
    .sort(
      (left, right) =>
        getPrioritizationScore(right) - getPrioritizationScore(left) ||
        right.success - left.success ||
        right.currentCase.stage - left.currentCase.stage ||
        left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
        left.currentCase.title.localeCompare(right.currentCase.title)
    )
    .slice(0, limit)
}
