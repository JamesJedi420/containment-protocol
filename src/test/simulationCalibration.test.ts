import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { computeReplacementPressure } from '../domain/agent/attrition'
import { buildTeamDeploymentReadinessState } from '../domain/deploymentReadiness'
import { buildAgentLoadoutReadinessSummary } from '../domain/equipment'
import { createInitialFundingState, placeProcurementOrder, recomputeBudgetPressure } from '../domain/funding'
import { triageMission } from '../domain/missionIntakeRouting'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  ATTRITION_CALIBRATION,
  FUNDING_CALIBRATION,
  INTEL_CALIBRATION,
  PRESSURE_CALIBRATION,
  WEAKEST_LINK_CALIBRATION,
} from '../domain/sim/calibration'
import { executePressurePipeline } from '../domain/sim/pressurePipeline'
import { analyzeRuntimeStability } from '../domain/stabilityLayer'
import { buildTeamCohesionSummary } from '../domain/teamComposition'
import { resolveWeakestLinkMission } from '../domain/weakestLinkResolution'

function runPressureWeeks(pressureValue: number, weeks: number) {
  let state = createStartingState()
  state.cases = {
    'case-001': {
      ...state.cases['case-001'],
      status: 'open',
      assignedTeamIds: [],
      deadlineRemaining: 1,
      pressureValue,
      onUnresolved: {
        ...state.cases['case-001'].onUnresolved,
        spawnCount: { min: 0, max: 0 },
        spawnTemplateIds: [],
      },
    },
  }

  const spawnedCaseIds: string[] = []
  for (let index = 0; index < weeks; index += 1) {
    const result = executePressurePipeline(
      {
        sourceState: state,
        nextState: state,
        initialCaseIds: ['case-001'],
        unresolvedTriggers: ['case-001'],
      },
      () => 0.1
    )
    state = result.nextState
    spawnedCaseIds.push(...result.spawnedCases.map((entry) => entry.caseId))
  }

  return {
    state,
    spawnedCaseIds,
  }
}

