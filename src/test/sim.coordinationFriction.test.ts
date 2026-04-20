import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { syncTeamSimulationState } from '../domain/teamSimulation'

function makeOperationalState(activeCaseCount: number): GameState {
  const base = createStartingState()
  const agentIds = Object.keys(base.agents).slice(0, activeCaseCount)
  const seedCase = base.cases['case-001']

  base.reports = [
    {
      ...base.reports[0],
      notes: [],
    },
  ]
  base.agency = {
    ...base.agency,
    supportAvailable: activeCaseCount,
  }
  base.teams = Object.fromEntries(
    agentIds.map((agentId, index) => {
      const teamId = `team-${index + 1}`
      return [
        teamId,
        {
          id: teamId,
          name: `Team ${index + 1}`,
          agentIds: [agentId],
          memberIds: [agentId],
          leaderId: agentId,
          tags: [],
        },
      ]
    })
  )
  base.cases = Object.fromEntries(
    agentIds.map((agentId, index) => {
      const teamId = `team-${index + 1}`
      const caseId = `case-${index + 1}`
      return [
        caseId,
        {
          ...seedCase,
          id: caseId,
          title: `Coordination Case ${index + 1}`,
          status: 'in_progress',
          difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
          weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
          durationWeeks: 1,
          weeksRemaining: 1,
          deadlineWeeks: 2,
          deadlineRemaining: 2,
          assignedTeamIds: [teamId],
        },
      ]
    })
  )

  return syncTeamSimulationState(base)
}

describe('SPE-95: Command-coordination friction', () => {
  it('does not trigger friction below threshold', () => {
    const state = makeOperationalState(2)
    const next = advanceWeek(state)
    const report = next.reports[next.reports.length - 1]

    expect(next.agency?.coordinationFrictionActive).toBeFalsy()
    expect(next.coordinationFrictionActive).toBeFalsy()
    expect(report.partialCases).toEqual([])
    expect(report.notes.some((note) => note.type === 'agency.coordination_friction')).toBeFalsy()
  })

  it('triggers friction above threshold and downgrades one outcome', () => {
    const state = makeOperationalState(5)
    const next = advanceWeek(state)
    const report = next.reports[next.reports.length - 1]
    const partialOutcomes = Object.values(report.caseSnapshots ?? {}).filter(
      (snapshot) => snapshot.missionResult?.outcome === 'partial'
    )

    expect(next.agency?.coordinationFrictionActive).toBeTruthy()
    expect(next.coordinationFrictionActive).toBeTruthy()
    expect(report.partialCases).toHaveLength(1)
    expect(report.resolvedCases).toHaveLength(4)
    expect(report.failedCases).toEqual([])
    expect(partialOutcomes).toHaveLength(1)
    expect(
      report.notes.some((note) => note.type === 'agency.coordination_friction')
    ).toBeTruthy()
  })
})
