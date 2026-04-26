import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildMissionTimeCostSummary,
  buildTeamDeploymentReadinessState,
  evaluateDeploymentEligibility,
} from '../domain/deploymentReadiness'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  CONSTRUCTION_INCOMPLETE_FLAG,
  CONSTRUCTION_PROGRESS_MAX,
  CONSTRUCTION_READINESS_PENALTY,
  getConstructionProgressClockId,
} from '../domain/constructionProgress'
import { advanceDefinedProgressClock } from '../domain/progressClocks'

describe('deployment readiness and time-cost', () => {
  it('marks mission-ready team as eligible with no hard blockers', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredRoles: ['containment', 'investigator', 'tactical'],
      requiredTags: [],
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, 't_nightwatch')

    expect(eligibility.eligible).toBe(true)
    expect(eligibility.hardBlockers).toEqual([])
  })

  it('keeps conditional teams deployable with explicit soft risks', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
    }
    for (const memberId of state.teams.t_nightwatch.memberIds ?? state.teams.t_nightwatch.agentIds) {
      state.agents[memberId] = {
        ...state.agents[memberId],
        fatigue: 62,
      }
    }

    const readiness = buildTeamDeploymentReadinessState(state, 't_nightwatch', 'case-001')

    expect(readiness.readinessCategory).toBe('conditional')
    expect(readiness.softRisks).toContain('high-fatigue-burden')
    expect(readiness.hardBlockers).toEqual([])
  })

  it('applies an explicit deterministic readiness penalty when mission intel is weak', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredRoles: [],
      requiredTags: [],
      intelConfidence: 0.2,
      intelUncertainty: 0.8,
      intelLastUpdatedWeek: state.week,
    }

    const eligibility = evaluateDeploymentEligibility(state, missionId, 't_nightwatch')
    const readiness = buildTeamDeploymentReadinessState(state, 't_nightwatch', missionId)

    expect(eligibility.eligible).toBe(true)
    expect(eligibility.softRisks).toContain('intel-uncertainty')
    expect(eligibility.intelPenalty).toBeGreaterThan(0)
    expect(readiness.softRisks).toContain('intel-uncertainty')
    expect(readiness.intelPenalty).toBe(eligibility.intelPenalty)
    expect(readiness.readinessCategory).toBe('conditional')
  })

  it('hard-blocks when training lock coexists with deployment invalidation', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: ['containment', 'investigator', 'tactical'],
      requiredTags: [],
    }
    const memberIds = state.teams.t_nightwatch.memberIds ?? state.teams.t_nightwatch.agentIds
    const trainingMemberId =
      memberIds.find((memberId) => memberId !== state.teams.t_nightwatch.leaderId) ?? memberIds[0]!
    state.agents[trainingMemberId] = {
      ...state.agents[trainingMemberId],
      assignment: { state: 'training', startedWeek: state.week, teamId: 't_nightwatch' },
    }

    const readiness = buildTeamDeploymentReadinessState(state, 't_nightwatch', 'case-001')

    expect(readiness.readinessCategory).toBe('hard_blocked')
    expect(readiness.hardBlockers).toContain('training-blocked')
  })

  it('marks temporarily_blocked for capacity lock without hard gate failures', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: ['containment', 'investigator', 'tactical'],
      requiredTags: [],
    }
    state.teams.t_nightwatch = {
      ...state.teams.t_nightwatch,
      assignedCaseId: 'case-999',
      status: {
        ...(state.teams.t_nightwatch.status ?? { state: 'deployed', assignedCaseId: null }),
        state: 'deployed',
        assignedCaseId: 'case-999',
      },
    }

    const readiness = buildTeamDeploymentReadinessState(state, 't_nightwatch', 'case-001')

    expect(readiness.readinessCategory).toBe('temporarily_blocked')
    expect(readiness.hardBlockers).toContain('capacity-locked')
  })

  it('hard-blocks on missing certification and recovers category for recovering teams', () => {
    const state = createStartingState()
    const missionId = 'case-001'
    state.cases[missionId] = {
      ...state.cases[missionId],
      requiredTags: ['cert:advanced-containment'],
    }

    const hardBlocked = buildTeamDeploymentReadinessState(state, 't_nightwatch', missionId)
    expect(hardBlocked.readinessCategory).toBe('hard_blocked')
    expect(hardBlocked.hardBlockers).toContain('missing-certification')

    state.teams.t_nightwatch = {
      ...state.teams.t_nightwatch,
      status: {
        ...(state.teams.t_nightwatch.status ?? { assignedCaseId: null }),
        state: 'recovering',
      },
    }

    const recovering = buildTeamDeploymentReadinessState(state, 't_nightwatch', missionId)
    expect(recovering.readinessCategory).toBe('recovery_required')
    expect(recovering.hardBlockers).toContain('recovery-required')
  })

  it('computes additive bounded time-cost totals deterministically', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      regionTag: 'remote',
      durationWeeks: 4,
      kind: 'raid',
    }

    const first = buildMissionTimeCostSummary(
      state,
      'case-001',
      't_nightwatch',
      ['training-blocked', 'missing-certification'],
      ['low-cohesion-band']
    )
    const second = buildMissionTimeCostSummary(
      state,
      'case-001',
      't_nightwatch',
      ['training-blocked', 'missing-certification'],
      ['low-cohesion-band']
    )

    expect(second).toEqual(first)
    expect(first.expectedTotalWeeks).toBe(
      Math.max(
        1,
        first.expectedTravelWeeks +
          first.expectedSetupWeeks +
          first.expectedResolutionWeeks +
          first.expectedRecoveryWeeks
      )
    )
    expect(first.expectedTotalWeeks).toBeGreaterThan(0)
  })

  it('recomputes readiness from source changes and remains stable through save/load', () => {
    const state = createStartingState()
    const baseline = buildTeamDeploymentReadinessState(state, 't_nightwatch', 'case-001')

    const memberId = state.teams.t_nightwatch.memberIds?.[0] ?? state.teams.t_nightwatch.agentIds[0]!
    state.agents[memberId] = {
      ...state.agents[memberId],
      assignment: { state: 'training', startedWeek: state.week, teamId: 't_nightwatch' },
    }

    const changed = buildTeamDeploymentReadinessState(state, 't_nightwatch', 'case-001')
    expect(changed.readinessScore).toBeLessThanOrEqual(baseline.readinessScore)
    expect(changed.hardBlockers).toContain('training-blocked')

    state.teams.t_nightwatch = {
      ...state.teams.t_nightwatch,
      deploymentReadinessState: {
        ...changed,
        readinessScore: 999,
      },
    }

    const roundTripped = loadGameSave(serializeGameSave(state))
    expect(roundTripped.teams.t_nightwatch.deploymentReadinessState?.readinessScore).toBeLessThanOrEqual(100)
  })

  // SPE-110: Construction burden tests
  it('reduces readiness score by CONSTRUCTION_READINESS_PENALTY when construction.incomplete flag is set', () => {
    const baseline = createStartingState()
    baseline.cases['case-001'] = {
      ...baseline.cases['case-001']!,
      requiredRoles: [],
      requiredTags: [],
    }
    // Add fatigue so the formula value sits below 100, making the 8-pt burden penalty observable.
    for (const memberId of baseline.teams.t_nightwatch.memberIds ?? baseline.teams.t_nightwatch.agentIds) {
      baseline.agents[memberId] = { ...baseline.agents[memberId]!, fatigue: 50 }
    }
    const baseScore = buildTeamDeploymentReadinessState(baseline, 't_nightwatch', 'case-001').readinessScore

    let withBurden = createStartingState()
    const clockId = getConstructionProgressClockId('case-001')
    withBurden.cases['case-001'] = {
      ...withBurden.cases['case-001']!,
      requiredRoles: [],
      requiredTags: [],
      spatialFlags: [
        ...(withBurden.cases['case-001']?.spatialFlags ?? []),
        CONSTRUCTION_INCOMPLETE_FLAG,
      ],
    }
    for (const memberId of withBurden.teams.t_nightwatch.memberIds ?? withBurden.teams.t_nightwatch.agentIds) {
      withBurden.agents[memberId] = { ...withBurden.agents[memberId]!, fatigue: 50 }
    }
    withBurden = advanceDefinedProgressClock(withBurden, clockId, 1, {
      label: 'Construction: Test',
      max: CONSTRUCTION_PROGRESS_MAX,
    })

    const burdenScore = buildTeamDeploymentReadinessState(withBurden, 't_nightwatch', 'case-001').readinessScore
    expect(baseScore - burdenScore).toBe(CONSTRUCTION_READINESS_PENALTY)
  })

  it('does not apply construction burden when construction is complete', () => {
    const baseline = createStartingState()
    baseline.cases['case-001'] = { ...baseline.cases['case-001']!, requiredRoles: [], requiredTags: [] }
    const baseScore = buildTeamDeploymentReadinessState(baseline, 't_nightwatch', 'case-001').readinessScore

    let withComplete = createStartingState()
    const clockId = getConstructionProgressClockId('case-001')
    withComplete.cases['case-001'] = {
      ...withComplete.cases['case-001']!,
      requiredRoles: [],
      requiredTags: [],
      spatialFlags: [
        ...(withComplete.cases['case-001']?.spatialFlags ?? []),
        CONSTRUCTION_INCOMPLETE_FLAG,
      ],
    }
    // Complete the construction clock
    withComplete = advanceDefinedProgressClock(withComplete, clockId, CONSTRUCTION_PROGRESS_MAX, {
      label: 'Construction: Test',
      max: CONSTRUCTION_PROGRESS_MAX,
    })

    const completedScore = buildTeamDeploymentReadinessState(withComplete, 't_nightwatch', 'case-001').readinessScore
    expect(completedScore).toBe(baseScore)
  })

  it('construction burden penalty is independent of inventory stock changes', () => {
    const applyBurden = (s: ReturnType<typeof createStartingState>) => {
      const clockId = getConstructionProgressClockId('case-001')
      s.cases['case-001'] = {
        ...s.cases['case-001']!,
        requiredRoles: [],
        requiredTags: [],
        spatialFlags: [
          ...(s.cases['case-001']?.spatialFlags ?? []),
          CONSTRUCTION_INCOMPLETE_FLAG,
        ],
      }
      return advanceDefinedProgressClock(s, clockId, 1, {
        label: 'Construction: Test',
        max: CONSTRUCTION_PROGRESS_MAX,
      })
    }

    const lowStock = applyBurden(createStartingState())
    const highStock = applyBurden(createStartingState())
    for (const key of Object.keys(lowStock.inventory)) lowStock.inventory[key] = 0
    highStock.inventory['medical_supplies'] = 20

    const scoreA = buildTeamDeploymentReadinessState(lowStock, 't_nightwatch', 'case-001').readinessScore
    const scoreB = buildTeamDeploymentReadinessState(highStock, 't_nightwatch', 'case-001').readinessScore
    expect(scoreA).toBe(scoreB)
  })
})
