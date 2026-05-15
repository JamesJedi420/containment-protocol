import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { validateBranchContinuity, type BranchPathFacts } from '../domain/branchContinuity'
import { projectBranchPathFactsFromGameState } from '../domain/branchContinuityProjection'
import { appendDeveloperLogEvent } from '../domain/developerLog'
import {
  adjustInventoryQuantity,
  ensureManagedGameState,
  markOneShotEvent,
  readGameStateManager,
  recordSceneVisit,
  setCurrentLocation,
  setEncounterRuntimeState,
  setGlobalFlag,
  setUiDebugState,
} from '../domain/gameStateManager'
import type { GameState, KnowledgeState } from '../domain/models'

function expectValidBranchPathFacts(pathFacts: BranchPathFacts) {
  expect(typeof pathFacts.pathId).toBe('string')
  expect(pathFacts.pathId.length).toBeGreaterThan(0)
  expect(Array.isArray(pathFacts.acquiredItemIds)).toBe(true)
  expect(pathFacts.seedValues).toBeTypeOf('object')
  expect(pathFacts.companionStatusById).toBeTypeOf('object')
  expect(pathFacts.injuryStatusBySubjectId).toBeTypeOf('object')
  expect(Array.isArray(pathFacts.witnessedEventIds)).toBe(true)
  expect(Array.isArray(pathFacts.learnedClueIds)).toBe(true)
  expect(Array.isArray(pathFacts.priorChoiceIds)).toBe(true)
}

