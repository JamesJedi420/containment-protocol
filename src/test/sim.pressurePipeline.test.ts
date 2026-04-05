import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { executePressurePipeline } from '../domain/sim/pressurePipeline'

describe('executePressurePipeline', () => {
  it('accumulates unresolved and ambient pressure without spawning below threshold', () => {
    const state = createStartingState()
    state.globalPressure = 2
    state.responseGrid = {
      majorIncidentThreshold: 20,
      majorIncidentTemplateIds: ['raid-001'],
    }
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        pressureValue: 4,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const result = executePressurePipeline(
      {
        sourceState: state,
        nextState: state,
        initialCaseIds: ['case-001'],
        unresolvedTriggers: ['case-001'],
      },
      () => 0.25
    )

    expect(result.nextState.globalPressure).toBe(6)
    expect(result.spawnedCases).toEqual([])
  })

  it('spawns a deterministic major incident when pressure breaches threshold', () => {
    const state = createStartingState()
    state.globalPressure = 0
    state.responseGrid = {
      majorIncidentThreshold: 5,
      majorIncidentTemplateIds: ['raid-001'],
    }
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        pressureValue: 6,
        regionTag: 'occult_district',
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const result = executePressurePipeline(
      {
        sourceState: state,
        nextState: state,
        initialCaseIds: ['case-001'],
        unresolvedTriggers: ['case-001'],
      },
      () => 0.1
    )

    expect(result.nextState.globalPressure).toBe(1)
    expect(result.spawnedCases).toHaveLength(1)

    const spawnedCaseId = result.spawnedCases[0]?.caseId
    expect(spawnedCaseId).toBeDefined()
    expect(result.spawnedCases[0]).toMatchObject({
      trigger: 'pressure_threshold',
    })
    expect(spawnedCaseId ? result.nextState.cases[spawnedCaseId] : undefined).toMatchObject({
      kind: 'raid',
      regionTag: 'occult_district',
    })
  })
})
