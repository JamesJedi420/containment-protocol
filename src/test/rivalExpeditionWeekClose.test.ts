import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  advanceRivalExpeditionProgress,
  advanceRivalExpeditionRegistryAtWeekClose,
  initializeRivalExpeditionProgress,
  normalizeRivalExpeditionClueRegistry,
  normalizeRivalExpeditionProgressRegistry,
  type RivalExpeditionDefinition,
  type RivalExpeditionProgressPacket,
} from '../domain/rivalExpeditionProgress'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { normalizeGameState } from '../domain/teamSimulation'
import { hydrateGame, stripGameTemplates } from '../app/store/runTransfer'
import {
  createGameSavePayload,
  GAME_SAVE_VERSION,
  loadGameSave,
  serializeGameSave,
} from '../app/store/saveSystem'

const BASE_DEFINITION: RivalExpeditionDefinition = {
  id: 'rival-expedition:alpha',
  routeId: 'route:alpha',
  objectiveId: 'objective:alpha',
  headStartWeeks: 0,
  routePace: 1,
  searchWorkRequired: 1,
  extractionWeeksRequired: 1,
  retreatWorkRequired: 1,
  startingPersonnel: 3,
}

function initializePacket(
  id: string,
  currentWeek = 5,
  overrides: Partial<RivalExpeditionDefinition> = {}
): RivalExpeditionProgressPacket {
  const initialized = initializeRivalExpeditionProgress(
    {
      ...BASE_DEFINITION,
      ...overrides,
      id,
      routeId: `route:${id}`,
      objectiveId: `objective:${id}`,
    },
    currentWeek
  )

  expect(initialized.status).toBe('ready')
  return initialized.packet!
}

function withoutRivalState<T extends Record<string, unknown>>(state: T) {
  const {
    rivalExpeditionProgressPackets: _packets,
    rivalExpeditionClues: _clues,
    ...unrelated
  } = state
  void _packets
  void _clues
  return unrelated
}

