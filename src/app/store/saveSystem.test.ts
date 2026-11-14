import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  advanceContainmentRequirementWindow,
  attemptContainmentRequirementFulfillment,
  containmentRequirementRegistryKey,
  evaluateRequirementAgainstCampaignWeek,
  openContainmentRequirementWindow,
} from '../../domain/containmentRequirementFulfillment'
import { enqueueRuntimeEvent, listQueuedRuntimeEvents } from '../../domain/eventQueue'
import { consumeOneShotContent, setPersistentFlag } from '../../domain/flagSystem'
import {
  advanceProgressClock,
  recordSceneVisit,
  setCurrentLocation,
  setEncounterRuntimeState,
  setUiDebugState,
} from '../../domain/gameStateManager'
import {
  RUN_EXPORT_KIND,
  GAME_STORE_VERSION,
  buildReportCaseSnapshot,
  createRunExportPayload,
  hydrateGame,
  migratePersistedStore,
  parseRunExport,
  serializeRunExport,
  stripGameTemplates,
} from './runTransfer'
import {
  applyDefeatConditionKnowledge,
  getKnowledgeKey,
  hasDefeatConditionCertainty,
  type DefeatConditionCertainty,
} from '../../domain/knowledge'
import {
  buildReportKnowledgePreview,
  buildReportKnowledgeView,
} from '../../features/report/reportKnowledgeView'
import {
  GAME_SAVE_KIND,
  GAME_SAVE_VERSION,
  createGameSavePayload,
  hydrateGameSavePayload,
  loadGameSave,
  serializeGameSave,
} from './saveSystem'
import { getFrontDeskBriefingView } from '../../features/operations/frontDeskView'
import {
  FRONT_DESK_TRIGGER_IDS,
  getEligibleFrontDeskSceneTriggerIds,
} from '../../features/operations/frontDeskTriggers'

