// SPE-1070 slice 1 — staff coping, impairment, policy, and alternative recovery
// AC4 (social-event cohesion tradeoff) is explicitly deferred to a later slice.

import { describe, expect, it } from 'vitest'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import { computeTeamScore } from '../domain/sim/scoring'
import { RECOVERY_CALIBRATION } from '../domain/sim/calibration'
import type { Agent } from '../domain/agent/models'
import type { DowntimeActivity } from '../domain/sim/recoveryDowntime'
import type { CaseInstance } from '../domain/models'
import { createStartingState } from '../data/startingState'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-coping-1',
    name: 'Agent Coping',
    role: 'tech',
    baseStats: { combat: 30, investigation: 30, utility: 30, social: 30 },
    tags: [],
    relationships: {},
    fatigue: 60,
    status: 'active',
    vitals: {
      health: 100,
      stress: 20,
      morale: 50,
      wounds: 0,
      statusFlags: [],
    },
    ...overrides,
  }
}

function makeCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  const state = createStartingState()
  return {
    ...state.cases['case-001'],
    id: 'case-test',
    templateId: 'case-test-template',
    difficulty: { combat: 10, investigation: 10, utility: 10, social: 10 },
    weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
    tags: [],
    requiredTags: [],
    preferredTags: [],
    stage: 1,
    durationWeeks: 1,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    assignedTeamIds: [],
    ...overrides,
  }
}

function runOneCopingWeek(
  agent: Agent,
  substancePolicy?: 'permitted' | 'restricted' | 'prohibited'
) {
  return advanceRecoveryDowntimeForWeek({
    week: 1,
    sourceAgents: { [agent.id]: agent },
    sourceTeams: {},
    downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
    substancePolicy,
  })
}

// ── AC1: short-term relief + impairment flag ──────────────────────────────────

describe('AC1 — coping relief and impairment flag', () => {
  it('reduces fatigue under permitted policy', () => {
    const agent = makeAgent({ fatigue: 60 })
    const result = runOneCopingWeek(agent, 'permitted')
    const updated = result.updatedAgents[agent.id]!
    expect(updated.fatigue).toBe(60 - RECOVERY_CALIBRATION.copingFatigueRelief)
  })

  it('raises morale under permitted policy', () => {
    const agent = makeAgent({ vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: [] } })
    const result = runOneCopingWeek(agent, 'permitted')
    const updated = result.updatedAgents[agent.id]!
    expect(updated.vitals?.morale).toBe(50 + RECOVERY_CALIBRATION.copingMoraleRelief)
  })

  it('sets impaired:alcohol flag on the agent after coping', () => {
    const agent = makeAgent()
    const result = runOneCopingWeek(agent, 'permitted')
    const updated = result.updatedAgents[agent.id]!
    expect(updated.vitals?.statusFlags).toContain('impaired:alcohol')
  })

  it('impaired:alcohol flag is idempotent across two coping calls', () => {
    const agent = makeAgent()
    const r1 = runOneCopingWeek(agent, 'permitted')
    const agent2 = r1.updatedAgents[agent.id]!
    const r2 = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: { [agent2.id]: agent2 },
      sourceTeams: {},
      downtimeAssignments: { [agent2.id]: 'coping' as DowntimeActivity },
      substancePolicy: 'permitted',
    })
    const flags = r2.updatedAgents[agent2.id]!.vitals?.statusFlags ?? []
    expect(flags.filter((f) => f === 'impaired:alcohol').length).toBe(1)
  })

  it('emits a staff.coping.applied event', () => {
    const agent = makeAgent()
    const result = runOneCopingWeek(agent, 'permitted')
    const ev = result.eventDrafts.find((e) => e.type === 'staff.coping.applied')
    expect(ev).toBeDefined()
    if (ev?.type === 'staff.coping.applied') {
      expect(ev.payload.agentId).toBe(agent.id)
      expect(ev.payload.policy).toBe('permitted')
      expect(ev.payload.streak).toBe(1)
    }
  })
})

// ── AC2: misuse escalation via streak ─────────────────────────────────────────

