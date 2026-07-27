import { describe, expect, it } from 'vitest'
import {
  advanceRivalExpeditionProgress,
  buildRivalExpeditionClueSignals,
  initializeRivalExpeditionProgress,
  projectRivalExpeditionProgressBand,
  validateRivalExpeditionDefinition,
  validateRivalExpeditionWeeklyConditions,
  type RivalExpeditionDefinition,
  type RivalExpeditionProgressPacket,
} from '../domain/rivalExpeditionProgress'

const DEFINITION: RivalExpeditionDefinition = {
  id: 'rival-expedition:glass-marsh',
  routeId: 'route:glass-marsh-north',
  objectiveId: 'objective:buried-relay',
  headStartWeeks: 0,
  routePace: 2,
  searchWorkRequired: 4,
  extractionWeeksRequired: 2,
  retreatWorkRequired: 3,
  startingPersonnel: 5,
}

function initialize(
  definition: RivalExpeditionDefinition = DEFINITION,
  currentWeek = 5
): RivalExpeditionProgressPacket {
  const result = initializeRivalExpeditionProgress(definition, currentWeek)
  expect(result.status).toBe('ready')
  expect(result.packet).not.toBeNull()
  return result.packet!
}

describe('rivalExpeditionProgress (SPE-2740)', () => {
  it('validates definition identifiers and bounded integer fields', () => {
    const result = validateRivalExpeditionDefinition({
      ...DEFINITION,
      id: ' ',
      routeId: '',
      objectiveId: '\t',
      headStartWeeks: -1,
      routePace: 0,
      searchWorkRequired: 1.5,
      extractionWeeksRequired: Number.NaN,
      retreatWorkRequired: -3,
      startingPersonnel: Number.MAX_SAFE_INTEGER + 1,
    })

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'missing_expedition_id',
      'missing_route_id',
      'missing_objective_id',
      'invalid_head_start_weeks',
      'invalid_route_pace',
      'invalid_search_work',
      'invalid_extraction_duration',
      'invalid_retreat_work',
      'invalid_starting_personnel',
    ])
  })

  it('validates weekly casualty and pace inputs', () => {
    const result = validateRivalExpeditionWeeklyConditions({
      week: 1.5,
      casualties: -1,
      pacePenalty: Number.POSITIVE_INFINITY,
    })

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'invalid_week',
      'invalid_casualties',
      'invalid_pace_penalty',
    ])
  })

  it('blocks invalid current weeks and head starts before campaign week zero', () => {
    expect(initializeRivalExpeditionProgress(DEFINITION, -1).issues[0]?.code).toBe(
      'invalid_current_week'
    )
    expect(
      initializeRivalExpeditionProgress({ ...DEFINITION, headStartWeeks: 6 }, 5).issues[0]?.code
    ).toBe('head_start_before_campaign')
  })

  it('replays a no-attrition head start through at most one transition per week', () => {
    const definition = {
      ...DEFINITION,
      headStartWeeks: 3,
      searchWorkRequired: 2,
      extractionWeeksRequired: 1,
    }
    const result = initializeRivalExpeditionProgress(definition, 8)

    expect(result.status).toBe('ready')
    expect(result.packet).toMatchObject({
      departedWeek: 5,
      lastAdvancedWeek: 7,
      phase: 'retreating',
      searchProgress: 2,
      extractionWeeksElapsed: 1,
      retreatProgress: 2,
      activePersonnel: 5,
      cumulativeCasualties: 0,
    })
    expect(result.clueSignals.map((signal) => [signal.week, signal.kind])).toEqual([
      [5, 'search_trace'],
      [6, 'extraction_trace'],
    ])
  })

  it('fast-forwards very large safe-integer head starts without per-week iteration', () => {
    const result = initializeRivalExpeditionProgress(
      {
        ...DEFINITION,
        headStartWeeks: Number.MAX_SAFE_INTEGER,
        routePace: 1,
        searchWorkRequired: Number.MAX_SAFE_INTEGER,
        extractionWeeksRequired: Number.MAX_SAFE_INTEGER,
        retreatWorkRequired: Number.MAX_SAFE_INTEGER,
      },
      Number.MAX_SAFE_INTEGER
    )

    expect(result.status).toBe('ready')
    expect(result.packet).toMatchObject({
      departedWeek: 0,
      lastAdvancedWeek: Number.MAX_SAFE_INTEGER - 1,
      phase: 'extracting',
      searchProgress: Number.MAX_SAFE_INTEGER,
      extractionWeeksElapsed: 0,
    })
    expect(result.clueSignals.map((signal) => [signal.week, signal.kind])).toEqual([
      [Number.MAX_SAFE_INTEGER - 1, 'search_trace'],
    ])
  })

  it('advances searching through extraction and retreat on a deterministic calendar', () => {
    let packet = initialize()

    const week5 = advanceRivalExpeditionProgress(packet, { week: 5 })
    packet = week5.packet
    expect(packet).toMatchObject({ phase: 'searching', searchProgress: 2 })
    expect(week5.clueSignals).toEqual([])

    const week6 = advanceRivalExpeditionProgress(packet, { week: 6 })
    packet = week6.packet
    expect(packet).toMatchObject({ phase: 'extracting', searchProgress: 4 })
    expect(week6.clueSignals.map((signal) => signal.kind)).toEqual(['search_trace'])

    packet = advanceRivalExpeditionProgress(packet, { week: 7 }).packet
    expect(packet).toMatchObject({ phase: 'extracting', extractionWeeksElapsed: 1 })

    const week8 = advanceRivalExpeditionProgress(packet, { week: 8 })
    packet = week8.packet
    expect(packet).toMatchObject({ phase: 'retreating', extractionWeeksElapsed: 2 })
    expect(week8.clueSignals.map((signal) => signal.kind)).toEqual(['extraction_trace'])

    packet = advanceRivalExpeditionProgress(packet, { week: 9 }).packet
    expect(packet).toMatchObject({ phase: 'retreating', retreatProgress: 2 })

    const week10 = advanceRivalExpeditionProgress(packet, { week: 10 })
    expect(week10.packet).toMatchObject({
      phase: 'completed',
      retreatProgress: 3,
      completedWeek: 10,
    })
    expect(week10.clueSignals.map((signal) => signal.kind)).toEqual(['retreat_trace'])
  })

  it('applies casualties before progress and uses explicit pace penalties', () => {
    const packet = initialize()
    const result = advanceRivalExpeditionProgress(packet, {
      week: 5,
      casualties: 2,
      pacePenalty: 1,
    })

    expect(result.packet).toMatchObject({
      activePersonnel: 3,
      cumulativeCasualties: 2,
      phase: 'searching',
      searchProgress: 1,
    })
    expect(result.clueSignals.map((signal) => signal.kind)).toEqual(['casualty_trace'])
    expect(result.clueSignals[0]).not.toHaveProperty('activePersonnel')
    expect(result.clueSignals[0]).not.toHaveProperty('casualties')
    expect(result.clueSignals[0]).not.toHaveProperty('searchProgress')
  })

  it('clamps effective pace at zero without stalling the campaign week', () => {
    const packet = initialize()
    const result = advanceRivalExpeditionProgress(packet, {
      week: 5,
      pacePenalty: 99,
    })

    expect(result.status).toBe('advanced')
    expect(result.packet).toMatchObject({
      phase: 'searching',
      searchProgress: 0,
      lastAdvancedWeek: 5,
    })
    expect(result.clueSignals).toEqual([])
  })

  it('discards phase overflow so each phase retains its own time cost', () => {
    const packet = initialize({
      ...DEFINITION,
      routePace: 10,
      searchWorkRequired: 1,
      extractionWeeksRequired: 1,
      retreatWorkRequired: 1,
    })

    const searched = advanceRivalExpeditionProgress(packet, { week: 5 }).packet
    expect(searched).toMatchObject({
      phase: 'extracting',
      searchProgress: 1,
      extractionWeeksElapsed: 0,
      retreatProgress: 0,
    })

    const extracted = advanceRivalExpeditionProgress(searched, { week: 6 }).packet
    expect(extracted).toMatchObject({
      phase: 'retreating',
      extractionWeeksElapsed: 1,
      retreatProgress: 0,
    })
  })

  it('clamps casualties to active personnel and records a deterministic loss', () => {
    const packet = initialize()
    const result = advanceRivalExpeditionProgress(packet, { week: 5, casualties: 99 })

    expect(result.packet).toMatchObject({
      phase: 'lost',
      activePersonnel: 0,
      cumulativeCasualties: 5,
      lostWeek: 5,
    })
    expect(result.clueSignals.map((signal) => signal.kind)).toEqual(['casualty_trace', 'loss_site'])
    expect(result.clueSignals.map((signal) => signal.progressBand)).toEqual([
      'terminal',
      'terminal',
    ])
  })

  it('makes same/past-week and terminal replay immutable no-ops', () => {
    const packet = initialize()
    const advanced = advanceRivalExpeditionProgress(packet, { week: 5 })

    const sameWeek = advanceRivalExpeditionProgress(advanced.packet, {
      week: 5,
      casualties: -1,
      pacePenalty: Number.NaN,
    })
    expect(sameWeek.status).toBe('unchanged')
    expect(sameWeek.packet).toBe(advanced.packet)
    expect(sameWeek.clueSignals).toEqual([])

    const pastWeek = advanceRivalExpeditionProgress(advanced.packet, { week: 4 })
    expect(pastWeek.status).toBe('unchanged')
    expect(pastWeek.packet).toBe(advanced.packet)

    const lost = advanceRivalExpeditionProgress(packet, { week: 5, casualties: 5 }).packet
    const terminalReplay = advanceRivalExpeditionProgress(lost, { week: 50, casualties: 1 })
    expect(terminalReplay.status).toBe('unchanged')
    expect(terminalReplay.packet).toBe(lost)
  })

  it('fails closed on a skipped week without mutating the packet', () => {
    const packet = initialize()
    const result = advanceRivalExpeditionProgress(packet, {
      week: 6,
      casualties: 1,
    })

    expect(result.status).toBe('blocked')
    expect(result.packet).toBe(packet)
    expect(result.issues.map((issue) => issue.code)).toEqual(['week_gap'])
    expect(result.clueSignals).toEqual([])
  })

  it('fails closed on malformed future-week pressure inputs', () => {
    const packet = initialize()
    const result = advanceRivalExpeditionProgress(packet, {
      week: 5,
      casualties: Number.MAX_SAFE_INTEGER + 1,
      pacePenalty: -1,
    })

    expect(result.status).toBe('blocked')
    expect(result.packet).toBe(packet)
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'invalid_casualties',
      'invalid_pace_penalty',
    ])
  })

  it('emits deterministically ordered coarse clue signals', () => {
    const previous = initialize({
      ...DEFINITION,
      searchWorkRequired: 1,
    })
    const next = advanceRivalExpeditionProgress(previous, {
      week: 5,
      casualties: 1,
    }).packet

    const signals = buildRivalExpeditionClueSignals(previous, next, 5, 1)
    expect(signals.map((signal) => signal.kind)).toEqual(['casualty_trace', 'search_trace'])
    expect(signals.map((signal) => signal.id)).toEqual([
      'rival-expedition:glass-marsh:clue:5:casualty_trace',
      'rival-expedition:glass-marsh:clue:5:search_trace',
    ])
    expect(signals.map((signal) => signal.progressBand)).toEqual(['early', 'complete'])
    expect(signals.every((signal) => signal.phase === 'extracting')).toBe(true)
  })

  it('projects coarse progress bands without leaking exact counters', () => {
    let packet = initialize({
      ...DEFINITION,
      routePace: 1,
      searchWorkRequired: 4,
    })

    expect(projectRivalExpeditionProgressBand(packet)).toBe('early')
    packet = advanceRivalExpeditionProgress(packet, { week: 5 }).packet
    expect(projectRivalExpeditionProgressBand(packet)).toBe('early')
    packet = advanceRivalExpeditionProgress(packet, { week: 6 }).packet
    expect(projectRivalExpeditionProgressBand(packet)).toBe('mid')
    packet = advanceRivalExpeditionProgress(packet, { week: 7 }).packet
    expect(projectRivalExpeditionProgressBand(packet)).toBe('late')
  })

  it('is byte-stable for identical definitions and weekly inputs', () => {
    const run = () => {
      let packet = initialize({ ...DEFINITION, headStartWeeks: 1 }, 5)
      const clues = []
      for (const conditions of [
        { week: 5, casualties: 1, pacePenalty: 1 },
        { week: 6, casualties: 0, pacePenalty: 0 },
        { week: 7, casualties: 0, pacePenalty: 0 },
      ]) {
        const result = advanceRivalExpeditionProgress(packet, conditions)
        packet = result.packet
        clues.push(...result.clueSignals)
      }
      return JSON.stringify({ packet, clues })
    }

    expect(run()).toBe(run())
  })

  it('does not mutate definitions, packets, weekly inputs, or prior clue arrays', () => {
    const definition = { ...DEFINITION }
    const conditions = { week: 5, casualties: 1, pacePenalty: 1 }
    const packet = initialize(definition)
    const definitionBefore = structuredClone(definition)
    const packetBefore = structuredClone(packet)
    const conditionsBefore = structuredClone(conditions)
    const priorClues = Object.freeze([] as const)

    const result = advanceRivalExpeditionProgress(packet, conditions)
    const rebuilt = buildRivalExpeditionClueSignals(packet, result.packet, 5, 1)

    expect(definition).toEqual(definitionBefore)
    expect(packet).toEqual(packetBefore)
    expect(conditions).toEqual(conditionsBefore)
    expect(priorClues).toEqual([])
    expect(Object.isFrozen(result.packet)).toBe(true)
    expect(Object.isFrozen(result.packet.definition)).toBe(true)
    expect(Object.isFrozen(result.clueSignals)).toBe(true)
    expect(Object.isFrozen(rebuilt)).toBe(true)
  })
})