describe('simulation calibration', () => {
  it('keeps calibration constants bounded and inspectable', () => {
    expect(WEAKEST_LINK_CALIBRATION.globalPenaltyCap).toBeGreaterThan(0)
    expect(WEAKEST_LINK_CALIBRATION.globalPenaltyCap).toBeLessThanOrEqual(50)
    expect(INTEL_CALIBRATION.routingRiskPenaltyCap).toBeLessThanOrEqual(10)
    expect(INTEL_CALIBRATION.deploymentPenaltyCap).toBeLessThanOrEqual(10)
    expect(INTEL_CALIBRATION.confidenceDecayPerWeek).toBeGreaterThan(0)
    expect(INTEL_CALIBRATION.confidenceDecayPerWeek).toBeLessThanOrEqual(0.05)
    expect(INTEL_CALIBRATION.researchMitigationFloor).toBeGreaterThanOrEqual(0.5)
    expect(INTEL_CALIBRATION.researchMitigationFloor).toBeLessThanOrEqual(1)
    expect(PRESSURE_CALIBRATION.defaultMajorIncidentThreshold).toBeGreaterThanOrEqual(100)
    expect(PRESSURE_CALIBRATION.defaultPressureDecayPerWeek).toBeGreaterThan(0)
    expect(FUNDING_CALIBRATION.budgetPressure.maxPressure).toBeLessThanOrEqual(4)
    expect(ATTRITION_CALIBRATION.atRiskLossAfterWeeks).toBeGreaterThanOrEqual(4)
  })

  it('does not push a strong team into default failure from intel uncertainty alone', () => {
    const result = resolveWeakestLinkMission({
      missionId: 'calibration-intel',
      week: 4,
      baseScore: 90,
      requiredScore: 80,
      intelConfidence: 0.2,
      intelUncertainty: 0.8,
      teamReadiness: {
        teamId: 't1',
        readinessCategory: 'mission_ready',
        readinessScore: 95,
        hardBlockers: [],
        softRisks: [],
        intelPenalty: INTEL_CALIBRATION.deploymentPenaltyCap,
        coverageCompleteness: { required: ['containment'], covered: ['containment'], missing: [] },
        cohesionBand: 'strong',
        minimumMemberReadiness: 95,
        averageFatigue: 12,
        estimatedDeployWeeks: 0,
        estimatedRecoveryWeeks: 0,
        computedWeek: 4,
      } as unknown as Parameters<typeof resolveWeakestLinkMission>[0]['teamReadiness'],
      teamCohesion: {
        cohesionBand: 'strong',
        cohesionScore: 90,
        chemistryScore: 90,
        coordinationScore: 90,
        trustScore: 90,
        fatiguePenalty: 0,
        cohesionFlags: [],
      },
      loadoutSummaries: [
        {
          agentId: 'a1',
          role: 'hunter',
          equippedItemCount: 3,
          compatibleItemCount: 3,
          incompatibleItemCount: 0,
          emptySlotCount: 0,
          readiness: 'ready',
          issues: [],
        },
      ],
      trainingLocks: [],
      fatigueSignals: [10, 14, 16],
      missingRoles: [],
    })

    expect(result.resultKind).not.toBe('fail')
    expect(result.weakestLinkContributors).toContain('intel-friction')
    expect(result.weakestLinkTotalPenalty).toBeLessThanOrEqual(
      WEAKEST_LINK_CALIBRATION.globalPenaltyCap
    )
  })

  it('does not create runaway major-incident pressure too early for moderate neglect', () => {
    const result = runPressureWeeks(8, 4)

    expect(result.spawnedCaseIds).toEqual([])
    expect(result.state.globalPressure).toBeLessThan(
      PRESSURE_CALIBRATION.defaultMajorIncidentThreshold
    )
  })

  it('still punishes sustained severe neglect with major-incident pressure', () => {
    const result = runPressureWeeks(20, 8)

    expect(result.spawnedCaseIds.length).toBeGreaterThan(0)
    expect(result.state.globalPressure).toBeGreaterThan(0)
  })

  it('keeps stacked intel, funding, escalation, and attrition pressures bounded and inspectable', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredRoles: [],
      requiredTags: [],
      deadlineRemaining: 1,
      intelConfidence: 0.2,
      intelUncertainty: 0.8,
      intelLastUpdatedWeek: state.week - 2,
    } as unknown as typeof state.cases[typeof missionId]

    const triage = triageMission(state, state.cases[missionId])
    const readiness = buildTeamDeploymentReadinessState(state, 't_nightwatch', missionId)
    const team = state.teams.t_nightwatch
    const memberIds = team.memberIds ?? team.agentIds
    const weakestLink = resolveWeakestLinkMission({
      missionId,
      week: state.week,
      baseScore: 85,
      requiredScore: 80,
      intelConfidence: state.cases[missionId].intelConfidence,
      intelUncertainty: state.cases[missionId].intelUncertainty,
      teamReadiness: readiness,
      teamCohesion: buildTeamCohesionSummary(team, state.agents),
      loadoutSummaries: memberIds.map((agentId) => buildAgentLoadoutReadinessSummary(state.agents[agentId]!)),
      trainingLocks: [],
      fatigueSignals: memberIds.map((agentId) => state.agents[agentId]!.fatigue),
      missingRoles: [],
    })

    let fundingState = createInitialFundingState(8, 8, 6, 10, 20)
    for (let index = 0; index < 8; index += 1) {
      fundingState = placeProcurementOrder(fundingState, {
        requestId: `req-${index}`,
        itemId: 'kit',
        quantity: 1,
        requestedWeek: index + 1,
        cost: 0,
      })
    }
    fundingState = recomputeBudgetPressure(fundingState)

    const replacementPressure = computeReplacementPressure(
      [
        {
          ...state.agents.a_ava,
          attritionState: {
            attritionStatus: 'lost',
            lossReasonCodes: ['burnout'],
            replacementPriority: 1,
            retentionPressure: 0,
          },
        },
        {
          ...state.agents.a_sato,
          attritionState: {
            attritionStatus: 'lost',
            lossReasonCodes: ['injury_exit'],
            replacementPriority: 1,
            retentionPressure: 0,
          },
        },
      ],
      ['field_recon', 'investigator']
    )

    const pressureState = runPressureWeeks(20, 8).state

    expect(triage.dimensions.intelRisk).toBeLessThanOrEqual(INTEL_CALIBRATION.routingRiskPenaltyCap)
    expect(readiness.intelPenalty).toBeLessThanOrEqual(INTEL_CALIBRATION.deploymentPenaltyCap)
    expect(weakestLink.weakestLinkTotalPenalty).toBeLessThanOrEqual(
      WEAKEST_LINK_CALIBRATION.globalPenaltyCap
    )
    expect(weakestLink.weakestLinkContributors).toContain('intel-friction')
    expect(fundingState.budgetPressure).toBeLessThanOrEqual(
      FUNDING_CALIBRATION.budgetPressure.maxPressure
    )
    expect(replacementPressure.replacementPressure).toBeLessThanOrEqual(
      ATTRITION_CALIBRATION.maxReplacementPressure
    )
    expect(pressureState.globalPressure).toBeGreaterThan(0)
  })

  it('preserves save/load and stability assumptions under calibrated pressure values', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      intelConfidence: 0.25,
      intelUncertainty: 0.75,
      intelLastUpdatedWeek: state.week - 1,
    }
    state.globalPressure = 24
    state.globalEscalationLevel = 3
    state.globalThreatDrift = 2
    state.globalTimePressure = 2

    const loaded = loadGameSave(serializeGameSave(state))
    const report = analyzeRuntimeStability(loaded)
    const relevantErrors = report.issues.filter(
      (issue) =>
        issue.severity === 'error' &&
        (issue.category === 'restored-state' ||
          issue.category === 'mission-routing' ||
          issue.category === 'deployment-readiness')
    )

    expect(loaded.cases['case-001'].intelConfidence).toBe(0.25)
    expect(relevantErrors).toEqual([])
  })
})