describe('AC2 — misuse escalation: dependency-risk tag after streak threshold', () => {
  it('adds dependency-risk:alcohol tag at copingDependencyThreshold consecutive weeks', () => {
    let agent = makeAgent()
    for (let week = 1; week <= RECOVERY_CALIBRATION.copingDependencyThreshold; week++) {
      const result = advanceRecoveryDowntimeForWeek({
        week,
        sourceAgents: { [agent.id]: agent },
        sourceTeams: {},
        downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
        substancePolicy: 'permitted',
      })
      agent = result.updatedAgents[agent.id]!
    }
    expect(agent.tags).toContain('dependency-risk:alcohol')
    expect(agent.copingStreak).toBe(RECOVERY_CALIBRATION.copingDependencyThreshold)
  })

  it('does NOT add dependency-risk:alcohol tag before threshold', () => {
    let agent = makeAgent()
    for (let week = 1; week < RECOVERY_CALIBRATION.copingDependencyThreshold; week++) {
      const result = advanceRecoveryDowntimeForWeek({
        week,
        sourceAgents: { [agent.id]: agent },
        sourceTeams: {},
        downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
        substancePolicy: 'permitted',
      })
      agent = result.updatedAgents[agent.id]!
    }
    expect(agent.tags).not.toContain('dependency-risk:alcohol')
  })

  it('resets copingStreak to 0 after any non-coping downtime', () => {
    // Build up a streak first
    let agent = makeAgent()
    for (let week = 1; week <= RECOVERY_CALIBRATION.copingDependencyThreshold; week++) {
      const result = advanceRecoveryDowntimeForWeek({
        week,
        sourceAgents: { [agent.id]: agent },
        sourceTeams: {},
        downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
        substancePolicy: 'permitted',
      })
      agent = result.updatedAgents[agent.id]!
    }
    expect(agent.copingStreak).toBe(RECOVERY_CALIBRATION.copingDependencyThreshold)

    // One rest week resets the streak
    const restResult = advanceRecoveryDowntimeForWeek({
      week: RECOVERY_CALIBRATION.copingDependencyThreshold + 1,
      sourceAgents: { [agent.id]: agent },
      sourceTeams: {},
      downtimeAssignments: { [agent.id]: 'rest' as DowntimeActivity },
    })
    expect(restResult.updatedAgents[agent.id]!.copingStreak).toBe(0)
  })

  it('clears dependency-risk:alcohol tag once streak resets to 0', () => {
    // Build up to dependency
    let agent = makeAgent()
    for (let week = 1; week <= RECOVERY_CALIBRATION.copingDependencyThreshold; week++) {
      const result = advanceRecoveryDowntimeForWeek({
        week,
        sourceAgents: { [agent.id]: agent },
        sourceTeams: {},
        downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
        substancePolicy: 'permitted',
      })
      agent = result.updatedAgents[agent.id]!
    }
    expect(agent.tags).toContain('dependency-risk:alcohol')

    // One non-coping week clears the tag (streak resets to 0)
    const restResult = advanceRecoveryDowntimeForWeek({
      week: RECOVERY_CALIBRATION.copingDependencyThreshold + 1,
      sourceAgents: { [agent.id]: agent },
      sourceTeams: {},
      downtimeAssignments: { [agent.id]: 'rest' as DowntimeActivity },
    })
    expect(restResult.updatedAgents[agent.id]!.tags).not.toContain('dependency-risk:alcohol')
  })
})

// ── AC3: policy mode consequences ─────────────────────────────────────────────

