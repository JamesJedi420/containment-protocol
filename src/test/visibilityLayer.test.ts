import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  explainDeploymentReadiness,
  explainMissionRouting,
  explainWeakestLinkResolution,
  explainWeeklyPressureState,
} from '../domain/visibility'
import { resolveWeakestLinkMission } from '../domain/weakestLinkResolution'

describe('visibility layer / decision legibility', () => {
  it('keeps routing explanations deterministic', () => {
    const state = createStartingState()

    const first = explainMissionRouting(state, 'case-001')
    const second = explainMissionRouting(state, 'case-001')

    expect(second).toEqual(first)
    expect(first.category).toBe('routing')
    expect(first.dominantFactor).toBeTypeOf('string')
    expect(first.details.length).toBeLessThanOrEqual(3)
  })

  it('keeps deployment readiness explanations deterministic', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
      intelConfidence: 0.2,
      intelUncertainty: 0.8,
      intelLastUpdatedWeek: state.week,
    }

    const first = explainDeploymentReadiness(state, 't_nightwatch', 'case-001')
    const second = explainDeploymentReadiness(state, 't_nightwatch', 'case-001')

    expect(second).toEqual(first)
    expect(first.category).toBe('deployment-readiness')
    expect(first.dominantFactor).toBeTypeOf('string')
    expect(first.details.length).toBeLessThanOrEqual(3)
  })

  it('identifies a dominant weakest-link factor', () => {
    const result = resolveWeakestLinkMission({
      missionId: 'fatigue-case',
      week: 3,
      baseScore: 60,
      requiredScore: 80,
      teamReadiness: {
        teamId: 'team-fatigue',
        readinessCategory: 'mission_ready',
        readinessScore: 72,
        hardBlockers: [],
        softRisks: [],
        coverageCompleteness: { required: ['containment'], covered: ['containment'], missing: [] },
        cohesionBand: 'strong',
        minimumMemberReadiness: 72,
        averageFatigue: 92,
        estimatedDeployWeeks: 1,
        estimatedRecoveryWeeks: 2,
        computedWeek: 3,
      },
      teamCohesion: {
        cohesionBand: 'strong',
        cohesionScore: 86,
        chemistryScore: 84,
        coordinationScore: 88,
        trustScore: 85,
        fatiguePenalty: 0,
        cohesionFlags: [],
      },
      loadoutSummaries: [
        {
          agentId: 'a-fatigue',
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
      fatigueSignals: [90, 95, 100],
      missingRoles: [],
    })

    const explanation = explainWeakestLinkResolution(result)

    expect(explanation.category).toBe('weakest-link')
    expect(explanation.dominantFactor).toBe('fatigue-concentration')
    expect(explanation.details.length).toBeLessThanOrEqual(3)
  })

  it('identifies a dominant weekly pressure source', () => {
    const state = createStartingState()

    for (const caseId of Object.keys(state.cases)) {
      state.cases[caseId] = {
        ...state.cases[caseId],
        intelConfidence: 0.2,
        intelUncertainty: 0.8,
        intelLastUpdatedWeek: state.week - 1,
      }
    }

    const explanation = explainWeeklyPressureState(state)

    expect(explanation.category).toBe('weekly-pressure')
    expect(explanation.dominantPressureSource).toBe('intel')
    expect(explanation.dominantFactor).toBe('intel')
    expect(explanation.details.length).toBeLessThanOrEqual(3)
  })

  it('keeps outputs bounded and leaves canonical state untouched', () => {
    const state = createStartingState()
    const before = structuredClone(state)

    const routing = explainMissionRouting(state, 'case-001')
    const deployment = explainDeploymentReadiness(state, 't_nightwatch', 'case-001')
    const pressure = explainWeeklyPressureState(state)

    expect(state).toEqual(before)
    expect(routing.details.length).toBeLessThanOrEqual(3)
    expect(deployment.details.length).toBeLessThanOrEqual(3)
    expect(pressure.details.length).toBeLessThanOrEqual(3)
    expect(pressure.unresolvedTrend.length).toBeLessThanOrEqual(5)
    expect(pressure.budgetPressureTrend.length).toBeLessThanOrEqual(5)
    expect(pressure.attritionPressureTrend.length).toBeLessThanOrEqual(5)
    expect(pressure.intelConfidenceTrend.length).toBeLessThanOrEqual(5)

    const raw = serializeGameSave(state)
    expect(raw).not.toContain('dominantFactor')
    expect(raw).not.toContain('weekly-pressure')
  })

  it('preserves save/load behavior while keeping explanations derived', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      requiredRoles: [],
      requiredTags: [],
      intelConfidence: 0.24,
      intelUncertainty: 0.76,
      intelLastUpdatedWeek: state.week - 1,
    }

    const before = {
      routing: explainMissionRouting(state, 'case-001'),
      deployment: explainDeploymentReadiness(state, 't_nightwatch', 'case-001'),
      pressure: explainWeeklyPressureState(state),
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(explainMissionRouting(loaded, 'case-001')).toEqual(before.routing)
    expect(explainDeploymentReadiness(loaded, 't_nightwatch', 'case-001')).toEqual(before.deployment)
    expect(explainWeeklyPressureState(loaded)).toEqual(before.pressure)
    expect('dominantFactor' in loaded).toBe(false)
  })
})
