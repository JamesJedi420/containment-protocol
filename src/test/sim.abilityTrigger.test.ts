import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import type { Agent, GameState } from '../domain/models'
import { createStartingState } from '../data/startingState'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'

function makeActiveAbilityAgent(id: string, cooldownRemaining = 0): Agent {
  return createAgent({
    id,
    name: `A. Test ${id}`,
    role: 'tech',
    baseStats: { combat: 40, investigation: 60, utility: 50, social: 30 },
    abilities: [
      {
        id: 'signal-overclock',
        label: 'Signal Overclock',
        type: 'active',
        trigger: 'OnCaseStart',
        cooldown: 3,
        effect: { control: 4, insight: 2 },
      },
    ],
    tags: ['tech'],
    relationships: {},
    fatigue: 0,
    status: 'active',
    abilityState: cooldownRemaining > 0
      ? { 'signal-overclock': { cooldownRemaining } }
      : undefined,
  })
}

function makeTriggeredActiveAbilityAgent(
  id: string,
  trigger:
    | 'OnCaseStart'
    | 'OnResolutionCheck'
    | 'OnExposure'
    | 'OnThreatEncounter'
    | 'OnStressGain'
    | 'OnLongCaseDurationCheck',
  abilityId: string,
  cooldown: number,
  cooldownRemaining = 0
): Agent {
  return createAgent({
    id,
    name: `A. Trigger ${id}`,
    role: 'tech',
    baseStats: { combat: 40, investigation: 60, utility: 50, social: 30 },
    abilities: [
      {
        id: abilityId,
        label: `Ability ${abilityId}`,
        type: 'active',
        trigger,
        cooldown,
        effect: { control: 3, insight: 2 },
      },
    ],
    tags: ['tech'],
    relationships: {},
    fatigue: 0,
    status: 'active',
    abilityState: cooldownRemaining > 0
      ? { [abilityId]: { cooldownRemaining } }
      : undefined,
  })
}

function makeBaseState(): GameState {
  const base = createStartingState()
  base.partyCards = undefined
  base.events = []
  base.reports = []
  base.rngSeed = 42
  base.rngState = 42
  return base
}

function makeResolvingStateWithAbilityAgent(cooldownRemaining = 0): GameState {
  const base = makeBaseState()
  const agent = makeActiveAbilityAgent('t_ability_agent', cooldownRemaining)

  // Replace nightwatch roster with just our ability agent
  base.agents = {
    ...base.agents,
    [agent.id]: agent,
  }
  base.teams['t_nightwatch'] = {
    ...base.teams['t_nightwatch'],
    memberIds: [agent.id],
    agentIds: [agent.id],
    leaderId: agent.id,
  }

  // Assign the team to case-001 and force it to resolve this week
  const assigned = assignTeam(base, 'case-001', 't_nightwatch')
  assigned.cases['case-001'] = {
    ...assigned.cases['case-001'],
    status: 'in_progress',
    weeksRemaining: 1,
    difficulty: { combat: 0, investigation: 60, utility: 20, social: 0 },
    weights: { combat: 0, investigation: 80, utility: 20, social: 0 },
    requiredTags: [],
  }

  return assigned
}

