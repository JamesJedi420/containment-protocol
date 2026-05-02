/**
 * SPE-130 Phase 1 — targeted tests for three-channel fatigue accumulation,
 * differentiated recovery, and deployment-readiness consumption.
 *
 * SPE-130 Phase 2 — mission resolution as second downstream consumer:
 *   combatStress bypasses flat fatigue injury gate; elevated combatStress
 *   forces moderate severity independently of flat fatigue.
 *
 * Out of scope (later slices): overdrive, lockout, transit vulnerability,
 *   capability-use overtesting.
 */
import { describe, it, expect } from 'vitest'
import {
  OVERDRIVE_ACTIVATION_COMBAT_STRESS_THRESHOLD,
  TRANSIT_VULNERABILITY_MENTAL_THRESHOLD,
  TRANSIT_VULNERABILITY_PHYSICAL_THRESHOLD,
  accumulateFatigueChannels,
  activateAgentOverdrive,
  applyOverdriveRecoveryDebtTick,
  applyChannelDifferentiatedRecovery,
  canActivateAgentOverdrive,
  createDefaultFatigueChannels,
  createDefaultOverdriveState,
  deriveFatigueChannelPenalties,
  expireAgentOverdrive,
  isTransitAmbushVulnerable,
  resetCapabilityUsesPhaseCounter,
  PHYSICAL_READINESS_THRESHOLD,
  MENTAL_CONCENTRATION_THRESHOLD,
  COMBAT_STRESS_PENALTY_THRESHOLD,
} from '../domain/agentFatigueChannels'
import { applyWeeklyAgentFatigue } from '../domain/sim/fatiguePipeline'
import { applyMissionResolutionAgentMutations } from '../domain/sim/missionResolutionAgents'
import { createStartingState } from '../data/startingState'
import type { AgentFatigueChannels } from '../domain/agent/models'
import type { GameState, ResolutionOutcome } from '../domain/models'

// ── Helpers ────────────────────────────────────────────────────────────────

function channels(
  partial: Partial<AgentFatigueChannels> = {}
): AgentFatigueChannels {
  return { ...createDefaultFatigueChannels(), ...partial }
}

// ── 1. Deterministic accumulation ─────────────────────────────────────────

describe('accumulateFatigueChannels — deterministic accumulation', () => {
  it('mission_deployment raises physical and mental, leaves combatStress unchanged', () => {
    const result = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'mission_deployment' }
    )
    expect(result.physicalExhaustion).toBeGreaterThan(0)
    expect(result.mentalExhaustion).toBeGreaterThan(0)
    expect(result.combatStress).toBe(0)
  })

  it('mission_deployment scales with physicalIntensity', () => {
    const base = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'mission_deployment', physicalIntensity: 1 }
    )
    const high = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'mission_deployment', physicalIntensity: 2 }
    )
    expect(high.physicalExhaustion).toBeGreaterThan(base.physicalExhaustion)
  })

  it('combat_encounter raises combatStress and physical, leaves mental unchanged', () => {
    const result = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'combat_encounter' }
    )
    expect(result.combatStress).toBeGreaterThan(0)
    expect(result.physicalExhaustion).toBeGreaterThan(0)
    expect(result.mentalExhaustion).toBe(0)
  })

  it('combat_encounter scales with combatIntensity', () => {
    const base = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'combat_encounter', combatIntensity: 1 }
    )
    const high = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'combat_encounter', combatIntensity: 2 }
    )
    expect(high.combatStress).toBeGreaterThan(base.combatStress)
  })

  it('training raises physical and mental only; combatStress stays 0', () => {
    const result = accumulateFatigueChannels(
      createDefaultFatigueChannels(),
      { type: 'training' }
    )
    expect(result.physicalExhaustion).toBeGreaterThan(0)
    expect(result.mentalExhaustion).toBeGreaterThan(0)
    expect(result.combatStress).toBe(0)
  })

  it('idle leaves all channels unchanged', () => {
    const start = channels({ physicalExhaustion: 20, mentalExhaustion: 15, combatStress: 10 })
    const result = accumulateFatigueChannels(start, { type: 'idle' })
    expect(result).toEqual(start)
  })

  it('channels are clamped at 100', () => {
    const start = channels({ physicalExhaustion: 98, mentalExhaustion: 98, combatStress: 98 })
    const result = accumulateFatigueChannels(start, { type: 'mission_deployment', physicalIntensity: 5 })
    expect(result.physicalExhaustion).toBe(100)
    expect(result.mentalExhaustion).toBe(100)
  })
})

