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
        caseSnapshots: {
          [reputationCase.id]: {
            caseId: reputationCase.id,
            title: reputationCase.title,
            kind: reputationCase.kind,
            mode: reputationCase.mode,
            status: 'resolved',
            stage: reputationCase.stage,
            deadlineRemaining: reputationCase.deadlineRemaining,
            durationWeeks: reputationCase.durationWeeks,
            assignedTeamIds: [],
            aggregateBattle: {
              battleId: `${reputationCase.id}-week-1`,
              regionTag: reputationCase.regionTag ?? 'urban_sector',
              roundsResolved: 3,
              winnerSideId: 'operators',
              winnerLabel: 'Containment Teams',
              friendlySideId: 'operators',
              friendlyLabel: 'Containment Teams',
              hostileSideId: 'hostiles',
              hostileLabel: 'Hostile Forces',
              movementDeniedCount: 1,
              movementDeniedUnits: ['Green Tape'],
              friendlyRoutedUnits: [],
              hostileRoutedUnits: ['Hostile Screen'],
              specialDamage: [
                {
                  unitId: 'hostile-special',
                  label: 'Reliquary Guardian',
                  sideId: 'hostiles',
                  hitsTaken: 2,
                  hitsToBreak: 3,
                  destroyed: false,
                },
              ],
              summaryTable: [],
            },
          },
        },
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
    expect(stressedSummary.report.battles).toBe(1)
    expect(stressedSummary.report.hostileRouted).toBe(1)
    expect(stressedSummary.report.specialDamaged).toBe(1)
  })
})
