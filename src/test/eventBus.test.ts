import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { appendOperationEventDrafts } from '../domain/events/eventBus'

describe('appendOperationEventDrafts agent log reconciliation', () => {
  it('appends staff.coping.applied events to the affected agent history logs', () => {
    const state = createStartingState()
    const agentId = 'a_ava'

    const next = appendOperationEventDrafts(state, [
      {
        type: 'staff.coping.applied',
        sourceSystem: 'agent',
        payload: {
          week: state.week,
          agentId,
          streak: 1,
          policy: 'permitted',
        },
      },
    ])

    const logs = next.agents[agentId]?.history?.logs ?? []
    expect(logs).toHaveLength(1)
    expect(logs[0]?.type).toBe('staff.coping.applied')
    expect(logs[0]?.payload.agentId).toBe(agentId)
  })

  it('appends staff.coping.misconduct events to the affected agent history logs', () => {
    const state = createStartingState()
    const agentId = 'a_rook'

    const next = appendOperationEventDrafts(state, [
      {
        type: 'staff.coping.misconduct',
        sourceSystem: 'agent',
        payload: {
          week: state.week,
          agentId,
          policy: 'restricted',
        },
      },
    ])

    const logs = next.agents[agentId]?.history?.logs ?? []
    expect(logs).toHaveLength(1)
    expect(logs[0]?.type).toBe('staff.coping.misconduct')
    expect(logs[0]?.payload.policy).toBe('restricted')
  })

  it('appends agent.killed events to the affected agent history logs and timeline', () => {
    const state = createStartingState()
    const agentId = 'a_ava'

    const next = appendOperationEventDrafts(state, [
      {
        type: 'agent.killed',
        sourceSystem: 'agent',
        payload: {
          week: state.week,
          agentId,
          agentName: 'Ava Brooks',
          caseId: 'case-001',
          caseTitle: state.cases['case-001']!.title,
        },
      },
    ])

    const agent = next.agents[agentId]
    const logs = agent?.history?.logs ?? []
    expect(logs).toHaveLength(1)
    expect(logs[0]?.type).toBe('agent.killed')
    expect(logs[0]?.payload.agentId).toBe(agentId)
    expect(agent?.history?.timeline).toContainEqual(
      expect.objectContaining({
        week: state.week,
        eventType: 'agent.killed',
        note: `Killed in action during ${state.cases['case-001']!.title}.`,
        eventId: logs[0]?.id,
      })
    )
  })

  it('appends staff.side_work.resolved events to the affected agent history logs and timeline', () => {
    const state = createStartingState()
    const agentId = 'a_rook'

    const next = appendOperationEventDrafts(state, [
      {
        type: 'staff.side_work.resolved',
        sourceSystem: 'agent',
        payload: {
          week: state.week,
          agentId,
          optionId: 'trustedCourier',
          outcome: 'paid',
          fundingDelta: 12,
          fatigueDelta: -2,
        },
      },
    ])

    const agent = next.agents[agentId]
    const logs = agent?.history?.logs ?? []
    expect(logs).toHaveLength(1)
    expect(logs[0]?.type).toBe('staff.side_work.resolved')
    expect(agent?.history?.timeline).toContainEqual(
      expect.objectContaining({
        week: state.week,
        eventType: 'staff.side_work.resolved',
        note: 'Side work (trustedCourier) resolved (paid).',
        eventId: logs[0]?.id,
      })
    )
  })

  it('appends case.spawned faction_offer events to faction interaction logs', () => {
    const state = createStartingState()
    const mission = state.cases['case-001']!

    const next = appendOperationEventDrafts(state, [
      {
        type: 'case.spawned',
        sourceSystem: 'incident',
        payload: {
          week: state.week,
          caseId: 'case-faction-offer',
          caseTitle: 'Faction Offer Case',
          templateId: mission.templateId,
          kind: mission.kind,
          stage: mission.stage,
          trigger: 'faction_offer',
          factionId: 'occult_networks',
          factionLabel: 'Occult Networks',
        },
      },
    ])

    const faction = next.factions?.occult_networks
    expect(faction?.history?.interactionLog.some((entry) => entry.type === 'case.spawned')).toBe(
      true
    )
  })

  it('appends case.spawned faction_pressure events to faction interaction logs', () => {
    const state = createStartingState()
    const mission = state.cases['case-001']!

    const next = appendOperationEventDrafts(state, [
      {
        type: 'case.spawned',
        sourceSystem: 'incident',
        payload: {
          week: state.week,
          caseId: 'case-faction-pressure',
          caseTitle: 'Faction Pressure Case',
          templateId: mission.templateId,
          kind: mission.kind,
          stage: mission.stage,
          trigger: 'faction_pressure',
          factionId: 'occult_networks',
          factionLabel: 'Occult Networks',
        },
      },
    ])

    const faction = next.factions?.occult_networks
    expect(faction?.history?.interactionLog.some((entry) => entry.type === 'case.spawned')).toBe(
      true
    )
  })

  it('appends case.spawned to faction history only when contactId is absent', () => {
    const state = createStartingState()
    const mission = state.cases['case-001']!
    const beforeContacts = state.factions?.occult_networks?.contacts ?? []

    const next = appendOperationEventDrafts(state, [
      {
        type: 'case.spawned',
        sourceSystem: 'incident',
        payload: {
          week: state.week,
          caseId: 'case-faction-level',
          caseTitle: 'Faction Level Spawn',
          templateId: mission.templateId,
          kind: mission.kind,
          stage: mission.stage,
          trigger: 'faction_offer',
          factionId: 'occult_networks',
        },
      },
    ])

    const afterContacts = next.factions?.occult_networks?.contacts ?? []
    expect(
      next.factions?.occult_networks?.history?.interactionLog.some(
        (entry) => entry.type === 'case.spawned'
      )
    ).toBe(true)
    expect(afterContacts).toEqual(beforeContacts)
  })
})