// ── 2. Differentiated recovery ────────────────────────────────────────────

describe('applyChannelDifferentiatedRecovery — activity asymmetry', () => {
  it('rest reduces physical more than therapy does', () => {
    const start = channels({ physicalExhaustion: 60 })
    const afterRest = applyChannelDifferentiatedRecovery(start, 'rest')
    const afterTherapy = applyChannelDifferentiatedRecovery(start, 'therapy')
    expect(afterRest.physicalExhaustion).toBeLessThan(afterTherapy.physicalExhaustion)
  })

  it('therapy reduces combatStress more than rest does', () => {
    const start = channels({ combatStress: 60 })
    const afterTherapy = applyChannelDifferentiatedRecovery(start, 'therapy')
    const afterRest = applyChannelDifferentiatedRecovery(start, 'rest')
    expect(afterTherapy.combatStress).toBeLessThan(afterRest.combatStress)
  })

  it('therapy reduces mentalExhaustion more than rest does', () => {
    const start = channels({ mentalExhaustion: 60 })
    const afterTherapy = applyChannelDifferentiatedRecovery(start, 'therapy')
    const afterRest = applyChannelDifferentiatedRecovery(start, 'rest')
    expect(afterTherapy.mentalExhaustion).toBeLessThan(afterRest.mentalExhaustion)
  })

  it('medical reduces physical significantly and leaves mental unchanged', () => {
    const start = channels({ physicalExhaustion: 60, mentalExhaustion: 30 })
    const result = applyChannelDifferentiatedRecovery(start, 'medical')
    expect(result.physicalExhaustion).toBeLessThan(start.physicalExhaustion)
    expect(result.mentalExhaustion).toBe(start.mentalExhaustion)
  })

  it('recovery never drives channels below 0', () => {
    const start = channels({ physicalExhaustion: 2, mentalExhaustion: 1, combatStress: 2 })
    const result = applyChannelDifferentiatedRecovery(start, 'therapy')
    expect(result.physicalExhaustion).toBeGreaterThanOrEqual(0)
    expect(result.mentalExhaustion).toBeGreaterThanOrEqual(0)
    expect(result.combatStress).toBeGreaterThanOrEqual(0)
  })
})

// ── 3. Channel-differentiated downstream penalties ────────────────────────