describe('saveSystem', () => {
  it('round-trips two distinct subject requirements through canonical GameState save/load', () => {
    const game = createStartingState()
    game.week = 16
    const window = { windowId: 'window:10-12', startWeek: 10, endWeek: 12 }
    const info = {
      requirementId: 'req:dossier', subjectRef: 'subject:alpha',
      requirementClass: 'information_input' as const,
      acceptableInputClasses: ['information' as const],
      deficiencySeverity: 'major' as const,
      deficiencyConsequenceRef: 'consequence:information-gap',
      createsWork: false, allowsRecoveryAfterDeficiency: true,
    }
    const material = {
      requirementId: 'req:coolant', subjectRef: 'subject:beta',
      requirementClass: 'material_service' as const,
      acceptableInputClasses: ['material' as const],
      constraints: { quantityMin: 2, freshnessMaxAgeWeeks: 1 },
      deficiencySeverity: 'critical' as const,
      deficiencyConsequenceRef: 'consequence:thermal-risk',
      createsWork: true, allowsRecoveryAfterDeficiency: false,
    }
    const infoOpened = openContainmentRequirementWindow({ definition: info, currentWindow: window })!
    const infoMissed = evaluateRequirementAgainstCampaignWeek(infoOpened, 13)!
    const infoNext = advanceContainmentRequirementWindow(infoMissed, {
      windowId: 'window:13-15', startWeek: 13, endWeek: 15,
    })!
    const materialOpened = openContainmentRequirementWindow({ definition: material, currentWindow: window })!
    const materialSatisfied = attemptContainmentRequirementFulfillment(materialOpened, {
      fulfillmentRef: 'fulfill:coolant', inputClass: 'material',
      inputRef: 'mat:coolant', campaignWeek: 11, quantity: 2, inputAgeWeeks: 1,
    })!
    expect(materialSatisfied.outcome).toBe('accepted')
    const infoKey = containmentRequirementRegistryKey(info.subjectRef, info.requirementId)
    const materialKey = containmentRequirementRegistryKey(material.subjectRef, material.requirementId)
    game.containmentRequirementStates = {
      [infoKey]: infoNext,
      [materialKey]: materialSatisfied.state,
    }
    const hydrated = loadGameSave(serializeGameSave(game))
    expect(hydrated.containmentRequirementStates?.[infoKey]).toEqual(infoNext)
    expect(hydrated.containmentRequirementStates?.[infoKey].processedWindowIds).toEqual([
      'window:10-12',
    ])
    expect(hydrated.containmentRequirementStates?.[materialKey].state).toBe('satisfied')
    expect(hydrated.containmentRequirementStates?.[materialKey].lastFulfillmentInputRef)
      .toBe('mat:coolant')
    expect(Object.isFrozen(hydrated.containmentRequirementStates)).toBe(true)
    expect(Object.isFrozen(hydrated.containmentRequirementStates?.[infoKey])).toBe(true)
    expect(loadGameSave(serializeGameSave(hydrated)).containmentRequirementStates)
      .toEqual(hydrated.containmentRequirementStates)
  })

  it('rejects forged or erased subject requirement history without borrowing fallback state', () => {
    const game = createStartingState()
    const definition = {
      requirementId: 'req:dossier', subjectRef: 'subject:alpha',
      requirementClass: 'information_input' as const,
      acceptableInputClasses: ['information' as const],
      deficiencySeverity: 'major' as const,
      deficiencyConsequenceRef: 'consequence:information-gap',
      createsWork: false,
    }
    const active = openContainmentRequirementWindow({
      definition, currentWindow: { windowId: 'window:w1', startWeek: 10, endWeek: 12 },
    })!
    const key = containmentRequirementRegistryKey(definition.subjectRef, definition.requirementId)
    game.containmentRequirementStates = { [key]: active }
    const payload = JSON.parse(serializeGameSave(game))
    expect(hydrateGameSavePayload(payload).containmentRequirementStates?.[key]).toBeDefined()

    const forged = JSON.parse(JSON.stringify(payload))
    forged.state.containmentRequirementStates = { 'forged:subject': active }
    expect(() => hydrateGameSavePayload(forged)).toThrow(
      'Invalid persisted containment requirement registry.'
    )
    const erased = JSON.parse(JSON.stringify(payload))
    delete erased.state.containmentRequirementStates[key].processedWindowIds
    expect(() => hydrateGameSavePayload(erased)).toThrow(
      'Invalid persisted containment requirement registry.'
    )
    const malformed = JSON.parse(JSON.stringify(payload))
    malformed.state.containmentRequirementStates = []
    expect(() => hydrateGameSavePayload(malformed)).toThrow(
      'Invalid persisted containment requirement registry.'
    )

    const legacy = createGameSavePayload(createStartingState())
    expect(hydrateGameSavePayload(legacy, game).containmentRequirementStates)
      .toBeUndefined()
  })

  it('builds an explicit save payload without templates', () => {
    const game = createStartingState()
    game.week = 3

    const payload = createGameSavePayload(game)

    expect(payload).toMatchObject({
      kind: GAME_SAVE_KIND,
      version: GAME_SAVE_VERSION,
      state: expect.objectContaining({ week: 3 }),
    })
    expect(payload.savedAt).toBeTypeOf('string')
    expect(new Date(payload.savedAt).toISOString()).toBe(payload.savedAt)
    expect(payload.state).not.toHaveProperty('templates')
  })

  it('rejects saves with missing, invalid, or future savedAt metadata', () => {
    const fallback = createStartingState()
    const basePayload = {
      kind: GAME_SAVE_KIND,
      version: GAME_SAVE_VERSION,
      state: {
        ...fallback,
        week: 3,
      },
    }

    expect(() => loadGameSave(JSON.stringify(basePayload))).toThrow(
      'Save payload savedAt timestamp is missing or invalid.'
    )
    expect(() =>
      loadGameSave(
        JSON.stringify({
          ...basePayload,
          savedAt: 'not-a-date',
        })
      )
    ).toThrow('Save payload savedAt timestamp is missing or invalid.')
    expect(() =>
      loadGameSave(
        JSON.stringify({
          ...basePayload,
          savedAt: '2999-01-01T00:00:00.000Z',
        })
      )
    ).toThrow('Save payload savedAt timestamp is from the future.')
  })

  it('accepts saves with valid savedAt metadata', () => {
    const fallback = createStartingState()

    const loaded = loadGameSave(
      JSON.stringify({
        kind: GAME_SAVE_KIND,
        version: GAME_SAVE_VERSION,
        savedAt: '2026-01-01T00:00:00.000Z',
        state: {
          ...fallback,
          week: 4,
        },
      })
    )

    expect(loaded.week).toBe(4)
  })

  it('round-trips authored runtime state, inventory, and breadcrumbs through save serialization', () => {
    let game = createStartingState()

    game = setPersistentFlag(game, 'contact.ivy.introduced', true)
    game = consumeOneShotContent(game, 'frontdesk.warning.weekly-report', 'frontdesk').state
    game = setCurrentLocation(game, {
      hubId: 'agency',
      locationId: 'front-desk',
      sceneId: 'special-recruit-opportunity',
    })
    game = recordSceneVisit(game, {
      locationId: 'front-desk',
      sceneId: 'special-recruit-opportunity',
      outcome: 'accepted',
      tags: ['notice', 'recruit'],
    })
    game = setEncounterRuntimeState(game, 'encounter.breach.followup', {
      status: 'active',
      phase: 'containment',
      hiddenModifierIds: ['hidden.echo'],
      revealedModifierIds: ['known.breach'],
      flags: { unstable: true },
    })
    game.inventory.psionic_shards = 3
    game = advanceProgressClock(game, 'incident.chain.breach', 2, {
      label: 'Breach Chain',
      max: 4,
      hidden: false,
    })
    game = setUiDebugState(game, {
      selectedCaseId: 'case-001',
      debug: {
        enabled: true,
        flags: { developerOverlay: true },
      },
      authoring: {
        activeContextId: 'frontdesk.notice.breach-follow-up',
        lastChoiceId: 'frontdesk.notice.breach-follow-up.cautious',
        lastNextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
        lastFollowUpIds: ['containment.breach.followup.cautious-brief'],
        updatedWeek: game.week,
      },
    })

    const roundTripped = loadGameSave(serializeGameSave(game))

    expect(roundTripped.inventory.psionic_shards).toBe(3)
    expect(roundTripped.runtimeState).toMatchObject({
      globalFlags: {
        'contact.ivy.introduced': true,
      },
      oneShotEvents: {
        'frontdesk.warning.weekly-report': {
          source: 'frontdesk',
        },
      },
      currentLocation: {
        hubId: 'agency',
        locationId: 'front-desk',
        sceneId: 'special-recruit-opportunity',
      },
      encounterState: {
        'encounter.breach.followup': {
          status: 'active',
          phase: 'containment',
          hiddenModifierIds: ['hidden.echo'],
          revealedModifierIds: ['known.breach'],
          flags: { unstable: true },
        },
      },
      progressClocks: {
        'incident.chain.breach': {
          label: 'Breach Chain',
          value: 2,
          max: 4,
        },
      },
      ui: {
        selectedCaseId: 'case-001',
        debug: {
          enabled: true,
          flags: { developerOverlay: true },
        },
        authoring: {
          activeContextId: 'frontdesk.notice.breach-follow-up',
          lastChoiceId: 'frontdesk.notice.breach-follow-up.cautious',
          lastNextTargetId: 'frontdesk.notice.breach-follow-up.cautious-brief',
          lastFollowUpIds: ['containment.breach.followup.cautious-brief'],
          updatedWeek: 1,
        },
      },
    })
    expect(roundTripped.runtimeState?.sceneHistory.at(-1)).toMatchObject({
      locationId: 'front-desk',
      sceneId: 'special-recruit-opportunity',
      outcome: 'accepted',
      tags: ['notice', 'recruit'],
    })
  })

  it('normalizes partial runtime payloads when loading a save', () => {
    const loaded = loadGameSave(
      JSON.stringify({
        kind: GAME_SAVE_KIND,
        version: GAME_SAVE_VERSION,
        savedAt: new Date().toISOString(),
        state: {
          week: 5,
          inventory: {
            valid_salvage: 4,
            broken_entry: -3,
          },
          runtimeState: {
            globalFlags: {
              'faction.ashkeepers.hostile': true,
              'invalid.flag': { nested: true },
            },
            oneShotEvents: {
              'frontdesk.warning.once': true,
              'frontdesk.warning.invalid': {
                seen: false,
              },
            },
            currentLocation: {
              hubId: 'agency',
              updatedWeek: 0,
            },
            sceneHistory: [
              {
                locationId: 'front-desk',
                sceneId: 'weekly-report',
                week: 3,
              },
              {
                locationId: '',
                sceneId: 'invalid-entry',
              },
            ],
            encounterState: {
              'encounter.partial': {
                status: 'invalid',
                phase: 44,
                hiddenModifierIds: ['hidden.trace'],
                flags: {
                  observed: true,
                  invalid: 'nope',
                },
                lastUpdatedWeek: 'bad',
              },
            },
            progressClocks: {
              'incident.chain.partial': {
                label: 'Partial Clock',
                value: 9,
                max: 4,
                hidden: 'no',
                completedAtWeek: 'bad',
              },
            },
            ui: {
              debug: {
                enabled: 'yes',
                flags: {
                  developerOverlay: true,
                  invalid: 'no',
                },
              },
              authoring: {
                activeContextId: 'frontdesk.notice.weekly-report',
                lastFollowUpIds: ['frontdesk.notice.follow-up', 7],
                updatedWeek: 'bad',
              },
            },
          },
        },
      })
    )

    expect(loaded.inventory.valid_salvage).toBe(4)
    expect(loaded.inventory.broken_entry).toBeUndefined()
    expect(loaded.runtimeState).toMatchObject({
      globalFlags: {
        'faction.ashkeepers.hostile': true,
      },
      oneShotEvents: {
        'frontdesk.warning.once': {
          seen: true,
          firstSeenWeek: 5,
        },
      },
      currentLocation: {
        hubId: 'agency',
        updatedWeek: 1,
      },
      sceneHistory: [
        {
          locationId: 'front-desk',
          sceneId: 'weekly-report',
          week: 3,
        },
      ],
      encounterState: {
        'encounter.partial': {
          status: 'available',
          hiddenModifierIds: ['hidden.trace'],
          flags: { observed: true },
          lastUpdatedWeek: 5,
        },
      },
      progressClocks: {
        'incident.chain.partial': {
          label: 'Partial Clock',
          value: 4,
          max: 4,
          completedAtWeek: 5,
        },
      },
      ui: {
        debug: {
          enabled: false,
          flags: { developerOverlay: true },
        },
        authoring: {
          activeContextId: 'frontdesk.notice.weekly-report',
          lastFollowUpIds: ['frontdesk.notice.follow-up'],
        },
      },
    })
    expect(loaded.runtimeState?.globalFlags).not.toHaveProperty('invalid.flag')
    expect(loaded.runtimeState?.oneShotEvents).not.toHaveProperty('frontdesk.warning.invalid')
  })

  it('loads legacy run exports for backward compatibility', () => {
    const legacyRaw = JSON.stringify(createRunExportPayload(createStartingState()))

    const loaded = loadGameSave(legacyRaw)

    expect(loaded.week).toBe(1)
  })

  it('keeps spent front-desk one-shots hidden after save/load round-trips', () => {
    let game = createStartingState()
    game = consumeOneShotContent(game, 'frontdesk.tutorial.weekly-report', 'frontdesk.notice').state

    const loaded = loadGameSave(serializeGameSave(game))

    expect(getEligibleFrontDeskSceneTriggerIds(loaded)).not.toContain(
      FRONT_DESK_TRIGGER_IDS.weeklyReportTutorial
    )
    expect(getFrontDeskBriefingView(loaded).notices[0]).toMatchObject({
      id: 'weekly-report-returning',
    })
  })

  it('round-trips queued authored/runtime follow-up events through save/load', () => {
    let game = createStartingState()
    game = enqueueRuntimeEvent(game, {
      type: 'authored.follow_up',
      targetId: 'containment.breach.followup.cautious-brief',
      source: 'frontdesk.notice.breach-follow-up.cautious',
      contextId: 'frontdesk.notice.breach-follow-up-open',
      week: 2,
      payload: {
        choiceId: 'frontdesk.notice.breach-follow-up.cautious',
      },
    }).state
    game = enqueueRuntimeEvent(game, {
      type: 'authored.follow_up',
      targetId: 'frontdesk.notice.weekly-report.returning',
      source: 'frontdesk.notice.weekly-report.acknowledge',
      week: 2,
    }).state

    const loaded = loadGameSave(serializeGameSave(game))
    const queued = listQueuedRuntimeEvents(loaded)

    expect(queued.map((entry) => entry.id)).toEqual(['qevt-0001', 'qevt-0002'])
    expect(queued.map((entry) => entry.targetId)).toEqual([
      'containment.breach.followup.cautious-brief',
      'frontdesk.notice.weekly-report.returning',
    ])
    expect(loaded.runtimeState?.eventQueue.nextSequence).toBe(3)
  })

  it('rejects malformed or unsupported save payloads', () => {
    expect(() => loadGameSave('not-json')).toThrow('Save payload is not valid JSON.')

    expect(() =>
      loadGameSave(
        JSON.stringify({
          kind: 'not-a-save',
          version: GAME_SAVE_VERSION,
          state: {},
        })
      )
    ).toThrow('Save payload is not a supported Containment Protocol save.')

    expect(() =>
      loadGameSave(
        JSON.stringify({
          kind: GAME_SAVE_KIND,
          version: GAME_SAVE_VERSION + 1,
          savedAt: new Date().toISOString(),
          state: {},
        })
      )
    ).toThrow('Save payload version is not supported by this build.')

    expect(() =>
      loadGameSave(
        JSON.stringify({
          kind: RUN_EXPORT_KIND,
          version: 999,
          exportedAt: new Date().toISOString(),
          game: {},
        })
      )
    ).toThrow('Run payload version is not supported by this build.')
  })
})

