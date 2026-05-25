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

/** True when nextTurnValue crosses a new wander-interval bucket (e.g. 2→4 still hits the 3-turn boundary). */
export function crossedSiteTurnWanderInterval(
  previousTurnValue: number,
  nextTurnValue: number
): boolean {
  if (nextTurnValue <= 0 || nextTurnValue <= previousTurnValue) {
    return false
  }

  const interval = SITE_EXPLORATION_TURN_WANDER_INTERVAL
  return Math.floor(nextTurnValue / interval) > Math.floor(previousTurnValue / interval)
}

export function shouldTriggerSiteWanderingCheck(
  previousTurnValue: number,
  nextTurnValue: number,
  alertValue: number
): boolean {
  if (alertValue >= SITE_EXPLORATION_ALERT_WANDER_THRESHOLD) {
    return true
  }

  if (alertValue <= 0) {
    return false
  }

  return crossedSiteTurnWanderInterval(previousTurnValue, nextTurnValue)
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

/**
 * Applies one exploration action. `actionId` is a string (not the union type) so UI,
 * saves, and future callers can pass runtime input without casting; invalid ids return
 * `unknown_action` instead of throwing.
 */
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

  const validatedActionId = actionId
  const turnCost = SITE_EXPLORATION_ACTION_COST_TURNS[validatedActionId]
  const alertDelta = SITE_EXPLORATION_ACTION_ALERT_DELTA[validatedActionId]
  const turnClockId = getSiteExplorationTurnClockId(caseId)
  const alertClockId = getSiteExplorationAlertClockId(caseId)
  const previousTurnValue = readSiteExplorationTurnValue(state, caseId)

  let nextState = advanceDefinedProgressClock(state, turnClockId, turnCost, turnClockDefaults(currentCase))
  nextState = advanceDefinedProgressClock(
    nextState,
    alertClockId,
    alertDelta,
    alertClockDefaults(currentCase)
  )

  const turnValue = readSiteExplorationTurnValue(nextState, caseId)
  const alertValue = readSiteExplorationAlertValue(nextState, caseId)

  return {
    state: nextState,
    applied: true,
    actionId: validatedActionId,
    turnCost,
    alertDelta,
    turnValue,
    alertValue,
    wanderingCheckTriggered: shouldTriggerSiteWanderingCheck(
      previousTurnValue,
      turnValue,
      alertValue
    ),
  }
}