describe('deriveFatigueChannelPenalties — channel-differentiated effects', () => {
  it('returns zero penalties when all channels are below thresholds', () => {
    const result = deriveFatigueChannelPenalties(
      channels({
        physicalExhaustion: PHYSICAL_READINESS_THRESHOLD - 1,
        mentalExhaustion: MENTAL_CONCENTRATION_THRESHOLD - 1,
        combatStress: COMBAT_STRESS_PENALTY_THRESHOLD - 1,
      })
    )
    expect(result.readinessPenalty).toBe(0)
    expect(result.concentrationPenalty).toBe(0)
    expect(result.combatPenalty).toBe(0)
  })

  it('physicalExhaustion at threshold triggers readinessPenalty only', () => {
    const result = deriveFatigueChannelPenalties(
      channels({ physicalExhaustion: PHYSICAL_READINESS_THRESHOLD })
    )
    expect(result.readinessPenalty).toBeGreaterThan(0)
    expect(result.concentrationPenalty).toBe(0)
    expect(result.combatPenalty).toBe(0)
  })

  it('mentalExhaustion at threshold triggers concentrationPenalty only', () => {
    const result = deriveFatigueChannelPenalties(
      channels({ mentalExhaustion: MENTAL_CONCENTRATION_THRESHOLD })
    )
    expect(result.concentrationPenalty).toBeGreaterThan(0)
    expect(result.readinessPenalty).toBe(0)
    expect(result.combatPenalty).toBe(0)
  })

  it('combatStress at threshold triggers combatPenalty only', () => {
    const result = deriveFatigueChannelPenalties(
      channels({ combatStress: COMBAT_STRESS_PENALTY_THRESHOLD })
    )
    expect(result.combatPenalty).toBeGreaterThan(0)
    expect(result.readinessPenalty).toBe(0)
    expect(result.concentrationPenalty).toBe(0)
  })

  it('penalties increase proportionally as channels rise', () => {
    const low = deriveFatigueChannelPenalties(channels({ physicalExhaustion: PHYSICAL_READINESS_THRESHOLD }))
    const high = deriveFatigueChannelPenalties(channels({ physicalExhaustion: 90 }))
    expect(high.readinessPenalty).toBeGreaterThan(low.readinessPenalty)
  })
})

// ── 4. fatiguePipeline weekly tick integration ────────────────────────────

describe('applyWeeklyAgentFatigue — channel wiring', () => {
  const baseConfig: GameState['config'] = {
    durationModel: 'standard',
    attritionPerWeek: 10,
    difficulty: 'normal',
    startingFunds: 1000,
    startingAgentCount: 3,
    researchSlots: 2,
    supportBudget: 0,
    missionSuccessRate: 0.7,
    maxActiveTeams: 2,
  }

  const makeAgent = (id: string, fatigueChannels?: AgentFatigueChannels) => ({
    id,
    name: `Agent ${id}`,
    role: 'field' as const,
    baseStats: { combat: 5, investigation: 5, utility: 5, social: 5 },
    tags: [],
    relationships: {},
    fatigue: 0,
    status: 'active' as const,
    ...(fatigueChannels !== undefined ? { fatigueChannels } : {}),
  })

  it('active agent accumulates channels after a weekly tick', () => {
    const agent = makeAgent('a1')
    const team = { id: 't1', memberIds: ['a1'], agentIds: ['a1'] }

    const result = applyWeeklyAgentFatigue({
      agents: { a1: agent },
      teams: { t1: team },
      config: baseConfig,
      activeTeamIds: ['t1'],
    })

    const updated = result['a1']
    expect(updated.fatigueChannels).toBeDefined()
    expect(updated.fatigueChannels!.physicalExhaustion).toBeGreaterThan(0)
    expect(updated.fatigueChannels!.mentalExhaustion).toBeGreaterThan(0)
  })

  it('idle agent channels decrease (rest recovery) after a weekly tick', () => {
    const agent = makeAgent('a2', channels({ physicalExhaustion: 40, mentalExhaustion: 20, combatStress: 10 }))

    const result = applyWeeklyAgentFatigue({
      agents: { a2: agent },
      teams: {},
      config: baseConfig,
      activeTeamIds: [],
    })

    const updated = result['a2']
    expect(updated.fatigueChannels!.physicalExhaustion).toBeLessThan(40)
  })

  it('agent with no prior fatigueChannels gets channels initialised on first tick', () => {
    const agent = makeAgent('a3') // no fatigueChannels field

    const result = applyWeeklyAgentFatigue({
      agents: { a3: agent },
      teams: {},
      config: baseConfig,
      activeTeamIds: [],
    })

    expect(result['a3'].fatigueChannels).toBeDefined()
  })

  it('existing flat fatigue field is still updated alongside channels', () => {
    const agent = makeAgent('a4')
    const team = { id: 't1', memberIds: ['a4'], agentIds: ['a4'] }

    const result = applyWeeklyAgentFatigue({
      agents: { a4: agent },
      teams: { t1: team },
      config: baseConfig,
      activeTeamIds: ['t1'],
    })

    expect(result['a4'].fatigue).toBeGreaterThan(0)
  })
})