// Constructed knowledge uses the existing producer; this is persistence/output evidence, not acquisition wiring.
function knowledgeRoundTripFixture(certainty: DefeatConditionCertainty) {
  const game = createStartingState()
  game.week = 5
  const [teamId, otherTeamId] = Object.keys(game.teams) as [string, string]
  const subjectId = Object.keys(game.cases)[0]!
  const key = getKnowledgeKey(teamId, subjectId)
  game.knowledge = applyDefeatConditionKnowledge(game.knowledge, teamId, subjectId, certainty, 3)
  game.knowledge[key] = {
    ...game.knowledge[key],
    obsolete: true,
    fragmented: true,
    trueClassification: 'PRIVATE_CLASS',
    source: 'PRIVATE_SOURCE',
    relayFailed: true,
    lastRelayFailedWeek: 3,
    fusedFrom: [otherTeamId],
    lastFusedWeek: 3,
  }
  const maskedKey = getKnowledgeKey(otherTeamId, subjectId)
  game.knowledge[maskedKey] = {
    entityId: otherTeamId,
    subjectId,
    tier: 'confirmed',
    masked: true,
    defeatConditionCertainty: 'exact',
  }
  game.reports = [
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
      notes: [],
      caseSnapshots: {
        [subjectId]: buildReportCaseSnapshot(game.cases[subjectId], {
          [teamId]: game.knowledge[key],
          [otherTeamId]: game.knowledge[maskedKey],
        }),
      },
    },
  ]
  return { game, teamId, subjectId, key }
}

