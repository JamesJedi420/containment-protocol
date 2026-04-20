import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import { buildAgencySummary } from '../domain/agency'
import type { OperationEvent } from '../domain/models'

function makeEvent<TType extends OperationEvent['type']>(
  type: TType,
  payload: Extract<OperationEvent, { type: TType }>['payload']
): OperationEvent {
  const inferSource = () => {
    if (type.startsWith('assignment.')) return 'assignment'
    if (type.startsWith('case.')) return 'incident'
    if (type.startsWith('intel.')) return 'intel'
    if (type.startsWith('agent.')) return 'agent'
    if (type.startsWith('production.') || type.startsWith('market.')) return 'production'
    if (type.startsWith('faction.')) return 'faction'
    return 'system'
  }

  return {
    id: `evt-${type.replace(/\./g, '-')}-${payload.week}`,
    schemaVersion: 1,
    type,
    sourceSystem: inferSource() as OperationEvent['sourceSystem'],
    timestamp: `2042-01-${String(payload.week).padStart(2, '0')}T00:00:00.001Z`,
    payload,
  } as OperationEvent
}

describe('agency', () => {
  it('builds a deterministic top-level agency summary', () => {
    const game = createStartingState()

    const first = buildAgencySummary(game)
    const second = buildAgencySummary(game)

    expect(first).toEqual(second)
    expect(first.name).toBe('Containment Protocol')
    expect(first.containmentRating).toBe(game.agency?.containmentRating ?? game.containmentRating)
    expect(first.clearanceLevel).toBe(game.agency?.clearanceLevel ?? game.clearanceLevel)
    expect(first.funding).toBe(game.agency?.funding ?? game.funding)
    expect(first.teams.total).toBe(Object.keys(game.teams).length)
    expect(first.activeOperations.activeCases).toBe(
      Object.values(game.cases).filter((currentCase) => currentCase.status !== 'resolved').length
    )
  })

  it('aggregates cases, factions, markets, and incidents into pressure/stability and reputation', () => {
    const baseline = createStartingState()
    const stressed = createStartingState()
    const reputationCase = {
      ...stressed.cases['case-001']!,
      id: 'agency-rep-1',
      title: 'Sanctum breach',
      stage: 4,
      kind: 'raid' as const,
      raid: { minTeams: 2, maxTeams: 3 },
      deadlineRemaining: 1,
    }
    const rewardBreakdown = buildMissionRewardBreakdown(
      reputationCase,
      'success',
      stressed.config,
      stressed
    )

    stressed.market = {
      ...stressed.market,
      pressure: 'tight',
    }
    stressed.cases[reputationCase.id] = reputationCase
    stressed.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [reputationCase.id],
        resolvedCases: [reputationCase.id],
        failedCases: ['case-002'],
        partialCases: [],
        unresolvedTriggers: ['case-003'],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 18,
        teamStatus: [],
        notes: [],
      },
    ]
    stressed.events = [
      makeEvent('case.resolved', {
        week: 1,
        caseId: reputationCase.id,
        caseTitle: reputationCase.title,
        mode: reputationCase.mode,
        kind: reputationCase.kind,
        stage: reputationCase.stage,
        teamIds: ['t_nightwatch'],
        rewardBreakdown,
      }),
      makeEvent('faction.standing_changed', {
        week: 1,
        factionId: 'oversight',
        factionName: 'Oversight Bureau',
        delta: 4,
        standingBefore: 0,
        standingAfter: 4,
        reason: 'case.resolved',
        caseId: reputationCase.id,
        caseTitle: reputationCase.title,
      }),
    ]

    const baselineSummary = buildAgencySummary(baseline)
    const stressedSummary = buildAgencySummary(stressed)

    expect(stressedSummary.reputation).toBeGreaterThan(baselineSummary.reputation)
    expect(stressedSummary.pressure.score).toBeGreaterThan(baselineSummary.pressure.score)
    expect(stressedSummary.activeOperations.majorIncidents).toBeGreaterThan(
      baselineSummary.activeOperations.majorIncidents
    )
    expect(stressedSummary.stability.score).toBeLessThanOrEqual(baselineSummary.stability.score)
    expect(stressedSummary.report.latestWeek).toBe(1)
    expect(stressedSummary.report.resolved).toBe(1)
    expect(stressedSummary.report.failed).toBe(1)
    expect(stressedSummary.report.unresolved).toBe(1)
  })

  it('surfaces territorial power through the agency summary without local recomputation', () => {
    const game = createStartingState()
    game.territorialPower = {
      nodes: [
        {
          id: 'node-cairn',
          yield: 5,
          suppressed: false,
          controller: 'Containment Protocol',
        },
      ],
      conduits: [
        {
          from: 'node-cairn',
          to: 'ward-north',
          status: 'open',
          capacity: 3,
        },
      ],
      castingEligibility: [
        {
          scopeId: 'node-cairn',
          scopeType: 'node',
          eligible: true,
        },
      ],
      lastExpenditure: {
        scopeId: 'node-cairn',
        scopeType: 'node',
        nodeId: 'node-cairn',
        result: 'spent',
        amount: 3,
        availableYield: 5,
        conduitCapacity: 3,
      },
    }

    const summary = buildAgencySummary(game)

    expect(summary.territorialPower).toMatchObject({
      nodeCount: 1,
      availableYield: 5,
      openConduitCount: 1,
      eligibleScopeCount: 1,
    })
    expect(summary.territorialPower.controllers).toEqual(['Containment Protocol'])
  })

  it('surfaces supply-network state through the agency summary without local recomputation', () => {
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
        {
          id: 'node-corridor',
          label: 'North Corridor',
          type: 'corridor',
          controller: 'agency',
          active: true,
          strategicValue: 4,
          regionTags: ['occult_district'],
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
      links: [
        {
          id: 'link-command-corridor',
          from: 'node-command',
          to: 'node-corridor',
          mode: 'road',
          status: 'open',
          capacity: 1,
        },
      ],
      transportAssets: [
        {
          id: 'transport-main',
          label: 'Main Column',
          class: 'truck_column',
          mode: 'road',
          status: 'ready',
          lift: 1,
          fragility: 2,
          routeNodeIds: ['node-command', 'node-corridor'],
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
          deliveredLift: 1,
          explanation: 'global: Directorate Dispatch reached Directorate Command via Main Column.',
        },
        {
          regionTag: 'occult_district',
          state: 'supported',
          sourceId: 'source-command',
          sourceLabel: 'Directorate Dispatch',
          targetNodeId: 'node-corridor',
          targetNodeLabel: 'North Corridor',
          transportAssetId: 'transport-main',
          transportAssetLabel: 'Main Column',
          pathNodeIds: ['node-command', 'node-corridor'],
          pathLinkIds: ['link-command-corridor'],
          deliveredLift: 1,
          explanation: 'occult_district: Directorate Dispatch reached North Corridor via Main Column.',
        },
      ],
    }

    const summary = buildAgencySummary(game)

    expect(summary.supplyNetwork).toMatchObject({
      tracedRegionCount: 2,
      supportedRegionCount: 2,
      unsupportedRegionCount: 0,
      readyTransportCount: 1,
      deliveredLift: 2,
      strategicControlScore: 7,
    })
  })
})
