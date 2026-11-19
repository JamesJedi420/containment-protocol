import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { getGlobalStateMetrics } from '../../features/dashboard/dashboardView'
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
        expect(state.agency.funding, stage).toBe(57)
        expect(state.agency.fundingState?.funding, stage).toBe(57)
        expect(state.agency.fundingState?.fundingHistory, stage).toEqual(expectedHistory)
      }

      for (const state of [produced, firstLoad, secondLoad]) {
        expect(getGlobalStateMetrics(state).funding).toBe(57)
      }
      expect(secondLoad.events).toEqual(firstLoad.events)
    } finally {
      vi.useRealTimers()
    }
  })
})
