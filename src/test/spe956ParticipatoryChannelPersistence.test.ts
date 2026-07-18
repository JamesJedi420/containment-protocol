import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { EXAMPLE_DISCUSSION_SURFACE } from '../domain/asyncDiscussionSurface'
import { EXAMPLE_COMMUNITY_ADVISORY_BODY } from '../domain/communityAdvisoryDecisionInfluence'
import { EXAMPLE_MEMORY_STABILIZATION_CHANNEL } from '../domain/collectiveMemoryStabilization'
import { EXAMPLE_HOTLINE_CHANNEL } from '../domain/hotlineChannel'
import { EXAMPLE_SURVIVOR_REGISTRY } from '../domain/survivorInformalRegistry'
import {
  resolvePersistedAsyncDiscussionSurface,
  resolvePersistedCollectiveMemoryChannel,
  resolvePersistedCommunityAdvisoryBody,
  resolvePersistedHotlineChannel,
  resolvePersistedSurvivorInformalRegistry,
  sanitizeSpe956AsyncDiscussionSurfaceRecords,
  sanitizeSpe956CollectiveMemoryChannelRecords,
  sanitizeSpe956CommunityAdvisoryBodyRecords,
  sanitizeSpe956HotlineChannelRecords,
  sanitizeSpe956SurvivorInformalRegistryRecords,
  SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
  SPE_956_EXAMPLE_COLLECTIVE_MEMORY_CHANNEL_RECORDS,
  SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
  SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
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

describe('spe956ParticipatoryChannelPersistence (SPE-2634 / SPE-956 slice 3)', () => {
  it('defaults starting state to empty spe956HotlineChannelRecords', () => {
    expect(createStartingState().spe956HotlineChannelRecords).toEqual({})
  })

  it('returns explicit empty map instead of fallback during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS

    expect(sanitizeSpe956HotlineChannelRecords({}, fallback)).toEqual({})
    expect(sanitizeSpe956HotlineChannelRecords({}, fallback)).not.toBe(fallback)
    expect(Object.getPrototypeOf(sanitizeSpe956HotlineChannelRecords({}, fallback))).toBeNull()
  })

  it('returns fallback only for non-record / missing input during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS

    expect(sanitizeSpe956HotlineChannelRecords(null, fallback)).toBe(fallback)
    expect(sanitizeSpe956HotlineChannelRecords(undefined, fallback)).toBe(fallback)
    expect(sanitizeSpe956HotlineChannelRecords('not-a-record', fallback)).toBe(fallback)
  })

  it('rejects unsafe channel ids and preserves valid records in mixed input', () => {
    const unsafeIds = ['__proto__', 'constructor', 'prototype'] as const

    for (const unsafeId of unsafeIds) {
      const polluted = sanitizeSpe956HotlineChannelRecords({
        polluted: {
          id: unsafeId,
          scriptQuality: 0.85,
          staffingCapacity: 0.8,
          languageSupport: true,
          escalationRules: 'Escalate language gaps.',
          unansweredMode: 'queue_callback',
          angerMode: 'anger_only',
          handleThreshold: 0.5,
        },
      })

      expect(Object.prototype.hasOwnProperty.call(polluted, unsafeId)).toBe(false)
      expect(Object.keys(polluted)).toEqual([])
    }

    const mixed = sanitizeSpe956HotlineChannelRecords({
      valid: EXAMPLE_HOTLINE_CHANNEL,
      polluted: {
        id: '__proto__',
        scriptQuality: 0.85,
        staffingCapacity: 0.8,
        languageSupport: true,
        escalationRules: 'Escalate language gaps.',
        unansweredMode: 'queue_callback',
        angerMode: 'anger_only',
        handleThreshold: 0.5,
      },
    })

    expect(mixed[EXAMPLE_HOTLINE_CHANNEL.id]).toEqual(EXAMPLE_HOTLINE_CHANNEL)
    expect(Object.prototype.hasOwnProperty.call(mixed, '__proto__')).toBe(false)
    expect(Object.keys(mixed)).toEqual([EXAMPLE_HOTLINE_CHANNEL.id])
  })

  it('drops invalid and duplicate channel entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe956HotlineChannelRecords({
      valid: EXAMPLE_HOTLINE_CHANNEL,
      duplicate: {
        ...EXAMPLE_HOTLINE_CHANNEL,
        angerMode: 'deescalate',
      },
      missingId: {
        id: '',
        scriptQuality: 0.85,
        staffingCapacity: 0.8,
        languageSupport: true,
        escalationRules: 'Escalate language gaps.',
        unansweredMode: 'queue_callback',
        angerMode: 'anger_only',
        handleThreshold: 0.5,
      },
      badEnum: {
        id: 'hotline:bad-enum',
        scriptQuality: 0.85,
        staffingCapacity: 0.8,
        languageSupport: true,
        escalationRules: 'Escalate language gaps.',
        unansweredMode: 'not_a_mode',
        angerMode: 'anger_only',
        handleThreshold: 0.5,
      },
      badMetric: {
        id: 'hotline:bad-metric',
        scriptQuality: 1.5,
        staffingCapacity: 0.8,
        languageSupport: true,
        escalationRules: 'Escalate language gaps.',
        unansweredMode: 'queue_callback',
        angerMode: 'anger_only',
        handleThreshold: 0.5,
      },
      emptyRules: {
        id: 'hotline:empty-rules',
        scriptQuality: 0.85,
        staffingCapacity: 0.8,
        languageSupport: true,
        escalationRules: '   ',
        unansweredMode: 'queue_callback',
        angerMode: 'anger_only',
        handleThreshold: 0.5,
      },
      notRecord: 'skip-me',
    })

    expect(sanitized[EXAMPLE_HOTLINE_CHANNEL.id]).toEqual(EXAMPLE_HOTLINE_CHANNEL)
    expect(sanitized['hotline:bad-enum']).toBeUndefined()
    expect(sanitized['hotline:bad-metric']).toBeUndefined()
    expect(sanitized['hotline:empty-rules']).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([EXAMPLE_HOTLINE_CHANNEL.id])
  })

  it('hydrated EXAMPLE hotline channel shape is frozen', () => {
    const sanitized = sanitizeSpe956HotlineChannelRecords({
      valid: { ...EXAMPLE_HOTLINE_CHANNEL },
    })
    const record = sanitized[EXAMPLE_HOTLINE_CHANNEL.id]

    expect(record).toEqual(EXAMPLE_HOTLINE_CHANNEL)
    expect(Object.isFrozen(record)).toBe(true)
  })

  it('resolvePersistedHotlineChannel ignores inherited keys and unsafe ids', () => {
    const channelId = EXAMPLE_HOTLINE_CHANNEL.id
    const ownRecords = Object.create(null) as Record<string, unknown>
    ownRecords[channelId] = EXAMPLE_HOTLINE_CHANNEL

    expect(
      resolvePersistedHotlineChannel({ spe956HotlineChannelRecords: ownRecords }, channelId)
    ).toEqual(EXAMPLE_HOTLINE_CHANNEL)

    const prototypeOnlyId = 'hotline:prototype-only'
    const prototypeBacked = Object.create({
      [prototypeOnlyId]: EXAMPLE_HOTLINE_CHANNEL,
    }) as Record<string, unknown>

    expect(
      resolvePersistedHotlineChannel(
        { spe956HotlineChannelRecords: prototypeBacked },
        prototypeOnlyId
      )
    ).toBeNull()

    for (const unsafeId of ['__proto__', 'constructor', 'prototype'] as const) {
      const records = Object.create(null) as Record<string, unknown>
      records[unsafeId] = EXAMPLE_HOTLINE_CHANNEL
      expect(
        resolvePersistedHotlineChannel({ spe956HotlineChannelRecords: records }, unsafeId)
      ).toBeNull()
    }
  })

  it('hydrates explicit empty hotline records over fallback during import', () => {
    const fallback = createStartingState()
    Object.assign(fallback, {
      spe956HotlineChannelRecords: SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
    })

    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956HotlineChannelRecords: {},
      },
      fallback
    )

    expect(hydrated.spe956HotlineChannelRecords).toEqual({})
  })

  it('round-trips EXAMPLE hotline channel records through save/load', () => {
    const state = createStartingState()
    Object.assign(state, {
      spe956HotlineChannelRecords: SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956HotlineChannelRecords).toEqual(SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS)
  })

  it('hydrates persisted hotline channel records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956HotlineChannelRecords: {
          ...SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS,
          invalid: {
            id: 'hotline:invalid',
            scriptQuality: 0.85,
            staffingCapacity: 0.8,
            languageSupport: true,
            escalationRules: 'Escalate language gaps.',
            unansweredMode: 'not_valid',
            angerMode: 'anger_only',
            handleThreshold: 0.5,
          },
        },
      },
      fallback
    )

    expect(hydrated.spe956HotlineChannelRecords).toEqual(SPE_956_EXAMPLE_HOTLINE_CHANNEL_RECORDS)
  })
})