describe('OnCaseStart active ability dispatch', () => {
  it('sets cooldown on agent after OnCaseStart ability fires during resolution', () => {
    const state = makeResolvingStateWithAbilityAgent(0)
    const next = advanceWeek(state)

    const agent = next.agents['t_ability_agent']
    expect(agent).toBeDefined()
    // After resolution, the ability should have been marked as used with cooldown=3
    const abilityState = agent?.abilityState?.['signal-overclock']
    expect(abilityState).toBeDefined()
    expect(abilityState?.cooldownRemaining).toBe(3)
    expect(abilityState?.lastUsedWeek).toBe(1)
  })

  it('does not fire OnCaseStart ability when cooldown > 0 after weekly decrement', () => {
    // Cooldown starts at 2; after weekly decrement it becomes 1 (still > 0)
    const state = makeResolvingStateWithAbilityAgent(2)
    const next = advanceWeek(state)

    const agent = next.agents['t_ability_agent']
    const abilityState = agent?.abilityState?.['signal-overclock']
    // Cooldown was 2 → decremented to 1 → ability did NOT fire this week
    expect(abilityState?.cooldownRemaining).toBe(1)
    expect(abilityState?.lastUsedWeek).toBeUndefined()
  })

  it('decrements all agent ability cooldowns once per week regardless of case activity', () => {
    // Agent not on any case — cooldown still ticks down
    const base = makeBaseState()
    const agent = makeActiveAbilityAgent('t_ability_agent', 3)
    base.agents = { ...base.agents, [agent.id]: agent }
    // Ensure all cases are resolved so agent team is idle
    for (const caseId of Object.keys(base.cases)) {
      base.cases[caseId] = {
        ...base.cases[caseId],
        status: 'resolved',
        assignedTeamIds: [],
        weeksRemaining: 0,
      }
    }

    const next = advanceWeek(base)

    const nextAgent = next.agents['t_ability_agent']
    const abilityState = nextAgent?.abilityState?.['signal-overclock']
    // Cooldown 3 → 2 after weekly tick, no firing
    expect(abilityState?.cooldownRemaining).toBe(2)
    expect(abilityState?.lastUsedWeek).toBeUndefined()
  })
})

