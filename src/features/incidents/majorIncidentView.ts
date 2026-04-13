import { useGameStore } from '../../app/store/gameStore'
import { buildMajorIncidentProfile, type MajorIncidentProfile } from '../../domain/majorIncidents'
import {
  evaluateMajorIncidentPlan,
  getBestMajorIncidentPlanSuggestion,
} from '../../domain/majorIncidentOperations'
import type { CaseInstance, GameState } from '../../domain/models'

export interface MajorIncidentFlowView {
  activeIncident: MajorIncidentProfile | null
  context: {
    title: string
    briefing: string
    source: string
    severity: string
    urgency: string
    consequences: string[]
  } | null
  responseOptions: Array<{
    id: string
    label: string
    description: string
    blockers?: string[]
  }>
  selectedResponseId: string | null
  readiness: {
    readyTeams: string[]
    staffingGaps: string[]
    recoveryConstraints: string[]
    attritionPressure: string
    weakestLink: string
    likelyBlockers: string[]
  } | null
  outcomePreview: string | null
}

function getActiveMajorIncidentCase(game: GameState): CaseInstance | null {
  return (
    Object.values(game.cases).find(
      (currentCase) => currentCase.majorIncident && currentCase.status !== 'resolved'
    ) ?? null
  )
}

function getAttritionPressureLabel(replacementPressure = 0) {
  if (replacementPressure >= 4) {
    return 'Critical'
  }
  if (replacementPressure >= 2) {
    return 'Moderate'
  }
  if (replacementPressure >= 1) {
    return 'Elevated'
  }
  return 'Stable'
}

function sliceBoundedIssues(issues: string[], pattern: RegExp, fallback: string) {
  const matches = issues.filter((issue) => pattern.test(issue)).slice(0, 3)
  return matches.length > 0 ? matches : [fallback]
}

export function getMajorIncidentFlowView(): MajorIncidentFlowView {
  const game = useGameStore.getState().game
  const activeCase = getActiveMajorIncidentCase(game)
  const activeIncident = activeCase ? buildMajorIncidentProfile(activeCase) : null
  const runtime = activeCase?.majorIncident
  const evaluation = activeCase
    ? evaluateMajorIncidentPlan(game, activeCase, activeCase.assignedTeamIds, {
        strategy: runtime?.strategy,
        provisions: runtime?.provisions,
      }) ??
      getBestMajorIncidentPlanSuggestion(game, activeCase, {
        strategy: runtime?.strategy,
        provisions: runtime?.provisions,
      })
    : null

  const context = activeIncident
    ? {
        title: activeIncident.caseTitle,
        briefing: activeCase?.description ?? activeIncident.effectiveCase.description,
        source: activeCase?.factionId ?? activeIncident.archetypeLabel,
        severity: `Scale ${activeIncident.incidentScale}`,
        urgency: activeIncident.currentStage.label,
        consequences: activeIncident.currentStage.modifiers.map((modifier) => modifier.label).slice(0, 3),
      }
    : null

  const responseOptions = [
    {
      id: 'balanced',
      label: 'Balanced Response',
      description: 'Commit available teams with the current incident posture.',
      ...(evaluation && !evaluation.valid ? { blockers: evaluation.issues.slice(0, 2) } : {}),
    },
    {
      id: 'cautious',
      label: 'Cautious Response',
      description: 'Favor survivability and reduce avoidable exposure.',
    },
    {
      id: 'aggressive',
      label: 'Aggressive Response',
      description: 'Push for a faster resolution window at higher operational risk.',
    },
  ]

  const readiness = activeIncident
    ? {
        readyTeams: evaluation?.selectedTeams.map((preview) => preview.team.name) ?? [],
        staffingGaps: sliceBoundedIssues(
          evaluation?.issues ?? [],
          /(staff|coverage|required|missing team|eligible)/i,
          'No major staffing gap identified.'
        ),
        recoveryConstraints: sliceBoundedIssues(
          evaluation?.issues ?? [],
          /(fatigue|recovery|injury|medical|training)/i,
          'No major recovery constraint identified.'
        ),
        attritionPressure: getAttritionPressureLabel(
          game.replacementPressureState?.replacementPressure
        ),
        weakestLink:
          evaluation?.weakestTeamWarning ??
          evaluation?.weakestTeam?.team.name ??
          'No single bottleneck identified.',
        likelyBlockers:
          evaluation?.issues.slice(0, 3) ?? ['Select teams to generate an operational forecast.'],
      }
    : null

  const outcomePreview = evaluation
    ? `${evaluation.successBand} success outlook with ${evaluation.injuryRiskBand.toLowerCase()} injury risk.`
    : null

  return {
    activeIncident,
    context,
    responseOptions,
    selectedResponseId: runtime?.strategy ?? null,
    readiness,
    outcomePreview,
  }
}