describe('spe956ParticipatoryChannelPersistence (SPE-2635 / SPE-956 slice 4)', () => {
  it('defaults starting state to empty spe956AsyncDiscussionSurfaceRecords', () => {
    expect(createStartingState().spe956AsyncDiscussionSurfaceRecords).toEqual({})
  })

  it('returns explicit empty map instead of fallback during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS

    expect(sanitizeSpe956AsyncDiscussionSurfaceRecords({}, fallback)).toEqual({})
    expect(sanitizeSpe956AsyncDiscussionSurfaceRecords({}, fallback)).not.toBe(fallback)
    expect(Object.getPrototypeOf(sanitizeSpe956AsyncDiscussionSurfaceRecords({}, fallback))).toBeNull()
  })

  it('returns fallback only for non-record / missing input during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS

    expect(sanitizeSpe956AsyncDiscussionSurfaceRecords(null, fallback)).toBe(fallback)
    expect(sanitizeSpe956AsyncDiscussionSurfaceRecords(undefined, fallback)).toBe(fallback)
    expect(sanitizeSpe956AsyncDiscussionSurfaceRecords('not-a-record', fallback)).toBe(fallback)
  })

  it('rejects unsafe surface ids and preserves valid records in mixed input', () => {
    const unsafeIds = ['__proto__', 'constructor', 'prototype'] as const

    for (const unsafeId of unsafeIds) {
      const polluted = sanitizeSpe956AsyncDiscussionSurfaceRecords({
        polluted: {
          id: unsafeId,
          participationWindow: { startWeek: 1, endWeek: 12 },
          transcriptRetentionMode: 'session_bound',
          wideningRule: 'open_async',
          memoryStabilization: false,
        },
      })

      expect(Object.prototype.hasOwnProperty.call(polluted, unsafeId)).toBe(false)
      expect(Object.keys(polluted)).toEqual([])
    }

    const mixed = sanitizeSpe956AsyncDiscussionSurfaceRecords({
      valid: EXAMPLE_DISCUSSION_SURFACE,
      polluted: {
        id: '__proto__',
        participationWindow: { startWeek: 1, endWeek: 12 },
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
    })

    expect(mixed[EXAMPLE_DISCUSSION_SURFACE.id]).toEqual(EXAMPLE_DISCUSSION_SURFACE)
    expect(Object.prototype.hasOwnProperty.call(mixed, '__proto__')).toBe(false)
    expect(Object.keys(mixed)).toEqual([EXAMPLE_DISCUSSION_SURFACE.id])
  })

  it('drops invalid and duplicate surface entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe956AsyncDiscussionSurfaceRecords({
      valid: EXAMPLE_DISCUSSION_SURFACE,
      duplicate: {
        ...EXAMPLE_DISCUSSION_SURFACE,
        wideningRule: 'closed',
      },
      missingId: {
        id: '',
        participationWindow: { startWeek: 1, endWeek: 12 },
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
      badEnum: {
        id: 'discussion:bad-enum',
        participationWindow: { startWeek: 1, endWeek: 12 },
        transcriptRetentionMode: 'not_a_mode',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
      invertedWindow: {
        id: 'discussion:inverted-window',
        participationWindow: { startWeek: 12, endWeek: 1 },
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
      badWindowField: {
        id: 'discussion:bad-window',
        participationWindow: { startWeek: 1.5, endWeek: 12 },
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
      missingWindow: {
        id: 'discussion:missing-window',
        participationWindow: null,
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: false,
      },
      badBoolean: {
        id: 'discussion:bad-boolean',
        participationWindow: { startWeek: 1, endWeek: 12 },
        transcriptRetentionMode: 'session_bound',
        wideningRule: 'open_async',
        memoryStabilization: 'yes',
      },
      notRecord: 'skip-me',
    })

    expect(sanitized[EXAMPLE_DISCUSSION_SURFACE.id]).toEqual(EXAMPLE_DISCUSSION_SURFACE)
    expect(sanitized['discussion:bad-enum']).toBeUndefined()
    expect(sanitized['discussion:inverted-window']).toBeUndefined()
    expect(sanitized['discussion:bad-window']).toBeUndefined()
    expect(sanitized['discussion:missing-window']).toBeUndefined()
    expect(sanitized['discussion:bad-boolean']).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([EXAMPLE_DISCUSSION_SURFACE.id])
  })

  it('hydrated EXAMPLE async discussion surface shape is frozen', () => {
    const sanitized = sanitizeSpe956AsyncDiscussionSurfaceRecords({
      valid: {
        ...EXAMPLE_DISCUSSION_SURFACE,
        participationWindow: { ...EXAMPLE_DISCUSSION_SURFACE.participationWindow },
      },
    })
    const record = sanitized[EXAMPLE_DISCUSSION_SURFACE.id]

    expect(record).toEqual(EXAMPLE_DISCUSSION_SURFACE)
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.isFrozen(record?.participationWindow)).toBe(true)
  })

  it('hydrateGame preserves frozen async discussion surface shape including nested window', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956AsyncDiscussionSurfaceRecords: {
          valid: {
            ...EXAMPLE_DISCUSSION_SURFACE,
            participationWindow: { ...EXAMPLE_DISCUSSION_SURFACE.participationWindow },
          },
        },
      },
      fallback
    )
    const record = hydrated.spe956AsyncDiscussionSurfaceRecords?.[EXAMPLE_DISCUSSION_SURFACE.id]

    expect(record).toEqual(EXAMPLE_DISCUSSION_SURFACE)
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.isFrozen(record?.participationWindow)).toBe(true)
  })

  it('resolvePersistedAsyncDiscussionSurface ignores inherited keys and unsafe ids', () => {
    const surfaceId = EXAMPLE_DISCUSSION_SURFACE.id
    const ownRecords = Object.create(null) as Record<string, unknown>
    ownRecords[surfaceId] = EXAMPLE_DISCUSSION_SURFACE

    expect(
      resolvePersistedAsyncDiscussionSurface(
        { spe956AsyncDiscussionSurfaceRecords: ownRecords },
        surfaceId
      )
    ).toEqual(EXAMPLE_DISCUSSION_SURFACE)

    const prototypeOnlyId = 'discussion:prototype-only'
    const prototypeBacked = Object.create({
      [prototypeOnlyId]: EXAMPLE_DISCUSSION_SURFACE,
    }) as Record<string, unknown>

    expect(
      resolvePersistedAsyncDiscussionSurface(
        { spe956AsyncDiscussionSurfaceRecords: prototypeBacked },
        prototypeOnlyId
      )
    ).toBeNull()

    for (const unsafeId of ['__proto__', 'constructor', 'prototype'] as const) {
      const records = Object.create(null) as Record<string, unknown>
      records[unsafeId] = EXAMPLE_DISCUSSION_SURFACE
      expect(
        resolvePersistedAsyncDiscussionSurface(
          { spe956AsyncDiscussionSurfaceRecords: records },
          unsafeId
        )
      ).toBeNull()
    }
  })

  it('hydrates explicit empty async discussion surface records over fallback during import', () => {
    const fallback = createStartingState()
    Object.assign(fallback, {
      spe956AsyncDiscussionSurfaceRecords: SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
    })

    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956AsyncDiscussionSurfaceRecords: {},
      },
      fallback
    )

    expect(hydrated.spe956AsyncDiscussionSurfaceRecords).toEqual({})
  })

  it('round-trips EXAMPLE async discussion surface records through save/load', () => {
    const state = createStartingState()
    Object.assign(state, {
      spe956AsyncDiscussionSurfaceRecords: SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956AsyncDiscussionSurfaceRecords).toEqual(
      SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS
    )
  })

  it('hydrates persisted async discussion surface records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956AsyncDiscussionSurfaceRecords: {
          ...SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS,
          invalid: {
            id: 'discussion:invalid',
            participationWindow: { startWeek: 1, endWeek: 12 },
            transcriptRetentionMode: 'not_valid',
            wideningRule: 'open_async',
            memoryStabilization: false,
          },
        },
      },
      fallback
    )

    expect(hydrated.spe956AsyncDiscussionSurfaceRecords).toEqual(
      SPE_956_EXAMPLE_ASYNC_DISCUSSION_SURFACE_RECORDS
    )
  })
})

