import { type CaseInstance } from '../models'
import { isSecondEscalationBandWeek, PRESSURE_CALIBRATION } from './calibration'

export interface DeadlineEscalationTransition {
  nextCase: CaseInstance
  convertedToRaid: boolean
}

export interface ResolutionEscalationTransition {
  nextCase: CaseInstance
  nextStage: number
}

export function createDeadlineEscalationTransition(
  currentCase: CaseInstance,
  week = currentCase.intelLastUpdatedWeek
): DeadlineEscalationTransition {
  const nextStage = Math.min(currentCase.stage + currentCase.onUnresolved.stageDelta, 5)
  const convertedToRaid =
    currentCase.onUnresolved.convertToRaidAtStage !== undefined &&
    nextStage >= currentCase.onUnresolved.convertToRaidAtStage

  const deadlineResetBonus = isSecondEscalationBandWeek(week)
    ? PRESSURE_CALIBRATION.secondEscalationDeadlineResetBonusWeeks
    : 0

  return {
    convertedToRaid,
    nextCase: {
      ...currentCase,
      kind: convertedToRaid ? 'raid' : currentCase.kind,
      raid: convertedToRaid ? (currentCase.raid ?? { minTeams: 2, maxTeams: 2 }) : currentCase.raid,
      stage: nextStage,
      deadlineRemaining:
        (currentCase.onUnresolved.deadlineResetWeeks ?? currentCase.deadlineWeeks) +
        deadlineResetBonus,
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
      : Math.min(currentCase.stage + currentCase.onFail.stageDelta, 5)

  return {
    nextStage,
    nextCase: {
      ...currentCase,
      stage: nextStage,
    },
  }
}
