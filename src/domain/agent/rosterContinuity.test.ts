import { describe, expect, it } from 'vitest'

import { createStartingState } from '../../data/startingState'
import { recomputeMissionRouting } from '../missionIntakeRouting'
import {
  applyRotatingRosterContinuityReconciliation,
  countRotatingRosterContinuity,
  formatRotatingRosterContinuitySummary,
  isCaseAffectedByRosterChange,
  reconcileRosterChangeOnCase,
  rotatingRosterContinuityRecapEnabled,
} from './rosterContinuity'

const NIGHTWATCH_TEAM_ID = 't_nightwatch'
const NIGHTWATCH_MEMBER_IDS = ['a_ava', 'a_kellan', 'a_mina', 'a_rook'] as const

function markAllAgentsLost(
  state: ReturnType<typeof createStartingState>,
  agentIds: readonly string[]
) {
  for (const agentId of agentIds) {
    const agent = state.agents[agentId]
    if (!agent) continue
    state.agents[agentId] = {
      ...agent,
      attritionState: {
        attritionStatus: 'lost',
        lossReasonCodes: ['spe-283-test'],
        replacementPriority: 1,
        retentionPressure: 0,
      },
    }
  }
}

function assignTeamToFirstCase(state: ReturnType<typeof createStartingState>): string {
  const caseId = Object.keys(state.cases)[0]!
  const team = state.teams[NIGHTWATCH_TEAM_ID]!
  state.cases[caseId] = {
    ...state.cases[caseId]!,
    status: 'in_progress',
    assignedTeamIds: [NIGHTWATCH_TEAM_ID],
    hiddenState: 'hidden',
    detectionConfidence: 0.3,
    displacementTarget: 'site_alpha',
    route: 'r:alpha->bravo',
    counterDetection: false,
  }
  state.teams[NIGHTWATCH_TEAM_ID] = {
    ...team,
    memberIds: [...NIGHTWATCH_MEMBER_IDS],
    agentIds: [...NIGHTWATCH_MEMBER_IDS],
    status: { state: 'deployed', assignedCaseId: caseId },
  }
  return caseId
}