describe('expanded active trigger emission', () => {
  it('sets cooldown for OnResolutionCheck active abilities during weekly resolution', () => {
    const base = makeBaseState()
    const agent = makeTriggeredActiveAbilityAgent(
      't_resolution_trigger_agent',
      'OnResolutionCheck',
      'resolution-check-surge',
      2
    )

    base.agents = {
      ...base.agents,
      [agent.id]: agent,
    }
    base.teams['t_nightwatch'] = {
      ...base.teams['t_nightwatch'],
      memberIds: [agent.id],
      agentIds: [agent.id],
      leaderId: agent.id,
    }

    const assigned = assignTeam(base, 'case-001', 't_nightwatch')
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      requiredTags: [],
    }

    const next = advanceWeek(assigned)
    const abilityState =
      next.agents['t_resolution_trigger_agent']?.abilityState?.['resolution-check-surge']

    expect(abilityState?.cooldownRemaining).toBe(2)
    expect(abilityState?.lastUsedWeek).toBe(1)
  })

  it('fires OnExposure active abilities only on anomaly exposure cases', () => {
    const base = makeBaseState()
    const exposureAgent = makeTriggeredActiveAbilityAgent(
      't_exposure_agent',
      'OnExposure',
      'exposure-ward',
      4
    )

    base.agents = {
      ...base.agents,
      [exposureAgent.id]: exposureAgent,
    }
    base.teams['t_nightwatch'] = {
      ...base.teams['t_nightwatch'],
      memberIds: [exposureAgent.id],
      agentIds: [exposureAgent.id],
      leaderId: exposureAgent.id,
    }

    const assigned = assignTeam(base, 'case-001', 't_nightwatch')
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      tags: ['anomaly', 'occult', 'containment'],
      requiredTags: [],
      preferredTags: [],
    }

    const next = advanceWeek(assigned)
    const firedState = next.agents['t_exposure_agent']?.abilityState?.['exposure-ward']

    expect(firedState?.cooldownRemaining).toBe(4)
    expect(firedState?.lastUsedWeek).toBe(1)

    const nonExposureBase = makeBaseState()
    const nonExposureAgent = makeTriggeredActiveAbilityAgent(
      't_non_exposure_agent',
      'OnExposure',
      'exposure-ward',
      4
    )

    nonExposureBase.agents = {
      ...nonExposureBase.agents,
      [nonExposureAgent.id]: nonExposureAgent,
    }
    nonExposureBase.teams['t_nightwatch'] = {
      ...nonExposureBase.teams['t_nightwatch'],
      memberIds: [nonExposureAgent.id],
      agentIds: [nonExposureAgent.id],
      leaderId: nonExposureAgent.id,
    }

    const assignedNonExposure = assignTeam(nonExposureBase, 'case-001', 't_nightwatch')
    assignedNonExposure.cases['case-001'] = {
      ...assignedNonExposure.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      tags: ['investigation', 'forensics'],
      requiredTags: [],
      preferredTags: [],
    }

    const nextNonExposure = advanceWeek(assignedNonExposure)
    const nonExposureState =
      nextNonExposure.agents['t_non_exposure_agent']?.abilityState?.['exposure-ward']

    expect(nonExposureState?.cooldownRemaining).toBe(0)
    expect(nonExposureState?.lastUsedWeek).toBeUndefined()
  })

  it('fires OnLongCaseDurationCheck abilities only when a multi-week case remains in progress', () => {
    const base = makeBaseState()
    const longDurationAgent = makeTriggeredActiveAbilityAgent(
      't_long_duration_agent',
      'OnLongCaseDurationCheck',
      'duration-discipline',
      3
    )

    base.agents = {
      ...base.agents,
      [longDurationAgent.id]: longDurationAgent,
    }
    base.teams['t_nightwatch'] = {
      ...base.teams['t_nightwatch'],
      memberIds: [longDurationAgent.id],
      agentIds: [longDurationAgent.id],
      leaderId: longDurationAgent.id,
    }

    const assigned = assignTeam(base, 'case-001', 't_nightwatch')
    assigned.cases['case-001'] = {
      ...assigned.cases['case-001'],
      status: 'in_progress',
      durationWeeks: 4,
      weeksRemaining: 2,
      requiredTags: [],
    }

    const next = advanceWeek(assigned)
    const firedState = next.agents['t_long_duration_agent']?.abilityState?.['duration-discipline']

    expect(next.cases['case-001']?.status).toBe('in_progress')
    expect(next.cases['case-001']?.weeksRemaining).toBe(1)
    expect(firedState?.cooldownRemaining).toBe(3)
    expect(firedState?.lastUsedWeek).toBe(1)

    const shortCaseBase = makeBaseState()
    const shortCaseAgent = makeTriggeredActiveAbilityAgent(
      't_short_duration_agent',
      'OnLongCaseDurationCheck',
      'duration-discipline',
      3
    )

    shortCaseBase.agents = {
      ...shortCaseBase.agents,
      [shortCaseAgent.id]: shortCaseAgent,
    }
    shortCaseBase.teams['t_nightwatch'] = {
      ...shortCaseBase.teams['t_nightwatch'],
      memberIds: [shortCaseAgent.id],
      agentIds: [shortCaseAgent.id],
      leaderId: shortCaseAgent.id,
    }

    const assignedShortCase = assignTeam(shortCaseBase, 'case-001', 't_nightwatch')
    assignedShortCase.cases['case-001'] = {
      ...assignedShortCase.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      requiredTags: [],
    }

    const nextShortCase = advanceWeek(assignedShortCase)
    const shortCaseAbilityState =
      nextShortCase.agents['t_short_duration_agent']?.abilityState?.['duration-discipline']

    expect(shortCaseAbilityState?.cooldownRemaining).toBe(0)
    expect(shortCaseAbilityState?.lastUsedWeek).toBeUndefined()
  })

  it('fires OnThreatEncounter abilities on partial/fail outcomes only', () => {
    const failBase = makeBaseState()
    const threatAgent = makeTriggeredActiveAbilityAgent(
      't_threat_agent',
      'OnThreatEncounter',
      'danger-spike',
      2
    )

    failBase.agents = {
      ...failBase.agents,
      [threatAgent.id]: threatAgent,
    }
    failBase.teams['t_nightwatch'] = {
      ...failBase.teams['t_nightwatch'],
      memberIds: [threatAgent.id],
      agentIds: [threatAgent.id],
      leaderId: threatAgent.id,
    }

    const assignedFail = assignTeam(failBase, 'case-001', 't_nightwatch')
    assignedFail.cases['case-001'] = {
      ...assignedFail.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 100, investigation: 100, utility: 100, social: 100 },
      weights: { combat: 25, investigation: 25, utility: 25, social: 25 },
      requiredTags: [],
    }

    const nextFail = advanceWeek(assignedFail)
    const failState = nextFail.agents['t_threat_agent']?.abilityState?.['danger-spike']

    expect(failState?.cooldownRemaining).toBe(2)
    expect(failState?.lastUsedWeek).toBe(1)

    const successBase = makeBaseState()
    const noThreatAgent = makeTriggeredActiveAbilityAgent(
      't_no_threat_agent',
      'OnThreatEncounter',
      'danger-spike',
      2
    )

    successBase.agents = {
      ...successBase.agents,
      [noThreatAgent.id]: noThreatAgent,
    }
    successBase.teams['t_nightwatch'] = {
      ...successBase.teams['t_nightwatch'],
      memberIds: [noThreatAgent.id],
      agentIds: [noThreatAgent.id],
      leaderId: noThreatAgent.id,
    }

    const assignedSuccess = assignTeam(successBase, 'case-001', 't_nightwatch')
    assignedSuccess.cases['case-001'] = {
      ...assignedSuccess.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 0, investigation: 1, utility: 0, social: 0 },
      weights: { combat: 0, investigation: 100, utility: 0, social: 0 },
      requiredTags: [],
    }

    const nextSuccess = advanceWeek(assignedSuccess)
    const successState = nextSuccess.agents['t_no_threat_agent']?.abilityState?.['danger-spike']

    expect(successState?.cooldownRemaining).toBe(0)
    expect(successState?.lastUsedWeek).toBeUndefined()
  })

  it('fires OnStressGain abilities only for agents whose weekly fatigue increases', () => {
    const stressBase = makeBaseState()
    const stressAgent = makeTriggeredActiveAbilityAgent(
      't_stress_agent',
      'OnStressGain',
      'stress-buffer',
      2
    )

    stressBase.agents = {
      ...stressBase.agents,
      [stressAgent.id]: {
        ...stressAgent,
        fatigue: 10,
      },
    }
    stressBase.teams['t_nightwatch'] = {
      ...stressBase.teams['t_nightwatch'],
      memberIds: [stressAgent.id],
      agentIds: [stressAgent.id],
      leaderId: stressAgent.id,
    }

    const assignedStress = assignTeam(stressBase, 'case-001', 't_nightwatch')
    assignedStress.cases['case-001'] = {
      ...assignedStress.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 2,
      requiredTags: [],
    }

    const nextStress = advanceWeek(assignedStress)
    const stressState = nextStress.agents['t_stress_agent']?.abilityState?.['stress-buffer']

    expect(nextStress.agents['t_stress_agent']?.fatigue).toBeGreaterThan(10)
    expect(stressState?.cooldownRemaining).toBe(2)
    expect(stressState?.lastUsedWeek).toBe(1)

    const noStressBase = makeBaseState()
    const noStressAgent = makeTriggeredActiveAbilityAgent(
      't_no_stress_agent',
      'OnStressGain',
      'stress-buffer',
      2
    )

    noStressBase.agents = {
      ...noStressBase.agents,
      [noStressAgent.id]: {
        ...noStressAgent,
        fatigue: 0,
      },
    }

    // Leave the agent unassigned and keep all incidents resolved.
    for (const caseId of Object.keys(noStressBase.cases)) {
      noStressBase.cases[caseId] = {
        ...noStressBase.cases[caseId],
        status: 'resolved',
        assignedTeamIds: [],
        weeksRemaining: 0,
      }
    }

    const nextNoStress = advanceWeek(noStressBase)
    const noStressState = nextNoStress.agents['t_no_stress_agent']?.abilityState?.['stress-buffer']

    expect(nextNoStress.agents['t_no_stress_agent']?.fatigue).toBe(0)
    expect(noStressState?.cooldownRemaining).toBe(0)
    expect(noStressState?.lastUsedWeek).toBeUndefined()
  })
})
