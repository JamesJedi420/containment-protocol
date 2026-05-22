// SPE-1610 / SPE-2260: Discrete site exploration turns and action costs for active map sites.
import {
  advanceDefinedProgressClock,
  readProgressClock,
  type ProgressClockDefaults,
} from './progressClocks'
import type { CaseInstance, GameState } from './models'

export const SITE_EXPLORATION_ACTION_IDS = [
  'search',
  'scan',
  'breach',
  'listen',
  'hide',
  'rest',
  'repair',
  'disarm',
  'interrogate',
  'move',
  'retreat',
] as const

export type SiteExplorationActionId = (typeof SITE_EXPLORATION_ACTION_IDS)[number]

/** Turn segments consumed per exploration action. */
export const SITE_EXPLORATION_ACTION_COST_TURNS: Record<SiteExplorationActionId, number> = {
  search: 1,
  scan: 1,
  listen: 1,
  hide: 1,
  move: 1,
  rest: 2,
  repair: 2,
  disarm: 2,
  interrogate: 2,
  breach: 3,
  retreat: 1,
}

/** Alert pressure added when the action is noisy or exposes the team. */
export const SITE_EXPLORATION_ACTION_ALERT_DELTA: Record<SiteExplorationActionId, number> = {
  search: 0,
  scan: 0,
  listen: 0,
  hide: 0,
  move: 0,
  rest: 0,
  repair: 1,
  disarm: 1,
  interrogate: 1,
  breach: 3,
  retreat: 1,
}

export const SITE_EXPLORATION_ALERT_WANDER_THRESHOLD = 4
export const SITE_EXPLORATION_TURN_WANDER_INTERVAL = 3

const EXPLORATION_TURN_CLOCK_MAX = 99
const EXPLORATION_ALERT_CLOCK_MAX = 12

export function getSiteExplorationTurnClockId(caseId: string): string {
  return `site.exploration.${caseId}.turn`
}

export function getSiteExplorationAlertClockId(caseId: string): string {
  return `site.exploration.${caseId}.alert`
}

export function isSiteExplorationActionId(value: string): value is SiteExplorationActionId {
  return (SITE_EXPLORATION_ACTION_IDS as readonly string[]).includes(value)
}

/**
 * Active when the case has a resolved site map and spatial site flags (field operations).
 */
export function isCaseInSiteExplorationPhase(currentCase: CaseInstance): boolean {
  return (
    currentCase.status === 'in_progress' &&
    currentCase.mapLayer != null &&
    (currentCase.spatialFlags?.length ?? 0) > 0
  )
}

function turnClockDefaults(currentCase: CaseInstance): ProgressClockDefaults {
  return {
    label: `Site turns: ${currentCase.title}`,
    max: EXPLORATION_TURN_CLOCK_MAX,
    hidden: true,
  }
}

function alertClockDefaults(currentCase: CaseInstance): ProgressClockDefaults {
  return {
    label: `Site alert: ${currentCase.title}`,
    max: EXPLORATION_ALERT_CLOCK_MAX,
    hidden: true,
  }
}

export function readSiteExplorationTurnValue(state: GameState, caseId: string): number {
  return readProgressClock(state, getSiteExplorationTurnClockId(caseId))?.value ?? 0
}

export function readSiteExplorationAlertValue(state: GameState, caseId: string): number {
  return readProgressClock(state, getSiteExplorationAlertClockId(caseId))?.value ?? 0
}

export function shouldTriggerSiteWanderingCheck(turnValue: number, alertValue: number): boolean {
  if (alertValue >= SITE_EXPLORATION_ALERT_WANDER_THRESHOLD) {
    return true
  }

  return turnValue > 0 && turnValue % SITE_EXPLORATION_TURN_WANDER_INTERVAL === 0 && alertValue > 0
}

export interface ApplySiteExplorationActionResult {
  state: GameState
  applied: boolean
  reason?: 'invalid_case' | 'not_site_exploration' | 'unknown_action'
  actionId?: SiteExplorationActionId
  turnCost?: number
  alertDelta?: number
  turnValue?: number
  alertValue?: number
  wanderingCheckTriggered?: boolean
}

export function applySiteExplorationAction(
  state: GameState,
  caseId: string,
  actionId: string
): ApplySiteExplorationActionResult {
  const currentCase = state.cases[caseId]
  if (!currentCase) {
    return { state, applied: false, reason: 'invalid_case' }
  }

  if (!isCaseInSiteExplorationPhase(currentCase)) {
    return { state, applied: false, reason: 'not_site_exploration' }
  }

  if (!isSiteExplorationActionId(actionId)) {
    return { state, applied: false, reason: 'unknown_action' }
  }

  const turnCost = SITE_EXPLORATION_ACTION_COST_TURNS[actionId]
  const alertDelta = SITE_EXPLORATION_ACTION_ALERT_DELTA[actionId]
  const turnClockId = getSiteExplorationTurnClockId(caseId)
  const alertClockId = getSiteExplorationAlertClockId(caseId)

  let nextState = advanceDefinedProgressClock(state, turnClockId, turnCost, turnClockDefaults(currentCase))
  if (alertDelta > 0) {
    nextState = advanceDefinedProgressClock(
      nextState,
      alertClockId,
      alertDelta,
      alertClockDefaults(currentCase)
    )
  } else {
    // Ensure alert clock exists for wandering reads even on silent actions.
    nextState = advanceDefinedProgressClock(nextState, alertClockId, 0, alertClockDefaults(currentCase))
  }

  const turnValue = readSiteExplorationTurnValue(nextState, caseId)
  const alertValue = readSiteExplorationAlertValue(nextState, caseId)

  return {
    state: nextState,
    applied: true,
    actionId,
    turnCost,
    alertDelta,
    turnValue,
    alertValue,
    wanderingCheckTriggered: shouldTriggerSiteWanderingCheck(turnValue, alertValue),
  }
}
