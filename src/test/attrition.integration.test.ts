import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { buildReplacementPressureState } from '../domain/agent/attrition'
import { evaluateDeploymentEligibility, buildTeamDeploymentReadinessState } from '../domain/deploymentReadiness'
import { triageMission } from '../domain/missionIntakeRouting'
import { buildRecruitmentFunnelSummary } from '../domain/recruitment'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import { analyzeRuntimeStability } from '../domain/stabilityLayer'
import { validateTeamComposition } from '../domain/teamComposition'
import { getAgentCoverageRoles } from '../domain/validateTeam'
import { getRecruitmentMetrics } from '../features/recruitment/recruitmentView'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

function buildLostAttritionState() {
  return {
    attritionStatus: 'lost' as const,
    attritionCategory: 'long_term_unavailable' as const,
    attritionSinceWeek: 1,
    lossReasonCodes: ['integration-test-loss'],
    replacementPriority: 1,
    retentionPressure: 0,
  }
}

function markAgentsLost<TState extends ReturnType<typeof createStartingState>>(
  state: TState,
  agentIds: string[]
) {
  return {
    ...state,
    agents: Object.fromEntries(
      Object.entries(state.agents).map(([agentId, agent]) => [
        agentId,
        agentIds.includes(agentId)
          ? {
              ...agent,
              attritionState: buildLostAttritionState(),
            }
          : agent,
      ])
    ),
  }
}