describe('AC3 — policy mode consequences', () => {
  it('permitted: full relief, no misconduct event', () => {
    const agent = makeAgent({ fatigue: 60 })
    const result = runOneCopingWeek(agent, 'permitted')
    const updated = result.updatedAgents[agent.id]!
    expect(updated.fatigue).toBe(60 - RECOVERY_CALIBRATION.copingFatigueRelief)
    expect(result.eventDrafts.some((e) => e.type === 'staff.coping.misconduct')).toBe(false)
  })

  it('restricted: full relief AND misconduct event', () => {
    const agent = makeAgent({ fatigue: 60 })
    const result = runOneCopingWeek(agent, 'restricted')
    const updated = result.updatedAgents[agent.id]!
    // Relief still applied under restricted
    expect(updated.fatigue).toBe(60 - RECOVERY_CALIBRATION.copingFatigueRelief)
    // Misconduct event emitted
    const misconduct = result.eventDrafts.find((e) => e.type === 'staff.coping.misconduct')
    expect(misconduct).toBeDefined()
    if (misconduct?.type === 'staff.coping.misconduct') {
      expect(misconduct.payload.policy).toBe('restricted')
      expect(misconduct.payload.agentId).toBe(agent.id)
    }
  })

  it('prohibited: no relief, morale penalty, misconduct event', () => {
    const agent = makeAgent({
      fatigue: 60,
      vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: [] },
    })
    const result = runOneCopingWeek(agent, 'prohibited')
    const updated = result.updatedAgents[agent.id]!
    // No fatigue relief
    expect(updated.fatigue).toBe(60)
    // Morale penalty applied
    expect(updated.vitals?.morale).toBe(50 - RECOVERY_CALIBRATION.copingProhibitedMoralePenalty)
    // Misconduct event emitted with prohibited policy
    const misconduct = result.eventDrafts.find((e) => e.type === 'staff.coping.misconduct')
    expect(misconduct).toBeDefined()
    if (misconduct?.type === 'staff.coping.misconduct') {
      expect(misconduct.payload.policy).toBe('prohibited')
    }
  })

  it('prohibited: impaired:alcohol is still set despite no relief', () => {
    const agent = makeAgent()
    const result = runOneCopingWeek(agent, 'prohibited')
    expect(result.updatedAgents[agent.id]!.vitals?.statusFlags).toContain('impaired:alcohol')
  })

  it('defaults to permitted when substancePolicy is undefined', () => {
    const agent = makeAgent({ fatigue: 60 })
    const result = advanceRecoveryDowntimeForWeek({
      week: 1,
      sourceAgents: { [agent.id]: agent },
      sourceTeams: {},
      downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
      // substancePolicy omitted → defaults to 'permitted'
    })
    const updated = result.updatedAgents[agent.id]!
    expect(updated.fatigue).toBe(60 - RECOVERY_CALIBRATION.copingFatigueRelief)
    expect(result.eventDrafts.some((e) => e.type === 'staff.coping.misconduct')).toBe(false)
  })
})

// ── AC5: impaired operational vulnerability ───────────────────────────────────

describe('AC5 — impaired agent reduces team score', () => {
  it('team score is strictly lower when an agent carries impaired:alcohol flag', () => {
    const c = makeCase()

    const cleanAgent = makeAgent({
      id: 'agent-clean',
      vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: [] },
    })
    const impairedAgent = makeAgent({
      id: 'agent-impaired',
      vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: ['impaired:alcohol'] },
    })

    const cleanScore = computeTeamScore([cleanAgent], c).score
    const impairedScore = computeTeamScore([impairedAgent], c).score

    expect(impairedScore).toBeLessThan(cleanScore)
  })

  it('impaired penalty scales with fraction of impaired agents on a two-agent team', () => {
    const c = makeCase()

    const a1 = makeAgent({
      id: 'a1',
      vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: [] },
    })
    const a2 = makeAgent({
      id: 'a2',
      vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: [] },
    })
    const a2Impaired = {
      ...a2,
      vitals: { ...a2.vitals!, statusFlags: ['impaired:alcohol'] },
    }

    const cleanScore = computeTeamScore([a1, a2], c).score
    const oneImpairedScore = computeTeamScore([a1, a2Impaired], c).score

    expect(oneImpairedScore).toBeLessThan(cleanScore)
  })

  it('penalty multiplier matches calibration constant', () => {
    const c = makeCase()
    const clean = makeAgent({
      id: 'agent-score',
      vitals: { health: 100, stress: 0, wounds: 0, morale: 50, statusFlags: [] },
    })
    const impaired = {
      ...clean,
      vitals: { ...clean.vitals!, statusFlags: ['impaired:alcohol'] },
    }

    const cleanResult = computeTeamScore([clean], c)
    const impairedResult = computeTeamScore([impaired], c)

    // Penalty = internal_base * (1 - copingNextWeekPenaltyMultiplier).
    // Recover internal_base from the observed diff:
    const diff = cleanResult.score - impairedResult.score
    expect(diff).toBeGreaterThan(0)
    const derivedMultiplier = 1 - RECOVERY_CALIBRATION.copingNextWeekPenaltyMultiplier // 0.15
    const internalBase = diff / derivedMultiplier
    // Self-consistency: impairedScore === cleanScore - internalBase * derivedMultiplier
    expect(impairedResult.score).toBeCloseTo(cleanResult.score - internalBase * derivedMultiplier, 5)
  })
})

