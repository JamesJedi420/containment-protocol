import { describe, expect, it } from 'vitest'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { buildReplacementPressureState } from '../domain/agent/attrition'
import { evaluateDeploymentEligibility } from '../domain/deploymentReadiness'
import { assessFacilityUpgrade } from '../domain/facility'
import { createInitialFundingState, normalizeFundingState } from '../domain/funding'
import { triageMission } from '../domain/missionIntakeRouting'
import type {
  FacilityInstance,
  FacilityUpgradeMetadata,
  FundingState,
  GameState,
} from '../domain/models'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import { analyzeRuntimeStability } from '../domain/stabilityLayer'
import { normalizeGameState } from '../domain/teamSimulation'

function withFundingProfile(
  state: GameState,
  options: {
    funding?: number
    stalePendingCount?: number
    freshPendingCount?: number
    penaltyHistoryCount?: number
  } = {}
): GameState {
  const funding = options.funding ?? state.funding
  const stalePendingCount = options.stalePendingCount ?? 0
  const freshPendingCount = options.freshPendingCount ?? 0
  const penaltyHistoryCount = options.penaltyHistoryCount ?? 0
  const baseFundingState = createInitialFundingState(
    state.config.fundingBasePerWeek,
    state.config.fundingPerResolution,
    state.config.fundingPenaltyPerFail,
    state.config.fundingPenaltyPerUnresolved,
    funding
  )

  const procurementBacklog: FundingState['procurementBacklog'] = [
    ...Array.from({ length: stalePendingCount }, (_, index) => ({
      requestId: `stale-req-${index + 1}`,
      itemId: 'stabilizer-kit',
      quantity: 1,
      status: 'pending' as const,
      requestedWeek: Math.max(1, state.week - 6),
      cost: 5,
    })),
    ...Array.from({ length: freshPendingCount }, (_, index) => ({
      requestId: `fresh-req-${index + 1}`,
      itemId: 'stabilizer-kit',
      quantity: 1,
      status: 'pending' as const,
      requestedWeek: state.week,
      cost: 5,
    })),
  ]

  const fundingHistory: FundingState['fundingHistory'] = Array.from(
    { length: penaltyHistoryCount },
    (_, index) => ({
      week: Math.max(1, state.week - index),
      delta: -6,
      reason: index % 2 === 0 ? 'failure_penalty' : 'unresolved_penalty',
      sourceId: `penalty-${index + 1}`,
    })
  )

  const fundingState = normalizeFundingState(
    funding,
    state.config,
    {
      ...baseFundingState,
      funding,
      procurementBacklog,
      fundingHistory,
    },
    state.week
  )

  return normalizeGameState({
    ...state,
    funding,
    agency: {
      ...(state.agency ?? {
        containmentRating: state.containmentRating,
        clearanceLevel: state.clearanceLevel,
        funding,
      }),
      funding,
      fundingState,
    },
  })
}

function makeResearchFacility(overrides: Partial<FacilityInstance> = {}): FacilityInstance {
  return {
    facilityId: 'research_lab',
    category: 'research_lab',
    level: 1,
    maxLevel: 3,
    status: 'active',
    effects: { researchSpeedMultiplier: 1 },
    ...overrides,
  }
}

