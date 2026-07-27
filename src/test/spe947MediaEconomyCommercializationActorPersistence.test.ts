import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE,
} from '../domain/spe947MediaEconomyContinuity'
import {
  listSpe947MediaEconomyCommercializationActors,
  sanitizeSpe947MediaEconomyCommercializationActors,
  sanitizeSpe947MediaEconomyLastWeeklyTickWeek,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS_MAP,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE,
} from '../domain/spe947MediaEconomySimulator'
import { applyWeeklySpe947MediaEconomyTick } from '../domain/spe947MediaEconomyWeeklyOrchestration'
import { advanceWeek } from '../domain/sim/advanceWeek'

function freezeCasesForQuietWeek(state: ReturnType<typeof createStartingState>) {
  for (const currentCase of Object.values(state.cases)) {
    currentCase.status = 'open'
    currentCase.assignedTeamIds = []
    currentCase.requiredTags = []
    currentCase.preferredTags = []
    currentCase.weeksRemaining = undefined
  }
}

describe('spe947MediaEconomyCommercializationActorPersistence (SPE-2616 / SPE-947)', () => {
  it('defaults starting state to empty commercialization-actor map', () => {
    const state = createStartingState()

    expect(state.spe947MediaEconomyCommercializationActors).toEqual({})
    expect(state.spe947MediaEconomyLastWeeklyTickWeek).toBeUndefined()
  })

  it('empty defaults do not throw or falsely satisfy orchestration AC', () => {
    const state = createStartingState()

    expect(() =>
      applyWeeklySpe947MediaEconomyTick({
        actors: listSpe947MediaEconomyCommercializationActors(
          state.spe947MediaEconomyCommercializationActors
        ),
        maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps,
        week: 5,
      })
    ).not.toThrow()

    const result = applyWeeklySpe947MediaEconomyTick({
      actors: listSpe947MediaEconomyCommercializationActors(
        state.spe947MediaEconomyCommercializationActors
      ),
      maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_THREE_PATH_AGGREGATE_FIXTURE.maps,
      week: 5,
    })

    expect(result.status).toBe('empty_actors')
    expect(result.aggregate.anyRemainsRisky).toBe(false)
  })

  it('preserves explicitly empty actor map over non-empty hydrate fallback', () => {
    const fallback = createStartingState()
    fallback.spe947MediaEconomyCommercializationActors =
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS_MAP

    const hydrated = hydrateGame(
      {
        ...createStartingState(),
        spe947MediaEconomyCommercializationActors: {},
      },
      fallback
    )

    expect(hydrated.spe947MediaEconomyCommercializationActors).toEqual({})
  })

  it('drops invalid actors and duplicate-id entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe947MediaEconomyCommercializationActors({
      valid: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
      duplicate: {
        ...SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
        label: 'duplicate should lose',
      },
      badFactor: {
        id: 'actor:bad-factor',
        label: 'Bad factor',
        continuityBindingId: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id,
        actorWorsenFactor: 0.5,
      },
      missingBinding: {
        id: 'actor:missing-binding',
        label: 'Missing binding',
        continuityBindingId: '',
        actorWorsenFactor: 2,
      },
    })

    expect(Object.keys(sanitized)).toEqual([SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR.id])
    expect(sanitized[SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR.id]).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR
    )
  })

  it('drops proto-pollution keys during sanitize', () => {
    const protoPollution = sanitizeSpe947MediaEconomyCommercializationActors({
      polluted: {
        id: '__proto__',
        label: 'Proto pollution attempt',
        continuityBindingId: 'bind:proto',
        actorWorsenFactor: 2,
      },
      valid: SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
    })

    expect(Object.prototype.hasOwnProperty.call(protoPollution, '__proto__')).toBe(false)
    expect(Object.keys(protoPollution)).toEqual([SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id])
  })

  it('lists persisted actors in code-unit id order', () => {
    const actors = listSpe947MediaEconomyCommercializationActors(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS_MAP
    )

    expect(actors.map((actor) => actor.id)).toEqual([
      SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id,
      SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR.id,
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR.id,
    ])
  })

  it('round-trips actor map and tick stamp through serialize/hydrate', () => {
    const state = createStartingState()
    state.spe947MediaEconomyCommercializationActors =
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS_MAP
    state.spe947MediaEconomyLastWeeklyTickWeek = 6

    const loaded = hydrateGame(loadGameSave(serializeGameSave(state)), createStartingState())

    expect(loaded.spe947MediaEconomyCommercializationActors).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS_MAP
    )
    expect(loaded.spe947MediaEconomyLastWeeklyTickWeek).toBe(6)
  })

  it('sanitizeSpe947MediaEconomyLastWeeklyTickWeek rejects invalid stamps', () => {
    expect(sanitizeSpe947MediaEconomyLastWeeklyTickWeek(0, 3)).toBe(3)
    expect(sanitizeSpe947MediaEconomyLastWeeklyTickWeek(1.5, 3)).toBe(3)
    expect(sanitizeSpe947MediaEconomyLastWeeklyTickWeek(Number.NaN, 3)).toBe(3)
    expect(sanitizeSpe947MediaEconomyLastWeeklyTickWeek(8, 3)).toBe(8)
  })
})