describe('spe956ParticipatoryChannelPersistence (SPE-2636 / SPE-956 slice 5)', () => {
  it('defaults starting state to empty spe956CommunityAdvisoryBodyRecords', () => {
    expect(createStartingState().spe956CommunityAdvisoryBodyRecords).toEqual({})
  })

  it('returns explicit empty map instead of fallback during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS

    expect(sanitizeSpe956CommunityAdvisoryBodyRecords({}, fallback)).toEqual({})
    expect(sanitizeSpe956CommunityAdvisoryBodyRecords({}, fallback)).not.toBe(fallback)
    expect(
      Object.getPrototypeOf(sanitizeSpe956CommunityAdvisoryBodyRecords({}, fallback))
    ).toBeNull()
  })

  it('returns fallback only for non-record / missing input during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS

    expect(sanitizeSpe956CommunityAdvisoryBodyRecords(null, fallback)).toBe(fallback)
    expect(sanitizeSpe956CommunityAdvisoryBodyRecords(undefined, fallback)).toBe(fallback)
    expect(sanitizeSpe956CommunityAdvisoryBodyRecords('not-a-record', fallback)).toBe(fallback)
  })

  it('rejects unsafe body ids and preserves valid records in mixed input', () => {
    const unsafeIds = ['__proto__', 'constructor', 'prototype'] as const

    for (const unsafeId of unsafeIds) {
      const polluted = sanitizeSpe956CommunityAdvisoryBodyRecords({
        polluted: {
          id: unsafeId,
          mission: 'Mission',
          membershipRule: 'Rule',
          representedStakeholderClasses: ['local_residents'],
          authorizedDecisionScopes: ['framing'],
          influenceThreshold: 0.5,
          decisionCriteria: 'Criteria',
        },
      })

      expect(Object.prototype.hasOwnProperty.call(polluted, unsafeId)).toBe(false)
      expect(Object.keys(polluted)).toEqual([])
    }

    const mixed = sanitizeSpe956CommunityAdvisoryBodyRecords({
      valid: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      polluted: {
        id: '__proto__',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: ['framing'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
    })

    expect(mixed[EXAMPLE_COMMUNITY_ADVISORY_BODY.id]).toEqual(EXAMPLE_COMMUNITY_ADVISORY_BODY)
    expect(Object.prototype.hasOwnProperty.call(mixed, '__proto__')).toBe(false)
    expect(Object.keys(mixed)).toEqual([EXAMPLE_COMMUNITY_ADVISORY_BODY.id])
  })

  it('drops invalid and duplicate advisory body entries during sanitize without throwing', () => {
    const sanitized = sanitizeSpe956CommunityAdvisoryBodyRecords({
      valid: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      duplicate: {
        ...EXAMPLE_COMMUNITY_ADVISORY_BODY,
        influenceThreshold: 0.9,
      },
      missingId: {
        id: '',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: ['framing'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      badEnum: {
        id: 'advisory-body:bad-enum',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: ['not_a_scope'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      mixedScopes: {
        id: 'advisory-body:mixed-scopes',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: ['framing', 'not_a_scope'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      emptyScopes: {
        id: 'advisory-body:empty-scopes',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: [],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      badArray: {
        id: 'advisory-body:bad-array',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents', 42],
        authorizedDecisionScopes: ['framing'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      emptyStakeholders: {
        id: 'advisory-body:empty-stakeholders',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['  ', ''],
        authorizedDecisionScopes: ['framing'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      badThreshold: {
        id: 'advisory-body:bad-threshold',
        mission: 'Mission',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: ['framing'],
        influenceThreshold: 0,
        decisionCriteria: 'Criteria',
      },
      emptyMission: {
        id: 'advisory-body:empty-mission',
        mission: '   ',
        membershipRule: 'Rule',
        representedStakeholderClasses: ['local_residents'],
        authorizedDecisionScopes: ['framing'],
        influenceThreshold: 0.5,
        decisionCriteria: 'Criteria',
      },
      notRecord: 'skip-me',
    })

    expect(sanitized[EXAMPLE_COMMUNITY_ADVISORY_BODY.id]).toEqual(EXAMPLE_COMMUNITY_ADVISORY_BODY)
    expect(sanitized['advisory-body:bad-enum']).toBeUndefined()
    expect(sanitized['advisory-body:mixed-scopes']).toBeUndefined()
    expect(sanitized['advisory-body:empty-scopes']).toBeUndefined()
    expect(sanitized['advisory-body:bad-array']).toBeUndefined()
    expect(sanitized['advisory-body:empty-stakeholders']).toBeUndefined()
    expect(sanitized['advisory-body:bad-threshold']).toBeUndefined()
    expect(sanitized['advisory-body:empty-mission']).toBeUndefined()
    expect(Object.keys(sanitized)).toEqual([EXAMPLE_COMMUNITY_ADVISORY_BODY.id])
  })

  it('hydrated EXAMPLE community advisory body shape is frozen including nested arrays', () => {
    const sanitized = sanitizeSpe956CommunityAdvisoryBodyRecords({
      valid: {
        ...EXAMPLE_COMMUNITY_ADVISORY_BODY,
        representedStakeholderClasses: [
          ...EXAMPLE_COMMUNITY_ADVISORY_BODY.representedStakeholderClasses,
        ],
        authorizedDecisionScopes: [...EXAMPLE_COMMUNITY_ADVISORY_BODY.authorizedDecisionScopes],
      },
    })
    const record = sanitized[EXAMPLE_COMMUNITY_ADVISORY_BODY.id]

    expect(record).toEqual(EXAMPLE_COMMUNITY_ADVISORY_BODY)
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.isFrozen(record?.representedStakeholderClasses)).toBe(true)
    expect(Object.isFrozen(record?.authorizedDecisionScopes)).toBe(true)
  })

  it('hydrateGame preserves frozen community advisory body shape including nested arrays', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956CommunityAdvisoryBodyRecords: {
          valid: {
            ...EXAMPLE_COMMUNITY_ADVISORY_BODY,
            representedStakeholderClasses: [
              ...EXAMPLE_COMMUNITY_ADVISORY_BODY.representedStakeholderClasses,
            ],
            authorizedDecisionScopes: [...EXAMPLE_COMMUNITY_ADVISORY_BODY.authorizedDecisionScopes],
          },
        },
      },
      fallback
    )
    const record = hydrated.spe956CommunityAdvisoryBodyRecords?.[EXAMPLE_COMMUNITY_ADVISORY_BODY.id]

    expect(record).toEqual(EXAMPLE_COMMUNITY_ADVISORY_BODY)
    expect(Object.isFrozen(record)).toBe(true)
    expect(Object.isFrozen(record?.representedStakeholderClasses)).toBe(true)
    expect(Object.isFrozen(record?.authorizedDecisionScopes)).toBe(true)
  })

  it('resolvePersistedCommunityAdvisoryBody ignores inherited keys and unsafe ids', () => {
    const bodyId = EXAMPLE_COMMUNITY_ADVISORY_BODY.id
    const ownRecords = Object.create(null) as Record<string, unknown>
    ownRecords[bodyId] = EXAMPLE_COMMUNITY_ADVISORY_BODY

    expect(
      resolvePersistedCommunityAdvisoryBody(
        { spe956CommunityAdvisoryBodyRecords: ownRecords },
        bodyId
      )
    ).toEqual(EXAMPLE_COMMUNITY_ADVISORY_BODY)

    const prototypeOnlyId = 'advisory-body:prototype-only'
    const prototypeBacked = Object.create({
      [prototypeOnlyId]: EXAMPLE_COMMUNITY_ADVISORY_BODY,
    }) as Record<string, unknown>

    expect(
      resolvePersistedCommunityAdvisoryBody(
        { spe956CommunityAdvisoryBodyRecords: prototypeBacked },
        prototypeOnlyId
      )
    ).toBeNull()

    for (const unsafeId of ['__proto__', 'constructor', 'prototype'] as const) {
      const records = Object.create(null) as Record<string, unknown>
      records[unsafeId] = EXAMPLE_COMMUNITY_ADVISORY_BODY
      expect(
        resolvePersistedCommunityAdvisoryBody(
          { spe956CommunityAdvisoryBodyRecords: records },
          unsafeId
        )
      ).toBeNull()
    }
  })

  it('hydrates explicit empty community advisory body records over fallback during import', () => {
    const fallback = createStartingState()
    Object.assign(fallback, {
      spe956CommunityAdvisoryBodyRecords: SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
    })

    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956CommunityAdvisoryBodyRecords: {},
      },
      fallback
    )

    expect(hydrated.spe956CommunityAdvisoryBodyRecords).toEqual({})
  })

  it('round-trips EXAMPLE community advisory body records through save/load', () => {
    const state = createStartingState()
    Object.assign(state, {
      spe956CommunityAdvisoryBodyRecords: SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.spe956CommunityAdvisoryBodyRecords).toEqual(
      SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS
    )
  })

  it('hydrates persisted community advisory body records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        spe956CommunityAdvisoryBodyRecords: {
          ...SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS,
          invalid: {
            id: 'advisory-body:invalid',
            mission: 'Mission',
            membershipRule: 'Rule',
            representedStakeholderClasses: ['local_residents'],
            authorizedDecisionScopes: ['not_valid'],
            influenceThreshold: 0.5,
            decisionCriteria: 'Criteria',
          },
        },
      },
      fallback
    )

    expect(hydrated.spe956CommunityAdvisoryBodyRecords).toEqual(
      SPE_956_EXAMPLE_COMMUNITY_ADVISORY_BODY_RECORDS
    )
  })
})
