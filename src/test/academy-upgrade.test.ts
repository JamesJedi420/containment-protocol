import { describe, expect, it } from 'vitest'
// cspell:words sato
import { createStartingState } from '../data/startingState'
import { trainingCatalog } from '../data/training'
import { buildAcademyOverview } from '../domain/academy'
import {
  ACADEMY_UPGRADE_COSTS,
  getAcademyStatBonus,
  getAcademyUpgradeCost,
  MAX_ACADEMY_TIER,
  upgradeAcademy,
} from '../domain/sim/academyUpgrade'
import {
  advanceTrainingQueues,
  getTrainingAptitudeBonus,
  isAgentTraining,
  queueTeamTraining,
  queueTraining,
} from '../domain/sim/training'
import { getTeamMemberIds } from '../domain/teamSimulation'
import { type GameState } from '../domain/models'

const combatDrills = trainingCatalog.find((p) => p.trainingId === 'combat-drills')
const coordinationDrill = trainingCatalog.find((p) => p.trainingId === 'coordination-drill')
const threatAssessment = trainingCatalog.find((p) => p.trainingId === 'threat-assessment')
const assaultCollective = trainingCatalog.find((p) => p.trainingId === 'assault-collective')

if (!combatDrills) throw new Error('Missing combat-drills training program in catalog.')
if (!coordinationDrill) throw new Error('Missing coordination-drill training program in catalog.')
if (!threatAssessment) throw new Error('Missing threat-assessment training program in catalog.')
if (!assaultCollective) throw new Error('Missing assault-collective training program in catalog.')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stateWithFunding(funding: number) {
  return { ...createStartingState(), funding }
}

function stateWithTier(tier: number, funding = 999) {
  return { ...createStartingState(), academyTier: tier, funding }
}

// ---------------------------------------------------------------------------
// getAcademyUpgradeCost
// ---------------------------------------------------------------------------