describe('rotating-roster continuity (SPE-283)', () => {
  it('gates the rotating-roster recap on the same campaign-format envelope as SPE-281', () => {
    expect(
      rotatingRosterContinuityRecapEnabled({
        durationModel: 'capacity',
        challengeModeEnabled: false,
      })
    ).toBe(false)
    expect(
      rotatingRosterContinuityRecapEnabled({
        durationModel: 'attrition',
        challengeModeEnabled: false,
      })
    ).toBe(false)
    expect(
      rotatingRosterContinuityRecapEnabled({
        durationModel: 'attrition',
        challengeModeEnabled: true,
      })
    ).toBe(true)
  })

  it('flags an in-flight case as affected when at least one assigned-team member is absent', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)
    markAllAgentsLost(state, ['a_kellan'])

    expect(isCaseAffectedByRosterChange(state.cases[caseId]!, state.teams, state.agents)).toBe(true)
  })

  it('does not flag a case as affected when the assigned team has no absent members', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)

    expect(isCaseAffectedByRosterChange(state.cases[caseId]!, state.teams, state.agents)).toBe(
      false
    )
  })

  it('preserves inherited route/displacementTarget/detectionConfidence when some assigned operatives remain active', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)
    markAllAgentsLost(state, ['a_kellan'])

    const { nextCase, hiddenReplacementExposureReconciled } = reconcileRosterChangeOnCase(
      state.cases[caseId]!,
      state.teams,
      state.agents
    )

    expect(hiddenReplacementExposureReconciled).toBe(false)
    expect(nextCase.hiddenState).toBe('hidden')
    expect(nextCase.detectionConfidence).toBe(0.3)
    expect(nextCase.displacementTarget).toBe('site_alpha')
    expect(nextCase.route).toBe('r:alpha->bravo')
  })

  it('applies the bounded fallback (hidden->revealed, detection=1, route preserved) when no active assigned operative remains', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)
    markAllAgentsLost(state, NIGHTWATCH_MEMBER_IDS)

    const { nextCase, hiddenReplacementExposureReconciled } = reconcileRosterChangeOnCase(
      state.cases[caseId]!,
      state.teams,
      state.agents
    )

    expect(hiddenReplacementExposureReconciled).toBe(true)
    expect(nextCase.hiddenState).toBe('revealed')
    expect(nextCase.detectionConfidence).toBe(1)
    expect(nextCase.displacementTarget).toBe('site_alpha')
    expect(nextCase.route).toBe('r:alpha->bravo')
  })

  it('is idempotent for cases already in revealed state', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)
    state.cases[caseId] = {
      ...state.cases[caseId]!,
      hiddenState: 'revealed',
      detectionConfidence: 0.5,
    }
    markAllAgentsLost(state, NIGHTWATCH_MEMBER_IDS)

    const { nextCase, hiddenReplacementExposureReconciled } = reconcileRosterChangeOnCase(
      state.cases[caseId]!,
      state.teams,
      state.agents
    )

    expect(hiddenReplacementExposureReconciled).toBe(false)
    expect(nextCase.hiddenState).toBe('revealed')
    expect(nextCase.detectionConfidence).toBe(0.5)
  })

  it('does not count an unassigned hidden case as a reconciled exposure', () => {
    const state = createStartingState()
    const caseId = Object.keys(state.cases)[0]!
    state.cases[caseId] = {
      ...state.cases[caseId]!,
      status: 'in_progress',
      assignedTeamIds: [],
      hiddenState: 'hidden',
      detectionConfidence: 0.2,
    }

    const counts = countRotatingRosterContinuity(state)
    expect(counts.reconciledExposures).toBe(0)
  })

  it('does not reconcile an unassigned hidden case (no infiltrator was ever in role)', () => {
    const state = createStartingState()
    const caseId = Object.keys(state.cases)[0]!
    state.cases[caseId] = {
      ...state.cases[caseId]!,
      status: 'in_progress',
      assignedTeamIds: [],
      hiddenState: 'hidden',
      detectionConfidence: 0.2,
    }

    const { nextCase, hiddenReplacementExposureReconciled } = reconcileRosterChangeOnCase(
      state.cases[caseId]!,
      state.teams,
      state.agents
    )
    expect(hiddenReplacementExposureReconciled).toBe(false)
    expect(nextCase.hiddenState).toBe('hidden')
    expect(nextCase.detectionConfidence).toBe(0.2)
  })

  it('does not reconcile resolved cases', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)
    state.cases[caseId] = { ...state.cases[caseId]!, status: 'resolved' }
    markAllAgentsLost(state, NIGHTWATCH_MEMBER_IDS)

    expect(isCaseAffectedByRosterChange(state.cases[caseId]!, state.teams, state.agents)).toBe(
      false
    )
    const { hiddenReplacementExposureReconciled } = reconcileRosterChangeOnCase(
      state.cases[caseId]!,
      state.teams,
      state.agents
    )
    expect(hiddenReplacementExposureReconciled).toBe(false)
  })

  it('counts affected cases, reconciled exposures, active and absent roster deterministically', () => {
    const state = createStartingState()
    assignTeamToFirstCase(state)
    markAllAgentsLost(state, NIGHTWATCH_MEMBER_IDS)

    const counts = countRotatingRosterContinuity(state)
    expect(counts.affectedCases).toBeGreaterThanOrEqual(1)
    expect(counts.reconciledExposures).toBeGreaterThanOrEqual(1)
    expect(counts.absentRoster).toBe(NIGHTWATCH_MEMBER_IDS.length)
    expect(counts.activeRoster).toBe(
      Object.keys(state.agents).length - NIGHTWATCH_MEMBER_IDS.length
    )

    const line = formatRotatingRosterContinuitySummary(state)
    expect(line).toContain('Rotating-roster continuity')
    expect(line).toContain(`${counts.affectedCases} in-flight case(s)`)
    expect(line).toContain(`${counts.reconciledExposures} hidden-replacement packet(s)`)
    expect(line).toContain(`active roster ${counts.activeRoster}`)
    expect(line).toContain(`absent ${counts.absentRoster}`)
  })

  it('applyRotatingRosterContinuityReconciliation flips qualifying hidden cases and is idempotent', () => {
    const state = createStartingState()
    const caseId = assignTeamToFirstCase(state)
    markAllAgentsLost(state, NIGHTWATCH_MEMBER_IDS)

    const once = applyRotatingRosterContinuityReconciliation(state)
    expect(once.cases[caseId]!.hiddenState).toBe('revealed')
    expect(once.cases[caseId]!.detectionConfidence).toBe(1)
    expect(once.cases[caseId]!.route).toBe('r:alpha->bravo')
    expect(once.cases[caseId]!.displacementTarget).toBe('site_alpha')

    const twice = applyRotatingRosterContinuityReconciliation(once)
    expect(twice.cases[caseId]!.hiddenState).toBe('revealed')
    expect(twice).toBe(once)
  })

  it('leaves mission routing canonical after reconciliation', () => {
    let state = createStartingState()
    assignTeamToFirstCase(state)
    markAllAgentsLost(state, NIGHTWATCH_MEMBER_IDS)
    state = { ...state, missionRouting: recomputeMissionRouting(state) }

    const reconciled = applyRotatingRosterContinuityReconciliation(state)

    expect(reconciled.missionRouting).toEqual(recomputeMissionRouting(reconciled))
  })

  it('returns state unchanged when nothing qualifies for reconciliation', () => {
    const state = createStartingState()
    assignTeamToFirstCase(state)
    markAllAgentsLost(state, ['a_kellan'])

    const result = applyRotatingRosterContinuityReconciliation(state)
    expect(result).toBe(state)
  })
})
