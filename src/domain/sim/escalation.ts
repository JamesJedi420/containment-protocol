import { type CaseInstance } from '../models'
import {
  getOutcomeBand,
  resolveConsequenceRoute,
} from '../shared/outcomes'
import type { ThreatFamily } from '../shared/modifiers'
import { explainCountermeasures, hasEffectiveCountermeasure } from '../resistances'

export interface DeadlineEscalationTransition {
  nextCase: CaseInstance
  convertedToRaid: boolean
}

export interface ResolutionEscalationTransition {
  nextCase: CaseInstance
  nextStage: number
}

export function createDeadlineEscalationTransition(
  currentCase: CaseInstance
): DeadlineEscalationTransition {
  const nextStage = Math.min(currentCase.stage + (currentCase.onUnresolved.stageDelta ?? 0), 5)
  const convertedToRaid =
    currentCase.onUnresolved.convertToRaidAtStage !== undefined &&
    nextStage >= currentCase.onUnresolved.convertToRaidAtStage

  // Determine threat family from case (default to 'containment' if not present)
  const threatFamily: ThreatFamily = currentCase.threatFamily ?? 'containment'
  const presentTags = currentCase.tags
  const hasCounter = hasEffectiveCountermeasure({ family: threatFamily, presentTags })
  const counterExplanation = explainCountermeasures({ family: threatFamily, presentTags })

  // Determine outcome band for escalation (example: use stage as proxy for result)
  // In a real implementation, this would be based on resolution result or escalation severity
  const outcomeValue = nextStage - 3 // Centered at 0 for stage 3
  const band = getOutcomeBand(outcomeValue)
  const consequenceRoute = resolveConsequenceRoute(threatFamily, band, nextStage === 5 && !hasCounter)

  // Attach consequences and severeHit to nextCase for downstream surfacing
  return {
    convertedToRaid,
    nextCase: {
      ...currentCase,
      kind: convertedToRaid ? 'raid' : currentCase.kind,
      raid: convertedToRaid ? (currentCase.raid ?? { minTeams: 2, maxTeams: 2 }) : currentCase.raid,
      stage: nextStage,
      deadlineRemaining: currentCase.onUnresolved.deadlineResetWeeks ?? currentCase.deadlineWeeks,
      consequences: consequenceRoute.consequences,
      severeHit: consequenceRoute.severeHit,
      escalationBand: consequenceRoute.band,
      counterExplanation,
    },
  }
}

export function decrementOpenDeadline(currentCase: CaseInstance): CaseInstance {
  return {
    ...currentCase,
    deadlineRemaining: currentCase.deadlineRemaining - 1,
  }
}

export function createResolutionEscalationTransition(
  currentCase: CaseInstance,
  result: 'partial' | 'fail'
): ResolutionEscalationTransition {
  const nextStage =
    result === 'partial'
      ? Math.min(currentCase.stage + 1, 5)
      : Math.min(currentCase.stage + (currentCase.onFail.stageDelta ?? 0), 5)

  return {
    nextStage,
    nextCase: {
      ...currentCase,
      stage: nextStage,
    },
  }
}
