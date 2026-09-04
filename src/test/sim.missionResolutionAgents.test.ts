import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { ResolutionOutcome } from '../domain/models'
import { applyMissionResolutionAgentMutations } from '../domain/sim/missionResolutionAgents'
import {
  getEquipmentInstance,
  instantiateEquipmentInstance,
  relocateEquipmentInstance,
  takeEquippedInstancesLostOnMissionFatalities,
} from '../domain/equipmentInstance'

function makeOutcome(overrides: Partial<ResolutionOutcome> = {}): ResolutionOutcome {
  return {
    caseId: 'case-001',
    mode: 'threshold',
    kind: 'case',
    delta: 10,
    result: 'success',
    reasons: ['test-outcome'],
    ...overrides,
  }
}

describe('applyMissionResolutionAgentMutations', () => {
  it('applies case history + xp events for successful mission resolution', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => state.agents[agentId]!).filter(Boolean)

    const result = applyMissionResolutionAgentMutations({
      agents: state.agents,
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'success' }),
      week: state.week,
      rng: () => 0.5,
    })

    const firstAgent = result.nextAgents[team.agentIds[0]]
    expect(firstAgent?.assignment?.state).toBe('idle')
    expect(firstAgent?.history?.counters.assignmentsCompleted).toBe(1)
    expect(firstAgent?.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'case.resolved' }),
        expect.objectContaining({ eventType: 'progression.xp_gained' }),
      ])
    )
    expect(result.eventDrafts.some((draft) => draft.type === 'progression.xp_gained')).toBe(true)
    expect(result.missionInjuries).toHaveLength(0)
  })

  it('records injuries and recovery assignment when fail outcome causes injury roll', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 90,
      status: 'active' as const,
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 3,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0,
    })

    expect(result.missionInjuries.length).toBeGreaterThan(0)
    expect(result.eventDrafts.some((draft) => draft.type === 'agent.injured')).toBe(true)

    const firstAgent = result.nextAgents[team.agentIds[0]]
    expect(firstAgent?.status).toBe('injured')
    expect(firstAgent?.assignment?.state).toBe('recovery')
    expect(firstAgent?.history?.timeline).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventType: 'agent.injured' })])
    )
  })

  it('can kill agents on catastrophic failed missions that carry fatality pressure', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...state.agents[agentId]!,
      fatigue: 95,
      status: 'active' as const,
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        kind: 'raid',
        stage: 5,
        assignedTeamIds: ['t_nightwatch'],
        raid: {
          minTeams: 2,
          maxTeams: 2,
        },
      },
      outcome: makeOutcome({ result: 'fail', delta: -40 }),
      week: state.week,
      rng: () => 0,
    })

    expect(result.missionFatalities.length).toBeGreaterThan(0)
    expect(result.eventDrafts.some((draft) => draft.type === 'agent.killed')).toBe(true)

    const firstAgent = result.nextAgents[team.agentIds[0]]
    expect(firstAgent?.status).toBe('dead')
    expect(firstAgent?.assignment?.state).toBe('idle')
    expect(firstAgent?.vitals?.health).toBe(0)
  })

  it('activates bounded overdrive on high combat stress and stores expiry aftermath debt', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 50,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[subjectId]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        combatStress: 70,
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        [subject.id]: subject,
      },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 2,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0.6,
    })

    const next = result.nextAgents[subject.id]
    expect(next?.overdrive?.active).toBe(false)
    expect(next?.overdrive?.remainingPhases).toBe(0)
    expect(next?.overdrive?.recoveryDebt).toBeGreaterThan(0)
  })

  it('overdrive provides short-term injury protection versus same agent without activation', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const base = state.agents[subjectId]!

    const lowStress = {
      ...base,
      fatigue: 50,
      status: 'active' as const,
      fatigueChannels: {
        ...(base.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        combatStress: 40,
      },
    }

    const highStress = {
      ...base,
      fatigue: 50,
      status: 'active' as const,
      fatigueChannels: {
        ...(base.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        combatStress: 70,
      },
    }

    const commonInput = {
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 2,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0.6,
    }

    const lowResult = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, [lowStress.id]: lowStress },
      assignedAgents: [lowStress],
      ...commonInput,
    })

    const highResult = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, [highStress.id]: highStress },
      assignedAgents: [highStress],
      ...commonInput,
    })

    // Deterministic protection expectation: high-stress run activates overdrive and
    // should not produce more injuries than the non-overdrive baseline.
    expect(highResult.missionInjuries.length).toBeLessThanOrEqual(lowResult.missionInjuries.length)
  })

  it('preserves Combat Stim overdrive through casualty resolution for canonical week-close expiry', () => {
    const state = createStartingState()
    const team = state.teams.t_nightwatch
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 50,
      status: 'active' as const,
      overdrive: {
        active: true,
        remainingPhases: 1,
        recoveryDebt: 2,
        source: {
          kind: 'combat_stim' as const,
          activationId: 'combat-stim-equipment-instance-1-1-dose-1',
          equipmentInstanceId: 'equipment-instance-1-1',
          caseId: 'case-001',
        },
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: { ...state.agents, [subject.id]: subject },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 3,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: state.week,
      rng: () => 0.9,
    })

    expect(result.nextAgents[subjectId]?.overdrive).toMatchObject({
      active: true,
      source: { kind: 'combat_stim', equipmentInstanceId: 'equipment-instance-1-1' },
    })
  })

  it('transit vulnerability can trigger return-route ambush injury outside main fail roll', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[subjectId]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        physicalExhaustion: 70,
        mentalExhaustion: 45,
        combatStress: 20,
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        [subject.id]: subject,
      },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 1,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -5 }),
      week: state.week,
      rng: () => 0,
    })

    expect(result.missionInjuries.length).toBeGreaterThan(0)
    expect(result.missionInjuries.every((injury) => injury.severity === 'minor')).toBe(true)
  })

  it('transit vulnerability does not trigger when return path is not solo', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const ids = team.agentIds.slice(0, 2)
    const assignedAgents = ids.map((id) => ({
      ...state.agents[id]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[id]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        physicalExhaustion: 70,
        mentalExhaustion: 45,
        combatStress: 20,
      },
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 1,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -5 }),
      week: state.week,
      rng: () => 0,
    })

    // Not solo: bounded transit vulnerability window is disabled.
    expect(result.missionInjuries).toHaveLength(0)
  })

  it('transit ambush injury applies extra morale penalty', () => {
    const state = createStartingState()
    const team = state.teams['t_nightwatch']
    const subjectId = team.agentIds[0]
    const subject = {
      ...state.agents[subjectId]!,
      fatigue: 10,
      status: 'active' as const,
      fatigueChannels: {
        ...(state.agents[subjectId]!.fatigueChannels ?? {
          physicalExhaustion: 0,
          mentalExhaustion: 0,
          combatStress: 0,
          capabilityUsesThisPhase: 0,
        }),
        physicalExhaustion: 70,
        mentalExhaustion: 45,
        combatStress: 20,
      },
      vitals: {
        health: 100,
        stress: 10,
        morale: 90,
        wounds: 0,
        statusFlags: [],
      },
    }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...state.agents,
        [subject.id]: subject,
      },
      assignedAgents: [subject],
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...state.cases['case-001'],
        stage: 1,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -5 }),
      week: state.week,
      rng: () => 0,
    })

    const next = result.nextAgents[subject.id]
    // Base minor injury morale loss is 8; transit penalty adds 6 => total 14.
    expect(next?.vitals?.morale).toBe(76)
  })

  it('destroys equipped ordinary instance-backed slots on fatality without inventory credit', () => {
    const state = createStartingState()
    // Hunter (a_ava) cannot take signal/intel kit; use field/tactical ordinary identities.
    state.inventory.tactical_radio = 1
    state.inventory.trauma_kit = 1
    state.inventory.signal_jammers = 2
    const first = instantiateEquipmentInstance(state, 'tactical_radio')
    if (!first.ok) throw new Error(first.code)
    const second = instantiateEquipmentInstance(first.state, 'trauma_kit')
    if (!second.ok) throw new Error(second.code)
    const sibling = instantiateEquipmentInstance(second.state, 'signal_jammers')
    if (!sibling.ok) throw new Error(sibling.code)
    const stored = instantiateEquipmentInstance(sibling.state, 'signal_jammers')
    if (!stored.ok) throw new Error(stored.code)
    const equippedFirst = relocateEquipmentInstance(stored.state, first.instance.instanceId, {
      state: 'equipped',
      agentId: 'a_ava',
      slot: 'utility1',
    })
    if (!equippedFirst.ok) throw new Error(equippedFirst.code)
    const equippedSecond = relocateEquipmentInstance(
      equippedFirst.state,
      second.instance.instanceId,
      { state: 'equipped', agentId: 'a_ava', slot: 'utility2' }
    )
    if (!equippedSecond.ok) throw new Error(equippedSecond.code)
    const equippedSibling = relocateEquipmentInstance(
      equippedSecond.state,
      sibling.instance.instanceId,
      { state: 'equipped', agentId: 'a_casey', slot: 'utility1' }
    )
    if (!equippedSibling.ok) throw new Error(equippedSibling.code)
    equippedSibling.state.agents.a_ava = {
      ...equippedSibling.state.agents.a_ava,
      equipmentSlots: {
        ...equippedSibling.state.agents.a_ava.equipmentSlots,
        primary: 'silver_rounds',
      },
    }

    const prepared = equippedSibling.state
    const team = prepared.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...prepared.agents[agentId]!,
      fatigue: 95,
      status: 'active' as const,
    }))
    const inventoryBefore = { ...prepared.inventory }

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...prepared.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...prepared.cases['case-001'],
        kind: 'raid',
        stage: 5,
        assignedTeamIds: ['t_nightwatch'],
        raid: { minTeams: 2, maxTeams: 2 },
      },
      outcome: makeOutcome({ result: 'fail', delta: -40 }),
      week: prepared.week,
      rng: () => 0,
      equipmentInstances: prepared.equipmentInstances,
    })

    expect(result.nextAgents.a_ava.status).toBe('dead')
    expect(result.nextEquipmentInstances).not.toHaveProperty(first.instance.instanceId)
    expect(result.nextEquipmentInstances).not.toHaveProperty(second.instance.instanceId)
    expect(result.nextEquipmentInstances).toHaveProperty(sibling.instance.instanceId)
    expect(result.nextEquipmentInstances).toHaveProperty(stored.instance.instanceId)
    expect(result.nextAgents.a_ava.equipmentSlots?.utility1).toBeUndefined()
    expect(result.nextAgents.a_ava.equipmentSlots?.utility2).toBeUndefined()
    expect(result.nextAgents.a_ava.equipmentSlots?.primary).toBe('silver_rounds')
    expect(result.nextAgents.a_casey.equipmentSlots?.utility1).toBe('signal_jammers')
    expect(result.nextEquipmentInstances?.[stored.instance.instanceId]?.location).toEqual({
      state: 'stored',
    })
    expect(
      getEquipmentInstance(
        { equipmentInstances: result.nextEquipmentInstances },
        sibling.instance.instanceId
      )?.location
    ).toMatchObject({ state: 'equipped', agentId: 'a_casey', slot: 'utility1' })
    expect(prepared.inventory).toEqual(inventoryBefore)

    const destroyed = result.eventDrafts.filter(
      (draft) => draft.type === 'equipment.instance_destroyed'
    )
    expect(destroyed.map((draft) => draft.payload.instanceId)).toEqual([
      first.instance.instanceId,
      second.instance.instanceId,
    ])
    expect(destroyed.every((draft) => draft.payload.reason === 'mission_loss')).toBe(true)
    expect(result.eventDrafts.some((draft) => draft.type === 'agent.killed')).toBe(true)
  })

  it('disposes equipped Combat Stim identities on fatality without inventory credit', () => {
    const state = createStartingState()
    state.inventory.combat_stims = 2
    const stim = instantiateEquipmentInstance(state, 'combat_stims', {
      location: { state: 'equipped', agentId: 'a_ava', slot: 'utility1' },
    })
    if (!stim.ok) throw new Error(stim.code)
    const stockBefore = stim.state.inventory.combat_stims
    const team = stim.state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...stim.state.agents[agentId]!,
      fatigue: 95,
      status: 'active' as const,
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...stim.state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...stim.state.cases['case-001'],
        kind: 'raid',
        stage: 5,
        assignedTeamIds: ['t_nightwatch'],
        raid: { minTeams: 2, maxTeams: 2 },
      },
      outcome: makeOutcome({ result: 'fail', delta: -40 }),
      week: stim.state.week,
      rng: () => 0,
      equipmentInstances: stim.state.equipmentInstances,
    })

    expect(result.nextAgents.a_ava.status).toBe('dead')
    expect(result.nextEquipmentInstances).not.toHaveProperty(stim.instance.instanceId)
    expect(result.nextAgents.a_ava.equipmentSlots?.utility1).toBeUndefined()
    expect(stim.state.inventory.combat_stims).toBe(stockBefore)
    const disposed = result.eventDrafts.filter(
      (draft) => draft.type === 'equipment.combat_stim_disposed'
    )
    expect(disposed).toEqual([
      expect.objectContaining({
        payload: expect.objectContaining({
          instanceId: stim.instance.instanceId,
          remaining: 2,
          reason: 'mission_loss',
        }),
      }),
    ])
  })

  it('does not destroy equipped instances when the assigned agent is only injured', () => {
    const state = createStartingState()
    state.inventory.trauma_kit = 1
    const created = instantiateEquipmentInstance(state, 'trauma_kit', {
      location: { state: 'equipped', agentId: 'a_ava', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)
    const team = created.state.teams['t_nightwatch']
    const assignedAgents = team.agentIds.map((agentId) => ({
      ...created.state.agents[agentId]!,
      fatigue: 90,
      status: 'active' as const,
    }))

    const result = applyMissionResolutionAgentMutations({
      agents: {
        ...created.state.agents,
        ...Object.fromEntries(assignedAgents.map((agent) => [agent.id, agent])),
      },
      assignedAgents,
      assignedAgentLeaderBonuses: {},
      effectiveCase: {
        ...created.state.cases['case-001'],
        stage: 3,
        assignedTeamIds: ['t_nightwatch'],
      },
      outcome: makeOutcome({ result: 'fail', delta: -20 }),
      week: created.state.week,
      rng: () => 0,
      equipmentInstances: created.state.equipmentInstances,
    })

    expect(result.missionInjuries.length).toBeGreaterThan(0)
    expect(result.missionFatalities).toEqual([])
    expect(result.nextEquipmentInstances).toHaveProperty(created.instance.instanceId)
    expect(result.nextAgents.a_ava.equipmentSlots?.utility1).toBe('trauma_kit')
    expect(
      result.eventDrafts.some(
        (draft) =>
          draft.type === 'equipment.instance_destroyed' ||
          draft.type === 'equipment.combat_stim_disposed'
      )
    ).toBe(false)
  })

  it('leaves recovery-claimed equipped identities on a dead carrier', () => {
    const state = createStartingState()
    state.inventory.trauma_kit = 1
    const created = instantiateEquipmentInstance(state, 'trauma_kit', {
      location: { state: 'equipped', agentId: 'a_ava', slot: 'utility1' },
    })
    if (!created.ok) throw new Error(created.code)
    const taken = takeEquippedInstancesLostOnMissionFatalities(
      created.state.agents,
      created.state.equipmentInstances,
      {
        equipmentDeconstructionQueue: [
          { sourceEquipmentInstanceId: created.instance.instanceId },
        ] as typeof created.state.equipmentDeconstructionQueue,
      },
      ['a_ava']
    )
    expect(taken.lost).toEqual([])
    expect(taken.equipmentInstances).toHaveProperty(created.instance.instanceId)
    expect(taken.agents.a_ava.equipmentSlots?.utility1).toBe('trauma_kit')
  })
})
