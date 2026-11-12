import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { getTeamMemberIds } from '../../domain/teamSimulation'
import { assignTeam } from '../../domain/sim/assign'
import { getDeployableReserveStaff, isDeployableReserveAgent } from './divisionMetrics'

describe('divisionMetrics deployable reserve', () => {
  it('excludes agents assigned to active field teams', () => {
    let game = createStartingState()
    game = assignTeam(game, 'case-001', 't_nightwatch')

    const reserve = getDeployableReserveStaff(game)
    const nightwatchMembers = getTeamMemberIds(game.teams.t_nightwatch)

    expect(reserve.map((agent) => agent.id)).not.toEqual(expect.arrayContaining(nightwatchMembers))
  })

  it('excludes dead, resigned, training, and recovering agents from reserve count', () => {
    const game = createStartingState()
    const assignedAgentIds = new Set<string>()
    const agents = { ...game.agents }

    const [firstId, secondId, thirdId, fourthId] = Object.keys(agents)
    agents[firstId] = { ...agents[firstId], status: 'dead' }
    agents[secondId] = { ...agents[secondId], status: 'resigned' }
    agents[thirdId] = {
      ...agents[thirdId],
      status: 'recovering',
      assignment: { state: 'recovery', startedWeek: 1 },
    }
    agents[fourthId] = {
      ...agents[fourthId],
      status: 'active',
      readinessProfile: {
        state: 'training',
        band: 'strained',
        deploymentEligible: false,
        recoveryRequired: false,
        riskFlags: [],
      },
    }

    const filtered = Object.values({
      ...agents,
      [firstId]: agents[firstId],
      [secondId]: agents[secondId],
      [thirdId]: agents[thirdId],
      [fourthId]: agents[fourthId],
    }).filter((agent) => isDeployableReserveAgent(agent, game, assignedAgentIds))

    expect(filtered.map((agent) => agent.id)).not.toContain(firstId)
    expect(filtered.map((agent) => agent.id)).not.toContain(secondId)
    expect(filtered.map((agent) => agent.id)).not.toContain(thirdId)
    expect(filtered.map((agent) => agent.id)).not.toContain(fourthId)
  })

  it('excludes agents queued in training even when assignment state is idle', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]
    game.trainingQueue = [
      {
        agentId,
        id: 'queue:reserve-training',
        scope: 'agent',
        agentName: game.agents[agentId].name,
        targetStat: 'combat',
        statDelta: 1,
        durationWeeks: 2,
        fundingCost: 0,
        fatigueDelta: 0,
        trainingId: 'combat-drills',
        trainingName: 'Combat Drills',
        remainingWeeks: 2,
        startedWeek: 1,
      },
    ]

    const assignedAgentIds = new Set<string>()
    expect(isDeployableReserveAgent(game.agents[agentId], game, assignedAgentIds)).toBe(false)
  })
})