describe('advanceWeek SPE-947 media-economy persisted actors (SPE-2616)', () => {
  it('orchestrates week-close over persisted actors without mutating economy maps', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 6
    state.spe947PostCaseMediaCases = {
      [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
        EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
    }
    state.spe947MediaEconomyWeights = {
      ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyWeights,
    }
    state.spe947MediaEconomyContinuityBindings = {
      ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyContinuityBindings,
    }
    state.spe947MediaEconomyCommercializationActors =
      SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS_MAP

    const priorWeights = structuredClone(state.spe947MediaEconomyWeights)
    const priorBindings = structuredClone(state.spe947MediaEconomyContinuityBindings)
    const priorActors = structuredClone(state.spe947MediaEconomyCommercializationActors)

    const nextState = advanceWeek(state)

    expect(nextState.spe947MediaEconomyWeights).toEqual(priorWeights)
    expect(nextState.spe947MediaEconomyContinuityBindings).toEqual(priorBindings)
    expect(nextState.spe947MediaEconomyCommercializationActors).toEqual(priorActors)
    expect(nextState.spe947MediaEconomyLastWeeklyTickWeek).toBe(7)
  })

  it('same-week re-tick is idempotent via persisted lastWeeklyTickWeek', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.week = 4
    state.spe947PostCaseMediaCases = {
      [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
        EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
    }
    state.spe947MediaEconomyWeights = {
      ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyWeights,
    }
    state.spe947MediaEconomyContinuityBindings = {
      ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyContinuityBindings,
    }
    state.spe947MediaEconomyCommercializationActors = Object.freeze({
      [SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR.id]: SPE_947_EXAMPLE_MEDIA_ECONOMY_CLIP_FARM_ACTOR,
    })

    const once = advanceWeek(state)
    const retickInput = {
      ...once,
      week: 4,
      spe947MediaEconomyCommercializationActors: once.spe947MediaEconomyCommercializationActors,
      spe947MediaEconomyLastWeeklyTickWeek: once.spe947MediaEconomyLastWeeklyTickWeek,
    }
    const reticked = advanceWeek(retickInput)

    expect(reticked.spe947MediaEconomyLastWeeklyTickWeek).toBe(once.spe947MediaEconomyLastWeeklyTickWeek)
    expect(reticked.spe947MediaEconomyCommercializationActors).toEqual(
      once.spe947MediaEconomyCommercializationActors
    )
  })

  it('still no-ops without persisted actors even when economy maps exist', () => {
    const state = createStartingState()
    freezeCasesForQuietWeek(state)
    state.spe947MediaEconomyWeights = {
      'weight:test': {
        id: 'weight:test',
        label: 'Test weight',
        continuityFactor: 2,
      },
    }
    state.spe947MediaEconomyContinuityBindings = {
      'bind:test': {
        id: 'bind:test',
        caseId: 'case:test',
        economyWeightId: 'weight:test',
      },
    }

    const nextState = advanceWeek(state)

    expect(nextState.spe947MediaEconomyLastWeeklyTickWeek).toBeUndefined()
    expect(listSpe947MediaEconomyCommercializationActors(
      nextState.spe947MediaEconomyCommercializationActors
    )).toEqual([])
  })
})
