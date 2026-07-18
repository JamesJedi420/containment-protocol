import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { EXAMPLE_MEMORY_STABILIZATION_CHANNEL } from '../domain/collectiveMemoryStabilization'
import { EXAMPLE_SURVIVOR_REGISTRY } from '../domain/survivorInformalRegistry'
import {
  resolvePersistedCollectiveMemoryChannel,
  resolvePersistedSurvivorInformalRegistry,
  sanitizeSpe956CollectiveMemoryChannelRecords,
  sanitizeSpe956SurvivorInformalRegistryRecords,
  SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
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

describe('spe956ParticipatoryChannelPersistence (SPE-2633 / SPE-956 slice 2)', () => {
  it('defaults starting state to empty spe956CollectiveMemoryChannelRecords', () => {
    expect(createStartingState().spe956CollectiveMemoryChannelRecords).toEqual({})
  })

  it('returns explicit empty map instead of fallback during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS

    expect(sanitizeSpe956CollectiveMemoryChannelRecords({}, fallback)).toEqual({})
    expect(sanitizeSpe956CollectiveMemoryChannelRecords({}, fallback)).not.toBe(fallback)
    expect(
      Object.getPrototypeOf(sanitizeSpe956CollectiveMemoryChannelRecords({}, fallback))
    ).toBeNull()
  })

  it('returns fallback only for non-record / missing input during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS

    expect(sanitizeSpe956CollectiveMemoryChannelRecords(null, fallback)).toBe(fallback)
    expect(sanitizeSpe956CollectiveMemoryChannelRecords(undefined, fallback)).toBe(fallback)
    expect(sanitizeSpe956CollectiveMemoryChannelRecords('not-a-record', fallback)).toBe(fallback)
  })

  it('rejects unsafe channel ids and preserves valid records in mixed input', () => {
    const unsafeIds = ['__proto__', 'constructor', 'prototype'] as const

    for (const unsafeId of unsafeIds) {
      const polluted = sanitizeSpe956CollectiveMemoryChannelRecords({
        polluted: {
          id: unsafeId,
          narrativeStance: 'shared_survivor',
          recallWindow: 'active_session',
          credibilityCeiling: 'community_weak',
          stabilizationRule: 'open_shared',
        },
      })

      expect(Object.prototype.hasOwnProperty.call(polluted, unsafeId)).toBe(false)
      expect(Object.keys(polluted)).toEqual([])
    }

    const mixed = sanitizeSpe956CollectiveMemoryChannelRecords({
      valid: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      polluted: {
        id: '__proto__',
        narrativeStance: 'shared_survivor',
        recallWindow: 'active_session',
        credibilityCeiling: 'community_weak',
        stabilizationRule: 'open_shared',
      },
    })

    expect(mixed[EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id]).toEqual(
      EXAMPLE_MEMORY_STABILIZATION_CHANNEL
    )
    expect(Object.prototype.hasOwnProperty.call(mixed, '__proto__')).toBe(false)
    expect(Object.keys(mixed)).toEqual([EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id])
  })

  it('drops invalid and duplicate channel entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe956CollectiveMemoryChannelRecords({
      valid: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
      duplicate: {
        ...EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
        narrativeStance: 'community_oral',
      },
      missingId: {
        id: '',
        narrativeStance: 'shared_survivor',
        recallWindow: 'active_session',
        credibilityCeiling: 'community_weak',
        stabilizationRule: 'open_shared',
      },
      badEnum: {
        id: 'channel:bad-enum',
        narrativeStance: 'not_a_stance',
        recallWindow: 'active_session',
        credibilityCeiling: 'community_weak',
        stabilizationRule: 'open_shared',
      },
      notRecord: 'skip-me',
    })

    expect(sanitized[EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id]).toEqual(
      EXAMPLE_MEMORY_STABILIZATION_CHANNEL
    )
    expect(sanitized['channel:bad-enum']).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id])
  })

  it('hydrated EXAMPLE collective memory channel shape is frozen', () => {
    const sanitized = sanitizeSpe956CollectiveMemoryChannelRecords({
      valid: { ...EXAMPLE_MEMORY_STABILIZATION_CHANNEL },
    })
    const record = sanitized[EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id]

    expect(record).toEqual(EXAMPLE_MEMORY_STABILIZATION_CHANNEL)
    expect(Object.isFrozen(record)).toBe(true)
  })

  it('resolvePersistedCollectiveMemoryChannel ignores inherited keys and unsafe ids', () => {
    const channelId = EXAMPLE_MEMORY_STABILIZATION_CHANNEL.id
    const ownRecords = Object.create(null) as Record<string, unknown>
    ownRecords[channelId] = EXAMPLE_MEMORY_STABILIZATION_CHANNEL

    expect(
      resolvePersistedCollectiveMemoryChannel(
        { spe956CollectiveMemoryChannelRecords: ownRecords },
        channelId
      )
    ).toEqual(EXAMPLE_MEMORY_STABILIZATION_CHANNEL)

    const prototypeOnlyId = 'channel:prototype-only'
    const prototypeBacked = Object.create({
      [prototypeOnlyId]: EXAMPLE_MEMORY_STABILIZATION_CHANNEL,
    }) as Record<string, unknown>

    expect(
      resolvePersistedCollectiveMemoryChannel(
        { spe956CollectiveMemoryChannelRecords: prototypeBacked },
        prototypeOnlyId
      )
    ).toBeNull()

    for (const unsafeId of ['__proto__', 'constructor', 'prototype'] as const) {
      const records = Object.create(null) as Record<string, unknown>
      records[unsafeId] = EXAMPLE_MEMORY_STABILIZATION_CHANNEL
      expect(
        resolvePersistedCollectiveMemoryChannel(
          { spe956CollectiveMemoryChannelRecords: records },
          unsafeId
        )
      ).toBeNull()
    }
  })

  it('hydrates explicit empty collective memory records over fallback during import', () => {
    const fallback = createStartingState()
    Object.assign(fallback, {
      spe956CollectiveMemoryChannelRecords: SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
    })

    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956CollectiveMemoryChannelRecords: {},
      },
      fallback
    )

    expect(hydrated.spe956CollectiveMemoryChannelRecords).toEqual({})
  })

  it('round-trips EXAMPLE collective memory channel records through save/load', () => {
    const state = createStartingState()
    Object.assign(state, {
      spe956CollectiveMemoryChannelRecords: SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956CollectiveMemoryChannelRecords).toEqual(
      SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS
    )
  })

  it('hydrates persisted collective memory channel records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956CollectiveMemoryChannelRecords: {
          ...SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
          invalid: {
            id: 'channel:invalid',
            narrativeStance: 'not_valid',
            recallWindow: 'active_session',
            credibilityCeiling: 'community_weak',
            stabilizationRule: 'open_shared',
          },
        },
      },
      fallback
    )

    expect(hydrated.spe956CollectiveMemoryChannelRecords).toEqual(
      SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS
    )
  })
})