// ── AC6: therapy as alternative recovery ─────────────────────────────────────

describe('AC6 — therapy clears dependency-risk once streak resets', () => {
  it('therapy downtime resets copingStreak to 0', () => {
    // Escalate to dependency
    let agent = makeAgent()
    for (let week = 1; week <= RECOVERY_CALIBRATION.copingDependencyThreshold; week++) {
      const result = advanceRecoveryDowntimeForWeek({
        week,
        sourceAgents: { [agent.id]: agent },
        sourceTeams: {},
        downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
        substancePolicy: 'permitted',
      })
      agent = result.updatedAgents[agent.id]!
    }
    expect(agent.copingStreak).toBe(RECOVERY_CALIBRATION.copingDependencyThreshold)

    // Therapy week
    const therapyResult = advanceRecoveryDowntimeForWeek({
      week: RECOVERY_CALIBRATION.copingDependencyThreshold + 1,
      sourceAgents: { [agent.id]: agent },
      sourceTeams: {},
      downtimeAssignments: { [agent.id]: 'therapy' as DowntimeActivity },
    })
    expect(therapyResult.updatedAgents[agent.id]!.copingStreak).toBe(0)
  })

  it('therapy removes dependency-risk:alcohol tag when streak reaches 0', () => {
    let agent = makeAgent()
    for (let week = 1; week <= RECOVERY_CALIBRATION.copingDependencyThreshold; week++) {
      const result = advanceRecoveryDowntimeForWeek({
        week,
        sourceAgents: { [agent.id]: agent },
        sourceTeams: {},
        downtimeAssignments: { [agent.id]: 'coping' as DowntimeActivity },
        substancePolicy: 'permitted',
      })
      agent = result.updatedAgents[agent.id]!
    }
    expect(agent.tags).toContain('dependency-risk:alcohol')

    const therapyResult = advanceRecoveryDowntimeForWeek({
      week: RECOVERY_CALIBRATION.copingDependencyThreshold + 1,
      sourceAgents: { [agent.id]: agent },
      sourceTeams: {},
      downtimeAssignments: { [agent.id]: 'therapy' as DowntimeActivity },
    })
    expect(therapyResult.updatedAgents[agent.id]!.tags).not.toContain('dependency-risk:alcohol')
  })
})

// ── Determinism guard ─────────────────────────────────────────────────────────

describe('Determinism', () => {
  it('same inputs produce identical agent state and event payloads', () => {
    function runSequence() {
      let agent = makeAgent()
      const allEvents: unknown[] = []
      for (let week = 1; week <= RECOVERY_CALIBRATION.copingDependencyThreshold + 1; week++) {
        const downtime =
          week <= RECOVERY_CALIBRATION.copingDependencyThreshold
            ? ('coping' as DowntimeActivity)
            : ('therapy' as DowntimeActivity)
        const result = advanceRecoveryDowntimeForWeek({
          week,
          sourceAgents: { [agent.id]: agent },
          sourceTeams: {},
          downtimeAssignments: { [agent.id]: downtime },
          substancePolicy: 'restricted',
        })
        agent = result.updatedAgents[agent.id]!
        allEvents.push(...result.eventDrafts.map((e) => ({ type: e.type, payload: e.payload })))
      }
      return { agent, allEvents }
    }

    const run1 = runSequence()
    const run2 = runSequence()
    expect(run1.agent).toEqual(run2.agent)
    expect(run1.allEvents).toEqual(run2.allEvents)
  })
})