// ── 5. Mission resolution — second downstream consumer ────────────────────

describe('SPE-130 Phase 2 — combatStress drives mission-resolution injury path differently', () => {
  function makeOutcome(overrides: Partial<ResolutionOutcome> = {}): ResolutionOutcome {
    return {
      caseId: 'case-001',
      mode: 'threshold',
      kind: 'case',
      delta: -10,
      result: 'fail',
      reasons: ['test-outcome'],
      ...overrides,
    }
  }

  it('agent with low flat fatigue but high combatStress is injured on failure (gate bypass)', () => {
    // Without combatStress the flat gate (fatigue < 45) would suppress injury entirely.
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 10, // well below INJURY_RISK_FATIGUE_MIN = 45
      status: 'active' as const,
      fatigueChannels: { physicalExhaustion: 0, mentalExhaustion: 0, combatStress: 60 }, // >= 55 threshold
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, ...Object.fromEntries(assignedAgents.map((a) => [a.id, a])) },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: { ...state.cases['case-001'], stage: 1, assignedTeamIds: ['t_nightwatch'] },
      outcome: makeOutcome(),
      week: state.week,
      rng: () => 0, // always triggers injury roll
    })

    // At least one agent should be injured despite low flat fatigue.
    expect(result.missionInjuries.length).toBeGreaterThan(0)
  })

  it('agent with low flat fatigue and low combatStress is NOT injured on failure (gate holds)', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: { physicalExhaustion: 0, mentalExhaustion: 0, combatStress: 10 }, // below 55
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, ...Object.fromEntries(assignedAgents.map((a) => [a.id, a])) },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: { ...state.cases['case-001'], stage: 1, assignedTeamIds: ['t_nightwatch'] },
      outcome: makeOutcome(),
      week: state.week,
      rng: () => 0.99, // very unlikely injury roll
    })

    expect(result.missionInjuries).toHaveLength(0)
  })

  it('elevated combatStress forces moderate severity independently of flat fatigue', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    // Flat fatigue below 70 so the old path alone would yield 'minor'.
    // combatStress >= 70 should force 'moderate'.
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 50, // above INJURY_RISK_FATIGUE_MIN, below 70
      status: 'active' as const,
      fatigueChannels: { physicalExhaustion: 0, mentalExhaustion: 0, combatStress: 75 }, // >= 70 threshold
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, ...Object.fromEntries(assignedAgents.map((a) => [a.id, a])) },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: { ...state.cases['case-001'], stage: 1, assignedTeamIds: ['t_nightwatch'] },
      outcome: makeOutcome(),
      week: state.week,
      rng: () => 0, // always triggers injury, picks minimum severity path
    })

    const injuries = result.missionInjuries
    expect(injuries.length).toBeGreaterThan(0)
    expect(injuries.every((inj) => inj.severity === 'moderate')).toBe(true)
  })

  it('physicalExhaustion alone does not affect the injury gate (channels react differently)', () => {
    // This confirms channels are differentiated: physicalExhaustion above the
    // readiness threshold does NOT bypass the injury gate — only combatStress does.
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: { physicalExhaustion: 80, mentalExhaustion: 0, combatStress: 0 }, // high physical, zero combat
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, ...Object.fromEntries(assignedAgents.map((a) => [a.id, a])) },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: { ...state.cases['case-001'], stage: 1, assignedTeamIds: ['t_nightwatch'] },
      outcome: makeOutcome(),
      week: state.week,
      rng: () => 0.99,
    })

    // Gate should hold — physicalExhaustion alone doesn't bypass it.
    expect(result.missionInjuries).toHaveLength(0)
  })
})