function knowledgePreviews(game: ReturnType<typeof createStartingState>) {
  const knowledge = buildReportKnowledgeView(game.knowledge, game.reports[0].caseSnapshots)
  return {
    public: buildReportKnowledgePreview(knowledge, 'public'),
    internal: buildReportKnowledgePreview(knowledge, 'internal'),
  }
}

describe.each(['run export', 'manual save'] as const)(
  'SPE-58 %s knowledge preservation',
  (channel) => {
    const serialize = channel === 'run export' ? serializeRunExport : serializeGameSave
    const load = channel === 'run export' ? parseRunExport : loadGameSave

    it.each(['unknown', 'suspected', 'family', 'exact'] as const)(
      'round-trips %s certainty, live state, snapshot authority and audience output',
      (certainty) => {
        const { game, teamId, subjectId, key } = knowledgeRoundTripFixture(certainty)
        const before = JSON.stringify(game)
        const expectedViews = knowledgePreviews(game)
        const raw = serialize(game)
        const payload = JSON.parse(raw)
        const serializedState = channel === 'run export' ? payload.game : payload.state
        expect(serializedState.knowledge[key].defeatConditionCertainty).toBe(certainty)
        const loaded = load(raw)
        expect(loaded.knowledge[key]).toMatchObject({
          defeatConditionCertainty: certainty,
          lastDefeatConditionUpdateWeek: 3,
          obsolete: true,
          fragmented: true,
        })
        expect(
          loaded.reports[0].caseSnapshots?.[subjectId].knowledge?.[teamId].defeatConditionCertainty
        ).toBe(certainty)
        for (const required of ['unknown', 'suspected', 'family', 'exact'] as const) {
          expect(hasDefeatConditionCertainty(loaded.knowledge, teamId, subjectId, required)).toBe(
            hasDefeatConditionCertainty(game.knowledge, teamId, subjectId, required)
          )
        }
        expect(knowledgePreviews(loaded)).toEqual(expectedViews)
        expect(JSON.stringify(expectedViews.public)).not.toContain('PRIVATE')
        expect(expectedViews.public.groups).toHaveLength(certainty === 'unknown' ? 0 : 1)
        const twice = load(serialize(loaded))
        expect(twice.knowledge).toEqual(loaded.knowledge)
        expect(twice.reports[0].caseSnapshots?.[subjectId].knowledge).toEqual(
          loaded.reports[0].caseSnapshots?.[subjectId].knowledge
        )
        expect(knowledgePreviews(twice)).toEqual(expectedViews)
        expect(JSON.stringify(game)).toBe(before)
        // A later live update cannot overwrite an earlier report's saved interpretation.
        loaded.knowledge = applyDefeatConditionKnowledge(
          loaded.knowledge,
          teamId,
          subjectId,
          certainty === 'exact' ? 'family' : 'exact',
          5
        )
        expect(knowledgePreviews(loaded)).toEqual(expectedViews)
      }
    )
  }
)

