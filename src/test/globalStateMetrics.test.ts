import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import { getGlobalStateMetrics } from '../features/dashboard/dashboardView'

describe('getGlobalStateMetrics', () => {
  it('derives Year/Week from global week and weeksPerYear', () => {
    const game = createStartingState()
    game.week = 53

    const metrics = getGlobalStateMetrics(game)

    expect(metrics.year).toBe(2)
    expect(metrics.weekOfYear).toBe(1)
  })

  it('counts active cases and forwards agency progression fields', () => {
    const game = createStartingState()
    game.agency = {
      containmentRating: 66,
      clearanceLevel: 3,
      funding: 147,
    }

    game.cases['case-001'] = {
      ...game.cases['case-001'],
      status: 'resolved',
    }

    const metrics = getGlobalStateMetrics(game)

    expect(metrics.activeCases).toBe(
      Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved').length
    )
    expect(metrics.containmentRating).toBe(66)
    expect(metrics.clearanceLevel).toBe(3)
    expect(metrics.funding).toBe(147)
    expect(metrics.agencyName).toBe('Containment Protocol')
  })

  it('falls back to legacy top-level progression fields when agency is absent', () => {
    const game = createStartingState()
    game.agency = undefined
    game.containmentRating = 61
    game.clearanceLevel = 2
    game.funding = 134

    const metrics = getGlobalStateMetrics(game)

    expect(metrics.containmentRating).toBe(61)
    expect(metrics.clearanceLevel).toBe(2)
    expect(metrics.funding).toBe(134)
  })

  it('includes derived agency reputation, pressure, and stability for dashboard consumers', () => {
    const game = createStartingState()
    game.market = {
      ...game.market,
      pressure: 'tight',
    }
    game.cases['case-003'] = {
      ...game.cases['case-003'],
      kind: 'raid',
      stage: 4,
      deadlineRemaining: 1,
      raid: { minTeams: 2, maxTeams: 3 },
    }
    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: ['case-003'],
        partialCases: [],
        unresolvedTriggers: ['case-001'],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 12,
        teamStatus: [],
        notes: [],
      },
    ]

    const metrics = getGlobalStateMetrics(game)

    expect(metrics.reputation).toBeGreaterThanOrEqual(0)
    expect(metrics.pressureScore).toBeGreaterThan(0)
    expect(['low', 'elevated', 'critical']).toContain(metrics.pressureLevel)
    expect(metrics.stabilityScore).toBeGreaterThanOrEqual(0)
    expect(['stable', 'strained', 'fragile']).toContain(metrics.stabilityLevel)
  })

  it('reports used/total agent capacity from assigned teams with unique-agent counting', () => {
    const assigned = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

    assigned.teams['team-shadow'] = {
      id: 'team-shadow',
      name: 'Shadow',
      agentIds: [assigned.teams['t_nightwatch'].agentIds[0]!],
      tags: ['support'],
      assignedCaseId: 'case-002',
    }

    const metrics = getGlobalStateMetrics(assigned)

    expect(metrics.agentCapacity.total).toBe(Object.keys(assigned.agents).length)
    expect(metrics.agentCapacity.used).toBe(new Set(assigned.teams['t_nightwatch'].agentIds).size)
  })

  it('exposes globalPressure, majorIncidentThreshold, and pressureBarPercent metrics', () => {
    const game = createStartingState()
    game.globalPressure = 50
    game.responseGrid = {
      majorIncidentThreshold: 100,
      majorIncidentTemplateIds: ['raid-001'],
      pressureDecayPerWeek: 0,
    }

    const metrics = getGlobalStateMetrics(game)

    expect(metrics.globalPressure).toBe(50)
    expect(metrics.majorIncidentThreshold).toBe(100)
    expect(metrics.pressureBarPercent).toBe(50)
  })

  it('calculates pressureBarPercent capped at 100 when pressure exceeds threshold', () => {
    const game = createStartingState()
    game.globalPressure = 250
    game.responseGrid = {
      majorIncidentThreshold: 100,
      majorIncidentTemplateIds: ['raid-001'],
      pressureDecayPerWeek: 0,
    }

    const metrics = getGlobalStateMetrics(game)

    expect(metrics.globalPressure).toBe(250)
    expect(metrics.pressureBarPercent).toBe(100)
  })
})
