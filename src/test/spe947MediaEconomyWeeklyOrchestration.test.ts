import { describe, expect, it } from 'vitest'
import {
  applyWeeklySpe947MediaEconomyTick,
  hasSpe947MediaEconomyWeeklyDelta,
} from '../domain/spe947MediaEconomyWeeklyOrchestration'
import {
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE,
} from '../domain/spe947MediaEconomySimulator'

describe('spe947MediaEconomyWeeklyOrchestration (SPE-2615 / SPE-947)', () => {
  it('is a no-op for empty actors without throwing or false AC', () => {
    const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
    const result = applyWeeklySpe947MediaEconomyTick({
      actors: [],
      maps,
      week: 12,
    })

    expect(result.status).toBe('empty_actors')
    expect(result.aggregate.status).toBe('empty_actors')
    expect(result.aggregate.anyRemainsRisky).toBe(false)
    expect(result.maps).toBe(maps)
    expect(result.mapsMutated).toBe(false)
    expect(result.lastWeeklyTickWeek).toBeUndefined()
    expect(hasSpe947MediaEconomyWeeklyDelta(maps)).toBe(false)
  })

  it('is a no-op for empty / missing maps without throwing or false AC', () => {
    const emptyMaps = {
      spe947MediaEconomyWeights: {},
      spe947MediaEconomyContinuityBindings: {},
    }
    const empty = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps: emptyMaps,
      week: 3,
    })
    const missing = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps: null,
      week: 3,
    })

    expect(empty.status).toBe('empty_maps')
    expect(empty.aggregate.anyRemainsRisky).toBe(false)
    expect(empty.maps).toBe(emptyMaps)
    expect(empty.mapsMutated).toBe(false)
    expect(missing.status).toBe('empty_maps')
    expect(missing.aggregate.anyRemainsRisky).toBe(false)
    expect(missing.mapsMutated).toBe(false)
  })

  it('orchestrates week-close read over three-path aggregate without mutating maps', () => {
    const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
    const result = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps,
      week: 7,
    })

    expect(result.status).toBe('orchestrated')
    expect(result.week).toBe(7)
    expect(result.lastWeeklyTickWeek).toBe(7)
    expect(result.maps).toBe(maps)
    expect(result.mapsMutated).toBe(false)
    expect(result.aggregate.status).toBe('cross_path_aggregate')
    expect(result.aggregate.anyRemainsRisky).toBe(true)
    expect(result.aggregate.worseActorId).toBe(SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id)
    expect(result.aggregate.worsePersistenceRiskScore).toBe(13)
    expect(result.aggregate.multiPath.actorIdsInOrder).toEqual([
      'actor:clip-farm-reseller',
      'actor:livestream-tour-promoter',
      'actor:merch-attention-promoter',
    ])
  })

  it('same-week re-tick is idempotent (already_ticked) without map mutation', () => {
    const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
    const first = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps,
      week: 9,
    })
    const second = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps,
      week: 9,
      lastWeeklyTickWeek: first.lastWeeklyTickWeek,
    })

    expect(first.status).toBe('orchestrated')
    expect(second.status).toBe('already_ticked')
    expect(second.lastWeeklyTickWeek).toBe(9)
    expect(second.maps).toBe(maps)
    expect(second.mapsMutated).toBe(false)
    expect(second.aggregate.worseActorId).toBe(first.aggregate.worseActorId)
    expect(second.aggregate.worsePersistenceRiskScore).toBe(
      first.aggregate.worsePersistenceRiskScore
    )
  })

  it('actor input order does not change worse pick (code-unit order)', () => {
    const maps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
    const reversed = [...SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS].reverse()
    const fromAuthored = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps,
      week: 4,
    })
    const fromReversed = applyWeeklySpe947MediaEconomyTick({
      actors: reversed,
      maps,
      week: 4,
    })

    expect(fromAuthored.aggregate.worseActorId).toBe(fromReversed.aggregate.worseActorId)
    expect(fromAuthored.aggregate.multiPath.actorIdsInOrder).toEqual(
      fromReversed.aggregate.multiPath.actorIdsInOrder
    )
  })

  it('non-finite week normalizes to 1', () => {
    const result = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps,
      week: Number.NaN,
    })

    expect(result.week).toBe(1)
    expect(result.lastWeeklyTickWeek).toBe(1)
    expect(result.status).toBe('orchestrated')
  })

  it('orchestrates with mapsMutated when authored weight delta applies (SPE-2617)', () => {
    const baseMaps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
    const maps = {
      ...baseMaps,
      spe947MediaEconomyWeights: Object.freeze({
        ...baseMaps.spe947MediaEconomyWeights,
        'economy:merch-attention-boost': Object.freeze({
          ...baseMaps.spe947MediaEconomyWeights!['economy:merch-attention-boost']!,
          weeklyContinuityFactorDelta: 0.25,
        }),
      }),
    }

    expect(hasSpe947MediaEconomyWeeklyDelta(maps)).toBe(true)

    const result = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps,
      week: 11,
    })

    expect(result.status).toBe('orchestrated')
    expect(result.mapsMutated).toBe(true)
    expect(result.maps).not.toBe(maps)
    expect(
      result.maps.spe947MediaEconomyWeights?.['economy:merch-attention-boost']?.continuityFactor
    ).toBe(2.25)
  })

  it('same-week re-tick does not double-apply authored deltas (SPE-2617)', () => {
    const baseMaps = SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps
    const maps = {
      ...baseMaps,
      spe947MediaEconomyWeights: Object.freeze({
        ...baseMaps.spe947MediaEconomyWeights,
        'economy:merch-attention-boost': Object.freeze({
          ...baseMaps.spe947MediaEconomyWeights!['economy:merch-attention-boost']!,
          weeklyContinuityFactorDelta: 1,
        }),
      }),
    }

    const first = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps,
      week: 5,
    })
    const second = applyWeeklySpe947MediaEconomyTick({
      actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_ACTORS,
      maps: first.maps,
      week: 5,
      lastWeeklyTickWeek: first.lastWeeklyTickWeek,
    })

    expect(first.mapsMutated).toBe(true)
    expect(
      first.maps.spe947MediaEconomyWeights?.['economy:merch-attention-boost']?.continuityFactor
    ).toBe(3)
    expect(second.status).toBe('already_ticked')
    expect(second.mapsMutated).toBe(false)
    expect(second.maps).toBe(first.maps)
    expect(
      second.maps.spe947MediaEconomyWeights?.['economy:merch-attention-boost']?.continuityFactor
    ).toBe(3)
  })
})
