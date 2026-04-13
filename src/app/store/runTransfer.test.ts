// cspell:words cand medkits sato
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { queueTraining } from '../../domain/sim/training'
import {
  GAME_STORE_VERSION,
  RUN_EXPORT_KIND,
  createRunExportPayload,
  migratePersistedStore,
  parseRunExport,
  serializeRunExport,
  stripGameTemplates,
} from './runTransfer'

describe('runTransfer helpers', () => {
  it('migrates v1 persisted saves into the current persisted store shape', () => {
    const fallback = createStartingState()
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates
    delete (persistedGame as Partial<typeof persistedGame>).inventory
    delete (persistedGame as Partial<typeof persistedGame>).productionQueue
    delete (persistedGame as Partial<typeof persistedGame>).market
    persistedGame.week = 6
    persistedGame.rngSeed = 222
    persistedGame.rngState = 222
    persistedGame.config = {
      ...persistedGame.config,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    }

    const migrated = migratePersistedStore({ game: persistedGame }, 1, fallback)

    expect(migrated.game.week).toBe(6)
    expect(migrated.game.rngSeed).toBe(222)
    expect(migrated.game.rngState).toBe(222)
    expect(migrated.game.config).toMatchObject({
      challengeModeEnabled: true,
      durationModel: 'attrition',
    })
    expect(migrated.game.events).toEqual([])
    expect(migrated.game.inventory).toEqual(fallback.inventory)
    expect(migrated.game.productionQueue).toEqual([])
    expect(migrated.game.market).toEqual(fallback.market)
    expect(migrated.game).not.toHaveProperty('templates')
  })

  it('backfills sparse legacy agents with canonical identity/progression/history fields', () => {
    const fallback = createStartingState()
    const persistedGame = createStartingState()
    delete (persistedGame as Partial<typeof persistedGame>).templates

    persistedGame.agents = {
      'legacy-agent': {
        id: 'legacy-agent',
        name: 'Legacy Agent',
        role: 'hunter',
        baseStats: { combat: 55, investigation: 33, utility: 22, social: 11 },
        tags: ['hunter'],
        relationships: {},
        fatigue: 12,
        status: 'active',
        assignment: {
          state: 'assigned',
          caseId: 'case-001',
          teamId: 't_nightwatch',
          startedWeek: 2,
        },
      },
    } as typeof persistedGame.agents

    const migrated = migratePersistedStore({ game: persistedGame }, 1, fallback)
    const legacyAgent = migrated.game.agents['legacy-agent']

    expect(legacyAgent).toBeDefined()
    expect(legacyAgent.identity?.name).toBe('Legacy Agent')
    expect(legacyAgent.progression).toBeDefined()
    expect(legacyAgent.history).toBeDefined()
    expect(legacyAgent.stats).toBeDefined()
    expect(legacyAgent.operationalRole).toBe('field')
    expect(legacyAgent.assignmentStatus).toMatchObject({
      state: 'assigned',
      caseId: 'case-001',
      teamId: 't_nightwatch',
      startedWeek: 2,
    })
  })

  it('backfills missing faction state for legacy saves without breaking import', () => {
    const fallback = createStartingState()
    const persistedGame = createStartingState()

    delete (persistedGame as Partial<typeof persistedGame>).factions

    const migrated = migratePersistedStore({ game: persistedGame }, 1, fallback)

    expect(migrated.game.factions).toEqual(fallback.factions)
  })

  it('builds the current run export payload shape without persisting templates', () => {
    const game = createStartingState()
    game.week = 3
    game.events = [
      {
        id: 'evt-000001',
        schemaVersion: 1,
        type: 'intel.report_generated',
        sourceSystem: 'intel',
        timestamp: '2042-01-08T00:00:00.001Z',
        payload: {
          week: 2,
          resolvedCount: 1,
          failedCount: 0,
          partialCount: 0,
          unresolvedCount: 0,
          spawnedCount: 0,
          noteCount: 1,
          score: 3,
        },
      },
    ]

    const payload = createRunExportPayload(game)

    expect(payload).toMatchObject({
      kind: RUN_EXPORT_KIND,
      version: GAME_STORE_VERSION,
      game: expect.objectContaining({ week: 3 }),
    })
    expect(payload.exportedAt).toBeTypeOf('string')
    expect(new Date(payload.exportedAt).toISOString()).toBe(payload.exportedAt)
    expect(payload.game).not.toHaveProperty('templates')
    expect(payload.game.events).toEqual(game.events)
  })

  it('round-trips exported runs through JSON import parsing', () => {
    const game = createStartingState()
    game.week = 4
    game.rngSeed = 88
    game.rngState = 88
    game.config = {
      ...game.config,
      maxActiveCases: 9,
      challengeModeEnabled: true,
      durationModel: 'attrition',
    }

    const expected = migratePersistedStore(
      { game: createRunExportPayload(game).game },
      GAME_STORE_VERSION,
      createStartingState()
    ).game
    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(stripGameTemplates(roundTripped)).toEqual(expected)
  })

  it('round-trips active inventory, production queue, and market state', () => {
    const game = createStartingState()
    game.inventory = {
      ...game.inventory,
      medkits: 3,
      silver_rounds: 7,
    }
    game.productionQueue = [
      {
        id: 'queue-000101',
        recipeId: 'med-kits',
        recipeName: 'Emergency Medkits',
        outputItemId: 'medkits',
        outputItemName: 'Emergency Medkits',
        outputQuantity: 1,
        startedWeek: 3,
        durationWeeks: 1,
        remainingWeeks: 1,
        fundingCost: 14,
      },
    ]
    game.market = {
      week: 4,
      featuredRecipeId: 'med-kits',
      pressure: 'tight',
      costMultiplier: 1.15,
    }

    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(roundTripped.inventory).toEqual(game.inventory)
    expect(roundTripped.productionQueue).toEqual(game.productionQueue)
    expect(roundTripped.market).toEqual(game.market)
  })

  it('round-trips agency progression unlocks and active protocols', () => {
    const game = createStartingState()
    game.agency = {
      ...game.agency!,
      protocolSelectionLimit: 2,
      activeProtocolIds: ['stormwall', 'firebreak'],
      progressionUnlockIds: ['containment-liturgy', 'blacksite-retrofit'],
    }

    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(roundTripped.agency).toMatchObject({
      containmentRating: game.containmentRating,
      clearanceLevel: game.clearanceLevel,
      funding: game.funding,
      protocolSelectionLimit: 2,
      activeProtocolIds: ['stormwall', 'firebreak'],
      progressionUnlockIds: ['containment-liturgy', 'blacksite-retrofit'],
    })
  })

  it('defaults missing event schemaVersion and infers sourceSystem from event type', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          events: [
            {
              id: 'evt-legacy-001',
              type: 'market.shifted',
              sourceSystem: 'system',
              timestamp: 'not-a-date',
              payload: {
                week: 3,
              },
            },
          ],
        },
      })
    )

    expect(imported.events).toHaveLength(1)
    expect(imported.events[0]).toMatchObject({
      id: 'evt-legacy-001',
      schemaVersion: 2,
      type: 'market.shifted',
      sourceSystem: 'production',
      payload: expect.objectContaining({
        week: 3,
        pressure: 'stable',
      }),
    })
    expect(imported.events[0].timestamp).toBe('2042-01-15T00:00:00.001Z')
  })

  it('sanitizes sparse legacy payloads for agent.hired, relationship reasons, and agency.containment_updated', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          events: [
            {
              id: 'evt-legacy-hire',
              type: 'agent.hired',
              timestamp: 'not-a-date',
              payload: {
                week: 2,
                recruitCategory: 'invalid-category',
              },
            },
            {
              id: 'evt-legacy-agency',
              type: 'agency.containment_updated',
              sourceSystem: 'agent',
              payload: {
                week: 2,
                containmentDelta: -3,
              },
            },
            {
              id: 'evt-legacy-relationship',
              type: 'agent.relationship_changed',
              payload: {
                week: 2,
                agentId: 'a_mina',
                agentName: 'Mina Park',
                counterpartId: 'a_sato',
                counterpartName: 'Dr. Sato',
                previousValue: 0.15,
                nextValue: 0.35,
                delta: 0.2,
                reason: 'external_event',
              },
            },
          ],
        },
      })
    )

    expect(imported.events).toHaveLength(3)
    expect(imported.events[0]).toMatchObject({
      id: 'evt-legacy-hire',
      schemaVersion: 2,
      type: 'agent.hired',
      sourceSystem: 'agent',
      payload: {
        week: 2,
        candidateId: 'cand-1',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        recruitCategory: 'agent',
      },
      timestamp: '2042-01-08T00:00:00.001Z',
    })
    expect(imported.events[1]).toMatchObject({
      id: 'evt-legacy-agency',
      schemaVersion: 2,
      type: 'agency.containment_updated',
      sourceSystem: 'system',
      payload: {
        week: 2,
        containmentRatingBefore: 0,
        containmentRatingAfter: 0,
        containmentDelta: -3,
        clearanceLevelBefore: 1,
        clearanceLevelAfter: 1,
        fundingBefore: 0,
        fundingAfter: 0,
        fundingDelta: 0,
      },
    })
    expect(imported.events[2]).toMatchObject({
      id: 'evt-legacy-relationship',
      schemaVersion: 2,
      type: 'agent.relationship_changed',
      sourceSystem: 'agent',
      payload: {
        week: 2,
        agentId: 'a_mina',
        agentName: 'Mina Park',
        counterpartId: 'a_sato',
        counterpartName: 'Dr. Sato',
        previousValue: 0.15,
        nextValue: 0.35,
        delta: 0.2,
        reason: 'external_event',
      },
      timestamp: '2042-01-08T00:00:00.003Z',
    })
  })

  it('round-trips modern faction and progression event payloads without degrading fields', () => {
    const game = createStartingState()
    game.events = [
      {
        id: 'evt-spawn-modern',
        schemaVersion: 2,
        type: 'case.spawned',
        sourceSystem: 'incident',
        timestamp: '2042-01-08T00:00:00.001Z',
        payload: {
          week: 2,
          caseId: 'case-faction-offer',
          caseTitle: 'Intercept Window',
          templateId: 'tmpl-intercept-window',
          kind: 'case',
          stage: 2,
          trigger: 'faction_offer',
          factionId: 'black_budget',
          factionLabel: 'Black Budget Programs',
          sourceReason: 'Black Budget opened a cleaner intercept window.',
        },
      },
      {
        id: 'evt-faction-unlock-modern',
        schemaVersion: 2,
        type: 'faction.unlock_available',
        sourceSystem: 'faction',
        timestamp: '2042-01-08T00:00:00.002Z',
        payload: {
          week: 2,
          factionId: 'institutions',
          factionName: 'Academic Institutions',
          contactId: 'institutions-halden',
          contactName: 'Miren Halden',
          label: 'Research fellowship',
          summary: 'A new fellowship referral channel is available.',
          disposition: 'supportive',
        },
      },
      {
        id: 'evt-standing-hired-modern',
        schemaVersion: 2,
        type: 'faction.standing_changed',
        sourceSystem: 'faction',
        timestamp: '2042-01-08T00:00:00.003Z',
        payload: {
          week: 2,
          factionId: 'institutions',
          factionName: 'Academic Institutions',
          delta: 3,
          standingBefore: 4,
          standingAfter: 5,
          reason: 'recruitment.hired',
          interactionLabel: 'Sponsored hire',
        },
      },
      {
        id: 'evt-xp-modern',
        schemaVersion: 2,
        type: 'progression.xp_gained',
        sourceSystem: 'agent',
        timestamp: '2042-01-08T00:00:00.004Z',
        payload: {
          week: 2,
          agentId: 'a_mina',
          agentName: 'Mina Park',
          xpAmount: 12,
          reason: 'mission_resolution',
          totalXp: 44,
          level: 2,
          levelsGained: 1,
        },
      },
    ]
    game.reports = [
      {
        week: 2,
        rngStateBefore: 88,
        rngStateAfter: 89,
        newCases: [],
        progressedCases: [],
        resolvedCases: [],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 0,
        avgFatigue: 0,
        teamStatus: [],
        notes: [
          {
            id: 'note-faction-unlock',
            content: 'New faction unlock recorded.',
            timestamp: 1700000000000,
            type: 'faction.unlock_available',
            metadata: {
              factionId: 'institutions',
              label: 'Research fellowship',
            },
          },
        ],
      },
    ]

    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(roundTripped.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'evt-spawn-modern',
          type: 'case.spawned',
          payload: expect.objectContaining({
            trigger: 'faction_offer',
            factionId: 'black_budget',
            factionLabel: 'Black Budget Programs',
            sourceReason: 'Black Budget opened a cleaner intercept window.',
          }),
        }),
        expect.objectContaining({
          id: 'evt-faction-unlock-modern',
          type: 'faction.unlock_available',
          payload: expect.objectContaining({
            factionId: 'institutions',
            contactId: 'institutions-halden',
            label: 'Research fellowship',
            disposition: 'supportive',
          }),
        }),
        expect.objectContaining({
          id: 'evt-standing-hired-modern',
          type: 'faction.standing_changed',
          payload: expect.objectContaining({
            reason: 'recruitment.hired',
            interactionLabel: 'Sponsored hire',
          }),
        }),
        expect.objectContaining({
          id: 'evt-xp-modern',
          type: 'progression.xp_gained',
          payload: expect.objectContaining({
            xpAmount: 12,
            reason: 'mission_resolution',
            totalXp: 44,
            level: 2,
            levelsGained: 1,
          }),
        }),
      ])
    )
    expect(roundTripped.reports[0]?.notes[0]).toMatchObject({
      type: 'faction.unlock_available',
      metadata: {
        factionId: 'institutions',
        label: 'Research fellowship',
      },
    })
  })

  it('preserves allowlisted instructor/scouting/market/directive/academy events on import hydration', () => {
    const game = createStartingState()
    game.events = [
      {
        id: 'evt-instructor-assigned',
        schemaVersion: 2,
        type: 'agent.instructor_assigned',
        sourceSystem: 'agent',
        timestamp: '2042-01-08T00:00:00.001Z',
        payload: {
          week: 2,
          staffId: 'staff-instructor-01',
          instructorName: 'Iris Vale',
          agentId: 'a_mina',
          agentName: 'Mina Park',
          instructorSpecialty: 'combat',
          bonus: 6,
        },
      },
      {
        id: 'evt-instructor-unassigned',
        schemaVersion: 2,
        type: 'agent.instructor_unassigned',
        sourceSystem: 'agent',
        timestamp: '2042-01-08T00:00:00.002Z',
        payload: {
          week: 2,
          staffId: 'staff-instructor-01',
          instructorName: 'Iris Vale',
          agentId: 'a_mina',
          agentName: 'Mina Park',
          instructorSpecialty: 'combat',
          bonus: 6,
        },
      },
      {
        id: 'evt-scout-init',
        schemaVersion: 2,
        type: 'recruitment.scouting_initiated',
        sourceSystem: 'intel',
        timestamp: '2042-01-08T00:00:00.003Z',
        payload: {
          week: 2,
          candidateId: 'cand-17',
          candidateName: 'Cato Rhys',
          fundingCost: 8,
          stage: 1,
          projectedTier: 'C',
          confidence: 'medium',
          revealLevel: 1,
        },
      },
      {
        id: 'evt-market-txn',
        schemaVersion: 2,
        type: 'market.transaction_recorded',
        sourceSystem: 'production',
        timestamp: '2042-01-08T00:00:00.004Z',
        payload: {
          week: 2,
          marketWeek: 2,
          transactionId: 'txn-2-1',
          action: 'buy',
          listingId: 'listing-medkits',
          itemId: 'medkits',
          itemName: 'Emergency Medkits',
          category: 'material',
          quantity: 2,
          bundleCount: 1,
          unitPrice: 7,
          totalPrice: 14,
          remainingAvailability: 12,
        },
      },
      {
        id: 'evt-directive-applied',
        schemaVersion: 2,
        type: 'directive.applied',
        sourceSystem: 'system',
        timestamp: '2042-01-08T00:00:00.005Z',
        payload: {
          week: 2,
          directiveId: 'intel-surge',
          directiveLabel: 'Intel Surge',
        },
      },
      {
        id: 'evt-academy-upgraded',
        schemaVersion: 2,
        type: 'system.academy_upgraded',
        sourceSystem: 'system',
        timestamp: '2042-01-08T00:00:00.006Z',
        payload: {
          week: 2,
          tierBefore: 0,
          tierAfter: 1,
          fundingBefore: 220,
          fundingAfter: 20,
          cost: 200,
        },
      },
    ]

    const roundTripped = parseRunExport(serializeRunExport(game))
    const roundTrippedTypes = roundTripped.events.map((event) => event.type)

    expect(roundTrippedTypes).toEqual(
      expect.arrayContaining([
        'agent.instructor_assigned',
        'agent.instructor_unassigned',
        'recruitment.scouting_initiated',
        'market.transaction_recorded',
        'directive.applied',
        'system.academy_upgraded',
      ])
    )
    expect(roundTripped.events).toHaveLength(game.events.length)
  })

  it('assigns deterministic migrated ids for legacy events missing ids', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          events: [
            {
              type: 'market.shifted',
              payload: {
                week: 2,
              },
            },
            {
              type: 'agency.containment_updated',
              payload: {
                week: 2,
              },
            },
          ],
        },
      })
    )

    expect(imported.events.map((event) => event.id)).toEqual([
      'evt-migrated-000001',
      'evt-migrated-000002',
    ])
  })

  it('round-trips a started training queue entry through JSON import parsing', () => {
    const game = queueTraining(createStartingState(), 'a_mina', 'analysis-lab')

    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(roundTripped.trainingQueue).toHaveLength(1)
    expect(roundTripped.trainingQueue[0]).toMatchObject({
      id: game.trainingQueue[0]?.id,
      agentId: 'a_mina',
      trainingId: 'analysis-lab',
      trainingName: 'Analysis Lab',
      remainingWeeks: game.trainingQueue[0]?.remainingWeeks,
    })
    expect(roundTripped.agents['a_mina'].assignment).toEqual(game.agents['a_mina'].assignment)
  })

  it('sanitizes malformed production queue and market payloads during import', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          productionQueue: [
            {
              id: 123,
              recipeId: 'missing-recipe',
              recipeName: 99,
              outputItemId: null,
              outputItemName: undefined,
              outputQuantity: -4,
              startedWeek: 0,
              durationWeeks: 0,
              remainingWeeks: -7,
              fundingCost: -3,
            },
            'ignored-entry',
          ],
          market: {
            week: -2,
            featuredRecipeId: 101,
            pressure: 'volatile',
            costMultiplier: Number.POSITIVE_INFINITY,
          },
        },
      })
    )

    expect(imported.productionQueue).toEqual([
      {
        id: 'queue-1',
        recipeId: 'missing-recipe',
        recipeName: 'missing-recipe',
        outputItemId: 'output-1',
        outputItemName: 'Output 1',
        outputQuantity: 1,
        startedWeek: 1,
        durationWeeks: 1,
        remainingWeeks: 0,
        fundingCost: 0,
      },
    ])
    expect(imported.market).toEqual(fallback.market)
  })

  it('sanitizes malformed training queue payloads during import', () => {
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...createStartingState(),
          trainingQueue: [
            {
              id: 123,
              trainingId: 'analysis-lab',
              trainingName: 99,
              agentId: null,
              agentName: undefined,
              targetStat: 'bogus',
              statDelta: -4,
              startedWeek: 0,
              durationWeeks: 0,
              remainingWeeks: -7,
              fundingCost: -3,
              fatigueDelta: -1,
            },
            'ignored-entry',
          ],
        },
      })
    )

    expect(imported.trainingQueue).toEqual([
      {
        id: 'training-1',
        trainingId: 'analysis-lab',
        trainingName: 'Analysis Lab',
        scope: 'agent',
        agentId: 'agent-1',
        agentName: 'Agent 1',
        targetStat: 'investigation',
        statDelta: 1,
        startedWeek: 1,
        durationWeeks: 1,
        remainingWeeks: 0,
        fundingCost: 0,
        fatigueDelta: 0,
      },
    ])
  })

  it('preserves agent.training_cancelled events through JSON import round-trip', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          events: [
            {
              id: 'evt-cancel-001',
              schemaVersion: 1,
              type: 'agent.training_cancelled',
              sourceSystem: 'agent',
              timestamp: '2042-01-08T00:00:00.001Z',
              payload: {
                week: 2,
                agentId: 'a_sato',
                agentName: 'Dr. Sato',
                trainingId: 'combat-drills',
                trainingName: 'Close-Quarters Drills',
                refund: 10,
              },
            },
          ],
        },
      })
    )

    expect(imported.events).toHaveLength(1)
    expect(imported.events[0]).toMatchObject({
      id: 'evt-cancel-001',
      type: 'agent.training_cancelled',
      sourceSystem: 'agent',
      payload: {
        week: 2,
        agentId: 'a_sato',
        agentName: 'Dr. Sato',
        trainingId: 'combat-drills',
        trainingName: 'Close-Quarters Drills',
        refund: 10,
      },
    })
  })

  it('sanitizes sparse agent.training_cancelled payloads with fallback defaults', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          events: [
            {
              id: 'evt-cancel-sparse',
              type: 'agent.training_cancelled',
              payload: {
                week: 3,
              },
            },
          ],
        },
      })
    )

    expect(imported.events).toHaveLength(1)
    expect(imported.events[0]).toMatchObject({
      id: 'evt-cancel-sparse',
      type: 'agent.training_cancelled',
      payload: {
        week: 3,
        agentId: 'agent-1',
        agentName: 'Agent 1',
        trainingId: 'training-1',
        trainingName: 'Training 1',
        refund: 0,
      },
    })
  })

  it.each([
    ['not-json', 'Run payload is not valid JSON.'],
    [
      JSON.stringify({
        kind: 'wrong-kind',
        version: GAME_STORE_VERSION,
        game: {},
      }),
      'Run payload is not a supported Containment Protocol export.',
    ],
    [
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION + 1,
        game: {},
      }),
      'Run payload version is not supported by this build.',
    ],
  ])('rejects invalid import payloads', (raw, expectedMessage) => {
    expect(() => parseRunExport(raw)).toThrow(expectedMessage)
  })
})
