import { describe, expect, it } from 'vitest'
import {
  applyDefeatConditionKnowledge,
  getKnowledgeKey,
  hasDefeatConditionCertainty,
  type DefeatConditionCertainty,
} from '../../domain/knowledge'
import { createStartingState } from '../../data/startingState'
import {
  GAME_STORE_VERSION,
  buildReportCaseSnapshot,
  createRunExportPayload,
  hydrateGame,
  migratePersistedStore,
  parseRunExport,
  serializeRunExport,
  stripGameTemplates,
} from '../../app/store/runTransfer'
import {
  GAME_SAVE_VERSION,
  createGameSavePayload,
  loadGameSave,
  serializeGameSave,
} from '../../app/store/saveSystem'
import { buildReportKnowledgePreview, buildReportKnowledgeView } from './reportKnowledgeView'

describe('buildReportKnowledgeView', () => {
  it('prefers snapshot knowledge and falls back to live knowledge for missing keys', () => {
    const teamId = 'team-alpha'
    const caseId = 'case-001'
    const liveKey = getKnowledgeKey(teamId, caseId)
    const otherKey = getKnowledgeKey('team-beta', 'case-002')

    const liveKnowledge = {
      [liveKey]: {
        entityId: teamId,
        entityType: 'team' as const,
        subjectId: caseId,
        subjectType: 'anomaly' as const,
        tier: 'observed' as const,
        defeatConditionCertainty: 'suspected' as const,
      },
      [otherKey]: {
        entityId: 'team-beta',
        entityType: 'team' as const,
        subjectId: 'case-002',
        subjectType: 'anomaly' as const,
        tier: 'partial' as const,
      },
    }

    const resolved = buildReportKnowledgeView(liveKnowledge, {
      [caseId]: {
        caseId,
        title: 'Snapshot Case',
        kind: 'case',
        mode: 'threshold',
        status: 'open',
        stage: 1,
        deadlineRemaining: 2,
        durationWeeks: 2,
        assignedTeamIds: [teamId],
        knowledge: {
          [teamId]: {
            entityId: teamId,
            entityType: 'team',
            subjectId: caseId,
            subjectType: 'anomaly',
            tier: 'confirmed',
            defeatConditionCertainty: 'exact',
          },
        },
      },
    })

    expect(resolved[liveKey]?.defeatConditionCertainty).toBe('exact')
    expect(resolved[otherKey]?.tier).toBe('partial')
  })

  it('returns live knowledge when snapshots omit knowledge', () => {
    const liveKnowledge = {
      [getKnowledgeKey('team-alpha', 'case-001')]: {
        entityId: 'team-alpha',
        entityType: 'team' as const,
        subjectId: 'case-001',
        subjectType: 'anomaly' as const,
        tier: 'observed' as const,
      },
    }

    expect(buildReportKnowledgeView(liveKnowledge, undefined)).toBe(liveKnowledge)
    expect(buildReportKnowledgeView(liveKnowledge, {})).toBe(liveKnowledge)
  })
})

it('derives all preview display props from the chosen audience without private metadata', () => {
  const state = {
    'team:one::case:one': {
      entityId: 'team:one',
      subjectId: 'case:one',
      tier: 'partial' as const,
      defeatConditionCertainty: 'family' as const,
      trueClassification: 'SECRET_CLASS',
      relayFailed: true,
      lastRelayFailedWeek: 2,
      fusedFrom: ['SECRET_A', 'SECRET_B'],
      lastFusedWeek: 1,
    },
    'SECRET_TEAM::SECRET_CASE': {
      entityId: 'SECRET_TEAM',
      subjectId: 'SECRET_CASE',
      tier: 'confirmed' as const,
      masked: true,
      defeatConditionCertainty: 'exact' as const,
    },
  }
  const before = JSON.stringify(state)
  const publicPreview = buildReportKnowledgePreview(state, 'public')
  const restrictedPreview = buildReportKnowledgePreview(state, 'internal')
  expect(JSON.stringify(publicPreview)).not.toContain('SECRET')
  expect(JSON.stringify(publicPreview)).not.toContain('Relay failed')
  expect(JSON.stringify(restrictedPreview)).toContain('SECRET_TEAM')
  expect(JSON.stringify(restrictedPreview)).toContain('SECRET_A')
  expect(publicPreview.groups[0].rows[0].explanation).toBe('Bypass method family suspected.')
  expect(JSON.stringify(state)).toBe(before)
})

it('uses qualified computed operator explanations instead of arbitrary freeform notes', () => {
  const knowledge = {
    'team:one::case:one': {
      entityId: 'team:one',
      subjectId: 'case:one',
      subjectType: 'anomaly' as const,
      tier: 'confirmed' as const,
      defeatConditionCertainty: 'unknown' as const,
      notes: 'ARBITRARY_NOTE_CLAIMS_CERTAINTY',
    },
  }
  const preview = buildReportKnowledgePreview(knowledge, 'internal')
  expect(preview.groups[0].rows[0].explanation).toBe('Defeat/neutralization condition is unknown.')
  expect(JSON.stringify(preview)).not.toContain('ARBITRARY_NOTE')
  expect(knowledge['team:one::case:one'].notes).toBe('ARBITRARY_NOTE_CLAIMS_CERTAINTY')
})

it('keeps public exact-tier visibility without generating relay provenance annotations', () => {
  const knowledge = {
    'team:one::case:one': {
      entityId: 'team:one',
      subjectId: 'case:one',
      tier: 'relayed' as const,
      defeatConditionCertainty: 'exact' as const,
      relaySource: 'PRIVATE_SOURCE',
      lastRelayedWeek: 2,
    },
  }
  const publicRow = buildReportKnowledgePreview(knowledge, 'public').groups[0].rows[0]
  expect(publicRow.tier).toBe('relayed')
  expect(publicRow.annotations).toEqual([])
  expect(
    buildReportKnowledgePreview(knowledge, 'internal').groups[0].rows[0].annotations
  ).toContain('Relayed from PRIVATE_SOURCE (week 2)')
})

it('gives a tier to both previews for exact certainty created without previous knowledge', () => {
  const knowledge = applyDefeatConditionKnowledge({}, 'team:one', 'case:one', 'exact', 2)
  for (const audience of ['public', 'internal'] as const) {
    expect(buildReportKnowledgePreview(knowledge, audience).groups[0].rows[0].tier).toBe('unknown')
  }
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