describe('rival expedition persistence and week-close (SPE-2741)', () => {
  it('normalizes packet and clue registries in stable order while dropping malformed siblings', () => {
    const bravo = initializePacket('bravo')
    const alpha = initializePacket('alpha')
    const alphaAdvance = advanceRivalExpeditionProgress(alpha, {
      week: 5,
      casualties: 1,
      pacePenalty: 0,
    })
    const [casualtyClue, searchClue] = alphaAdvance.clueSignals

    const packets = normalizeRivalExpeditionProgressRegistry({
      bravo,
      malformed: { ...alpha, activePersonnel: 99 },
      alpha,
      'wrong-key': bravo,
    })
    const clues = normalizeRivalExpeditionClueRegistry({
      [searchClue!.id]: searchClue,
      malformed: { ...searchClue, week: -1 },
      [casualtyClue!.id]: casualtyClue,
      'wrong-key': casualtyClue,
    })

    expect(Object.keys(packets)).toEqual(['alpha', 'bravo'])
    expect(Object.keys(clues)).toEqual([casualtyClue!.id, searchClue!.id])
    expect(Object.isFrozen(packets)).toBe(true)
    expect(Object.isFrozen(packets.alpha)).toBe(true)
    expect(Object.isFrozen(packets.alpha?.definition)).toBe(true)
    expect(Object.isFrozen(clues)).toBe(true)
    expect(Object.isFrozen(clues[casualtyClue!.id])).toBe(true)

    const packetCollisionA = normalizeRivalExpeditionProgressRegistry({
      alpha,
      ' alpha ': alphaAdvance.packet,
    })
    const packetCollisionB = normalizeRivalExpeditionProgressRegistry({
      ' alpha ': alphaAdvance.packet,
      alpha,
    })
    expect(packetCollisionA).toEqual({ alpha })
    expect(JSON.stringify(packetCollisionA)).toBe(JSON.stringify(packetCollisionB))

    const conflictingClue = { ...casualtyClue!, progressBand: 'mid' as const }
    const clueCollisionA = normalizeRivalExpeditionClueRegistry({
      [casualtyClue!.id]: casualtyClue,
      [` ${casualtyClue!.id} `]: conflictingClue,
    })
    const clueCollisionB = normalizeRivalExpeditionClueRegistry({
      [` ${casualtyClue!.id} `]: conflictingClue,
      [casualtyClue!.id]: casualtyClue,
    })
    expect(clueCollisionA).toEqual({ [casualtyClue!.id]: casualtyClue })
    expect(JSON.stringify(clueCollisionA)).toBe(JSON.stringify(clueCollisionB))

    const normalizedState = normalizeGameState({
      ...createStartingState(),
      rivalExpeditionProgressPackets: {
        bravo,
        malformed: { ...alpha, phase: 'completed' },
        alpha,
      } as never,
      rivalExpeditionClues: {
        [searchClue!.id]: searchClue,
        malformed: { id: '' },
        [casualtyClue!.id]: casualtyClue,
      } as never,
    })

    expect(Object.keys(normalizedState.rivalExpeditionProgressPackets ?? {})).toEqual([
      'alpha',
      'bravo',
    ])
    expect(Object.keys(normalizedState.rivalExpeditionClues ?? {})).toEqual([
      casualtyClue!.id,
      searchClue!.id,
    ])
  })

  it('hydrates legacy state to empty registries and preserves valid siblings only', () => {
    const fallback = createStartingState()
    const legacy = stripGameTemplates(fallback) as Record<string, unknown>
    delete legacy.rivalExpeditionProgressPackets
    delete legacy.rivalExpeditionClues

    const hydratedLegacy = hydrateGame(legacy, fallback)
    expect(hydratedLegacy.rivalExpeditionProgressPackets).toEqual({})
    expect(hydratedLegacy.rivalExpeditionClues).toEqual({})

    const alpha = initializePacket('alpha')
    const hydratedMixed = hydrateGame(
      {
        ...legacy,
        rivalExpeditionProgressPackets: {
          malformed: { ...alpha, cumulativeCasualties: 2 },
          alpha,
        },
        rivalExpeditionClues: { malformed: { id: '' } },
      },
      fallback
    )

    expect(Object.keys(hydratedMixed.rivalExpeditionProgressPackets ?? {})).toEqual(['alpha'])
    expect(hydratedMixed.rivalExpeditionClues).toEqual({})
    expect(Object.isFrozen(hydratedMixed.rivalExpeditionProgressPackets)).toBe(true)
    expect(Object.isFrozen(hydratedMixed.rivalExpeditionProgressPackets?.alpha)).toBe(true)
  })

  it('round-trips packet and clue registries without a save-version change', () => {
    const state = createStartingState()
    const packet = initializePacket('alpha', state.week)
    const advanced = advanceRivalExpeditionProgress(packet, {
      week: state.week,
      casualties: 1,
      pacePenalty: 0,
    })
    const game = {
      ...state,
      rivalExpeditionProgressPackets: { alpha: advanced.packet },
      rivalExpeditionClues: Object.fromEntries(
        advanced.clueSignals.map((signal) => [signal.id, signal])
      ),
    }

    expect(createGameSavePayload(game).version).toBe(GAME_SAVE_VERSION)
    expect(GAME_SAVE_VERSION).toBe(1)

    const loaded = loadGameSave(serializeGameSave(game), state)
    expect(loaded.rivalExpeditionProgressPackets).toEqual(game.rivalExpeditionProgressPackets)
    expect(loaded.rivalExpeditionClues).toEqual(game.rivalExpeditionClues)
  })

  it('advances multiple expeditions in stable order with explicit conditions and deduped clues', () => {
    const alpha = initializePacket('alpha')
    const bravo = initializePacket('bravo')
    const preexistingAlphaClue = advanceRivalExpeditionProgress(alpha, {
      week: 5,
      casualties: 0,
      pacePenalty: 0,
    }).clueSignals[0]!
    const result = advanceRivalExpeditionRegistryAtWeekClose(
      { bravo, alpha },
      { [preexistingAlphaClue.id]: preexistingAlphaClue },
      5,
      {
        bravo: { casualties: 0, pacePenalty: 0 },
        alpha: { casualties: 0, pacePenalty: 0 },
      }
    )

    expect(Object.keys(result.packets)).toEqual(['alpha', 'bravo'])
    expect(Object.values(result.packets).map((packet) => packet.lastAdvancedWeek)).toEqual([5, 5])
    expect(Object.keys(result.clues)).toEqual([
      'alpha:clue:5:search_trace',
      'bravo:clue:5:search_trace',
    ])
    expect(result.issues).toEqual([])

    const reordered = advanceRivalExpeditionRegistryAtWeekClose(
      { alpha, bravo },
      { [preexistingAlphaClue.id]: preexistingAlphaClue },
      5,
      {
        alpha: { casualties: 0, pacePenalty: 0 },
        bravo: { casualties: 0, pacePenalty: 0 },
      }
    )
    expect(JSON.stringify(reordered)).toBe(JSON.stringify(result))

    const replay = advanceRivalExpeditionRegistryAtWeekClose(result.packets, result.clues, 5, {})
    expect(replay).toEqual(result)
  })

  it('fails closed without explicit pressure and leaves terminal packets idempotent', () => {
    const active = initializePacket('active')
    const lost = advanceRivalExpeditionProgress(initializePacket('lost'), {
      week: 5,
      casualties: 3,
      pacePenalty: 0,
    }).packet

    const result = advanceRivalExpeditionRegistryAtWeekClose({ lost, active }, {}, 6, {
      lost: { casualties: 1, pacePenalty: 1 },
    })

    expect(result.packets.active).toEqual(active)
    expect(result.packets.lost).toEqual(lost)
    expect(result.issues.map((issue) => [issue.expeditionId, issue.code])).toEqual([
      ['active', 'missing_weekly_conditions'],
    ])
  })

  it('uses the closing week and zero pressure without changing unrelated weekly output', () => {
    const baseline = createStartingState()
    const packet = initializePacket('alpha', baseline.week)
    const direct = advanceRivalExpeditionProgress(packet, {
      week: baseline.week,
      casualties: 0,
      pacePenalty: 0,
    })
    const withRival = {
      ...structuredClone(baseline),
      rivalExpeditionProgressPackets: { alpha: packet },
      rivalExpeditionClues: {},
    }

    const baselineNext = advanceWeek(structuredClone(baseline), 1_700_000_000_000)
    const rivalNext = advanceWeek(withRival, 1_700_000_000_000)

    expect(rivalNext.week).toBe(baseline.week + 1)
    expect(rivalNext.rivalExpeditionProgressPackets?.alpha).toEqual(direct.packet)
    expect(rivalNext.rivalExpeditionClues).toEqual(
      Object.fromEntries(direct.clueSignals.map((signal) => [signal.id, signal]))
    )
    expect(withRival.rivalExpeditionProgressPackets.alpha).toEqual(packet)
    expect(withRival.rivalExpeditionClues).toEqual({})
    expect(withoutRivalState(rivalNext)).toEqual(withoutRivalState(baselineNext))
  })
})