describe('SPE-130 Phase 3 — capability-use overtesting and counter reset', () => {
  it('capability_use increments counter; no strain below threshold', () => {
    const start = channels({ capabilityUsesThisPhase: 0 })
    const after1 = accumulateFatigueChannels(start, { type: 'capability_use' })

    expect(after1.capabilityUsesThisPhase).toBe(1)
    expect(after1.physicalExhaustion).toBe(0)
    expect(after1.mentalExhaustion).toBe(0)
  })

  it('capability_use at counter 1 applies no strain (below threshold)', () => {
    const start = channels({ capabilityUsesThisPhase: 1, physicalExhaustion: 10, mentalExhaustion: 15 })
    const after = accumulateFatigueChannels(start, { type: 'capability_use' })

    expect(after.capabilityUsesThisPhase).toBe(2)
    // Counter reached 2, still below threshold 3, no strain.
    expect(after.physicalExhaustion).toBe(10)
    expect(after.mentalExhaustion).toBe(15)
  })

  it('capability_use applies strain when counter >= threshold', () => {
    const start = channels({ capabilityUsesThisPhase: 2, physicalExhaustion: 10, mentalExhaustion: 15 })
    const after = accumulateFatigueChannels(start, { type: 'capability_use' })

    expect(after.capabilityUsesThisPhase).toBe(3)
    // Counter reached 3, so threshold crossed and strain applied.
    expect(after.physicalExhaustion).toBe(10 + 5) // +5 physical strain
    expect(after.mentalExhaustion).toBe(15 + 8) // +8 mental strain
  })

  it('capability_use at counter 4+ continues applying strain', () => {
    const start = channels({ capabilityUsesThisPhase: 4, physicalExhaustion: 20, mentalExhaustion: 30 })
    const after = accumulateFatigueChannels(start, { type: 'capability_use' })

    expect(after.capabilityUsesThisPhase).toBe(5)
    // Still above threshold, so strain applies.
    expect(after.physicalExhaustion).toBe(20 + 5)
    expect(after.mentalExhaustion).toBe(30 + 8)
  })

  it('weekly tick resets capability use counter to 0', () => {
    const start = channels({ capabilityUsesThisPhase: 5 })
    const reset = resetCapabilityUsesPhaseCounter(start)

    expect(reset.capabilityUsesThisPhase).toBe(0)
    // Other channels unchanged.
    expect(reset.physicalExhaustion).toBe(start.physicalExhaustion)
    expect(reset.mentalExhaustion).toBe(start.mentalExhaustion)
    expect(reset.combatStress).toBe(start.combatStress)
  })

  it('mission_deployment preserves capability use counter', () => {
    const start = channels({ capabilityUsesThisPhase: 3 })
    const after = accumulateFatigueChannels(start, { type: 'mission_deployment' })

    expect(after.capabilityUsesThisPhase).toBe(3) // preserved, not reset or incremented
    expect(after.physicalExhaustion).toBeGreaterThan(0) // mission still accumulates
    expect(after.mentalExhaustion).toBeGreaterThan(0)
  })

  it('training preserves capability use counter', () => {
    const start = channels({ capabilityUsesThisPhase: 3 })
    const after = accumulateFatigueChannels(start, { type: 'training' })

    expect(after.capabilityUsesThisPhase).toBe(3)
    expect(after.physicalExhaustion).toBeGreaterThan(0)
    expect(after.mentalExhaustion).toBeGreaterThan(0)
  })

  it('combat_encounter preserves capability use counter', () => {
    const start = channels({ capabilityUsesThisPhase: 3 })
    const after = accumulateFatigueChannels(start, { type: 'combat_encounter' })

    expect(after.capabilityUsesThisPhase).toBe(3)
    expect(after.combatStress).toBeGreaterThan(0)
  })
})

