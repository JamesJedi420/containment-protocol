import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildMissionRewardBreakdown } from '../domain/missionResults'
import { buildAgencyRanking, buildAgencyRankingHistory } from '../domain/rankings'
import type { CaseInstance, OperationEvent } from '../domain/models'

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

function makeCase(baseCase: CaseInstance, overrides: Partial<CaseInstance>): CaseInstance {
  return {
    ...baseCase,
    ...overrides,
  }
}

describe('rankings', () => {
  it('scores agency performance deterministically from outcomes, reputation, and progression', () => {
    const game = createStartingState()
    const majorIncident = makeCase(game.cases['case-003']!, {
      id: 'major-incident-1',
      title: 'District breach',
      kind: 'raid',
      stage: 4,
      raid: { minTeams: 2, maxTeams: 3 },
    })
    const partialCase = makeCase(game.cases['case-001']!, {
      id: 'partial-1',
      title: 'Residual haunting',
      stage: 2,
    })
    const failedCase = makeCase(game.cases['case-002']!, {
      id: 'failed-1',
      title: 'Collapsed perimeter',
      stage: 3,
    })
    const unresolvedCase = makeCase(game.cases['case-003']!, {
      id: 'unresolved-1',
      title: 'Anomaly surge',
      stage: 3,
      deadlineRemaining: 0,
    })

    const successReward = buildMissionRewardBreakdown(majorIncident, 'success', game.config, game)
    const partialReward = buildMissionRewardBreakdown(partialCase, 'partial', game.config, game)
    const failedReward = buildMissionRewardBreakdown(failedCase, 'fail', game.config, game)
    const unresolvedReward = buildMissionRewardBreakdown(
      unresolvedCase,
      'unresolved',
      game.config,
      game
    )

    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['major-incident-1'],
        failedCases: [],
        partialCases: ['partial-1'],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 12,
        teamStatus: [],
        notes: [],
      },
      {
        week: 2,
        rngStateBefore: 2,
        rngStateAfter: 3,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: ['failed-1'],
        partialCases: [],
        unresolvedTriggers: ['unresolved-1'],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 16,
        teamStatus: [],
        notes: [],
      },
    ]

    game.events = [
      makeEvent('case.resolved', {
        week: 1,
        caseId: majorIncident.id,
        caseTitle: majorIncident.title,
        mode: majorIncident.mode,
        kind: majorIncident.kind,
        stage: majorIncident.stage,
        teamIds: ['team-001'],
        rewardBreakdown: successReward,
      }),
      makeEvent('case.partially_resolved', {
        week: 1,
        caseId: partialCase.id,
        caseTitle: partialCase.title,
        mode: partialCase.mode,
        kind: partialCase.kind,
        fromStage: partialCase.stage,
        toStage: partialCase.stage + 1,
        teamIds: ['team-001'],
        rewardBreakdown: partialReward,
      }),
      makeEvent('case.failed', {
        week: 2,
        caseId: failedCase.id,
        caseTitle: failedCase.title,
        mode: failedCase.mode,
        kind: failedCase.kind,
        fromStage: failedCase.stage,
        toStage: failedCase.stage + 1,
        teamIds: ['team-002'],
        rewardBreakdown: failedReward,
      }),
      makeEvent('case.escalated', {
        week: 2,
        caseId: unresolvedCase.id,
        caseTitle: unresolvedCase.title,
        fromStage: unresolvedCase.stage,
        toStage: unresolvedCase.stage + 1,
        trigger: 'deadline',
        deadlineRemaining: 2,
        convertedToRaid: true,
        rewardBreakdown: unresolvedReward,
      }),
      makeEvent('progression.xp_gained', {
        week: 2,
        agentId: 'agent-001',
        agentName: 'Voss',
        xpAmount: 320,
        reason: 'operation',
        totalXp: 640,
        level: 3,
        levelsGained: 1,
      }),
      makeEvent('agent.promoted', {
        week: 2,
        agentId: 'agent-001',
        agentName: 'Voss',
        newRole: 'investigator',
        previousLevel: 2,
        newLevel: 3,
        levelsGained: 1,
        skillPointsGranted: 1,
      }),
    ]

    const ranking = buildAgencyRanking(game)
    const secondRanking = buildAgencyRanking(game)

    const expectedReputation =
      successReward.reputationDelta +
      partialReward.reputationDelta +
      failedReward.reputationDelta +
      unresolvedReward.reputationDelta

    expect(ranking).toEqual(secondRanking)
    expect(ranking.breakdown.casesResolved.points).toBe(6)
    expect(ranking.breakdown.majorIncidentsHandled.points).toBe(8)
    expect(ranking.breakdown.reputation.reputationDelta).toBe(expectedReputation)
    expect(ranking.breakdown.progression.xpGained).toBe(320)
    expect(ranking.breakdown.progression.promotions).toBe(1)
    expect(ranking.breakdown.progression.points).toBe(5)
    expect(ranking.breakdown.failures.penalty).toBe(6)
    expect(ranking.breakdown.unresolved.penalty).toBe(8)
    expect(ranking.score).toBe(
      Math.max(0, Math.min(100, 50 + 6 + 8 + expectedReputation + 5 - 6 - 8))
    )
  })

  it('builds cumulative weekly ranking history from reports and events', () => {
    const game = createStartingState()
    const majorIncident = makeCase(game.cases['case-003']!, {
      id: 'major-incident-1',
      title: 'District breach',
      kind: 'raid',
      stage: 4,
      raid: { minTeams: 2, maxTeams: 3 },
    })
    const minorCase = makeCase(game.cases['case-001']!, {
      id: 'minor-1',
      title: 'Witness chain',
      stage: 2,
    })

    const successReward = buildMissionRewardBreakdown(majorIncident, 'success', game.config, game)
    const failReward = buildMissionRewardBreakdown(minorCase, 'fail', game.config, game)

    game.reports = [
      {
        week: 1,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['major-incident-1'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 10,
        teamStatus: [],
        notes: [],
      },
      {
        week: 2,
        rngStateBefore: 2,
        rngStateAfter: 3,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: ['minor-1'],
        partialCases: [],
        unresolvedTriggers: ['minor-1'],
        spawnedCases: [],
        maxStage: 4,
        avgFatigue: 15,
        teamStatus: [],
        notes: [],
      },
    ]

    game.events = [
      makeEvent('case.resolved', {
        week: 1,
        caseId: majorIncident.id,
        caseTitle: majorIncident.title,
        mode: majorIncident.mode,
        kind: majorIncident.kind,
        stage: majorIncident.stage,
        teamIds: ['team-001'],
        rewardBreakdown: successReward,
      }),
      makeEvent('progression.xp_gained', {
        week: 1,
        agentId: 'agent-001',
        agentName: 'Voss',
        xpAmount: 150,
        reason: 'operation',
        totalXp: 150,
        level: 2,
        levelsGained: 0,
      }),
      makeEvent('case.failed', {
        week: 2,
        caseId: minorCase.id,
        caseTitle: minorCase.title,
        mode: minorCase.mode,
        kind: minorCase.kind,
        fromStage: minorCase.stage,
        toStage: minorCase.stage + 1,
        teamIds: ['team-002'],
        rewardBreakdown: failReward,
      }),
    ]

    const history = buildAgencyRankingHistory(game, 8)

    expect(history).toHaveLength(2)
    expect(history[0]).toMatchObject({
      week: 1,
      summary: {
        resolvedCases: 1,
        majorIncidentsHandled: 1,
        failures: 0,
        unresolved: 0,
        progressionXp: 150,
      },
    })
    expect(history[1]).toMatchObject({
      week: 2,
      summary: {
        resolvedCases: 1,
        majorIncidentsHandled: 1,
        failures: 1,
        unresolved: 1,
        progressionXp: 150,
      },
    })
    expect(history[1]!.score).toBeLessThan(history[0]!.score)
    expect(history[1]!.deltaFromPrevious).toBe(history[1]!.score - history[0]!.score)
  })
})
