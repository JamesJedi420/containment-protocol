import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { useGameStore } from '../app/store/gameStore'
import { parseRunExport, serializeRunExport } from '../app/store/runTransfer'
import { resetGameStoreFixture } from './storeFixtures'
import { calcTeamChemistry } from '../domain/sim/chemistry'
import { normalizeAgent } from '../domain/agent/normalize'
import { appendAgentEventLogs } from '../domain/agent/lifecycle'
import { createOperationEvent } from '../domain/events/eventBus'
import { queueTeamTraining } from '../domain/sim/training'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { trainingCatalog } from '../data/training'
import {
  getPersonnelRelationship,
  applyPersonnelRelationshipEvent,
  normalizePersonnelRelationshipMetadata,
  queryPersonnelRelationships,
  writePersonnelRelationship,
  removePersonnelRelationship,
} from '../domain/personnelRelationships'

describe('canonical personnel relationships', () => {
  beforeEach(() => resetGameStoreFixture())
  it.each(['constructor', 'toString', '__proto__'])(
    'requires valid own provenance for opaque ID %s',
    (id) => {
      const agent = createStartingState().agents.a_ava
      const valid = { tags: [] as const, reason: 'external_event', sourceRef: 'test:valid' }
      expect(() =>
        writePersonnelRelationship(agent, id, 0.5, { ...valid, sourceRef: '' })
      ).toThrow()
      const created = writePersonnelRelationship(agent, id, 0.5, valid)
      expect(getPersonnelRelationship(created, id)?.metadata?.sourceRef).toBe('test:valid')
      const game = createStartingState()
      const loaded = parseRunExport(
        serializeRunExport({ ...game, agents: { ...game.agents, a_ava: created } })
      )
      expect(getPersonnelRelationship(loaded.agents.a_ava, id)).toEqual(
        getPersonnelRelationship(created, id)
      )
      expect(() => removePersonnelRelationship(created, id, { sourceRef: '' })).toThrow()
      expect(Object.getPrototypeOf(created.relationshipMetadata)).toBe(Object.prototype)
    }
  )
  it('preserves last real provenance for no-op writes and directional events', () => {
    const game = createStartingState()
    const agent = writePersonnelRelationship(game.agents.a_ava, 'a_sato', 0, {
      tags: [],
      reason: 'external_event',
      sourceRef: 'test:original',
      week: game.week,
    })
    expect(
      writePersonnelRelationship(agent, 'a_sato', 0, {
        tags: [],
        reason: 'reconciliation',
        sourceRef: 'test:no-op',
        week: game.week,
      })
    ).toBe(agent)
    const event = createOperationEvent(1, {
      type: 'agent.relationship_changed',
      sourceSystem: 'agent',
      payload: {
        week: game.week,
        agentId: agent.id,
        agentName: agent.name,
        counterpartId: 'a_sato',
        counterpartName: game.agents.a_sato.name,
        previousValue: 0,
        nextValue: 0,
        delta: 0,
        reason: 'passive_drift',
      },
    })
    expect(applyPersonnelRelationshipEvent(agent, event)).toBe(agent)
  })
  it('normalizes JSON prototype-name keys as own data without changing object prototypes', () => {
    const raw = JSON.parse(
      '{"__proto__":{"tags":[],"sourceRef":"test:terminal","reason":"removed","terminal":true}}'
    )
    const result = normalizePersonnelRelationshipMetadata(raw, {}, 'owner')
    expect(Object.hasOwn(result, '__proto__')).toBe(true)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    expect(Object.getPrototypeOf({})).toBe(Object.prototype)
    expect(result['__proto__'].terminal).toBe(true)
    const payload = JSON.parse(serializeRunExport(createStartingState()))
    payload.game.agents.a_ava.relationshipMetadata = raw
    expect(
      Object.hasOwn(normalizeAgent(payload.game.agents.a_ava).relationshipMetadata!, '__proto__')
    ).toBe(true)
    const loaded = parseRunExport(JSON.stringify(payload)).agents.a_ava.relationshipMetadata!
    expect(Object.getPrototypeOf(loaded)).toBe(Object.prototype)
    expect(Object.hasOwn(loaded, '__proto__')).toBe(true)
  })
  it('rejects malformed terminal keys and inherited metadata properties', () => {
    const agent = createStartingState().agents.a_ava
    expect(
      normalizeAgent({
        ...agent,
        relationshipMetadata: {
          ' ': { tags: [], sourceRef: 'test', reason: 'removed', terminal: true },
        },
      }).relationshipMetadata
    ).toEqual({})
    const legacy = { ...agent, relationships: { constructor: 0.5 }, relationshipMetadata: {} }
    expect(getPersonnelRelationship(legacy, 'constructor')?.metadata).toBeNull()
  })
  it('preserves asymmetric typed edges, bounded queries and removal without a second numeric authority', () => {
    const state = createStartingState()
    const metadata = {
      tags: ['trust', 'mentorship'] as const,
      reason: 'external_event',
      sourceRef: 'test:authored',
    }
    const left = writePersonnelRelationship(state.agents.a_ava, 'a_sato', 1, metadata)
    const right = writePersonnelRelationship(state.agents.a_sato, 'a_ava', -1, {
      ...metadata,
      tags: ['rivalry'],
    })
    expect(getPersonnelRelationship(left, 'a_sato')?.value).toBe(1)
    expect(getPersonnelRelationship(right, 'a_ava')?.value).toBe(-1)
    expect(queryPersonnelRelationships(left, ['missing', 'a_sato', 'a_sato'])).toHaveLength(1)
    expect(left.relationshipMetadata?.a_sato).not.toHaveProperty('value')
    const removed = removePersonnelRelationship(left, 'a_sato', {
      sourceRef: 'test:release',
      week: state.week,
    })
    expect(getPersonnelRelationship(removed, 'a_sato')).toBeNull()
    expect(removed.history?.bonds.a_sato).toBeUndefined()
    expect(normalizeAgent(removed).relationshipMetadata?.a_sato).toMatchObject({
      reason: 'removed',
      terminal: true,
      sourceRef: 'test:release',
    })
    expect(getPersonnelRelationship(left, 'a_sato')?.value).toBe(1)
  })
  it('rejects invalid values and repairs malformed metadata without replacing canonical chemistry', () => {
    const agent = createStartingState().agents.a_ava
    const metadata = { tags: [] as const, reason: 'external_event', sourceRef: 'test:source' }
    for (const value of [NaN, Infinity, -Infinity, -3, 3]) {
      expect(() => writePersonnelRelationship(agent, 'a_sato', value, metadata)).toThrow()
    }
    const normalized = normalizeAgent({
      ...agent,
      relationshipMetadata: {
        missing: metadata,
        a_sato: { ...metadata, sourceRef: '' },
      },
    })
    expect(normalized.relationships).toEqual(normalizeAgent(agent).relationships)
    expect(normalized.relationshipMetadata).toEqual({})
  })
  it('round-trips a constructed existing staff-contract reference and terminal provenance', () => {
    const game = createStartingState()
    const counterpartId = 'instructor:fixture'
    game.staff = {
      ...game.staff,
      [counterpartId]: {
        role: 'instructor',
        name: 'Fixture instructor',
        efficiency: 1,
        instructorSpecialty: 'combat',
      },
    }
    const metadata = {
      tags: ['loyalty', 'dependence'] as const,
      reason: 'external_event',
      sourceRef: `staff:${counterpartId}`,
      week: game.week,
    }
    const agent = writePersonnelRelationship(game.agents.a_ava, counterpartId, 0.8, metadata)
    const saved = { ...game, agents: { ...game.agents, a_ava: agent } }
    const loaded = parseRunExport(serializeRunExport(saved))
    expect(getPersonnelRelationship(loaded.agents.a_ava, counterpartId)).toEqual(
      getPersonnelRelationship(agent, counterpartId)
    )
    expect(loaded.staff).toEqual(game.staff)
    const removed = removePersonnelRelationship(agent, counterpartId, {
      sourceRef: 'test:terminal',
      week: game.week,
    })
    const terminal = parseRunExport(
      serializeRunExport({ ...saved, agents: { ...saved.agents, a_ava: removed } })
    )
    expect(getPersonnelRelationship(terminal.agents.a_ava, counterpartId)).toBeNull()
    expect(terminal.agents.a_ava.relationshipMetadata?.[counterpartId]).toMatchObject({
      reason: 'removed',
      sourceRef: 'test:terminal',
      terminal: true,
    })
    expect(removePersonnelRelationship(removed, counterpartId, { sourceRef: 'test:retry' })).toBe(
      removed
    )
  })
  it('does not invent legacy history, inherit fallback metadata or accept unknown/future provenance', () => {
    const game = createStartingState()
    const agent = writePersonnelRelationship(game.agents.a_ava, 'a_sato', 0.5, {
      tags: [],
      sourceRef: 'test:valid',
      reason: 'reconciliation',
      week: game.week,
    })
    const fallback = { ...game, agents: { ...game.agents, a_ava: agent } }
    const legacy = JSON.parse(serializeRunExport(fallback))
    delete legacy.game.agents.a_ava.relationshipMetadata
    expect(
      parseRunExport(JSON.stringify(legacy), fallback).agents.a_ava.relationshipMetadata
    ).toEqual({})
    for (const metadata of [
      { tags: ['invented'], sourceRef: 'test', reason: 'reconciliation' },
      { tags: [], sourceRef: 'test', reason: 'invented' },
      { tags: [], sourceRef: 'test', reason: 'reconciliation', week: game.week + 1 },
    ]) {
      legacy.game.agents.a_ava.relationshipMetadata = { a_sato: metadata }
      const loaded = parseRunExport(JSON.stringify(legacy), fallback)
      expect(loaded.agents.a_ava.relationshipMetadata).toEqual({})
      expect(loaded.agents.a_ava.relationships.a_sato).toBe(0.5)
    }
  })
  it('connects the real store reconciliation to events, tiers, chemistry and save/load provenance', () => {
    const state = createStartingState()
    const metadata = {
      tags: ['trust'] as const,
      reason: 'external_event',
      sourceRef: 'test:initial',
      week: state.week,
    }
    const left = writePersonnelRelationship(state.agents.a_ava, 'a_sato', -0.6, metadata)
    const right = writePersonnelRelationship(state.agents.a_sato, 'a_ava', -1, metadata)
    useGameStore.setState({
      game: { ...state, agents: { ...state.agents, a_ava: left, a_sato: right } },
    })
    const before = calcTeamChemistry([left, right])
    useGameStore.getState().reconcileAgents('a_ava', 'a_sato')
    const next = useGameStore.getState().game
    const edge = getPersonnelRelationship(next.agents.a_ava, 'a_sato')!
    expect(edge.value).toBeCloseTo(-0.15)
    expect(edge.tier).not.toBe(getPersonnelRelationship(left, 'a_sato')?.tier)
    expect(edge.metadata?.reason).toBe('reconciliation')
    expect(edge.metadata?.eventId).toMatch(/^evt-/)
    expect(edge.metadata?.tags).toEqual(['trust'])
    expect(calcTeamChemistry([next.agents.a_ava, next.agents.a_sato]).cohesion).not.toBe(
      before.cohesion
    )
    expect(next.agents.a_ava.history?.bonds.a_sato).toBe(edge.value)
    const loaded = parseRunExport(serializeRunExport(next))
    expect(getPersonnelRelationship(loaded.agents.a_ava, 'a_sato')).toEqual(edge)
    const removed = removePersonnelRelationship(next.agents.a_ava, 'a_sato', {
      sourceRef: 'test:terminal',
      week: next.week,
    })
    const event = next.events.find((item) => item.id === edge.metadata?.eventId)!
    if (event.type !== 'agent.relationship_changed') throw new Error('Expected relationship event')
    expect(
      applyPersonnelRelationshipEvent(next.agents.a_ava, {
        ...event,
        id: 'evt-stale',
        payload: { ...event.payload, week: 0 },
      })
    ).toBe(next.agents.a_ava)
    const replayed = appendAgentEventLogs(removed, [event])
    expect(getPersonnelRelationship(replayed, 'a_sato')).toBeNull()
    expect(replayed.relationshipMetadata?.a_sato).toEqual(removed.relationshipMetadata?.a_sato)
    expect(calcTeamChemistry([loaded.agents.a_ava, loaded.agents.a_sato])).toEqual(
      calcTeamChemistry([next.agents.a_ava, next.agents.a_sato])
    )
  })
  it('records both directions of completed team training through canonical events', () => {
    const state = createStartingState()
    const drill = trainingCatalog.find((entry) => (entry.relationshipDelta ?? 0) > 0)!
    let game = queueTeamTraining(state, 't_nightwatch', drill.trainingId)
    expect(game.trainingQueue.length).toBeGreaterThan(0)
    const weeks = Math.max(...game.trainingQueue.map((entry) => entry.remainingWeeks))
    for (let index = 0; index < weeks; index++) game = advanceWeek(game)
    const events = game.events.filter(
      (event) => event.type === 'agent.relationship_changed' && event.payload.reason === 'training'
    )
    expect(events.length).toBeGreaterThan(0)
    for (const event of events) {
      if (event.type !== 'agent.relationship_changed') continue
      expect(
        events.some(
          (reverse) =>
            reverse.type === 'agent.relationship_changed' &&
            reverse.payload.agentId === event.payload.counterpartId &&
            reverse.payload.counterpartId === event.payload.agentId
        )
      ).toBe(true)
      const agent = game.agents[event.payload.agentId]
      const edge = getPersonnelRelationship(agent, event.payload.counterpartId)!
      expect(edge.metadata?.eventId).toMatch(/^evt-/)
      const provenanceEvent = agent.history?.logs.find((item) => item.id === edge.metadata?.eventId)
      expect(provenanceEvent?.type).toBe('agent.relationship_changed')
      if (provenanceEvent?.type !== 'agent.relationship_changed')
        throw new Error('Missing provenance event')
      expect(provenanceEvent.payload.nextValue).toBe(edge.value)
      expect(provenanceEvent.payload.counterpartId).toBe(event.payload.counterpartId)
      expect(
        getPersonnelRelationship(
          parseRunExport(serializeRunExport(game)).agents[agent.id],
          event.payload.counterpartId
        )?.metadata
      ).toEqual(edge.metadata)
    }
    expect(
      parseRunExport(serializeRunExport(game)).events.filter(
        (event) =>
          event.type === 'agent.relationship_changed' && event.payload.reason === 'training'
      )
    ).toEqual(events)
  })
})
