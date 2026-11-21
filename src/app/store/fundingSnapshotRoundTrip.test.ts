import { assert, describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { validateOperationEventPayload } from '../../domain/events/eventValidation'
import { assignTeam } from '../../domain/sim/assign'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { loadGameSave, serializeGameSave, type GameSavePayload } from './saveSystem'

describe('SPE-3763 funding snapshots', () => {
  it('preserves the SPE-1749 controlled week close through two manual save reloads', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T12:00:00.000Z'))
    try {
      // SPE-1749 Resources 2600faf5-434d-4c61-a157-ec25cb2dd696, measured.fixture-v1.json.
      const before = createStartingState()
      expect(before.week).toBe(1)
      expect(before.rngSeed).toBe(1337)
      expect(before.events).toEqual([])
      assert.exists(before.agency)
      expect(before.agency.fundingState).toBeUndefined()

      const produced = advanceWeek(before, Date.now())
      const save = serializeGameSave(produced)
      const envelope = JSON.parse(save) as GameSavePayload
      expect(envelope).toMatchObject({ kind: 'containment-protocol-save', version: 1 })

      const firstLoad = loadGameSave(save)
      const secondLoad = loadGameSave(serializeGameSave(firstLoad))
      const expectedHistory = [
        { week: 1, reason: 'operating_cost', delta: -40, sourceId: 'weekly-operating-cost' },
        {
          week: 2,
          reason: 'post_incident_closeout_reward',
          delta: 4,
          sourceId: 'post-incident-closeout-reward:review:near-catastrophe-case-002',
        },
      ]
      const expectedEventIds = Array.from(
        { length: 12 },
        (_, index) => `evt-${String(index + 1).padStart(6, '0')}`
      )
      const producedEvent = produced.events.find((event) => event.id === 'evt-000011')
      expect(producedEvent).toMatchObject({
        type: 'agency.containment_updated',
        schemaVersion: 2,
        sourceSystem: 'system',
        timestamp: '2042-01-01T00:00:00.011Z',
        payload: { fundingBefore: 110, fundingAfter: 53, fundingDelta: -17 },
      })
      expect(producedEvent).not.toHaveProperty('sourceId')

      for (const [stage, state] of [
        ['produced', produced],
        ['serialized', envelope.state],
        ['first reload', firstLoad],
        ['second reload', secondLoad],
      ] as const) {
        expect(
          state.events.map((event) => event.id),
          stage
        ).toEqual(expectedEventIds)
        expect(
          state.events.find((event) => event.id === 'evt-000011'),
          stage
        ).toEqual(producedEvent)
        expect(state.funding, stage).toBe(57)
        assert.exists(state.agency, stage)
        expect(state.agency.funding, stage).toBe(57)
        expect(state.agency.fundingState?.funding, stage).toBe(57)
        expect(state.agency.fundingState?.fundingHistory, stage).toEqual(expectedHistory)
      }

      expect(secondLoad.events).toEqual(firstLoad.events)
    } finally {
      vi.useRealTimers()
    }
  })

  it('preserves a signed opening balance from mission discipline through two reloads', () => {
    const before = createStartingState()
    before.funding = 3
    assert.exists(before.agency)
    before.agency.funding = 3

    // Resolve a guaranteed mission failure with an existing trust-damage pair.
    const mission = before.cases['case-001']
    mission.mode = 'threshold'
    mission.durationWeeks = 1
    mission.weeksRemaining = 1
    mission.weights = { combat: 1, investigation: 0, utility: 0, social: 0 }
    mission.difficulty = { combat: 2000, investigation: 0, utility: 0, social: 0 }
    before.agents.a_ava.relationships.a_kellan = -1.9
    before.agents.a_kellan.relationships.a_ava = -1.9
    before.agents.a_ava.trustDamageByAgent = { a_kellan: 1.4 }
    before.agents.a_kellan.trustDamageByAgent = { a_ava: 1.4 }

    const assigned = assignTeam(before, 'case-001', 't_nightwatch')
    const produced = advanceWeek(assigned, Date.parse('2026-11-17T12:00:00.000Z'))
    expect(produced.agents.a_kellan.trustConsequenceStack).toContainEqual(
      expect.objectContaining({ consequenceType: 'disciplinary', pairAgentId: 'a_ava' })
    )
    const event = produced.events.find((entry) => entry.type === 'agency.containment_updated')
    assert.exists(event)
    expect(event.schemaVersion).toBe(2)
    expect(event.payload).toMatchObject({ fundingBefore: -5, fundingAfter: 0, fundingDelta: -347 })
    expect(validateOperationEventPayload('agency.containment_updated', event.payload).success).toBe(
      true
    )

    const firstLoad = loadGameSave(serializeGameSave(produced))
    const secondLoad = loadGameSave(serializeGameSave(firstLoad))
    for (const state of [firstLoad, secondLoad]) {
      expect(state.events.find((entry) => entry.id === event.id)).toEqual(event)
      expect([state.funding, state.agency?.funding, state.agency?.fundingState?.funding]).toEqual([
        4, 4, 4,
      ])
    }
  })
})
