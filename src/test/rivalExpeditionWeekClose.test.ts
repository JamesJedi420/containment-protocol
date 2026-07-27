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
    const bravoAdvance = advanceRivalExpeditionProgress(bravo, {
      week: 5,
      casualties: 0,
      pacePenalty: 0,
    })
    const [casualtyClue, searchClue] = alphaAdvance.clueSignals
    const lostAdvance = advanceRivalExpeditionProgress(initializePacket('lost'), {
      week: 5,
      casualties: 3,
      pacePenalty: 0,
    })
    const lost = lostAdvance.packet

    const packets = normalizeRivalExpeditionProgressRegistry({
      bravo,
      malformed: { ...alpha, activePersonnel: 99 },
      'malformed-lost': { ...lost, extractionWeeksElapsed: 1 },
      unreachable: {
        ...initializePacket('unreachable'),
        phase: 'extracting',
        searchProgress: 1,
      },
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

    const prototypeNamedOrphan = {
      ...casualtyClue!,
      id: 'toString:clue:5:casualty_trace',
      expeditionId: 'toString',
    }
    expect(
      normalizeRivalExpeditionClueRegistry(
        { [prototypeNamedOrphan.id]: prototypeNamedOrphan },
        packets
      )
    ).toEqual({})
    expect(
      normalizeRivalExpeditionClueRegistry({ [searchClue!.id]: searchClue }, { alpha })
    ).toEqual({})

    const preDepartureClue = {
      ...casualtyClue!,
      id: 'alpha:clue:4:casualty_trace',
      week: 4,
    }
    const conflictingTerminalClue = {
      ...casualtyClue!,
      id: 'alpha:clue:5:loss_site',
      kind: 'loss_site' as const,
      phase: 'lost' as const,
      progressBand: 'terminal' as const,
    }
    expect(
      normalizeRivalExpeditionClueRegistry(
        {
          [preDepartureClue.id]: preDepartureClue,
          [conflictingTerminalClue.id]: conflictingTerminalClue,
        },
        { alpha: alphaAdvance.packet }
      )
    ).toEqual({})
    const aheadOfPacketClue = {
      ...casualtyClue!,
      phase: 'retreating' as const,
    }
    expect(
      normalizeRivalExpeditionClueRegistry(
        { [aheadOfPacketClue.id]: aheadOfPacketClue },
        { alpha: alphaAdvance.packet }
      )
    ).toEqual({})
    const validLostClues = Object.fromEntries(
      lostAdvance.clueSignals.map((signal) => [signal.id, signal])
    )
    expect(normalizeRivalExpeditionClueRegistry(validLostClues, { lost })).toEqual(validLostClues)

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

    const numericId = initializeRivalExpeditionProgress({ ...BASE_DEFINITION, id: '2' }, 5)
    expect(numericId.status).toBe('blocked')
    expect(numericId.issues.map((issue) => issue.code)).toContain('invalid_expedition_id')

    const normalizedState = normalizeGameState({
      ...createStartingState(),
      week: 6,
      rivalExpeditionProgressPackets: {
        bravo: bravoAdvance.packet,
        malformed: { ...alpha, phase: 'completed' },
        alpha: alphaAdvance.packet,
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

  it('retains only collectively reachable clue history in deterministic order', () => {
    const initial = initializePacket('history')
    const searched = advanceRivalExpeditionProgress(initial, {
      week: 5,
      casualties: 1,
      pacePenalty: 0,
    })
    const extracted = advanceRivalExpeditionProgress(searched.packet, {
      week: 6,
      casualties: 0,
      pacePenalty: 0,
    })
    const completed = advanceRivalExpeditionProgress(extracted.packet, {
      week: 7,
      casualties: 0,
      pacePenalty: 0,
    })
    const validSignals = [
      ...searched.clueSignals,
      ...extracted.clueSignals,
      ...completed.clueSignals,
    ]
    const validRegistry = Object.fromEntries(validSignals.map((signal) => [signal.id, signal]))

    expect(
      normalizeRivalExpeditionClueRegistry(validRegistry, { history: completed.packet })
    ).toEqual(validRegistry)

    const casualty = searched.clueSignals.find((signal) => signal.kind === 'casualty_trace')!
    const search = searched.clueSignals.find((signal) => signal.kind === 'search_trace')!
    const extraction = extracted.clueSignals.find((signal) => signal.kind === 'extraction_trace')!
    const retreat = completed.clueSignals.find((signal) => signal.kind === 'retreat_trace')!
    const extraCasualty = {
      ...casualty,
      id: 'history:clue:6:casualty_trace',
      week: 6,
      phase: 'retreating' as const,
    }
    const sameWeekExtraction = {
      ...extraction,
      id: 'history:clue:5:extraction_trace',
      week: 5,
    }
    const malformedRegistry = Object.fromEntries(
      [casualty, search, extraCasualty, sameWeekExtraction, retreat].map((signal) => [
        signal.id,
        signal,
      ])
    )

    expect(
      Object.keys(
        normalizeRivalExpeditionClueRegistry(malformedRegistry, {
          history: completed.packet,
        })
      )
    ).toEqual([search.id, retreat.id])
  })

  it('hydrates legacy state to empty registries and preserves valid siblings only', () => {
    const fallback = createStartingState()
    const legacy = stripGameTemplates(fallback) as Record<string, unknown>
    delete legacy.rivalExpeditionProgressPackets
    delete legacy.rivalExpeditionClues

    const hydratedLegacy = hydrateGame(legacy, fallback)
    expect(hydratedLegacy.rivalExpeditionProgressPackets).toEqual({})
    expect(hydratedLegacy.rivalExpeditionClues).toEqual({})

    const alpha = initializePacket('alpha', fallback.week)
    const futureAdvance = {
      ...initializePacket('future-advance', fallback.week),
      lastAdvancedWeek: fallback.week,
    }
    const futureDeparture = {
      ...initializePacket('future-departure', fallback.week),
      departedWeek: fallback.week + 1,
      lastAdvancedWeek: fallback.week,
    }
    const hydratedMixed = hydrateGame(
      {
        ...legacy,
        rivalExpeditionProgressPackets: {
          malformed: { ...alpha, cumulativeCasualties: 2 },
          'future-advance': futureAdvance,
          'future-departure': futureDeparture,
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

    const staleCampaignWeek = 10
    const hydratedStale = hydrateGame(
      {
        ...legacy,
        week: staleCampaignWeek,
        rivalExpeditionProgressPackets: {
          stale: initializePacket('stale', staleCampaignWeek - 1),
        },
      },
      fallback
    )
    expect(hydratedStale.rivalExpeditionProgressPackets).toEqual({})
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
      week: state.week + 1,
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

    const prototypeNamedPacket = initializePacket('__proto__')
    const prototypeNamedResult = advanceRivalExpeditionRegistryAtWeekClose(
      Object.fromEntries([['__proto__', prototypeNamedPacket]]),
      {},
      5,
      Object.fromEntries([['__proto__', { casualties: 0, pacePenalty: 0 }]])
    )
    expect(Object.hasOwn(prototypeNamedResult.packets, '__proto__')).toBe(true)
    expect(prototypeNamedResult.packets.__proto__?.lastAdvancedWeek).toBe(5)
    expect(Object.keys(prototypeNamedResult.clues)).toEqual(['__proto__:clue:5:search_trace'])

    const replay = advanceRivalExpeditionRegistryAtWeekClose(result.packets, result.clues, 5, {})
    expect(replay).toEqual(result)
  })

  it('fails closed without explicit pressure and leaves terminal packets idempotent', () => {
    const active = initializePacket('active', 6)
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

    const inheritedPressure = Object.create({
      active: { casualties: 0, pacePenalty: 0 },
    })
    const inheritedResult = advanceRivalExpeditionRegistryAtWeekClose(
      { active },
      {},
      6,
      inheritedPressure
    )
    expect(inheritedResult.packets.active).toEqual(active)
    expect(inheritedResult.issues.map((issue) => issue.code)).toEqual(['missing_weekly_conditions'])
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
