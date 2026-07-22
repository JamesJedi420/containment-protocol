// cspell:words cand medkits sato
import { describe, expect, it } from 'vitest'
import { GAME_OVER_REASONS } from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import { buildOperationEventTimestamp } from '../../domain/events'
import { buildReportNoteTimestamp } from '../../domain/reportNotes'
import {
  AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF,
  LEGACY_WAIVER_AUTHORITY_BASIS_MIGRATION,
} from '../../domain/procurementEmergencyAuthority'
import { getBeliefDrivenCasePressure } from '../../domain/beliefTracks'
import { getCasePressureWithBelief } from '../../domain/pressure'
import { getContractOffers } from '../../domain/contracts'
import { getCampaignDate, resolveCalendarConfig } from '../../domain/campaignCalendar'
import { createSeedCampaignLedger } from '../../domain/campaignLedger'
import { calcWeekScore } from '../../domain/sim/scoring'
import {
  getProductionRecipe,
  getRecipeFundingCost,
  getRecipeInputMaterials,
} from '../../data/production'
import { getTrainingProgram } from '../../data/training'
import { getLevelForXp, getXpThresholdForLevel } from '../../domain/progression'
import type { CaseInstance } from '../../domain/models'
import { resolveMapMetadata } from '../../domain/siteGeneration/mapMetadata'
import type { SiteGenerationStageSnapshot } from '../../domain/siteGeneration/packets'
import type { DistortionState } from '../../domain/shared/distortion'
import { queueTraining } from '../../domain/sim/training'
import { LEGACY_THREAT_FAMILY_ALIASES, MAX_CASE_STAGE } from '../../domain/case/normalizeCase'
import {
  GAME_STORE_VERSION,
  RUN_EXPORT_KIND,
  buildReportCaseSnapshot,
  createRunExportPayload,
  hydrateGame,
  migratePersistedStore,
  parseRunExport,
  sanitizeGameConfig,
  sanitizeCandidatesRecruitment,
  sanitizeCasesMap,
  sanitizeTeamsMap,
  serializeRunExport,
  stripGameTemplates,
  OPERATION_EVENT_TYPES,
  REPORT_NOTE_TYPES,
} from './runTransfer'
import { operationEventPayloadSchemas } from '../../domain/events/eventValidation'
import { REPORT_NOTE_TYPE_AUDIT } from '../../test/reportNoteTypeAudit.test'
import type { ReportNoteType } from '../../domain/models'
import type { OperationEventType } from '../../domain/events/types'
import { buildAgentCandidate, buildStaffCandidate } from '../../test/recruitment/fixtures'
import { getKnowledgeKey } from '../../domain/knowledge'
import { sanitizeKnowledgeStateMap } from '../../domain/knowledge/sanitize'
import { normalizeAgent } from '../../domain/agent/normalize'
import { createAgent } from '../../domain/agent/factory'
import { buildReplacementPressureState } from '../../domain/agent/attrition'
import { buildHavenSchedule } from '../../domain/settlements/haven'
import { DEFAULT_RESPONSE_GRID } from '../../domain/pressure'
import { buildAffiliationFileWorkQueueEvidenceRepairWorkflow } from '../../domain/affiliationFileWorkQueueEvidenceRepairWorkflows'
import { generateHubState } from '../../domain/hub/hubState'

describe('runTransfer helpers', () => {
  it('preserves fallback affiliation file work queue evidence repair workflows for older saves', () => {
    const fallbackWorkflow = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
      workQueueEntryId: 'person-status:legacy',
      evidenceType: 'missing_entity_welfare_reclassification_ref',
      subjectId: 'subject-legacy',
      subjectLabel: 'Legacy Subject',
      repairLabel: 'Restore legacy welfare evidence',
      recordedWeek: 9,
    })
    const fallback = {
      ...createStartingState(),
      affiliationFileWorkQueueEvidenceRepairWorkflows: {
        [fallbackWorkflow.id]: fallbackWorkflow,
      },
    }
    const olderSave = stripGameTemplates(fallback)
    delete olderSave.affiliationFileWorkQueueEvidenceRepairWorkflows

    const hydrated = hydrateGame(olderSave, fallback)

    expect(hydrated.affiliationFileWorkQueueEvidenceRepairWorkflows).toEqual(
      fallback.affiliationFileWorkQueueEvidenceRepairWorkflows
    )
  })

  it('hydrates emergencyGrayMarketWaiverWeek when it matches the campaign week (SPE-1524)', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 12,
        emergencyGrayMarketWaiverWeek: 12,
      },
      fallback
    )

    expect(hydrated.week).toBe(12)
    expect(hydrated.emergencyGrayMarketWaiverWeek).toBe(12)
  })

  it('drops stale emergencyGrayMarketWaiverWeek during hydration when behind campaign week', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 12,
        emergencyGrayMarketWaiverWeek: 11,
      },
      fallback
    )

    expect(hydrated.week).toBe(12)
    expect(hydrated.emergencyGrayMarketWaiverWeek).toBeUndefined()
  })

  it('aligns market.week to campaign week on hydrate when persisted values drift (SPE-1184 procurement clock parity)', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 18,
        market: {
          ...fallback.market,
          week: 3,
        },
      },
      fallback
    )

    expect(hydrated.week).toBe(18)
    expect(hydrated.market.week).toBe(18)
  })

  it('migrates legacy emergency waiver events missing institutionKey and authority routing (SPE-1511 / SPE-849)', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 5,
        events: [
          {
            id: 'evt-legacy-waiver',
            schemaVersion: 2,
            type: 'market.emergency_gray_market_waiver_granted',
            timestamp: '2026-01-01T00:00:00.000Z',
            payload: {
              week: 5,
              marketWeek: 5,
              crisisPressureScore: 130,
              sanctionLevel: 'sanctioned',
              packetId: 'gray_market_broker',
              falloutRiskApplied: 'risk',
            },
          },
        ],
      },
      fallback
    )

    expect(hydrated.events).toHaveLength(1)
    const ev = hydrated.events[0]
    expect(ev?.type).toBe('market.emergency_gray_market_waiver_granted')
    if (ev?.type === 'market.emergency_gray_market_waiver_granted') {
      expect(ev.payload.institutionKey).toBe('containment_protocol')
      expect(ev.payload.authorityRoute).toBe(AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF)
      expect(ev.payload.authorityBasis).toBe(LEGACY_WAIVER_AUTHORITY_BASIS_MIGRATION)
      expect(ev.payload.waiverPrecedentCount).toBe(1)
      expect(ev.payload.regulatoryArbitrageSignal).toBe('none')
      expect(ev.payload.ruleConflictSignal).toBe('sanctioned_procurement_vs_crisis_waiver')
    }
  })

  it('hydrates emergencyGrayMarketWaiverPrecedentCount (SPE-1184)', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 8,
        emergencyGrayMarketWaiverPrecedentCount: 6,
      },
      fallback
    )

    expect(hydrated.emergencyGrayMarketWaiverPrecedentCount).toBe(6)
  })

  it('migrates emergency waiver accountability closed events missing institutionKey (SPE-1511)', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 8,
        events: [
          {
            id: 'evt-accountability-closed',
            schemaVersion: 2,
            type: 'market.emergency_gray_market_waiver_accountability_closed',
            timestamp: '2026-01-01T00:00:00.000Z',
            payload: {
              week: 8,
              waiverGrantWeek: 7,
            },
          },
        ],
      },
      fallback
    )

    expect(hydrated.events).toHaveLength(1)
    const ev = hydrated.events[0]
    expect(ev?.type).toBe('market.emergency_gray_market_waiver_accountability_closed')
    if (ev?.type === 'market.emergency_gray_market_waiver_accountability_closed') {
      expect(ev.payload.week).toBe(8)
      expect(ev.payload.waiverGrantWeek).toBe(7)
      expect(ev.payload.institutionKey).toBe('containment_protocol')
    }
  })

  it('migrates accountability closed events missing waiverGrantWeek to the prior campaign week (SPE-1511)', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 8,
        events: [
          {
            id: 'evt-accountability-no-grant-week',
            schemaVersion: 2,
            type: 'market.emergency_gray_market_waiver_accountability_closed',
            timestamp: '2026-01-01T00:00:00.000Z',
            payload: {
              week: 8,
            },
          },
        ],
      },
      fallback
    )

    expect(hydrated.events).toHaveLength(1)
    const ev = hydrated.events[0]
    expect(ev?.type).toBe('market.emergency_gray_market_waiver_accountability_closed')
    if (ev?.type === 'market.emergency_gray_market_waiver_accountability_closed') {
      expect(ev.payload.waiverGrantWeek).toBe(7)
    }
  })
  it('propagates canonical distortion state into report snapshots', () => {
    const caseWithDistortion: CaseInstance = {
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
    expect(migrated.game.market).toEqual({ ...fallback.market, week: 6 })
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

  it('leaves contracts undefined when legacy saves omit the contracts key (hydration 418)', () => {
    const fallback = createStartingState()
    const persistedGame = createStartingState()

    delete (persistedGame as Partial<typeof persistedGame>).contracts
    persistedGame.week = 6
    persistedGame.funding = 275
    persistedGame.containmentRating = 80
    persistedGame.clearanceLevel = 2

    const migrated = migratePersistedStore({ game: persistedGame }, 1, fallback)

    expect(migrated.game.contracts).toBeUndefined()
    expect(migrated.game.week).toBe(6)
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
    game.week = 4
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
      ...createStartingState().market,
      week: 4,
      featuredRecipeId: 'med-kits',
      pressure: 'tight',
      costMultiplier: 1.15,
    }

    const roundTripped = parseRunExport(serializeRunExport(game))
    const medKitRecipe = getProductionRecipe('med-kits')!

    expect(roundTripped.inventory).toEqual(game.inventory)
    expect(roundTripped.productionQueue).toEqual([
      {
        ...game.productionQueue[0]!,
        inputMaterials: getRecipeInputMaterials(medKitRecipe),
      },
    ])
    expect(roundTripped.market).toEqual(game.market)
  })

  it('round-trips agency progression unlocks and active protocols', () => {
    const game = createStartingState()
    game.agency = {
      ...game.agency!,
      protocolSelectionLimit: 2,
      activeProtocolIds: ['field-clearance-protocol', 'containment-doctrine-alpha'],
      progressionUnlockIds: ['containment-liturgy', 'blacksite-retrofit'],
    }

    const roundTripped = parseRunExport(serializeRunExport(game))

    expect(roundTripped.agency).toMatchObject({
      containmentRating: game.containmentRating,
      clearanceLevel: game.clearanceLevel,
      funding: game.funding,
      protocolSelectionLimit: 2,
      activeProtocolIds: ['field-clearance-protocol', 'containment-doctrine-alpha'],
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
          week: 3,
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
          week: 2,
          allowLegacySyntheticRepair: true,
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
        containmentRatingAfter: -3,
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
    const xpAmount = 12
    const totalXp = 44
    const expectedLevel = getLevelForXp(totalXp)
    const expectedLevelsGained = expectedLevel - getLevelForXp(totalXp - xpAmount)

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
            xpAmount,
            reason: 'mission_resolution',
            totalXp,
            level: expectedLevel,
            levelsGained: expectedLevelsGained,
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

  it('reconciles instructor assignment bonus and specialty on import hydration', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame({
      ...stripGameTemplates(fallback),
      events: [
        {
          id: 'evt-instructor-assigned-raw',
          type: 'agent.instructor_assigned',
          timestamp: buildOperationEventTimestamp(2, 0),
          payload: {
            week: 2,
            staffId: 'staff-instructor-01',
            instructorName: 'Iris Vale',
            agentId: 'a_mina',
            agentName: 'Mina Park',
            instructorSpecialty: 'not-a-stat',
            bonus: -1.5,
          },
        },
        {
          id: 'evt-instructor-unassigned-raw',
          type: 'agent.instructor_unassigned',
          timestamp: buildOperationEventTimestamp(2, 1),
          payload: {
            week: 2,
            staffId: 'staff-instructor-01',
            instructorName: 'Iris Vale',
            agentId: 'a_mina',
            agentName: 'Mina Park',
            instructorSpecialty: 'utility',
            bonus: '3.2',
          },
        },
      ],
    })

    expect(hydrated.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'agent.instructor_assigned',
          payload: expect.objectContaining({
            instructorSpecialty: 'combat',
            bonus: 0,
          }),
        }),
        expect.objectContaining({
          type: 'agent.instructor_unassigned',
          payload: expect.objectContaining({
            instructorSpecialty: 'utility',
            bonus: 3,
          }),
        }),
      ])
    )
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

    expect(imported.productionQueue).toEqual([])
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

    expect(imported.trainingQueue).toEqual([])
  })

  describe('hydration problems 319-325', () => {
    it('319 drops training entries with missing or invented agent ids', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        trainingQueue: [
          {
            id: 'training-missing-agent',
            trainingId: 'analysis-lab',
            agentId: null,
            remainingWeeks: 1,
            durationWeeks: 2,
          },
          {
            id: 'training-missing-ref',
            trainingId: 'analysis-lab',
            agentId: 'a_missing',
            remainingWeeks: 1,
            durationWeeks: 2,
          },
          {
            id: 'training-invented',
            trainingId: 'analysis-lab',
            agentId: 'agent-1',
            remainingWeeks: 1,
            durationWeeks: 2,
          },
        ],
      })

      expect(imported.trainingQueue).toEqual([])
    })

    it('320 drops team drill entries with stale team or member refs', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        trainingQueue: [
          {
            id: 'drill-stale-team',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId: 'a_mina',
            teamId: 't_missing',
            memberIds: ['a_mina', 'a_kellan'],
            remainingWeeks: 1,
            durationWeeks: 2,
          },
          {
            id: 'drill-stale-members',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId: 'a_mina',
            teamId: 't_nightwatch',
            memberIds: ['a_mina', 'a_sato'],
            remainingWeeks: 1,
            durationWeeks: 2,
          },
        ],
      })

      expect(imported.trainingQueue).toEqual([])
    })

    it('321 clamps training remainingWeeks to durationWeeks', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        trainingQueue: [
          {
            id: 'training-overflow',
            trainingId: 'analysis-lab',
            agentId: 'a_mina',
            durationWeeks: 1,
            remainingWeeks: 999,
          },
        ],
      })

      expect(imported.trainingQueue).toEqual([
        expect.objectContaining({
          id: 'training-overflow',
          agentId: 'a_mina',
          durationWeeks: 1,
          remainingWeeks: 1,
        }),
      ])
    })

    it('322 drops unknown or locked programs unless in-flight', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        academyTier: 0,
        trainingQueue: [
          {
            id: 'training-unknown',
            trainingId: 'bogus-program',
            agentId: 'a_mina',
            durationWeeks: 2,
            remainingWeeks: 2,
          },
          {
            id: 'training-locked',
            trainingId: 'threat-assessment',
            agentId: 'a_sato',
            durationWeeks: 3,
            remainingWeeks: 3,
          },
          {
            id: 'training-in-flight-unknown',
            trainingId: 'bogus-program',
            trainingName: 'Legacy Field Course',
            agentId: 'a_mina',
            durationWeeks: 2,
            remainingWeeks: 1,
          },
          {
            id: 'training-in-flight-locked',
            trainingId: 'threat-assessment',
            agentId: 'a_sato',
            durationWeeks: 3,
            remainingWeeks: 1,
          },
        ],
      })

      expect(imported.trainingQueue.map((entry) => entry.id)).toEqual([
        'training-in-flight-unknown',
        'training-in-flight-locked',
      ])
      expect(imported.trainingQueue[0]?.trainingName).toBe('Legacy Field Course')
      expect(imported.trainingQueue[1]?.trainingName).toBe('Threat Assessment')
    })

    it('323 drops production entries with unknown recipe or catalog output', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'queue-unknown-recipe',
            recipeId: 'missing-recipe',
            outputItemId: 'medkits',
            durationWeeks: 1,
            remainingWeeks: 1,
          },
          {
            id: 'queue-arbitrary-output',
            recipeId: 'med-kits',
            outputItemId: 'bogus-output',
            durationWeeks: 1,
            remainingWeeks: 1,
          },
        ],
      })

      expect(imported.productionQueue).toEqual([])
    })

    it('324 clamps production remainingWeeks to durationWeeks', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'queue-overflow',
            recipeId: 'med-kits',
            outputItemId: 'medkits',
            durationWeeks: 1,
            remainingWeeks: 999,
          },
        ],
      })

      expect(imported.productionQueue).toEqual([
        expect.objectContaining({
          id: 'queue-overflow',
          recipeId: 'med-kits',
          durationWeeks: 1,
          remainingWeeks: 1,
        }),
      ])
    })

    it('325 clamps party maxHandSize to at least 1', () => {
      const fallback = createStartingState()
      const imported = hydrateGame({
        ...stripGameTemplates(fallback),
        partyCards: {
          ...fallback.partyCards!,
          maxHandSize: 0,
        },
      })

      expect(imported.partyCards?.maxHandSize).toBe(1)
    })
  })

  describe('hydration problems 333-338', () => {
    const hydrateReports = (fallback: ReturnType<typeof createStartingState>, notes: unknown[]) =>
      hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 10,
          reports: [
            {
              week: 4,
              rngStateBefore: 1,
              rngStateAfter: 2,
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
              notes,
            },
          ],
        },
        fallback
      )

    it('333 drops non-finite metadata numbers and filters array entries', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        {
          id: 'note-meta-numbers',
          content: 'Escalation note.',
          timestamp: buildReportNoteTimestamp(4, 0),
          type: 'system.escalation_consequence',
          metadata: {
            caseId: 'case-001',
            week: Number.NaN,
            fundingDelta: Number.POSITIVE_INFINITY,
            consequences: ['ok', Number.NaN, 3, Number.POSITIVE_INFINITY],
          },
        },
      ])

      expect(hydrated.reports[0]?.notes[0]?.metadata).toEqual({
        caseId: 'case-001',
        consequences: ['ok', 3],
      })
    })

    it('334 strips unknown metadata keys for typed notes', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        {
          id: 'note-meta-keys',
          content: 'Faction unlock.',
          timestamp: buildReportNoteTimestamp(4, 1),
          type: 'faction.unlock_available',
          metadata: {
            factionId: 'institutions',
            label: 'Research fellowship',
            unknownKey: 'drop-me',
          },
        },
      ])

      expect(hydrated.reports[0]?.notes[0]?.metadata).toEqual({
        factionId: 'institutions',
        label: 'Research fellowship',
      })
      expect(hydrated.reports[0]?.notes[0]).not.toHaveProperty('unknownField')
    })

    it('335 drops blank notes without type and repairs blank typed notes from metadata', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        '   ',
        {
          id: 'note-blank-untyped',
          content: '   ',
          timestamp: buildReportNoteTimestamp(4, 2),
        },
        {
          id: 'note-blank-repair',
          content: '   ',
          timestamp: buildReportNoteTimestamp(4, 3),
          type: 'case.resolved',
          metadata: {
            caseTitle: 'Silent Choir',
            stage: 2,
          },
        },
      ])

      expect(hydrated.reports[0]?.notes).toEqual([
        {
          id: 'note-blank-repair',
          content: 'Silent Choir (case.resolved)',
          timestamp: buildReportNoteTimestamp(4, 3),
          type: 'case.resolved',
          metadata: {
            caseTitle: 'Silent Choir',
            stage: 2,
          },
        },
      ])
    })

    it('336 rebuilds notes from known top-level fields only', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        {
          id: 'note-top-level',
          content: 'Keep me.',
          timestamp: buildReportNoteTimestamp(4, 0),
          type: 'system.week_delta',
          metadata: { delta: 2 },
          legacyField: 'strip',
          nested: { extra: true },
        },
      ])

      expect(hydrated.reports[0]?.notes[0]).toEqual({
        id: 'note-top-level',
        content: 'Keep me.',
        timestamp: buildReportNoteTimestamp(4, 0),
        type: 'system.week_delta',
        metadata: { delta: 2 },
      })
    })

    it('337 normalizes invalid timestamps to week-derived values', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        {
          id: 'note-bad-ts',
          content: 'Timestamp repair.',
          timestamp: Number.NaN,
          type: 'system.week_delta',
          metadata: { delta: 1 },
        },
        {
          id: 'note-out-of-week',
          content: 'Week band repair.',
          timestamp: buildReportNoteTimestamp(9, 0),
          type: 'system.week_delta',
          metadata: { delta: 2 },
        },
      ])

      expect(hydrated.reports[0]?.notes[0]?.timestamp).toBe(buildReportNoteTimestamp(4, 0))
      expect(hydrated.reports[0]?.notes[1]?.timestamp).toBe(buildReportNoteTimestamp(4, 1))
    })

    it('338 rebuilds event timestamps when payload week and ISO week diverge', () => {
      const fallback = createStartingState()
      const mismatchedTimestamp = buildOperationEventTimestamp(7, 1)
      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 3,
          events: [
            {
              id: 'evt-week-mismatch',
              type: 'market.shifted',
              timestamp: mismatchedTimestamp,
              payload: {
                week: 3,
                featuredRecipeId: 'med-kits',
                pressure: 'stable',
                costMultiplier: 1,
              },
            },
          ],
        },
        fallback
      )

      expect(hydrated.events[0]?.timestamp).toBe(buildOperationEventTimestamp(3, 1))
      if (hydrated.events[0]?.type === 'market.shifted') {
        expect(hydrated.events[0].payload.week).toBe(3)
      }
    })

    it('338 preserves event timestamps when payload week matches ISO week', () => {
      const fallback = createStartingState()
      const alignedTimestamp = buildOperationEventTimestamp(3, 2)
      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 3,
          events: [
            {
              id: 'evt-week-aligned',
              type: 'market.shifted',
              timestamp: alignedTimestamp,
              payload: {
                week: 3,
                featuredRecipeId: 'med-kits',
                pressure: 'stable',
                costMultiplier: 1,
              },
            },
          ],
        },
        fallback
      )

      expect(hydrated.events[0]?.timestamp).toBe(alignedTimestamp)
    })
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
          week: 2,
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
          week: 3,
          allowLegacySyntheticRepair: true,
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
        trainingId: 'combat-drills',
        trainingName: 'Close-Quarters Drills',
        refund: 0,
      },
    })
  })

  it('sanitizes legacy unknown training event payloads to catalog-backed IDs/names and nonnegative refund', () => {
    const fallback = createStartingState()
    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: new Date().toISOString(),
        game: {
          ...fallback,
          week: 3,
          allowLegacySyntheticRepair: true,
          events: [
            {
              id: 'evt-legacy-training-started',
              type: 'agent.training_started',
              payload: {
                week: 3,
                queueId: 'queue-legacy',
                agentId: 'a_mina',
                agentName: 'Mina',
                trainingId: 'legacy-unknown-program',
                trainingName: 'Legacy Course Name',
                etaWeeks: 2,
                fundingCost: 10,
              },
            },
            {
              id: 'evt-legacy-training-cancelled',
              type: 'agent.training_cancelled',
              payload: {
                week: 3,
                agentId: 'a_mina',
                agentName: 'Mina',
                trainingId: 'legacy-unknown-program',
                trainingName: 'Legacy Course Name',
                refund: 999,
              },
            },
          ],
        },
      })
    )

    expect(imported.events).toHaveLength(2)
    expect(imported.events[0]).toMatchObject({
      type: 'agent.training_started',
      payload: {
        trainingId: 'combat-drills',
        trainingName: 'Close-Quarters Drills',
        etaWeeks: 2,
        fundingCost: 10,
      },
    })
    expect(imported.events[1]).toMatchObject({
      type: 'agent.training_cancelled',
      payload: {
        trainingId: 'combat-drills',
        trainingName: 'Close-Quarters Drills',
        refund: 999,
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
    [
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: 0,
        game: {},
      }),
      'Run payload version is not supported by this build.',
    ],
    [
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: -1,
        game: {},
      }),
      'Run payload version is not supported by this build.',
    ],
    [
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: 1.5,
        game: {},
      }),
      'Run payload version is not supported by this build.',
    ],
  ])('rejects invalid import payloads', (raw, expectedMessage) => {
    expect(() => parseRunExport(raw)).toThrow(expectedMessage)
  })

  it('rejects run exports with missing, invalid, or future exportedAt metadata', () => {
    const fallback = createStartingState()
    const basePayload = {
      kind: RUN_EXPORT_KIND,
      version: GAME_STORE_VERSION,
      game: stripGameTemplates(fallback),
    }

    expect(() => parseRunExport(JSON.stringify(basePayload))).toThrow(
      'Run payload exportedAt timestamp is missing or invalid.'
    )
    expect(() =>
      parseRunExport(
        JSON.stringify({
          ...basePayload,
          exportedAt: 'not-a-date',
        })
      )
    ).toThrow('Run payload exportedAt timestamp is missing or invalid.')
    expect(() =>
      parseRunExport(
        JSON.stringify({
          ...basePayload,
          exportedAt: '2999-01-01T00:00:00.000Z',
        })
      )
    ).toThrow('Run payload exportedAt timestamp is from the future.')
  })

  it('accepts run exports with valid exportedAt metadata', () => {
    const fallback = createStartingState()

    const imported = parseRunExport(
      JSON.stringify({
        kind: RUN_EXPORT_KIND,
        version: GAME_STORE_VERSION,
        exportedAt: '2026-01-01T00:00:00.000Z',
        game: {
          ...stripGameTemplates(fallback),
          week: 3,
        },
      })
    )

    expect(imported.week).toBe(3)
  })

  it('keeps canonical candidates when recruitmentPool mirror diverges on hydrate (312)', () => {
    const fallback = createStartingState()
    const canonical = buildAgentCandidate({ id: 'cand-canonical', expiryWeek: 8 })
    const stale = buildAgentCandidate({ id: 'cand-stale-mirror', expiryWeek: 8 })

    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        candidates: [canonical],
        recruitmentPool: [stale],
      },
      fallback
    )

    expect(hydrated.candidates.map((c) => c.id)).toEqual(['cand-canonical'])
    expect(hydrated.recruitmentPool).toEqual(hydrated.candidates)
  })

  it('sanitizeCandidatesRecruitment prefers canonical list over stale mirror (312)', () => {
    const canonical = buildAgentCandidate({ id: 'cand-a' })
    const stale = buildAgentCandidate({ id: 'cand-b' })

    expect(
      sanitizeCandidatesRecruitment([canonical], [stale], []).map((candidate) => candidate.id)
    ).toEqual(['cand-a'])
  })

  it('sanitizeTeamsMap uses memberIds as canonical and mirrors agentIds (313)', () => {
    const fallback = createStartingState()
    const agentId = 'a_ava'
    const teamId = 't_nightwatch'

    const teams = sanitizeTeamsMap(
      {
        [teamId]: {
          ...fallback.teams[teamId],
          memberIds: [agentId],
          agentIds: [agentId, 'a_kellan'],
        },
      },
      fallback.agents,
      fallback.cases,
      fallback.teams
    )

    expect(teams[teamId]?.memberIds).toEqual([agentId])
    expect(teams[teamId]?.agentIds).toEqual([agentId])
  })

  it('sanitizeTeamsMap prefers status.assignedCaseId over legacy assignedCaseId mirror (314)', () => {
    const fallback = createStartingState()
    const teamId = 't_nightwatch'
    const caseCanonical = Object.keys(fallback.cases)[0]!
    const caseLegacy = Object.keys(fallback.cases)[1] ?? caseCanonical
    const cases = {
      ...fallback.cases,
      [caseCanonical]: {
        ...fallback.cases[caseCanonical]!,
        assignedTeamIds: [teamId],
      },
    }

    const teams = sanitizeTeamsMap(
      {
        [teamId]: {
          ...fallback.teams[teamId],
          status: {
            state: 'deployed',
            assignedCaseId: caseCanonical,
          },
          assignedCaseId: caseLegacy,
        },
      },
      fallback.agents,
      cases,
      fallback.teams
    )

    expect(teams[teamId]?.status?.assignedCaseId).toBe(caseCanonical)
  })

  it('sanitizeTeamsMap recomposes compositionState from live roster (315)', () => {
    const fallback = createStartingState()
    const teamId = 't_nightwatch'

    const teams = sanitizeTeamsMap(
      {
        [teamId]: {
          ...fallback.teams[teamId],
          compositionState: { compositionValid: false, garbage: true },
        },
      },
      fallback.agents,
      fallback.cases,
      fallback.teams
    )

    expect(teams[teamId]?.compositionState).toMatchObject({
      compositionValid: expect.any(Boolean),
      cohesion: expect.objectContaining({ cohesionScore: expect.any(Number) }),
    })
    expect(teams[teamId]?.compositionState).not.toHaveProperty('garbage')
  })

  it('preserves historical report teamStatus ids and clears stale case refs on hydrate (316)', () => {
    const fallback = createStartingState()

    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
            newCases: [],
            progressedCases: [],
            resolvedCases: [],
            failedCases: [],
            partialCases: [],
            unresolvedTriggers: [],
            spawnedCases: [],
            maxStage: 0,
            avgFatigue: 0,
            teamStatus: [
              {
                teamId: 't_retired',
                teamName: 'Retired Unit',
                assignedCaseId: 'case-missing',
                assignedCaseTitle: 'Ghost Case',
                avgFatigue: 22,
              },
            ],
            notes: [],
          },
        ],
      },
      fallback
    )

    expect(hydrated.reports[0]?.teamStatus[0]).toMatchObject({
      teamId: 't_retired',
      teamName: 'Retired Unit',
      avgFatigue: 22,
    })
    expect(hydrated.reports[0]?.teamStatus[0]?.assignedCaseId).toBeUndefined()
    expect(hydrated.reports[0]?.teamStatus[0]?.assignedCaseTitle).toBeUndefined()
  })

  it('sanitizes inventory against catalog and preserves unknown item ids with quantity (317)', () => {
    const fallback = createStartingState()

    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        inventory: {
          medkits: 4,
          custom_mod_part: 2,
          '': 9,
        },
      },
      fallback
    )

    expect(hydrated.inventory.medkits).toBe(4)
    expect(hydrated.inventory.custom_mod_part).toBe(2)
    expect(hydrated.inventory['']).toBeUndefined()
  })

  it('bounds persisted missionResult snapshots on hydrate instead of raw cast (318)', () => {
    const fallback = createStartingState()
    const caseId = Object.keys(fallback.cases)[0]!

    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
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
            caseSnapshots: {
              [caseId]: {
                caseId,
                title: 'Test Case',
                kind: 'case',
                mode: 'threshold',
                status: 'open',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [],
                missionResult: {
                  caseId,
                  caseTitle: 'Test Case',
                  teamsUsed: [],
                  outcome: 'success',
                  performanceSummary: {
                    contribution: 12,
                    threatHandled: 3,
                    damageTaken: 1,
                    healingPerformed: 0,
                    evidenceGathered: 4,
                    containmentActionsCompleted: 2,
                  },
                  rewards: {
                    outcome: 'success',
                    caseType: 'general',
                    caseTypeLabel: 'Operation',
                    operationValue: 10,
                    factors: [],
                    fundingDelta: 5,
                    containmentDelta: 1,
                    strategicValueDelta: 0,
                    reputationDelta: 2,
                    inventoryRewards: [],
                    factionStanding: [],
                    label: 'Mission',
                    reasons: [],
                  },
                  penalties: {
                    fundingLoss: 0,
                    containmentLoss: 0,
                    reputationLoss: 0,
                    strategicLoss: 0,
                  },
                  fatigueChanges: [],
                  injuries: [],
                  spawnedConsequences: [],
                  explanationNotes: ['resolved cleanly'],
                },
              },
            },
            notes: [],
          },
        ],
      },
      fallback
    )

    const missionResult = hydrated.reports[0]?.caseSnapshots?.[caseId]?.missionResult
    expect(missionResult?.outcome).toBe('success')
    expect(missionResult?.performanceSummary?.contribution).toBe(12)
    expect(missionResult?.explanationNotes).toEqual(['resolved cleanly'])
  })
})

describe('runTransfer import sanitization (326-332)', () => {
  it('drops operation events missing required identity fields unless legacy repair is enabled (326)', () => {
    const fallback = createStartingState()
    const strict = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-missing-case',
            type: 'case.resolved',
            payload: { week: 2, caseTitle: 'Ghost case' },
          },
          {
            id: 'evt-missing-agent',
            type: 'agent.relationship_changed',
            payload: {
              week: 2,
              agentName: 'Mina',
              counterpartId: 'a_sato',
              counterpartName: 'Dr. Sato',
              previousValue: 0.1,
              nextValue: 0.2,
              delta: 0.1,
              reason: 'passive_drift',
            },
          },
        ],
      },
      fallback
    )

    expect(strict.events).toHaveLength(0)

    const repaired = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        allowLegacySyntheticRepair: true,
        events: [
          {
            id: 'evt-missing-case',
            type: 'case.resolved',
            payload: { week: 2 },
          },
        ],
      },
      fallback
    )

    expect(repaired.events).toHaveLength(1)
    expect(repaired.events[0]).toMatchObject({
      type: 'case.resolved',
      payload: expect.objectContaining({ caseId: 'case-1' }),
    })
  })

  it('326 trims padded IDs and rejects whitespace-only required IDs during import sanitization', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-case-padded',
            type: 'case.resolved',
            payload: {
              week: 2,
              caseId: '  case-001  ',
              caseTitle: 'Padded case',
              mode: 'threshold',
              kind: 'case',
              stage: 1,
              teamIds: ['team-1'],
            },
          },
          {
            id: 'evt-relationship-whitespace-agent',
            type: 'agent.relationship_changed',
            payload: {
              week: 2,
              agentId: '   ',
              agentName: 'Mina',
              counterpartId: 'a_sato',
              counterpartName: 'Dr. Sato',
              previousValue: 0,
              nextValue: 1,
              delta: 1,
              reason: 'passive_drift',
            },
          },
          {
            id: 'evt-relationship-padded-counterpart',
            type: 'agent.relationship_changed',
            payload: {
              week: 2,
              agentId: 'a_mina',
              agentName: 'Mina',
              counterpartId: '  a_sato  ',
              counterpartName: 'Dr. Sato',
              previousValue: 0,
              nextValue: 1,
              delta: 1,
              reason: 'passive_drift',
            },
          },
        ],
      },
      fallback
    )

    expect(hydrated.events).toHaveLength(2)
    expect(hydrated.events[0]).toMatchObject({
      id: 'evt-case-padded',
      type: 'case.resolved',
      payload: expect.objectContaining({ caseId: 'case-001' }),
    })
    expect(hydrated.events[1]).toMatchObject({
      id: 'evt-relationship-padded-counterpart',
      type: 'agent.relationship_changed',
      payload: expect.objectContaining({ counterpartId: 'a_sato' }),
    })
  })

  it('normalizes malformed relationship and betrayal numbers to finite values (327)', () => {
    const fallback = createStartingState()
    const imported = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-relationship-nan',
            type: 'agent.relationship_changed',
            payload: {
              week: 2,
              agentId: 'a_mina',
              agentName: 'Mina Park',
              counterpartId: 'a_sato',
              counterpartName: 'Dr. Sato',
              previousValue: 'not-a-number',
              nextValue: Number.NaN,
              delta: {},
              reason: 'passive_drift',
            },
          },
          {
            id: 'evt-betrayal-nan',
            type: 'agent.betrayed',
            payload: {
              week: 2,
              betrayerId: 'a_mina',
              betrayerName: 'Mina Park',
              betrayedId: 'a_sato',
              betrayedName: 'Dr. Sato',
              trustDamageDelta: 'bad',
              trustDamageTotal: Number.NaN,
              triggeredConsequences: [],
            },
          },
        ],
      },
      fallback
    )

    expect(imported.events[0]).toMatchObject({
      type: 'agent.relationship_changed',
      payload: {
        previousValue: 0,
        nextValue: 0,
        delta: 0,
      },
    })
    expect(imported.events[1]).toMatchObject({
      type: 'agent.betrayed',
      payload: {
        trustDamageDelta: 0,
        trustDamageTotal: 0,
      },
    })
    expect(imported.events.every((event) => !JSON.stringify(event).includes('NaN'))).toBe(true)
  })

  it('repairs inconsistent operation-event arithmetic on import (328)', () => {
    const fallback = createStartingState()
    const imported = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-assignment-overflow',
            type: 'assignment.team_assigned',
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Case 001',
              caseKind: 'case',
              teamId: 't_nightwatch',
              teamName: 'Nightwatch',
              assignedTeamCount: 9,
              maxTeams: 2,
            },
          },
          {
            id: 'evt-standing-mismatch',
            type: 'faction.standing_changed',
            payload: {
              week: 2,
              factionId: 'institutions',
              factionName: 'Academic Institutions',
              delta: 3,
              standingBefore: 4,
              standingAfter: 99,
              reason: 'case.resolved',
            },
          },
          {
            id: 'evt-market-price-mismatch',
            type: 'market.transaction_recorded',
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
              totalPrice: 999,
              remainingAvailability: 12,
            },
          },
        ],
      },
      fallback
    )

    expect(imported.events[0]).toMatchObject({
      type: 'assignment.team_assigned',
      payload: {
        assignedTeamCount: 2,
        maxTeams: 2,
      },
    })
    expect(imported.events[1]).toMatchObject({
      type: 'faction.standing_changed',
      payload: {
        standingBefore: 4,
        standingAfter: 7,
        delta: 3,
      },
    })
    expect(imported.events[2]).toMatchObject({
      type: 'market.transaction_recorded',
      payload: {
        unitPrice: 7,
        quantity: 2,
        totalPrice: 14,
      },
    })
  })

  it('caps directive history to campaign week, dedupes, and orders by week (329)', () => {
    const fallback = createStartingState()
    const imported = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 5,
        directiveState: {
          selectedId: 'intel-surge',
          history: [
            { week: 9, directiveId: 'intel-surge' },
            { week: 3, directiveId: 'recovery-rotation' },
            { week: 3, directiveId: 'procurement-push' },
            { week: 2, directiveId: 'lockdown-protocol' },
          ],
        },
      },
      fallback
    )

    expect(imported.directiveState.history).toEqual([
      { week: 2, directiveId: 'lockdown-protocol' },
      { week: 3, directiveId: 'procurement-push' },
      { week: 5, directiveId: 'intel-surge' },
    ])
  })

  it('repairs weekly report RNG state from campaign seed chain instead of index fallback (330)', () => {
    const fallback = createStartingState()
    const imported = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        week: 4,
        rngSeed: 4242,
        reports: [
          {
            week: 2,
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
            notes: [],
          },
          {
            week: 3,
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
            notes: [],
          },
        ],
      },
      fallback
    )

    expect(imported.reports[0]?.rngStateBefore).toBe(4242)
    expect(imported.reports[0]?.rngStateAfter).toBeGreaterThan(0)
    expect(imported.reports[1]?.rngStateBefore).toBe(imported.reports[0]?.rngStateAfter)
    expect(imported.reports[1]?.rngStateAfter).toBeDefined()
  })

  describe('hydration problems 339-344', () => {
    it('339 filters report case id lists to snapshot/live ids and drops blank or duplicate entries', () => {
      const fallback = createStartingState()
      const liveCaseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          reports: [
            {
              week: 2,
              rngStateBefore: 1,
              rngStateAfter: 2,
              newCases: [liveCaseId, '  ', liveCaseId, 'case-archived', 'case-orphan'],
              progressedCases: ['case-archived', liveCaseId],
              resolvedCases: ['case-orphan', ''],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 0,
              avgFatigue: 0,
              teamStatus: [],
              caseSnapshots: {
                'case-archived': {
                  caseId: 'case-archived',
                  title: 'Archived Case',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'resolved',
                  stage: 2,
                  deadlineRemaining: 0,
                  durationWeeks: 2,
                  assignedTeamIds: [],
                },
              },
              notes: [],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.newCases).toEqual([])
      expect(hydrated.reports[0]?.progressedCases).toEqual(['case-archived', liveCaseId])
      expect(hydrated.reports[0]?.resolvedCases).toEqual([])
    })

    it('340 dedupes duplicate report weeks ascending and keeps the last entry', () => {
      const fallback = createStartingState()
      const liveCaseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          reports: [
            {
              week: 4,
              rngStateBefore: 1,
              rngStateAfter: 2,
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
                  id: 'note-week-4-a',
                  content: 'first',
                  timestamp: buildReportNoteTimestamp(4, 0),
                },
              ],
            },
            {
              week: 2,
              rngStateBefore: 2,
              rngStateAfter: 3,
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
              notes: [],
            },
            {
              week: 4,
              rngStateBefore: 3,
              rngStateAfter: 4,
              newCases: [],
              progressedCases: [liveCaseId],
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
                  id: 'note-week-4-b',
                  content: 'second',
                  timestamp: buildReportNoteTimestamp(4, 1),
                },
              ],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports.map((report) => report.week)).toEqual([2, 4])
      expect(hydrated.reports[1]?.progressedCases).toEqual([liveCaseId])
      expect(hydrated.reports[1]?.notes[0]?.content).toBe('second')
    })

    it('341 clamps avgFatigue to 0-100 and caps maxStage to snapshot stages', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              newCases: [],
              progressedCases: [],
              resolvedCases: [],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 99,
              avgFatigue: 250,
              teamStatus: [],
              caseSnapshots: {
                'case-archived': {
                  caseId: 'case-archived',
                  title: 'Archived Case',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'resolved',
                  stage: 3,
                  deadlineRemaining: 0,
                  durationWeeks: 2,
                  assignedTeamIds: [],
                },
              },
              notes: [],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.avgFatigue).toBe(100)
      expect(hydrated.reports[0]?.maxStage).toBe(3)
    })

    it('342 migrates equipment slot aliases and drops unknown slot keys', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              equipmentSlots: {
                primaryKit: 'silver_rounds',
                utility: 'signal_jammers',
                mystery_slot: 'ward_seals',
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.equipmentSlots).toEqual({
        primary: 'silver_rounds',
        utility1: 'signal_jammers',
      })
    })

    it('343 drops stale equipment quality keys on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              equipmentSlots: {
                utility1: 'signal_jammers',
              },
              equipment: {
                signal_jammers: 2,
                ward_seals: 4,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.equipment).toEqual({
        signal_jammers: 2,
      })
    })

    it('344 prunes queued plays with stale case or team targets', () => {
      const fallback = createStartingState()
      const startingCards = fallback.partyCards!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          partyCards: {
            ...startingCards,
            queuedPlays: [
              {
                playId: 'play-stale-case',
                cardId: 'card-breach-drill',
                targetCaseId: 'case-missing',
                weekPlayed: 1,
              },
              {
                playId: 'play-stale-team',
                cardId: 'card-surge-team',
                targetTeamId: 't_missing',
                weekPlayed: 1,
              },
              {
                playId: 'play-valid-global',
                cardId: 'card-field-briefing',
                targetCaseId: 'case-missing',
                weekPlayed: 1,
              },
              {
                playId: 'play-valid-case',
                cardId: 'card-breach-drill',
                targetCaseId: 'case-001',
                weekPlayed: 1,
              },
            ],
          },
        },
        fallback
      )

      expect(hydrated.partyCards?.queuedPlays).toEqual([
        {
          playId: 'play-valid-global',
          cardId: 'card-field-briefing',
          weekPlayed: 1,
        },
        {
          playId: 'play-valid-case',
          cardId: 'card-breach-drill',
          targetCaseId: 'case-001',
          weekPlayed: 1,
        },
      ])
    })
  })

  it('drops malformed party queued plays and filters unknown zone card ids (331-332)', () => {
    const fallback = createStartingState()
    const startingCards = fallback.partyCards!

    const imported = hydrateGame(
      {
        ...stripGameTemplates(fallback),
        partyCards: {
          ...startingCards,
          deck: [...startingCards.deck, 'card-unknown'],
          hand: ['card-breach-drill', 'card-missing'],
          discard: ['card-occult-ward', 'card-phantom'],
          queuedPlays: [
            {
              playId: 'play-valid',
              cardId: 'card-breach-drill',
              targetCaseId: 'case-001',
              weekPlayed: 1,
            },
            {
              playId: 'play-missing-card',
              weekPlayed: 1,
            },
            {
              playId: 'play-unknown-card',
              cardId: 'card-unknown',
              weekPlayed: 1,
            },
          ],
        },
      },
      fallback
    )

    expect(imported.partyCards?.deck).toEqual(
      startingCards.deck.filter((cardId) => cardId !== 'card-breach-drill')
    )
    expect(imported.partyCards?.hand).toEqual(['card-breach-drill'])
    expect(imported.partyCards?.discard).toEqual([])
    expect(imported.partyCards?.deck).toContain('card-occult-ward')
    expect(imported.partyCards?.queuedPlays).toEqual([
      {
        playId: 'play-valid',
        cardId: 'card-breach-drill',
        targetCaseId: 'case-001',
        weekPlayed: 1,
      },
    ])
  })

  describe('hydration problems 345-351', () => {
    it('345 backfills empty history and partial counters on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              history: {
                counters: {
                  casesResolved: 2,
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.history).toMatchObject({
        counters: expect.objectContaining({
          assignmentsCompleted: 0,
          casesResolved: 2,
          casesPartiallyResolved: 0,
          casesFailed: 0,
        }),
        performanceStats: expect.objectContaining({
          deployments: 0,
          totalContribution: 0,
        }),
        timeline: [],
        logs: [],
      })
    })

    it('346 replaces NaN performanceStats with finite defaults on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              history: {
                ...baseAgent.history!,
                performanceStats: {
                  deployments: Number.NaN,
                  totalContribution: Number.POSITIVE_INFINITY,
                  totalThreatHandled: 'bad',
                },
              },
            },
          },
        },
        fallback
      )

      const stats = hydrated.agents[agentId]?.history?.performanceStats
      expect(stats?.deployments).toBe(0)
      expect(stats?.totalContribution).toBe(0)
      expect(stats?.totalThreatHandled).toBe(0)
      expect(JSON.stringify(stats)).not.toMatch(/NaN|Infinity/)
    })

    it('347 drops timeline entries with invalid eventType on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              history: {
                ...baseAgent.history!,
                timeline: [
                  {
                    week: 2,
                    eventType: 'agent.training_completed',
                    note: 'Valid entry',
                    eventId: 'evt-valid',
                  },
                  {
                    week: 2,
                    eventType: 'simulation.weekly_tick',
                    note: 'Weekly tick',
                  },
                  {
                    week: 2,
                    eventType: 'bogus.event',
                    note: 'Drop me',
                  },
                ],
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.history?.timeline).toEqual([
        {
          week: 2,
          eventType: 'agent.training_completed',
          note: 'Valid entry',
          eventId: 'evt-valid',
        },
        {
          week: 2,
          eventType: 'simulation.weekly_tick',
          note: 'Weekly tick',
        },
      ])
    })

    it('348 drops history logs that fail operation-event payload validation', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              history: {
                ...baseAgent.history!,
                logs: [
                  {
                    id: 'evt-valid-log',
                    schemaVersion: 2,
                    type: 'agent.training_completed',
                    sourceSystem: 'agent',
                    timestamp: '2042-01-08T00:00:00.001Z',
                    payload: {
                      week: 2,
                      queueId: 'queue-1',
                      agentId,
                      agentName: baseAgent.name,
                      trainingId: 'combat-drills',
                      trainingName: 'Close-Quarters Drills',
                    },
                  },
                  {
                    id: 'evt-invalid-log',
                    type: 'agent.training_completed',
                    timestamp: '2042-01-08T00:00:00.002Z',
                    payload: {
                      week: 2,
                    },
                  },
                  {
                    id: 'evt-unknown-type',
                    type: 'bogus.event',
                    timestamp: '2042-01-08T00:00:00.003Z',
                    payload: { week: 2 },
                  },
                ],
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.history?.logs).toEqual([
        expect.objectContaining({
          id: 'evt-valid-log',
          type: 'agent.training_completed',
          schemaVersion: 2,
        }),
      ])
    })

    it('349 drops abilityState keys that are not present on agent.abilities', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              abilities: [
                {
                  id: 'ward-hum',
                  label: 'Ward Hum',
                  type: 'active',
                  trigger: 'OnExposure',
                  cooldown: 2,
                  effect: { control: 2 },
                },
              ],
              abilityState: {
                'ward-hum': { cooldownRemaining: 1 },
                'stale-ability': { cooldownRemaining: 9 },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.abilityState).toEqual({
        'ward-hum': { cooldownRemaining: 1 },
      })
    })

    it('350 clamps relationships to the documented -2..+2 range on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              relationships: {
                a_sato: 9,
                a_mina: -5,
                a_kellan: 1.25,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.relationships).toEqual({
        a_sato: 2,
        a_mina: -2,
        a_kellan: 1.25,
      })
    })

    it('351 sanitizes malformed traits and abilities while preserving valid entries', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              traits: [
                {
                  id: 'trait-valid',
                  label: 'Steady Hands',
                  modifiers: { combat: 2, bogus: 99, overall: Number.NaN },
                },
                { id: '', label: 'Drop' },
              ],
              abilities: [
                {
                  id: 'ability-valid',
                  label: 'Signal Overclock',
                  type: 'active',
                  trigger: 'OnCaseStart',
                  cooldown: 2,
                  effect: { utility: 3, mystery: 1 },
                },
                {
                  id: 'ability-bad-trigger',
                  label: 'Bad Trigger',
                  type: 'active',
                  trigger: 'OnBadTrigger',
                  cooldown: Number.NaN,
                  effect: {},
                },
                { id: 'ability-missing-label' },
              ],
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.traits).toEqual([
        {
          id: 'trait-valid',
          label: 'Steady Hands',
          modifiers: { combat: 2 },
        },
      ])
      expect(agent?.abilities).toEqual([
        {
          id: 'ability-valid',
          label: 'Signal Overclock',
          type: 'active',
          trigger: 'OnCaseStart',
          cooldown: 2,
          effect: { utility: 3 },
        },
        {
          id: 'ability-bad-trigger',
          label: 'Bad Trigger',
          type: 'active',
          effect: {},
        },
      ])
      expect(agent?.abilityState).toEqual({
        'ability-valid': { cooldownRemaining: 0 },
        'ability-bad-trigger': { cooldownRemaining: 0 },
      })
    })
  })

  describe('hydration problems 352-358', () => {
    it('352 normalizes recovery, trauma, downtime, side-work, and coping streak fields', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              recoveryStatus: {
                state: 'bogus',
                sinceWeek: Number.NaN,
              },
              trauma: {
                traumaLevel: Number.POSITIVE_INFINITY,
                traumaTags: ['exposure', '', 12],
                lastEventWeek: 0,
              },
              downtimeActivity: {
                activity: 'bogus',
                sinceWeek: 2,
                foregoneThisInterval: ['rest', 'bogus'],
              },
              downtimeSideWorkLast: {
                week: 3,
                optionId: 'bogus',
                outcome: 'paid',
                fundingDelta: -4,
                fatigueDelta: Number.NaN,
              },
              copingStreak: -3,
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.recoveryStatus).toBeUndefined()
      expect(agent?.trauma).toMatchObject({
        traumaLevel: 0,
        traumaTags: ['exposure'],
        lastEventWeek: 1,
      })
      expect(agent?.downtimeActivity).toBeUndefined()
      expect(agent?.downtimeSideWorkLast).toBeUndefined()
      expect(agent?.copingStreak).toBeUndefined()
    })

    it('353 clamps fatigue channels to 0-100 and overdrive phases/debt to nonnegative values', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              fatigueChannels: {
                physicalExhaustion: 250,
                mentalExhaustion: Number.NaN,
                combatStress: -5,
                capabilityUsesThisPhase: -2,
              },
              overdrive: {
                active: true,
                remainingPhases: -4,
                recoveryDebt: Number.NaN,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.fatigueChannels).toEqual({
        physicalExhaustion: 100,
        mentalExhaustion: 0,
        combatStress: 0,
        capabilityUsesThisPhase: 0,
      })
      expect(hydrated.agents[agentId]?.overdrive).toEqual({
        active: true,
        remainingPhases: 0,
        recoveryDebt: 0,
      })
    })

    it('354 normalizes energyBudget on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              energyBudget: {
                currentReserve: 999,
                reserveBand: 'stable',
                exertionDebt: -3,
                estimateConfidence: 'bogus',
                lastDutyCost: Number.NaN,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.energyBudget).toEqual({
        currentReserve: 100,
        reserveBand: 'stable',
        exertionDebt: 0,
        estimateConfidence: 'medium',
      })
    })

    it('355 sanitizes trust damage, consequence stack, and performance penalty multiplier', () => {
      const fallback = createStartingState()
      const subjectId = Object.keys(fallback.agents)[0]!
      const counterpartId = Object.keys(fallback.agents)[1]!
      const baseAgent = fallback.agents[subjectId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [subjectId]: {
              ...baseAgent,
              trustDamageByAgent: {
                [counterpartId]: 0.82,
                a_missing: 0.5,
                a_sato: Number.NaN,
              },
              trustConsequenceStack: [
                {
                  reason: 'betrayal',
                  pairAgentId: counterpartId,
                  triggeredWeek: 2,
                  consequenceType: 'performance_penalty',
                  expiresWeek: 6,
                },
                {
                  reason: 'betrayal',
                  pairAgentId: 'a_missing',
                  triggeredWeek: 2,
                  consequenceType: 'benching',
                },
                {
                  reason: 'other',
                  pairAgentId: counterpartId,
                  triggeredWeek: 2,
                  consequenceType: 'benching',
                },
              ],
              performancePenaltyMultiplier: 9,
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[subjectId]
      expect(agent?.trustDamageByAgent).toEqual({
        [counterpartId]: 0.82,
      })
      expect(agent?.trustConsequenceStack).toEqual([
        {
          reason: 'betrayal',
          pairAgentId: counterpartId,
          triggeredWeek: 2,
          consequenceType: 'performance_penalty',
          expiresWeek: 6,
        },
      ])
      expect(agent?.performancePenaltyMultiplier).toBe(1)
    })

    it('356 falls back unknown agent roles to investigator', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              role: 'bogus-role' as typeof baseAgent.role,
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.role).toBe('investigator')
      expect(hydrated.agents[agentId]?.operationalRole).toBe('investigation')
    })

    it('357 replaces non-finite baseStats and domain stats with finite values', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              baseStats: {
                combat: Number.NaN,
                investigation: 200,
                utility: -10,
                social: 44,
              },
              stats: {
                ...baseAgent.stats!,
                physical: {
                  strength: Number.POSITIVE_INFINITY,
                  endurance: -3,
                },
              },
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.baseStats).toEqual({
        combat: baseAgent.baseStats.combat,
        investigation: 100,
        utility: 0,
        social: 44,
      })
      expect(agent?.stats?.physical.strength).toBe(baseAgent.baseStats.combat)
      expect(agent?.stats?.physical.endurance).toBeGreaterThanOrEqual(0)
      expect(JSON.stringify(agent?.stats)).not.toMatch(/NaN|Infinity/)
    })

    it('358 clears assignments that reference missing cases, teams, or training programs', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!
      const liveCaseId = Object.keys(fallback.cases)[0]!
      const liveTeamId = Object.keys(fallback.teams)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              assignment: {
                state: 'assigned',
                caseId: 'case-missing',
                teamId: liveTeamId,
                startedWeek: 2,
              },
            },
            a_sato: {
              ...fallback.agents.a_sato,
              assignment: {
                state: 'assigned',
                caseId: liveCaseId,
                teamId: 't_missing',
                startedWeek: 2,
              },
            },
            a_kellan: {
              ...fallback.agents.a_kellan,
              assignment: {
                state: 'training',
                startedWeek: 2,
                teamId: liveTeamId,
                trainingProgramId: 'bogus-program',
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.assignment).toEqual({ state: 'idle' })
      expect(hydrated.agents.a_sato?.assignment).toEqual({ state: 'idle' })
      expect(hydrated.agents.a_kellan?.assignment).toEqual({
        state: 'training',
        startedWeek: 2,
        teamId: liveTeamId,
      })
    })
  })

  describe('hydration problems 359-366', () => {
    it('359 replaces non-finite progression level and point counters on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              level: Number.NaN,
              progression: {
                ...baseAgent.progression!,
                level: Number.POSITIVE_INFINITY,
                xp: Number.NaN,
                trainingPoints: -4.5,
                lastTrainingWeek: Number.NaN,
                skillTree: {
                  skillPoints: Number.NaN,
                  trainedRelationships: {},
                },
              },
            },
          },
        },
        fallback
      )

      const progression = hydrated.agents[agentId]?.progression
      expect(progression?.level).toBe(1)
      expect(progression?.xp).toBe(baseAgent.progression?.xp ?? 0)
      expect(progression?.trainingPoints).toBe(0)
      expect(progression?.skillTree?.skillPoints).toBe(0)
      expect(progression?.lastTrainingWeek).toBeUndefined()
      expect(JSON.stringify(progression)).not.toMatch(/NaN|Infinity/)
    })

    it('360 replaces non-finite history counters on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              history: {
                ...baseAgent.history!,
                counters: {
                  ...baseAgent.history!.counters,
                  assignmentsCompleted: Number.NaN,
                  casesResolved: 2.9,
                  stressSustained: Number.POSITIVE_INFINITY,
                  evidenceRecovered: -3,
                },
              },
            },
          },
        },
        fallback
      )

      const counters = hydrated.agents[agentId]?.history?.counters
      expect(counters?.assignmentsCompleted).toBe(0)
      expect(counters?.casesResolved).toBe(2)
      expect(counters?.stressSustained).toBe(0)
      expect(counters?.evidenceRecovered).toBe(0)
      expect(JSON.stringify(counters)).not.toMatch(/NaN|Infinity/)
    })

    it('361 normalizes identity age, name, callsign, and portrait policy on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              name: '  ',
              age: 200,
              identity: {
                name: '  ',
                age: Number.NaN,
                codename: '   ',
                callsign: '  ',
                portraitId: 'bogus-portrait',
                background: '  Field veteran  ',
              },
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.name).toBe(agentId)
      expect(agent?.age).toBeUndefined()
      expect(agent?.identity).toMatchObject({
        name: agentId,
        background: 'Field veteran',
      })
      expect(agent?.identity?.codename).toBeUndefined()
      expect(agent?.identity?.portraitId).toBeUndefined()
    })

    it('362 drops unknown certifications and enforces temporal and training consistency', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              progression: {
                ...baseAgent.progression!,
                certifications: {
                  'bogus-cert': {
                    certificationId: 'bogus-cert',
                    state: 'certified',
                    awardedWeek: 4,
                    expiresWeek: 2,
                  },
                  'combat-operator-cert': {
                    certificationId: 'combat-operator-cert',
                    state: 'certified',
                    awardedWeek: 3,
                    expiresWeek: 2,
                    sourceTrainingIds: ['bogus-program', 'combat-drills', 'combat-drills'],
                  },
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.progression?.certifications).toEqual({
        'combat-operator-cert': {
          certificationId: 'combat-operator-cert',
          state: 'certified',
          awardedWeek: 3,
          expiresWeek: 3,
          sourceTrainingIds: ['combat-drills'],
        },
      })
    })

    it('363 bounds certProgress and failedAttempts to known nonnegative integer keys', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              progression: {
                ...baseAgent.progression!,
                certProgress: {
                  'combat-operator-cert': -2.5,
                  'bogus-cert': 10,
                },
                failedAttemptsByTrainingId: {
                  'cert:combat-operator-cert': 1.8,
                  'combat-drills': -1,
                  'bogus-program': 2,
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.progression?.certProgress).toEqual({
        'combat-operator-cert': 0,
      })
      expect(hydrated.agents[agentId]?.progression?.failedAttemptsByTrainingId).toEqual({
        'cert:combat-operator-cert': 1,
        'combat-drills': 0,
      })
    })

    it('364 reconciles contradictory trainingProfile fields on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              progression: {
                ...baseAgent.progression!,
                trainingProfile: {
                  agentId: 'wrong-agent',
                  currentRole: 'hunter',
                  trainingStatus: 'idle',
                  assignedTrainingId: 'combat-drills',
                  trainingStartedWeek: 5,
                  trainingEtaWeek: 3,
                  trainingQueuePosition: 2,
                  readinessImpact: 0,
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.progression?.trainingProfile).toEqual({
        agentId,
        currentRole: baseAgent.role,
        trainingStatus: 'idle',
        readinessImpact: 0,
      })
    })

    it('365 rebuilds skillTree from known fields and sanitizes partner counters', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const counterpartId = Object.keys(fallback.agents)[1]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              progression: {
                ...baseAgent.progression!,
                skillTree: {
                  skillPoints: 2.7,
                  specialization: 'bogus',
                  trainedRelationships: {
                    [counterpartId]: -3,
                    a_missing: 4,
                  },
                  mysteryField: 99,
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.progression?.skillTree).toEqual({
        skillPoints: 2,
        trainedRelationships: {
          [counterpartId]: 0,
        },
      })
    })

    it('366 always derives operationalRole from role and preserves valid specialization text', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              role: 'hunter',
              specialization: '  recon  ',
              operationalRole: 'support',
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.role).toBe('hunter')
      expect(agent?.operationalRole).toBe('field')
      expect(agent?.specialization).toBe('recon')
    })
  })

  describe('hydration problems 367-373', () => {
    it('367 normalizes malformed attrition state and preserves valid attrition on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              attritionState: {
                attritionStatus: 'lost',
                attritionCategory: 'injury_exit',
                attritionSinceWeek: 0,
                returnEligibleWeek: 1,
                lossReasonCodes: ['legacy-loss', '', 9 as unknown as string],
                replacementPriority: Number.NaN,
                retentionPressure: -2,
              },
            },
            a_kellan: {
              ...fallback.agents.a_kellan!,
              attritionState: {
                attritionStatus: 'bogus' as 'lost',
                lossReasonCodes: [],
                replacementPriority: 1,
                retentionPressure: 0,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.attritionState).toEqual({
        attritionStatus: 'lost',
        attritionCategory: 'injury_exit',
        attritionSinceWeek: 1,
        returnEligibleWeek: 1,
        lossReasonCodes: ['legacy-loss'],
        replacementPriority: 0,
        retentionPressure: 0,
      })
      expect(hydrated.agents.a_kellan?.attritionState).toBeUndefined()
    })

    it('368 attrition lost/temporary-unavailable overrides readiness for active agents', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const counterpartId = Object.keys(fallback.agents)[1]!
      const baseAgent = fallback.agents[agentId]!

      const lostHydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              status: 'active',
              assignment: { state: 'idle' },
              attritionState: {
                attritionStatus: 'lost',
                attritionCategory: 'injury_exit',
                attritionSinceWeek: 2,
                lossReasonCodes: ['import-loss'],
                replacementPriority: 2,
                retentionPressure: 1,
              },
            },
          },
        },
        fallback
      )

      expect(lostHydrated.agents[agentId]?.readinessProfile?.state).toBe('unavailable')
      expect(lostHydrated.agents[agentId]?.readinessProfile?.deploymentEligible).toBe(false)
      expect(lostHydrated.agents[agentId]?.readinessProfile?.riskFlags).toContain(
        'attrition-unavailable'
      )

      const tempHydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [counterpartId]: {
              ...fallback.agents[counterpartId]!,
              status: 'active',
              assignment: { state: 'idle' },
              attritionState: {
                attritionStatus: 'temporarily_unavailable',
                attritionCategory: 'temporary_leave',
                attritionSinceWeek: 3,
                returnEligibleWeek: 6,
                lossReasonCodes: ['leave'],
                replacementPriority: 1,
                retentionPressure: 0,
              },
            },
          },
        },
        fallback
      )

      expect(tempHydrated.agents[counterpartId]?.readinessProfile?.state).toBe('unavailable')

      const deadHydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          agents: {
            [agentId]: {
              ...baseAgent,
              status: 'dead',
              attritionState: {
                attritionStatus: 'active',
                lossReasonCodes: [],
                replacementPriority: 0,
                retentionPressure: 0,
              },
            },
          },
        },
        fallback
      )

      expect(deadHydrated.agents[agentId]?.attritionState?.attritionStatus).toBe('lost')
      expect(deadHydrated.agents[agentId]?.readinessProfile?.state).toBe('unavailable')
    })

    it('369 filters unknown training IDs, future weeks, and duplicate training history', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          agents: {
            [agentId]: {
              ...baseAgent,
              progression: {
                ...baseAgent.progression!,
                trainingHistory: [
                  { trainingId: 'combat-drills', week: 2 },
                  { trainingId: 'bogus-program', week: 3 },
                  { trainingId: 'combat-drills', week: 9 },
                  { trainingId: 'combat-drills', week: 2 },
                  { trainingId: 'threat-assessment', week: 4 },
                ],
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.progression?.trainingHistory).toEqual([
        { trainingId: 'combat-drills', week: 2 },
        { trainingId: 'threat-assessment', week: 4 },
      ])
    })

    it('370 enforces service record chronology against joinedWeek and campaign week', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 8,
          agents: {
            [agentId]: {
              ...baseAgent,
              serviceRecord: {
                joinedWeek: 6,
                lastAssignmentWeek: 2,
                lastCaseWeek: 12,
                lastTrainingWeek: 1,
                lastRecoveryWeek: 9,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.serviceRecord).toEqual({
        joinedWeek: 6,
        lastAssignmentWeek: 6,
        lastCaseWeek: 8,
        lastTrainingWeek: 6,
        lastRecoveryWeek: 8,
      })
    })

    it('371 removes self, stale, and blank alliesWorkedWith references', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const counterpartId = Object.keys(fallback.agents)[1]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              history: {
                ...baseAgent.history!,
                alliesWorkedWith: [agentId, counterpartId, 'a_missing', '', counterpartId],
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.history?.alliesWorkedWith).toEqual([counterpartId])
    })

    it('372 keeps historical bonds but drops self and stale roster keys', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const counterpartId = Object.keys(fallback.agents)[1]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              relationships: { [counterpartId]: 1 },
              history: {
                ...baseAgent.history!,
                bonds: {
                  [agentId]: 50,
                  [counterpartId]: 120,
                  a_missing: -40,
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.history?.bonds).toEqual({
        [counterpartId]: 100,
      })
      expect(hydrated.agents[agentId]?.relationships[counterpartId]).toBe(1)
    })

    it('373 normalizes baseStats before potential tier and stat caps on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              baseStats: {
                combat: Number.NaN,
                investigation: 200,
                utility: -10,
                social: 44,
              },
              progression: {
                ...baseAgent.progression!,
                potentialTier: 'high',
                potentialIntel: {
                  visibleTier: 'A',
                  exactKnown: false,
                  confidence: 'low',
                  discoveryProgress: 10,
                },
              },
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.baseStats.investigation).toBe(100)
      expect(agent?.progression?.potentialTier).toBe('A')
      expect(agent?.progression?.statCaps?.investigation).toBeGreaterThanOrEqual(100)
      expect(JSON.stringify(agent?.progression?.statCaps)).not.toMatch(/NaN|Infinity/)
    })
  })

  describe('hydration problems 374-381', () => {
    function makeHydrationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
      const fallback = createStartingState()
      const seed = fallback.cases['case-001']!

      return {
        ...seed,
        id,
        templateId: overrides.templateId ?? seed.templateId,
        title: overrides.title ?? id,
        assignedTeamIds: [],
        ...overrides,
      }
    }

    it('374 falls back invalid case enums and preserves known spatial enums on hydrate', () => {
      const fallback = createStartingState()
      const caseId = 'case-enum-test'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              mode: 'bogus' as CaseInstance['mode'],
              kind: 'bogus' as CaseInstance['kind'],
              status: 'bogus' as CaseInstance['status'],
              hiddenState: 'bogus' as CaseInstance['hiddenState'],
              infiltrationStage: 'bogus' as CaseInstance['infiltrationStage'],
              siteLayer: 'bogus' as CaseInstance['siteLayer'],
              visibilityState: 'bogus' as CaseInstance['visibilityState'],
              transitionType: 'bogus' as CaseInstance['transitionType'],
            },
            'case-spatial-valid': {
              ...makeHydrationCase('case-spatial-valid'),
              siteLayer: 'interior',
              visibilityState: 'obstructed',
              transitionType: 'chokepoint',
              infiltrationStage: 'exposed',
            },
          },
        },
        fallback
      )

      const repaired = hydrated.cases[caseId]!
      expect(repaired.mode).toBe(fallback.cases['case-001']!.mode)
      expect(repaired.kind).toBe(fallback.cases['case-001']!.kind)
      expect(repaired.status).toBe('open')
      expect(repaired.hiddenState).toBeUndefined()
      expect(repaired.infiltrationStage).toBeUndefined()

      const spatial = hydrated.cases['case-spatial-valid']!
      expect(spatial.siteLayer).toBe('interior')
      expect(spatial.visibilityState).toBe('obstructed')
      expect(spatial.transitionType).toBe('chokepoint')
      expect(spatial.infiltrationStage).toBe('exposed')
    })

    it('375 clamps case clocks in a status-aware way on hydrate', () => {
      const fallback = createStartingState()
      const openId = 'case-open-clocks'
      const progressId = 'case-progress-clocks'
      const resolvedId = 'case-resolved-clocks'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [openId]: {
              ...makeHydrationCase(openId, { status: 'open', durationWeeks: 4, deadlineWeeks: 6 }),
              weeksRemaining: 99,
              deadlineRemaining: 99,
            },
            [progressId]: {
              ...makeHydrationCase(progressId, {
                status: 'in_progress',
                durationWeeks: 4,
                deadlineWeeks: 6,
              }),
              weeksRemaining: 99,
              deadlineRemaining: 99,
            },
            [resolvedId]: {
              ...makeHydrationCase(resolvedId, {
                status: 'resolved',
                durationWeeks: 4,
                deadlineWeeks: 6,
              }),
              weeksRemaining: 2,
              deadlineRemaining: 4,
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[openId]?.weeksRemaining).toBeUndefined()
      expect(hydrated.cases[openId]?.deadlineRemaining).toBe(6)
      expect(hydrated.cases[progressId]?.weeksRemaining).toBe(4)
      expect(hydrated.cases[progressId]?.deadlineRemaining).toBe(6)
      expect(hydrated.cases[resolvedId]?.weeksRemaining).toBeUndefined()
      expect(hydrated.cases[resolvedId]?.deadlineRemaining).toBe(0)
    })

    it('376 dedupes assigned teams, drops unknown ids, and caps raid vs normal assignment', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const normalId = 'case-normal-teams'
      const raidId = 'case-raid-teams'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [normalId]: {
              ...makeHydrationCase(normalId, { kind: 'case' }),
              assignedTeamIds: [teamId, teamId, 'missing-team', teamId],
            },
            [raidId]: {
              ...makeHydrationCase(raidId, {
                kind: 'raid',
                raid: { minTeams: 2, maxTeams: 2 },
              }),
              assignedTeamIds: [teamId, teamId, 'missing-team', teamId],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[normalId]?.assignedTeamIds).toEqual([teamId])
      expect(hydrated.cases[raidId]?.assignedTeamIds).toEqual([teamId])
      expect(hydrated.cases[raidId]?.raid).toEqual({ minTeams: 2, maxTeams: 2 })
    })

    it('377 clamps intel and pressure scalars on hydrate', () => {
      const fallback = createStartingState()
      const caseId = 'case-scalars'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              intelConfidence: 4,
              intelUncertainty: -2,
              detectionConfidence: 9,
              infiltrationProbeProgress: 2,
              infiltrationAwareness: -1,
              escalationLevel: 99,
              threatDrift: -3,
              timePressure: 50,
            },
          },
        },
        fallback
      )

      const repaired = hydrated.cases[caseId]!
      expect(repaired.intelConfidence).toBe(1)
      expect(repaired.intelUncertainty).toBe(0)
      expect(repaired.detectionConfidence).toBe(1)
      expect(repaired.infiltrationProbeProgress).toBe(1)
      expect(repaired.infiltrationAwareness).toBe(0)
      expect(repaired.escalationLevel).toBe(8)
      expect(repaired.threatDrift).toBe(0)
      expect(repaired.timePressure).toBe(8)
    })

    it('378 reconciles hidden and displacement fields on hydrate', () => {
      const fallback = createStartingState()
      const hiddenCounterId = 'case-hidden-counter'
      const displacedMissingTargetId = 'case-displaced-missing-target'
      const revealedWithTargetId = 'case-revealed-target'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [hiddenCounterId]: {
              ...makeHydrationCase(hiddenCounterId),
              hiddenState: 'hidden',
              counterDetection: true,
              detectionConfidence: 0.1,
            },
            [displacedMissingTargetId]: {
              ...makeHydrationCase(displacedMissingTargetId),
              hiddenState: 'displaced',
              displacementTarget: null,
              route: 'alpha',
            },
            [revealedWithTargetId]: {
              ...makeHydrationCase(revealedWithTargetId),
              hiddenState: 'revealed',
              displacementTarget: 'site_beta',
              route: 'beta',
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[hiddenCounterId]?.hiddenState).toBe('revealed')
      expect(hydrated.cases[hiddenCounterId]?.detectionConfidence).toBe(0.1)
      expect(hydrated.cases[displacedMissingTargetId]?.hiddenState).toBe('revealed')
      expect(hydrated.cases[displacedMissingTargetId]?.displacementTarget).toBeUndefined()
      expect(hydrated.cases[revealedWithTargetId]?.displacementTarget).toBeUndefined()
      expect(hydrated.cases[revealedWithTargetId]?.route).toBe('beta')
    })

    it('379 normalizes onFail and onUnresolved spawn rules on hydrate', () => {
      const fallback = createStartingState()
      const caseId = 'case-spawn-rules'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              onFail: {
                stageDelta: Number.NaN,
                spawnCount: { min: -2, max: 1 },
                spawnTemplateIds: ['ops-001', '', 3 as unknown as string],
              },
              onUnresolved: {
                spawnCount: { min: 1, max: 0 },
                spawnTemplateIds: ['ops-002'],
              },
            },
          },
        },
        fallback
      )

      const repaired = hydrated.cases[caseId]!
      expect(repaired.onFail).toEqual({
        stageDelta: 0,
        spawnCount: { min: 0, max: 1 },
        spawnTemplateIds: ['ops-001'],
      })
      expect(repaired.onUnresolved.spawnCount).toEqual({ min: 1, max: 1 })
      expect(repaired.onUnresolved.spawnTemplateIds).toEqual(['ops-002'])
    })

    it('380 strips unknown majorIncident keys and keeps typed runtime fields', () => {
      const fallback = createStartingState()
      const caseId = 'case-major-incident'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId, { kind: 'raid', status: 'in_progress' }),
              majorIncident: {
                strategy: 'bogus',
                provisions: ['medical_supplies', 'unknown_kit', 9],
                durationWeeks: 0,
                requiredTeams: 2,
                difficulty: 40,
                mysteryField: 'strip-me',
                rewardPreview: { cache: true },
              },
            },
          },
        },
        fallback
      )

      const runtime = hydrated.cases[caseId]?.majorIncident
      expect(runtime?.strategy).toBe('balanced')
      expect(runtime?.provisions).toEqual(['medical_supplies'])
      expect(runtime?.durationWeeks).toBe(1)
      expect(runtime?.requiredTeams).toBe(2)
      expect(runtime?.difficulty).toBe(40)
      expect(runtime).not.toHaveProperty('mysteryField')
      expect(runtime).not.toHaveProperty('rewardPreview')
    })

    it('381 validates deploymentCarryIn against roster, week, and known codes', () => {
      const fallback = createStartingState()
      const teamId = 't_nightwatch'
      const agentId = 'a_ava'
      const outsiderId = 'a_sato'
      const caseId = 'case-carry-in'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId, {
                status: 'in_progress',
                durationWeeks: 3,
                weeksRemaining: 3,
                assignedTeamIds: [teamId],
              }),
              deploymentCarryInByAgentId: {
                [agentId]: {
                  code: 'well-rested-stable-energy',
                  readinessDelta: 2,
                  stampedWeek: 99,
                },
                [outsiderId]: {
                  code: 'well-rested-stable-energy',
                  readinessDelta: 2,
                  stampedWeek: 5,
                },
                ghost: {
                  code: 'bogus-code',
                  readinessDelta: 1,
                  stampedWeek: 5,
                },
              },
            },
            'case-carry-in-stale-week': {
              ...makeHydrationCase('case-carry-in-stale-week', {
                status: 'in_progress',
                durationWeeks: 3,
                weeksRemaining: 1,
                assignedTeamIds: [teamId],
              }),
              deploymentCarryInByAgentId: {
                [agentId]: {
                  code: 'residue-therapy-foregone',
                  readinessDelta: -1,
                  stampedWeek: 5,
                },
              },
            },
          },
        },
        fallback
      )

      const carryIn = hydrated.cases[caseId]?.deploymentCarryInByAgentId
      expect(carryIn?.[agentId]).toEqual({
        code: 'well-rested-stable-energy',
        readinessDelta: 2,
        stampedWeek: 5,
      })
      expect(carryIn?.[outsiderId]).toBeUndefined()
      expect(carryIn?.ghost).toBeUndefined()
      expect(hydrated.cases['case-carry-in-stale-week']?.deploymentCarryInByAgentId).toBeUndefined()
    })
  })

  describe('hydration problems 382-388', () => {
    function makeHydrationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
      const fallback = createStartingState()
      const seed = fallback.cases['case-001']!

      return {
        ...seed,
        id,
        templateId: overrides.templateId ?? seed.templateId,
        title: overrides.title ?? id,
        assignedTeamIds: [],
        ...overrides,
      }
    }

    function makeMapLayerFixture() {
      const stages: SiteGenerationStageSnapshot = {
        purpose: 'ritual_complex',
        builder: 'cult_engineers',
        location: 'riverfront_substrate',
        ingress: 'floodgate',
        topology: 'concentric_sanctum',
        hazards: ['ward_feedback'],
        treasure: ['sealed_reliquary'],
        inhabitants: ['ritual_adepts'],
      }
      return resolveMapMetadata(stages, () => 0.2)
    }

    it('382 sanitizes beliefTracks tiers with per-track fallback and safe pressure math', () => {
      const fallback = createStartingState()
      const caseId = 'case-belief-tracks'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              beliefTracks: {
                factTruth: 'condemned',
                witnessInterpretation: 'bogus',
                institutionalJudgment: 'suspected',
                crowdConsensus: 'uncertain',
              },
            },
          },
        },
        fallback
      )

      const repaired = hydrated.cases[caseId]!
      expect(repaired.beliefTracks).toEqual({
        factTruth: 'condemned',
        witnessInterpretation: 'clear',
        institutionalJudgment: 'suspected',
        crowdConsensus: 'uncertain',
      })
      expect(getBeliefDrivenCasePressure(repaired.beliefTracks!)).toBe(3)
      expect(getCasePressureWithBelief(repaired, repaired.beliefTracks)).toBeGreaterThan(0)
    })

    it('383 applies normalizeDistortionStates ordering on hydrate', () => {
      const fallback = createStartingState()
      const caseId = 'case-distortion'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              distortion: ['bogus', 'unreliable', 'misleading', 'fragmented'] as DistortionState[],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.distortion).toEqual(['misleading', 'fragmented', 'unreliable'])
    })

    it('384 clears invalid infiltrationWeeklyProbeActionOverride on hydrate', () => {
      const fallback = createStartingState()
      const validId = 'case-probe-override-valid'
      const invalidId = 'case-probe-override-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              infiltrationWeeklyProbeActionOverride: 'probe_route',
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId, {
                infiltrationWeeklyProbeActionOverride: 'probe_vault' as 'probe_route',
              }),
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.infiltrationWeeklyProbeActionOverride).toBe('probe_route')
      expect(hydrated.cases[invalidId]?.infiltrationWeeklyProbeActionOverride).toBeUndefined()
    })

    it('385 sanitizes infiltrationProbePlan thresholds, actions, and rule order', () => {
      const fallback = createStartingState()
      const caseId = 'case-probe-plan'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              infiltrationProbePlan: {
                defaultAction: 'bogus',
                cleanupWhenAwarenessAtLeast: 2,
                actionWhenProbeProgressBelow: [
                  { belowProbeProgress: 0.8, action: 'probe_access' },
                  { belowProbeProgress: 0.4, action: 'cleanup' },
                  { belowProbeProgress: 1.5, action: 'probe_route' },
                  { belowProbeProgress: 'bad', action: 'probe_route' },
                ],
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.infiltrationProbePlan).toEqual({
        actionWhenProbeProgressBelow: [
          { belowProbeProgress: 0.4, action: 'cleanup' },
          { belowProbeProgress: 0.8, action: 'probe_access' },
        ],
      })
    })

    it('386 strips dangling mapLayer refs and drops layers with invalid authoringMode', () => {
      const fallback = createStartingState()
      const validId = 'case-map-valid'
      const brokenId = 'case-map-broken'
      const invalidModeId = 'case-map-mode'
      const mapLayer = makeMapLayerFixture()
      const ghostSymbol = mapLayer.legend[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              mapLayer: {
                ...mapLayer,
                zones: mapLayer.zones.map((zone, index) =>
                  index === 0
                    ? {
                        ...zone,
                        symbolIds: [...zone.symbolIds, 'ghost_symbol'],
                        hiddenSymbolIds: [...zone.hiddenSymbolIds, 'ghost_hidden'],
                      }
                    : zone
                ),
                routes: mapLayer.routes.map((route, index) =>
                  index === 0
                    ? { ...route, activeSymbolIds: [...route.activeSymbolIds, 'ghost_symbol'] }
                    : route
                ),
                occupierKnownRouteIds: [...mapLayer.occupierKnownRouteIds, 'ghost_route'],
                scaleAnchors: [
                  ...mapLayer.scaleAnchors,
                  {
                    id: 'bad_anchor',
                    fromDepthBand: 'district',
                    toDepthBand: 'building',
                    fromZoneId: 'missing_zone',
                    toZoneId: mapLayer.zones[0]!.id,
                    routeId: mapLayer.routes[0]!.id,
                    accessTier: 'restricted',
                  },
                ],
              },
            },
            [brokenId]: {
              ...makeHydrationCase(brokenId),
              mapLayer: {
                authoringMode: 'map-metadata-first',
                legend: [],
                zones: [],
                routes: [],
                occupierKnownRouteIds: [],
                scaleAnchors: [],
              },
            },
            [invalidModeId]: {
              ...makeHydrationCase(invalidModeId),
              mapLayer: {
                ...makeMapLayerFixture(),
                authoringMode: 'bogus' as 'map-metadata-first',
              },
            },
          },
        },
        fallback
      )

      const repaired = hydrated.cases[validId]?.mapLayer
      expect(repaired?.authoringMode).toBe('map-metadata-first')
      expect(repaired?.zones[0]?.symbolIds).not.toContain('ghost_symbol')
      expect(repaired?.zones[0]?.hiddenSymbolIds).not.toContain('ghost_hidden')
      expect(repaired?.routes[0]?.activeSymbolIds).not.toContain('ghost_symbol')
      expect(repaired?.occupierKnownRouteIds).not.toContain('ghost_route')
      expect(repaired?.scaleAnchors).toEqual(mapLayer.scaleAnchors)
      expect(repaired?.legend.map((symbol) => symbol.id)).toContain(ghostSymbol.id)
      expect(hydrated.cases[brokenId]?.mapLayer).toBeUndefined()
      expect(hydrated.cases[invalidModeId]?.mapLayer).toBeUndefined()
    })

    it('387 sanitizes weirdRoomPackets counters, triggers, and kinds', () => {
      const fallback = createStartingState()
      const caseId = 'case-weird-rooms'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              weirdRoomPackets: [
                {
                  id: 'room-valid',
                  kind: 'passive_influence',
                  overrides: [{ domain: 'perception', deltaConcealment: 2 }],
                  escalationTriggers: [
                    {
                      activator: 'dwell',
                      threshold: 2,
                      resultKind: 'stateful_hazard_room',
                      addedOverrides: [{ domain: 'bogus', deltaConcealment: 1 }],
                    },
                    {
                      activator: 'bogus',
                      threshold: 1,
                      resultKind: 'passive_influence',
                      addedOverrides: [],
                    },
                  ],
                  hiddenFromSurface: true,
                  dwellCount: -3,
                  disturbanceCount: 4.8,
                  stagedInteractionCount: Number.NaN,
                  revealedAt: 3,
                },
                {
                  id: '',
                  kind: 'bogus',
                  overrides: [],
                  escalationTriggers: [],
                  hiddenFromSurface: false,
                  dwellCount: 0,
                  disturbanceCount: 0,
                  stagedInteractionCount: 0,
                },
              ],
            },
          },
        },
        fallback
      )

      const packets = hydrated.cases[caseId]?.weirdRoomPackets
      expect(packets).toHaveLength(1)
      expect(packets?.[0]).toMatchObject({
        id: 'room-valid',
        kind: 'passive_influence',
        dwellCount: 0,
        disturbanceCount: 4,
        stagedInteractionCount: 0,
        revealedAt: 3,
        hiddenFromSurface: true,
      })
      expect(packets?.[0]?.overrides).toEqual([{ domain: 'perception', deltaConcealment: 2 }])
      expect(packets?.[0]?.escalationTriggers).toEqual([
        {
          activator: 'dwell',
          threshold: 2,
          resultKind: 'stateful_hazard_room',
          addedOverrides: [],
        },
      ])
    })

    it('388 strips unknown case.contract keys and keeps typed runtime payload', () => {
      const fallback = createStartingState()
      const caseId = 'case-contract-payload'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              contract: {
                templateId: 'oversight-lockdown-retainer',
                offerId: 'offer-legacy',
                strategyTag: 'bogus',
                riskLevel: 'severe',
                caseDifficulty: {
                  combat: 2.9,
                  investigation: 'bad',
                  utility: 3,
                  social: 1,
                },
                rewards: {
                  funding: 1200,
                  materials: [{ itemId: 'mat-1', label: 'Sealant', quantity: 2 }],
                },
                fieldBase: {
                  label: ' forward-base ',
                  quality: { safety: 2, medical: 1, supply: 4, extractionAccess: 0 },
                },
                mysteryLedger: true,
                ghostClause: 'strip-me',
              },
            },
            'case-contract-empty': {
              ...makeHydrationCase('case-contract-empty'),
              contract: 'not-an-object' as unknown as CaseInstance['contract'],
            },
          },
        },
        fallback
      )

      const runtime = hydrated.cases[caseId]?.contract
      expect(runtime?.templateId).toBe('oversight-lockdown-retainer')
      expect(runtime?.offerId).toBe('offer-legacy')
      expect(runtime?.riskLevel).toBe('severe')
      expect(runtime?.caseDifficulty).toEqual({
        combat: 2,
        investigation: 1,
        utility: 3,
        social: 1,
      })
      expect(runtime?.rewards?.funding).toBe(1200)
      expect(runtime?.fieldBase).toEqual({
        label: 'forward-base',
        quality: { safety: 2, medical: 1, supply: 3, extractionAccess: 0 },
      })
      expect(runtime).not.toHaveProperty('mysteryLedger')
      expect(runtime).not.toHaveProperty('ghostClause')
      expect(hydrated.cases['case-contract-empty']?.contract).toBeUndefined()
    })
  })

  describe('hydration problems 389-395', () => {
    function makeHydrationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
      const fallback = createStartingState()
      const seed = fallback.cases['case-001']!

      return {
        ...seed,
        id,
        templateId: overrides.templateId ?? seed.templateId,
        title: overrides.title ?? id,
        assignedTeamIds: [],
        ...overrides,
      }
    }

    it('389 sanitizes infiltrationCoverProfile bounds and dedupes routeViolationTags', () => {
      const fallback = createStartingState()
      const validId = 'case-cover-valid'
      const invalidId = 'case-cover-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              infiltrationCoverProfile: {
                claimedRole: 'courier',
                documentTier: 2.9,
                doctrineBand: 1.2,
                routeViolationTags: ['media', ' media ', 'court', 'media'],
              },
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              infiltrationCoverProfile: {
                claimedRole: 'bogus-role',
                documentTier: 4,
                doctrineBand: -0.2,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.infiltrationCoverProfile).toEqual({
        claimedRole: 'courier',
        documentTier: 2,
        routeViolationTags: ['media', 'court'],
      })
      expect(hydrated.cases[invalidId]?.infiltrationCoverProfile).toBeUndefined()
    })

    it('390 sanitizes concealmentTriggers mode, when conditions, confidence, and displacement', () => {
      const fallback = createStartingState()
      const caseId = 'case-concealment-triggers'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              concealmentTriggers: [
                {
                  id: 'trigger-valid',
                  mode: 'displaced',
                  when: {
                    anyTag: [' stealth ', 'stealth', 'covert'],
                    allTags: ['infiltration', ''],
                    globalFlag: ' conceal.case.alpha ',
                    minHiddenModifierCount: 2,
                    minInvestigationWeight: 0.4,
                  },
                  detectionConfidence: 1.4,
                  displacementTarget: ' site-backdoor ',
                },
                {
                  id: '',
                  mode: 'bogus',
                  detectionConfidence: Number.NaN,
                },
              ],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.concealmentTriggers).toEqual([
        {
          id: 'trigger-valid',
          mode: 'displaced',
          when: {
            anyTag: ['stealth', 'covert'],
            allTags: ['infiltration'],
            globalFlag: 'conceal.case.alpha',
            minHiddenModifierCount: 2,
            minInvestigationWeight: 0.4,
          },
          displacementTarget: 'site-backdoor',
        },
      ])
    })

    it('391 keeps stealthLeaveBehindId only for known registry ids', () => {
      const fallback = createStartingState()
      const validId = 'case-leave-behind-valid'
      const invalidId = 'case-leave-behind-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              stealthLeaveBehindId: ' leave-behind:burn-tool ',
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              stealthLeaveBehindId: 'leave-behind:phantom',
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.stealthLeaveBehindId).toBe('leave-behind:burn-tool')
      expect(hydrated.cases[invalidId]?.stealthLeaveBehindId).toBeUndefined()
    })

    it('392 normalizes difficulty and weights with required finite keys', () => {
      const fallback = createStartingState()
      const caseId = 'case-stat-blocks'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              difficulty: {
                combat: 12.8,
                investigation: Number.NaN,
                utility: -4,
                social: 999,
              },
              weights: {
                combat: 0.2,
                investigation: Number.POSITIVE_INFINITY,
                utility: -0.1,
                social: 1.5,
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.difficulty).toEqual({
        combat: 12,
        investigation: 1,
        utility: 0,
        social: 100,
      })
      expect(hydrated.cases[caseId]?.weights).toEqual({
        combat: 0.2,
        investigation: 1,
        utility: 0,
        social: 1,
      })
    })

    it('393 whitelists and dedupes requiredRoles', () => {
      const fallback = createStartingState()
      const validId = 'case-required-roles-valid'
      const invalidId = 'case-required-roles-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              requiredRoles: ['technical', 'technical', 'investigator', 'bogus'],
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              requiredRoles: ['bogus', 'ghost'],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.requiredRoles).toEqual(['technical', 'investigator'])
      expect(hydrated.cases[invalidId]?.requiredRoles).toBeUndefined()
    })

    it('394 bounds consequences, severeHit, and escalationBand enums', () => {
      const fallback = createStartingState()
      const validId = 'case-escalation-valid'
      const invalidId = 'case-escalation-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              consequences: ['delayed', 'delayed', 'bogus'],
              severeHit: ['breach', 'bogus'],
              escalationBand: 'partial',
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              consequences: ['bogus'],
              severeHit: ['ghost'],
              escalationBand: 'bogus',
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.consequences).toEqual(['delayed'])
      expect(hydrated.cases[validId]?.severeHit).toEqual(['breach'])
      expect(hydrated.cases[validId]?.escalationBand).toBe('partial')
      expect(hydrated.cases[invalidId]?.consequences).toBeUndefined()
      expect(hydrated.cases[invalidId]?.severeHit).toBeUndefined()
      expect(hydrated.cases[invalidId]?.escalationBand).toBeUndefined()
    })

    it('395 reconciles case factionId and contactId against hydrated factions', () => {
      const fallback = createStartingState()
      const validId = 'case-faction-valid'
      const unknownFactionId = 'case-faction-unknown'
      const unknownContactId = 'case-contact-unknown'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          factions: fallback.factions,
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              factionId: 'institutions',
              contactId: 'institutions-halden',
            },
            [unknownFactionId]: {
              ...makeHydrationCase(unknownFactionId),
              factionId: 'phantom-faction',
              contactId: 'phantom-contact',
            },
            [unknownContactId]: {
              ...makeHydrationCase(unknownContactId),
              factionId: 'institutions',
              contactId: 'phantom-contact',
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.factionId).toBe('institutions')
      expect(hydrated.cases[validId]?.contactId).toBe('institutions-halden')
      expect(hydrated.cases[unknownFactionId]?.factionId).toBeUndefined()
      expect(hydrated.cases[unknownFactionId]?.contactId).toBeUndefined()
      expect(hydrated.cases[unknownContactId]?.factionId).toBe('institutions')
      expect(hydrated.cases[unknownContactId]?.contactId).toBeUndefined()
    })
  })

  describe('hydration problems 396-402', () => {
    function makeHydrationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
      const fallback = createStartingState()
      const seed = fallback.cases['case-001']!

      return {
        ...seed,
        id,
        templateId: overrides.templateId ?? seed.templateId,
        title: overrides.title ?? id,
        assignedTeamIds: [],
        ...overrides,
      }
    }

    it('396 migrates legacy template ids and disables spawn regen for unknown catalog entries', () => {
      const fallback = createStartingState()
      const migratedId = 'case-template-legacy'
      const unknownId = 'case-template-unknown'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [migratedId]: {
              ...makeHydrationCase(migratedId, { templateId: 'occ-001', kind: 'raid' }),
              onFail: {
                stageDelta: 1,
                spawnCount: { min: 1, max: 1 },
                spawnTemplateIds: ['occ-001', 'extraction-raid-001', 'phantom-template'],
              },
            },
            [unknownId]: {
              ...makeHydrationCase(unknownId, { templateId: 'phantom-template' }),
              mapLayer: {
                authoringMode: 'map-metadata-first',
                legend: [
                  {
                    id: 'symbol-a',
                    glyph: 'A',
                    name: 'Alpha',
                    interactionHint: '',
                    hiddenUntilReveal: false,
                    routeEffect: null,
                  },
                ],
                zones: [
                  {
                    id: 'zone-a',
                    name: 'Zone A',
                    symbolIds: ['symbol-a'],
                    hiddenSymbolIds: [],
                    depthBand: 'room',
                  },
                ],
                routes: [
                  {
                    id: 'route-a',
                    label: 'Route A',
                    routeClass: 'open',
                    activeSymbolIds: ['symbol-a'],
                  },
                ],
                occupierKnownRouteIds: [],
                scaleAnchors: [],
              },
              onUnresolved: {
                stageDelta: 0,
                spawnCount: { min: 0, max: 0 },
                spawnTemplateIds: ['phantom-template', 'ops-001'],
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[migratedId]?.templateId).toBe('extraction-raid-001')
      expect(hydrated.cases[migratedId]?.onFail.spawnTemplateIds).toEqual(['extraction-raid-001'])
      expect(hydrated.cases[unknownId]?.templateId).toBe('phantom-template')
      expect(hydrated.cases[unknownId]?.mapLayer).toBeUndefined()
      expect(hydrated.cases[unknownId]?.onUnresolved.spawnTemplateIds).toEqual(['ops-001'])
    })

    it('397 trims and dedupes tags, requiredTags, preferredTags, and spatialFlags', () => {
      const fallback = createStartingState()
      const caseId = 'case-tag-normalize'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId),
              tags: [' stealth ', 'stealth', ''],
              requiredTags: [' combat ', 'combat'],
              preferredTags: [' media ', 'media', 'court'],
              spatialFlags: [
                ' ingress:service_door ',
                'ingress:service_door',
                'ingress:phantom',
                'site:ingress:service_door',
                ' BAD FLAG ',
              ],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.tags).toEqual(['stealth'])
      expect(hydrated.cases[caseId]?.requiredTags).toEqual(['combat'])
      expect(hydrated.cases[caseId]?.preferredTags).toEqual(['media', 'court'])
      expect(hydrated.cases[caseId]?.spatialFlags).toEqual([
        'ingress:service_door',
        'site:ingress:service_door',
      ])
    })

    it('398 bounds pressureValue and trims or clears invalid regionTag', () => {
      const fallback = createStartingState()
      const validId = 'case-pressure-valid'
      const invalidId = 'case-pressure-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              pressureValue: 12.8,
              regionTag: ' occult_district ',
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              pressureValue: Number.NaN,
              regionTag: 'Bad Region!',
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.pressureValue).toBe(12)
      expect(hydrated.cases[validId]?.regionTag).toBe('occult_district')
      expect(hydrated.cases[invalidId]?.pressureValue).toBeUndefined()
      expect(hydrated.cases[invalidId]?.regionTag).toBeUndefined()
    })

    it('399 clamps intelLastUpdatedWeek within campaign week and resyncs invalid stamps', () => {
      const fallback = createStartingState()
      const inRangeId = 'case-intel-week-in-range'
      const futureId = 'case-intel-week-future'
      const subWeekId = 'case-intel-week-sub-week'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          cases: {
            [inRangeId]: {
              ...makeHydrationCase(inRangeId),
              intelLastUpdatedWeek: 3,
            },
            [futureId]: {
              ...makeHydrationCase(futureId),
              intelLastUpdatedWeek: 9,
            },
            [subWeekId]: {
              ...makeHydrationCase(subWeekId),
              intelLastUpdatedWeek: 0,
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[inRangeId]?.intelLastUpdatedWeek).toBe(3)
      expect(hydrated.cases[futureId]?.intelLastUpdatedWeek).toBe(5)
      expect(hydrated.cases[subWeekId]?.intelLastUpdatedWeek).toBe(5)
    })

    it('400 clears transient supportShortfall during hydration', () => {
      const fallback = createStartingState()
      const caseId = 'case-support-shortfall'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId, { status: 'in_progress', weeksRemaining: 2 }),
              supportShortfall: true,
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.supportShortfall).toBeUndefined()
    })

    it('401 keeps raid bounds only for raid kind and strips raid metadata from normal cases', () => {
      const fallback = createStartingState()
      const normalId = 'case-normal-raid-meta'
      const raidId = 'case-raid-bounds'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [normalId]: {
              ...makeHydrationCase(normalId, { kind: 'case' }),
              raid: { minTeams: 4, maxTeams: 1 },
            },
            [raidId]: {
              ...makeHydrationCase(raidId, { kind: 'raid' }),
              raid: { minTeams: 0, maxTeams: 12 },
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[normalId]?.raid).toBeUndefined()
      expect(hydrated.cases[raidId]?.raid).toEqual({ minTeams: 1, maxTeams: 8 })
    })

    it('402 keeps durable spatial enums and flags while dropping invalid regen spatial state', () => {
      const fallback = createStartingState()
      const durableId = 'case-spatial-durable'
      const regenId = 'case-spatial-regen'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [durableId]: {
              ...makeHydrationCase(durableId),
              siteLayer: 'interior',
              visibilityState: 'bogus' as CaseInstance['visibilityState'],
              transitionType: 'chokepoint',
              spatialFlags: ['ingress:service_door'],
            },
            [regenId]: {
              ...makeHydrationCase(regenId, { templateId: 'phantom-template' }),
              siteLayer: 'bogus' as CaseInstance['siteLayer'],
              spatialFlags: ['ingress:floodgate'],
              weirdRoomPackets: [
                {
                  id: 'room-1',
                  kind: 'passive_influence',
                  overrides: [],
                  escalationTriggers: [],
                  hiddenFromSurface: false,
                  dwellCount: 0,
                  disturbanceCount: 0,
                  stagedInteractionCount: 0,
                },
              ],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[durableId]?.siteLayer).toBe('interior')
      expect(hydrated.cases[durableId]?.visibilityState).toBeUndefined()
      expect(hydrated.cases[durableId]?.transitionType).toBe('chokepoint')
      expect(hydrated.cases[durableId]?.spatialFlags).toEqual(['ingress:service_door'])
      expect(hydrated.cases[regenId]?.siteLayer).toBeUndefined()
      expect(hydrated.cases[regenId]?.spatialFlags).toEqual(['ingress:floodgate'])
      expect(hydrated.cases[regenId]?.weirdRoomPackets).toBeUndefined()
    })
  })

  describe('hydration problems 403-409', () => {
    function makeHydrationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
      const fallback = createStartingState()
      const seed = fallback.cases['case-001']!

      return {
        ...seed,
        id,
        templateId: overrides.templateId ?? seed.templateId,
        title: overrides.title ?? id,
        assignedTeamIds: [],
        ...overrides,
      }
    }

    it('403 repairs embedded case id to record key and preserves both duplicate embedded ids', () => {
      const fallback = createStartingState()
      const mismatchedId = 'case-record-key-owner'
      const duplicateEmbeddedA = 'case-duplicate-embedded-a'
      const duplicateEmbeddedB = 'case-duplicate-embedded-b'
      const missingEmbeddedId = 'case-missing-embedded-id'
      const seedCase = makeHydrationCase(missingEmbeddedId)
      const { id: seedCaseId, ...missingEmbeddedPayload } = seedCase
      void seedCaseId

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [duplicateEmbeddedB]: {
              ...makeHydrationCase(duplicateEmbeddedB),
              id: 'case-shared-embedded',
            },
            [mismatchedId]: {
              ...makeHydrationCase(mismatchedId),
              id: 'case-other-embedded',
            },
            [duplicateEmbeddedA]: {
              ...makeHydrationCase(duplicateEmbeddedA),
              id: 'case-shared-embedded',
            },
            [missingEmbeddedId]: missingEmbeddedPayload,
          },
        },
        fallback
      )

      expect(hydrated.cases[mismatchedId]?.id).toBe(mismatchedId)
      expect(hydrated.cases[duplicateEmbeddedA]?.id).toBe(duplicateEmbeddedA)
      expect(hydrated.cases[duplicateEmbeddedB]?.id).toBe(duplicateEmbeddedB)
      expect(hydrated.cases[missingEmbeddedId]?.id).toBe(missingEmbeddedId)
    })

    it('403 sorts case record keys deterministically during sanitizeCasesMap', () => {
      const fallback = createStartingState()

      const sanitized = sanitizeCasesMap(
        {
          'case-z': { ...makeHydrationCase('case-z'), id: 'wrong-z' },
          'case-a': { ...makeHydrationCase('case-a'), id: 'wrong-a' },
        },
        fallback.teams,
        fallback.week,
        {},
        undefined,
        fallback.templates
      )

      expect(Object.keys(sanitized)).toEqual(['case-a', 'case-z'])
      expect(sanitized['case-a']?.id).toBe('case-a')
      expect(sanitized['case-z']?.id).toBe('case-z')
    })

    it('404 trims, bounds, and backfills blank title/description from template catalog', () => {
      const fallback = createStartingState()
      const template = fallback.templates['ops-001']!
      const caseId = 'case-string-normalize'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...makeHydrationCase(caseId, { templateId: 'ops-001' }),
              title: `  ${'X'.repeat(200)}  `,
              description: '   ',
              hiddenState: 'hidden',
              route: ` ${'route-'.repeat(40)} `,
              counterExplanation: ` ${'counter-'.repeat(120)} `,
            },
          },
        },
        fallback
      )

      const normalized = hydrated.cases[caseId]!
      expect(normalized.title.length).toBeLessThanOrEqual(120)
      expect(normalized.title).not.toMatch(/^\s|\s$/)
      expect(normalized.description).toBe(template.description)
      expect(normalized.route?.length).toBeLessThanOrEqual(128)
      expect(normalized.counterExplanation?.length).toBeLessThanOrEqual(512)

      const blankTitleId = 'case-blank-title-template'
      const blankHydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [blankTitleId]: {
              ...makeHydrationCase(blankTitleId, { templateId: 'ops-001' }),
              title: '   ',
            },
          },
        },
        fallback
      )
      expect(blankHydrated.cases[blankTitleId]?.title).toBe(template.title)
    })

    it('405 clamps stage to integer bounds between 1 and MAX_CASE_STAGE', () => {
      const fallback = createStartingState()
      const negativeId = 'case-stage-negative'
      const hugeId = 'case-stage-huge'
      const fractionalId = 'case-stage-fractional'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [negativeId]: {
              ...makeHydrationCase(negativeId),
              stage: -3,
            },
            [fractionalId]: {
              ...makeHydrationCase(fractionalId),
              stage: 2.9,
            },
            [hugeId]: {
              ...makeHydrationCase(hugeId),
              stage: 99,
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[negativeId]?.stage).toBe(1)
      expect(hydrated.cases[fractionalId]?.stage).toBe(2)
      expect(hydrated.cases[hugeId]?.stage).toBe(MAX_CASE_STAGE)
    })

    it('406 migrates legacy threatFamily aliases and clears invalid families', () => {
      const fallback = createStartingState()
      const legacyId = 'case-threat-legacy'
      const invalidId = 'case-threat-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [legacyId]: {
              ...makeHydrationCase(legacyId),
              threatFamily: 'bio' as CaseInstance['threatFamily'],
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              threatFamily: 'cosmic_horror' as CaseInstance['threatFamily'],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[legacyId]?.threatFamily).toBe(LEGACY_THREAT_FAMILY_ALIASES.bio)
      expect(hydrated.cases[invalidId]?.threatFamily).toBeUndefined()
    })

    it('407 keeps counterDetection boolean-only and clears malformed values', () => {
      const fallback = createStartingState()
      const validId = 'case-counter-detection-valid'
      const invalidId = 'case-counter-detection-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [validId]: {
              ...makeHydrationCase(validId),
              counterDetection: true,
            },
            [invalidId]: {
              ...makeHydrationCase(invalidId),
              counterDetection: 'yes' as unknown as boolean,
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[validId]?.counterDetection).toBe(true)
      expect(hydrated.cases[invalidId]?.counterDetection).toBeUndefined()
    })

    it('408 reconciles leaderId to a roster member or first-member fallback', () => {
      const fallback = createStartingState()
      const teamId = 't_hydration_leader'
      const leaderAgentId = Object.keys(fallback.agents)[0]!
      const memberAgentId = Object.keys(fallback.agents)[1] ?? leaderAgentId

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            id: teamId,
            name: teamId,
            memberIds: [memberAgentId],
            agentIds: [memberAgentId],
            leaderId: leaderAgentId,
            tags: [],
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(hydrated[teamId]?.leaderId).toBe(memberAgentId)
    })

    it('409 normalizes team tags and clears unknown categories', () => {
      const fallback = createStartingState()
      const teamId = 't_hydration_tags_category'
      const leaderAgentId = Object.keys(fallback.agents)[0]!

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            id: teamId,
            name: teamId,
            memberIds: [leaderAgentId],
            agentIds: [leaderAgentId],
            leaderId: leaderAgentId,
            tags: [' van ', 'van', '', 'lab-kit', 'lab-kit'],
            category: 'rogue_cell',
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(hydrated[teamId]?.tags).toEqual(['van', 'lab-kit'])
      expect(hydrated[teamId]?.category).toBeUndefined()
    })

    it('409 preserves known TeamCategory enum values', () => {
      const fallback = createStartingState()
      const teamId = 't_hydration_category_valid'
      const leaderAgentId = Object.keys(fallback.agents)[0]!

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            id: teamId,
            name: teamId,
            memberIds: [leaderAgentId],
            agentIds: [leaderAgentId],
            leaderId: leaderAgentId,
            tags: [],
            category: 'investigation_cell',
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(hydrated[teamId]?.category).toBe('investigation_cell')
    })
  })

  describe('hydration problems 410-416', () => {
    function makeHydrationTeam(
      id: string,
      overrides: Partial<import('../../domain/models').Team> = {}
    ) {
      const fallback = createStartingState()
      const seed = fallback.teams['t_nightwatch']!

      return {
        ...seed,
        id,
        name: overrides.name ?? id,
        memberIds: overrides.memberIds ?? seed.memberIds,
        agentIds: overrides.agentIds ?? seed.agentIds,
        leaderId: overrides.leaderId ?? seed.leaderId,
        tags: overrides.tags ?? [],
        ...overrides,
      }
    }

    it('410 repairs embedded team id to record key and preserves duplicate embedded ids', () => {
      const fallback = createStartingState()
      const mismatchedId = 't-record-key-owner'
      const duplicateEmbeddedA = 't-duplicate-embedded-a'
      const duplicateEmbeddedB = 't-duplicate-embedded-b'
      const missingEmbeddedId = 't-missing-embedded-id'
      const seedTeam = makeHydrationTeam(missingEmbeddedId)
      const { id: seedTeamId, ...missingEmbeddedPayload } = seedTeam
      void seedTeamId

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          teams: {
            [duplicateEmbeddedB]: {
              ...makeHydrationTeam(duplicateEmbeddedB),
              id: 't-shared-embedded',
            },
            [mismatchedId]: {
              ...makeHydrationTeam(mismatchedId),
              id: 't-other-embedded',
            },
            [duplicateEmbeddedA]: {
              ...makeHydrationTeam(duplicateEmbeddedA),
              id: 't-shared-embedded',
            },
            [missingEmbeddedId]: missingEmbeddedPayload,
          },
        },
        fallback
      )

      expect(hydrated.teams[mismatchedId]?.id).toBe(mismatchedId)
      expect(hydrated.teams[duplicateEmbeddedA]?.id).toBe(duplicateEmbeddedA)
      expect(hydrated.teams[duplicateEmbeddedB]?.id).toBe(duplicateEmbeddedB)
      expect(hydrated.teams[missingEmbeddedId]?.id).toBe(missingEmbeddedId)
    })

    it('410 sorts team record keys deterministically during sanitizeTeamsMap', () => {
      const fallback = createStartingState()

      const sanitized = sanitizeTeamsMap(
        {
          't-zulu': { ...makeHydrationTeam('t-zulu'), id: 'wrong-z' },
          't-alpha': { ...makeHydrationTeam('t-alpha'), id: 'wrong-a' },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(Object.keys(sanitized)).toEqual(['t-alpha', 't-zulu'])
      expect(sanitized['t-alpha']?.id).toBe('t-alpha')
      expect(sanitized['t-zulu']?.id).toBe('t-zulu')
    })

    it('411 uses memberIds as canonical and mirrors agentIds against the agent roster', () => {
      const fallback = createStartingState()
      const teamId = 't_member_mirror'
      const canonicalMember = Object.keys(fallback.agents)[0]!
      const staleAgent = Object.keys(fallback.agents)[1] ?? canonicalMember
      const unknownAgent = 'a_missing'

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            ...makeHydrationTeam(teamId),
            memberIds: [canonicalMember, unknownAgent],
            agentIds: [staleAgent, unknownAgent],
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(hydrated[teamId]?.memberIds).toEqual([canonicalMember])
      expect(hydrated[teamId]?.agentIds).toEqual([canonicalMember])
    })

    it('412 prefers status.assignedCaseId and clears assignments missing from case.assignedTeamIds', () => {
      const fallback = createStartingState()
      const teamId = 't_assignment_reconcile'
      const caseCanonical = Object.keys(fallback.cases)[0]!
      const caseLegacy = Object.keys(fallback.cases)[1] ?? caseCanonical
      const caseMirrorOnly = 'case-mirror-only'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        cases: {
          ...fallback.cases,
          [caseCanonical]: {
            ...fallback.cases[caseCanonical]!,
            assignedTeamIds: [teamId],
          },
          [caseMirrorOnly]: {
            ...fallback.cases[caseCanonical]!,
            id: caseMirrorOnly,
            title: caseMirrorOnly,
            assignedTeamIds: [teamId],
          },
        },
        teams: {
          [teamId]: {
            ...makeHydrationTeam(teamId),
            status: {
              state: 'deployed',
              assignedCaseId: caseCanonical,
            },
            assignedCaseId: caseLegacy,
          },
        },
      })

      expect(hydrated.teams[teamId]?.status?.assignedCaseId).toBe(caseCanonical)

      const danglingTeamId = 't_dangling_assignment'
      const danglingHydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        teams: {
          [danglingTeamId]: {
            ...makeHydrationTeam(danglingTeamId),
            status: {
              state: 'deployed',
              assignedCaseId: caseMirrorOnly,
            },
          },
        },
      })

      expect(danglingHydrated.teams[danglingTeamId]?.status?.assignedCaseId).toBeNull()
    })

    it('413 recomputes team status state via resolveTeamStatus for invalid persisted states', () => {
      const fallback = createStartingState()
      const teamId = 't_status_recompute'
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            ...makeHydrationTeam(teamId, { memberIds: [agentId], agentIds: [agentId] }),
            status: {
              state: 'bogus' as import('../../domain/models').TeamState,
              assignedCaseId: null,
            },
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(hydrated[teamId]?.status?.state).toBe('ready')
    })

    it('414 recomputes derivedStats, deploymentReadinessState, and strips unknown compositionState keys', () => {
      const fallback = createStartingState()
      const teamId = 't_derived_recompute'

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            ...makeHydrationTeam(teamId),
            derivedStats: {
              overall: -99,
              fieldPower: 0,
              containment: 0,
              investigation: 0,
              support: 0,
              cohesion: 0,
              chemistryScore: 0,
              readiness: -99,
            },
            deploymentReadinessState: {
              readinessCategory: 'mission_ready',
              readinessScore: -50,
              hardBlockers: ['bogus'],
              softRisks: [],
              estimatedDeployWeeks: -1,
              estimatedRecoveryWeeks: -1,
              summaryLines: [],
            },
            compositionState: { compositionValid: false, garbage: true },
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      const team = hydrated[teamId]!
      expect(team.derivedStats?.readiness).toBeGreaterThanOrEqual(0)
      expect(team.deploymentReadinessState?.readinessScore).toBeGreaterThanOrEqual(0)
      expect(team.deploymentReadinessState?.estimatedDeployWeeks).toBeGreaterThanOrEqual(0)
      expect(team.compositionState).toMatchObject({
        compositionValid: expect.any(Boolean),
        cohesion: expect.objectContaining({ cohesionScore: expect.any(Number) }),
      })
      expect(team.compositionState).not.toHaveProperty('garbage')
    })

    it('415 clamps non-finite recoveryPressure to finite bounded scalars', () => {
      const fallback = createStartingState()
      const teamId = 't_recovery_pressure'

      const hydrated = sanitizeTeamsMap(
        {
          [teamId]: {
            ...makeHydrationTeam(teamId),
            recoveryPressure: Number.POSITIVE_INFINITY,
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(hydrated[teamId]?.recoveryPressure).toBe(100)

      const cleared = sanitizeTeamsMap(
        {
          [teamId]: {
            ...makeHydrationTeam(teamId),
            recoveryPressure: Number.NaN,
          },
        },
        fallback.agents,
        fallback.cases,
        fallback.teams
      )

      expect(cleared[teamId]?.recoveryPressure).toBeUndefined()
    })

    it('416 reconciles training queue team drill refs against hydrated agents and teams', () => {
      const fallback = createStartingState()
      const teamId = 't_training_reconcile'
      const leaderAgentId = Object.keys(fallback.agents)[0]!
      const memberAgentId = Object.keys(fallback.agents)[1] ?? leaderAgentId

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        teams: {
          [teamId]: {
            ...makeHydrationTeam(teamId, {
              memberIds: [leaderAgentId, memberAgentId],
              agentIds: [leaderAgentId, memberAgentId],
              leaderId: leaderAgentId,
            }),
          },
        },
        trainingQueue: [
          {
            id: 'drill-reconcile',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId: leaderAgentId,
            teamId,
            teamName: 'stale label',
            memberIds: [leaderAgentId, 'a_missing', memberAgentId],
            remainingWeeks: 1,
            durationWeeks: 2,
          },
        ],
      })

      expect(hydrated.trainingQueue).toEqual([
        expect.objectContaining({
          id: 'drill-reconcile',
          trainingId: 'coordination-drill',
          teamId,
          teamName: teamId,
          memberIds: [leaderAgentId, memberAgentId],
          agentId: leaderAgentId,
        }),
      ])
    })
  })

  describe('hydration problems 417-423', () => {
    it('417 drops unknown recipes and outputItemId mismatches while clamping quantities', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'q-valid',
            recipeId: 'ward-seals',
            recipeName: recipe.name,
            outputItemId: recipe.outputItemId,
            outputQuantity: recipe.outputQuantity,
            startedWeek: 1,
            durationWeeks: recipe.durationWeeks,
            remainingWeeks: recipe.durationWeeks,
            fundingCost: recipe.baseFundingCost,
          },
          {
            id: 'q-unknown-recipe',
            recipeId: 'phantom-recipe',
            outputItemId: 'ward_seals',
            outputQuantity: 3,
            startedWeek: 1,
            durationWeeks: 2,
            remainingWeeks: 2,
            fundingCost: 0,
          },
          {
            id: 'q-mismatch-output',
            recipeId: 'ward-seals',
            outputItemId: 'med_kits',
            outputQuantity: 99,
            startedWeek: 1,
            durationWeeks: 99,
            remainingWeeks: 200,
            fundingCost: -5,
          },
        ],
      })

      expect(hydrated.productionQueue).toEqual([
        expect.objectContaining({
          id: 'q-valid',
          recipeId: 'ward-seals',
          outputItemId: recipe.outputItemId,
          outputQuantity: recipe.outputQuantity,
        }),
      ])
    })

    it('418 leaves contracts undefined for legacy saves and sanitizes when the key is present', () => {
      const fallback = createStartingState()
      const { contracts: legacyContracts, ...legacyPayload } = stripGameTemplates(fallback)
      void legacyContracts
      const legacy = hydrateGame(legacyPayload, fallback)
      const dirtyOffer = getContractOffers(fallback)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          contracts: {
            generatedWeek: 1,
            offers: [
              dirtyOffer,
              {
                ...dirtyOffer,
                id: 'offer-bad-template',
                templateId: 'phantom-template',
              },
            ],
            history: {},
            unlockedResearchIds: [],
          },
        },
        fallback
      )

      expect(legacy.contracts).toBeUndefined()
      expect(hydrated.contracts).toBeDefined()
      expect(hydrated.contracts?.offers).toHaveLength(1)
      expect(hydrated.contracts?.offers[0]?.id).toBe(dirtyOffer.id)
    })

    it('419 validates offer strategyTag, riskLevel, rewards, requirements, and templates', () => {
      const fallback = createStartingState()
      const seedOffer = getContractOffers(fallback)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        factions: fallback.factions,
        contracts: {
          generatedWeek: 1,
          offers: [
            {
              ...seedOffer,
              strategyTag: 'bogus',
              riskLevel: 'bogus',
              rewards: { funding: -12, materials: [{ itemId: '', label: '', quantity: -1 }] },
              requirements: {
                recommendedClasses: ['hunter', 'hunter'],
                discouragedClasses: [123 as unknown as string],
              },
            },
          ],
          history: {},
          unlockedResearchIds: [],
        },
      })

      const offer = hydrated.contracts?.offers[0]
      expect(offer?.strategyTag).toBe(seedOffer.strategyTag)
      expect(offer?.riskLevel).toBe('moderate')
      expect(offer?.rewards.funding).toBe(0)
      expect(offer?.rewards.materials).toBeUndefined()
      expect(offer?.requirements.recommendedClasses).toEqual(['hunter'])
      expect(offer?.requirements.discouragedClasses).toEqual([])
    })

    it('420 reconciles active contract keys against cases and offer refs', () => {
      const fallback = createStartingState()
      const seedOffer = getContractOffers(fallback)[0]!
      const caseId = 'case-active-contract'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        cases: {
          [caseId]: {
            ...fallback.cases['case-001']!,
            id: caseId,
            title: caseId,
            contract: { templateId: seedOffer.templateId, offerId: seedOffer.id },
          },
        },
        contracts: {
          generatedWeek: 1,
          offers: [seedOffer],
          history: {},
          unlockedResearchIds: [],
          active: {
            'stale-key': {
              contractId: 'other-case',
              caseId,
              offerId: seedOffer.id,
              templateId: seedOffer.templateId,
              startedWeek: 99,
            },
            'missing-case': {
              caseId: 'ghost-case',
              offerId: seedOffer.id,
              templateId: seedOffer.templateId,
            },
            'bad-offer': {
              caseId,
              offerId: 'missing-offer',
              templateId: seedOffer.templateId,
            },
          },
        },
      })

      expect(hydrated.contracts?.active).toEqual({
        [caseId]: expect.objectContaining({
          contractId: caseId,
          caseId,
          offerId: seedOffer.id,
          startedWeek: 4,
        }),
      })
    })

    it('421 sanitizes contract history completions, outcomes, and lastCompletedWeek', () => {
      const fallback = createStartingState()
      const templateId = getContractOffers(fallback)[0]!.templateId

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        contracts: {
          generatedWeek: 1,
          offers: [],
          history: {
            [templateId]: {
              completions: -3,
              bestOutcome: 'bogus',
              lastOutcome: 'success',
              lastCompletedWeek: 99,
            },
            'phantom-template': {
              completions: 1,
              bestOutcome: 'success',
            },
          },
          unlockedResearchIds: [],
        },
      })

      expect(hydrated.contracts?.history[templateId]).toEqual({
        completions: 0,
        bestOutcome: 'none',
        lastOutcome: 'success',
        lastCompletedWeek: 6,
      })
      expect(hydrated.contracts?.history['phantom-template']).toBeUndefined()
    })

    it('422 sanitizes externalSupportAssets id/key, assetClass, reliability, tags, and label', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        externalSupportAssets: {
          'asset-valid': {
            id: 'asset-valid',
            label: ' Field Contractor ',
            assetClass: 'contractor',
            reliability: 140,
            tags: [' support ', 'support', 12],
          },
          'asset-id-mismatch': {
            id: 'other-id',
            label: 'Mismatch',
            assetClass: 'contractor',
            reliability: 50,
            tags: [],
          },
          'asset-no-label': {
            id: 'asset-no-label',
            label: '   ',
            assetClass: 'bogus',
            reliability: 50,
            tags: [],
          },
        },
      })

      expect(hydrated.externalSupportAssets).toEqual({
        'asset-valid': {
          id: 'asset-valid',
          label: 'Field Contractor',
          assetClass: 'contractor',
          reliability: 100,
          tags: ['support'],
        },
      })
    })

    it('423 sanitizes faction reputation, contacts, history, favors, recruitUnlocks, and lore', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        factions: {
          institutions: {
            reputation: 999,
            contacts: [
              {
                id: 'institutions-halden',
                name: 'Miren Halden',
                role: 'Research fellowship',
                status: 'active',
                relationship: 20,
              },
              {
                id: 'phantom-contact',
                name: 'Ghost',
                role: 'Unknown',
                status: 'active',
                relationship: 0,
              },
            ],
            history: {
              missionsCompleted: -1,
              missionsFailed: 2,
              successRate: 2,
              interactionLog: [{ id: 'evt-1', label: 'Met', week: 1 }],
            },
            availableFavors: [{ id: 'favor-1', label: 'Archive access' }],
            recruitUnlocks: [
              {
                factionId: 'institutions',
                factionName: 'Institutions',
                contactId: 'phantom-contact',
                label: 'Bad channel',
                rewardId: 'reward-1',
              },
            ],
            lore: {
              discovered: [
                { label: 'Ledger', summary: 'Recovered index' },
                { label: '', summary: '' },
              ],
              remainingCount: -2,
            },
          },
          'phantom-faction': {
            reputation: 10,
            contacts: [],
          },
        },
      })

      const institutions = hydrated.factions?.institutions
      expect(institutions?.reputation).toBe(100)
      expect(institutions?.reputationTier).toBe('allied')
      expect(institutions?.contacts?.map((contact) => contact.id)).toEqual(['institutions-halden'])
      expect(institutions?.history).toMatchObject({
        missionsCompleted: 0,
        missionsFailed: 2,
        successRate: 0,
      })
      expect(institutions?.availableFavors).toHaveLength(1)
      expect(institutions?.recruitUnlocks).toEqual([])
      expect(institutions?.lore).toMatchObject({
        discovered: [{ label: 'Ledger', summary: 'Recovered index' }],
        remainingCount: 0,
      })
      expect(hydrated.factions?.['phantom-faction']).toBeUndefined()
    })
  })

  describe('hydration problems 424-430', () => {
    it('424 sanitizes research projects, queues, pools, and drops stale project IDs', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        researchState: {
          projects: {
            'proj-valid': {
              projectId: 'proj-valid',
              status: 'active',
              costTime: 2,
              costData: 1,
              costMaterials: 0,
              unlocks: [{ id: 'unlock-1', label: 'Unlock', category: 'intel_tool' }],
              startedWeek: 99,
            },
            'proj-mismatch': {
              projectId: 'other-id',
              status: 'bogus',
              costTime: -1,
              costData: 0,
              costMaterials: 0,
              unlocks: [],
            },
          },
          activeProjectIds: ['proj-valid', 'phantom', 'proj-valid'],
          queuedProjectIds: ['phantom'],
          completedProjectIds: [],
          availableProjectIds: [],
          blockedProjectIds: [],
          researchSlots: 99,
          researchSpeedMultiplier: 99,
          researchDataPool: -5,
          researchMaterialsPool: 1_000_000_000,
        },
      })

      expect(hydrated.researchState?.projects['proj-mismatch']).toBeUndefined()
      expect(hydrated.researchState?.activeProjectIds).toEqual(['proj-valid'])
      expect(hydrated.researchState?.queuedProjectIds).toEqual([])
      expect(hydrated.researchState?.projects['proj-valid']?.status).toBe('active')
      expect(hydrated.researchState?.projects['proj-valid']?.startedWeek).toBe(5)
      expect(hydrated.researchState?.researchSlots).toBe(12)
      expect(hydrated.researchState?.researchSpeedMultiplier).toBe(8)
      expect(hydrated.researchState?.researchDataPool).toBe(0)
    })

    it('425 sanitizes facility levels, status, upgrade weeks, and effect allowlist', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 10,
        facilityState: {
          facilities: {
            research_lab: {
              facilityId: 'research_lab',
              category: 'research_lab',
              level: 99,
              maxLevel: 2,
              status: 'bogus',
              effects: {
                researchSpeedMultiplier: 1.5,
                phantomEffect: 9,
              },
              upgradeInProgress: true,
              upgradeStartedWeek: 12,
              upgradeCompleteWeek: 8,
            },
            'id-mismatch': {
              facilityId: 'other',
              category: 'x',
              level: 1,
              status: 'active',
              effects: {},
            },
          },
        },
      })

      const lab = hydrated.facilityState?.facilities['research_lab']
      expect(hydrated.facilityState?.facilities['id-mismatch']).toBeUndefined()
      expect(lab?.level).toBe(2)
      expect(lab?.status).toBe('inactive')
      expect(lab?.effects).toEqual({ researchSpeedMultiplier: 1.5 })
      expect(lab?.upgradeInProgress).toBeUndefined()
    })

    it('425b repairs facility upgrade chronology and status contradictions', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 10,
        facilityState: {
          facilities: {
            'complete-before-start': {
              facilityId: 'complete-before-start',
              category: 'research_lab',
              level: 1,
              maxLevel: 3,
              status: 'upgrading',
              effects: {},
              upgradeInProgress: true,
              upgradeStartedWeek: 8,
              upgradeCompleteWeek: 4,
              pendingEffectDeltas: { researchSpeedMultiplier: 0.25 },
            },
            'future-complete-without-upgrade': {
              facilityId: 'future-complete-without-upgrade',
              category: 'research_lab',
              level: 1,
              maxLevel: 3,
              status: 'active',
              effects: {},
              upgradeInProgress: false,
              upgradeStartedWeek: 3,
              upgradeCompleteWeek: 20,
              pendingEffectDeltas: { researchSpeedMultiplier: 0.5 },
            },
            'pending-without-upgrade': {
              facilityId: 'pending-without-upgrade',
              category: 'training_annex',
              level: 1,
              maxLevel: 3,
              status: 'available',
              effects: {},
              pendingEffectDeltas: { trainingSlots: 2 },
            },
            'inactive-but-upgrading': {
              facilityId: 'inactive-but-upgrading',
              category: 'containment_ward',
              level: 1,
              maxLevel: 3,
              status: 'inactive',
              effects: {},
              upgradeInProgress: true,
              upgradeStartedWeek: 9,
              upgradeCompleteWeek: 12,
              pendingEffectDeltas: { recoveryThroughput: 1 },
            },
            'valid-upgrade': {
              facilityId: 'valid-upgrade',
              category: 'research_lab',
              level: 1,
              maxLevel: 3,
              status: 'upgrading',
              effects: { researchSlots: 1 },
              upgradeInProgress: true,
              upgradeStartedWeek: 7,
              upgradeCompleteWeek: 10,
              pendingEffectDeltas: { researchSpeedMultiplier: 0.5 },
            },
          },
        },
      })

      const facilities = hydrated.facilityState?.facilities ?? {}
      expect(facilities['complete-before-start']).toMatchObject({
        status: 'inactive',
      })
      expect(facilities['complete-before-start']?.upgradeInProgress).toBeUndefined()
      expect(facilities['complete-before-start']?.pendingEffectDeltas).toBeUndefined()

      expect(facilities['future-complete-without-upgrade']).toMatchObject({
        status: 'active',
      })
      expect(facilities['future-complete-without-upgrade']?.upgradeCompleteWeek).toBeUndefined()
      expect(facilities['future-complete-without-upgrade']?.pendingEffectDeltas).toBeUndefined()

      expect(facilities['pending-without-upgrade']).toMatchObject({
        status: 'available',
      })
      expect(facilities['pending-without-upgrade']?.pendingEffectDeltas).toBeUndefined()

      expect(facilities['inactive-but-upgrading']).toMatchObject({
        status: 'upgrading',
        upgradeInProgress: true,
        upgradeStartedWeek: 9,
        upgradeCompleteWeek: 12,
        pendingEffectDeltas: { recoveryThroughput: 1 },
      })

      expect(facilities['valid-upgrade']).toMatchObject({
        status: 'upgrading',
        upgradeInProgress: true,
        upgradeStartedWeek: 7,
        upgradeCompleteWeek: 10,
        pendingEffectDeltas: { researchSpeedMultiplier: 0.5 },
      })
    })

    it('426 drops invalid relationship snapshots and clamps valid ones', () => {
      const fallback = createStartingState()
      const [agentAId, agentBId] = Object.keys(fallback.agents)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        agents: fallback.agents,
        relationshipHistory: [
          {
            week: 6,
            agentAId,
            agentBId,
            value: 1.25,
            modifiers: [' trust '],
            reason: 'passive_drift',
          },
          {
            week: 99,
            agentAId,
            agentBId: agentAId,
            value: Number.NaN,
            modifiers: [],
            reason: 'bogus',
          },
          {
            week: 3,
            agentAId: 'ghost-agent',
            agentBId,
            value: 0,
            modifiers: [],
          },
        ],
      })

      expect(hydrated.relationshipHistory).toHaveLength(1)
      expect(hydrated.relationshipHistory?.[0]).toMatchObject({
        week: 6,
        agentAId,
        agentBId,
        value: 1.25,
        modifiers: ['trust'],
        reason: 'passive_drift',
      })
    })

    it('427 reconciles top-level globalFlags into runtimeState and rebuilds the mirror', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        globalFlags: {
          'legacy.only': true,
          'shared.flag': 'legacy',
          bad: { nested: true },
        },
        runtimeState: {
          ...fallback.runtimeState!,
          globalFlags: {
            'shared.flag': 'runtime',
            'runtime.only': 2,
          },
        },
      })

      expect(hydrated.runtimeState?.globalFlags).toEqual({
        'legacy.only': true,
        'shared.flag': 'runtime',
        'runtime.only': 2,
      })
      expect(hydrated.globalFlags).toEqual(hydrated.runtimeState?.globalFlags)
    })

    it('428 strips arbitrary hub payloads and retains bounded hub state', () => {
      const fallback = createStartingState()

      const stripped = hydrateGame({
        ...stripGameTemplates(fallback),
        hubState: { arbitrary: true, nested: { deep: 1 } },
        prevHubState: null,
      })

      const retained = hydrateGame({
        ...stripGameTemplates(fallback),
        hubState: {
          districtKey: 'central_hub',
          factionPresence: { institutions: 40 },
          opportunities: [
            {
              id: 'opp-1',
              label: 'Lead',
              detail: 'Detail',
              factionId: 'institutions',
              confidence: 2,
            },
          ],
          rumors: [],
        },
      })

      expect(stripped.hubState).toBeUndefined()
      expect(stripped.prevHubState).toBeUndefined()
      expect(retained.hubState).toMatchObject({
        districtKey: 'central_hub',
        factionPresence: { institutions: 40 },
      })
      expect(retained.hubState?.opportunities[0]?.confidence).toBe(1)
    })

    it('428b drops malformed hub opportunities and stale faction references', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        hubState: {
          districtKey: 'nonexistent_district',
          factionPresence: {
            institutions: 25,
            stale_faction: 80,
          },
          opportunities: [
            {
              id: 'valid-opp',
              label: 'Valid lead',
              detail: 'Valid detail',
              factionId: 'institutions',
              confidence: 0.75,
              accessState: 'risky',
              requiredSanctionLevel: 'covert',
            },
            {
              id: 'stale-opp',
              label: 'Stale lead',
              detail: 'Stale detail',
              factionId: 'stale_faction',
              confidence: 0.9,
            },
            {
              id: 'missing-detail',
              label: 'Malformed lead',
              factionId: 'institutions',
              confidence: 0.9,
            },
          ],
          rumors: [],
        },
      })

      expect(hydrated.hubState).toMatchObject({
        districtKey: 'central_hub',
        factionPresence: { institutions: 25 },
      })
      expect(hydrated.hubState?.factionPresence).not.toHaveProperty('stale_faction')
      expect(hydrated.hubState?.opportunities).toHaveLength(1)
      expect(hydrated.hubState?.opportunities[0]).toMatchObject({
        id: 'valid-opp',
        factionId: 'institutions',
        confidence: 0.75,
        accessState: 'risky',
        requiredSanctionLevel: 'covert',
      })
    })

    it('428c clamps invalid hub confidence and strips invalid access enums', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        hubState: {
          districtKey: 'industrial_zone',
          factionPresence: { institutions: Number.POSITIVE_INFINITY },
          opportunities: [
            {
              id: 'opp-invalid-confidence',
              label: 'Invalid confidence',
              detail: 'Invalid confidence detail',
              factionId: 'institutions',
              confidence: Number.NaN,
              accessState: 'forbidden',
              requiredSanctionLevel: 'public',
              accessExplanation: '  Needs review.  ',
            },
          ],
          rumors: [
            {
              id: 'rumor-invalid-confidence',
              label: 'Rumor',
              detail: 'Rumor detail',
              confidence: 9,
              misleading: true,
              filtered: true,
            },
          ],
        },
      })

      expect(hydrated.hubState?.districtKey).toBe('industrial_zone')
      expect(hydrated.hubState?.factionPresence.institutions).toBe(0)
      expect(hydrated.hubState?.opportunities[0]).toMatchObject({
        confidence: 0.5,
        accessExplanation: 'Needs review.',
      })
      expect(hydrated.hubState?.opportunities[0]).not.toHaveProperty('accessState')
      expect(hydrated.hubState?.opportunities[0]).not.toHaveProperty('requiredSanctionLevel')
      expect(hydrated.hubState?.rumors[0]).toMatchObject({
        confidence: 1,
        misleading: true,
        filtered: true,
      })
    })

    it('428d hydrates valid generated hub state without dropping bounded fields', () => {
      const fallback = createStartingState()
      const generatedHub = generateHubState(fallback)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        hubState: generatedHub,
        prevHubState: generatedHub,
      })

      expect(hydrated.hubState).toEqual(generatedHub)
      expect(hydrated.prevHubState).toEqual(generatedHub)
    })

    it('428e sanitizes malformed prevHubState with the same hub-state bounds', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        prevHubState: {
          districtKey: 'stale_district',
          factionPresence: {
            oversight: 15,
            retired_faction: 70,
          },
          opportunities: [
            {
              id: '',
              label: 'Invalid id',
              detail: 'Should be dropped',
              factionId: 'oversight',
              confidence: 0.7,
            },
            {
              id: 'prev-valid-opp',
              label: 'Previous lead',
              detail: 'Previous lead detail',
              factionId: 'oversight',
              confidence: -4,
              accessState: 'blocked',
              requiredSanctionLevel: 'sanctioned',
            },
            {
              id: 'prev-stale-faction',
              label: 'Stale faction lead',
              detail: 'Should be dropped',
              factionId: 'retired_faction',
              confidence: 0.9,
            },
          ],
          rumors: [
            {
              id: '',
              label: 'Invalid rumor',
              detail: 'Should be dropped',
              confidence: 0.8,
            },
          ],
        },
      })

      expect(hydrated.prevHubState).toMatchObject({
        districtKey: 'central_hub',
        factionPresence: { oversight: 15 },
        rumors: [],
      })
      expect(hydrated.prevHubState?.factionPresence).not.toHaveProperty('retired_faction')
      expect(hydrated.prevHubState?.opportunities).toHaveLength(1)
      expect(hydrated.prevHubState?.opportunities[0]).toMatchObject({
        id: 'prev-valid-opp',
        factionId: 'oversight',
        confidence: 0,
        accessState: 'blocked',
        requiredSanctionLevel: 'sanctioned',
      })
    })

    it('428f leaves missing prevHubState absent on hydration', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
      })

      expect(hydrated.prevHubState).toBeUndefined()
    })

    it('428g sanitizes damaged equipment recovery queue against inventory and catalog state', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        inventory: {
          ...fallback.inventory,
          medkits: 2,
          ward_seals: 1,
          silver_rounds: 0,
        },
        damagedEquipmentQueue: [
          ' medkits ',
          'medkits',
          '',
          'unknown_equipment',
          42,
          'ward_seals',
          'silver_rounds',
        ],
      })

      expect(hydrated.damagedEquipmentQueue).toEqual(['medkits', 'ward_seals'])
    })

    it('428h preserves an empty damaged equipment recovery queue', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        damagedEquipmentQueue: [],
      })

      expect(hydrated.damagedEquipmentQueue).toEqual([])
    })

    it('428i keeps a valid damaged equipment recovery queue in order', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        inventory: {
          ...fallback.inventory,
          silver_rounds: 1,
          signal_jammers: 1,
        },
        damagedEquipmentQueue: ['silver_rounds', 'signal_jammers'],
      })

      expect(hydrated.damagedEquipmentQueue).toEqual(['silver_rounds', 'signal_jammers'])
    })

    it('429 validates squad metadata, kit templates, and assignments against live teams', () => {
      const fallback = createStartingState()
      const teamId = 't_nightwatch'
      const leaderAgentId = fallback.teams[teamId]!.leaderId

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        squadMetadata: {
          [teamId]: {
            squadId: teamId,
            name: ' Night Watch ',
            role: 'response',
            doctrine: 'containment',
            shift: 'night',
            assignedZone: 'hub',
            designatedLeaderId: leaderAgentId,
          },
          'ghost-team': {
            squadId: 'ghost-team',
            name: 'Ghost',
            role: 'x',
            doctrine: 'x',
            shift: 'x',
            assignedZone: 'x',
            designatedLeaderId: leaderAgentId,
          },
        },
        squadKitTemplates: {
          'kit-alpha': {
            id: 'kit-alpha',
            label: ' Alpha Kit ',
            requiredItemTags: ['medical', 'medical'],
            minCoveredCount: 1,
          },
          'bad-kit': {
            id: 'mismatch',
            label: '',
            requiredItemTags: [],
            minCoveredCount: 0,
          },
        },
        squadKitAssignments: {
          [teamId]: { squadId: teamId, kitTemplateId: 'kit-alpha' },
          'ghost-team': { squadId: 'ghost-team', kitTemplateId: 'kit-alpha' },
          'orphan-kit': { squadId: 'orphan-kit', kitTemplateId: 'missing-kit' },
        },
      })

      expect(hydrated.squadMetadata?.[teamId]?.name).toBe('Night Watch')
      expect(hydrated.squadMetadata?.['ghost-team']).toBeUndefined()
      expect(hydrated.squadKitTemplates?.['kit-alpha']?.label).toBe('Alpha Kit')
      expect(hydrated.squadKitTemplates?.['bad-kit']).toBeUndefined()
      expect(hydrated.squadKitAssignments?.[teamId]).toEqual({
        squadId: teamId,
        kitTemplateId: 'kit-alpha',
      })
      expect(hydrated.squadKitAssignments?.['ghost-team']).toBeUndefined()
      expect(hydrated.squadKitAssignments?.['orphan-kit']).toBeUndefined()
    })

    it('430 sanitizes persisted contract debrief records inside contract state', () => {
      const fallback = createStartingState()
      const seedOffer = getContractOffers(fallback)[0]!
      const caseId = 'case-debrief-hydrate'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 7,
        cases: {
          [caseId]: {
            ...fallback.cases['case-001']!,
            id: caseId,
            title: caseId,
            contract: { templateId: seedOffer.templateId, offerId: seedOffer.id },
          },
        },
        contracts: {
          generatedWeek: 1,
          offers: [seedOffer],
          history: {},
          unlockedResearchIds: [],
          debriefRecords: [
            {
              caseId,
              caseTitle: caseId,
              contractTemplateId: seedOffer.templateId,
              outcome: 'partial',
              week: 7,
              summary: 'Recovered contract debrief summary.',
              changedEntities: [
                { kind: 'staff', id: 'agent-1', label: 'Agent', detail: 'Fatigue shift' },
                { kind: 'bogus', id: 'x', label: 'x', detail: 'x' },
              ],
              unresolvedClocks: [{ id: 'clock-1', label: 'Pressure', detail: 'Elevated' }],
              strategicOptions: [
                {
                  intent: 'chase-lead',
                  label: 'Chase lead',
                  reason: 'Open thread remains.',
                },
                {
                  intent: 'not-real',
                  label: 'Bad',
                  reason: 'Bad',
                },
              ],
            },
            {
              caseId: 'missing-case',
              caseTitle: 'Ghost',
              contractTemplateId: seedOffer.templateId,
              outcome: 'success',
              week: 7,
              summary: '   ',
              changedEntities: [],
              unresolvedClocks: [],
              strategicOptions: [],
            },
          ],
        },
      })

      const records = (
        hydrated.contracts as typeof hydrated.contracts & {
          debriefRecords?: Array<Record<string, unknown>>
        }
      )?.debriefRecords

      expect(records).toHaveLength(1)
      expect(records?.[0]).toMatchObject({
        caseId,
        contractTemplateId: seedOffer.templateId,
        outcome: 'partial',
        week: 7,
      })
      expect(records?.[0]?.changedEntities).toHaveLength(1)
      expect(records?.[0]?.strategicOptions).toHaveLength(1)
      expect(records?.[0]?.strategicOptions[0]?.intent).toBe('chase-lead')
    })
  })

  describe('hydration problems 431-437', () => {
    it('431 preserves locked encounters and failed/dismissed outcomes', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-locked': {
              encounterId: 'enc-locked',
              status: 'locked',
              lastUpdatedWeek: 6,
            },
            'enc-failed': {
              encounterId: 'enc-failed',
              status: 'resolved',
              startedWeek: 4,
              resolvedWeek: 6,
              latestOutcome: 'failed',
              lastUpdatedWeek: 6,
            },
            'enc-dismissed': {
              encounterId: 'enc-dismissed',
              status: 'resolved',
              startedWeek: 5,
              resolvedWeek: 6,
              latestOutcome: 'dismissed',
              lastUpdatedWeek: 6,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.encounterState['enc-locked']?.status).toBe('locked')
      expect(hydrated.runtimeState?.encounterState['enc-failed']?.latestOutcome).toBe('failed')
      expect(hydrated.runtimeState?.encounterState['enc-dismissed']?.latestOutcome).toBe(
        'dismissed'
      )
    })

    it('432 repairs encounter temporal metadata on active and resolved records', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 8,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-active-stale': {
              encounterId: 'enc-active-stale',
              status: 'active',
              startedWeek: 3,
              resolvedWeek: 7,
              latestOutcome: 'partial',
              lastResolutionId: 'res-stale',
              lastUpdatedWeek: 8,
            },
            'enc-resolved-gap': {
              encounterId: 'enc-resolved-gap',
              status: 'resolved',
              startedWeek: 6,
              resolvedWeek: 2,
              lastUpdatedWeek: 8,
            },
          },
        },
      })

      const active = hydrated.runtimeState?.encounterState['enc-active-stale']
      expect(active?.resolvedWeek).toBeUndefined()
      expect(active?.latestOutcome).toBeUndefined()
      expect(active?.lastResolutionId).toBeUndefined()

      const resolved = hydrated.runtimeState?.encounterState['enc-resolved-gap']
      expect(resolved?.latestOutcome).toBe('failure')
      expect(resolved?.resolvedWeek).toBeGreaterThanOrEqual(resolved?.startedWeek ?? 1)
    })

    it('433 caps runtime week fields to the campaign week', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        runtimeState: {
          ...fallback.runtimeState!,
          currentLocation: {
            hubId: 'operations-desk',
            updatedWeek: 99,
          },
          sceneHistory: [
            {
              sceneId: 'dashboard',
              locationId: 'operations-desk',
              week: 40,
            },
          ],
          oneShotEvents: {
            'event.stale': {
              seen: true,
              firstSeenWeek: 88,
            },
          },
          encounterState: {
            'enc-week-cap': {
              encounterId: 'enc-week-cap',
              status: 'active',
              startedWeek: 20,
              lastUpdatedWeek: 77,
            },
          },
          progressClocks: {
            'story.clock-cap': {
              id: 'story.clock-cap',
              label: 'Cap',
              value: 4,
              max: 4,
              completedAtWeek: 60,
            },
          },
          eventQueue: {
            entries: [],
            nextSequence: 1,
          },
          ui: {
            ...fallback.runtimeState!.ui,
            authoring: {
              updatedWeek: 33,
            },
            debug: {
              ...fallback.runtimeState!.ui.debug,
              eventLog: [
                {
                  id: 'devlog-0099',
                  week: 44,
                  type: 'flag.set',
                  summary: 'Stale developer log week.',
                },
              ],
            },
          },
        },
      })

      expect(hydrated.runtimeState?.currentLocation.updatedWeek).toBe(5)
      expect(hydrated.runtimeState?.sceneHistory[0]?.week).toBe(5)
      expect(hydrated.runtimeState?.oneShotEvents['event.stale']?.firstSeenWeek).toBe(5)
      expect(hydrated.runtimeState?.encounterState['enc-week-cap']?.startedWeek).toBe(5)
      expect(hydrated.runtimeState?.encounterState['enc-week-cap']?.lastUpdatedWeek).toBe(5)
      expect(hydrated.runtimeState?.progressClocks['story.clock-cap']?.completedAtWeek).toBe(5)
      expect(hydrated.runtimeState?.ui.authoring?.updatedWeek).toBe(5)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.week).toBe(5)
    })

    it('434 drops unknown queue types and stale encounter targets', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'case-live': {
              encounterId: 'case-live',
              status: 'active',
              startedWeek: 4,
              lastUpdatedWeek: 4,
            },
          },
          eventQueue: {
            entries: [
              {
                id: 'qevt-0001',
                type: 'authored.follow_up',
                targetId: 'frontdesk.notice.weekly-report.returning',
                week: 4,
              },
              {
                id: 'qevt-0002',
                type: 'encounter.follow_up',
                targetId: 'case-live',
                week: 4,
              },
              {
                id: 'qevt-0003',
                type: 'encounter.follow_up',
                targetId: 'case-missing',
                week: 4,
              },
              {
                id: 'qevt-0004',
                type: 'bogus.queue.type',
                targetId: 'any-target',
                week: 4,
              },
            ],
            nextSequence: 2,
          },
        },
      })

      const entries = hydrated.runtimeState?.eventQueue.entries ?? []

      expect(entries.map((entry) => entry.id)).toEqual(['qevt-0001', 'qevt-0002'])
      expect(entries.map((entry) => entry.type)).toEqual([
        'authored.follow_up',
        'encounter.follow_up',
      ])
    })

    it('435 recomputes nextSequence from retained queue entry ids', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        runtimeState: {
          ...fallback.runtimeState!,
          eventQueue: {
            entries: [
              {
                id: 'qevt-0007',
                type: 'authored.follow_up',
                targetId: 'frontdesk.notice.weekly-report.returning',
              },
            ],
            nextSequence: 1,
          },
        },
      })

      expect(hydrated.runtimeState?.eventQueue.nextSequence).toBe(8)
    })

    it('436 clamps developer log weeks and recomputes nextEventSequence in one pass', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 9,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {},
              eventLog: [
                {
                  id: 'devlog-0012',
                  week: 40,
                  type: 'route.selected',
                  summary: 'Route selected.',
                },
              ],
              nextEventSequence: 2,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.ui.debug.eventLog).toHaveLength(1)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.week).toBe(9)
      expect(hydrated.runtimeState?.ui.debug.nextEventSequence).toBe(13)
    })

    it('437 strips legacy player pronouns and notes not in PlayerProfileState', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        runtimeState: {
          ...fallback.runtimeState!,
          player: {
            ...fallback.runtimeState!.player,
            pronouns: 'they/them',
            notes: 'legacy handler notes',
          },
        },
      })

      expect(hydrated.runtimeState?.player).not.toHaveProperty('pronouns')
      expect(hydrated.runtimeState?.player).not.toHaveProperty('notes')
      expect(hydrated.runtimeState?.player.displayName).toBeTruthy()
    })
  })

  describe('hydration problems 438-445', () => {
    it('438 repairs unknown current location and drops stale scene history', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        runtimeState: {
          ...fallback.runtimeState!,
          currentLocation: {
            hubId: 'phantom-hub',
            locationId: 'nowhere',
            sceneId: 'missing-scene',
            updatedWeek: 4,
          },
          sceneHistory: [
            { sceneId: 'dashboard', locationId: 'operations-desk', week: 2 },
            { sceneId: 'bogus', locationId: 'front-desk', week: 3 },
          ],
        },
      })

      expect(hydrated.runtimeState?.currentLocation).toMatchObject({
        hubId: 'operations-desk',
        locationId: 'operations-desk',
        sceneId: 'dashboard',
      })
      expect(hydrated.runtimeState?.sceneHistory).toHaveLength(1)
      expect(hydrated.runtimeState?.sceneHistory[0]).toMatchObject({
        locationId: 'operations-desk',
        sceneId: 'dashboard',
      })
    })

    it('439 drops progress clocks outside registry or procedural namespaces', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        runtimeState: {
          ...fallback.runtimeState!,
          progressClocks: {
            'story.breach-depth': {
              id: 'story.breach-depth',
              label: 'Breach Depth',
              value: 1,
              max: 4,
            },
            'rogue.clock': {
              id: 'rogue.clock',
              label: 'Rogue',
              value: 2,
              max: 4,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.progressClocks['story.breach-depth']).toBeDefined()
      expect(hydrated.runtimeState?.progressClocks['rogue.clock']).toBeUndefined()
    })

    it('440 clears stale UI selections and keeps valid entity references', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]
      const teamId = Object.keys(fallback.teams)[0]
      const agentId = Object.keys(fallback.agents)[0]

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            selectedCaseId: 'missing-case',
            selectedTeamId: 'missing-team',
            selectedAgentId: 'missing-agent',
            selectedLocationId: 'operations-desk',
            selectedSceneId: 'dashboard',
          },
        },
      })

      expect(hydrated.runtimeState?.ui.selectedCaseId).toBeUndefined()
      expect(hydrated.runtimeState?.ui.selectedTeamId).toBeUndefined()
      expect(hydrated.runtimeState?.ui.selectedAgentId).toBeUndefined()

      const validSelection = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            selectedCaseId: caseId,
            selectedTeamId: teamId,
            selectedAgentId: agentId,
            selectedLocationId: 'front-desk',
            selectedSceneId: 'weekly-report',
          },
        },
      })

      expect(validSelection.runtimeState?.ui.selectedCaseId).toBe(caseId)
      expect(validSelection.runtimeState?.ui.selectedTeamId).toBe(teamId)
      expect(validSelection.runtimeState?.ui.selectedAgentId).toBe(agentId)
      expect(validSelection.runtimeState?.ui.selectedLocationId).toBe('front-desk')
      expect(validSelection.runtimeState?.ui.selectedSceneId).toBe('weekly-report')
    })

    it('441 normalizes agency.fundingState and mirrors top-level funding', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        funding: 42,
        agency: {
          ...fallback.agency!,
          funding: 999,
          fundingState: {
            funding: 999,
            fundingBasePerWeek: 8,
            fundingPerResolution: 8,
            fundingPenaltyPerFail: 7,
            fundingPenaltyPerUnresolved: 12,
            budgetPressure: 0,
            fundingHistory: [{ week: 6, delta: -1, reason: 'bogus_reason' }],
            procurementBacklog: [],
          },
        },
      })

      expect(hydrated.funding).toBe(42)
      expect(hydrated.agency?.funding).toBe(42)
      expect(hydrated.agency?.fundingState?.funding).toBe(42)
      expect(hydrated.agency?.fundingState?.fundingHistory).toEqual([
        { week: 6, delta: -1, reason: 'bogus_reason' },
      ])
      expect(Number.isFinite(hydrated.agency?.fundingState?.budgetPressure ?? NaN)).toBe(true)
    })

    it('441b hydrates fundingState-only legacy saves into all funding mirrors', () => {
      const fallback = createStartingState()
      const legacy = {
        ...stripGameTemplates(fallback),
        week: 4,
        agency: {
          ...fallback.agency!,
          funding: Number.NaN,
          fundingState: {
            ...fallback.agency!.fundingState,
            funding: 77,
            budgetPressure: 99,
          },
        },
      } as Record<string, unknown>
      delete legacy.funding

      const hydrated = hydrateGame(legacy)

      expect(hydrated.funding).toBe(77)
      expect(hydrated.agency?.funding).toBe(77)
      expect(hydrated.agency?.fundingState?.funding).toBe(77)
      expect(hydrated.agency?.fundingState?.budgetPressure).toBeLessThanOrEqual(4)
    })

    it('441c hydrates agency-only funding into all funding mirrors', () => {
      const fallback = createStartingState()
      const legacy = {
        ...stripGameTemplates(fallback),
        week: 4,
        agency: {
          ...fallback.agency!,
          funding: 88,
          fundingState: {
            ...fallback.agency!.fundingState,
            funding: Number.NaN,
          },
        },
      } as Record<string, unknown>
      delete legacy.funding

      const hydrated = hydrateGame(legacy)

      expect(hydrated.funding).toBe(88)
      expect(hydrated.agency?.funding).toBe(88)
      expect(hydrated.agency?.fundingState?.funding).toBe(88)
    })

    it('441d hydrates top-level-only legacy funding into agency mirrors', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        funding: 66,
        agency: {
          containmentRating: fallback.containmentRating,
          clearanceLevel: fallback.clearanceLevel,
        },
      })

      expect(hydrated.funding).toBe(66)
      expect(hydrated.agency?.funding).toBe(66)
      expect(hydrated.agency?.fundingState?.funding).toBe(66)
    })

    it('441e lets sanitized top-level funding win conflicting agency funding values', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        funding: 55,
        agency: {
          ...fallback.agency!,
          funding: 88,
          fundingState: {
            ...fallback.agency!.fundingState,
            funding: 99,
          },
        },
      })

      expect(hydrated.funding).toBe(55)
      expect(hydrated.agency?.funding).toBe(55)
      expect(hydrated.agency?.fundingState?.funding).toBe(55)
    })

    it('441f repairs malformed fundingState while preserving the canonical funding mirror', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        funding: 33,
        agency: {
          ...fallback.agency!,
          fundingState: {
            funding: Number.POSITIVE_INFINITY,
            fundingBasePerWeek: Number.NaN,
            fundingPerResolution: Number.NaN,
            fundingPenaltyPerFail: Number.NaN,
            fundingPenaltyPerUnresolved: Number.NaN,
            budgetPressure: Number.POSITIVE_INFINITY,
            courierShellBudgetPressureDebt: Number.POSITIVE_INFINITY,
            fundingHistory: [{ week: 99, delta: Number.NaN, reason: '' }],
            procurementBacklog: [
              {
                requestId: '',
                itemId: 'phantom-widget',
                quantity: -1,
                status: 'pending',
                requestedWeek: Number.NaN,
                cost: Number.NaN,
              },
            ],
          },
        },
      })

      const fundingState = hydrated.agency?.fundingState
      expect(hydrated.funding).toBe(33)
      expect(hydrated.agency?.funding).toBe(33)
      expect(fundingState?.funding).toBe(33)
      expect(Number.isFinite(fundingState?.budgetPressure ?? NaN)).toBe(true)
      expect(fundingState?.courierShellBudgetPressureDebt).toBeUndefined()
      expect(fundingState?.fundingHistory).toEqual([])
      expect(fundingState?.procurementBacklog).toEqual([])
    })

    it('442-445 sanitize funding history, procurement backlog, and shell debt', () => {
      const fallback = createStartingState()
      const knownItemId = Object.keys(fallback.inventory)[0]

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        funding: 200,
        agency: {
          ...fallback.agency!,
          funding: 200,
          fundingState: {
            funding: 200,
            fundingBasePerWeek: 8,
            fundingPerResolution: 8,
            fundingPenaltyPerFail: 7,
            fundingPenaltyPerUnresolved: 12,
            budgetPressure: 0,
            courierShellBudgetPressureDebt: Number.NaN,
            fundingHistory: [
              { week: 5, delta: -10, reason: 'market_transaction', sourceId: 'req-known' },
              { week: 5, delta: 1, reason: 'not_a_real_reason' },
            ],
            procurementBacklog: [
              {
                requestId: 'req-zero',
                itemId: knownItemId,
                quantity: 0,
                status: 'pending',
                requestedWeek: 5,
                cost: 1,
              },
              {
                requestId: 'req-known',
                itemId: knownItemId,
                quantity: 1,
                status: 'pending',
                requestedWeek: 5,
                cost: 1,
              },
              {
                requestId: 'req-unknown',
                itemId: 'phantom-widget',
                quantity: 2,
                status: 'pending',
                requestedWeek: 3,
                fulfilledWeek: 5,
                cost: 4,
              },
              {
                requestId: 'req-fulfilled',
                itemId: knownItemId,
                quantity: 1,
                status: 'fulfilled',
                requestedWeek: 4,
                cost: 2,
              },
            ],
          },
        },
      })

      const fs = hydrated.agency?.fundingState
      expect(fs?.courierShellBudgetPressureDebt).toBeUndefined()
      expect(Number.isFinite(fs?.budgetPressure ?? NaN)).toBe(true)
      expect(fs?.fundingHistory).toHaveLength(2)
      expect(
        fs?.fundingHistory.find((entry) => entry.reason === 'market_transaction')
      ).toMatchObject({
        week: 5,
        reason: 'market_transaction',
        sourceId: 'req-known',
      })
      expect(
        fs?.fundingHistory.find((entry) => entry.reason === 'not_a_real_reason')
      ).toMatchObject({
        week: 5,
        reason: 'not_a_real_reason',
        delta: 1,
      })
      expect(fs?.procurementBacklog.find((e) => e.requestId === 'req-zero')).toBeUndefined()
      expect(fs?.procurementBacklog.find((e) => e.requestId === 'req-known')?.status).toBe(
        'pending'
      )
      const unknown = fs?.procurementBacklog.find((e) => e.requestId === 'req-unknown')
      expect(unknown?.status).toBe('cancelled')
      expect(unknown?.blockedReason).toBe('unknown_item')
      expect(unknown?.fulfilledWeek).toBe(3)
      const fulfilled = fs?.procurementBacklog.find((e) => e.requestId === 'req-fulfilled')
      expect(fulfilled?.status).toBe('fulfilled')
      expect(fulfilled?.fulfilledWeek).toBeGreaterThanOrEqual(4)
    })

    it('445b bounds and dedupes hydrated funding history audit rows', () => {
      const fallback = createStartingState()
      const longReason = `custom-${'x'.repeat(120)}`
      const longSourceId = `source-${'y'.repeat(160)}`

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        funding: 200,
        agency: {
          ...fallback.agency!,
          funding: 200,
          fundingState: {
            funding: 200,
            fundingBasePerWeek: 8,
            fundingPerResolution: 8,
            fundingPenaltyPerFail: 7,
            fundingPenaltyPerUnresolved: 12,
            budgetPressure: 0,
            fundingHistory: [
              { week: 99, delta: 12.345, reason: ' weekly_income ', sourceId: ' source-a ' },
              { week: 2, delta: Number.NaN, reason: 'resolution_reward' },
              { week: 3, delta: 9, reason: '   ' },
              { week: 4, delta: 10, reason: longReason, sourceId: longSourceId },
              { week: 4, delta: 11, reason: longReason, sourceId: longSourceId },
              { week: 5, delta: -9_999_999, reason: 'failure_penalty' },
              { week: 5, delta: 4, reason: 'market_transaction', sourceId: 'missing-request' },
            ],
            procurementBacklog: [],
          },
        },
      })

      expect(hydrated.agency?.fundingState?.fundingHistory).toEqual([
        {
          week: 4,
          delta: 10,
          reason: longReason.slice(0, 80),
          sourceId: longSourceId.slice(0, 120),
        },
        { week: 5, delta: -1_000_000, reason: 'failure_penalty' },
        { week: 5, delta: 12.35, reason: 'weekly_income', sourceId: 'source-a' },
      ])
    })
  })

  describe('hydration problems 446-453', () => {
    it('446 falls back unknown featuredRecipeId to catalog default', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        market: {
          ...fallback.market,
          featuredRecipeId: 'phantom-recipe',
        },
      })

      expect(getProductionRecipe(hydrated.market.featuredRecipeId)).toBeDefined()
      expect(hydrated.market.featuredRecipeId).toBe(fallback.market.featuredRecipeId)
    })

    it('447 clamps licensedHandlingAttestationWeek to 1..campaignWeek', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        market: {
          ...fallback.market,
          licensedHandlingAttestationWeek: 99,
        },
      })

      expect(hydrated.market.licensedHandlingAttestationWeek).toBe(5)
    })

    it('448 strips persisted market listings on hydrate', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        market: {
          ...fallback.market,
          listings: [{ id: 'stale-listing', itemId: 'medkits' }],
        },
      })

      expect(hydrated.market).not.toHaveProperty('listings')
    })

    it('449-450 sanitizes courierShellFront status, exposure, and week ordering', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        agency: {
          ...fallback.agency!,
          courierShellFront: {
            type: 'courierShell',
            status: 'bogus' as 'active',
            startedWeek: 6,
            startupCostPaid: 500,
            lastResolvedWeek: 0,
            exposureBand: 'bogus' as 'low',
            collapseReason: 'bogus' as 'overstretched',
          },
        },
      })

      expect(hydrated.agency?.courierShellFront).toMatchObject({
        type: 'courierShell',
        status: 'active',
        startedWeek: 4,
        lastResolvedWeek: 4,
        exposureBand: 'low',
        startupCostPaid: 500,
      })
      expect(hydrated.agency?.courierShellFront).not.toHaveProperty('collapseReason')
    })

    it('451 filters activeProtocolIds to catalog and enforces selection limit', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        clearanceLevel: 1,
        agency: {
          ...fallback.agency!,
          protocolSelectionLimit: 1,
          activeProtocolIds: [
            'field-clearance-protocol',
            'containment-doctrine-alpha',
            'stormwall',
          ],
        },
      })

      expect(hydrated.agency?.protocolSelectionLimit).toBe(1)
      expect(hydrated.agency?.activeProtocolIds).toEqual(['field-clearance-protocol'])
    })

    it('451b clamps negative protocolSelectionLimit and dedupes activeProtocolIds', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        clearanceLevel: 3,
        agency: {
          ...fallback.agency!,
          protocolSelectionLimit: -4,
          activeProtocolIds: [
            ' field-clearance-protocol ',
            'field-clearance-protocol',
            'containment-doctrine-alpha',
          ],
        },
      })

      expect(hydrated.agency?.protocolSelectionLimit).toBe(1)
      expect(hydrated.agency?.activeProtocolIds).toEqual(['field-clearance-protocol'])
    })

    it('451c drops non-finite protocolSelectionLimit while still sanitizing activeProtocolIds', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        clearanceLevel: 2,
        agency: {
          ...fallback.agency!,
          protocolSelectionLimit: Number.NaN,
          activeProtocolIds: [
            'field-clearance-protocol',
            'containment-doctrine-alpha',
            'unknown-renamed-protocol',
          ],
        },
      })

      expect(hydrated.agency?.protocolSelectionLimit).toBeUndefined()
      expect(hydrated.agency?.activeProtocolIds).toEqual([
        'field-clearance-protocol',
        'containment-doctrine-alpha',
      ])
    })

    it('451d preserves valid agency protocol state', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        agency: {
          ...fallback.agency!,
          protocolSelectionLimit: 2,
          activeProtocolIds: ['field-clearance-protocol', 'containment-doctrine-alpha'],
        },
      })

      expect(hydrated.agency?.protocolSelectionLimit).toBe(2)
      expect(hydrated.agency?.activeProtocolIds).toEqual([
        'field-clearance-protocol',
        'containment-doctrine-alpha',
      ])
    })

    it('452 clamps maintenanceSpecialistsAvailable to bounded non-negative capacity', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        agency: {
          ...fallback.agency!,
          maintenanceSpecialistsAvailable: 250,
        },
      })

      expect(hydrated.agency?.maintenanceSpecialistsAvailable).toBe(99)
    })

    it('453 trims, dedupes, and validates progressionUnlockIds against catalog', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        agency: {
          ...fallback.agency!,
          progressionUnlockIds: [
            'containment-liturgy',
            'containment-liturgy',
            'phantom-unlock',
            'blacksite-retrofit',
          ],
        },
      })

      expect(hydrated.agency?.progressionUnlockIds).toEqual([
        'containment-liturgy',
        'blacksite-retrofit',
      ])
    })
  })

  describe('hydration problems 454-461', () => {
    it('454 validates market pressure enum and reconciles costMultiplier with pressure', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        market: {
          ...fallback.market,
          pressure: 'bogus' as 'stable',
          costMultiplier: 1.75,
        },
      })

      expect(hydrated.market.pressure).toBe('stable')
      expect(hydrated.market.costMultiplier).toBe(1)
    })

    it('454 maps discounted and tight pressure to canonical multipliers', () => {
      const fallback = createStartingState()

      const discounted = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        market: { ...fallback.market, pressure: 'discounted', costMultiplier: 1.5 },
      })
      const tight = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        market: { ...fallback.market, pressure: 'tight', costMultiplier: 0.6 },
      })

      expect(discounted.market.costMultiplier).toBe(0.9)
      expect(tight.market.costMultiplier).toBe(1.15)
    })

    it('455-456 sanitizes caseQueue to known eligible cases and reconciles priorities', () => {
      const fallback = createStartingState()
      const openCaseId = Object.keys(fallback.cases)[0]!
      const resolvedCaseId = 'case-resolved-queue'
      const missingCaseId = 'case-missing-queue'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        cases: {
          ...fallback.cases,
          [resolvedCaseId]: {
            ...fallback.cases[openCaseId]!,
            id: resolvedCaseId,
            status: 'resolved',
          },
        },
        caseQueue: {
          queuedCaseIds: [missingCaseId, openCaseId, resolvedCaseId, openCaseId, '  '],
          priorities: {
            [openCaseId]: 'critical',
            [resolvedCaseId]: 'high',
            [missingCaseId]: 'low',
            'orphan-priority-only': 'bogus' as 'normal',
          },
        },
      })

      expect(hydrated.caseQueue?.queuedCaseIds).toEqual([openCaseId])
      expect(hydrated.caseQueue?.priorities).toEqual({ [openCaseId]: 'critical' })
      expect(hydrated.caseQueue?.priorities['orphan-priority-only']).toBeUndefined()
    })

    it('456 defaults unknown priorities to normal for queued cases', () => {
      const fallback = createStartingState()
      const caseIds = Object.keys(fallback.cases).slice(0, 2)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        caseQueue: {
          queuedCaseIds: caseIds,
          priorities: {
            [caseIds[0]]: 'bogus' as 'normal',
          },
        },
      })

      expect(hydrated.caseQueue?.priorities[caseIds[0]]).toBe('normal')
      expect(hydrated.caseQueue?.priorities[caseIds[1]]).toBe('normal')
    })

    it('457-458 clamps procurement cost and dedupes requestId keeping earliest', () => {
      const fallback = createStartingState()
      const knownItemId = Object.keys(fallback.inventory)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        agency: {
          ...fallback.agency!,
          fundingState: {
            funding: 500,
            fundingBasePerWeek: 8,
            fundingPerResolution: 8,
            fundingPenaltyPerFail: 7,
            fundingPenaltyPerUnresolved: 12,
            budgetPressure: 0,
            fundingHistory: [],
            procurementBacklog: [
              {
                requestId: 'req-dup',
                itemId: knownItemId,
                quantity: 1,
                status: 'pending',
                requestedWeek: 4,
                cost: -12,
              },
              {
                requestId: 'req-dup',
                itemId: knownItemId,
                quantity: 2,
                status: 'fulfilled',
                requestedWeek: 5,
                cost: 9,
              },
            ],
          },
        },
      })

      const backlog = hydrated.agency?.fundingState?.procurementBacklog ?? []
      expect(backlog).toHaveLength(1)
      expect(backlog[0]).toMatchObject({
        requestId: 'req-dup',
        requestedWeek: 4,
        cost: 0,
        quantity: 1,
      })
    })

    it('458b repairs procurement backlog chronology and stale delayed supplier references', () => {
      const fallback = createStartingState()
      const longRequestId = `req-${'x'.repeat(160)}`
      const longBlockedReason = `blocked-${'y'.repeat(160)}`

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        agency: {
          ...fallback.agency!,
          fundingState: {
            funding: 500,
            fundingBasePerWeek: 8,
            fundingPerResolution: 8,
            fundingPenaltyPerFail: 7,
            fundingPenaltyPerUnresolved: 12,
            budgetPressure: 0,
            fundingHistory: [],
            procurementBacklog: [
              {
                requestId: ' req-fulfilled-before ',
                itemId: ' medkits ',
                quantity: 2.9,
                status: 'fulfilled',
                requestedWeek: 4,
                fulfilledWeek: 2,
                cost: 12.345,
                blockedReason: longBlockedReason,
              },
              {
                requestId: 'req-future',
                itemId: 'medkits',
                quantity: 1,
                status: 'pending',
                requestedWeek: 99,
                cost: 4,
              },
              {
                requestId: 'req-invalid-status',
                itemId: 'medkits',
                quantity: 1,
                status: 'lost' as 'pending',
                requestedWeek: 3,
                cost: 4,
              },
              {
                requestId: 'req-unknown-item',
                itemId: 'unknown_widget',
                quantity: 1,
                status: 'pending',
                requestedWeek: 3,
                cost: 7,
              },
              {
                requestId: 'req-negative-cost',
                itemId: 'medkits',
                quantity: 1,
                status: 'pending',
                requestedWeek: 3,
                cost: -9,
              },
              {
                requestId: longRequestId,
                itemId: 'medkits',
                quantity: 1,
                status: 'pending',
                requestedWeek: 3,
                cost: 8,
                listingId: 'gear:field_plate',
                delayWeeks: 2.8,
              },
              {
                requestId: 'req-valid-delay',
                itemId: 'medkits',
                quantity: 1,
                status: 'pending',
                requestedWeek: 3,
                cost: 8,
                listingId: 'med-kits',
                delayWeeks: 2,
              },
            ],
          },
        },
      })

      expect(hydrated.agency?.fundingState?.procurementBacklog).toEqual([
        {
          requestId: 'req-negative-cost',
          itemId: 'medkits',
          quantity: 1,
          requestedWeek: 3,
          cost: 0,
          status: 'pending',
        },
        {
          requestId: 'req-unknown-item',
          itemId: 'unknown_widget',
          quantity: 1,
          requestedWeek: 3,
          cost: 7,
          status: 'cancelled',
          fulfilledWeek: 3,
          blockedReason: 'unknown_item',
        },
        {
          requestId: 'req-valid-delay',
          itemId: 'medkits',
          quantity: 1,
          requestedWeek: 3,
          cost: 8,
          status: 'pending',
          listingId: 'med-kits',
          delayWeeks: 2,
        },
        {
          requestId: longRequestId.slice(0, 120),
          itemId: 'medkits',
          quantity: 1,
          requestedWeek: 3,
          cost: 8,
          status: 'cancelled',
          fulfilledWeek: 3,
          blockedReason: 'stale_listing',
          delayWeeks: 2,
        },
        {
          requestId: 'req-fulfilled-before',
          itemId: 'medkits',
          quantity: 2,
          requestedWeek: 4,
          cost: 12.35,
          status: 'fulfilled',
          fulfilledWeek: 4,
          blockedReason: longBlockedReason.slice(0, 120),
        },
        {
          requestId: 'req-future',
          itemId: 'medkits',
          quantity: 1,
          requestedWeek: 5,
          cost: 4,
          status: 'pending',
        },
      ])
    })

    it('459 canonicalizes caseSnapshots record keys to embedded caseId', () => {
      const fallback = createStartingState()
      const canonicalCaseId = 'case-canonical-snapshot'
      const aliasRecordKey = 'alias-record-key'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
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
            caseSnapshots: {
              [aliasRecordKey]: {
                caseId: canonicalCaseId,
                title: 'Canonical Snapshot',
                kind: 'case',
                mode: 'threshold',
                status: 'open',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
            },
            notes: [],
          },
        ],
      })

      const snapshots = hydrated.reports[0]?.caseSnapshots
      expect(snapshots?.[canonicalCaseId]?.caseId).toBe(canonicalCaseId)
      expect(snapshots?.[aliasRecordKey]).toBeUndefined()
    })

    it('460 aligns snapshot status with missionResult and drops invalid outcomes', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
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
            caseSnapshots: {
              [caseId]: {
                caseId,
                title: 'Open With Result',
                kind: 'case',
                mode: 'threshold',
                status: 'open',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [],
                missionResult: {
                  caseId,
                  caseTitle: 'Open With Result',
                  teamsUsed: [],
                  outcome: 'success',
                  performanceSummary: {
                    contribution: 0,
                    threatHandled: 0,
                    damageTaken: 0,
                    healingPerformed: 0,
                    evidenceGathered: 0,
                    containmentActionsCompleted: 0,
                  },
                  rewards: {
                    outcome: 'success',
                    caseType: 'general',
                    caseTypeLabel: 'Operation',
                    operationValue: 0,
                    factors: [],
                    fundingDelta: 0,
                    containmentDelta: 0,
                    strategicValueDelta: 0,
                    reputationDelta: 0,
                    inventoryRewards: [],
                    factionStanding: [],
                    label: 'Mission',
                    reasons: [],
                  },
                  penalties: {
                    fundingLoss: 0,
                    containmentLoss: 0,
                    reputationLoss: 0,
                    strategicLoss: 0,
                  },
                  fatigueChanges: [],
                  injuries: [],
                  spawnedConsequences: [],
                  explanationNotes: [],
                },
              },
              'case-resolved-empty': {
                caseId: 'case-resolved-empty',
                title: 'Resolved Without Result',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 2,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
              'case-bad-outcome': {
                caseId: 'case-bad-outcome',
                title: 'Bad Outcome',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 2,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
                missionResult: {
                  caseId: 'case-bad-outcome',
                  caseTitle: 'Bad Outcome',
                  teamsUsed: [],
                  outcome: 'bogus' as 'success',
                  performanceSummary: {
                    contribution: 0,
                    threatHandled: 0,
                    damageTaken: 0,
                    healingPerformed: 0,
                    evidenceGathered: 0,
                    containmentActionsCompleted: 0,
                  },
                  rewards: {
                    outcome: 'success',
                    caseType: 'general',
                    caseTypeLabel: 'Operation',
                    operationValue: 0,
                    factors: [],
                    fundingDelta: 0,
                    containmentDelta: 0,
                    strategicValueDelta: 0,
                    reputationDelta: 0,
                    inventoryRewards: [],
                    factionStanding: [],
                    label: 'Mission',
                    reasons: [],
                  },
                  penalties: {
                    fundingLoss: 0,
                    containmentLoss: 0,
                    reputationLoss: 0,
                    strategicLoss: 0,
                  },
                  fatigueChanges: [],
                  injuries: [],
                  spawnedConsequences: [],
                  explanationNotes: [],
                },
              },
            },
            notes: [],
          },
        ],
      })

      const snapshots = hydrated.reports[0]?.caseSnapshots
      expect(snapshots?.[caseId]?.status).toBe('resolved')
      expect(snapshots?.[caseId]?.missionResult?.outcome).toBe('success')
      expect(snapshots?.['case-resolved-empty']?.status).toBe('open')
      expect(snapshots?.['case-resolved-empty']?.missionResult).toBeUndefined()
      expect(snapshots?.['case-bad-outcome']?.status).toBe('open')
      expect(snapshots?.['case-bad-outcome']?.missionResult).toBeUndefined()
    })

    it('461 drops contract material rewards with unknown catalog itemIds', () => {
      const fallback = createStartingState()
      const seedOffer = getContractOffers(fallback)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        contracts: {
          generatedWeek: 1,
          offers: [
            {
              ...seedOffer,
              rewards: {
                ...seedOffer.rewards,
                materials: [
                  ...(seedOffer.rewards.materials ?? []),
                  { itemId: 'phantom-widget', label: 'Phantom', quantity: 2 },
                ],
              },
            },
          ],
          history: {},
          unlockedResearchIds: [],
        },
      })

      const materials = hydrated.contracts?.offers[0]?.rewards.materials ?? []
      expect(materials.some((drop) => drop.itemId === 'phantom-widget')).toBe(false)
      expect(materials.length).toBeGreaterThan(0)
      expect(materials.every((drop) => drop.itemId.length > 0 && drop.label.length > 0)).toBe(true)
    })
  })

  describe('hydration problems 462-469', () => {
    it('462-463 sanitizes mission routing enums, weeks, sequence, and team references', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!
      const teamId = Object.keys(fallback.teams)[0]!
      const missingTeamId = 'team-missing-routing'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        missionRouting: {
          orderedMissionIds: [caseId, 'case-missing', caseId],
          nextGeneratedSequence: 999999,
          missions: {
            [caseId]: {
              missionId: caseId,
              templateId: fallback.cases[caseId]!.templateId,
              category: 'strategic_opportunity',
              kind: 'case',
              status: 'open',
              generatedWeek: 99,
              deadlineRemaining: 2,
              durationWeeks: 2,
              stage: 1,
              difficulty: fallback.cases[caseId]!.difficulty,
              weights: fallback.cases[caseId]!.weights,
              requiredTags: [],
              preferredTags: [],
              assignedTeamIds: [missingTeamId],
              intakeSource: 'bogus',
              priority: 'bogus',
              priorityReasonCodes: ['stale'],
              triageScore: 500,
              routingState: 'bogus',
              routingBlockers: ['not-a-blocker'],
              lastTriageWeek: 99,
              lastRoutedWeek: 99,
              lastCandidateTeamIds: [missingTeamId, teamId, teamId],
              lastRejectedTeamIds: [
                { teamId: missingTeamId, reasonCode: 'not-a-blocker' },
                { teamId, reasonCode: 'fatigue-over-threshold' },
              ],
            },
          },
        },
      })

      const mission = hydrated.missionRouting?.missions[caseId]
      expect(mission?.generatedWeek).toBe(6)
      expect(mission?.lastTriageWeek).toBe(6)
      expect(mission?.lastRoutedWeek).toBe(6)
      expect(mission?.lastCandidateTeamIds).toContain(teamId)
      expect(mission?.lastCandidateTeamIds).not.toContain(missingTeamId)
      expect(mission?.lastRejectedTeamIds?.every((entry) => entry.teamId in fallback.teams)).toBe(
        true
      )
      expect(mission?.lastRejectedTeamIds?.length).toBeGreaterThan(0)
      expect(
        mission?.lastRejectedTeamIds?.some((entry) => entry.reasonCode === 'not-a-blocker')
      ).toBe(false)
      expect(mission?.routingState).not.toBe('bogus')
      expect(mission?.routingBlockers).not.toContain('not-a-blocker')
      expect(hydrated.missionRouting?.orderedMissionIds).not.toContain('case-missing')
      expect(hydrated.missionRouting?.missions['case-missing']).toBeUndefined()
      expect(hydrated.missionRouting?.nextGeneratedSequence).toBeGreaterThanOrEqual(
        (hydrated.missionRouting?.orderedMissionIds.length ?? 0) + 1
      )
    })

    it('464 strips corrupt replacement pressure scalars and unknown backlog arrays', () => {
      const fallback = createStartingState()
      fallback.agents['a_kellan'] = {
        ...fallback.agents['a_kellan']!,
        attritionState: {
          attritionStatus: 'lost',
          lossReasonCodes: ['hydration-464'],
          replacementPriority: 1,
          retentionPressure: 0,
        },
      }

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        replacementPressureState: {
          replacementPressure: Number.NaN,
          staffingGap: -4,
          activeLossCount: 1,
          criticalRoleLossCount: 0,
          replacementBacklog: [{ bogus: true }],
          reasonCodes: ['  ', 'staffing-gap:1', 'staffing-gap:1'],
          recruitmentPriorityBand: 'bogus',
        },
      })

      expect(hydrated.replacementPressureState).toEqual(buildReplacementPressureState(hydrated))
      expect(hydrated.replacementPressureState?.replacementBacklog).toEqual([])
      expect(Number.isFinite(hydrated.replacementPressureState?.replacementPressure ?? NaN)).toBe(
        true
      )
    })

    it('465 clamps deployment momentum stacks and lastChangeWeek to campaign week', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 9,
        config: {
          ...fallback.config,
          challengeModeEnabled: true,
          durationModel: 'attrition',
        },
        deploymentMomentum: {
          stacks: 99,
          lastChangeWeek: 40,
          lastSummary: '  sustained pressure  ',
        },
      })

      expect(hydrated.deploymentMomentum?.stacks).toBe(3)
      expect(hydrated.deploymentMomentum?.lastChangeWeek).toBe(9)
      expect(hydrated.deploymentMomentum?.lastSummary).toBe('sustained pressure')
    })

    it('466 reconciles party card zones and drops invalid queued play targets', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const cardId = fallback.partyCards!.deck[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        partyCards: {
          ...fallback.partyCards!,
          deck: [cardId],
          hand: [cardId],
          discard: [cardId],
          maxHandSize: 99,
          queuedPlays: [
            {
              playId: 'play-1',
              cardId,
              targetCaseId: 'missing-case',
              weekPlayed: 2,
            },
            {
              playId: 'play-2',
              cardId: 'card-surge-team',
              targetTeamId: teamId,
              weekPlayed: 2,
            },
          ],
        },
      })

      expect(hydrated.partyCards?.hand).toEqual([cardId])
      expect(hydrated.partyCards?.deck).toEqual([])
      expect(hydrated.partyCards?.discard).toEqual([])
      expect(hydrated.partyCards?.maxHandSize).toBe(12)
      expect(hydrated.partyCards?.queuedPlays).toEqual([
        {
          playId: 'play-2',
          cardId: 'card-surge-team',
          targetTeamId: teamId,
          weekPlayed: 2,
        },
      ])
    })

    it('467 filters response grid template ids to the known catalog', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        responseGrid: {
          majorIncidentThreshold: 0.5,
          majorIncidentTemplateIds: ['raid-001', 'phantom-template', '  '],
          pressureDecayPerWeek: -3,
        },
      })

      expect(hydrated.responseGrid?.majorIncidentThreshold).toBe(1)
      expect(hydrated.responseGrid?.majorIncidentTemplateIds).toEqual(['raid-001'])
      expect(hydrated.responseGrid?.pressureDecayPerWeek).toBe(0)
    })

    it('467 falls back to default template ids when persisted list is empty', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        responseGrid: {
          majorIncidentThreshold: 12,
          majorIncidentTemplateIds: ['phantom-only'],
          pressureDecayPerWeek: 2,
        },
      })

      expect(hydrated.responseGrid?.majorIncidentTemplateIds).toEqual(
        DEFAULT_RESPONSE_GRID.majorIncidentTemplateIds
      )
    })

    it('468 sanitizes district schedule districts, time bands, and appliesTo refs', () => {
      const fallback = createStartingState()
      const haven = buildHavenSchedule()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        districtScheduleState: {
          settlementId: '  haven  ',
          districts: {
            hub: haven.districts.hub,
            orphan: {
              id: 'orphan',
              label: 'Orphan',
              encounterFamilyTags: ['test'],
              escalationModifiers: { stage_delta: 1 },
              authorityResponseProfile: 'standard',
            },
          },
          timeBands: {
            morning: haven.timeBands.morning,
          },
          events: [
            {
              ...haven.events[0]!,
              appliesTo: ['hub', 'missing-district'],
            },
            {
              id: 'bad-event',
              label: 'Bad',
              appliesTo: ['missing-only'],
              startWeek: 1,
              endWeek: 2,
              trafficModifier: {},
              seedKey: 'bad',
            },
          ],
        },
      })

      expect(hydrated.districtScheduleState?.settlementId).toBe('haven')
      expect(hydrated.districtScheduleState?.districts.hub).toBeDefined()
      expect(hydrated.districtScheduleState?.districts.orphan).toBeDefined()
      expect(hydrated.districtScheduleState?.events).toHaveLength(1)
      expect(hydrated.districtScheduleState?.events[0]?.appliesTo).toEqual(['hub'])
    })

    it('469 validates compromised authority enums, faction ref, and patrol count', () => {
      const fallback = createStartingState()
      const factionId = Object.keys(fallback.factions ?? {})[0]!

      const valid = hydrateGame({
        ...stripGameTemplates(fallback),
        compromisedAuthority: {
          officialRole: 'sheriff',
          benefittingFactionId: factionId,
          distortedCategories: ['patrol', 'bogus', 'patrol'],
          corruptionDepth: 'shallow_cover',
          patrolAnomalyCount: 4.8,
        },
      })

      expect(valid.compromisedAuthority).toMatchObject({
        officialRole: 'sheriff',
        benefittingFactionId: factionId,
        distortedCategories: ['patrol'],
        corruptionDepth: 'shallow_cover',
        patrolAnomalyCount: 4,
      })

      const invalid = hydrateGame({
        ...stripGameTemplates(fallback),
        compromisedAuthority: {
          officialRole: 'mayor',
          benefittingFactionId: 'missing-faction',
          distortedCategories: ['patrol'],
          corruptionDepth: 'deep',
          patrolAnomalyCount: -2,
        },
      })

      expect(invalid.compromisedAuthority).toBeUndefined()
    })
  })

  describe('hydration problems 470-477', () => {
    it('470 sanitizes legitimacy sanctionLevel, falloutRisk, and accessReason', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        legitimacy: {
          sanctionLevel: 'bogus',
          falloutRisk: 'explosive',
          accessReason: '  audit posture  ',
        },
      })

      expect(hydrated.legitimacy).toBeUndefined()

      const valid = hydrateGame({
        ...stripGameTemplates(fallback),
        legitimacy: {
          sanctionLevel: 'sanctioned',
          falloutRisk: 'risk',
          accessReason: '  audit posture  ',
        },
      })

      expect(valid.legitimacy).toEqual({
        sanctionLevel: 'sanctioned',
        falloutRisk: 'risk',
        accessReason: 'audit posture',
      })
    })

    it('471 bounds emergency waiver week to campaign week and caps precedent count', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 8,
        emergencyGrayMarketWaiverWeek: 7,
        emergencyGrayMarketWaiverPrecedentCount: 999_999,
      })

      expect(hydrated.emergencyGrayMarketWaiverWeek).toBeUndefined()
      expect(hydrated.emergencyGrayMarketWaiverPrecedentCount).toBe(50_000)

      const active = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 8,
        emergencyGrayMarketWaiverWeek: 8,
        emergencyGrayMarketWaiverPrecedentCount: 3,
      })

      expect(active.emergencyGrayMarketWaiverWeek).toBe(8)
      expect(active.emergencyGrayMarketWaiverPrecedentCount).toBe(3)
    })

    it('472 reconciles supportAvailable with agency canonical owner and top-level mirror', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        supportAvailable: 2,
        agency: {
          ...fallback.agency!,
          supportAvailable: 9,
        },
      })

      expect(hydrated.supportAvailable).toBe(9)
      expect(hydrated.agency?.supportAvailable).toBe(9)
    })

    it('473 mirrors coordination friction from agency to top-level', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        coordinationFrictionActive: false,
        coordinationFrictionReason: 'stale top-level',
        agency: {
          ...fallback.agency!,
          coordinationFrictionActive: true,
          coordinationFrictionReason: 'command overload',
        },
      })

      expect(hydrated.coordinationFrictionActive).toBe(true)
      expect(hydrated.coordinationFrictionReason).toBe('command overload')
      expect(hydrated.agency?.coordinationFrictionActive).toBe(true)
      expect(hydrated.agency?.coordinationFrictionReason).toBe('command overload')
    })

    it('474 preserves allowlisted substancePolicy enum values on config', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        config: {
          ...fallback.config,
          substancePolicy: 'restricted',
        },
      })

      expect(hydrated.config.substancePolicy).toBe('restricted')

      const invalid = hydrateGame({
        ...stripGameTemplates(fallback),
        config: {
          ...fallback.config,
          substancePolicy: 'bogus' as 'restricted',
        },
      })

      expect(invalid.config.substancePolicy).toBeUndefined()
    })

    it('475 dedupes clearanceThresholds into strictly increasing non-negative values', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        config: {
          ...fallback.config,
          clearanceThresholds: [30, 10, 10, -5, Number.NaN, 20],
        },
      })

      expect(hydrated.config.clearanceThresholds).toEqual([10, 20, 30])
    })

    it('476 clamps global pressure scalars to finite non-negative bounds', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        globalPressure: Number.NaN,
        globalEscalationLevel: 99,
        globalThreatDrift: -4,
        globalTimePressure: 6,
      })

      expect(hydrated.globalPressure).toBeUndefined()
      expect(hydrated.globalEscalationLevel).toBe(8)
      expect(hydrated.globalThreatDrift).toBe(0)
      expect(hydrated.globalTimePressure).toBe(6)
    })

    it('477 recomputes supportStaff total when role counts disagree', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        supportStaff: {
          admin: 2,
          logistics: 3,
          medical: 1,
          intel: 0,
          total: 99,
          pressure: 150,
        },
      })

      expect(hydrated.supportStaff).toEqual({
        admin: 2,
        logistics: 3,
        medical: 1,
        intel: 0,
        total: 6,
        pressure: 100,
      })
    })
  })

  describe('hydration problems 478-485', () => {
    it('478 sanitizes candidate category payloads, scout report, and source refs', () => {
      const fallback = createStartingState()
      const agent = buildAgentCandidate({
        hireStatus: 'candidate',
        sourceRequiredTier: 'bogus' as 'friendly',
        scoutReport: {
          stage: 2,
          projectedTier: 'B',
          exactKnown: false,
          confidence: 'unknown' as 'low',
          scoutedWeek: 0,
        },
      })
      const staff = buildStaffCandidate({
        staffData: {
          specialty: 'intelligence',
          passiveBonuses: { intelYield: 0.08, bad: Number.NaN },
        },
      })

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          candidates: [
            agent,
            staff,
            {
              id: 'cand-invalid',
              name: 'Invalid',
              age: 20,
              category: 'agent',
              hireStatus: 'available',
              revealLevel: 0,
              expiryWeek: 4,
              evaluation: {},
            },
          ],
        },
        fallback
      )

      expect(hydrated.candidates).toHaveLength(2)
      expect(hydrated.candidates[0]?.scoutReport).toMatchObject({
        stage: 2,
        projectedTier: 'B',
        confidence: 'low',
        scoutedWeek: 1,
      })
      expect(hydrated.candidates[0]?.sourceRequiredTier).toBeUndefined()
      expect(hydrated.candidates[1]?.staffData?.specialty).toBe('intel')
      expect(hydrated.candidates[1]?.staffData?.passiveBonuses).toEqual({ intelYield: 0.08 })
    })

    it('479 falls back to recruitmentPool only when canonical candidates are empty', () => {
      const fallback = createStartingState()
      const legacyOnly = buildAgentCandidate({ id: 'cand-legacy-pool' })

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          candidates: [],
          recruitmentPool: [legacyOnly],
        },
        fallback
      )

      expect(hydrated.candidates.map((candidate) => candidate.id)).toEqual(['cand-legacy-pool'])
      expect(hydrated.recruitmentPool).toEqual(hydrated.candidates)
    })

    it('480 sanitizes staff role, specialty, efficiency, passiveBonuses, assignedAgentId', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          staff: {
            'staff-support': {
              specialty: 'intelligence',
              efficiency: 140,
              passiveBonuses: { yield: 0.1, junk: Number.NaN },
            },
            'staff-instructor': {
              role: 'instructor',
              name: '  Coach  ',
              efficiency: 200,
              instructorSpecialty: 'bogus',
              assignedAgentId: agentId,
            },
            'staff-stale-assign': {
              role: 'instructor',
              name: 'Stale',
              efficiency: 80,
              instructorSpecialty: 'social',
              assignedAgentId: 'a_missing',
            },
          },
        },
        fallback
      )

      expect(hydrated.staff['staff-support']).toEqual({
        specialty: 'intel',
        efficiency: 100,
        passiveBonuses: { yield: 0.1 },
      })
      expect(hydrated.staff['staff-instructor']).toEqual({
        role: 'instructor',
        name: 'Coach',
        efficiency: 100,
        instructorSpecialty: 'combat',
        assignedAgentId: agentId,
      })
      expect(hydrated.staff['staff-stale-assign']).toEqual({
        role: 'instructor',
        name: 'Stale',
        efficiency: 80,
        instructorSpecialty: 'social',
      })
    })

    it('480b keeps fallback staff when persisted staff payload is an array', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          staff: [{ role: 'instructor', name: 'Corrupt' }],
        },
        fallback
      )

      expect(hydrated.staff).toEqual(fallback.staff)
    })

    it('481 applies normalizeAgent via sanitizeAgentsMap instead of shallow roster cast', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              fatigue: 999,
              baseStats: {
                combat: Number.NaN,
                investigation: 200,
                utility: -5,
                social: 40,
              },
              traits: undefined,
              abilities: undefined,
              progression: undefined,
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.progression).toBeDefined()
      expect(agent?.traits).toBeDefined()
      expect(agent?.abilities).toBeDefined()
      expect(agent?.vitals?.stress).toBe(100)
      expect(agent?.baseStats.investigation).toBe(100)
    })

    it('482 clears assignments that reference missing teams or cases', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              assignment: {
                state: 'assigned',
                caseId: 'case-missing',
                teamId: 't_missing',
                startedWeek: 2,
              },
            },
          },
          teams: {},
          cases: {},
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.assignment).toEqual({ state: 'idle' })
      expect(hydrated.agents[agentId]?.assignmentStatus).toEqual({
        state: 'idle',
        teamId: null,
        caseId: null,
      })
    })

    it('483 keeps training and certification normalization on hydrate', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          agents: {
            [agentId]: {
              ...baseAgent,
              progression: {
                ...baseAgent.progression!,
                trainingHistory: [
                  { trainingId: 'bogus-program', week: 3 },
                  { trainingId: 'combat-drills', week: 9 },
                ],
                certifications: {
                  'bogus-cert': {
                    certificationId: 'bogus-cert',
                    state: 'certified',
                  },
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.progression?.trainingHistory).toEqual([])
      expect(hydrated.agents[agentId]?.progression?.certifications).toEqual({})
    })

    it('484 validates equipment catalog, traits, abilities, and abilityState on normalizeAgent', () => {
      const agent = createAgent({
        id: 'a_equip',
        name: 'E. Quip',
        role: 'tech',
        baseStats: { combat: 30, investigation: 60, utility: 55, social: 25 },
        equipment: { 'unknown-item': 2, medkits: 1 },
        equipmentSlots: { primary: 'unknown-item', utility1: 'medkits' },
        traits: [{ id: 't1', label: 'Calm', modifiers: { bogus: 1, combat: 2 } }],
        abilities: [
          {
            id: 'active-1',
            label: 'Pulse',
            type: 'active',
            trigger: 'OnCaseStart',
            cooldown: 1,
            effect: { utility: 1 },
          },
        ],
        abilityState: {
          'active-1': { cooldownRemaining: 1 },
          stale: { cooldownRemaining: 3 },
        },
        tags: ['tech'],
        relationships: {},
        fatigue: 0,
        status: 'active',
      })

      const normalized = normalizeAgent(agent)

      expect(normalized.equipment).toEqual({ medkits: 1 })
      expect(normalized.equipmentSlots).toEqual({ utility1: 'medkits' })
      expect(normalized.equipment['unknown-item']).toBeUndefined()
      expect(normalized.equipmentSlots.primary).toBeUndefined()
      expect(normalized.traits[0]?.modifiers).toEqual({ combat: 2 })
      expect(normalized.abilityState).toEqual({
        'active-1': { cooldownRemaining: 1 },
      })
    })

    it('485 sanitizes knowledge map keys, tiers, weeks, and entity refs', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const subjectId = 'anomaly-9'

      const sanitized = sanitizeKnowledgeStateMap(
        {
          'wrong-key': {
            tier: 'confirmed',
            entityId: teamId,
            subjectId,
            subjectType: 'anomaly',
            lastConfirmedWeek: 99,
          },
          bogus: {
            tier: 'explosive',
            entityId: '',
            subjectId: 'x',
          },
        },
        fallback.knowledge,
        { campaignWeek: 5, knownTeamIds: new Set([teamId]) }
      )

      const key = getKnowledgeKey(teamId, subjectId)
      expect(sanitized[key]).toMatchObject({
        tier: 'confirmed',
        entityId: teamId,
        subjectId,
        lastConfirmedWeek: 5,
      })
      expect(sanitized.bogus).toBeUndefined()
      expect(sanitized['wrong-key']).toBeUndefined()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          knowledge: {
            [key]: {
              tier: 'partial',
              entityId: teamId,
              subjectId,
              subjectType: 'anomaly',
              lastDecayedWeek: 12,
            },
          },
        },
        fallback
      )

      expect(hydrated.knowledge[key]?.lastDecayedWeek).toBe(5)
    })
  })

  describe('hydration problems 486-493', () => {
    const hydrateReports = (fallback: ReturnType<typeof createStartingState>, notes: unknown[]) =>
      hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 10,
          reports: [
            {
              week: 4,
              rngStateBefore: 1,
              rngStateAfter: 2,
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
              notes,
            },
          ],
        },
        fallback
      )

    it('486 clears gameOverReason when gameOver is false and allowlists terminal reasons', () => {
      const fallback = createStartingState()

      const cleared = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          gameOver: false,
          gameOverReason: 'Custom stale reason',
        },
        fallback
      )

      expect(cleared.gameOver).toBe(false)
      expect(cleared.gameOverReason).toBeUndefined()

      const bounded = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          gameOver: true,
          gameOverReason: 'not a canonical reason',
        },
        fallback
      )

      expect(bounded.gameOver).toBe(true)
      expect(bounded.gameOverReason).toBe(GAME_OVER_REASONS.breachState)

      const valid = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          gameOver: true,
          gameOverReason: GAME_OVER_REASONS.capExceeded,
        },
        fallback
      )

      expect(valid.gameOverReason).toBe(GAME_OVER_REASONS.capExceeded)
    })

    it('487 reconciles directive selectedId with campaign-week history', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          directiveState: {
            selectedId: 'bogus-directive' as 'intel-surge',
            history: [
              { week: 9, directiveId: 'intel-surge' },
              { week: 3, directiveId: 'recovery-rotation' },
              { week: 3, directiveId: 'procurement-push' },
              { week: 5, directiveId: 'lockdown-protocol' },
            ],
          },
        },
        fallback
      )

      expect(hydrated.directiveState.history).toEqual([
        { week: 3, directiveId: 'procurement-push' },
        { week: 5, directiveId: 'lockdown-protocol' },
      ])
      expect(hydrated.directiveState.selectedId).toBe('lockdown-protocol')
    })

    it('488 dedupes report note ids and rejects non-finite timestamps', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        {
          id: 'note-dup',
          content: 'First',
          timestamp: buildReportNoteTimestamp(4, 0),
        },
        {
          id: 'note-dup',
          content: 'Second',
          timestamp: Number.POSITIVE_INFINITY,
        },
        {
          id: 'note-blank',
          content: '   ',
          timestamp: buildReportNoteTimestamp(4, 2),
        },
      ])

      expect(hydrated.reports[0]?.notes).toEqual([
        {
          id: 'note-dup',
          content: 'First',
          timestamp: buildReportNoteTimestamp(4, 0),
        },
        {
          id: 'note-dup-dup-2',
          content: 'Second',
          timestamp: buildReportNoteTimestamp(4, 1),
        },
      ])
    })

    it('489 drops non-finite metadata numbers in typed report notes', () => {
      const fallback = createStartingState()
      const hydrated = hydrateReports(fallback, [
        {
          id: 'note-meta-finite',
          content: 'Market fallout.',
          timestamp: buildReportNoteTimestamp(4, 0),
          type: 'market.shifted',
          metadata: {
            costMultiplier: Number.NaN,
            pressure: 'stable',
            featuredRecipeId: 'med-kits',
            rogue: [1, Number.POSITIVE_INFINITY, 2],
          },
        },
      ])

      expect(hydrated.reports[0]?.notes[0]?.metadata).toEqual({
        pressure: 'stable',
        featuredRecipeId: 'med-kits',
      })
    })

    it('490 clamps operation event payload weeks to the campaign week', () => {
      const fallback = createStartingState()
      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 4,
          events: [
            {
              id: 'evt-future-week',
              type: 'market.shifted',
              timestamp: buildOperationEventTimestamp(9, 1),
              payload: {
                week: 9,
                featuredRecipeId: 'med-kits',
                pressure: 'stable',
                costMultiplier: 1,
              },
            },
            {
              id: 'evt-future-market-week',
              type: 'market.transaction_recorded',
              timestamp: buildOperationEventTimestamp(9, 2),
              payload: {
                week: 4,
                marketWeek: 8,
                transactionId: 'txn-1',
                action: 'buy',
                listingId: 'listing-1',
                itemId: 'med-kits',
                itemName: 'Med kits',
                category: 'material',
                quantity: 1,
                bundleCount: 1,
                unitPrice: 5,
                totalPrice: 5,
                remainingAvailability: 0,
              },
            },
          ],
        },
        fallback
      )

      expect(hydrated.events[0]?.timestamp).toBe(buildOperationEventTimestamp(4, 1))
      if (hydrated.events[0]?.type === 'market.shifted') {
        expect(hydrated.events[0].payload.week).toBe(4)
      }
      if (hydrated.events[1]?.type === 'market.transaction_recorded') {
        expect(hydrated.events[1].payload.week).toBe(4)
        expect(hydrated.events[1].payload.marketWeek).toBe(4)
      }
    })

    it('491 preserves stale event entity ids with trimmed labels', () => {
      const fallback = createStartingState()
      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          events: [
            {
              id: 'evt-stale-case',
              type: 'case.resolved',
              timestamp: buildOperationEventTimestamp(3, 1),
              payload: {
                week: 3,
                caseId: '  case-archived  ',
                caseTitle: '  Archived Case  ',
                mode: 'threshold',
                kind: 'case',
                stage: 2,
                teamIds: ['t_missing'],
              },
            },
          ],
        },
        fallback
      )

      expect(hydrated.events).toHaveLength(1)
      if (hydrated.events[0]?.type === 'case.resolved') {
        expect(hydrated.events[0].payload.caseId).toBe('case-archived')
        expect(hydrated.events[0].payload.caseTitle).toBe('Archived Case')
        expect(hydrated.events[0].payload.teamIds).toEqual(['t_missing'])
      }
    })

    it('492 strips unknown snapshot extensions and sanitizes optional fields', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
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
              caseSnapshots: {
                'case-archived': {
                  caseId: 'case-archived',
                  title: 'Archived Case',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'resolved',
                  stage: 2,
                  deadlineRemaining: 0,
                  durationWeeks: 2,
                  assignedTeamIds: [],
                  legacyExtension: 'drop-me',
                  performanceSummary: {
                    contribution: Number.NaN,
                    threatHandled: 4,
                    damageTaken: 0,
                    healingPerformed: 0,
                    evidenceGathered: 0,
                    containmentActionsCompleted: 0,
                  },
                  distortion: ['misleading', 'bogus'],
                  revealExplanation: '  still uncertain  ',
                },
              },
              notes: [],
            },
          ],
        },
        fallback
      )

      const snapshot = hydrated.reports[0]?.caseSnapshots?.['case-archived']

      expect(snapshot).toBeDefined()
      expect(snapshot).not.toHaveProperty('legacyExtension')
      expect(snapshot?.performanceSummary).toEqual({
        contribution: 0,
        threatHandled: 4,
        damageTaken: 0,
        healingPerformed: 0,
        evidenceGathered: 0,
        containmentActionsCompleted: 0,
      })
      expect(snapshot?.distortion).toEqual(['misleading'])
      expect(snapshot?.revealExplanation).toBe('still uncertain')
    })

    it('493 repairs candidate availability chronology and expired availability', () => {
      const fallback = createStartingState()
      const agent = buildAgentCandidate({
        id: 'cand-chrono',
        hireStatus: 'available',
        expiryWeek: 2,
        availabilityWindow: { opensWeek: 8, closesWeek: 3 },
        createdWeek: 7,
        lastUpdatedWeek: 2,
      })

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          candidates: [agent],
        },
        fallback
      )

      const candidate = hydrated.candidates.find((entry) => entry.id === 'cand-chrono')

      expect(candidate).toMatchObject({
        hireStatus: 'expired',
        expiryWeek: 6,
        availabilityWindow: { opensWeek: 6, closesWeek: 6 },
        createdWeek: 6,
        lastUpdatedWeek: 6,
      })
    })
  })

  describe('hydration allowlist drift guards (501-502)', () => {
    it('501 keeps OPERATION_EVENT_TYPES aligned with operationEventPayloadSchemas + legacy faction.activity', () => {
      const schemaTypes = Object.keys(operationEventPayloadSchemas).sort() as OperationEventType[]
      const hydrationTypes = [...OPERATION_EVENT_TYPES]
        .filter((type) => type !== 'faction.activity')
        .sort()

      expect(hydrationTypes).toEqual(schemaTypes)
      expect(OPERATION_EVENT_TYPES).toContain('case.aggregate_battle')
      expect(OPERATION_EVENT_TYPES).toContain('agent.killed')
      expect(OPERATION_EVENT_TYPES).toContain('agency.front_business.opened')
      expect(OPERATION_EVENT_TYPES).toContain('staff.coping.applied')
      expect(OPERATION_EVENT_TYPES).toContain('system.equipment_recovered')
    })

    it('502 keeps REPORT_NOTE_TYPES aligned with ReportNoteType audit registry', () => {
      const auditTypes = Object.keys(REPORT_NOTE_TYPE_AUDIT).sort() as ReportNoteType[]
      const hydrationTypes = [...REPORT_NOTE_TYPES].sort()

      expect(hydrationTypes).toEqual(auditTypes)
      expect(REPORT_NOTE_TYPES).toContain('case.aggregate_battle')
      expect(REPORT_NOTE_TYPES).toContain('system.equipment_recovered')
    })
  })

  describe('hydration problems 495-502', () => {
    function makeHydrationTeam(
      id: string,
      overrides: Partial<import('../../domain/models').Team> = {}
    ) {
      const fallback = createStartingState()
      const seed = fallback.teams['t_nightwatch']!

      return {
        ...seed,
        id,
        name: overrides.name ?? id,
        memberIds: overrides.memberIds ?? seed.memberIds,
        agentIds: overrides.agentIds ?? seed.agentIds,
        leaderId: overrides.leaderId ?? seed.leaderId,
        tags: overrides.tags ?? [],
        ...overrides,
      }
    }

    it('495 strips team drill fields on agent scope and keeps drillGroupId when registered', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const leaderAgentId = agentId
      const memberAgentId = Object.keys(fallback.agents)[1] ?? agentId
      const teamId = 't_scope_refs'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        teams: {
          [teamId]: makeHydrationTeam(teamId, {
            memberIds: [leaderAgentId, memberAgentId],
            agentIds: [leaderAgentId, memberAgentId],
            leaderId: leaderAgentId,
          }),
        },
        trainingQueue: [
          {
            id: 'agent-scope-stale',
            trainingId: 'combat-drills',
            scope: 'agent',
            agentId,
            teamId,
            teamName: 'stale',
            memberIds: [agentId, 'a_missing'],
            drillGroupId: 'orphan-group',
            remainingWeeks: 1,
            durationWeeks: 2,
          },
          {
            id: 'team-drill-1',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId: leaderAgentId,
            teamId,
            memberIds: [leaderAgentId, memberAgentId],
            drillGroupId: 'drill-group-registered',
            remainingWeeks: 1,
            durationWeeks: 2,
          },
          {
            id: 'team-drill-2',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId: memberAgentId,
            teamId,
            memberIds: [leaderAgentId, memberAgentId],
            drillGroupId: 'drill-group-registered',
            remainingWeeks: 1,
            durationWeeks: 2,
          },
          {
            id: 'team-drill-orphan-group',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId: leaderAgentId,
            teamId,
            memberIds: [leaderAgentId, memberAgentId],
            drillGroupId: 'drill-group-unregistered',
            remainingWeeks: 1,
            durationWeeks: 2,
          },
        ],
      })

      const agentEntry = hydrated.trainingQueue.find((entry) => entry.id === 'agent-scope-stale')
      const groupedEntry = hydrated.trainingQueue.find((entry) => entry.id === 'team-drill-1')
      const orphanGroupEntry = hydrated.trainingQueue.find(
        (entry) => entry.id === 'team-drill-orphan-group'
      )

      expect(agentEntry).toMatchObject({
        scope: 'agent',
        agentId,
      })
      expect(agentEntry).not.toHaveProperty('teamId')
      expect(agentEntry).not.toHaveProperty('teamName')
      expect(agentEntry).not.toHaveProperty('memberIds')
      expect(agentEntry).not.toHaveProperty('drillGroupId')

      expect(groupedEntry).toMatchObject({
        scope: 'team',
        drillGroupId: 'drill-group-registered',
        memberIds: [leaderAgentId, memberAgentId],
      })
      expect(orphanGroupEntry?.drillGroupId).toBeUndefined()
    })

    it('496 caps training startedWeek and clamps remainingWeeks to durationWeeks', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        trainingQueue: [
          {
            id: 'training-timing',
            trainingId: 'combat-drills',
            scope: 'agent',
            agentId,
            startedWeek: 99,
            durationWeeks: 3,
            remainingWeeks: 9,
          },
        ],
      })

      expect(hydrated.trainingQueue[0]).toMatchObject({
        startedWeek: 5,
        durationWeeks: 3,
        remainingWeeks: 3,
      })
    })

    it('497 drops unknown production recipes including in-flight entries', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'q-phantom-queued',
            recipeId: 'phantom-recipe',
            outputItemId: 'ward_seals',
            startedWeek: 1,
            durationWeeks: 2,
            remainingWeeks: 2,
            fundingCost: 0,
          },
          {
            id: 'q-phantom-in-flight',
            recipeId: 'phantom-recipe',
            outputItemId: 'ward_seals',
            startedWeek: 1,
            durationWeeks: 4,
            remainingWeeks: 2,
            fundingCost: 0,
          },
          {
            id: 'q-valid',
            recipeId: 'ward-seals',
            outputItemId: recipe.outputItemId,
            startedWeek: 1,
            durationWeeks: recipe.durationWeeks,
            remainingWeeks: recipe.durationWeeks,
            fundingCost: recipe.baseFundingCost,
          },
        ],
      })

      expect(hydrated.productionQueue.map((entry) => entry.id)).toEqual(['q-valid'])
    })

    it('498 persists recipe inputMaterials and strips unknown material rows', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'q-materials',
            recipeId: 'ward-seals',
            outputItemId: recipe.outputItemId,
            startedWeek: 1,
            durationWeeks: recipe.durationWeeks,
            remainingWeeks: recipe.durationWeeks,
            fundingCost: recipe.baseFundingCost,
            inputMaterials: [
              { materialId: 'bogus_material', materialName: 'Bogus', quantity: 9 },
              {
                materialId: recipe.inputMaterials
                  ? Object.keys(recipe.inputMaterials)[0]!
                  : 'warding_resin',
                materialName: 'tampered',
                quantity: 1,
              },
            ],
          },
        ],
      })

      expect(hydrated.productionQueue[0]?.inputMaterials).toEqual(getRecipeInputMaterials(recipe))
      expect(
        hydrated.productionQueue[0]?.inputMaterials?.some(
          (material) => material.materialId === 'bogus_material'
        )
      ).toBe(false)
    })

    it('499 caps production startedWeek and clamps remainingWeeks to durationWeeks', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 7,
        productionQueue: [
          {
            id: 'production-timing',
            recipeId: 'ward-seals',
            outputItemId: recipe.outputItemId,
            startedWeek: 40,
            durationWeeks: 2,
            remainingWeeks: 8,
            fundingCost: recipe.baseFundingCost,
          },
        ],
      })

      expect(hydrated.productionQueue[0]).toMatchObject({
        startedWeek: 7,
        durationWeeks: 2,
        remainingWeeks: 2,
      })
    })

    it('500 sanitizes teams before provisional case hydration', () => {
      const fallback = createStartingState()
      const leaderAgentId = Object.keys(fallback.agents)[0]!
      const teamId = 't_provisional_sanitize'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        teams: {
          [teamId]: {
            ...makeHydrationTeam(teamId),
            memberIds: [leaderAgentId, 'agent-missing'],
            agentIds: [leaderAgentId, 'agent-missing'],
            leaderId: leaderAgentId,
          },
        },
        cases: {
          'case-provisional-team': {
            ...fallback.cases['case-001']!,
            id: 'case-provisional-team',
            title: 'case-provisional-team',
            assignedTeamIds: [teamId],
            status: 'active',
          },
        },
      })

      expect(hydrated.teams[teamId]?.memberIds).toEqual([leaderAgentId])
      expect(hydrated.cases['case-provisional-team']?.assignedTeamIds).toEqual([teamId])
    })

    it('501 hydrates case.aggregate_battle and agent.killed operation events', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        events: [
          {
            id: 'evt-battle',
            type: 'case.aggregate_battle',
            timestamp: buildOperationEventTimestamp(4, 0),
            payload: {
              week: 4,
              caseId: 'case-battle',
              caseTitle: 'Battle Case',
              mode: 'threshold',
              kind: 'case',
              battleId: 'battle-1',
              roundsResolved: 2,
              winnerSideId: null,
              winnerLabel: null,
              friendlyLabel: 'Alpha',
              hostileLabel: 'Hostiles',
              movementDeniedCount: 0,
              friendlyRoutedCount: 0,
              hostileRoutedCount: 1,
              friendlyRoutedUnits: [],
              hostileRoutedUnits: ['unit-a'],
              specialDamageCount: 0,
              specialDamage: [],
            },
          },
          {
            id: 'evt-killed',
            type: 'agent.killed',
            timestamp: buildOperationEventTimestamp(4, 1),
            payload: {
              week: 4,
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Agent',
              caseId: 'case-battle',
              caseTitle: 'Battle Case',
            },
          },
        ],
      })

      expect(hydrated.events.map((event) => event.type)).toEqual([
        'case.aggregate_battle',
        'agent.killed',
      ])
    })

    it('502 preserves typed infiltration and equipment report notes', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        reports: [
          {
            week: 3,
            rngStateBefore: 1,
            rngStateAfter: 2,
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
                id: 'note-infiltration',
                content: 'Cover strain.',
                timestamp: buildReportNoteTimestamp(3, 0),
                type: 'infiltration.cover_strain',
              },
              {
                id: 'note-equipment',
                content: 'Recovered gear.',
                timestamp: buildReportNoteTimestamp(3, 1),
                type: 'system.equipment_recovered',
              },
              {
                id: 'note-unknown',
                content: 'Unknown type.',
                timestamp: buildReportNoteTimestamp(3, 2),
                type: 'not.a.real.note.type',
              },
            ],
          },
        ],
      })

      const types = hydrated.reports[0]?.notes.map((note) => note.type)

      expect(types).toEqual(['infiltration.cover_strain', 'system.equipment_recovered', undefined])
    })
  })

  describe('hydration problems 503-510', () => {
    it('503 trims case id buckets, dedupes entries, and keeps one bucket per case', () => {
      const fallback = createStartingState()
      const liveCaseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
            newCases: [`  ${liveCaseId}  `, liveCaseId, 'case-archived'],
            progressedCases: [liveCaseId, 'case-archived'],
            resolvedCases: ['case-archived', liveCaseId],
            failedCases: [liveCaseId],
            partialCases: [],
            unresolvedTriggers: [],
            spawnedCases: [],
            maxStage: 0,
            avgFatigue: 0,
            teamStatus: [],
            caseSnapshots: {
              'case-archived': {
                caseId: 'case-archived',
                title: 'Archived Case',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 1,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
            },
            notes: [],
          },
        ],
      })

      const report = hydrated.reports[0]
      expect(report?.newCases).toEqual([])
      expect(report?.progressedCases).toEqual([])
      expect(report?.failedCases).toEqual([])
      expect(report?.resolvedCases).toEqual(['case-archived', liveCaseId])
    })

    it('504 preserves aligned report dates and recomputes drifted calendar fields', () => {
      const fallback = createStartingState()
      const calendarConfig = resolveCalendarConfig(fallback.config)
      const canonical = getCampaignDate(3, calendarConfig)

      const hydratedPreserve = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        reports: [
          {
            week: 3,
            rngStateBefore: 1,
            rngStateAfter: 2,
            date: canonical,
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
            notes: [],
          },
        ],
      })

      expect(hydratedPreserve.reports[0]?.date).toEqual(canonical)

      const hydratedRecompute = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        reports: [
          {
            week: 3,
            rngStateBefore: 1,
            rngStateAfter: 2,
            date: {
              absoluteWeek: 99,
              year: 1,
              weekOfYear: 1,
              season: 'spring',
            },
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
            notes: [],
          },
        ],
      })

      expect(hydratedRecompute.reports[0]?.date).toEqual(canonical)
      expect(hydratedRecompute.reports[0]?.date?.absoluteWeek).toBe(3)
    })

    it('505 dedupes teamStatus by teamId and keeps snapshot-only assigned cases', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
            newCases: [],
            progressedCases: [],
            resolvedCases: [],
            failedCases: [],
            partialCases: [],
            unresolvedTriggers: [],
            spawnedCases: [],
            maxStage: 0,
            avgFatigue: 0,
            teamStatus: [
              {
                teamId: 't_retired',
                teamName: 'First',
                assignedCaseId: 'case-snapshot-only',
                avgFatigue: 10,
                fatigueBand: 'critical',
              },
              {
                teamId: 't_retired',
                teamName: 'Second',
                assignedCaseId: 'case-missing',
                avgFatigue: 44,
                fatigueBand: 'steady',
              },
            ],
            caseSnapshots: {
              'case-snapshot-only': {
                caseId: 'case-snapshot-only',
                title: 'Snapshot Case',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 1,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
            },
            notes: [],
          },
        ],
      })

      expect(hydrated.reports[0]?.teamStatus).toHaveLength(1)
      expect(hydrated.reports[0]?.teamStatus[0]).toMatchObject({
        teamId: 't_retired',
        teamName: 'First',
        assignedCaseId: 'case-snapshot-only',
        assignedCaseTitle: 'Snapshot Case',
        avgFatigue: 10,
        fatigueBand: 'steady',
      })
    })

    it('506 recomputes fatigueBand from avgFatigue via getFatigueBand thresholds', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
            newCases: [],
            progressedCases: [],
            resolvedCases: [],
            failedCases: [],
            partialCases: [],
            unresolvedTriggers: [],
            spawnedCases: [],
            maxStage: 0,
            avgFatigue: 0,
            teamStatus: [
              {
                teamId: 't_retired',
                avgFatigue: 44,
                fatigueBand: 'steady',
              },
            ],
            notes: [],
          },
        ],
      })

      expect(hydrated.reports[0]?.teamStatus[0]?.fatigueBand).toBe('strained')
    })

    it('507 caps sanitizeGameConfig tuning scalars to finite upper bounds', () => {
      const fallback = createStartingState()

      const sanitized = sanitizeGameConfig(
        {
          maxActiveCases: 999,
          trainingSlots: 999,
          partialMargin: 999,
          stageScalar: 999,
          attritionPerWeek: 999,
          probabilityK: 999,
          weeksPerYear: 999,
          fundingBasePerWeek: 9_999_999,
          containmentDeltaPerFail: -9_999,
        },
        fallback.config
      )

      expect(sanitized.maxActiveCases).toBe(50)
      expect(sanitized.trainingSlots).toBe(32)
      expect(sanitized.partialMargin).toBeLessThanOrEqual(100)
      expect(sanitized.partialMargin).toBeGreaterThan(0)
      expect(sanitized.stageScalar).toBe(10)
      expect(sanitized.attritionPerWeek).toBe(fallback.config.attritionPerWeek)
      expect(sanitized.probabilityK).toBe(20)
      expect(sanitized.weeksPerYear).toBe(104)
      expect(sanitized.fundingBasePerWeek).toBe(1_000_000)
      expect(sanitized.containmentDeltaPerFail).toBe(-1000)
    })

    it('507b preserves precision for bounded simulation scalars during hydration', () => {
      const fallback = createStartingState()
      const [agentAId, agentBId] = Object.keys(fallback.agents)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        config: {
          ...fallback.config,
          stageScalar: 0.123456,
          probabilityK: 0.987654,
          raidCoordinationPenaltyPerExtraTeam: 0.333333,
        },
        facilityState: {
          facilities: {
            precision_lab: {
              facilityId: 'precision_lab',
              category: 'research_lab',
              level: 1,
              maxLevel: 3,
              status: 'active',
              effects: {
                researchSpeedMultiplier: 1.234567,
                dataPoolPerWeek: 2.345678,
              },
            },
          },
        },
        relationshipHistory: [
          {
            week: 6,
            agentAId,
            agentBId,
            value: 0.123456,
            trustDamage: 0.234567,
            modifiers: ['precision'],
            reason: 'passive_drift',
          },
        ],
        hubState: {
          districtKey: 'central_hub',
          factionPresence: { institutions: 12.345678 },
          opportunities: [
            {
              id: 'opp-precision',
              label: 'Precision lead',
              detail: 'Precision detail',
              factionId: 'institutions',
              confidence: 0.345678,
            },
          ],
          rumors: [
            {
              id: 'rumor-precision',
              label: 'Precision rumor',
              detail: 'Precision rumor detail',
              confidence: 0.456789,
            },
          ],
        },
      })

      expect(hydrated.config.stageScalar).toBe(0.123456)
      expect(hydrated.config.probabilityK).toBe(0.987654)
      expect(hydrated.config.raidCoordinationPenaltyPerExtraTeam).toBe(0.333333)
      expect(hydrated.facilityState?.facilities.precision_lab?.effects).toMatchObject({
        researchSpeedMultiplier: 1.234567,
        dataPoolPerWeek: 2.345678,
      })
      expect(hydrated.relationshipHistory?.[0]).toMatchObject({
        value: 0.123456,
        trustDamage: 0.234567,
      })
      expect(hydrated.hubState?.factionPresence.institutions).toBe(12.345678)
      expect(hydrated.hubState?.opportunities[0]?.confidence).toBe(0.345678)
      expect(hydrated.hubState?.rumors[0]?.confidence).toBe(0.456789)
    })

    it('508 normalizes relationship_changed and agent.betrayed numeric fields without NaN', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-relationship-raw',
            type: 'agent.relationship_changed',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Agent',
              counterpartId: Object.keys(fallback.agents)[1] ?? Object.keys(fallback.agents)[0]!,
              counterpartName: 'Counterpart',
              previousValue: '0.5',
              nextValue: Number.POSITIVE_INFINITY,
              delta: {},
              reason: 'passive_drift',
            },
          },
          {
            id: 'evt-betrayal-raw',
            type: 'agent.betrayed',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              betrayerId: Object.keys(fallback.agents)[0]!,
              betrayerName: 'Agent',
              betrayedId: Object.keys(fallback.agents)[1] ?? Object.keys(fallback.agents)[0]!,
              betrayedName: 'Counterpart',
              trustDamageDelta: 'bad',
              trustDamageTotal: Number.NaN,
              triggeredConsequences: [],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        previousValue: 0.5,
        nextValue: 0,
        delta: -0.5,
      })
      expect(hydrated.events[1]?.payload).toMatchObject({
        trustDamageDelta: 0,
        trustDamageTotal: 0,
      })
      expect(hydrated.events.every((event) => !JSON.stringify(event).includes('NaN'))).toBe(true)
    })

    it('508b clamps legacy relationship_changed values to -2..2 and recomputes delta', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-relationship-legacy-wide-scale',
            type: 'agent.relationship_changed',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Agent',
              counterpartId: 'a_stale_counterpart',
              counterpartName: 'Retired',
              previousValue: 5,
              nextValue: -3,
              delta: 999,
              reason: 'passive_drift',
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        previousValue: 2,
        nextValue: -2,
        delta: -4,
      })
    })

    it('509 enforces non-decreasing case stage transitions and raid conversion consistency', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-partial-inverted',
            type: 'case.partially_resolved',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Case 001',
              mode: 'threshold',
              kind: 'case',
              fromStage: 4,
              toStage: 1,
              teamIds: [],
            },
          },
          {
            id: 'evt-escalated-flat',
            type: 'case.escalated',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Case 001',
              fromStage: 2,
              toStage: 1,
              trigger: 'deadline',
              deadlineRemaining: 1,
              convertedToRaid: true,
            },
          },
          {
            id: 'evt-raid-bounds',
            type: 'case.raid_converted',
            timestamp: buildOperationEventTimestamp(2, 2),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Case 001',
              stage: 2,
              trigger: 'deadline',
              minTeams: 4,
              maxTeams: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ fromStage: 4, toStage: 4 })
      expect(hydrated.events[1]?.payload).toMatchObject({
        fromStage: 2,
        toStage: 2,
        convertedToRaid: false,
      })
      expect(hydrated.events[2]?.payload).toMatchObject({ minTeams: 4, maxTeams: 4 })
    })

    it('510 persists production event inputMaterials from recipe and strips unknown rows', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-production-started',
            type: 'production.queue_started',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              queueId: 'q-1',
              queueName: 'Queue',
              recipeId: 'ward-seals',
              outputId: recipe.outputItemId,
              outputName: 'Output',
              outputQuantity: 1,
              etaWeeks: 2,
              fundingCost: recipe.baseFundingCost,
              inputMaterials: [
                { materialId: 'bogus_material', materialName: 'Bogus', quantity: 9 },
              ],
            },
          },
          {
            id: 'evt-production-completed',
            type: 'production.queue_completed',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              queueId: 'q-1',
              queueName: 'Queue',
              recipeId: 'ward-seals',
              outputId: recipe.outputItemId,
              outputName: 'Output',
              outputQuantity: 1,
              fundingCost: recipe.baseFundingCost,
              inputMaterials: [],
            },
          },
        ],
      })

      const expectedMaterials = getRecipeInputMaterials(recipe)

      expect(hydrated.events[0]?.payload).toMatchObject({
        inputMaterials: expectedMaterials,
      })
      expect(hydrated.events[1]?.payload).toMatchObject({
        inputMaterials: expectedMaterials,
      })
      expect(
        hydrated.events[0]?.payload.inputMaterials?.some(
          (material) => material.materialId === 'bogus_material'
        )
      ).toBe(false)
    })

    it('SPE-2659 reconciles production queue numerics and preserves scaled fundingCost', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!
      const scaledFundingCost = recipe.baseFundingCost * 3

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-production-started-2659',
            type: 'production.queue_started',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              queueId: 'q-2659',
              queueName: 'Queue',
              recipeId: 'ward-seals',
              outputId: 'stale-output',
              outputName: 'Stale Output',
              outputQuantity: -2.7,
              etaWeeks: 0,
              fundingCost: scaledFundingCost,
              inputMaterials: [],
            },
          },
          {
            id: 'evt-production-completed-2659',
            type: 'production.queue_completed',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              queueId: 'q-2659',
              queueName: 'Queue',
              recipeId: 'ward-seals',
              outputId: 'stale-output',
              outputName: 'Stale Output',
              outputQuantity: Number.NaN,
              fundingCost: scaledFundingCost,
              inputMaterials: [],
            },
          },
        ],
      })

      expect(hydrated.events).toHaveLength(2)
      expect(hydrated.events[0]?.payload).toMatchObject({
        recipeId: 'ward-seals',
        outputId: recipe.outputItemId,
        outputName: recipe.outputItemName,
        outputQuantity: 1,
        etaWeeks: 1,
        fundingCost: scaledFundingCost,
      })
      expect(hydrated.events[1]?.payload).toMatchObject({
        recipeId: 'ward-seals',
        outputId: recipe.outputItemId,
        outputName: recipe.outputItemName,
        outputQuantity: 1,
        fundingCost: scaledFundingCost,
      })
    })

    it('510b keeps only catalog-backed nonnegative integer material rows for legacy unknown-recipe production events', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-production-legacy-materials',
            type: 'production.queue_started',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              queueId: 'q-legacy',
              queueName: 'Legacy Queue',
              recipeId: 'legacy-recipe',
              outputId: 'ward_seals',
              outputName: 'Output',
              outputQuantity: 1,
              etaWeeks: 1,
              fundingCost: 0,
              inputMaterials: [
                { materialId: ' electronic_parts ', materialName: '   ', quantity: 0 },
                { materialId: 'medical_supplies', materialName: 'Medical Supplies', quantity: 1.5 },
                { materialId: 'occult_reagents', materialName: 'Occult Reagents', quantity: -1 },
                { materialId: 'mystery_powder', materialName: 'Mystery Powder', quantity: 1 },
                { materialId: '   ', materialName: 'Blank Id', quantity: 1 },
              ],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        recipeId: 'legacy-recipe',
        inputMaterials: [
          {
            materialId: 'electronic_parts',
            materialName: 'Electronic Parts',
            quantity: 0,
          },
        ],
      })
    })
  })

  describe('hydration problems 511-518', () => {
    it('511 preserves sanitized market.transaction_recorded allocation fields', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-511',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(3, 0),
            payload: {
              week: 3,
              marketWeek: 3,
              transactionId: 'market-3-1',
              action: 'buy',
              listingId: 'gear:combat_stims',
              itemId: 'combat_stims',
              itemName: 'Combat Stims',
              category: 'equipment',
              quantity: 1,
              bundleCount: 1,
              unitPrice: 12,
              totalPrice: 12,
              remainingAvailability: 4,
              listingResourceStatuses: [
                {
                  resourceClass: 'licensed_handling_capacity',
                  sourceId: 'licensed_handling_desk',
                  label: 'Licensed handling desk',
                  capacity: 1,
                  available: 0,
                  allocations: ['market-3-1'],
                },
              ],
              allocation: {
                allocationId: 'alloc-511',
                resourceClass: 'reagent_stock',
                source: 'broker_a',
                sourceLabel: 'Broker A',
                destinationUse: 'field_kit',
                destinationLabel: 'Field kit',
                urgency: 'contingency',
                expectedBenefit: 'stabilize supply',
                priority: 2,
                delayWeeks: 1,
                substitutionStatus: 'none',
              },
              allocations: [
                {
                  allocationId: 'alloc-511-b',
                  resourceClass: 'supplier_attention_slot',
                  source: 'broker_b',
                  sourceLabel: 'Broker B',
                  destinationUse: 'reserve',
                  destinationLabel: 'Reserve',
                  urgency: 'standard',
                  expectedBenefit: 'buffer',
                  priority: 1,
                  delayWeeks: 0,
                  substitutionStatus: 'degraded_substitute',
                  substitutionSummary: 'substitute lane',
                },
              ],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        listingResourceStatuses: [
          expect.objectContaining({
            resourceClass: 'licensed_handling_capacity',
            allocations: ['market-3-1'],
          }),
        ],
        allocation: expect.objectContaining({
          allocationId: 'alloc-511',
          resourceClass: 'reagent_stock',
        }),
        allocations: [
          expect.objectContaining({
            allocationId: 'alloc-511-b',
            substitutionStatus: 'degraded_substitute',
          }),
        ],
      })
    })

    it('511b bounds market transaction listing resource status capacities', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-511b',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(3, 0),
            payload: {
              week: 3,
              marketWeek: 3,
              transactionId: 'market-3-2',
              action: 'buy',
              listingId: 'gear:combat_stims',
              itemId: 'combat_stims',
              itemName: 'Combat Stims',
              category: 'equipment',
              quantity: 1,
              bundleCount: 1,
              unitPrice: 12,
              totalPrice: 12,
              remainingAvailability: 4,
              listingResourceStatuses: [
                {
                  resourceClass: 'licensed_handling_capacity',
                  sourceId: ' licensed_handling_desk ',
                  label: ' Licensed handling desk ',
                  capacity: -2,
                  available: -5,
                  allocations: [' alloc-a ', 'alloc-a', '', 42],
                },
                {
                  resourceClass: 'reagent_stock',
                  capacity: 2,
                  available: 9,
                  allocations: ['reagent-2', ' reagent-1 ', 'reagent-2'],
                },
                {
                  resourceClass: 'supplier_attention_slot',
                  capacity: 3.9,
                  available: 2.8,
                },
              ],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        listingResourceStatuses: [
          {
            resourceClass: 'licensed_handling_capacity',
            sourceId: 'licensed_handling_desk',
            label: 'Licensed handling desk',
            capacity: 0,
            available: 0,
            allocations: ['alloc-a'],
          },
          {
            resourceClass: 'reagent_stock',
            capacity: 2,
            available: 2,
            allocations: ['reagent-1', 'reagent-2'],
          },
          {
            resourceClass: 'supplier_attention_slot',
            capacity: 3,
            available: 2,
          },
        ],
      })
    })

    it('511c bounds market transaction procurement allocation priority and delay', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-511c',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(3, 0),
            payload: {
              week: 3,
              marketWeek: 3,
              transactionId: 'market-3-3',
              action: 'buy',
              listingId: 'gear:combat_stims',
              itemId: 'combat_stims',
              itemName: 'Combat Stims',
              category: 'equipment',
              quantity: 1,
              bundleCount: 1,
              unitPrice: 12,
              totalPrice: 12,
              remainingAvailability: 4,
              allocation: {
                allocationId: 'alloc-huge',
                resourceClass: 'reagent_stock',
                source: 'broker_a',
                sourceLabel: 'Broker A',
                destinationUse: 'field_kit',
                destinationLabel: 'Field kit',
                urgency: 'contingency',
                expectedBenefit: 'stabilize supply',
                priority: 9999,
                delayWeeks: 9999,
                substitutionStatus: 'none',
              },
              allocations: [
                {
                  allocationId: 'alloc-negative',
                  resourceClass: 'supplier_attention_slot',
                  source: 'broker_b',
                  sourceLabel: 'Broker B',
                  destinationUse: 'reserve',
                  destinationLabel: 'Reserve',
                  urgency: 'standard',
                  expectedBenefit: 'buffer',
                  priority: -5,
                  delayWeeks: -7,
                  substitutionStatus: 'none',
                },
                {
                  allocationId: 'alloc-malformed',
                  resourceClass: 'licensed_handling_capacity',
                  source: 'desk',
                  sourceLabel: 'Desk',
                  destinationUse: 'controlled_procurement',
                  destinationLabel: 'Controlled procurement',
                  urgency: 'standard',
                  expectedBenefit: 'compliance',
                  priority: 'urgent',
                  delayWeeks: Number.NaN,
                  substitutionStatus: 'none',
                },
                {
                  allocationId: 'alloc-valid',
                  resourceClass: 'licensed_handling_capacity',
                  source: 'desk',
                  sourceLabel: 'Desk',
                  destinationUse: 'controlled_procurement',
                  destinationLabel: 'Controlled procurement',
                  urgency: 'contingency',
                  expectedBenefit: 'compliance',
                  priority: 2,
                  delayWeeks: 1,
                  substitutionStatus: 'degraded_substitute',
                  substitutionSummary: 'substitute lane',
                },
              ],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        allocation: expect.objectContaining({
          allocationId: 'alloc-huge',
          priority: 10,
          delayWeeks: 52,
        }),
        allocations: [
          expect.objectContaining({
            allocationId: 'alloc-negative',
            priority: 0,
            delayWeeks: 0,
          }),
          expect.objectContaining({
            allocationId: 'alloc-malformed',
            priority: 0,
            delayWeeks: 0,
          }),
          expect.objectContaining({
            allocationId: 'alloc-valid',
            priority: 2,
            delayWeeks: 1,
            substitutionStatus: 'degraded_substitute',
          }),
        ],
      })
    })

    it('512 enforces positive quantity/bundle and reconciles totalPrice', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-512',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              marketWeek: 2,
              transactionId: 'market-2-512',
              action: 'buy',
              listingId: 'mat:binding_agent',
              itemId: 'binding_agent',
              itemName: 'Binding Agent',
              category: 'material',
              quantity: 0,
              bundleCount: 0,
              unitPrice: 5,
              totalPrice: 999,
              remainingAvailability: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        quantity: 1,
        bundleCount: 1,
        unitPrice: 5,
        totalPrice: 5,
      })
    })

    it('512 preserves producer multi-bundle totalPrice (unitPrice*quantity, not *bundleCount)', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-512-multi',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              marketWeek: 2,
              transactionId: 'market-2-512-multi',
              action: 'buy',
              listingId: 'mat:binding_agent',
              itemId: 'binding_agent',
              itemName: 'Binding Agent',
              category: 'material',
              quantity: 3,
              bundleCount: 3,
              unitPrice: 10,
              totalPrice: 30,
              remainingAvailability: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        quantity: 3,
        bundleCount: 3,
        unitPrice: 10,
        totalPrice: 30,
      })
    })

    it('512 preserves cent unitPrice totals within bundle drift', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-512-cents',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              marketWeek: 2,
              transactionId: 'market-2-512-cents',
              action: 'buy',
              listingId: 'mat:binding_agent',
              itemId: 'binding_agent',
              itemName: 'Binding Agent',
              category: 'material',
              quantity: 9,
              bundleCount: 3,
              unitPrice: 8.33,
              totalPrice: 75,
              remainingAvailability: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        quantity: 9,
        bundleCount: 3,
        unitPrice: 8.33,
        totalPrice: 75,
      })
    })

    it('512 rewrites overflowed unitPrice*quantity product to finite zero totalPrice', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-txn-512-overflow',
            type: 'market.transaction_recorded',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              marketWeek: 2,
              transactionId: 'market-2-512-overflow',
              action: 'buy',
              listingId: 'mat:binding_agent',
              itemId: 'binding_agent',
              itemName: 'Binding Agent',
              category: 'material',
              quantity: 2,
              bundleCount: 1,
              unitPrice: 1e307,
              totalPrice: 1e307,
              remainingAvailability: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        quantity: 2,
        bundleCount: 1,
        unitPrice: 1e307,
        totalPrice: 0,
      })
    })

    it('513 clamps emergency waiver accountability waiverGrantWeek below event week', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        events: [
          {
            id: 'evt-waiver-closed-513',
            type: 'market.emergency_gray_market_waiver_accountability_closed',
            timestamp: buildOperationEventTimestamp(5, 0),
            payload: {
              week: 5,
              waiverGrantWeek: 99,
              institutionKey: 'containment_protocol',
            },
          },
        ],
      })

      const payload = hydrated.events[0]?.payload as { waiverGrantWeek?: number; week?: number }

      expect(payload.waiverGrantWeek).toBeLessThan(payload.week ?? 0)
      expect(payload.waiverGrantWeek).toBeLessThanOrEqual(hydrated.week)
      expect(payload.waiverGrantWeek).toBe(4)
    })

    it('514-515 reconcile standing, reputation, and contact relationship deltas', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-standing-514',
            type: 'faction.standing_changed',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              factionId: 'faction-001',
              factionName: 'Faction',
              delta: 3,
              standingBefore: 4,
              standingAfter: 20,
              reputationBefore: 10,
              reputationAfter: Number.POSITIVE_INFINITY,
              contactRelationshipBefore: 20,
              contactRelationshipAfter: 5,
              contactDelta: 2,
              reason: 'case.resolved',
            },
          },
        ],
      })

      const payload = hydrated.events[0]?.payload as {
        standingBefore?: number
        standingAfter?: number
        delta?: number
        reputationBefore?: number
        reputationAfter?: number
        contactRelationshipBefore?: number
        contactRelationshipAfter?: number
        contactDelta?: number
      }

      expect(payload.standingAfter! - payload.standingBefore!).toBe(payload.delta)
      expect(payload.reputationBefore).toBe(10)
      expect(payload.reputationAfter).toBe(100)
      expect(Number.isFinite(payload.reputationAfter!)).toBe(true)
      expect(payload.contactRelationshipAfter! - payload.contactRelationshipBefore!).toBe(
        payload.contactDelta
      )
    })

    it('516 reconciles agency.containment_updated containment, funding, and clearance', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-containment-516',
            type: 'agency.containment_updated',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              containmentRatingBefore: 50,
              containmentRatingAfter: 70,
              containmentDelta: 99,
              clearanceLevelBefore: 2,
              clearanceLevelAfter: 5,
              fundingBefore: 1000,
              fundingAfter: 800,
              fundingDelta: -200,
            },
          },
        ],
      })

      const payload = hydrated.events[0]?.payload as {
        containmentRatingBefore?: number
        containmentRatingAfter?: number
        containmentDelta?: number
        clearanceLevelBefore?: number
        clearanceLevelAfter?: number
        fundingBefore?: number
        fundingAfter?: number
        fundingDelta?: number
      }

      expect(payload.containmentRatingAfter! - payload.containmentRatingBefore!).toBe(
        payload.containmentDelta
      )
      expect(payload.fundingAfter! - payload.fundingBefore!).toBe(payload.fundingDelta)
      expect(payload.clearanceLevelAfter! - payload.clearanceLevelBefore!).toBe(3)
    })

    it('517 enforces non-decreasing agent.promoted levels and matching levelsGained', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-promoted-517',
            type: 'agent.promoted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Agent',
              newRole: 'hunter',
              previousLevel: 4,
              newLevel: 2,
              levelsGained: 9,
            },
          },
        ],
      })

      const payload = hydrated.events[0]?.payload as {
        previousLevel?: number
        newLevel?: number
        levelsGained?: number
      }

      expect(payload.newLevel).toBeGreaterThanOrEqual(payload.previousLevel!)
      expect(payload.levelsGained).toBe(payload.newLevel! - payload.previousLevel!)
      expect(payload).toMatchObject({
        previousLevel: 4,
        newLevel: 4,
        levelsGained: 0,
      })
    })

    it('SPE-2652 trims agent.promoted newRole before role allowlist on hydrate', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-promoted-role-trim',
            type: 'agent.promoted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Agent',
              newRole: ' medic ',
              previousLevel: 2,
              newLevel: 3,
              levelsGained: 1,
              skillPointsGranted: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        newRole: 'medic',
        previousLevel: 2,
        newLevel: 3,
        levelsGained: 1,
        skillPointsGranted: 1,
      })
    })

    it('SPE-2654 reconciles agent.betrayed trust damage on hydrate', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-betrayed-2654',
            type: 'agent.betrayed',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              betrayerId: Object.keys(fallback.agents)[0]!,
              betrayerName: 'Agent',
              betrayedId: Object.keys(fallback.agents)[1] ?? 'a_counterpart',
              betrayedName: 'Counterpart',
              trustDamageDelta: -0.4,
              trustDamageTotal: 0.1,
              triggeredConsequences: ['benching'],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        trustDamageDelta: 0,
        trustDamageTotal: 0.1,
        triggeredConsequences: ['benching'],
      })
    })

    it('SPE-2654 lifts agent.betrayed trustDamageTotal to trustDamageDelta on hydrate', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-betrayed-total-2654',
            type: 'agent.betrayed',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              betrayerId: Object.keys(fallback.agents)[0]!,
              betrayerName: 'Agent',
              betrayedId: Object.keys(fallback.agents)[1] ?? 'a_counterpart',
              betrayedName: 'Counterpart',
              trustDamageDelta: 0.9,
              trustDamageTotal: 0.2,
              triggeredConsequences: [],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        trustDamageDelta: 0.9,
        trustDamageTotal: 0.9,
      })
    })

    it('518 sorts weekly reports, dedupes by week, and drops out-of-range weeks', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        reports: [
          {
            week: 99,
            rngStateBefore: 1,
            rngStateAfter: 2,
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
              { id: 'note-future', content: 'future', timestamp: buildReportNoteTimestamp(99, 0) },
            ],
          },
          {
            week: 2,
            rngStateBefore: 2,
            rngStateAfter: 3,
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
              { id: 'note-week-2-a', content: 'first', timestamp: buildReportNoteTimestamp(2, 0) },
            ],
          },
          {
            week: 4,
            rngStateBefore: 3,
            rngStateAfter: 4,
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
                id: 'note-week-4-a',
                content: 'week four a',
                timestamp: buildReportNoteTimestamp(4, 0),
              },
            ],
          },
          {
            week: 4,
            rngStateBefore: 4,
            rngStateAfter: 5,
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
                id: 'note-week-4-b',
                content: 'week four b',
                timestamp: buildReportNoteTimestamp(4, 1),
              },
            ],
          },
        ],
      })

      expect(hydrated.reports.map((report) => report.week)).toEqual([2, 4])
      expect(hydrated.reports[1]?.notes[0]?.id).toBe('note-week-4-b')
      expect(hydrated.reports.some((report) => report.week === 99)).toBe(false)
    })
  })

  describe('hydration problems 519-526', () => {
    const performanceSummary = {
      contribution: 3,
      threatHandled: 2,
      damageTaken: 1,
      healingPerformed: 0,
      evidenceGathered: 4,
      containmentActionsCompleted: 1,
    }

    const rewardBreakdown = {
      outcome: 'success' as const,
      caseType: 'general',
      caseTypeLabel: 'Operation',
      operationValue: 10,
      factors: [],
      fundingDelta: 5,
      containmentDelta: 0,
      strategicValueDelta: 0,
      reputationDelta: 0,
      inventoryRewards: [],
      factionStanding: [],
      label: 'Mission',
      reasons: [],
    }

    it('519 dedupes duplicate operation event ids (keeps first, regenerates later)', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-dup',
            type: 'market.shifted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              featuredRecipeId: 'med-kits',
              pressure: 'stable',
              costMultiplier: 1,
            },
          },
          {
            id: 'evt-dup',
            type: 'system.recruitment_generated',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: { week: 2, count: 1 },
          },
        ],
      })

      expect(hydrated.events.map((event) => event.id)).toEqual(['evt-dup', 'evt-dup-dup-2'])
      expect(hydrated.events.map((event) => event.type)).toEqual([
        'market.shifted',
        'system.recruitment_generated',
      ])
    })

    it('520 rebuilds mismatched timestamps from payload week and preserves aligned ISO', () => {
      const fallback = createStartingState()
      const mismatchedTimestamp = buildOperationEventTimestamp(9, 0)
      const alignedTimestamp = buildOperationEventTimestamp(3, 1)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        events: [
          {
            id: 'evt-ts-mismatch',
            type: 'market.shifted',
            timestamp: mismatchedTimestamp,
            payload: {
              week: 3,
              featuredRecipeId: 'med-kits',
              pressure: 'stable',
              costMultiplier: 1,
            },
          },
          {
            id: 'evt-ts-aligned',
            type: 'system.recruitment_generated',
            timestamp: alignedTimestamp,
            payload: { week: 3, count: 2 },
          },
        ],
      })

      expect(hydrated.events[0]?.timestamp).toBe(buildOperationEventTimestamp(3, 1))
      expect(hydrated.events[1]?.timestamp).toBe(alignedTimestamp)
    })

    it('521 preserves case outcome performanceSummary and rewardBreakdown on resolve paths', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        events: [
          {
            id: 'evt-resolved-521',
            type: 'case.resolved',
            timestamp: buildOperationEventTimestamp(4, 0),
            payload: {
              week: 4,
              caseId: 'case-001',
              caseTitle: 'Resolved',
              mode: 'threshold',
              kind: 'case',
              stage: 2,
              teamIds: [],
              performanceSummary,
              rewardBreakdown,
            },
          },
          {
            id: 'evt-partial-521',
            type: 'case.partially_resolved',
            timestamp: buildOperationEventTimestamp(4, 1),
            payload: {
              week: 4,
              caseId: 'case-001',
              caseTitle: 'Partial',
              mode: 'threshold',
              kind: 'case',
              fromStage: 1,
              toStage: 2,
              teamIds: [],
              performanceSummary,
              rewardBreakdown: { ...rewardBreakdown, outcome: 'partial' },
            },
          },
          {
            id: 'evt-failed-521',
            type: 'case.failed',
            timestamp: buildOperationEventTimestamp(4, 2),
            payload: {
              week: 4,
              caseId: 'case-001',
              caseTitle: 'Failed',
              mode: 'threshold',
              kind: 'case',
              fromStage: 2,
              toStage: 3,
              teamIds: [],
              performanceSummary,
              rewardBreakdown: { ...rewardBreakdown, outcome: 'fail' },
            },
          },
        ],
      })

      for (const event of hydrated.events) {
        expect(event.payload).toMatchObject({
          performanceSummary,
        })
        expect(event.payload).toHaveProperty('rewardBreakdown')
      }
    })

    it('522 preserves case.escalated neighborhoodPressureAuditTag and rewardBreakdown', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-escalated-522',
            type: 'case.escalated',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Escalated',
              fromStage: 1,
              toStage: 2,
              trigger: 'deadline',
              deadlineRemaining: 1,
              convertedToRaid: false,
              neighborhoodPressureAuditTag: 'district:alpha|band:high',
              rewardBreakdown: { ...rewardBreakdown, outcome: 'fail' },
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        neighborhoodPressureAuditTag: 'district:alpha|band:high',
        rewardBreakdown: expect.objectContaining({ fundingDelta: 5 }),
      })
    })

    it('523 preserves agent.hired source faction and contact fields', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-hired-523',
            type: 'agent.hired',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              candidateId: 'cand-523',
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Hiree',
              recruitCategory: 'agent',
              sourceFactionId: 'faction-source',
              sourceFactionName: 'Source Faction',
              sourceContactId: 'contact-523',
              sourceContactName: 'Broker Contact',
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        sourceFactionId: 'faction-source',
        sourceFactionName: 'Source Faction',
        sourceContactId: 'contact-523',
        sourceContactName: 'Broker Contact',
      })
    })

    it('524 hydrates agency.front_business opened and resolved events', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        events: [
          {
            id: 'evt-front-opened',
            type: 'agency.front_business.opened',
            timestamp: buildOperationEventTimestamp(3, 0),
            payload: {
              week: 3,
              kind: 'courierShell',
              startupCost: 25,
              fundingBefore: 200,
              fundingAfter: 175,
            },
          },
          {
            id: 'evt-front-resolved',
            type: 'agency.front_business.resolved',
            timestamp: buildOperationEventTimestamp(3, 1),
            payload: {
              week: 3,
              kind: 'courierShell',
              statusBefore: 'active',
              statusAfter: 'strained',
              fundingDelta: -10,
              riskScore: 2,
              lockoutCount: 0,
              residueCount: 1,
              budgetPressure: 1,
            },
          },
        ],
      })

      expect(hydrated.events.map((event) => event.type)).toEqual([
        'agency.front_business.opened',
        'agency.front_business.resolved',
      ])
      expect(hydrated.events[1]?.payload).toMatchObject({
        statusBefore: 'active',
        statusAfter: 'strained',
        residueCount: 1,
      })
    })

    it('525 hydrates staff coping and side work operation events', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-coping-applied',
            type: 'staff.coping.applied',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              agentId,
              streak: 2,
              policy: 'restricted',
            },
          },
          {
            id: 'evt-coping-misconduct',
            type: 'staff.coping.misconduct',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              agentId,
              policy: 'prohibited',
            },
          },
          {
            id: 'evt-side-work',
            type: 'staff.side_work.resolved',
            timestamp: buildOperationEventTimestamp(2, 2),
            payload: {
              week: 2,
              agentId,
              optionId: 'offBooksCourier',
              outcome: 'paid',
              fundingDelta: 8,
              fatigueDelta: -2,
            },
          },
        ],
      })

      expect(hydrated.events.map((event) => event.type)).toEqual([
        'staff.coping.applied',
        'staff.coping.misconduct',
        'staff.side_work.resolved',
      ])
      expect(hydrated.events[2]?.payload).toMatchObject({
        optionId: 'offBooksCourier',
        outcome: 'paid',
        fundingDelta: 8,
        fatigueDelta: -2,
      })
    })

    it('526 hydrates system.equipment_recovered operation events', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-equipment-recovered',
            type: 'system.equipment_recovered',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              content: 'Recovered damaged kit.',
              recovered: ['gear-a', 'gear-b'],
              delayed: ['gear-c'],
              maintenanceCapacity: 2,
              damagedCount: 3,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        content: 'Recovered damaged kit.',
        recovered: ['gear-a', 'gear-b'],
        delayed: ['gear-c'],
        maintenanceCapacity: 2,
        damagedCount: 3,
      })
    })
  })

  describe('hydration problems 527-534', () => {
    const infiltrationTypes = [
      'infiltration.awareness_complication',
      'infiltration.escalation_exposed',
      'infiltration.escalation_violent',
      'infiltration.cover_strain',
      'infiltration.weekly_encounter',
      'infiltration.leave_behind_tradeoff',
    ] as const

    it('527 hydrates all infiltration operation event types with trimmed identity fields', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        events: infiltrationTypes.map((type, index) => ({
          id: `evt-infiltration-${index}`,
          type,
          timestamp: buildOperationEventTimestamp(3, index),
          payload: {
            week: 3,
            caseId: 'case-infiltration',
            caseTitle: '  Covert Case  ',
            summary: '  Probe strain detected.  ',
            infiltrationAwareness: 150,
            infiltrationProbeProgress: -5,
            infiltrationStage: 'exposed',
            probeAction: 'probe_access',
            probeActionSource: 'authored',
            coverRole: 'courier',
            leaveBehindId: ' leave-behind ',
            leaveBehindLabel: ' Courier cache ',
          },
        })),
      })

      expect(hydrated.events.map((event) => event.type)).toEqual([...infiltrationTypes])
      for (const event of hydrated.events) {
        expect(event.payload).toMatchObject({
          caseId: 'case-infiltration',
          caseTitle: 'Covert Case',
          summary: 'Probe strain detected.',
          infiltrationAwareness: 1,
          infiltrationProbeProgress: 0,
          infiltrationStage: 'exposed',
          probeAction: 'probe_access',
          probeActionSource: 'authored',
          coverRole: 'courier',
          leaveBehindId: 'leave-behind',
          leaveBehindLabel: 'Courier cache',
        })
      }
    })

    it('527b migrates infiltration event awareness and progress to fractional scale', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        events: [
          {
            id: 'evt-infiltration-fraction',
            type: 'infiltration.awareness_complication',
            timestamp: buildOperationEventTimestamp(3, 0),
            payload: {
              week: 3,
              caseId: 'case-infiltration',
              caseTitle: 'Covert Case',
              summary: 'Fractional values.',
              infiltrationAwareness: 0.25,
              infiltrationProbeProgress: 1,
            },
          },
          {
            id: 'evt-infiltration-percent',
            type: 'infiltration.weekly_encounter',
            timestamp: buildOperationEventTimestamp(3, 1),
            payload: {
              week: 3,
              caseId: 'case-infiltration',
              caseTitle: 'Covert Case',
              summary: 'Legacy percent values.',
              infiltrationAwareness: 25,
              infiltrationProbeProgress: 100,
            },
          },
          {
            id: 'evt-infiltration-negative',
            type: 'infiltration.cover_strain',
            timestamp: buildOperationEventTimestamp(3, 2),
            payload: {
              week: 3,
              caseId: 'case-infiltration',
              caseTitle: 'Covert Case',
              summary: 'Negative values.',
              infiltrationAwareness: -0.5,
              infiltrationProbeProgress: -25,
            },
          },
          {
            id: 'evt-infiltration-malformed',
            type: 'infiltration.leave_behind_tradeoff',
            timestamp: buildOperationEventTimestamp(3, 3),
            payload: {
              week: 3,
              caseId: 'case-infiltration',
              caseTitle: 'Covert Case',
              summary: 'Malformed values.',
              infiltrationAwareness: '25%',
              infiltrationProbeProgress: '0.5',
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        infiltrationAwareness: 0.25,
        infiltrationProbeProgress: 1,
      })
      expect(hydrated.events[1]?.payload).toMatchObject({
        infiltrationAwareness: 0.25,
        infiltrationProbeProgress: 1,
      })
      expect(hydrated.events[2]?.payload).toMatchObject({
        infiltrationAwareness: 0,
        infiltrationProbeProgress: 0,
      })
      expect(hydrated.events[3]?.payload).not.toHaveProperty('infiltrationAwareness')
      expect(hydrated.events[3]?.payload).not.toHaveProperty('infiltrationProbeProgress')
    })

    it('528 hydrates concealment.activated with trimmed strings and clamped confidence', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-concealment-528',
            type: 'concealment.activated',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-concealment',
              caseTitle: '  Hidden Site  ',
              mode: 'displaced',
              reason: '  authored  ',
              summary: '  Concealment engaged.  ',
              detectionConfidence: 2,
              displacementTarget: ' district:alpha ',
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        caseId: 'case-concealment',
        caseTitle: 'Hidden Site',
        mode: 'displaced',
        reason: 'authored',
        summary: 'Concealment engaged.',
        detectionConfidence: 1,
        displacementTarget: 'district:alpha',
      })
    })

    it('529 replaces blank infiltration summaries with deterministic fallbacks', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-infiltration-blank-summary',
            type: 'infiltration.cover_strain',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: '   ',
              summary: '   ',
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        caseTitle: 'Case 1',
        summary: 'Infiltration event (1)',
      })
    })

    it('530 trims, dedupes, and drops blank case event teamIds', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-resolved-530',
            type: 'case.resolved',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Resolved',
              mode: 'threshold',
              kind: 'case',
              stage: 1,
              teamIds: [' team-a ', 'team-a', '', '  ', 'team-b'],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload.teamIds).toEqual(['team-a', 'team-b'])
    })

    it('530b preserves stale case event teamIds while trimming and deduping', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-failed-530b',
            type: 'case.failed',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Failed',
              mode: 'threshold',
              kind: 'case',
              fromStage: 1,
              toStage: 2,
              teamIds: [' team-stale-1 ', 'team-stale-1', 'team-known-a'],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload.teamIds).toEqual(['team-stale-1', 'team-known-a'])
    })

    it('531 caps assignment.team_assigned assignedTeamCount to maxTeams', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-assignment-531',
            type: 'assignment.team_assigned',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Case 001',
              caseKind: 'case',
              teamId: 'team-001',
              teamName: 'Alpha',
              assignedTeamCount: 9,
              maxTeams: 2,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        assignedTeamCount: 2,
        maxTeams: 2,
      })
    })

    it('532 enforces agent.training_started etaWeeks >= 1', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        events: [
          {
            id: 'evt-training-532',
            type: 'agent.training_started',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              queueId: 'queue-532',
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Trainee',
              trainingId: 'training-532',
              trainingName: 'Program',
              etaWeeks: 0,
              fundingCost: 0,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ etaWeeks: 1 })
    })

    it('533 reconciles intel.report_generated counts and score from the weekly report', () => {
      const fallback = createStartingState()
      const caseIds = Object.keys(fallback.cases)
      const resolvedCases = caseIds.slice(0, 2)
      const failedCases = caseIds.slice(2, 3)
      const unresolvedTriggers = caseIds.slice(3, 4)
      const spawnedCases = caseIds.slice(4, 5)
      const report = {
        week: 4,
        rngStateBefore: 1,
        rngStateAfter: 2,
        newCases: [] as string[],
        progressedCases: [] as string[],
        resolvedCases,
        failedCases,
        partialCases: [] as string[],
        unresolvedTriggers,
        spawnedCases,
        maxStage: 0,
        avgFatigue: 0,
        teamStatus: [],
        notes: [{ id: 'note-1', content: 'Note', timestamp: buildReportNoteTimestamp(4, 0) }],
      }

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        reports: [report],
        events: [
          {
            id: 'evt-intel-533',
            type: 'intel.report_generated',
            timestamp: buildOperationEventTimestamp(4, 0),
            payload: {
              week: 4,
              resolvedCount: 99,
              failedCount: 99,
              partialCount: 99,
              unresolvedCount: 99,
              spawnedCount: 99,
              noteCount: 99,
              score: 99,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        resolvedCount: resolvedCases.length,
        failedCount: failedCases.length,
        partialCount: 0,
        unresolvedCount: unresolvedTriggers.length,
        spawnedCount: spawnedCases.length,
        noteCount: 1,
        score: calcWeekScore(hydrated.reports[0]!),
      })
    })

    it('534 clamps campaign ledger setting history weeks to campaign week', () => {
      const fallback = createStartingState()
      const base = fallback.campaignLedger ?? createSeedCampaignLedger()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        campaignLedger: {
          ...base,
          settingHistory: [
            {
              id: 'hist_future',
              settingId: 'toneScopeLabel',
              value: 'Future tone',
              effectiveFromWeek: 99,
              changedAtWeek: 88,
              source: 'seed',
            },
            {
              id: 'hist_present',
              settingId: 'toneScopeLabel',
              value: 'Present tone',
              effectiveFromWeek: 3,
              changedAtWeek: 2,
              source: 'seed',
            },
          ],
        },
      })

      expect(hydrated.campaignLedger?.settingHistory).toEqual([
        expect.objectContaining({
          id: 'hist_present',
          effectiveFromWeek: 3,
          changedAtWeek: 2,
        }),
        expect.objectContaining({
          id: 'hist_future',
          effectiveFromWeek: 3,
          changedAtWeek: 3,
        }),
      ])
    })
  })

  describe('hydration problems 535-542', () => {
    it('535-537 hydrates campaign ledger modifiers/toggles with latest-wins dedupe and empty arrays', () => {
      const fallback = createStartingState()
      const base = fallback.campaignLedger ?? createSeedCampaignLedger()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        campaignLedger: {
          ...base,
          runStateModifiers: [
            { id: 'duration_model', label: 'Old', value: 'old' },
            { id: 'duration_model', label: 'New', value: 'new' },
          ],
          moduleToggles: [
            { moduleId: 'weekly_directives', label: 'Old', enabled: false },
            { moduleId: 'weekly_directives', label: 'New', enabled: true },
          ],
        },
      })

      expect(hydrated.campaignLedger?.runStateModifiers).toEqual([
        { id: 'duration_model', label: 'New', value: 'new' },
      ])
      expect(hydrated.campaignLedger?.moduleToggles).toEqual([
        { moduleId: 'weekly_directives', label: 'New', enabled: true },
      ])

      const cleared = hydrateGame({
        ...stripGameTemplates(fallback),
        campaignLedger: { ...base, runStateModifiers: [], moduleToggles: [] },
      })
      expect(cleared.campaignLedger?.runStateModifiers).toEqual([])
      expect(cleared.campaignLedger?.moduleToggles).toEqual([])
    })

    it('538 dedupes setting history conflicts on hydrate', () => {
      const fallback = createStartingState()
      const base = fallback.campaignLedger ?? createSeedCampaignLedger()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        campaignLedger: {
          ...base,
          settingHistory: [
            {
              id: 'hist_dup',
              settingId: 'toneScopeLabel',
              value: 'stale',
              effectiveFromWeek: 2,
              changedAtWeek: 1,
              source: 'seed',
            },
            {
              id: 'hist_dup',
              settingId: 'toneScopeLabel',
              value: 'by-id',
              effectiveFromWeek: 2,
              changedAtWeek: 1,
              source: 'seed',
            },
            {
              id: 'hist_other',
              settingId: 'toneScopeLabel',
              value: 'by-week',
              effectiveFromWeek: 2,
              changedAtWeek: 3,
              source: 'seed',
            },
          ],
        },
      })

      expect(hydrated.campaignLedger?.settingHistory).toHaveLength(1)
      expect(hydrated.campaignLedger?.settingHistory[0]).toMatchObject({
        id: 'hist_other',
        value: 'by-week',
      })
    })

    it('539-541 sanitizes inventory against procurement catalog, trims keys, and preserves explicit empty object', () => {
      const fallback = createStartingState()
      const knownItemId = Object.keys(fallback.inventory)[0]!

      const trimmed = hydrateGame({
        ...stripGameTemplates(fallback),
        inventory: {
          [`  ${knownItemId}  `]: 3,
          '': 9,
          ' phantom ': 2,
        },
      })
      expect(trimmed.inventory[knownItemId]).toBe(3)
      expect(trimmed.inventory['']).toBeUndefined()
      expect(trimmed.inventory.phantom).toBe(2)

      const collision = hydrateGame({
        ...stripGameTemplates(fallback),
        inventory: {
          medkits: 1,
          ' medkits ': 5,
        },
      })
      expect(collision.inventory.medkits).toBe(5)

      const empty = hydrateGame({
        ...stripGameTemplates(fallback),
        inventory: {},
      })
      expect(empty.inventory).toEqual({})
      expect(Object.keys(empty.inventory)).toHaveLength(0)
    })
  })

  describe('hydration problems 543-550', () => {
    const emptyReportBuckets = {
      newCases: [] as string[],
      progressedCases: [] as string[],
      resolvedCases: [] as string[],
      failedCases: [] as string[],
      partialCases: [] as string[],
      unresolvedTriggers: [] as string[],
      spawnedCases: [] as string[],
      maxStage: 0,
      avgFatigue: 0,
      notes: [] as const,
    }

    it('543 keeps historical weekly report caseSnapshots empty without current-case fallback', () => {
      const fallback = createStartingState()
      const liveCaseId = Object.keys(fallback.cases)[0]!
      const historicalCaseId = 'case-historical-only'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          cases: {
            ...fallback.cases,
            [liveCaseId]: {
              ...fallback.cases[liveCaseId]!,
              title: 'Live Title Should Not Backfill History',
            },
          },
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              ...emptyReportBuckets,
              teamStatus: [],
            },
            {
              week: 5,
              rngStateBefore: 2,
              rngStateAfter: 3,
              ...emptyReportBuckets,
              teamStatus: [],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports).toHaveLength(2)
      expect(hydrated.reports[0]?.caseSnapshots).toEqual({})
      expect(hydrated.reports[0]?.caseSnapshots?.[liveCaseId]).toBeUndefined()
      expect(hydrated.reports[1]?.caseSnapshots).toEqual({})
      expect(hydrated.reports[1]?.caseSnapshots?.[liveCaseId]).toBeUndefined()

      const withHistoricalSnapshot = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              ...emptyReportBuckets,
              teamStatus: [],
              caseSnapshots: {
                [historicalCaseId]: {
                  caseId: historicalCaseId,
                  title: 'Archived Snapshot',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'resolved',
                  stage: 2,
                  deadlineRemaining: 0,
                  durationWeeks: 2,
                  assignedTeamIds: [],
                },
              },
            },
          ],
        },
        fallback
      )

      expect(withHistoricalSnapshot.reports[0]?.caseSnapshots?.[historicalCaseId]?.title).toBe(
        'Archived Snapshot'
      )
      expect(withHistoricalSnapshot.reports[0]?.caseSnapshots?.[liveCaseId]).toBeUndefined()
    })

    it('544 keeps historical teamStatus without current-roster fallback or live fatigue recompute', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const agentId = Object.keys(fallback.agents)[0]!
      const liveFatigue = fallback.agents[agentId]!.fatigue

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          agents: {
            ...fallback.agents,
            [agentId]: {
              ...fallback.agents[agentId]!,
              fatigue: 99,
            },
          },
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              ...emptyReportBuckets,
              teamStatus: [
                {
                  teamId,
                  teamName: 'Archived Team',
                  avgFatigue: 12,
                  fatigueBand: 'steady',
                },
              ],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.teamStatus).toEqual([
        expect.objectContaining({
          teamId,
          teamName: 'Archived Team',
          avgFatigue: 12,
          fatigueBand: 'steady',
        }),
      ])
      expect(hydrated.agents[agentId]?.fatigue).toBe(99)
      expect(liveFatigue).not.toBe(99)
    })

    it('545-546 strips unknown report note fields and trims/dedupes metadata keys', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          reports: [
            {
              week: 1,
              rngStateBefore: 1,
              rngStateAfter: 2,
              ...emptyReportBuckets,
              teamStatus: [],
              notes: [
                {
                  id: 'note-1',
                  content: 'Resolved cleanly',
                  timestamp: '2042-01-01T00:00:00.000Z',
                  type: 'case.resolved',
                  injectedField: 'drop-me',
                  metadata: {
                    caseId,
                    ' caseId ': caseId,
                    caseTitle: 'Snapshot Title',
                    stage: 2,
                    unknownMeta: 'drop-me',
                  },
                },
              ],
            },
          ],
        },
        fallback
      )

      const note = hydrated.reports[0]?.notes[0]
      expect(note).toBeDefined()
      expect(note).not.toHaveProperty('injectedField')
      expect(note?.metadata).toEqual({
        caseId,
        caseTitle: 'Snapshot Title',
        stage: 2,
      })
    })

    it('547 preserves explicit empty clearanceThresholds on hydrate', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          config: {
            ...fallback.config,
            clearanceThresholds: [],
          },
        },
        fallback
      )

      expect(hydrated.config.clearanceThresholds).toEqual([])
    })

    it('548 migratePersistedStore is hydrate-only across store versions', () => {
      const fallback = createStartingState()
      const persistedGame = createStartingState()
      delete (persistedGame as Partial<typeof persistedGame>).templates
      persistedGame.week = 4
      persistedGame.config = {
        ...persistedGame.config,
        clearanceThresholds: [],
      }

      const fromV1 = migratePersistedStore({ game: persistedGame }, 1, fallback)
      const fromCurrent = migratePersistedStore(
        { game: persistedGame },
        GAME_STORE_VERSION,
        fallback
      )

      expect(fromV1.game.config.clearanceThresholds).toEqual([])
      expect(fromCurrent.game.config.clearanceThresholds).toEqual([])
      expect(fromV1.game.week).toBe(4)
      expect(fromCurrent.game.week).toBe(4)
    })

    it('549 resolves unknown templateId from fallback catalog on import', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!
      const knownTemplateId = fallback.cases[caseId]!.templateId

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: {
              ...fallback.cases[caseId]!,
              templateId: 'phantom-template',
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[caseId]?.templateId).toBe(knownTemplateId)
    })
  })

  describe('hydration problems 551-558', () => {
    it('551 sanitizes party card definitions (id/key, title, target, effects, tags)', () => {
      const fallback = createStartingState()
      const seedCard = fallback.partyCards!.cards['card-breach-drill']!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          partyCards: {
            ...fallback.partyCards!,
            cards: {
              'card-breach-drill': {
                id: 'wrong-id',
                title: '  Tampered  ',
                description: '  ',
                target: 'bogus',
                effect: {
                  scoreAdjustment: Number.POSITIVE_INFINITY,
                  fatigueAdjustment: -3,
                  requiredCaseTags: ['occult', ' occult ', '', 12],
                },
              },
            },
          },
        },
        fallback
      )

      expect(hydrated.partyCards?.cards['card-breach-drill']).toEqual({
        id: 'card-breach-drill',
        title: 'Tampered',
        description: seedCard.description,
        target: 'case',
        effect: {
          scoreAdjustment: seedCard.effect.scoreAdjustment,
          fatigueAdjustment: -3,
          requiredCaseTags: ['occult'],
        },
      })
    })

    it('552 enforces maxHandSize >= 1 and reconciles against hand length', () => {
      const fallback = createStartingState()
      const hand = fallback.partyCards!.deck.slice(0, 4)

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          partyCards: {
            ...fallback.partyCards!,
            deck: [],
            hand,
            discard: [],
            maxHandSize: 0,
          },
        },
        fallback
      )

      expect(hydrated.partyCards?.maxHandSize).toBe(hand.length)
    })

    it('553 aligns queued play targets with card.target and drops stale refs', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!
      const teamId = Object.keys(fallback.teams)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          partyCards: {
            ...fallback.partyCards!,
            queuedPlays: [
              {
                playId: 'play-team-cross',
                cardId: 'card-surge-team',
                targetTeamId: teamId,
                targetCaseId: caseId,
                weekPlayed: 1,
              },
              {
                playId: 'play-case-cross',
                cardId: 'card-breach-drill',
                targetCaseId: caseId,
                targetTeamId: teamId,
                weekPlayed: 1,
              },
              {
                playId: 'play-global-cross',
                cardId: 'card-field-briefing',
                targetCaseId: caseId,
                targetTeamId: teamId,
                weekPlayed: 1,
              },
            ],
          },
        },
        fallback
      )

      expect(hydrated.partyCards?.queuedPlays).toEqual([
        {
          playId: 'play-team-cross',
          cardId: 'card-surge-team',
          targetTeamId: teamId,
          weekPlayed: 1,
        },
        {
          playId: 'play-case-cross',
          cardId: 'card-breach-drill',
          targetCaseId: caseId,
          weekPlayed: 1,
        },
        {
          playId: 'play-global-cross',
          cardId: 'card-field-briefing',
          weekPlayed: 1,
        },
      ])
    })

    it('554 trims, dedupes, and regenerates duplicate training queue ids', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        trainingQueue: [
          {
            id: ' training-dup ',
            trainingId: 'combat-drills',
            scope: 'agent',
            agentId,
            durationWeeks: 2,
            remainingWeeks: 2,
          },
          {
            id: 'training-dup',
            trainingId: 'analysis-lab',
            scope: 'agent',
            agentId,
            durationWeeks: 2,
            remainingWeeks: 2,
          },
        ],
      })

      expect(hydrated.trainingQueue.map((entry) => entry.id)).toEqual([
        'training-dup',
        'training-dup-dup-2',
      ])
    })

    it('555 clamps training relationshipDelta to the relationship scale', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const agentId = fallback.teams[teamId]!.leaderId
      const memberIds = fallback.teams[teamId]!.memberIds

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        trainingQueue: [
          {
            id: 'training-relationship',
            trainingId: 'coordination-drill',
            scope: 'team',
            agentId,
            teamId,
            memberIds,
            durationWeeks: 2,
            remainingWeeks: 2,
            relationshipDelta: 9,
            trainedRelationshipDelta: 99,
          },
        ],
      })

      expect(hydrated.trainingQueue[0]?.relationshipDelta).toBe(2)
      expect(hydrated.trainingQueue[0]?.trainedRelationshipDelta).toBe(2)
    })

    it('556 trims, dedupes, and regenerates duplicate production queue ids', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: ' queue-dup ',
            recipeId: 'ward-seals',
            outputItemId: recipe.outputItemId,
            durationWeeks: recipe.durationWeeks,
            remainingWeeks: recipe.durationWeeks,
            fundingCost: recipe.baseFundingCost,
          },
          {
            id: 'queue-dup',
            recipeId: 'med-kits',
            outputItemId: getProductionRecipe('med-kits')!.outputItemId,
            durationWeeks: 1,
            remainingWeeks: 1,
            fundingCost: getProductionRecipe('med-kits')!.baseFundingCost,
          },
        ],
      })

      expect(hydrated.productionQueue.map((entry) => entry.id)).toEqual([
        'queue-dup',
        'queue-dup-dup-2',
      ])
    })

    it('557 recomputes production fundingCost snapshots outside the recipe band', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!
      const expected = getRecipeFundingCost(recipe, fallback.market)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'q-funding',
            recipeId: 'ward-seals',
            outputItemId: recipe.outputItemId,
            startedWeek: 1,
            durationWeeks: recipe.durationWeeks,
            remainingWeeks: recipe.durationWeeks,
            fundingCost: 9999,
          },
        ],
      })

      expect(hydrated.productionQueue[0]?.fundingCost).toBe(expected)
    })
  })

  describe('hydration problems 559-566', () => {
    it('559 clears lastSummary and lastChangeWeek when deployment momentum stacks are zero', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        deploymentMomentum: {
          stacks: 0,
          lastChangeWeek: 4,
          lastSummary: 'stale recap',
        },
      })

      expect(hydrated.deploymentMomentum).toBeUndefined()
    })

    it('560 trims zone ids, dedupes piles, and enforces single-zone ownership', () => {
      const fallback = createStartingState()
      const cardId = fallback.partyCards!.deck[0]!
      const secondCardId = fallback.partyCards!.deck[1]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        partyCards: {
          ...fallback.partyCards!,
          deck: [` ${cardId} `, cardId, 'phantom-card', secondCardId],
          hand: [` ${cardId} `, secondCardId],
          discard: [cardId, secondCardId],
        },
      })

      expect(hydrated.partyCards?.hand).toEqual([cardId, secondCardId])
      expect(hydrated.partyCards?.deck).toEqual([])
      expect(hydrated.partyCards?.discard).toEqual([])
    })

    it('561 trims, dedupes, and regenerates duplicate queued play ids', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        partyCards: {
          ...fallback.partyCards!,
          queuedPlays: [
            {
              playId: ' play-dup ',
              cardId: 'card-breach-drill',
              targetCaseId: caseId,
              weekPlayed: 1,
            },
            {
              playId: 'play-dup',
              cardId: 'card-field-briefing',
              weekPlayed: 1,
            },
          ],
        },
      })

      expect(hydrated.partyCards?.queuedPlays.map((play) => play.playId)).toEqual([
        'play-dup',
        'play-dup-dup-2',
      ])
    })

    it('562 caps queued play weekPlayed to the hydrated campaign week', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        partyCards: {
          ...fallback.partyCards!,
          queuedPlays: [
            {
              playId: 'play-future',
              cardId: 'card-breach-drill',
              targetCaseId: caseId,
              weekPlayed: 99,
            },
          ],
        },
      })

      expect(hydrated.partyCards?.queuedPlays[0]?.weekPlayed).toBe(3)
    })

    it('563 keeps catalog cards but empty zones when partyCards payload is malformed', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          partyCards: 'corrupt' as unknown as typeof fallback.partyCards,
        },
        fallback
      )

      expect(hydrated.partyCards?.cards).toEqual(fallback.partyCards?.cards)
      expect(hydrated.partyCards?.deck).toEqual([])
      expect(hydrated.partyCards?.hand).toEqual([])
      expect(hydrated.partyCards?.discard).toEqual([])
      expect(hydrated.partyCards?.queuedPlays).toEqual([])
    })

    it('564 derives training display names from catalog, agent, and team when known', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const agentId = fallback.teams[teamId]!.leaderId
      const memberIds = fallback.teams[teamId]!.memberIds
      const program = getTrainingProgram('coordination-drill')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        trainingQueue: [
          {
            id: 'training-names',
            trainingId: 'coordination-drill',
            trainingName: 'Tampered Program',
            scope: 'team',
            agentId,
            agentName: 'Tampered Agent',
            teamId,
            teamName: 'Tampered Team',
            memberIds,
            durationWeeks: program.durationWeeks,
            remainingWeeks: program.durationWeeks,
          },
        ],
      })

      expect(hydrated.trainingQueue[0]).toMatchObject({
        trainingName: program.name,
        agentName: fallback.agents[agentId]!.name,
        teamName: fallback.teams[teamId]!.name,
      })
    })

    it('565 derives production recipe and output names from the catalog', () => {
      const fallback = createStartingState()
      const recipe = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        productionQueue: [
          {
            id: 'queue-names',
            recipeId: 'ward-seals',
            recipeName: 'Tampered Recipe',
            outputItemId: recipe.outputItemId,
            outputItemName: 'Tampered Output',
            durationWeeks: recipe.durationWeeks,
            remainingWeeks: recipe.durationWeeks,
            fundingCost: recipe.baseFundingCost,
          },
        ],
      })

      expect(hydrated.productionQueue[0]).toMatchObject({
        recipeName: recipe.name,
        outputItemName: recipe.outputItemName,
      })
    })

    it('566 defaults missing rngState to rngSeed and normalizes mismatched values', () => {
      const fallback = createStartingState()

      const missingState = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          rngSeed: 4242,
          rngState: undefined,
        },
        fallback
      )

      expect(missingState.rngSeed).toBe(4242)
      expect(missingState.rngState).toBe(4242)

      const normalizedMismatch = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          rngSeed: -99,
          rngState: 0,
        },
        fallback
      )

      expect(normalizedMismatch.rngSeed).toBe(99)
      expect(normalizedMismatch.rngState).toBe(1)
    })
  })

  describe('hydration problems 567-574', () => {
    const emptyReportBuckets = {
      newCases: [] as string[],
      progressedCases: [] as string[],
      resolvedCases: [] as string[],
      failedCases: [] as string[],
      partialCases: [] as string[],
      unresolvedTriggers: [] as string[],
      spawnedCases: [] as string[],
      maxStage: 0,
      avgFatigue: 0,
      notes: [] as const,
    }

    it('567 repairs party card zones element-by-element when one entry is malformed', () => {
      const fallback = createStartingState()
      const cardId = fallback.partyCards!.deck[0]!
      const secondCardId = fallback.partyCards!.deck[1]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        partyCards: {
          ...fallback.partyCards!,
          deck: [cardId, 12, secondCardId],
          hand: [` ${cardId} `, null, secondCardId],
          discard: [cardId, ''],
        },
      })

      expect(hydrated.partyCards?.deck).toEqual([])
      expect(hydrated.partyCards?.hand).toEqual([cardId, secondCardId])
      expect(hydrated.partyCards?.discard).toEqual([])
    })

    it('568 drops queued plays with missing or unknown cardId instead of fabricating', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        partyCards: {
          ...fallback.partyCards!,
          queuedPlays: [
            {
              playId: 'play-missing',
              cardId: '',
              targetCaseId: caseId,
              weekPlayed: 1,
            },
            {
              playId: 'play-unknown',
              cardId: 'phantom-card',
              targetCaseId: caseId,
              weekPlayed: 1,
            },
            {
              playId: 'play-valid',
              cardId: 'card-breach-drill',
              targetCaseId: caseId,
              weekPlayed: 1,
            },
          ],
        },
      })

      expect(hydrated.partyCards?.queuedPlays).toEqual([
        {
          playId: 'play-valid',
          cardId: 'card-breach-drill',
          targetCaseId: caseId,
          weekPlayed: 1,
        },
      ])
    })

    it('569 clears attrition-only config and deployment momentum when challenge mode is off', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        config: {
          ...fallback.config,
          challengeModeEnabled: false,
          durationModel: 'attrition',
          attritionPerWeek: 99,
        },
        deploymentMomentum: {
          stacks: 2,
          lastChangeWeek: 3,
          lastSummary: 'stale momentum',
        },
      })

      expect(hydrated.config).toMatchObject({
        challengeModeEnabled: false,
        durationModel: 'capacity',
        attritionPerWeek: fallback.config.attritionPerWeek,
      })
      expect(hydrated.deploymentMomentum).toBeUndefined()
    })

    it('570 caps partialMargin using the resolution model score band', () => {
      const fallback = createStartingState()

      const sanitized = sanitizeGameConfig(
        {
          partialMargin: 999,
        },
        fallback.config
      )

      expect(sanitized.partialMargin).toBe(37)
    })

    it('571 reconciles academy tier with base training slot capacity', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        academyTier: 3,
        config: {
          ...fallback.config,
          trainingSlots: 2,
        },
      })

      expect(hydrated.academyTier).toBe(3)
      expect(hydrated.config.trainingSlots).toBe(fallback.config.trainingSlots)
    })

    it('572 caps clearanceLevel to the configured threshold ladder', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        clearanceLevel: 99,
        containmentRating: 0,
        config: {
          ...fallback.config,
          clearanceThresholds: [0, 180, 420],
        },
      })

      expect(hydrated.clearanceLevel).toBe(4)
    })

    it('573 preserves durable knowledge and revealExplanation on historical report snapshots', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        reports: [
          {
            week: 3,
            rngStateBefore: 1,
            rngStateAfter: 2,
            ...emptyReportBuckets,
            teamStatus: [],
            caseSnapshots: {
              'case-archived': {
                caseId: 'case-archived',
                title: 'Archived Case',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 2,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
                knowledge: {
                  [teamId]: {
                    entityId: teamId,
                    subjectId: 'case-archived',
                    confirmationState: 'provisional',
                    provisionalClassification: 'occult',
                  },
                },
                revealExplanation: '  archived reveal  ',
              },
            },
          },
        ],
      })

      const snapshot = hydrated.reports[0]?.caseSnapshots?.['case-archived']
      expect(snapshot?.knowledge?.[teamId]?.provisionalClassification).toBe('occult')
      expect(snapshot?.revealExplanation).toBe('archived reveal')
    })

    it('574 keeps persisted caseSnapshots authoritative without current-case fallback overlay', () => {
      const fallback = createStartingState()
      const liveCaseId = Object.keys(fallback.cases)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          cases: {
            ...fallback.cases,
            [liveCaseId]: {
              ...fallback.cases[liveCaseId]!,
              title: 'Live Title Must Not Appear In Report',
            },
          },
          reports: [
            {
              week: 5,
              rngStateBefore: 1,
              rngStateAfter: 2,
              ...emptyReportBuckets,
              teamStatus: [],
              caseSnapshots: {},
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.caseSnapshots).toEqual({})
      expect(hydrated.reports[0]?.caseSnapshots?.[liveCaseId]).toBeUndefined()
    })
  })

  describe('hydration problems 575-577', () => {
    const emptyReportBuckets = {
      newCases: [] as string[],
      progressedCases: [] as string[],
      resolvedCases: [] as string[],
      failedCases: [] as string[],
      partialCases: [] as string[],
      unresolvedTriggers: [] as string[],
      spawnedCases: [] as string[],
      maxStage: 0,
      avgFatigue: 0,
      notes: [] as const,
    }

    const minimalMissionResultPayload = (
      caseId: string,
      outcome: 'success' | 'partial' | 'fail' | 'unresolved'
    ) => ({
      caseId,
      caseTitle: caseId,
      teamsUsed: [],
      outcome,
      performanceSummary: {
        contribution: 0,
        threatHandled: 0,
        damageTaken: 0,
        healingPerformed: 0,
        evidenceGathered: 0,
        containmentActionsCompleted: 0,
      },
      rewards: {
        outcome,
        caseType: 'general',
        caseTypeLabel: 'Operation',
        operationValue: 0,
        factors: [],
        fundingDelta: 0,
        containmentDelta: 0,
        strategicValueDelta: 0,
        reputationDelta: 0,
        inventoryRewards: [],
        factionStanding: [],
        label: 'Mission',
        reasons: [],
      },
      penalties: {
        fundingLoss: 0,
        containmentLoss: 0,
        reputationLoss: 0,
        strategicLoss: 0,
      },
      fatigueChanges: [],
      injuries: [],
      spawnedConsequences: [],
      explanationNotes: [],
    })

    it('575-576 allowlists snapshot kind and mode including standard and anomaly', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
            ...emptyReportBuckets,
            teamStatus: [],
            caseSnapshots: {
              'case-standard-kind': {
                caseId: 'case-standard-kind',
                title: 'Standard Kind',
                kind: 'standard',
                mode: 'standard',
                status: 'open',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
              'case-anomaly': {
                caseId: 'case-anomaly',
                title: 'Anomaly',
                kind: 'anomaly',
                mode: 'deterministic',
                status: 'open',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
              'case-bogus-enums': {
                caseId: 'case-bogus-enums',
                title: 'Bogus Enums',
                kind: 'bogus' as 'case',
                mode: 'bogus' as 'threshold',
                status: 'open',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [],
              },
            },
          },
        ],
      })

      const snapshots = hydrated.reports[0]?.caseSnapshots
      expect(snapshots?.['case-standard-kind']).toMatchObject({
        kind: 'standard',
        mode: 'standard',
      })
      expect(snapshots?.['case-anomaly']?.kind).toBe('anomaly')
      expect(snapshots?.['case-bogus-enums']).toMatchObject({
        kind: 'case',
        mode: 'threshold',
      })
    })

    it('577A drops missionResult when caseId mismatches snapshot (extends 460)', () => {
      const fallback = createStartingState()
      const caseId = 'case-mission-id-match'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        reports: [
          {
            week: 2,
            rngStateBefore: 1,
            rngStateAfter: 2,
            ...emptyReportBuckets,
            teamStatus: [],
            caseSnapshots: {
              [caseId]: {
                caseId,
                title: 'Matched Result',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 2,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
                missionResult: minimalMissionResultPayload(caseId, 'success'),
              },
              'case-mismatched-result': {
                caseId: 'case-mismatched-result',
                title: 'Mismatched Result',
                kind: 'case',
                mode: 'threshold',
                status: 'resolved',
                stage: 2,
                deadlineRemaining: 0,
                durationWeeks: 2,
                assignedTeamIds: [],
                missionResult: minimalMissionResultPayload('other-case-id', 'success'),
              },
            },
          },
        ],
      })

      const snapshots = hydrated.reports[0]?.caseSnapshots
      expect(snapshots?.[caseId]?.status).toBe('resolved')
      expect(snapshots?.[caseId]?.missionResult?.outcome).toBe('success')
      expect(snapshots?.['case-mismatched-result']?.status).toBe('open')
      expect(snapshots?.['case-mismatched-result']?.missionResult).toBeUndefined()
    })

    it('577B strips recovery fields without a valid assignedCaseId in cases or snapshots', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const snapshotCaseId = 'case-snapshot-only'

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        cases: {},
        reports: [
          {
            week: 4,
            rngStateBefore: 1,
            rngStateAfter: 2,
            ...emptyReportBuckets,
            caseSnapshots: {
              [snapshotCaseId]: {
                caseId: snapshotCaseId,
                title: 'Snapshot Only',
                kind: 'case',
                mode: 'threshold',
                status: 'in_progress',
                stage: 1,
                deadlineRemaining: 2,
                durationWeeks: 2,
                assignedTeamIds: [teamId],
              },
            },
            teamStatus: [
              {
                teamId,
                assignedCaseId: snapshotCaseId,
                avgFatigue: 10,
                deployedRecoveryMode: 'sanctuary_recovery',
                recoveryLegibility: '  staging line  ',
              },
              {
                teamId: 'team-orphan-recovery',
                assignedCaseId: 'case-missing-everywhere',
                avgFatigue: 5,
                deployedRecoveryMode: 'ordinary_rest',
                recoveryLegibility: 'orphan legibility',
              },
              {
                teamId: 'team-no-case-recovery',
                avgFatigue: 3,
                deployedRecoveryMode: 'active_recovery',
                recoveryLegibility: 'no assignment',
              },
            ],
          },
        ],
      })

      const teamStatus = hydrated.reports[0]?.teamStatus ?? []
      const validEntry = teamStatus.find((entry) => entry.teamId === teamId)
      const orphanEntry = teamStatus.find((entry) => entry.teamId === 'team-orphan-recovery')
      const unassignedEntry = teamStatus.find((entry) => entry.teamId === 'team-no-case-recovery')

      expect(validEntry).toMatchObject({
        assignedCaseId: snapshotCaseId,
        deployedRecoveryMode: 'sanctuary_recovery',
        recoveryLegibility: 'staging line',
      })
      expect(orphanEntry?.assignedCaseId).toBeUndefined()
      expect(orphanEntry?.deployedRecoveryMode).toBeUndefined()
      expect(orphanEntry?.recoveryLegibility).toBeUndefined()
      expect(unassignedEntry?.assignedCaseId).toBeUndefined()
      expect(unassignedEntry?.deployedRecoveryMode).toBeUndefined()
      expect(unassignedEntry?.recoveryLegibility).toBeUndefined()
    })
  })

  describe('hydration problems 583-590', () => {
    it('583 preserves standard mode on case.resolved/partial/failed and falls back bogus modes', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-resolved-standard',
            type: 'case.resolved',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Standard Resolved',
              mode: 'standard',
              kind: 'case',
              stage: 2,
              teamIds: [],
            },
          },
          {
            id: 'evt-partial-bogus-mode',
            type: 'case.partially_resolved',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              caseId: 'case-002',
              caseTitle: 'Partial Bogus Mode',
              mode: 'bogus' as 'threshold',
              kind: 'case',
              fromStage: 1,
              toStage: 2,
              teamIds: [],
            },
          },
          {
            id: 'evt-failed-standard',
            type: 'case.failed',
            timestamp: buildOperationEventTimestamp(2, 2),
            payload: {
              week: 2,
              caseId: 'case-003',
              caseTitle: 'Standard Failed',
              mode: 'standard',
              kind: 'anomaly',
              fromStage: 1,
              toStage: 1,
              teamIds: [],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ mode: 'standard' })
      expect(hydrated.events[1]?.payload).toMatchObject({ mode: 'threshold' })
      expect(hydrated.events[2]?.payload).toMatchObject({ mode: 'standard', kind: 'anomaly' })
    })

    it('584 allowlists case kind standard and anomaly without coercing to case only', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-spawned-standard',
            type: 'case.spawned',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-standard',
              caseTitle: 'Standard Spawn',
              templateId: 'tpl-001',
              kind: 'standard',
              stage: 1,
              trigger: 'unresolved',
            },
          },
          {
            id: 'evt-battle-anomaly',
            type: 'case.aggregate_battle',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              caseId: 'case-anomaly',
              caseTitle: 'Anomaly Battle',
              mode: 'deterministic',
              kind: 'anomaly',
              battleId: 'battle-001',
              roundsResolved: 1,
              winnerSideId: null,
              winnerLabel: null,
              friendlyLabel: 'Friendly',
              hostileLabel: 'Hostile',
              movementDeniedCount: 0,
              friendlyRoutedCount: 0,
              hostileRoutedCount: 0,
            },
          },
          {
            id: 'evt-resolved-bogus-kind',
            type: 'case.resolved',
            timestamp: buildOperationEventTimestamp(2, 2),
            payload: {
              week: 2,
              caseId: 'case-bogus',
              caseTitle: 'Bogus Kind',
              mode: 'threshold',
              kind: 'bogus' as 'case',
              stage: 1,
              teamIds: [],
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ kind: 'standard' })
      expect(hydrated.events[1]?.payload).toMatchObject({ kind: 'anomaly' })
      expect(hydrated.events[2]?.payload).toMatchObject({ kind: 'case' })
    })

    it('585 enforces case.raid_converted maxTeams >= minTeams (extends 509)', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-raid-bounds-585',
            type: 'case.raid_converted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              caseId: 'case-001',
              caseTitle: 'Case 001',
              stage: 2,
              trigger: 'deadline',
              minTeams: 3,
              maxTeams: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ minTeams: 3, maxTeams: 3 })
    })

    it('586 reconciles market.shifted featuredRecipeId against catalog and recipe name', () => {
      const fallback = createStartingState()
      const wardSeals = getProductionRecipe('ward-seals')!

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-shift-586',
            type: 'market.shifted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              featuredRecipeId: 'phantom-recipe',
              featuredRecipeName: 'Wrong Label',
              pressure: 'stable',
              costMultiplier: 1,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        featuredRecipeId: fallback.market.featuredRecipeId,
        featuredRecipeName: getProductionRecipe(fallback.market.featuredRecipeId)?.name,
      })

      const catalogHydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-shift-name',
            type: 'market.shifted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              featuredRecipeId: 'ward-seals',
              featuredRecipeName: 'Stale Name',
              pressure: 'stable',
              costMultiplier: 1,
            },
          },
        ],
      })

      expect(catalogHydrated.events[0]?.payload).toMatchObject({
        featuredRecipeId: 'ward-seals',
        featuredRecipeName: wardSeals.name,
      })
    })

    it('587 validates market.shifted pressure and canonical costMultiplier like 454', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-market-shift-pressure',
            type: 'market.shifted',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              featuredRecipeId: 'ward-seals',
              featuredRecipeName: getProductionRecipe('ward-seals')!.name,
              pressure: 'bogus' as 'stable',
              costMultiplier: 1.75,
            },
          },
          {
            id: 'evt-market-shift-tight',
            type: 'market.shifted',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              featuredRecipeId: 'ward-seals',
              featuredRecipeName: getProductionRecipe('ward-seals')!.name,
              pressure: 'tight',
              costMultiplier: 0.6,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        pressure: 'stable',
        costMultiplier: 1,
      })
      expect(hydrated.events[1]?.payload).toMatchObject({
        pressure: 'tight',
        costMultiplier: 1.15,
      })
    })

    it('588 reconciles emergency_gray_market_fallout_tick outcome with fallout and metrics', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-fallout-escalated',
            type: 'market.emergency_gray_market_fallout_tick',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              outcome: 'escalated_pending_oversight',
              falloutRiskBefore: 'costly',
              falloutRiskAfter: 'none',
              fundingBefore: 500,
              fundingAfter: 600,
              containmentRatingBefore: 60,
              containmentRatingAfter: 70,
              waiverPrecedentCount: 1,
              precedentPenaltyMultiplier: 1,
              institutionKey: 'containment_protocol',
            },
          },
          {
            id: 'evt-fallout-resolved',
            type: 'market.emergency_gray_market_fallout_tick',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              outcome: 'resolved_closed',
              falloutRiskBefore: 'risk',
              falloutRiskAfter: 'costly',
              fundingBefore: 400,
              fundingAfter: 450,
              containmentRatingBefore: 55,
              containmentRatingAfter: 58,
              waiverPrecedentCount: 2,
              precedentPenaltyMultiplier: 1.05,
              institutionKey: 'containment_protocol',
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        outcome: 'escalated_pending_oversight',
        falloutRiskBefore: 'risk',
        falloutRiskAfter: 'costly',
        fundingBefore: 500,
        fundingAfter: 500,
        containmentRatingBefore: 60,
        containmentRatingAfter: 60,
      })
      expect(hydrated.events[1]?.payload).toMatchObject({
        outcome: 'resolved_closed',
        falloutRiskBefore: 'costly',
        falloutRiskAfter: 'none',
        fundingBefore: 400,
        fundingAfter: 400,
        containmentRatingBefore: 55,
        containmentRatingAfter: 55,
      })
    })

    it('589 enforces academy_upgraded tierAfter > tierBefore and fundingAfter = fundingBefore - cost', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-academy-589',
            type: 'system.academy_upgraded',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              tierBefore: 1,
              tierAfter: 1,
              fundingBefore: 500,
              fundingAfter: 500,
              cost: 200,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        tierBefore: 1,
        tierAfter: 2,
        fundingBefore: 500,
        fundingAfter: 300,
        cost: 200,
      })
    })

    it('590 reconciles progression.xp_gained level and levelsGained with totalXp', () => {
      const fallback = createStartingState()
      const totalXp = getXpThresholdForLevel(3)
      const xpAmount = 75
      const previousTotalXp = totalXp - xpAmount
      const expectedLevel = getLevelForXp(totalXp)
      const expectedLevelsGained = expectedLevel - getLevelForXp(previousTotalXp)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-xp-590',
            type: 'progression.xp_gained',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              agentId: Object.keys(fallback.agents)[0]!,
              agentName: 'Agent',
              xpAmount,
              reason: 'mission_success',
              totalXp,
              level: 1,
              levelsGained: 9,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({
        xpAmount,
        totalXp,
        level: expectedLevel,
        levelsGained: expectedLevelsGained,
      })
    })
  })

  describe('hydration problems 591-598', () => {
    it('591 preserves durable performanceSummary and rewardBreakdown on caseSnapshots', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 4,
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              newCases: [],
              progressedCases: [],
              resolvedCases: [],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 2,
              avgFatigue: 12,
              teamStatus: [],
              caseSnapshots: {
                'case-archived': {
                  caseId: 'case-archived',
                  title: 'Archived Case',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'resolved',
                  stage: 2,
                  deadlineRemaining: 0,
                  durationWeeks: 2,
                  assignedTeamIds: [],
                  performanceSummary: {
                    contribution: 5,
                    threatHandled: 2,
                    damageTaken: 1,
                    healingPerformed: 0,
                    evidenceGathered: 3,
                    containmentActionsCompleted: 1,
                  },
                  rewardBreakdown: {
                    outcome: 'success',
                    caseType: 'general',
                    caseTypeLabel: 'Operation',
                    operationValue: 10,
                    factors: [],
                    fundingDelta: 25,
                    containmentDelta: 3,
                    strategicValueDelta: 0,
                    reputationDelta: 0,
                    inventoryRewards: [],
                    factionStanding: [],
                    label: 'Mission',
                    reasons: ['historical'],
                  },
                },
              },
              notes: [],
            },
          ],
        },
        fallback
      )

      const snapshot = hydrated.reports[0]?.caseSnapshots?.['case-archived']

      expect(snapshot?.performanceSummary).toMatchObject({
        contribution: 5,
        threatHandled: 2,
        evidenceGathered: 3,
      })
      expect(snapshot?.rewardBreakdown).toMatchObject({
        outcome: 'success',
        fundingDelta: 25,
        containmentDelta: 3,
        reasons: ['historical'],
      })
    })

    it('591 derives rewardBreakdown and performanceSummary from missionResult when top-level fields are missing', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 4,
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              newCases: [],
              progressedCases: [],
              resolvedCases: [],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 1,
              avgFatigue: 0,
              teamStatus: [],
              caseSnapshots: {
                'case-derived': {
                  caseId: 'case-derived',
                  title: 'Derived Case',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'resolved',
                  stage: 1,
                  deadlineRemaining: 0,
                  durationWeeks: 1,
                  assignedTeamIds: [],
                  missionResult: {
                    caseId: 'case-derived',
                    caseTitle: 'Derived Case',
                    teamsUsed: [],
                    outcome: 'success',
                    performanceSummary: {
                      contribution: 9,
                      threatHandled: 1,
                      damageTaken: 0,
                      healingPerformed: 0,
                      evidenceGathered: 2,
                      containmentActionsCompleted: 0,
                    },
                    rewards: {
                      outcome: 'success',
                      caseType: 'general',
                      caseTypeLabel: 'Operation',
                      operationValue: 4,
                      factors: [],
                      fundingDelta: 12,
                      containmentDelta: 1,
                      strategicValueDelta: 0,
                      reputationDelta: 0,
                      inventoryRewards: [],
                      factionStanding: [],
                      label: 'Mission',
                      reasons: ['from-mission-result'],
                    },
                    penalties: {
                      fundingLoss: 0,
                      containmentLoss: 0,
                      reputationLoss: 0,
                      strategicLoss: 0,
                    },
                    fatigueChanges: [],
                    injuries: [],
                    spawnedConsequences: [],
                    explanationNotes: [],
                  },
                },
              },
              notes: [],
            },
          ],
        },
        fallback
      )

      const snapshot = hydrated.reports[0]?.caseSnapshots?.['case-derived']

      expect(snapshot?.performanceSummary?.contribution).toBe(9)
      expect(snapshot?.rewardBreakdown).toMatchObject({
        fundingDelta: 12,
        reasons: ['from-mission-result'],
      })
    })

    it('592 clamps historical avgFatigue and reconciles current-week avgFatigue from teamStatus', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const agents = Object.fromEntries(
        Object.entries(fallback.agents).map(([agentId, agent]) => [
          agentId,
          { ...agent, fatigue: 42 },
        ])
      )

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          agents,
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              newCases: [],
              progressedCases: [],
              resolvedCases: [],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 0,
              avgFatigue: 250,
              teamStatus: [{ teamId, teamName: 'Alpha', avgFatigue: 80, fatigueBand: 'strained' }],
              caseSnapshots: {},
              notes: [],
            },
            {
              week: 5,
              rngStateBefore: 3,
              rngStateAfter: 3,
              newCases: [],
              progressedCases: [],
              resolvedCases: [],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 0,
              avgFatigue: 250,
              teamStatus: [{ teamId, teamName: fallback.teams[teamId]!.name }],
              caseSnapshots: {},
              notes: [],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.avgFatigue).toBe(100)
      expect(hydrated.reports[1]?.avgFatigue).toBe(42)
    })

    it('593 caps maxStage to the highest sanitized snapshot or live case stage', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 3,
          reports: [
            {
              week: 3,
              rngStateBefore: 1,
              rngStateAfter: 2,
              newCases: [],
              progressedCases: [],
              resolvedCases: [],
              failedCases: [],
              partialCases: [],
              unresolvedTriggers: [],
              spawnedCases: [],
              maxStage: 99,
              avgFatigue: 0,
              teamStatus: [],
              caseSnapshots: {
                'case-archived': {
                  caseId: 'case-archived',
                  title: 'Archived Case',
                  kind: 'case',
                  mode: 'threshold',
                  status: 'open',
                  stage: 4,
                  deadlineRemaining: 1,
                  durationWeeks: 2,
                  assignedTeamIds: [],
                },
              },
              notes: [],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.maxStage).toBe(4)
    })

    it('594 chains weekly RNG cursors and advances identical before/after pairs', () => {
      const fallback = createStartingState()
      const seed = fallback.rngSeed

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 3,
          rngSeed: seed,
          reports: [
            {
              week: 2,
              rngStateBefore: seed,
              rngStateAfter: seed,
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
              caseSnapshots: {},
              notes: [],
            },
            {
              week: 3,
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
              caseSnapshots: {},
              notes: [],
            },
          ],
        },
        fallback
      )

      expect(hydrated.reports[0]?.rngStateBefore).toBe(seed)
      expect(hydrated.reports[0]?.rngStateAfter).not.toBe(seed)
      expect(hydrated.reports[1]?.rngStateBefore).toBe(hydrated.reports[0]?.rngStateAfter)
      expect(hydrated.reports[1]?.rngStateAfter).toBeDefined()
    })

    it('595 drops unknown top-level game fields during hydration', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'persist-me',
          week: 2,
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.week).toBe(2)
    })

    it('597 clamps recruitment scouting revealLevel to 0|1|2', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-scout-597',
            type: 'recruitment.scouting_initiated',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: {
              week: 2,
              candidateId: 'cand-597',
              candidateName: 'Scout Target',
              stage: 1,
              projectedTier: 'C',
              confidence: 'low',
              fundingCost: 0,
              revealLevel: 9,
            },
          },
          {
            id: 'evt-scout-597b',
            type: 'recruitment.scouting_refined',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: {
              week: 2,
              candidateId: 'cand-597b',
              candidateName: 'Pre-reveal',
              stage: 1,
              projectedTier: 'C',
              confidence: 'low',
              fundingCost: 0,
              revealLevel: 0,
            },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ revealLevel: 2 })
      expect(hydrated.events[1]?.payload).toMatchObject({ revealLevel: 1 })
    })

    it('598 bounds system count events as audit-only counts', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        events: [
          {
            id: 'evt-gen-598',
            type: 'system.recruitment_generated',
            timestamp: buildOperationEventTimestamp(2, 0),
            payload: { week: 2, count: 500 },
          },
          {
            id: 'evt-exp-598',
            type: 'system.recruitment_expired',
            timestamp: buildOperationEventTimestamp(2, 1),
            payload: { week: 2, count: -3 },
          },
          {
            id: 'evt-draw-598',
            type: 'system.party_cards_drawn',
            timestamp: buildOperationEventTimestamp(2, 2),
            payload: { week: 2, count: 2 },
          },
        ],
      })

      expect(hydrated.events[0]?.payload).toMatchObject({ count: 99 })
      expect(hydrated.events[1]?.payload).toMatchObject({ count: 0 })
      expect(hydrated.events[2]?.payload).toMatchObject({ count: 2 })
    })
  })

  describe('hydration problems 599-606', () => {
    function makeHydrationTeam(
      id: string,
      overrides: Partial<import('../../domain/models').Team> = {}
    ) {
      const fallback = createStartingState()
      const seed = fallback.teams['t_nightwatch']!

      return {
        ...seed,
        id,
        name: overrides.name ?? id,
        memberIds: overrides.memberIds ?? seed.memberIds,
        agentIds: overrides.agentIds ?? seed.agentIds,
        leaderId: overrides.leaderId ?? seed.leaderId,
        tags: overrides.tags ?? [],
        ...overrides,
      }
    }

    function makeHydrationCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
      const fallback = createStartingState()
      const seed = fallback.cases['case-001']!

      return {
        ...seed,
        id,
        templateId: overrides.templateId ?? seed.templateId,
        title: overrides.title ?? id,
        assignedTeamIds: [],
        ...overrides,
      }
    }

    it('599 applies normalizeAgent field-level sanitization during hydrateGame import', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const baseAgent = fallback.agents[agentId]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 4,
          agents: {
            [agentId]: {
              ...baseAgent,
              fatigue: 999,
              equipment: { medkits: 1, phantom_gear: 3 },
              equipmentSlots: { primary: 'phantom_gear', utility1: 'medkits' },
              baseStats: {
                combat: Number.NaN,
                investigation: 200,
                utility: -5,
                social: 40,
              },
              progression: undefined,
              traits: undefined,
              abilities: undefined,
            },
          },
        },
        fallback
      )

      const agent = hydrated.agents[agentId]
      expect(agent?.progression).toBeDefined()
      expect(agent?.traits).toBeDefined()
      expect(agent?.abilities).toBeDefined()
      expect(agent?.vitals?.stress).toBe(100)
      expect(agent?.baseStats.investigation).toBe(100)
      expect(agent?.equipment).toEqual({ medkits: 1 })
      expect(agent?.equipmentSlots).toEqual({ utility1: 'medkits' })
    })

    it('600 reconciles agent assignments with sanitized teams, cases, and trainingQueue', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!
      const memberAgentId = Object.keys(fallback.agents)[1] ?? agentId
      const baseAgent = fallback.agents[agentId]!
      const teamId = 't_assignment_bundle'
      const caseId = 'case-assignment-bundle'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 5,
          agents: {
            ...fallback.agents,
            [agentId]: {
              ...baseAgent,
              assignment: {
                state: 'assigned',
                teamId,
                caseId,
                startedWeek: 4,
              },
            },
          },
          teams: {
            [teamId]: makeHydrationTeam(teamId, {
              memberIds: [agentId, memberAgentId, 'a_missing'],
              agentIds: [agentId, 'a_missing'],
              leaderId: agentId,
              status: {
                state: 'deployed',
                assignedCaseId: caseId,
              },
            }),
          },
          cases: {
            [caseId]: makeHydrationCase(caseId, {
              assignedTeamIds: [teamId],
              status: 'active',
            }),
          },
          trainingQueue: [
            {
              id: 'drill-bundle',
              trainingId: 'coordination-drill',
              scope: 'team',
              agentId,
              teamId,
              memberIds: [agentId, memberAgentId, 'a_missing'],
              remainingWeeks: 1,
              durationWeeks: 2,
            },
            {
              id: 'drill-stale-team',
              trainingId: 'coordination-drill',
              scope: 'team',
              agentId,
              teamId: 't_missing',
              memberIds: [agentId],
              remainingWeeks: 1,
              durationWeeks: 2,
            },
          ],
        },
        fallback
      )

      expect(hydrated.agents[agentId]?.assignment).toMatchObject({
        state: 'assigned',
        teamId,
        caseId,
      })
      expect(hydrated.agents[agentId]?.assignmentStatus).toMatchObject({
        state: 'assigned',
        teamId,
        caseId,
      })
      expect(hydrated.teams[teamId]?.memberIds).toEqual([agentId, memberAgentId])
      expect(hydrated.cases[caseId]?.assignedTeamIds).toEqual([teamId])
      expect(hydrated.trainingQueue).toEqual([
        expect.objectContaining({
          id: 'drill-bundle',
          teamId,
          memberIds: [agentId, memberAgentId],
        }),
      ])

      const staleAssignmentHydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          agents: {
            [agentId]: {
              ...baseAgent,
              assignment: {
                state: 'assigned',
                teamId,
                caseId,
                startedWeek: 2,
              },
            },
          },
          teams: {
            [teamId]: makeHydrationTeam(teamId, {
              memberIds: [agentId],
              agentIds: [agentId],
              leaderId: agentId,
            }),
          },
          cases: {
            [caseId]: makeHydrationCase(caseId, {
              assignedTeamIds: [],
              status: 'active',
            }),
          },
        },
        fallback
      )

      expect(staleAssignmentHydrated.teams[teamId]?.status?.assignedCaseId).toBeNull()
      expect(staleAssignmentHydrated.teams[teamId]?.status?.state).toBe('ready')
    })

    it('601 sanitizes team field-level records via sanitizeTeamsMap during hydrateGame', () => {
      const fallback = createStartingState()
      const teamId = 't_field_sanitize'
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          teams: {
            [teamId]: {
              ...makeHydrationTeam(teamId, {
                memberIds: [agentId],
                agentIds: [agentId],
                leaderId: agentId,
              }),
              category: 'rogue_cell',
              recoveryPressure: 999,
              compositionState: { compositionValid: false, stale: true },
              derivedStats: {
                overall: -50,
                fieldPower: 0,
                containment: 0,
                investigation: 0,
                support: 0,
                cohesion: 0,
                chemistryScore: 0,
                readiness: -50,
              },
            },
          },
        },
        fallback
      )

      const team = hydrated.teams[teamId]
      expect(team?.category).toBeUndefined()
      expect(team?.recoveryPressure).toBe(100)
      expect(team?.compositionState).toMatchObject({
        compositionValid: expect.any(Boolean),
        cohesion: expect.objectContaining({ cohesionScore: expect.any(Number) }),
      })
      expect(team?.derivedStats?.readiness).toBeGreaterThanOrEqual(0)
      expect(team?.deploymentReadinessState).toBeDefined()
    })

    it('602 mirrors memberIds to agentIds during hydrateGame team hydration', () => {
      const fallback = createStartingState()
      const teamId = 't_member_mirror_hydrate'
      const canonicalMember = Object.keys(fallback.agents)[0]!
      const staleAgent = Object.keys(fallback.agents)[1] ?? canonicalMember

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          teams: {
            [teamId]: {
              ...makeHydrationTeam(teamId),
              memberIds: [canonicalMember, 'a_missing'],
              agentIds: [staleAgent, 'a_missing'],
            },
          },
        },
        fallback
      )

      expect(hydrated.teams[teamId]?.memberIds).toEqual([canonicalMember])
      expect(hydrated.teams[teamId]?.agentIds).toEqual([canonicalMember])
    })

    it('603 normalizes case instances via normalizeCaseInstance instead of shape-only cast', () => {
      const fallback = createStartingState()
      const legacyId = 'case-normalize-field'
      const invalidBeliefId = 'case-belief-invalid'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 6,
          cases: {
            [legacyId]: {
              ...makeHydrationCase(legacyId),
              stage: 99,
              threatFamily: 'bio' as CaseInstance['threatFamily'],
              beliefTracks: {
                factTruth: 'explosive',
                witnessInterpretation: 'clear',
                institutionalJudgment: 'clear',
                crowdConsensus: 'clear',
              },
            },
            [invalidBeliefId]: {
              ...makeHydrationCase(invalidBeliefId),
              threatFamily: 'cosmic_horror' as CaseInstance['threatFamily'],
              beliefTracks: 'invalid' as unknown as CaseInstance['beliefTracks'],
            },
          },
        },
        fallback
      )

      expect(hydrated.cases[legacyId]?.stage).toBe(MAX_CASE_STAGE)
      expect(hydrated.cases[legacyId]?.threatFamily).toBe(LEGACY_THREAT_FAMILY_ALIASES.bio)
      expect(hydrated.cases[legacyId]?.beliefTracks?.factTruth).toBe('clear')
      expect(hydrated.cases[invalidBeliefId]?.threatFamily).toBeUndefined()
      expect(hydrated.cases[invalidBeliefId]?.beliefTracks).toBeUndefined()
    })

    it('604 reconciles case assignedTeamIds and team.status assignedCaseId bidirectionally', () => {
      const fallback = createStartingState()
      const teamId = 't_bidirectional'
      const caseId = 'case-bidirectional'
      const orphanCaseId = 'case-orphan-roster'
      const agentId = Object.keys(fallback.agents)[0]!

      const aligned = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [caseId]: makeHydrationCase(caseId, {
              assignedTeamIds: [teamId],
              status: 'active',
            }),
          },
          teams: {
            [teamId]: {
              ...makeHydrationTeam(teamId, {
                memberIds: [agentId],
                agentIds: [agentId],
                leaderId: agentId,
              }),
              status: {
                state: 'deployed',
                assignedCaseId: caseId,
              },
            },
          },
        },
        fallback
      )

      expect(aligned.cases[caseId]?.assignedTeamIds).toEqual([teamId])
      expect(aligned.teams[teamId]?.status?.assignedCaseId).toBe(caseId)

      const danglingTeam = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          cases: {
            [orphanCaseId]: makeHydrationCase(orphanCaseId, {
              assignedTeamIds: [],
              status: 'active',
            }),
          },
          teams: {
            [teamId]: {
              ...makeHydrationTeam(teamId, {
                memberIds: [agentId],
                agentIds: [agentId],
                leaderId: agentId,
              }),
              status: {
                state: 'deployed',
                assignedCaseId: orphanCaseId,
              },
            },
          },
        },
        fallback
      )

      expect(danglingTeam.teams[teamId]?.status?.assignedCaseId).toBeNull()
      expect(danglingTeam.teams[teamId]?.status?.state).toBe('ready')
    })

    it('605 sanitizes candidates array and mirrors recruitmentPool on hydrateGame', () => {
      const fallback = createStartingState()
      const valid = buildAgentCandidate({ id: 'cand-605-valid' })
      const duplicate = buildAgentCandidate({ id: 'cand-605-valid', name: 'Duplicate Name' })
      const invalid = {
        id: 'cand-605-invalid',
        name: 'Invalid',
        age: 20,
        category: 'agent',
        hireStatus: 'available',
        revealLevel: 0,
        expiryWeek: 4,
        evaluation: {},
      }

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 3,
          candidates: [valid, duplicate, invalid],
        },
        fallback
      )

      expect(hydrated.candidates).toHaveLength(1)
      expect(hydrated.candidates[0]?.id).toBe('cand-605-valid')
      expect(hydrated.recruitmentPool).toEqual(hydrated.candidates)

      const poolFallback = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          candidates: [],
          recruitmentPool: [buildAgentCandidate({ id: 'cand-605-pool' })],
        },
        fallback
      )

      expect(poolFallback.candidates.map((candidate) => candidate.id)).toEqual(['cand-605-pool'])
      expect(poolFallback.recruitmentPool).toEqual(poolFallback.candidates)
    })

    it('606 sanitizes contracts when persisted key is present on hydrateGame', () => {
      const fallback = createStartingState()
      const { contracts: legacyContracts, ...legacyPayload } = stripGameTemplates(fallback)
      void legacyContracts
      const seedOffer = getContractOffers(fallback)[0]!

      const legacy = hydrateGame(legacyPayload, fallback)

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          week: 4,
          cases: {
            'case-contract-606': {
              ...fallback.cases['case-001']!,
              id: 'case-contract-606',
              title: 'case-contract-606',
              contract: { templateId: seedOffer.templateId, offerId: seedOffer.id },
            },
          },
          contracts: {
            generatedWeek: 1,
            offers: [
              seedOffer,
              {
                ...seedOffer,
                id: 'offer-bad-template',
                templateId: 'phantom-template',
              },
            ],
            history: {
              [seedOffer.templateId]: {
                completions: -2,
                bestOutcome: 'bogus',
                lastOutcome: 'success',
                lastCompletedWeek: 99,
              },
            },
            unlockedResearchIds: [],
            active: {
              'stale-key': {
                contractId: 'other-case',
                caseId: 'case-contract-606',
                offerId: seedOffer.id,
                templateId: seedOffer.templateId,
                startedWeek: 99,
              },
            },
          },
        },
        fallback
      )

      expect(legacy.contracts).toBeUndefined()
      expect(hydrated.contracts).toBeDefined()
      expect(hydrated.contracts?.offers).toHaveLength(1)
      expect(hydrated.contracts?.offers[0]?.id).toBe(seedOffer.id)
      expect(hydrated.contracts?.history[seedOffer.templateId]).toEqual({
        completions: 0,
        bestOutcome: 'none',
        lastOutcome: 'success',
        lastCompletedWeek: 4,
      })
      expect(hydrated.contracts?.active).toEqual({
        'case-contract-606': expect.objectContaining({
          contractId: 'case-contract-606',
          caseId: 'case-contract-606',
          offerId: seedOffer.id,
          startedWeek: 4,
        }),
      })
    })
  })

  describe('hydration problems 607-614', () => {
    it('607 validates research project progress and prerequisite fields', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 8,
        researchState: {
          projects: {
            'proj-a': {
              projectId: 'proj-a',
              status: 'active',
              costTime: 4,
              costData: 2,
              costMaterials: 1,
              progressTime: 99,
              progressData: 9,
              progressMaterials: 5,
              requiredResearchIds: ['proj-a', 'phantom', 'proj-b'],
              unlocks: [
                { id: '', label: 'Bad' },
                { id: 'unlock-1', label: 'Valid', category: 'intel_tool' },
              ],
            },
            'proj-b': {
              projectId: 'proj-b',
              status: 'locked',
              costTime: 1,
              costData: 0,
              costMaterials: 0,
              unlocks: [],
            },
          },
          activeProjectIds: [],
          queuedProjectIds: [],
          completedProjectIds: [],
          availableProjectIds: [],
          blockedProjectIds: [],
          researchSlots: 1,
          researchSpeedMultiplier: 1,
          researchDataPool: 0,
          researchMaterialsPool: 0,
        },
      })

      const project = hydrated.researchState?.projects['proj-a']
      expect(project?.progressTime).toBe(4)
      expect(project?.progressData).toBe(2)
      expect(project?.progressMaterials).toBe(1)
      expect(project?.requiredResearchIds).toEqual(['proj-b'])
      expect(project?.unlocks).toEqual([{ id: 'unlock-1', label: 'Valid', category: 'intel_tool' }])
    })

    it('608 reconciles project ID lists from project.status', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        researchState: {
          projects: {
            'proj-active': {
              projectId: 'proj-active',
              status: 'active',
              costTime: 1,
              costData: 0,
              costMaterials: 0,
              unlocks: [],
            },
            'proj-queued': {
              projectId: 'proj-queued',
              status: 'queued',
              costTime: 1,
              costData: 0,
              costMaterials: 0,
              unlocks: [],
            },
            'proj-done': {
              projectId: 'proj-done',
              status: 'completed',
              costTime: 1,
              costData: 0,
              costMaterials: 0,
              unlocks: [],
            },
          },
          activeProjectIds: ['proj-done', 'phantom'],
          queuedProjectIds: ['proj-active'],
          completedProjectIds: ['proj-queued'],
          availableProjectIds: ['proj-active'],
          blockedProjectIds: [],
          researchSlots: 1,
          researchSpeedMultiplier: 1,
          researchDataPool: 0,
          researchMaterialsPool: 0,
        },
      })

      expect(hydrated.researchState?.activeProjectIds).toEqual(['proj-active'])
      expect(hydrated.researchState?.queuedProjectIds).toEqual(['proj-queued'])
      expect(hydrated.researchState?.completedProjectIds).toEqual(['proj-done'])
      expect(hydrated.researchState?.availableProjectIds).toEqual([])
    })

    it('609 clamps research scalar pools and multipliers', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        researchState: {
          projects: {},
          activeProjectIds: [],
          queuedProjectIds: [],
          completedProjectIds: [],
          availableProjectIds: [],
          blockedProjectIds: [],
          researchSlots: 0,
          researchSpeedMultiplier: 0.01,
          researchDataPool: -50,
          researchMaterialsPool: 2_000_000,
        },
      })

      expect(hydrated.researchState?.researchSlots).toBe(1)
      expect(hydrated.researchState?.researchSpeedMultiplier).toBe(0.1)
      expect(hydrated.researchState?.researchDataPool).toBe(0)
      expect(hydrated.researchState?.researchMaterialsPool).toBe(1_000_000)
    })

    it('610 applies sanitized facility research effects during hydration', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        researchState: {
          projects: {
            'proj-gated': {
              projectId: 'proj-gated',
              status: 'locked',
              costTime: 1,
              costData: 0,
              costMaterials: 0,
              requiredFacilityLevels: [{ facilityId: 'research_lab', level: 3 }],
              unlocks: [],
            },
          },
          activeProjectIds: [],
          queuedProjectIds: [],
          completedProjectIds: [],
          availableProjectIds: [],
          blockedProjectIds: [],
          researchSlots: 2,
          researchSpeedMultiplier: 1,
          researchDataPool: 0,
          researchMaterialsPool: 0,
        },
        facilityState: {
          facilities: {
            research_lab: {
              facilityId: 'research_lab',
              category: 'research_lab',
              level: 1,
              maxLevel: 5,
              status: 'active',
              effects: { researchSlots: 2, researchSpeedMultiplier: 2 },
            },
          },
        },
      })

      expect(hydrated.researchState?.researchSlots).toBe(4)
      expect(hydrated.researchState?.researchSpeedMultiplier).toBe(2)
      expect(hydrated.researchState?.projects['proj-gated']?.status).toBe('blocked')
      expect(hydrated.researchState?.blockedProjectIds).toEqual(['proj-gated'])
    })

    it('611 sanitizes external support assets on full hydrateGame import', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        externalSupportAssets: {
          'asset-live': {
            id: 'asset-live',
            label: ' Courier ',
            assetClass: 'auxiliary',
            reliability: 150,
            tags: [' courier ', 'courier'],
          },
          'asset-bad': {
            id: 'other',
            label: 'Bad',
            assetClass: 'contractor',
            reliability: 50,
            tags: [],
          },
        },
      })

      expect(hydrated.externalSupportAssets).toEqual({
        'asset-live': {
          id: 'asset-live',
          label: 'Courier',
          assetClass: 'auxiliary',
          reliability: 100,
          tags: ['courier'],
        },
      })
    })

    it('612 sanitizes relationship history against live agents', () => {
      const fallback = createStartingState()
      const [agentAId, agentBId] = Object.keys(fallback.agents)

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 7,
        relationshipHistory: [
          {
            week: 7,
            agentAId,
            agentBId,
            value: 2.5,
            modifiers: [' bonded '],
            reason: 'mission_success',
          },
          {
            week: 7,
            agentAId,
            agentBId: agentAId,
            value: 0,
            modifiers: [],
          },
        ],
      })

      expect(hydrated.relationshipHistory).toHaveLength(1)
      expect(hydrated.relationshipHistory?.[0]).toMatchObject({
        week: 7,
        agentAId,
        agentBId,
        value: 2,
        modifiers: ['bonded'],
        reason: 'mission_success',
      })
    })

    it('613 validates squad metadata and kit assignments on hydrateGame', () => {
      const fallback = createStartingState()
      const teamId = 't_nightwatch'
      const leaderAgentId = fallback.teams[teamId]!.leaderId

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        squadMetadata: {
          [teamId]: {
            squadId: teamId,
            name: ' Night Watch ',
            role: 'response',
            doctrine: 'containment',
            shift: 'night',
            assignedZone: 'hub',
            designatedLeaderId: leaderAgentId,
          },
          'ghost-team': {
            squadId: 'ghost-team',
            name: 'Ghost',
            role: 'x',
            doctrine: 'x',
            shift: 'x',
            assignedZone: 'x',
            designatedLeaderId: leaderAgentId,
          },
        },
        squadKitTemplates: {
          'kit-alpha': {
            id: 'kit-alpha',
            label: ' Alpha ',
            requiredItemTags: ['medical'],
            minCoveredCount: 1,
          },
        },
        squadKitAssignments: {
          [teamId]: { squadId: teamId, kitTemplateId: 'kit-alpha' },
          'ghost-team': { squadId: 'ghost-team', kitTemplateId: 'kit-alpha' },
        },
      })

      expect(hydrated.squadMetadata?.[teamId]?.name).toBe('Night Watch')
      expect(hydrated.squadMetadata?.['ghost-team']).toBeUndefined()
      expect(hydrated.squadKitAssignments?.[teamId]?.kitTemplateId).toBe('kit-alpha')
      expect(hydrated.squadKitAssignments?.['ghost-team']).toBeUndefined()
    })

    it('614 rebuilds the top-level globalFlags mirror from runtimeState', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        globalFlags: {
          'legacy.flag': true,
          'shared.flag': 'legacy',
          badNested: { nested: true },
        },
        runtimeState: {
          ...fallback.runtimeState!,
          globalFlags: {
            'shared.flag': 'runtime',
            'runtime.flag': 3,
          },
        },
      })

      expect(hydrated.runtimeState?.globalFlags).toEqual({
        'legacy.flag': true,
        'shared.flag': 'runtime',
        'runtime.flag': 3,
      })
      expect(hydrated.globalFlags).toEqual(hydrated.runtimeState?.globalFlags)
      expect(hydrated.globalFlags).not.toHaveProperty('badNested')
    })
  })

  describe('hydration problems 615-622', () => {
    it('615 keeps explicit staff on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()
      const agentId = Object.keys(fallback.agents)[0]!

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          week: 3,
          staff: {
            'staff-support': {
              specialty: 'analysis',
              efficiency: 55,
              junkField: 'strip-me',
            },
            'staff-instructor': {
              role: 'instructor',
              name: 'Coach',
              efficiency: 70,
              instructorSpecialty: 'investigation',
              assignedAgentId: agentId,
            },
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.staff['staff-support']).toEqual({
        specialty: 'analysis',
        efficiency: 55,
      })
      expect(hydrated.staff['staff-instructor']).toMatchObject({
        role: 'instructor',
        name: 'Coach',
        assignedAgentId: agentId,
      })
      expect(hydrated.staff['staff-support']).not.toHaveProperty('junkField')
    })

    it('616 reconciles agency containment, clearance, and funding from top-level mirrors', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        containmentRating: 42,
        clearanceLevel: 3,
        funding: 18_000,
        agency: {
          ...fallback.agency!,
          bogusAgencyField: 'strip-me',
          containmentRating: 1,
          clearanceLevel: 1,
          funding: 100,
          fundingState: {
            ...fallback.agency!.fundingState,
            funding: 100,
          },
        },
      })

      expect(hydrated.containmentRating).toBe(42)
      expect(hydrated.clearanceLevel).toBe(3)
      expect(hydrated.funding).toBe(18_000)
      expect(hydrated.agency?.containmentRating).toBe(42)
      expect(hydrated.agency?.clearanceLevel).toBe(3)
      expect(hydrated.agency?.funding).toBe(18_000)
      expect(hydrated.agency?.fundingState.funding).toBe(18_000)
      expect(hydrated.agency).not.toHaveProperty('bogusAgencyField')
    })

    it('617 reconciles supportAvailable and clamps maintenanceSpecialistsAvailable', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        supportAvailable: 1,
        agency: {
          ...fallback.agency!,
          supportAvailable: 7,
          maintenanceSpecialistsAvailable: 250,
        },
      })

      expect(hydrated.supportAvailable).toBe(7)
      expect(hydrated.agency?.supportAvailable).toBe(7)
      expect(hydrated.agency?.maintenanceSpecialistsAvailable).toBe(99)
    })

    it('618 sanitizes courierShellFront through agency hydrate', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        agency: {
          ...fallback.agency!,
          courierShellFront: {
            type: 'courierShell',
            status: 'bogus' as 'active',
            startedWeek: 9,
            startupCostPaid: 400,
            lastResolvedWeek: 0,
            exposureBand: 'bogus' as 'low',
            collapseReason: 'should-strip',
          },
        },
      })

      expect(hydrated.agency?.courierShellFront).toMatchObject({
        type: 'courierShell',
        status: 'active',
        startedWeek: 5,
        lastResolvedWeek: 5,
        exposureBand: 'low',
        startupCostPaid: 400,
      })
      expect(hydrated.agency?.courierShellFront).not.toHaveProperty('collapseReason')
    })

    it('619 mirrors coordination friction from agency to top-level', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        coordinationFrictionActive: false,
        coordinationFrictionReason: 'stale top-level',
        agency: {
          ...fallback.agency!,
          coordinationFrictionActive: true,
          coordinationFrictionReason: 'command overload',
        },
      })

      expect(hydrated.coordinationFrictionActive).toBe(true)
      expect(hydrated.coordinationFrictionReason).toBe('command overload')
      expect(hydrated.agency?.coordinationFrictionActive).toBe(true)
      expect(hydrated.agency?.coordinationFrictionReason).toBe('command overload')
    })

    it('620 sanitizes responseGrid template ids against the hydrated template catalog', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        responseGrid: {
          majorIncidentThreshold: 2,
          majorIncidentTemplateIds: ['raid-001', 'phantom-grid-only'],
          pressureDecayPerWeek: 1,
        },
        agency: {
          ...fallback.agency!,
          progressionUnlockIds: ['phantom-unlock'],
        },
      })

      expect(hydrated.agency?.progressionUnlockIds).toBeUndefined()
      expect(hydrated.responseGrid?.majorIncidentThreshold).toBe(2)
      expect(hydrated.responseGrid?.majorIncidentTemplateIds).toEqual(['raid-001'])
    })

    it('621 caps directive history to campaign week, dedupes, and sorts by week', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        directiveState: {
          selectedId: 'intel-surge',
          history: [
            { week: 9, directiveId: 'intel-surge' },
            { week: 3, directiveId: 'recovery-rotation' },
            { week: 3, directiveId: 'procurement-push' },
            { week: 5, directiveId: 'lockdown-protocol' },
          ],
        },
      })

      expect(hydrated.directiveState.history).toEqual([
        { week: 3, directiveId: 'procurement-push' },
        { week: 5, directiveId: 'lockdown-protocol' },
      ])
      expect(hydrated.directiveState.selectedId).toBe('lockdown-protocol')
    })

    it('622 clears gameOverReason when gameOver is false and allowlists terminal reasons', () => {
      const fallback = createStartingState()

      const cleared = hydrateGame({
        ...stripGameTemplates(fallback),
        gameOver: false,
        gameOverReason: 'Custom stale reason',
      })

      expect(cleared.gameOver).toBe(false)
      expect(cleared.gameOverReason).toBeUndefined()

      const bounded = hydrateGame({
        ...stripGameTemplates(fallback),
        gameOver: true,
        gameOverReason: 'not a canonical reason',
      })

      expect(bounded.gameOver).toBe(true)
      expect(bounded.gameOverReason).toBe(GAME_OVER_REASONS.breachState)

      const valid = hydrateGame({
        ...stripGameTemplates(fallback),
        gameOver: true,
        gameOverReason: GAME_OVER_REASONS.capExceeded,
      })

      expect(valid.gameOverReason).toBe(GAME_OVER_REASONS.capExceeded)
    })
  })

  describe('hydration problems 623-630', () => {
    it('623 keeps explicit legitimacy on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()

      const invalid = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          legitimacy: {
            sanctionLevel: 'bogus',
            falloutRisk: 'explosive',
            accessReason: 'stale',
          },
        } as typeof fallback,
        fallback
      )

      expect(invalid).not.toHaveProperty('unknownHydrationProbe')
      expect(invalid.legitimacy).toBeUndefined()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          legitimacy: {
            sanctionLevel: 'sanctioned',
            falloutRisk: 'risk',
            accessReason: '  audit posture  ',
            junkField: 'strip-me',
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.legitimacy).toEqual({
        sanctionLevel: 'sanctioned',
        falloutRisk: 'risk',
        accessReason: 'audit posture',
      })
      expect(hydrated.legitimacy).not.toHaveProperty('junkField')
    })

    it('624 keeps explicit districtScheduleState on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()
      const haven = buildHavenSchedule()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          week: 4,
          districtScheduleState: {
            settlementId: '  haven  ',
            districts: {
              hub: haven.districts.hub,
              orphan: {
                id: 'orphan',
                label: 'Orphan',
                encounterFamilyTags: ['test'],
                escalationModifiers: { stage_delta: 1 },
                authorityResponseProfile: 'standard',
              },
            },
            timeBands: {
              morning: haven.timeBands.morning,
            },
            events: [
              {
                ...haven.events[0]!,
                appliesTo: ['hub', 'missing-district'],
              },
              {
                id: 'bad-event',
                label: 'Bad',
                appliesTo: ['missing-only'],
                startWeek: 1,
                endWeek: 2,
                trafficModifier: {},
                seedKey: 'bad',
              },
            ],
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.districtScheduleState?.settlementId).toBe('haven')
      expect(hydrated.districtScheduleState?.districts.hub).toBeDefined()
      expect(hydrated.districtScheduleState?.districts.orphan).toBeDefined()
      expect(hydrated.districtScheduleState?.events).toHaveLength(1)
      expect(hydrated.districtScheduleState?.events[0]?.appliesTo).toEqual(['hub'])
    })

    it('625 keeps explicit caseQueue on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()
      const openCaseId = Object.keys(fallback.cases)[0]!
      const resolvedCaseId = 'case-resolved-queue-625'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          cases: {
            ...fallback.cases,
            [resolvedCaseId]: {
              ...fallback.cases[openCaseId]!,
              id: resolvedCaseId,
              status: 'resolved',
            },
          },
          caseQueue: {
            queuedCaseIds: ['case-missing-625', openCaseId, resolvedCaseId, openCaseId],
            priorities: {
              [openCaseId]: 'critical',
              [resolvedCaseId]: 'high',
              'case-missing-625': 'low',
              'orphan-priority-only': 'bogus' as 'normal',
            },
            junkField: 'strip-me',
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.caseQueue?.queuedCaseIds).toEqual([openCaseId])
      expect(hydrated.caseQueue?.priorities).toEqual({ [openCaseId]: 'critical' })
      expect(hydrated.caseQueue).not.toHaveProperty('junkField')
    })

    it('626 keeps explicit global pressure scalars on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          globalPressure: Number.NaN,
          globalEscalationLevel: 99,
          globalThreatDrift: -4,
          globalTimePressure: 6,
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.globalPressure).toBeUndefined()
      expect(hydrated.globalEscalationLevel).toBe(8)
      expect(hydrated.globalThreatDrift).toBe(0)
      expect(hydrated.globalTimePressure).toBe(6)
    })

    it('627 keeps explicit supportStaff on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          supportStaff: {
            admin: 2,
            logistics: 3,
            medical: 1,
            intel: 0,
            total: 99,
            pressure: 150,
            junkField: 'strip-me',
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.supportStaff).toEqual({
        admin: 2,
        logistics: 3,
        medical: 1,
        intel: 0,
        total: 6,
        pressure: 100,
      })
      expect(hydrated.supportStaff).not.toHaveProperty('junkField')
    })

    it('628 keeps explicit missionRouting on hydrateGame; recomputeAttrition may overwrite triage fields', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]!
      const teamId = Object.keys(fallback.teams)[0]!
      const missingTeamId = 'team-missing-routing-628'

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          week: 6,
          missionRouting: {
            orderedMissionIds: [caseId, 'case-missing-628', caseId],
            nextGeneratedSequence: 999999,
            missions: {
              [caseId]: {
                missionId: caseId,
                templateId: fallback.cases[caseId]!.templateId,
                category: 'strategic_opportunity',
                kind: 'case',
                status: 'open',
                generatedWeek: 99,
                deadlineRemaining: 2,
                durationWeeks: 2,
                stage: 1,
                difficulty: fallback.cases[caseId]!.difficulty,
                weights: fallback.cases[caseId]!.weights,
                requiredTags: [],
                preferredTags: [],
                assignedTeamIds: [missingTeamId],
                intakeSource: 'bogus',
                priority: 'bogus',
                priorityReasonCodes: ['stale'],
                triageScore: 500,
                routingState: 'bogus',
                routingBlockers: ['not-a-blocker'],
                lastTriageWeek: 99,
                lastRoutedWeek: 99,
                lastCandidateTeamIds: [missingTeamId, teamId, teamId],
                lastRejectedTeamIds: [
                  { teamId: missingTeamId, reasonCode: 'not-a-blocker' },
                  { teamId, reasonCode: 'fatigue-over-threshold' },
                ],
              },
            },
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.missionRouting).toBeDefined()
      expect(hydrated.missionRouting?.orderedMissionIds).not.toContain('case-missing-628')
      expect(hydrated.missionRouting?.missions['case-missing-628']).toBeUndefined()

      const mission = hydrated.missionRouting?.missions[caseId]
      expect(mission).toBeDefined()
      expect(mission?.generatedWeek).toBe(6)
      expect(mission?.lastCandidateTeamIds).toContain(teamId)
      expect(mission?.lastCandidateTeamIds).not.toContain(missingTeamId)
      expect(mission?.lastRejectedTeamIds?.every((entry) => entry.teamId in fallback.teams)).toBe(
        true
      )
      expect(
        mission?.lastRejectedTeamIds?.some((entry) => entry.reasonCode === 'not-a-blocker')
      ).toBe(false)
      expect(mission?.routingState).not.toBe('bogus')
      expect(mission?.routingBlockers).not.toContain('not-a-blocker')
      expect(hydrated.missionRouting?.nextGeneratedSequence).toBeGreaterThanOrEqual(
        (hydrated.missionRouting?.orderedMissionIds.length ?? 0) + 1
      )
    })

    it('629 keeps explicit replacementPressureState on hydrateGame; recomputeAttrition rebuilds derived scalars', () => {
      const fallback = createStartingState()
      fallback.agents['a_kellan'] = {
        ...fallback.agents['a_kellan']!,
        attritionState: {
          attritionStatus: 'lost',
          lossReasonCodes: ['hydration-629'],
          replacementPriority: 1,
          retentionPressure: 0,
        },
      }

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          week: 3,
          replacementPressureState: {
            replacementPressure: Number.NaN,
            staffingGap: -4,
            activeLossCount: 1,
            criticalRoleLossCount: 0,
            replacementBacklog: [{ bogus: true }],
            reasonCodes: ['  ', 'staffing-gap:1', 'staffing-gap:1'],
            recruitmentPriorityBand: 'bogus',
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.replacementPressureState).toEqual(buildReplacementPressureState(hydrated))
      expect(hydrated.replacementPressureState?.replacementBacklog).toEqual([])
      expect(Number.isFinite(hydrated.replacementPressureState?.replacementPressure ?? NaN)).toBe(
        true
      )
    })

    it('630 keeps explicit knowledge on hydrateGame after unknown top-level fields are dropped', () => {
      const fallback = createStartingState()
      const teamId = Object.keys(fallback.teams)[0]!
      const subjectId = 'anomaly-630'
      const key = getKnowledgeKey(teamId, subjectId)

      const hydrated = hydrateGame(
        {
          ...stripGameTemplates(fallback),
          unknownHydrationProbe: 'drop-me',
          week: 5,
          knowledge: {
            'wrong-key': {
              tier: 'confirmed',
              entityId: teamId,
              subjectId,
              subjectType: 'anomaly',
              lastConfirmedWeek: 99,
            },
            bogus: {
              tier: 'explosive',
              entityId: '',
              subjectId: 'x',
            },
            [key]: {
              tier: 'partial',
              entityId: teamId,
              subjectId,
              subjectType: 'anomaly',
              lastDecayedWeek: 12,
            },
          },
        } as typeof fallback,
        fallback
      )

      expect(hydrated).not.toHaveProperty('unknownHydrationProbe')
      expect(hydrated.knowledge[key]).toMatchObject({
        tier: 'partial',
        entityId: teamId,
        subjectId,
        lastDecayedWeek: 5,
      })
      expect(hydrated.knowledge.bogus).toBeUndefined()
      expect(hydrated.knowledge['wrong-key']).toBeUndefined()
    })
  })

  describe('hydration problems 631-638', () => {
    it('631 preserves locked encounter status during runtime hydration', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-locked': {
              encounterId: 'enc-locked',
              status: 'locked',
              lastUpdatedWeek: 6,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.encounterState['enc-locked']?.status).toBe('locked')
    })

    it('632 preserves failed and dismissed resolution outcomes', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-failed': {
              encounterId: 'enc-failed',
              status: 'resolved',
              startedWeek: 4,
              resolvedWeek: 6,
              latestOutcome: 'failed',
              lastUpdatedWeek: 6,
            },
            'enc-dismissed': {
              encounterId: 'enc-dismissed',
              status: 'resolved',
              startedWeek: 5,
              resolvedWeek: 6,
              latestOutcome: 'dismissed',
              lastUpdatedWeek: 6,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.encounterState['enc-failed']?.latestOutcome).toBe('failed')
      expect(hydrated.runtimeState?.encounterState['enc-dismissed']?.latestOutcome).toBe(
        'dismissed'
      )
    })

    it('633 trims and dedupes runtime queue entry ids', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        runtimeState: {
          ...fallback.runtimeState!,
          eventQueue: {
            entries: [
              {
                id: ' qevt-0003 ',
                type: 'authored.follow_up',
                targetId: 'frontdesk.notice.weekly-report.returning',
                week: 4,
              },
              {
                id: 'qevt-0003',
                type: 'authored.follow_up',
                targetId: 'frontdesk.notice.weekly-report.returning',
                week: 4,
              },
            ],
            nextSequence: 1,
          },
        },
      })

      expect(hydrated.runtimeState?.eventQueue.entries.map((entry) => entry.id)).toEqual([
        'qevt-0003',
        'qevt-0003-dup-2',
      ])
    })

    it('634 caps queued event week to the campaign week', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        runtimeState: {
          ...fallback.runtimeState!,
          eventQueue: {
            entries: [
              {
                id: 'qevt-0001',
                type: 'authored.follow_up',
                targetId: 'frontdesk.notice.weekly-report.returning',
                week: 88,
              },
            ],
            nextSequence: 1,
          },
        },
      })

      expect(hydrated.runtimeState?.eventQueue.entries[0]?.week).toBe(5)
    })

    it('635 recomputes nextSequence from max retained qevt suffix', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        runtimeState: {
          ...fallback.runtimeState!,
          eventQueue: {
            entries: [
              {
                id: 'qevt-0011',
                type: 'authored.follow_up',
                targetId: 'frontdesk.notice.weekly-report.returning',
              },
            ],
            nextSequence: 2,
          },
        },
      })

      expect(hydrated.runtimeState?.eventQueue.nextSequence).toBe(12)
    })

    it('636 sanitizes ui debug weeks with campaign week not week 1', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 12,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            authoring: {
              updatedWeek: 44,
            },
            debug: {
              enabled: true,
              flags: {},
              eventLog: [
                {
                  id: 'devlog-0020',
                  week: 99,
                  type: 'flag.set',
                  summary: 'Stale developer log week.',
                },
              ],
              nextEventSequence: 3,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.ui.authoring?.updatedWeek).toBe(12)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.week).toBe(12)
      expect(hydrated.runtimeState?.ui.debug.nextEventSequence).toBe(21)
    })

    it('637 drops malformed one-shots without seen:true and keeps consumed records', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 7,
        runtimeState: {
          ...fallback.runtimeState!,
          oneShotEvents: {
            'event.consumed': true,
            'event.explicit': {
              seen: true,
              firstSeenWeek: 2,
              source: 'intro',
            },
            'event.reset': {
              seen: false,
              firstSeenWeek: 2,
            },
            'event.malformed': {
              firstSeenWeek: 2,
            },
            'event.junk': 'legacy-string',
          },
        },
      })

      const oneShots = hydrated.runtimeState?.oneShotEvents ?? {}

      expect(oneShots['event.consumed']).toMatchObject({ seen: true, firstSeenWeek: 7 })
      expect(oneShots['event.explicit']).toMatchObject({
        seen: true,
        firstSeenWeek: 2,
        source: 'intro',
      })
      expect(oneShots['event.reset']).toBeUndefined()
      expect(oneShots['event.malformed']).toBeUndefined()
      expect(oneShots['event.junk']).toBeUndefined()
    })

    it('638 caps completedAtWeek and drops it for incomplete progress clocks', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        runtimeState: {
          ...fallback.runtimeState!,
          progressClocks: {
            'story.clock-complete': {
              id: 'story.clock-complete',
              label: 'Complete',
              value: 4,
              max: 4,
              completedAtWeek: 60,
            },
            'story.clock-open': {
              id: 'story.clock-open',
              label: 'Open',
              value: 2,
              max: 4,
              completedAtWeek: 40,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.progressClocks['story.clock-complete']?.completedAtWeek).toBe(5)
      expect(
        hydrated.runtimeState?.progressClocks['story.clock-open']?.completedAtWeek
      ).toBeUndefined()
    })
  })

  describe('hydration problems 639-646', () => {
    it('639 caps currentLocation.updatedWeek to the campaign week during hydration', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        runtimeState: {
          ...fallback.runtimeState!,
          currentLocation: {
            hubId: 'operations-desk',
            locationId: 'operations-desk',
            sceneId: 'dashboard',
            updatedWeek: 88,
          },
        },
      })

      expect(hydrated.runtimeState?.currentLocation.updatedWeek).toBe(4)
    })

    it('640 caps, sorts, and dedupes scene history by location/scene/week', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        runtimeState: {
          ...fallback.runtimeState!,
          sceneHistory: [
            { sceneId: 'dashboard', locationId: 'operations-desk', week: 9 },
            { sceneId: 'weekly-report', locationId: 'front-desk', week: 2 },
            { sceneId: 'dashboard', locationId: 'operations-desk', week: 9, outcome: 'latest' },
            { sceneId: 'weekly-report', locationId: 'front-desk', week: 4 },
          ],
        },
      })

      expect(hydrated.runtimeState?.sceneHistory).toEqual([
        { sceneId: 'weekly-report', locationId: 'front-desk', week: 2 },
        { sceneId: 'weekly-report', locationId: 'front-desk', week: 4 },
        {
          sceneId: 'dashboard',
          locationId: 'operations-desk',
          week: 6,
          outcome: 'latest',
        },
      ])
    })

    it('641 extends encounter chronology repair with campaign-week caps and started<=resolved', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 7,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-archived-gap': {
              encounterId: 'enc-archived-gap',
              status: 'archived',
              startedWeek: 9,
              resolvedWeek: 3,
              lastUpdatedWeek: 20,
            },
            'enc-resolved-future': {
              encounterId: 'enc-resolved-future',
              status: 'resolved',
              startedWeek: 2,
              resolvedWeek: 12,
              latestOutcome: 'partial',
              lastUpdatedWeek: 15,
            },
          },
        },
      })

      const archived = hydrated.runtimeState?.encounterState['enc-archived-gap']
      expect(archived?.startedWeek).toBe(7)
      expect(archived?.resolvedWeek).toBe(7)
      expect(archived?.lastUpdatedWeek).toBe(7)

      const resolved = hydrated.runtimeState?.encounterState['enc-resolved-future']
      expect(resolved?.startedWeek).toBe(2)
      expect(resolved?.resolvedWeek).toBe(7)
      expect(resolved?.lastUpdatedWeek).toBe(7)
    })

    it('642 removes hidden modifiers that overlap revealed lists with revealed winning', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-overlap': {
              encounterId: 'enc-overlap',
              status: 'active',
              hiddenModifierIds: ['latent-surge', 'shared-tail', 'hidden-only'],
              revealedModifierIds: ['shared-tail', 'known-faction-tail'],
              lastUpdatedWeek: 3,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.encounterState['enc-overlap']).toMatchObject({
        hiddenModifierIds: ['latent-surge', 'hidden-only'],
        revealedModifierIds: ['shared-tail', 'known-faction-tail'],
      })
    })

    it('643 clears stale UI selections and keeps valid entity references', () => {
      const fallback = createStartingState()
      const caseId = Object.keys(fallback.cases)[0]
      const teamId = Object.keys(fallback.teams)[0]
      const agentId = Object.keys(fallback.agents)[0]

      const stale = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            selectedCaseId: 'missing-case',
            selectedTeamId: 'missing-team',
            selectedAgentId: 'missing-agent',
            selectedLocationId: 'nowhere',
            selectedSceneId: 'missing-scene',
          },
        },
      })

      expect(stale.runtimeState?.ui.selectedCaseId).toBeUndefined()
      expect(stale.runtimeState?.ui.selectedTeamId).toBeUndefined()
      expect(stale.runtimeState?.ui.selectedAgentId).toBeUndefined()
      expect(stale.runtimeState?.ui.selectedLocationId).toBe('operations-desk')
      expect(stale.runtimeState?.ui.selectedSceneId).toBe('dashboard')

      const valid = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            selectedCaseId: caseId,
            selectedTeamId: teamId,
            selectedAgentId: agentId,
            selectedLocationId: 'front-desk',
            selectedSceneId: 'weekly-report',
          },
        },
      })

      expect(valid.runtimeState?.ui.selectedCaseId).toBe(caseId)
      expect(valid.runtimeState?.ui.selectedTeamId).toBe(teamId)
      expect(valid.runtimeState?.ui.selectedAgentId).toBe(agentId)
      expect(valid.runtimeState?.ui.selectedLocationId).toBe('front-desk')
      expect(valid.runtimeState?.ui.selectedSceneId).toBe('weekly-report')
    })

    it('644 dedupes developer log ids and recomputes nextEventSequence from max suffix', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {},
              eventLog: [
                {
                  id: 'devlog-0018',
                  week: 5,
                  type: 'flag.set',
                  summary: 'First entry.',
                },
                {
                  id: 'devlog-0018',
                  week: 5,
                  type: 'route.selected',
                  summary: 'Duplicate id.',
                },
              ],
              nextEventSequence: 2,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.ui.debug.eventLog.map((entry) => entry.id)).toEqual([
        'devlog-0018',
        'devlog-0018-dup-2',
      ])
      expect(hydrated.runtimeState?.ui.debug.nextEventSequence).toBe(19)
    })

    it('645 retains only the newest developer log entries up to the hydration cap', () => {
      const fallback = createStartingState()
      const eventLog = Array.from({ length: 205 }, (_, index) => ({
        id: `devlog-${String(index + 1).padStart(4, '0')}`,
        week: 1,
        type: 'flag.set' as const,
        summary: `Entry ${index + 1}`,
      }))

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {},
              eventLog,
              nextEventSequence: 1,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.ui.debug.eventLog).toHaveLength(200)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.summary).toBe('Entry 6')
      expect(hydrated.runtimeState?.ui.debug.eventLog.at(-1)?.summary).toBe('Entry 205')
      expect(hydrated.runtimeState?.ui.debug.nextEventSequence).toBe(206)
    })

    it('646 strips legacy player pronouns and notes during hydration', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 2,
        runtimeState: {
          ...fallback.runtimeState!,
          player: {
            ...fallback.runtimeState!.player,
            pronouns: 'they/them',
            notes: 'legacy handler notes',
          },
        },
      })

      expect(hydrated.runtimeState?.player).not.toHaveProperty('pronouns')
      expect(hydrated.runtimeState?.player).not.toHaveProperty('notes')
      expect(hydrated.runtimeState?.player.displayName).toBeTruthy()
    })
  })

  describe('hydration problems 647-654', () => {
    it('647 caps one-shot firstSeenWeek during hydrateGame', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        runtimeState: {
          ...fallback.runtimeState!,
          oneShotEvents: {
            'event.bool': true,
            'event.record': {
              seen: true,
              firstSeenWeek: 99,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.oneShotEvents['event.bool']?.firstSeenWeek).toBe(5)
      expect(hydrated.runtimeState?.oneShotEvents['event.record']?.firstSeenWeek).toBe(5)
    })

    it('648-649 preserves finite globalFlags numbers and keeps first trimmed key', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 3,
        globalFlags: {
          ' agency.score ': 2.5,
          'agency.score': 0.1,
        },
        runtimeState: {
          ...fallback.runtimeState!,
          globalFlags: {
            ' agency.score ': 2.5,
            'agency.score': 0.1,
          },
        },
      })

      expect(hydrated.runtimeState?.globalFlags['agency.score']).toBe(2.5)
      expect(hydrated.globalFlags?.['agency.score']).toBe(2.5)
    })

    it('650-651 caps progress clock max and keeps first trimmed clock id', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        runtimeState: {
          ...fallback.runtimeState!,
          progressClocks: {
            ' incident.chain.breach ': {
              id: 'incident.chain.breach',
              label: 'Kept',
              value: 1,
              max: 2,
            },
            'incident.chain.breach': {
              id: 'incident.chain.breach',
              label: 'Dropped',
              value: 9,
              max: 9,
            },
            'story.clock-overflow': {
              id: 'story.clock-overflow',
              label: 'Overflow',
              value: 2,
              max: 12000,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.progressClocks['incident.chain.breach']).toMatchObject({
        label: 'Kept',
        value: 1,
        max: 2,
      })
      expect(hydrated.runtimeState?.progressClocks['story.clock-overflow']?.max).toBe(9999)
    })

    it('652-654 preserves queue payload and developer-log precision and caps log weeks', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 6,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-queue': {
              encounterId: 'enc-queue',
              status: 'active',
              lastUpdatedWeek: 6,
            },
          },
          eventQueue: {
            entries: [
              {
                id: 'qevt-0003',
                type: 'encounter.follow_up',
                targetId: 'enc-queue',
                payload: {
                  weight: 0.375,
                },
              },
            ],
            nextSequence: 2,
          },
          ui: {
            ...fallback.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {},
              eventLog: [
                {
                  id: 'devlog-0020',
                  week: 44,
                  type: 'progress_clock.changed',
                  summary: 'Clock moved.',
                  details: {
                    delta: 0.6666666666666666,
                  },
                },
              ],
              nextEventSequence: 2,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.eventQueue.entries[0]?.payload?.weight).toBe(0.375)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.week).toBe(6)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.details?.delta).toBe(0.6666666666666666)
    })
  })

  describe('hydration problems 655-662', () => {
    it('655-656 hydrates shape-valid runtime with non-array queue entries', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 4,
        runtimeState: {
          ...fallback.runtimeState!,
          eventQueue: {
            entries: { stale: true },
            nextSequence: 1,
          },
        },
      })

      expect(Array.isArray(hydrated.runtimeState?.eventQueue.entries)).toBe(true)
      expect(hydrated.runtimeState?.eventQueue.entries).toEqual([])
    })

    it('657-658 trims inventory keys and derives debug.enabled from flags', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 5,
        inventory: {
          ...fallback.inventory,
          ' field-kit ': 3,
        },
        runtimeState: {
          ...fallback.runtimeState!,
          ui: {
            ...fallback.runtimeState!.ui,
            debug: {
              enabled: true,
              flags: {
                ' audit.verbose ': true,
                'audit.verbose': false,
              },
              eventLog: [],
              nextEventSequence: 1,
            },
          },
        },
      })

      expect(hydrated.inventory['field-kit']).toBe(3)
      expect(hydrated.runtimeState?.ui.debug.enabled).toBe(true)
      expect(hydrated.runtimeState?.ui.debug.flags['audit.verbose']).toBe(true)
    })

    it('659-662 caps authoring.updatedWeek and keeps first trimmed collision keys', () => {
      const fallback = createStartingState()

      const hydrated = hydrateGame({
        ...stripGameTemplates(fallback),
        week: 7,
        runtimeState: {
          ...fallback.runtimeState!,
          encounterState: {
            'enc-hydrate': {
              encounterId: 'enc-hydrate',
              status: 'active',
              lastUpdatedWeek: 7,
            },
          },
          eventQueue: {
            entries: [
              {
                id: 'qevt-hydrate',
                type: 'encounter.follow_up',
                targetId: 'enc-hydrate',
                week: 7,
                payload: {
                  ' score.delta ': 2,
                  'score.delta': 8,
                },
              },
            ],
            nextSequence: 2,
          },
          ui: {
            ...fallback.runtimeState!.ui,
            authoring: {
              activeContextId: 'ctx-hydrate',
              updatedWeek: 44,
            },
            debug: {
              enabled: false,
              flags: {
                ' ops.trace ': true,
                'ops.trace': false,
              },
              eventLog: [
                {
                  id: 'devlog-hydrate',
                  week: 7,
                  type: 'flag.set',
                  summary: 'Trace enabled.',
                  details: {
                    ' note.value ': 'kept',
                    'note.value': 'dropped',
                  },
                },
              ],
              nextEventSequence: 2,
            },
          },
        },
      })

      expect(hydrated.runtimeState?.ui.authoring?.updatedWeek).toBe(7)
      expect(hydrated.runtimeState?.ui.debug.flags['ops.trace']).toBe(true)
      expect(hydrated.runtimeState?.eventQueue.entries[0]?.payload?.['score.delta']).toBe(2)
      expect(hydrated.runtimeState?.ui.debug.eventLog[0]?.details?.['note.value']).toBe('kept')
    })
  })
})
