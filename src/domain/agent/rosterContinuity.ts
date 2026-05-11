// SPE-283: Rotating-roster continuity — bounded deterministic rules for in-flight
// cases whose assigned roster has changed (absent actors) and for hidden-replacement
// case packets that need a fallback after the infiltrator is exposed, destroyed, or
// forced out of the active role.
//
// This module deliberately reuses the SPE-281 continuity / attrition foundation
// rather than introducing a parallel roster-management system: absent actors come
// from `AgentAttritionState`, and the canonical re-derivation flows through
// `recomputeAttritionDerivedState`.

import type { CaseInstance, GameState, Id } from '../models'
import { getTeamMembers } from '../teamSimulation'
import { isAgentAttritionUnavailable } from './attrition'
import {
  crossSessionAttritionPersistenceEnabled,
  type AttritionContinuityCounts,
} from './attritionContinuity'
import { recomputeAttritionDerivedState } from './attritionReset'

const HIDDEN_REPLACEMENT_EXPOSURE_DETECTION_CONFIDENCE = 1

/**
 * Returns true when an in-flight case has at least one assigned-team member who
 * is currently absent (`lost` or `temporarily_unavailable`). Cases that are not
 * yet assigned or already resolved do not participate.
 */
export function isCaseAffectedByRosterChange(
  caseData: Pick<CaseInstance, 'status' | 'assignedTeamIds'>,
  teams: GameState['teams'],
  agentsById: GameState['agents']
): boolean {
  if (caseData.status === 'resolved') {
    return false
  }
  if (caseData.assignedTeamIds.length === 0) {
    return false
  }

  for (const teamId of caseData.assignedTeamIds) {
    const team = teams[teamId]
    if (!team) continue
    const members = getTeamMembers(team, agentsById)
    if (members.some((member) => isAgentAttritionUnavailable(member))) {
      return true
    }
  }

  return false
}

/**
 * Returns true when the case has at least one assigned-team member who is still
 * active (that is, not attrition-unavailable). If the case is unassigned, this
 * returns false because there is no assigned operative to evaluate.
 */
function hasAnyActiveAssignedOperative(
  caseData: Pick<CaseInstance, 'assignedTeamIds'>,
  teams: GameState['teams'],
  agentsById: GameState['agents']
): boolean {
  if (caseData.assignedTeamIds.length === 0) {
    return false
  }

  for (const teamId of caseData.assignedTeamIds) {
    const team = teams[teamId]
    if (!team) continue
    const members = getTeamMembers(team, agentsById)
    if (members.some((member) => !isAgentAttritionUnavailable(member))) {
      return true
    }
  }

  return false
}

export interface RosterChangeReconciliation {
  nextCase: CaseInstance
  /**
   * True when a hidden-replacement packet was promoted to `revealed` because no
   * active assigned operative remained — the bounded fallback for restoring
   * player participation after the infiltrator was exposed, destroyed, or
   * forced out of the active role.
   */
  hiddenReplacementExposureReconciled: boolean
}

/**
 * Single explicit inherited-decision rule for a case whose assigned roster has
 * changed. The inherited group decision is the case's prior mission decision
 * surface — `route`, `displacementTarget`, `detectionConfidence`, and
 * `counterDetection` — which is preserved verbatim across the rotation.
 *
 * Bounded fallback: when the case is in `hiddenState === 'hidden'` and there
 * is no longer any active assigned operative to carry the cover, the case is
 * promoted to `'revealed'` and `detectionConfidence` is floored at 1, so
 * participation is restored to the visible-roster path without the prior route
 * being discarded.
 */
export function reconcileRosterChangeOnCase(
  caseData: CaseInstance,
  teams: GameState['teams'],
  agentsById: GameState['agents']
): RosterChangeReconciliation {
  if (caseData.status === 'resolved') {
    return { nextCase: caseData, hiddenReplacementExposureReconciled: false }
  }

  if (caseData.hiddenState !== 'hidden') {
    return { nextCase: caseData, hiddenReplacementExposureReconciled: false }
  }

  // Unassigned hidden cases have no assigned infiltrator to lose; the
  // bounded fallback only fires when a prior assignment has been emptied
  // of every active operative.
  if (caseData.assignedTeamIds.length === 0) {
    return { nextCase: caseData, hiddenReplacementExposureReconciled: false }
  }

  if (hasAnyActiveAssignedOperative(caseData, teams, agentsById)) {
    return { nextCase: caseData, hiddenReplacementExposureReconciled: false }
  }

  const nextCase: CaseInstance = {
    ...caseData,
    hiddenState: 'revealed',
    detectionConfidence: HIDDEN_REPLACEMENT_EXPOSURE_DETECTION_CONFIDENCE,
  }

  return { nextCase, hiddenReplacementExposureReconciled: true }
}