it('preserves existing certainty through supported legacy/current migration without filling omitted legacy knowledge', () => {
  const { game, key, subjectId, teamId } = knowledgeRoundTripFixture('family')
  const persisted = stripGameTemplates(game)
  for (const version of [1, GAME_STORE_VERSION]) {
    const migrated = migratePersistedStore({ game: persisted }, version)
    expect(migrated.game.knowledge[key].defeatConditionCertainty).toBe('family')
    expect(
      migrated.game.reports[0].caseSnapshots?.[subjectId].knowledge?.[teamId]
        .defeatConditionCertainty
    ).toBe('family')
  }
  for (const version of [1, GAME_STORE_VERSION]) {
    const raw = JSON.stringify({ ...createRunExportPayload(game), version })
    expect(parseRunExport(raw).knowledge[key].defeatConditionCertainty).toBe('family')
    expect(loadGameSave(raw).knowledge[key].defeatConditionCertainty).toBe('family')
  }
  const legacy = JSON.parse(JSON.stringify(persisted))
  delete legacy.knowledge[key].defeatConditionCertainty
  delete legacy.reports[0].caseSnapshots[subjectId].knowledge[teamId].defeatConditionCertainty
  const hydrated = hydrateGame(legacy, game)
  expect(hydrated.knowledge[key]).not.toHaveProperty('defeatConditionCertainty')
  expect(hydrated.reports[0].caseSnapshots?.[subjectId].knowledge?.[teamId]).not.toHaveProperty(
    'defeatConditionCertainty'
  )
  expect(hydrated.knowledge[key].lastDefeatConditionUpdateWeek).toBe(3)
})

it('keeps future-wrapper and timestamp rejection with otherwise valid certainty payloads', () => {
  const { game } = knowledgeRoundTripFixture('family')
  const run = createRunExportPayload(game)
  const save = createGameSavePayload(game)
  expect(() => parseRunExport(JSON.stringify({ ...run, version: GAME_STORE_VERSION + 1 }))).toThrow(
    'Run payload version is not supported by this build.'
  )
  expect(() => loadGameSave(JSON.stringify({ ...save, version: GAME_SAVE_VERSION + 1 }))).toThrow(
    'Save payload version is not supported by this build.'
  )
  expect(() => parseRunExport(JSON.stringify({ ...run, exportedAt: 'invalid' }))).toThrow(
    'Run payload exportedAt timestamp is missing or invalid.'
  )
})
