import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyFacilityMaintenanceRecovery,
  parseFacilityMaintenanceRecoveryResources,
} from '../domain/facilityMaintenanceRecovery'
import { resolveFacilityMaintenanceWeekClose } from '../domain/facilityMaintenanceWeekClose'
import { FACILITY_ROOM_IDS, parseFacilityLayoutSnapshot } from '../domain/facilityLayoutStrategy'
import { advanceWeek } from '../domain/sim/advanceWeek'
import {
  hydrateGame,
  parseRunExport,
  serializeRunExport,
  GAME_STORE_VERSION,
  createRunFromCurrentConfig,
  migratePersistedStore,
} from '../app/store/runTransfer'

function campaign(debt = 30, maintenanceHours = 27, partsReserve = 16) {
  return {
    ...createStartingState(),
    week: 5,
    facilityMaintenanceState: { maintenanceDebt: debt, lastProcessedWeek: 5 },
    facilityMaintenanceRecoveryResources: { maintenanceHours, partsReserve },
  }
}

describe('SPE-3184 facility recovery resource authority', () => {
  it.each([
    [8, 4, 2],
    [18, 10, 6],
    [30, 20, 12],
  ])('applies exact debit for debt %i atomically, including exhaustion', (debt, hours, parts) => {
    const game = campaign(debt, hours, parts)
    const before = structuredClone(game)
    Object.freeze(game.facilityMaintenanceState)
    Object.freeze(game.facilityMaintenanceRecoveryResources)
    Object.freeze(game)
    const result = applyFacilityMaintenanceRecovery(game)
    expect(result.status).toBe('recovered')
    expect(result.game).not.toBe(game)
    expect(result.game).toEqual({
      ...before,
      facilityMaintenanceState: { maintenanceDebt: 0, lastProcessedWeek: 5 },
      facilityMaintenanceRecoveryResources: { maintenanceHours: 0, partsReserve: 0 },
    })
    expect(game).toEqual(before)
    expect(result).toEqual(applyFacilityMaintenanceRecovery(game))
    expect(Object.isFrozen(result.game.facilityMaintenanceRecoveryResources)).toBe(true)
    const replay = applyFacilityMaintenanceRecovery(result.game)
    expect(replay.status).toBe('not_required')
    expect(replay.game).toBe(result.game)
  })

  it.each([
    [8, 3, 2],
    [8, 4, 1],
    [18, 9, 6],
    [18, 10, 5],
    [30, 19, 12],
    [30, 20, 11],
    [30, 0, 0],
  ])('retains both authorities for insufficient debt %i budget %i/%i', (debt, hours, parts) => {
    const game = campaign(debt, hours, parts)
    const before = structuredClone(game)
    const result = applyFacilityMaintenanceRecovery(game)
    expect(result.status).toBe('insufficient_resources')
    expect(result.game).toBe(game)
    expect(game).toEqual(before)
  })

  const malformed = [
    undefined,
    null,
    [],
    {},
    { maintenanceHours: 20 },
    { maintenanceHours: -1, partsReserve: 12 },
    { maintenanceHours: 1.5, partsReserve: 12 },
    { maintenanceHours: 20, partsReserve: Infinity },
    { maintenanceHours: Number.MAX_SAFE_INTEGER + 1, partsReserve: 12 },
    Object.create({ maintenanceHours: 20, partsReserve: 12 }),
  ]
  it.each(malformed.map((value) => [value]))(
    'rejects invalid budget %j without fallback resources',
    (value) => {
      const game = campaign()
      Object.assign(game, { facilityMaintenanceRecoveryResources: value })
      expect(parseFacilityMaintenanceRecoveryResources(value)).toBeUndefined()
      const result = applyFacilityMaintenanceRecovery(game)
      expect(result.status).toBe('invalid')
      expect(result.game).toBe(game)
      expect(hydrateGame(game, campaign()).facilityMaintenanceRecoveryResources).toBeUndefined()
    }
  )

  it('rejects absent, malformed, and future maintenance state and invalid campaign week', () => {
    for (const value of [undefined, {}, { maintenanceDebt: 30, lastProcessedWeek: 6 }]) {
      const game = campaign()
      Object.assign(game, { facilityMaintenanceState: value })
      expect(applyFacilityMaintenanceRecovery(game)).toMatchObject({ status: 'invalid', game })
      expect(applyFacilityMaintenanceRecovery(game).game).toBe(game)
    }
    expect(applyFacilityMaintenanceRecovery({ ...campaign(), week: NaN }).status).toBe('invalid')
  })

  it('retains stable debt and the original game', () => {
    const game = campaign(7)
    expect(applyFacilityMaintenanceRecovery(game).status).toBe('not_required')
    expect(applyFacilityMaintenanceRecovery(game).game).toBe(game)
  })

  it('hydrates detached frozen budgets and preserves explicit zero without provisioning legacy saves', () => {
    const game = campaign(30, 0, 0)
    const hydrated = hydrateGame(game)
    expect(hydrated.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 0,
      partsReserve: 0,
    })
    expect(hydrated.facilityMaintenanceRecoveryResources).not.toBe(
      game.facilityMaintenanceRecoveryResources
    )
    expect(Object.isFrozen(hydrated.facilityMaintenanceRecoveryResources)).toBe(true)
    const legacy = createStartingState()
    delete legacy.facilityMaintenanceRecoveryResources
    expect(
      hydrateGame(legacy, createStartingState()).facilityMaintenanceRecoveryResources
    ).toBeUndefined()
    const parsed = parseFacilityMaintenanceRecoveryResources(
      game.facilityMaintenanceRecoveryResources
    )!
    game.facilityMaintenanceRecoveryResources.maintenanceHours = 99
    expect(parsed.maintenanceHours).toBe(0)
  })

  it('provisions independent fresh and configured campaigns without debiting other resource owners', () => {
    const first = createStartingState()
    const second = createStartingState()
    const configured = createRunFromCurrentConfig(first.config, 42)
    for (const game of [first, second, configured]) {
      expect(game.facilityMaintenanceRecoveryResources).toEqual({
        maintenanceHours: 10,
        partsReserve: 6,
      })
      expect(game.agency?.maintenanceSpecialistsAvailable).toBe(2)
      expect(game.funding).toBe(110)
      expect(game.facilityStockpile).toBeUndefined()
      expect(game.facilityMaintenanceState).toBeUndefined()
    }
    expect(first.facilityMaintenanceRecoveryResources).not.toBe(
      second.facilityMaintenanceRecoveryResources
    )
    first.facilityMaintenanceRecoveryResources!.maintenanceHours = 0
    expect(second.facilityMaintenanceRecoveryResources!.maintenanceHours).toBe(10)
    expect(configured.facilityMaintenanceRecoveryResources!.maintenanceHours).toBe(10)
  })

  it('never grants absent or malformed budgets on existing campaign import or migration', () => {
    for (const budget of [undefined, { maintenanceHours: -1, partsReserve: 6 }]) {
      const legacy = {
        ...createStartingState(),
        week: 5,
        facilityMaintenanceRecoveryResources: budget,
      }
      // Use the production exporter so this test follows the canonical envelope.
      const exported = JSON.parse(serializeRunExport(createStartingState()))
      exported.game = legacy
      expect(
        parseRunExport(JSON.stringify(exported)).facilityMaintenanceRecoveryResources
      ).toBeUndefined()
      expect(
        migratePersistedStore({ game: legacy }, GAME_STORE_VERSION).game
          .facilityMaintenanceRecoveryResources
      ).toBeUndefined()
    }
    expect(hydrateGame(null).facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 10,
      partsReserve: 6,
    })
    expect(
      migratePersistedStore({}, GAME_STORE_VERSION).game.facilityMaintenanceRecoveryResources
    ).toEqual({ maintenanceHours: 10, partsReserve: 6 })
  })

  it('funds a degraded repair without refilling after reload or later week close', () => {
    const game = {
      ...createStartingState(),
      week: 5,
      facilityMaintenanceState: { maintenanceDebt: 18, lastProcessedWeek: 5 },
    }
    const recovered = applyFacilityMaintenanceRecovery(game)
    expect(recovered.status).toBe('recovered')
    const loaded = parseRunExport(serializeRunExport(recovered.game))
    expect(loaded.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 0,
      partsReserve: 0,
    })
    expect(advanceWeek(loaded, Date.UTC(2026, 9, 5)).facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 0,
      partsReserve: 0,
    })
    expect(applyFacilityMaintenanceRecovery(loaded).game).toBe(loaded)
    const next = resolveFacilityMaintenanceWeekClose(undefined, loaded.facilityMaintenanceState, 6)
    expect(next.state?.lastProcessedWeek).toBe(6)
    expect(loaded.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 0,
      partsReserve: 0,
    })
    expect(
      applyFacilityMaintenanceRecovery({
        ...game,
        facilityMaintenanceState: { maintenanceDebt: 30, lastProcessedWeek: 5 },
      }).status
    ).toBe('insufficient_resources')
  })

  it('round trips budgets and recovered debt without charging again after reload', () => {
    expect(GAME_STORE_VERSION).toBe(7)
    const loaded = parseRunExport(serializeRunExport(campaign()))
    expect(loaded.facilityMaintenanceRecoveryResources).toEqual(
      campaign().facilityMaintenanceRecoveryResources
    )
    const recovered = applyFacilityMaintenanceRecovery(loaded)
    expect(recovered.status).toBe('recovered')
    const reloaded = parseRunExport(serializeRunExport(recovered.game))
    expect(reloaded.facilityMaintenanceState).toEqual({ maintenanceDebt: 0, lastProcessedWeek: 5 })
    expect(reloaded.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 7,
      partsReserve: 4,
    })
    expect(applyFacilityMaintenanceRecovery(reloaded).game).toBe(reloaded)
  })

  it('preserves every unrelated authority and composes with replay and later accrual', () => {
    const starting = campaign()
    const game = {
      ...starting,
      agency: { ...starting.agency!, maintenanceSpecialistsAvailable: 7 },
      facilityStockpile: { blast_door_hinge_seal: 9, pressure_seal_gasket: 11 },
    }
    const result = applyFacilityMaintenanceRecovery(game)
    for (const key of Object.keys(game) as (keyof typeof game)[]) {
      if (key !== 'facilityMaintenanceState' && key !== 'facilityMaintenanceRecoveryResources') {
        expect(result.game[key]).toBe(game[key])
      }
    }
    const layout = parseFacilityLayoutSnapshot({
      archetype: 'compact_headquarters',
      rooms: FACILITY_ROOM_IDS.slice(0, 4).map((roomId) => ({ roomId, adjacentToCritical: true })),
    })
    expect(
      resolveFacilityMaintenanceWeekClose(layout, game.facilityMaintenanceState, 5)
        .dependencyAvailability
    ).toBe('unavailable')
    for (const week of [4, 5]) {
      const replay = resolveFacilityMaintenanceWeekClose(
        layout,
        result.game.facilityMaintenanceState,
        week
      )
      expect(replay.accruedDebt).toBe(0)
      expect(replay.dependencies).toBeUndefined()
    }
    const later = resolveFacilityMaintenanceWeekClose(
      layout,
      result.game.facilityMaintenanceState,
      6
    )
    expect(later.state).toEqual({ maintenanceDebt: 8, lastProcessedWeek: 6 })
    expect(later.dependencyAvailability).toBe('degraded')
  })
})
