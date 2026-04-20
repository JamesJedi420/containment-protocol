import { buildAgencySummary } from '../domain/agency'
import { assessFundingPressure } from '../domain/funding'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import type { GameState, SupportStaffSummary } from '../domain/models'

describe('Agency Support Staff Layer', () => {
  const baseGame: GameState = {
    week: 1,
    rngSeed: 42,
    rngState: 42,
    gameOver: false,
    directiveState: { selectedId: null, history: [] },
    agents: {},
    staff: {},
    candidates: [],
    teams: {},
    cases: {},
    templates: {},
    reports: [],
    events: [],
    inventory: {},
    trainingQueue: [],
    productionQueue: [],
    market: { week: 1, featuredRecipeId: '', pressure: 'stable', costMultiplier: 1 },
    config: {
      maxActiveCases: 5,
      trainingSlots: 2,
      partialMargin: 2,
      stageScalar: 1,
      challengeModeEnabled: false,
      durationModel: 'capacity',
      attritionPerWeek: 0,
      probabilityK: 1,
      raidCoordinationPenaltyPerExtraTeam: 0,
      weeksPerYear: 52,
      fundingBasePerWeek: 1000,
      fundingPerResolution: 500,
      fundingPenaltyPerFail: 200,
      fundingPenaltyPerUnresolved: 300,
      containmentWeeklyDecay: 1,
      containmentDeltaPerResolution: 2,
      containmentDeltaPerFail: -2,
      containmentDeltaPerUnresolved: -3,
      clearanceThresholds: [10, 20, 30],
    },
    containmentRating: 50,
    clearanceLevel: 1,
    funding: 1000,
  }

  it('should surface support staff in agency summary', () => {
    const supportStaff: SupportStaffSummary = {
      admin: 3,
      logistics: 4,
      medical: 2,
      intel: 1,
      total: 10,
      pressure: 0,
    }
    const game: GameState = { ...baseGame, supportStaff }
    const summary = buildAgencySummary(game)
    expect(summary.supportStaff).toBeTruthy()
    expect(summary.supportStaff?.total).toBe(10)
    expect(summary.supportStaff?.admin).toBe(3)
  })

  it('should reduce procurement throughput penalty with admin/logistics staff', () => {
    const supportStaff: SupportStaffSummary = {
      admin: 6,
      logistics: 6,
      medical: 0,
      intel: 0,
      total: 12,
      pressure: 0,
    }
    const game: GameState = { ...baseGame, supportStaff }
    const pressure = assessFundingPressure(game)
    // With high admin+logistics, penalty should be reduced to 0
    expect(pressure.recoveryThroughputPenalty).toBe(0)
  })

  it('should reduce recovery throughput penalty with medical staff', () => {
    const supportStaff: SupportStaffSummary = {
      admin: 0,
      logistics: 0,
      medical: 8,
      intel: 0,
      total: 8,
      pressure: 0,
    }
    const agents = {
      a1: { id: 'a1', status: 'recovering', fatigue: 10, trauma: { traumaLevel: 0, traumaTags: [], lastEventWeek: 1 } },
    }
    const teams = {}
    const result = advanceRecoveryDowntimeForWeek({
      week: 1,
      sourceAgents: agents as any,
      sourceTeams: teams,
      downtimeAssignments: { a1: 'rest' },
      supportStaff,
    })
    // With high medical staff, throughput penalty should be reduced
    expect(result.throughputPenaltyApplied).toBe(0)
  })
})