describe('attrition integration completion pass', () => {
  it('applies explicit attrition pressure to deployment readiness and mission triage', () => {
    const base = createStartingState()
    base.cases['case-001'] = {
      ...base.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
    }

    const pressured = markAgentsLost(
      base,
      (base.teams.t_nightwatch.memberIds ?? base.teams.t_nightwatch.agentIds).slice(0, 2)
    )

    const baselineTriage = triageMission(base, base.cases['case-001'])
    const pressuredTriage = triageMission(pressured, pressured.cases['case-001'])
    const eligibility = evaluateDeploymentEligibility(pressured, 'case-001', 't_nightwatch')
    const readiness = buildTeamDeploymentReadinessState(pressured, 't_nightwatch', 'case-001')

    expect(pressuredTriage.score).toBeLessThan(baselineTriage.score)
    expect(pressuredTriage.reasonCodes.some((code) => code.startsWith('attrition-pressure-'))).toBe(
      true
    )
    expect(eligibility.softRisks).toContain('attrition-pressure')
    expect(readiness.softRisks).toContain('attrition-pressure')
    expect(eligibility.timeCostSummary.timeCostReasonCodes).toContain('attrition-pressure-friction')
  })

  it('slows downtime recovery throughput under replacement pressure', () => {
    const base = createStartingState()
    const recoveringAgentId = 'a_ava'
    const pressured = markAgentsLost(base, ['a_kellan', 'a_sato'])
    pressured.agents[recoveringAgentId] = {
      ...pressured.agents[recoveringAgentId],
      status: 'recovering',
      assignment: { state: 'recovery', startedWeek: pressured.week - 1, teamId: 't_nightwatch' },
      recoveryStatus: { state: 'recovering', sinceWeek: pressured.week - 1 },
      trauma: { traumaLevel: 1, traumaTags: ['attrition-pressure'], lastEventWeek: pressured.week - 1 },
      fatigue: 24,
    }

    const downtimeAssignments = {
      [recoveringAgentId]: 'therapy' as const,
    }

    const baseline = advanceRecoveryDowntimeForWeek({
      week: pressured.week + 1,
      sourceAgents: pressured.agents,
      sourceTeams: pressured.teams,
      downtimeAssignments,
      fundingState: pressured.agency?.fundingState,
    })
    const withAttrition = advanceRecoveryDowntimeForWeek({
      week: pressured.week + 1,
      sourceAgents: pressured.agents,
      sourceTeams: pressured.teams,
      downtimeAssignments,
      fundingState: pressured.agency?.fundingState,
      replacementPressureState: buildReplacementPressureState(pressured),
    })

    expect(withAttrition.attritionThroughputPenaltyApplied).toBeGreaterThan(0)
    expect(withAttrition.updatedAgents[recoveringAgentId]!.fatigue).toBeGreaterThan(
      baseline.updatedAgents[recoveringAgentId]!.fatigue
    )
    expect((withAttrition.updatedTeams.t_nightwatch?.recoveryPressure ?? 0)).toBeGreaterThan(
      baseline.updatedTeams.t_nightwatch?.recoveryPressure ?? 0
    )
  })

  it('removes attrition-blocked operatives from team coverage viability', () => {
    const state = createStartingState()
    const memberIds = state.teams.t_nightwatch.memberIds ?? state.teams.t_nightwatch.agentIds
    const targetMemberId =
      memberIds.find((memberId) => getAgentCoverageRoles(state.agents[memberId]!).length > 0) ??
      memberIds[0]!
    const requiredRole = getAgentCoverageRoles(state.agents[targetMemberId]!)[0]!
    const soloTeam = {
      ...state.teams.t_nightwatch,
      memberIds: [targetMemberId],
      agentIds: [targetMemberId],
      leaderId: targetMemberId,
    }
    const pressured = markAgentsLost(state, [targetMemberId])

    const validation = validateTeamComposition(soloTeam, pressured.agents, pressured.teams, {
      requiredRoles: [requiredRole],
    })

    expect(validation.inactiveMemberIds).toContain(targetMemberId)
    expect(validation.missingRoles).toContain(requiredRole)
    expect(validation.valid).toBe(false)
  })

  it('surfaces replacement need explicitly in recruitment summaries and metrics', () => {
    const state = markAgentsLost(createStartingState(), ['a_kellan', 'a_sato'])

    const summary = buildRecruitmentFunnelSummary(state)
    const metrics = getRecruitmentMetrics(state)

    expect(summary.replacementNeed).toMatchObject({
      staffingGap: 2,
      priorityBand: 'critical',
    })
    expect(metrics).toMatchObject({
      staffingGap: 2,
      recruitmentPriorityBand: 'critical',
    })
    expect(metrics.replacementPressure).toBeGreaterThan(0)
  })

  it('recomputes attrition-derived gating after save/load', () => {
    const state = markAgentsLost(createStartingState(), ['a_kellan', 'a_sato'])
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
    }
    state.replacementPressureState = {
      replacementPressure: 0,
      staffingGap: 0,
      activeLossCount: 0,
      criticalRoleLossCount: 0,
      replacementBacklog: [],
    }
    state.teams.t_nightwatch = {
      ...state.teams.t_nightwatch,
      deploymentReadinessState: {
        ...(state.teams.t_nightwatch.deploymentReadinessState ??
          buildTeamDeploymentReadinessState(state, 't_nightwatch', 'case-001')),
        softRisks: [],
        readinessScore: 100,
      },
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.replacementPressureState?.staffingGap).toBe(2)
    expect(loaded.teams.t_nightwatch.deploymentReadinessState?.softRisks).toContain(
      'attrition-pressure'
    )
    expect(buildTeamDeploymentReadinessState(loaded, 't_nightwatch', 'case-001').softRisks).toContain(
      'attrition-pressure'
    )
  })

  it('flags stale replacement pressure summaries during stability analysis', () => {
    const broken = {
      ...createStartingState(),
      replacementPressureState: {
        replacementPressure: 0,
        staffingGap: 0,
        activeLossCount: 0,
        criticalRoleLossCount: 3,
        replacementBacklog: [],
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(
      report.issues.some((issue) => issue.id === 'restored-state.replacement-pressure-mismatch')
    ).toBe(true)
    expect(
      report.issues.some(
        (issue) =>
          issue.id === 'restored-state.replacement-pressure-invalid-critical-loss-count'
      )
    ).toBe(true)
  })
})
