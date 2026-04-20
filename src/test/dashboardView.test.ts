import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getDashboardMetrics, getFieldStatusViews } from '../features/dashboard/dashboardView'

function setTeamFatigue(
  game: ReturnType<typeof createStartingState>,
  teamId: string,
  fatigue: number
) {
  const team = game.teams[teamId]

  for (const agentId of team?.agentIds ?? []) {
    game.agents[agentId] = {
      ...game.agents[agentId],
      fatigue,
    }
  }
}

describe('getFieldStatusViews', () => {
  it('marks unassigned low-fatigue teams as idle with zero progress', () => {
    const game = createStartingState()
    setTeamFatigue(game, 't_nightwatch', 10)

    const views = getFieldStatusViews(game)
    const nightWatch = views.find((view) => view.team.id === 't_nightwatch')

    expect(nightWatch).toBeDefined()
    expect(nightWatch?.assignedCase).toBeUndefined()
    expect(nightWatch?.status).toBe('idle')
    expect(nightWatch?.progressPercent).toBe(0)
  })

  it('marks assigned low-fatigue teams as deploying and computes progress from remaining weeks', () => {
    const assigned = createStartingState()
    const currentCase = assigned.cases['case-001']
    const expectedRemaining = Math.max(0, currentCase.durationWeeks - 1)

    assigned.cases['case-001'] = {
      ...currentCase,
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: expectedRemaining,
    }
    assigned.teams['t_nightwatch'] = {
      ...assigned.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }
    setTeamFatigue(assigned, 't_nightwatch', 12)

    const views = getFieldStatusViews(assigned)
    const nightWatch = views.find((view) => view.team.id === 't_nightwatch')
    const expectedProgress = Math.round((1 / Math.max(currentCase.durationWeeks, 1)) * 100)

    expect(nightWatch?.status).toBe('deploying')
    expect(nightWatch?.progressPercent).toBe(expectedProgress)
  })

  it('marks assigned high-fatigue teams as overstretched', () => {
    const assigned = createStartingState()
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: 1,
    }
    assigned.teams['t_nightwatch'] = {
      ...assigned.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }
    setTeamFatigue(assigned, 't_nightwatch', 45)

    const views = getFieldStatusViews(assigned)
    const nightWatch = views.find((view) => view.team.id === 't_nightwatch')

    expect(nightWatch?.assignedCase?.id).toBe('case-001')
    expect(nightWatch?.status).toBe('overstretched')
  })

  it('marks unassigned high-fatigue teams as recovering', () => {
    const game = createStartingState()
    setTeamFatigue(game, 't_greentape', 60)

    const views = getFieldStatusViews(game)
    const greenTape = views.find((view) => view.team.id === 't_greentape')

    expect(greenTape?.assignedCase).toBeUndefined()
    expect(greenTape?.status).toBe('recovering')
  })

  it('sorts assigned teams before unassigned and higher progress first among active deployments', () => {
    const game = createStartingState()

    game.teams['team-idle'] = {
      id: 'team-idle',
      name: 'Idle Team',
      agentIds: [],
      tags: [],
    }

    game.cases['case-001'] = {
      ...game.cases['case-001'],
      status: 'in_progress',
      durationWeeks: 4,
      weeksRemaining: 1,
      assignedTeamIds: ['t_nightwatch'],
    }
    game.cases['case-002'] = {
      ...game.cases['case-002'],
      status: 'in_progress',
      durationWeeks: 4,
      weeksRemaining: 3,
      assignedTeamIds: ['t_greentape'],
    }

    game.teams['t_nightwatch'] = {
      ...game.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }
    game.teams['t_greentape'] = {
      ...game.teams['t_greentape'],
      assignedCaseId: 'case-002',
    }

    const views = getFieldStatusViews(game)
    const ids = views.map((view) => view.team.id)

    expect(ids[0]).toBe('t_nightwatch')
    expect(ids[1]).toBe('t_greentape')
    expect(ids.at(-1)).toBe('team-idle')
  })

  it('flags deadline and critical-stage signals for high-pressure deployments', () => {
    const assigned = createStartingState()

    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      deadlineRemaining: 1,
      stage: 4,
    }
    assigned.teams['t_nightwatch'] = {
      ...assigned.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const views = getFieldStatusViews(assigned)
    const nightWatch = views.find((view) => view.team.id === 't_nightwatch')

    expect(nightWatch?.signals.deadlineRisk).toBe(true)
    expect(nightWatch?.signals.criticalStage).toBe(true)
    expect(nightWatch?.signals.raidUnderstaffed).toBe(false)
  })

  it('flags raid-understaffed when a raid assignment is below min teams', () => {
    const game = createStartingState()

    game.cases['case-003'] = {
      ...game.cases['case-003'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 3 },
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: 2,
    }
    game.teams['t_nightwatch'] = {
      ...game.teams['t_nightwatch'],
      assignedCaseId: 'case-003',
    }

    const views = getFieldStatusViews(game)
    const nightWatch = views.find((view) => view.team.id === 't_nightwatch')

    expect(nightWatch?.signals.raidUnderstaffed).toBe(true)
    expect(nightWatch?.signals.deadlineRisk).toBe(false)
  })
})