export interface RotatingRosterContinuityCounts {
  /**
   * In-flight cases (open or in-progress, assigned) where at least one
   * assigned-team member is currently absent (lost or temporarily unavailable).
   */
  affectedCases: number
  /**
   * Hidden-replacement case packets that were promoted to `'revealed'` because
   * no active assigned operative remained to carry the cover (the bounded
   * fallback path). A subset of `affectedCases`.
   */
  reconciledExposures: number
  /**
   * Count of agents currently active (no attrition status, or status `active`).
   * The visible-roster baseline for returning + newly arriving participants.
   */
  activeRoster: number
  /**
   * Count of agents currently absent (lost or temporarily unavailable) — the
   * absent-actor reconciliation cohort.
   */
  absentRoster: number
}

export function countRotatingRosterContinuity(state: GameState): RotatingRosterContinuityCounts {
  let affectedCases = 0
  let reconciledExposures = 0

  for (const caseData of Object.values(state.cases)) {
    if (!isCaseAffectedByRosterChange(caseData, state.teams, state.agents)) {
      continue
    }
    affectedCases += 1

    if (
      caseData.hiddenState === 'hidden' &&
      caseData.hiddenState === 'hidden' &&
      !hasAnyActiveAssignedOperative(caseData, state.teams, state.agents)
    ) {
      reconciledExposures += 1
    }
  }

  let activeRoster = 0
  let absentRoster = 0
  for (const agent of Object.values(state.agents)) {
    if (isAgentAttritionUnavailable(agent)) {
      absentRoster += 1
    } else {
      activeRoster += 1
    }
  }

  return { affectedCases, reconciledExposures, activeRoster, absentRoster }
}

/**
 * Single bounded recap-ready continuity line for rotating-roster flows.
 *
 * Deterministic from canonical state; readable cold by both returning and
 * newly arriving participants without session-note context.
 */
export function formatRotatingRosterContinuitySummary(
  stateOrCounts: GameState | RotatingRosterContinuityCounts
): string {
  const c =
    'affectedCases' in stateOrCounts ? stateOrCounts : countRotatingRosterContinuity(stateOrCounts)
  return (
    `Rotating-roster continuity: ${c.affectedCases} in-flight case(s) with absent ` +
    `assigned operatives, ${c.reconciledExposures} hidden-replacement packet(s) ` +
    `reconciled to revealed; active roster ${c.activeRoster}, absent ${c.absentRoster}.`
  )
}

/**
 * Convenience union of the SPE-281 and SPE-283 continuity counts for recap
 * surfaces that want both numbers without re-walking the agent map twice.
 */
export interface RotatingRosterAndAttritionCounts
  extends
    RotatingRosterContinuityCounts,
    Omit<AttritionContinuityCounts, 'replacementPressure' | 'staffingGap'> {}

/**
 * Whether the rotating-roster continuity recap surfaces for the current
 * campaign format. Gated on the same persistence envelope as SPE-281 so the
 * two recap lines surface together in attrition-mode challenge campaigns.
 */
export function rotatingRosterContinuityRecapEnabled(
  config: Parameters<typeof crossSessionAttritionPersistenceEnabled>[0]
): boolean {
  return crossSessionAttritionPersistenceEnabled(config)
}

/**
 * Applies the bounded rotating-roster reconciliation rule to every in-flight
 * case, then re-derives routing / pressure / readiness / contracts through the
 * canonical sequence so the result is deterministic and idempotent.
 *
 * Safe to call repeatedly: cases already in `revealed` / `displaced` are
 * untouched, and cases without absent assigned operatives are returned as-is.
 */
export function applyRotatingRosterContinuityReconciliation(state: GameState): GameState {
  let changed = false
  const nextCases: Record<Id, CaseInstance> = {}

  for (const [caseId, caseData] of Object.entries(state.cases)) {
    const { nextCase, hiddenReplacementExposureReconciled } = reconcileRosterChangeOnCase(
      caseData,
      state.teams,
      state.agents
    )
    nextCases[caseId] = nextCase
    if (hiddenReplacementExposureReconciled) {
      changed = true
    }
  }

  if (!changed) {
    return state
  }

  return recomputeAttritionDerivedState({ ...state, cases: nextCases })
}