describe('funding / procurement integration completion pass', () => {
  it('applies funding pressure to mission triage and deployment readiness surfaces', () => {
    const missionId = 'case-001'
    const base = withFundingProfile({
      ...createStartingState(),
      week: 8,
    })
    const pressured = withFundingProfile(base, {
      funding: base.funding,
      stalePendingCount: 1,
      penaltyHistoryCount: 4,
    })

    const baseTriage = triageMission(base, base.cases[missionId])
    const pressuredTriage = triageMission(pressured, pressured.cases[missionId])
    const baseEligibility = evaluateDeploymentEligibility(base, missionId, 't_nightwatch')
    const pressuredEligibility = evaluateDeploymentEligibility(pressured, missionId, 't_nightwatch')

    expect(pressuredTriage.score).toBeLessThan(baseTriage.score)
    expect(pressuredTriage.reasonCodes).toContain('budget-pressure-high')
    expect(pressuredEligibility.softRisks).toContain('budget-pressure')
    expect(pressuredEligibility.timeCostSummary.expectedSetupWeeks).toBeGreaterThan(
      baseEligibility.timeCostSummary.expectedSetupWeeks
    )
    expect(pressuredEligibility.explanationNotes.some((note) => note.includes('Budget pressure:'))).toBe(
      true
    )
  })

  it('slows recovery throughput under sustained funding pressure', () => {
    const state = withFundingProfile(
      {
        ...createStartingState(),
        week: 8,
        agents: {
          ...createStartingState().agents,
          a_ava: {
            ...createStartingState().agents.a_ava,
            status: 'recovering',
            assignment: { state: 'recovery', startedWeek: 6, teamId: 't_nightwatch' },
            recoveryStatus: { state: 'recovering', sinceWeek: 6 },
            trauma: {
              traumaLevel: 1,
              traumaTags: ['funding-test'],
              lastEventWeek: 7,
            },
            fatigue: 30,
          },
        },
      },
      {
        funding: -5,
        stalePendingCount: 8,
        penaltyHistoryCount: 4,
      }
    )
    const baseline = withFundingProfile(
      {
        ...state,
        funding: 110,
      },
      {
        funding: 110,
      }
    )
    const assignments = { a_ava: 'therapy' as const }

    const healthy = advanceRecoveryDowntimeForWeek({
      week: state.week,
      sourceAgents: baseline.agents,
      sourceTeams: baseline.teams,
      downtimeAssignments: assignments,
      fundingState: baseline.agency?.fundingState,
    })
    const pressured = advanceRecoveryDowntimeForWeek({
      week: state.week,
      sourceAgents: state.agents,
      sourceTeams: state.teams,
      downtimeAssignments: assignments,
      fundingState: state.agency?.fundingState,
    })

    expect(pressured.budgetPressureApplied).toBeGreaterThan(healthy.budgetPressureApplied)
    expect(pressured.throughputPenaltyApplied).toBeGreaterThan(healthy.throughputPenaltyApplied)
    expect(pressured.updatedAgents.a_ava.trauma?.traumaLevel).toBeGreaterThan(
      healthy.updatedAgents.a_ava.trauma?.traumaLevel ?? 0
    )
    expect(pressured.updatedAgents.a_ava.fatigue).toBeGreaterThan(healthy.updatedAgents.a_ava.fatigue)
  })

  it('blocks facility progression when procurement pressure is stale and inspectable', () => {
    const upgrade: FacilityUpgradeMetadata = {
      costMoney: 100,
      costMaterials: 0,
      buildWeeks: 2,
      effectDeltas: { researchSpeedMultiplier: 0.5 },
    }
    const base = withFundingProfile({
      ...createStartingState(),
      week: 8,
      funding: 250,
      facilityState: {
        facilities: {
          research_lab: makeResearchFacility(),
        },
      },
    })
    const pressured = withFundingProfile(base, {
      funding: 250,
      stalePendingCount: 1,
    })

    const unlocked = assessFacilityUpgrade(base, 'research_lab', upgrade)
    const blocked = assessFacilityUpgrade(pressured, 'research_lab', upgrade)

    expect(unlocked.canUpgrade).toBe(true)
    expect(blocked.canUpgrade).toBe(false)
    expect(blocked.blockedReasons).toContain('stale-procurement-backlog')
    expect(blocked.staleProcurementRequestIds).toEqual(['stale-req-1'])
    expect(blocked.budgetPressure).toBeGreaterThanOrEqual(1)
  })

  it('raises replacement pressure when funding strain overlaps staffing loss', () => {
    const base = withFundingProfile({
      ...createStartingState(),
      week: 8,
      agents: {
        ...createStartingState().agents,
        a_rook: {
          ...createStartingState().agents.a_rook,
          attritionState: {
            attritionStatus: 'lost',
            lossReasonCodes: ['procurement-collapse'],
            replacementPriority: 1,
            retentionPressure: 0,
          },
        },
      },
    })
    const pressured = withFundingProfile(base, {
      funding: 110,
      stalePendingCount: 1,
      penaltyHistoryCount: 4,
    })

    const basePressure = buildReplacementPressureState(base)
    const pressuredPressure = buildReplacementPressureState(pressured)

    expect(basePressure.staffingGap).toBe(1)
    expect(pressuredPressure.staffingGap).toBe(basePressure.staffingGap)
    expect(pressuredPressure.replacementPressure).toBeGreaterThan(basePressure.replacementPressure)
  })

  it('preserves funding-derived deployment and facility gating across save/load', () => {
    const upgrade: FacilityUpgradeMetadata = {
      costMoney: 100,
      costMaterials: 0,
      buildWeeks: 2,
      effectDeltas: { researchSpeedMultiplier: 0.5 },
    }
    const prepared = withFundingProfile(
      {
        ...createStartingState(),
        week: 8,
        funding: 250,
        facilityState: {
          facilities: {
            research_lab: makeResearchFacility(),
          },
        },
      },
      {
        funding: 250,
        stalePendingCount: 1,
        penaltyHistoryCount: 4,
      }
    )

    const beforeDeployment = evaluateDeploymentEligibility(prepared, 'case-001', 't_nightwatch')
    const beforeFacility = assessFacilityUpgrade(prepared, 'research_lab', upgrade)
    const loaded = loadGameSave(serializeGameSave(prepared))
    const afterDeployment = evaluateDeploymentEligibility(loaded, 'case-001', 't_nightwatch')
    const afterFacility = assessFacilityUpgrade(loaded, 'research_lab', upgrade)

    expect(loaded.agency?.fundingState?.procurementBacklog).toHaveLength(1)
    expect(afterDeployment.softRisks).toEqual(beforeDeployment.softRisks)
    expect(afterDeployment.timeCostSummary.expectedSetupWeeks).toBe(
      beforeDeployment.timeCostSummary.expectedSetupWeeks
    )
    expect(afterFacility.blockedReasons).toEqual(beforeFacility.blockedReasons)
    expect(afterFacility.staleProcurementRequestIds).toEqual(beforeFacility.staleProcurementRequestIds)
  })

  it('surfaces stale procurement entries and invalid funding-derived pressure during stability analysis', () => {
    const prepared = withFundingProfile(
      {
        ...createStartingState(),
        week: 8,
      },
      {
        funding: 110,
        stalePendingCount: 1,
        penaltyHistoryCount: 4,
      }
    )
    const broken = {
      ...prepared,
      agency: {
        ...prepared.agency!,
        fundingState: {
          ...prepared.agency!.fundingState!,
          funding: prepared.funding + 50,
          budgetPressure: 0,
          procurementBacklog: prepared.agency!.fundingState!.procurementBacklog.map((entry) => ({
            ...entry,
            fulfilledWeek: prepared.week,
          })),
        },
      },
    }

    const report = analyzeRuntimeStability(broken)

    expect(report.issues.some((issue) => issue.id === 'restored-state.funding-mirror-mismatch')).toBe(
      true
    )
    expect(
      report.issues.some((issue) => issue.id === 'restored-state.funding-budget-pressure-mismatch')
    ).toBe(true)
    expect(
      report.issues.some((issue) => issue.id.includes('restored-state.procurement-stale-pending.'))
    ).toBe(true)
    expect(
      report.issues.some((issue) =>
        issue.id.includes('restored-state.procurement-pending-fulfilled-week.')
      )
    ).toBe(true)
  })
})
