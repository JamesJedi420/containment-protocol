import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { EXAMPLE_SURVIVOR_REGISTRY } from '../domain/survivorInformalRegistry'
import {
  resolvePersistedSurvivorInformalRegistry,
  sanitizeSpe956SurvivorInformalRegistryRecords,
  SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
} from '../domain/spe956ParticipatoryChannelPersistence'

describe('spe956ParticipatoryChannelPersistence (SPE-2632 / SPE-956 slice 1)', () => {
  it('defaults starting state to empty spe956SurvivorInformalRegistryRecords', () => {
    expect(createStartingState().spe956SurvivorInformalRegistryRecords).toEqual({})
  })

  it('returns explicit empty map instead of fallback during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS

    expect(sanitizeSpe956SurvivorInformalRegistryRecords({}, fallback)).toEqual({})
    expect(sanitizeSpe956SurvivorInformalRegistryRecords({}, fallback)).not.toBe(fallback)
    expect(
      Object.getPrototypeOf(sanitizeSpe956SurvivorInformalRegistryRecords({}, fallback))
    ).toBeNull()
  })

  it('returns fallback only for non-record / missing input during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS

    expect(sanitizeSpe956SurvivorInformalRegistryRecords(null, fallback)).toBe(fallback)
    expect(sanitizeSpe956SurvivorInformalRegistryRecords(undefined, fallback)).toBe(fallback)
    expect(sanitizeSpe956SurvivorInformalRegistryRecords('not-a-record', fallback)).toBe(fallback)
  })

  it('rejects unsafe registry ids and preserves valid records in mixed input', () => {
    const unsafeIds = ['__proto__', 'constructor', 'prototype'] as const

    for (const unsafeId of unsafeIds) {
      const polluted = sanitizeSpe956SurvivorInformalRegistryRecords({
        polluted: {
          id: unsafeId,
          recognitionStance: 'institution_refused',
          catalogRule: 'open_community',
          supportKnowledgeBand: 'peer_shared',
          credibilityCeiling: 'community_weak',
        },
      })

      expect(Object.prototype.hasOwnProperty.call(polluted, unsafeId)).toBe(false)
      expect(Object.keys(polluted)).toEqual([])
    }

    const mixed = sanitizeSpe956SurvivorInformalRegistryRecords({
      valid: EXAMPLE_SURVIVOR_REGISTRY,
      polluted: {
        id: '__proto__',
        recognitionStance: 'institution_refused',
        catalogRule: 'open_community',
        supportKnowledgeBand: 'peer_shared',
        credibilityCeiling: 'community_weak',
      },
    })

    expect(mixed[EXAMPLE_SURVIVOR_REGISTRY.id]).toEqual(EXAMPLE_SURVIVOR_REGISTRY)
    expect(Object.prototype.hasOwnProperty.call(mixed, '__proto__')).toBe(false)
    expect(Object.keys(mixed)).toEqual([EXAMPLE_SURVIVOR_REGISTRY.id])
  })

  it('drops invalid and duplicate registry entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe956SurvivorInformalRegistryRecords({
      valid: EXAMPLE_SURVIVOR_REGISTRY,
      duplicate: {
        ...EXAMPLE_SURVIVOR_REGISTRY,
        recognitionStance: 'contested',
      },
      missingId: {
        id: '',
        recognitionStance: 'institution_refused',
        catalogRule: 'open_community',
        supportKnowledgeBand: 'peer_shared',
        credibilityCeiling: 'community_weak',
      },
      badEnum: {
        id: 'registry:bad-enum',
        recognitionStance: 'not_a_stance',
        catalogRule: 'open_community',
        supportKnowledgeBand: 'peer_shared',
        credibilityCeiling: 'community_weak',
      },
      notRecord: 'skip-me',
    })

    expect(sanitized[EXAMPLE_SURVIVOR_REGISTRY.id]).toEqual(EXAMPLE_SURVIVOR_REGISTRY)
    expect(sanitized['registry:bad-enum']).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([EXAMPLE_SURVIVOR_REGISTRY.id])
  })

  it('hydrated EXAMPLE registry shape is frozen', () => {
    const sanitized = sanitizeSpe956SurvivorInformalRegistryRecords({
      valid: { ...EXAMPLE_SURVIVOR_REGISTRY },
    })
    const record = sanitized[EXAMPLE_SURVIVOR_REGISTRY.id]

    expect(record).toEqual(EXAMPLE_SURVIVOR_REGISTRY)
    expect(Object.isFrozen(record)).toBe(true)
  })

  it('resolvePersistedSurvivorInformalRegistry ignores inherited keys and unsafe ids', () => {
    const registryId = EXAMPLE_SURVIVOR_REGISTRY.id
    const ownRecords = Object.create(null) as Record<string, unknown>
    ownRecords[registryId] = EXAMPLE_SURVIVOR_REGISTRY

    expect(
      resolvePersistedSurvivorInformalRegistry(
        { spe956SurvivorInformalRegistryRecords: ownRecords },
        registryId
      )
    ).toEqual(EXAMPLE_SURVIVOR_REGISTRY)

    const prototypeOnlyId = 'registry:prototype-only'
    const prototypeBacked = Object.create({
      [prototypeOnlyId]: EXAMPLE_SURVIVOR_REGISTRY,
    }) as Record<string, unknown>

    expect(
      resolvePersistedSurvivorInformalRegistry(
        { spe956SurvivorInformalRegistryRecords: prototypeBacked },
        prototypeOnlyId
      )
    ).toBeNull()

    for (const unsafeId of ['__proto__', 'constructor', 'prototype'] as const) {
      const records = Object.create(null) as Record<string, unknown>
      records[unsafeId] = EXAMPLE_SURVIVOR_REGISTRY
      expect(
        resolvePersistedSurvivorInformalRegistry(
          { spe956SurvivorInformalRegistryRecords: records },
          unsafeId
        )
      ).toBeNull()
    }
  })

  it('hydrates explicit empty registry records over fallback during import', () => {
    const fallback = createStartingState()
    Object.assign(fallback, {
      spe956SurvivorInformalRegistryRecords: SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
    })

    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956SurvivorInformalRegistryRecords: {},
      },
      fallback
    )

    expect(hydrated.spe956SurvivorInformalRegistryRecords).toEqual({})
  })

  it('round-trips EXAMPLE registry records through save/load', () => {
    const state = createStartingState()
    Object.assign(state, {
      spe956SurvivorInformalRegistryRecords: SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956SurvivorInformalRegistryRecords).toEqual(
      SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS
    )
  })

  it('hydrates persisted registry records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956SurvivorInformalRegistryRecords: {
          ...SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS,
          invalid: {
            id: 'registry:invalid',
            recognitionStance: 'not_valid',
            catalogRule: 'open_community',
            supportKnowledgeBand: 'peer_shared',
            credibilityCeiling: 'community_weak',
          },
        },
      },
      fallback
    )

    expect(hydrated.spe956SurvivorInformalRegistryRecords).toEqual(
      SPE_956_EXAMPLE_SURVIVOR_INFORMAL_REGISTRY_RECORDS
    )
  })
})