describe('SPE-130 Phase 4 — bounded overdrive helpers and debt aftermath', () => {
  it('activates overdrive only when not active and debt-free', () => {
    const base = createDefaultOverdriveState()
    expect(canActivateAgentOverdrive(base)).toBe(true)

    const active = activateAgentOverdrive(base)
    expect(active.active).toBe(true)
    expect(active.remainingPhases).toBe(1)
    expect(active.recoveryDebt).toBe(2)

    expect(canActivateAgentOverdrive(active)).toBe(false)
  })

  it('expires overdrive phase and preserves debt for aftermath', () => {
    const active = activateAgentOverdrive(createDefaultOverdriveState())
    const expired = expireAgentOverdrive(active)

    expect(expired.active).toBe(false)
    expect(expired.remainingPhases).toBe(0)
    expect(expired.recoveryDebt).toBe(active.recoveryDebt)
  })

  it('applies deterministic debt strain and decrements debt each weekly tick', () => {
    const overdrive = { active: false, remainingPhases: 0, recoveryDebt: 2 }
    const input = channels({ physicalExhaustion: 10, mentalExhaustion: 20, combatStress: 30 })

    const tick1 = applyOverdriveRecoveryDebtTick({ channels: input, overdrive })
    expect(tick1.channels.physicalExhaustion).toBe(16)
    expect(tick1.channels.mentalExhaustion).toBe(26)
    expect(tick1.channels.combatStress).toBe(32)
    expect(tick1.overdrive.recoveryDebt).toBe(1)

    const tick2 = applyOverdriveRecoveryDebtTick(tick1)
    expect(tick2.overdrive.recoveryDebt).toBe(0)

    const tick3 = applyOverdriveRecoveryDebtTick(tick2)
    // No more debt, no further strain.
    expect(tick3.channels).toEqual(tick2.channels)
    expect(tick3.overdrive.recoveryDebt).toBe(0)
  })

  it('activation threshold remains bounded and explicit for mission consumer', () => {
    expect(OVERDRIVE_ACTIVATION_COMBAT_STRESS_THRESHOLD).toBeGreaterThanOrEqual(50)
    expect(OVERDRIVE_ACTIVATION_COMBAT_STRESS_THRESHOLD).toBeLessThanOrEqual(90)
  })
})

describe('SPE-130 Phase 5 — bounded transit vulnerability window helper', () => {
  it('returns true only when fatigue + solitude + routine return path are all present', () => {
    const vulnerable = isTransitAmbushVulnerable({
      channels: channels({
        physicalExhaustion: TRANSIT_VULNERABILITY_PHYSICAL_THRESHOLD,
        mentalExhaustion: TRANSIT_VULNERABILITY_MENTAL_THRESHOLD,
      }),
      isSoloTransit: true,
      onRoutineReturnPath: true,
    })

    expect(vulnerable).toBe(true)
  })

  it('returns false when not solo, even if fatigue thresholds are met', () => {
    const notSolo = isTransitAmbushVulnerable({
      channels: channels({
        physicalExhaustion: TRANSIT_VULNERABILITY_PHYSICAL_THRESHOLD,
        mentalExhaustion: TRANSIT_VULNERABILITY_MENTAL_THRESHOLD,
      }),
      isSoloTransit: false,
      onRoutineReturnPath: true,
    })

    expect(notSolo).toBe(false)
  })

  it('returns false when return path condition is not active', () => {
    const noReturnWindow = isTransitAmbushVulnerable({
      channels: channels({
        physicalExhaustion: TRANSIT_VULNERABILITY_PHYSICAL_THRESHOLD,
        mentalExhaustion: TRANSIT_VULNERABILITY_MENTAL_THRESHOLD,
      }),
      isSoloTransit: true,
      onRoutineReturnPath: false,
    })

    expect(noReturnWindow).toBe(false)
  })
})
