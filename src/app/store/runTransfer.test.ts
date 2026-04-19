import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { DistortionState } from '../../domain/shared/distortion'
import { queueTraining } from '../../domain/sim/training'
import {
  GAME_STORE_VERSION,
  RUN_EXPORT_KIND,
  buildReportCaseSnapshot,
  createRunExportPayload,
  migratePersistedStore,
  parseRunExport,
  serializeRunExport,
} from './runTransfer'

describe('runTransfer helpers', () => {
  it('propagates canonical distortion state into report snapshots', () => {
    const caseWithDistortion = {
      id: 'case-distorted',
      templateId: 'template-1',
      title: 'Distorted Case',
      description: 'A case with misleading intel.',
      mode: 'threshold',
      kind: 'case',
      status: 'open',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 2,
      weeksRemaining: 2,
      deadlineWeeks: 2,
      deadlineRemaining: 2,
      assignedTeamIds: [],
      onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      distortion: ['misleading', 'fragmented'] as DistortionState[],
    }

    const snapshot = buildReportCaseSnapshot(caseWithDistortion)

    expect(snapshot.distortion).toEqual(['misleading', 'fragmented'])
  })

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

    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(roundTripped).toMatchObject({
      week: game.week,
      rngSeed: game.rngSeed,
      rngState: game.rngState,
      config: game.config,
      directiveState: game.directiveState,
      inventory: game.inventory,
      productionQueue: game.productionQueue,
      market: game.market,
    })
    expect(roundTripped.reports).toHaveLength(game.reports.length)
    expect(roundTripped.reports[0]).toMatchObject(game.reports[0])
    expect(roundTripped.reports[0]?.caseSnapshots).toBeDefined()
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

  it('sanitizes sparse legacy payloads for agent.hired and agency.containment_updated', () => {
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
          ],
        },
      })
    )

    expect(imported.events).toHaveLength(2)
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
