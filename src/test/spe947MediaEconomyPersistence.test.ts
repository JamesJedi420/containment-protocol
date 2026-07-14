import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  composeSpe947MediaEconomyContinuityReadings,
  sanitizeSpe947MediaEconomyContinuityBindings,
  sanitizeSpe947MediaEconomyWeights,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
  EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
} from '../domain/spe947MediaEconomyContinuity'

describe('spe947MediaEconomyPersistence (SPE-2610 / SPE-947)', () => {
  it('defaults starting state to empty media-economy continuity maps', () => {
    const state = createStartingState()

    expect(state.spe947MediaEconomyWeights).toEqual({})
    expect(state.spe947MediaEconomyContinuityBindings).toEqual({})
  })

  it('empty defaults do not throw or falsely satisfy continuity AC', () => {
    const state = createStartingState()

    expect(() =>
      composeSpe947MediaEconomyContinuityReadings({
        maps: {
          spe947MediaEconomyWeights: state.spe947MediaEconomyWeights,
          spe947MediaEconomyContinuityBindings: state.spe947MediaEconomyContinuityBindings,
        },
      })
    ).not.toThrow()

    expect(
      composeSpe947MediaEconomyContinuityReadings({
        maps: {
          spe947MediaEconomyWeights: state.spe947MediaEconomyWeights,
          spe947MediaEconomyContinuityBindings: state.spe947MediaEconomyContinuityBindings,
        },
      })
    ).toEqual([])
  })

  it('preserves explicitly empty maps over non-empty hydrate fallback', () => {
    const fallback = createStartingState()
    Object.assign(fallback, SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE)

    const hydrated = hydrateGame(
      {
        ...createStartingState(),
        spe947MediaEconomyWeights: {},
        spe947MediaEconomyContinuityBindings: {},
      },
      fallback
    )

    expect(hydrated.spe947MediaEconomyWeights).toEqual({})
    expect(hydrated.spe947MediaEconomyContinuityBindings).toEqual({})
  })

  it('drops invalid factors and duplicate-id entries during sanitize without throwing', () => {
    const sanitizedWeights = sanitizeSpe947MediaEconomyWeights({
      valid: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
      duplicate: {
        ...SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT,
        label: 'duplicate should lose',
      },
      badFactor: {
        id: 'economy:bad-factor',
        label: 'Bad factor',
        continuityFactor: -1,
      },
      badProfit: {
        id: 'economy:bad-profit',
        label: 'Bad profit',
        continuityFactor: 1,
        profitIncentive: Number.NaN,
      },
      emptyId: {
        id: '',
        label: 'Missing id',
        continuityFactor: 1,
      },
    })

    expect(sanitizedWeights[SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id]).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT
    )
    expect(sanitizedWeights['economy:bad-factor']).toBeUndefined()
    expect(sanitizedWeights['economy:bad-profit']).toBeUndefined()
    expect(Object.keys(sanitizedWeights)).toEqual([SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id])

    const sanitizedBindings = sanitizeSpe947MediaEconomyContinuityBindings({
      valid: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
      duplicate: {
        ...SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
        caseId: 'case:other',
      },
      missingWeight: {
        id: 'spe947-media-economy:missing-weight',
        caseId: 'case:x',
        economyWeightId: '',
      },
    })

    expect(sanitizedBindings[SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id]).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING
    )
    expect(sanitizedBindings['spe947-media-economy:missing-weight']).toBeUndefined()
    expect(Object.keys(sanitizedBindings)).toEqual([
      SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id,
    ])
  })

  it('round-trips authored weight and binding through save/load', () => {
    const state = createStartingState()
    Object.assign(state, SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE)
    state.spe947PostCaseMediaCases = {
      [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
        EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe947MediaEconomyWeights).toEqual(state.spe947MediaEconomyWeights)
    expect(loaded.spe947MediaEconomyContinuityBindings).toEqual(
      state.spe947MediaEconomyContinuityBindings
    )

    const readings = composeSpe947MediaEconomyContinuityReadings({
      maps: {
        spe947PostCaseMediaCases: loaded.spe947PostCaseMediaCases,
        spe947MediaEconomyWeights: loaded.spe947MediaEconomyWeights,
        spe947MediaEconomyContinuityBindings: loaded.spe947MediaEconomyContinuityBindings,
      },
    })

    expect(readings).toHaveLength(1)
    expect(readings[0]?.status).toBe('modulated')
    expect(readings[0]?.remainsRisky).toBe(true)
  })

  it('hydrates media-economy maps through import parsing and drops invalids', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE,
        spe947MediaEconomyWeights: {
          ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyWeights,
          invalid: {
            id: 'economy:invalid',
            label: 'Invalid',
            continuityFactor: -2,
          },
        },
        spe947MediaEconomyContinuityBindings: {
          ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyContinuityBindings,
          invalid: {
            id: 'spe947-media-economy:invalid',
            caseId: '',
            economyWeightId: SPE_947_EXAMPLE_MEDIA_ECONOMY_WEIGHT.id,
          },
        },
      },
      fallback
    )

    expect(hydrated.spe947MediaEconomyWeights).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyWeights
    )
    expect(hydrated.spe947MediaEconomyContinuityBindings).toEqual(
      SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE.spe947MediaEconomyContinuityBindings
    )
  })
})