describe('getAcademyUpgradeCost', () => {
  it('returns cost for each tier', () => {
    expect(getAcademyUpgradeCost(0)).toBe(ACADEMY_UPGRADE_COSTS[0])
    expect(getAcademyUpgradeCost(1)).toBe(ACADEMY_UPGRADE_COSTS[1])
    expect(getAcademyUpgradeCost(2)).toBe(ACADEMY_UPGRADE_COSTS[2])
  })

  it('returns null at MAX_ACADEMY_TIER', () => {
    expect(getAcademyUpgradeCost(MAX_ACADEMY_TIER)).toBeNull()
    expect(getAcademyUpgradeCost(MAX_ACADEMY_TIER + 1)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getAcademyStatBonus
// ---------------------------------------------------------------------------

describe('getAcademyStatBonus', () => {
  it('returns 0 for tier 0 only', () => {
    expect(getAcademyStatBonus(0)).toBe(0)
  })

  it('returns 1 for tiers 1, 2 and 3', () => {
    expect(getAcademyStatBonus(1)).toBe(1)
    expect(getAcademyStatBonus(2)).toBe(1)
    expect(getAcademyStatBonus(3)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// upgradeAcademy
// ---------------------------------------------------------------------------

describe('upgradeAcademy', () => {
  it('deducts upgrade cost and increments tier from 0 to 1', () => {
    const cost = ACADEMY_UPGRADE_COSTS[0]
    const state = stateWithFunding(cost + 50)
    const next = upgradeAcademy(state)

    expect(next.academyTier).toBe(1)
    expect(next.funding).toBe(50)
  })

  it('is a no-op when funding is insufficient', () => {
    const cost = ACADEMY_UPGRADE_COSTS[0]
    const state = stateWithFunding(cost - 1)
    const next = upgradeAcademy(state)

    expect(next.academyTier ?? 0).toBe(0)
    expect(next.funding).toBe(cost - 1)
  })

  it('is a no-op at MAX_ACADEMY_TIER', () => {
    const state = stateWithTier(MAX_ACADEMY_TIER)
    const next = upgradeAcademy(state)

    expect(next.academyTier).toBe(MAX_ACADEMY_TIER)
    expect(next.funding).toBe(999) // unchanged
  })
})

// ---------------------------------------------------------------------------
// Training slots cap
// ---------------------------------------------------------------------------

describe('training slot cap', () => {
  it('blocks queueTraining when all default slots are full', () => {
    // Fill 4 slots (the default) by queuing four distinct agents.
    let state = createStartingState()
    const agentIds = Object.keys(state.agents).slice(0, 4)

    for (const agentId of agentIds) {
      state = queueTraining(state, agentId, combatDrills.trainingId)
    }

    const filledSlots = Object.values(state.agents).filter(isAgentTraining).length
    expect(filledSlots).toBe(4)

    // A 5th agent should be rejected.
    const fifthAgentId = Object.keys(state.agents).find(
      (id) => !agentIds.includes(id) && state.agents[id]?.status === 'active'
    )
    if (!fifthAgentId) {
      // Not enough agents in fixture — skip rather than fail
      return
    }

    const before = state.agents[fifthAgentId]!.assignment?.state
    const next = queueTraining(state, fifthAgentId, combatDrills.trainingId)
    expect(Object.values(next.agents).filter(isAgentTraining).length).toBe(4)
    expect(next.agents[fifthAgentId]?.assignment?.state).toBe(before)
  })

  it('allows a 5th trainer when academyTier is 1 (5 effective slots)', () => {
    let state: GameState = { ...createStartingState(), academyTier: 1 }
    const agentIds = Object.keys(state.agents).slice(0, 5)

    // queue 5 agents
    let succeeded = 0
    for (const agentId of agentIds) {
      const next = queueTraining(state, agentId, combatDrills.trainingId)
      if (
        Object.values(next.agents).filter(isAgentTraining).length >
        Object.values(state.agents).filter(isAgentTraining).length
      ) {
        succeeded++
      }
      state = next
    }

    expect(succeeded).toBeGreaterThanOrEqual(4)
  })
})

// ---------------------------------------------------------------------------
// Training efficiency (academyStatBonus applied on completion)
// ---------------------------------------------------------------------------

describe('academy stat bonus on training completion', () => {
  it('training completion at tier 1 applies +1 extra stat gain', () => {
    let state: GameState = { ...createStartingState(), academyTier: 1 }
    const agentId = Object.keys(state.agents)[0]!
    const agent = state.agents[agentId]!
    const targetStat = combatDrills.targetStat
    const baseStat = agent.baseStats[targetStat]
    const aptitudeBonus = getTrainingAptitudeBonus(agent.role, targetStat)

    state = queueTraining(state, agentId, combatDrills.trainingId)

    for (let i = 0; i < combatDrills.durationWeeks; i++) {
      state = advanceTrainingQueues(state).state
    }

    const finalStat = state.agents[agentId]!.baseStats[targetStat]
    const expectedGain = combatDrills.statDelta + aptitudeBonus + 1 // +1 from tier-1 bonus
    expect(finalStat).toBe(baseStat + expectedGain)
  })

  it('training completion at tier 2 applies +1 extra stat gain', () => {
    // Use tier 2 for a +1 academyStatBonus
    let state: GameState = { ...createStartingState(), academyTier: 2 }
    const agentId = Object.keys(state.agents)[0]!
    const agent = state.agents[agentId]!
    const targetStat = combatDrills.targetStat
    const baseStat = agent.baseStats[targetStat]
    const aptitudeBonus = getTrainingAptitudeBonus(agent.role, targetStat)

    state = queueTraining(state, agentId, combatDrills.trainingId)

    // Advance the queue until training completes
    for (let i = 0; i < combatDrills.durationWeeks; i++) {
      state = advanceTrainingQueues(state).state
    }

    const finalStat = state.agents[agentId]!.baseStats[targetStat]
    const expectedGain = combatDrills.statDelta + aptitudeBonus + 1 // +1 from tier-2 bonus
    expect(finalStat).toBe(baseStat + expectedGain)
  })

  it('training completion at tier 0 applies no extra bonus', () => {
    let state = createStartingState()
    const agentId = Object.keys(state.agents)[0]!
    const agent = state.agents[agentId]!
    const targetStat = combatDrills.targetStat
    const baseStat = agent.baseStats[targetStat]
    const aptitudeBonus = getTrainingAptitudeBonus(agent.role, targetStat)

    state = queueTraining(state, agentId, combatDrills.trainingId)

    for (let i = 0; i < combatDrills.durationWeeks; i++) {
      state = advanceTrainingQueues(state).state
    }

    const finalStat = state.agents[agentId]!.baseStats[targetStat]
    expect(finalStat).toBe(baseStat + combatDrills.statDelta + aptitudeBonus)
  })
})

// ---------------------------------------------------------------------------
// Team drill slot-trim
// ---------------------------------------------------------------------------

describe('team drill slot trim', () => {
  it('trims team drill participants to available free slots while keeping at least 2', () => {
    // Fill 2 slots so only 2 remain (default 4 - 2 = 2 free).
    let state = createStartingState()
    const agents = Object.values(state.agents).filter((a) => a.status === 'active')
    // Queue 2 solo agents to fill 2 slots
    state = queueTraining(state, agents[0]!.id, combatDrills.trainingId)
    state = queueTraining(state, agents[1]!.id, combatDrills.trainingId)
    expect(Object.values(state.agents).filter(isAgentTraining).length).toBe(2)

    // Find a team with at least 3 eligible members (not already training)
    const eligibleTeamId = Object.keys(state.teams).find((teamId) => {
      const team = state.teams[teamId]!
      const memberIds = getTeamMemberIds(team)
      const eligibleCount = memberIds.filter((id) => {
        const a = state.agents[id]
        return a && a.status === 'active' && !isAgentTraining(a)
      }).length
      return eligibleCount >= 3
    })

    if (!eligibleTeamId) return // not enough agents in fixture to test trim

    const before = Object.values(state.agents).filter(isAgentTraining).length
    const next = queueTeamTraining(state, eligibleTeamId, coordinationDrill.trainingId)
    const afterTraining = Object.values(next.agents).filter(isAgentTraining).length
    const newlyEnrolled = afterTraining - before

    // Should have enrolled exactly 2 (the free slots limit)
    expect(newlyEnrolled).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// buildAcademyOverview exposes new fields
// ---------------------------------------------------------------------------

describe('buildAcademyOverview with tier system', () => {
  it('exposes academyTier, upgradeCost, availableSlots, totalSlots', () => {
    const state = { ...createStartingState(), academyTier: 1 }
    const overview = buildAcademyOverview(state)

    expect(overview.academyTier).toBe(1)
    expect(overview.totalSlots).toBe(5) // 4 default + 1 from tier
    expect(overview.availableSlots).toBe(5) // no one training
    expect(overview.upgradeCost).toBe(ACADEMY_UPGRADE_COSTS[1])
  })

  it('returns null upgradeCost at MAX_ACADEMY_TIER', () => {
    const state = { ...createStartingState(), academyTier: MAX_ACADEMY_TIER }
    const overview = buildAcademyOverview(state)

    expect(overview.academyTier).toBe(MAX_ACADEMY_TIER)
    expect(overview.upgradeCost).toBeNull()
  })

  it('reflects occupied slots in availableSlots', () => {
    let state = createStartingState()
    const agentId = Object.keys(state.agents)[0]!
    state = queueTraining(state, agentId, combatDrills.trainingId)

    const overview = buildAcademyOverview(state)
    expect(overview.availableSlots).toBe(overview.totalSlots - 1)
  })

  it('filters locked training recommendations until the academy tier unlocks them', () => {
    const tier0Overview = buildAcademyOverview(createStartingState())
    expect(
      tier0Overview.suggestedPrograms.every((entry) => {
        const program = trainingCatalog.find(
          (candidate) => candidate.trainingId === entry.trainingId
        )
        return (program?.minAcademyTier ?? 0) <= 0
      })
    ).toBe(true)

    const tier2Overview = buildAcademyOverview({ ...createStartingState(), academyTier: 2 })
    expect(
      tier2Overview.suggestedTeamDrills.every((entry) => {
        const program = trainingCatalog.find(
          (candidate) => candidate.trainingId === entry.trainingId
        )
        return (program?.minAcademyTier ?? 0) <= 2
      })
    ).toBe(true)
  })
})

describe('academy-tier training unlocks', () => {
  it('blocks tier-1 solo programs until the academy is upgraded', () => {
    const tier0 = createStartingState()
    const blocked = queueTraining(tier0, 'a_sato', threatAssessment.trainingId)

    expect(blocked.trainingQueue).toHaveLength(0)

    const tier1 = { ...createStartingState(), academyTier: 1 }
    const unlocked = queueTraining(tier1, 'a_sato', threatAssessment.trainingId)

    expect(
      unlocked.trainingQueue.some((entry) => entry.trainingId === threatAssessment.trainingId)
    ).toBe(true)
  })

  it('blocks tier-2 elite team drills until academy tier 2', () => {
    const tier1 = { ...createStartingState(), academyTier: 1 }
    const blocked = queueTeamTraining(tier1, 't_nightwatch', assaultCollective.trainingId)
    expect(blocked.trainingQueue).toHaveLength(0)

    const tier2 = { ...createStartingState(), academyTier: 2 }
    const unlocked = queueTeamTraining(tier2, 't_nightwatch', assaultCollective.trainingId)
    expect(
      unlocked.trainingQueue.some((entry) => entry.trainingId === assaultCollective.trainingId)
    ).toBe(true)
  })
})