describe('branchContinuityProjection', () => {
  it('projects createStartingState() to valid BranchPathFacts', () => {
    const game = createStartingState()
    const pathFacts = projectBranchPathFactsFromGameState(game)

    expectValidBranchPathFacts(pathFacts)
    expect(pathFacts.pathId).toMatch(/^run:/)
    expect(pathFacts.acquiredItemIds.length).toBeGreaterThan(0)
    expect(pathFacts.witnessedEventIds).toEqual([])
    expect(pathFacts.learnedClueIds).toEqual([])
    expect(pathFacts.priorChoiceIds).toEqual([])
    expect(pathFacts.companionStatusById).toEqual({})
    expect(pathFacts.simulationTruth).toBeUndefined()
  })

  it('honors options.pathId override', () => {
    const game = createStartingState()
    const pathFacts = projectBranchPathFactsFromGameState(game, {
      pathId: 'fixture:custom-path',
    })

    expect(pathFacts.pathId).toBe('fixture:custom-path')
  })

  it('derives roomOfOriginId from first scene history, then current location', () => {
    let game = createStartingState()
    game = setCurrentLocation(game, {
      hubId: 'recruitment',
      locationId: 'recruitment-board',
      sceneId: 'candidate-sweep',
    })
    game = recordSceneVisit(game, {
      locationId: 'room:great-hall',
      sceneId: 'intro-scene',
    })

    const fromHistory = projectBranchPathFactsFromGameState(game)
    expect(fromHistory.roomOfOriginId).toBe('room:great-hall')

    const sparse = ensureManagedGameState({
      ...createStartingState(),
      runtimeState: {
        ...readGameStateManager(createStartingState()),
        sceneHistory: [],
        currentLocation: {
          hubId: 'operations-desk',
          locationId: 'room:ops-wing',
          sceneId: 'dashboard',
          updatedWeek: 1,
        },
      },
    })

    const fromCurrent = projectBranchPathFactsFromGameState(sparse)
    expect(fromCurrent.roomOfOriginId).toBe('room:ops-wing')
  })

  it('projects acquired item ids from inventory quantities', () => {
    let game = createStartingState()
    game = adjustInventoryQuantity(game, 'custom_supplies', 2)

    const pathFacts = projectBranchPathFactsFromGameState(game)
    expect(pathFacts.acquiredItemIds).toContain('custom_supplies')
  })

  it('projects injury status from agent vitals and recovery signals', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]
    expect(agentId).toBeDefined()

    const wounded = ensureManagedGameState({
      ...game,
      agents: {
        ...game.agents,
        [agentId]: {
          ...game.agents[agentId],
          vitals: {
            ...game.agents[agentId].vitals,
            wounds: 30,
            statusFlags: [],
          },
        },
      },
    })

    const woundedFacts = projectBranchPathFactsFromGameState(wounded)
    expect(woundedFacts.injuryStatusBySubjectId[`agent:${agentId}`]).toBe('wounded')

    const recoveringWithWounds = ensureManagedGameState({
      ...wounded,
      agents: {
        ...wounded.agents,
        [agentId]: {
          ...wounded.agents[agentId],
          status: 'recovering',
          vitals: {
            ...wounded.agents[agentId].vitals,
            wounds: 12,
            statusFlags: ['recovering'],
          },
        },
      },
    })

    const recoveringFacts = projectBranchPathFactsFromGameState(recoveringWithWounds)
    expect(recoveringFacts.injuryStatusBySubjectId[`agent:${agentId}`]).toBe('wounded')

    const healed = ensureManagedGameState({
      ...wounded,
      agents: {
        ...wounded.agents,
        [agentId]: {
          ...wounded.agents[agentId],
          status: 'recovering',
          vitals: {
            ...wounded.agents[agentId].vitals,
            wounds: 0,
            statusFlags: ['recovering'],
          },
        },
      },
    })

    const healedFacts = projectBranchPathFactsFromGameState(healed)
    expect(healedFacts.injuryStatusBySubjectId[`agent:${agentId}`]).toBe('healed')
  })

  it('projects only event-shaped consumed one-shots into witnessedEventIds', () => {
    let game = createStartingState()
    game = markOneShotEvent(game, 'event:hall-ambush', 'intro_scene')
    game = markOneShotEvent(game, 'event.opening-brief', 'intro_scene')
    game = markOneShotEvent(game, 'frontdesk.welcome', 'frontdesk')
    game = markOneShotEvent(game, 'recruit.firstContact', 'recruitment')
    game = markOneShotEvent(game, 'containment.notice', 'ops')

    const pathFacts = projectBranchPathFactsFromGameState(game)

    expect(pathFacts.witnessedEventIds).toEqual(
      expect.arrayContaining(['event:hall-ambush', 'event.opening-brief'])
    )
    expect(pathFacts.witnessedEventIds).not.toEqual(
      expect.arrayContaining(['frontdesk.welcome', 'recruit.firstContact', 'containment.notice'])
    )
    expect(pathFacts.witnessedEventIds).toHaveLength(2)
  })

  it('projects event-shaped global flags into witnessedEventIds', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'event:hall-ambush', true)
    game = setGlobalFlag(game, 'frontdesk.notice.seen', true)

    const pathFacts = projectBranchPathFactsFromGameState(game)
    expect(pathFacts.witnessedEventIds).toEqual(['event:hall-ambush'])
  })

  it('projects player-known ids from flags, one-shots, knowledge, and choices', () => {
    let game = createStartingState()

    const knowledgeEntry: KnowledgeState = {
      tier: 'confirmed',
      entityId: 'team-alpha',
      entityType: 'team',
      subjectId: 'clue:archive-leak',
      subjectType: 'procedure',
      lastConfirmedWeek: 1,
    }

    game = setGlobalFlag(game, 'event:hall-ambush', true)
    game = setGlobalFlag(game, 'clue:secret-passage', true)
    game = setGlobalFlag(game, 'choice:barricade-door', true)
    game = setGlobalFlag(game, 'branch.seed.doorCode', 417)
    game = markOneShotEvent(game, 'event.opening-brief', 'intro_scene')
    game = setUiDebugState(game, {
      authoring: {
        lastChoiceId: 'frontdesk.notice.weekly-report.acknowledge',
        updatedWeek: 1,
      },
    })
    game = appendDeveloperLogEvent(game, {
      type: 'choice.executed',
      summary: 'Choice executed: choice:archive-review',
    })
    game = {
      ...game,
      knowledge: {
        ...game.knowledge,
        'team-alpha::clue:archive-leak': knowledgeEntry,
      },
    }

    const pathFacts = projectBranchPathFactsFromGameState(game)

    expect(pathFacts.witnessedEventIds).toEqual(
      expect.arrayContaining(['event.opening-brief', 'event:hall-ambush'])
    )
    expect(pathFacts.learnedClueIds).toEqual(
      expect.arrayContaining(['clue:archive-leak', 'clue:secret-passage'])
    )
    expect(pathFacts.priorChoiceIds).toEqual(
      expect.arrayContaining([
        'choice:archive-review',
        'choice:barricade-door',
        'frontdesk.notice.weekly-report.acknowledge',
      ])
    )
    expect(pathFacts.seedValues['branch.seed.doorCode']).toBe(417)
  })

  it('projects learned clues only for player-known canonical knowledge tiers', () => {
    const game = ensureManagedGameState({
      ...createStartingState(),
      knowledge: {
        'team-a::clue-known': {
          tier: 'confirmed',
          entityId: 'team-a',
          subjectId: 'clue:known',
          subjectType: 'procedure',
        },
        'team-a::clue-partial': {
          tier: 'partial',
          entityId: 'team-a',
          subjectId: 'clue:partial-only',
          subjectType: 'procedure',
        },
        'team-a::clue-relayed': {
          tier: 'relayed',
          entityId: 'team-a',
          subjectId: 'clue:relayed-only',
          subjectType: 'procedure',
        },
      },
    })

    const pathFacts = projectBranchPathFactsFromGameState(game)
    expect(pathFacts.learnedClueIds).toEqual(['clue:known'])
  })

  it('filters knowledge by options.knowledgeEntityId', () => {
    const game = ensureManagedGameState({
      ...createStartingState(),
      knowledge: {
        'team-a::subject-1': {
          tier: 'observed',
          entityId: 'team-a',
          subjectId: 'clue:alpha',
          subjectType: 'procedure',
        },
        'team-b::subject-2': {
          tier: 'confirmed',
          entityId: 'team-b',
          subjectId: 'clue:beta',
          subjectType: 'procedure',
        },
      },
    })

    const filtered = projectBranchPathFactsFromGameState(game, { knowledgeEntityId: 'team-a' })
    expect(filtered.learnedClueIds).toEqual(['clue:alpha'])

    const unfiltered = projectBranchPathFactsFromGameState(game)
    expect(unfiltered.learnedClueIds).toEqual(expect.arrayContaining(['clue:alpha', 'clue:beta']))
  })

  it('tolerates sparse legacy saves without throwing', () => {
    const sparse = {
      ...createStartingState(),
      runtimeState: undefined,
      knowledge: undefined,
      agents: undefined,
      campaignLedger: undefined,
      inventory: {},
    } as unknown as GameState

    expect(() => projectBranchPathFactsFromGameState(sparse)).not.toThrow()

    const pathFacts = projectBranchPathFactsFromGameState(sparse)
    expectValidBranchPathFacts(pathFacts)
    expect(pathFacts.pathId).toBe('game:week-1')
    expect(pathFacts.acquiredItemIds).toEqual([])
    expect(pathFacts.companionStatusById).toEqual({})
    expect(pathFacts.injuryStatusBySubjectId).toEqual({})
    expect(pathFacts.learnedClueIds).toEqual([])
    expect(pathFacts.priorChoiceIds).toEqual([])
  })

  it('defaults missing companion map to {} and ignores unknown companion values', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'companion.npc-irena', 'lost')
    game = setGlobalFlag(game, 'npc.npc-missing.companion', 'not-a-status')

    const pathFacts = projectBranchPathFactsFromGameState(game)
    expect(pathFacts.companionStatusById).toEqual({ 'npc-irena': 'lost' })
  })

  it('omits simulationTruth by default', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'sim.hidden.event.strahd-betrayal-reveal', true)
    game = setEncounterRuntimeState(game, 'case-001', {
      hiddenModifierIds: ['latent-surge'],
    })

    const pathFacts = projectBranchPathFactsFromGameState(game)
    expect(pathFacts.simulationTruth).toBeUndefined()
    expect(pathFacts.witnessedEventIds).not.toContain('latent-surge')
    expect(pathFacts.witnessedEventIds).not.toContain('strahd-betrayal-reveal')
  })

  it('keeps hidden simulation truth separate when includeSimulationTruth is true', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'sim.hidden.event.strahd-betrayal-reveal', true)
    game = setGlobalFlag(game, 'sim.hidden.clue.strahd-motive', true)
    game = setEncounterRuntimeState(game, 'case-001', {
      hiddenModifierIds: ['latent-surge'],
    })

    const pathFacts = projectBranchPathFactsFromGameState(game, {
      includeSimulationTruth: true,
    })

    expect(pathFacts.simulationTruth?.hiddenEventIds).toEqual(
      expect.arrayContaining(['event:latent-surge', 'event:strahd-betrayal-reveal'])
    )
    expect(pathFacts.simulationTruth?.hiddenLearnedClueIds).toEqual(['clue:strahd-motive'])
    expect(pathFacts.witnessedEventIds).not.toContain('event:latent-surge')
    expect(pathFacts.witnessedEventIds).not.toContain('event:strahd-betrayal-reveal')
    expect(pathFacts.learnedClueIds).not.toContain('clue:strahd-motive')
  })

  it('canonicalizes unqualified and dotted hidden flag suffixes', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'sim.hidden.event.strahd-betrayal-reveal', true)
    game = setGlobalFlag(game, 'sim.hidden.event:balcony-fall', true)
    game = setGlobalFlag(game, 'sim.hidden.event.event.hall-ambush', true)
    game = setGlobalFlag(game, 'sim.hidden.clue.strahd-motive', true)
    game = setGlobalFlag(game, 'sim.hidden.clue:rival-secret', true)
    game = setGlobalFlag(game, 'sim.hidden.clue.clue.archive-leak', true)

    const pathFacts = projectBranchPathFactsFromGameState(game, {
      includeSimulationTruth: true,
    })

    expect(pathFacts.simulationTruth?.hiddenEventIds).toEqual([
      'event:balcony-fall',
      'event:hall-ambush',
      'event:strahd-betrayal-reveal',
    ])
    expect(pathFacts.simulationTruth?.hiddenLearnedClueIds).toEqual([
      'clue:archive-leak',
      'clue:rival-secret',
      'clue:strahd-motive',
    ])
  })

  it('normalizes hidden simulation ids for player_awareness_leak validator matching', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'sim.hidden.event.strahd-betrayal-reveal', true)
    game = setGlobalFlag(game, 'sim.hidden.clue.strahd-motive', true)

    const pathFacts = projectBranchPathFactsFromGameState(game, {
      includeSimulationTruth: true,
    })

    const eventReport = validateBranchContinuity({
      pathFacts,
      nodes: [
        {
          nodeId: 'node:betrayal-dialogue',
          assumesPlayerKnows: { witnessedEventIds: ['event:strahd-betrayal-reveal'] },
        },
      ],
    })
    expect(
      eventReport.warnings.find(
        (warning) =>
          warning.nodeId === 'node:betrayal-dialogue' &&
          warning.warningClass === 'player_awareness_leak'
      )
    ).toBeDefined()
    expect(
      eventReport.warnings.find(
        (warning) =>
          warning.nodeId === 'node:betrayal-dialogue' &&
          warning.warningClass === 'unwitnessed_event'
      )
    ).toBeUndefined()

    const clueReport = validateBranchContinuity({
      pathFacts,
      nodes: [
        {
          nodeId: 'node:rival-motive',
          assumesPlayerKnows: { learnedClueIds: ['clue:strahd-motive'] },
        },
      ],
    })
    expect(
      clueReport.warnings.find(
        (warning) =>
          warning.nodeId === 'node:rival-motive' && warning.warningClass === 'player_awareness_leak'
      )
    ).toBeDefined()
  })

  it('produces deterministic sorted output', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'event:z-last', true)
    game = setGlobalFlag(game, 'event:a-first', true)
    game = adjustInventoryQuantity(game, 'zeta_item', 1)
    game = adjustInventoryQuantity(game, 'alpha_item', 1)

    const first = projectBranchPathFactsFromGameState(game)
    const second = projectBranchPathFactsFromGameState(game)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.witnessedEventIds).toEqual([...first.witnessedEventIds].sort())
    expect(first.acquiredItemIds).toEqual([...first.acquiredItemIds].sort())
  })

  it('does not mutate the input GameState', () => {
    const game = createStartingState()
    const before = JSON.stringify(game)

    projectBranchPathFactsFromGameState(game, { includeSimulationTruth: true })

    expect(JSON.stringify(game)).toBe(before)
  })

  it('applies options.flagPrefix to seedValues only', () => {
    let game = createStartingState()
    game = setGlobalFlag(game, 'branch.seed.alpha', 1)
    game = setGlobalFlag(game, 'other.flag', true)

    const pathFacts = projectBranchPathFactsFromGameState(game, { flagPrefix: 'branch.seed.' })
    expect(Object.keys(pathFacts.seedValues)).toEqual(['branch.seed.alpha'])
    expect(pathFacts.seedValues['branch.seed.alpha']).toBe(1)
  })
})