describe('getDashboardMetrics', () => {
  it('aggregates deployment risk counters from field status signals', () => {
    const game = createStartingState()

    game.cases['case-001'] = {
      ...game.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 3 },
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      deadlineRemaining: 1,
      stage: 4,
      weeksRemaining: 1,
    }
    game.teams['t_nightwatch'] = {
      ...game.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }
    setTeamFatigue(game, 't_nightwatch', 60)

    const metrics = getDashboardMetrics(game)

    expect(metrics.deadlineRiskCount).toBe(1)
    expect(metrics.criticalStageCount).toBe(1)
    expect(metrics.raidUnderstaffedCount).toBe(1)
    expect(metrics.overstretchedTeamCount).toBe(1)
  })

  it('returns zeroed deployment risk counters when no teams are under pressure', () => {
    const game = createStartingState()

    const metrics = getDashboardMetrics(game)

    expect(metrics.deadlineRiskCount).toBe(0)
    expect(metrics.criticalStageCount).toBe(0)
    expect(metrics.raidUnderstaffedCount).toBe(0)
    expect(metrics.overstretchedTeamCount).toBe(0)
  })

  it('includes canonical territorial power summary fields for dashboard inspection', () => {
    const game = createStartingState()
    game.territorialPower = {
      nodes: [
        {
          id: 'node-ember',
          yield: 7,
          suppressed: false,
          controller: 'Containment Protocol',
        },
      ],
      conduits: [
        {
          from: 'node-ember',
          to: 'ward-south',
          status: 'open',
          capacity: 5,
        },
      ],
      castingEligibility: [
        {
          scopeId: 'node-ember',
          scopeType: 'node',
          eligible: true,
        },
      ],
      lastExpenditure: {
        scopeId: 'node-ember',
        scopeType: 'node',
        nodeId: 'node-ember',
        result: 'spent',
        amount: 5,
        availableYield: 7,
        conduitCapacity: 5,
      },
    }

    const metrics = getDashboardMetrics(game)

    expect(metrics.territorialPower).toMatchObject({
      nodeCount: 1,
      availableYield: 7,
      openConduitCount: 1,
      eligibleScopeCount: 1,
    })
  })

  it('includes canonical supply-network summary fields for dashboard inspection', () => {
    const game = createStartingState()
    game.supplyNetwork = {
      nodes: [
        {
          id: 'node-command',
          label: 'Directorate Command',
          type: 'command_center',
          controller: 'agency',
          active: true,
          strategicValue: 3,
          regionTags: ['global'],
        },
      ],
      sources: [
        {
          id: 'source-command',
          label: 'Directorate Dispatch',
          type: 'command',
          nodeId: 'node-command',
          active: true,
          throughput: 2,
        },
      ],
      links: [],
      transportAssets: [
        {
          id: 'transport-main',
          label: 'Main Column',
          class: 'truck_column',
          mode: 'road',
          status: 'ready',
          lift: 2,
          fragility: 2,
          routeNodeIds: ['node-command'],
        },
      ],
      traces: [
        {
          regionTag: 'global',
          state: 'supported',
          sourceId: 'source-command',
          sourceLabel: 'Directorate Dispatch',
          targetNodeId: 'node-command',
          targetNodeLabel: 'Directorate Command',
          transportAssetId: 'transport-main',
          transportAssetLabel: 'Main Column',
          pathNodeIds: ['node-command'],
          pathLinkIds: [],
          deliveredLift: 2,
          explanation: 'global: Directorate Dispatch reached Directorate Command via Main Column.',
        },
      ],
    }

    const metrics = getDashboardMetrics(game)

    expect(metrics.supplyNetwork).toMatchObject({
      tracedRegionCount: 1,
      supportedRegionCount: 1,
      readyTransportCount: 1,
      deliveredLift: 2,
      strategicControlScore: 3,
    })
  })
})
