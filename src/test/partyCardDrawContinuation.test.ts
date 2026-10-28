import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createSeededRng } from '../domain/math'
import {
  drawPartyCardsToHandLimitWithScopedContinuation,
  drawPartyCardsWithScopedContinuation,
  ensurePartyCardDrawContinuation,
  PARTY_CARD_DRAW_CUTOVER_MARKER_ID,
  partyCardHistoryFingerprint,
} from '../domain/partyCards/drawContinuation'
import { drawPartyCards } from '../domain/partyCards/engine'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { sanitizePersistedPartyCardState } from '../domain/partyCards/sanitize'

describe('SPE-3164 party-card draw continuation', () => {
  it('establishes exactly-once cutover without changing card zones', () => {
    const state = createStartingState()
    const cards = state.partyCards!
    const beforeFingerprint = partyCardHistoryFingerprint(cards)

    const first = ensurePartyCardDrawContinuation({
      partyCards: cards,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState,
      week: state.week,
    })
    expect(first.cutoverApplied).toBe(true)
    expect(first.continuation.cutoverMarkerId).toBe(PARTY_CARD_DRAW_CUTOVER_MARKER_ID)
    expect(partyCardHistoryFingerprint(first.partyCards)).toBe(beforeFingerprint)
    expect(first.partyCards.deck).toEqual(cards.deck)
    expect(first.partyCards.hand).toEqual(cards.hand)
    expect(first.partyCards.discard).toEqual(cards.discard)

    const second = ensurePartyCardDrawContinuation({
      partyCards: first.partyCards,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState + 999,
      week: state.week,
    })
    expect(second.cutoverApplied).toBe(false)
    expect(second.continuation.streamState).toBe(first.continuation.streamState)
  })

  it('manual draws are deterministic across save/resume and ignore campaign rngState', () => {
    const base = createStartingState()
    const rngBefore = base.rngState

    const first = drawPartyCardsWithScopedContinuation({
      partyCards: base.partyCards!,
      count: 2,
      runSeed: base.rngSeed,
      legacyRngState: base.rngState,
      week: base.week,
    })
    expect(first.drawnCardIds).toHaveLength(2)
    expect(first.nextState.drawContinuation).toBeDefined()

    const resumed = sanitizePersistedPartyCardState(
      structuredClone(first.nextState),
      createStartingState().partyCards,
      base.cases,
      base.teams,
      base.week,
    )!
    expect(resumed.drawContinuation?.streamState).toBe(
      first.nextState.drawContinuation!.streamState,
    )

    const secondA = drawPartyCardsWithScopedContinuation({
      partyCards: first.nextState,
      count: 1,
      runSeed: base.rngSeed,
      legacyRngState: rngBefore + 50_000,
      week: base.week,
    })
    const secondB = drawPartyCardsWithScopedContinuation({
      partyCards: resumed,
      count: 1,
      runSeed: base.rngSeed,
      legacyRngState: rngBefore,
      week: base.week,
    })

    expect(secondA.drawnCardIds).toEqual(secondB.drawnCardIds)
    expect(secondA.nextState.hand).toEqual(secondB.nextState.hand)
    // Campaign stream evidence is not part of draw identity after cutover.
    expect(rngBefore).toBe(base.rngState)
  })

  it('unrelated stochastic calls do not change the next party-card draw', () => {
    const state = createStartingState()
    const cutover = ensurePartyCardDrawContinuation({
      partyCards: state.partyCards!,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState,
      week: state.week,
    })

    const baseline = drawPartyCardsWithScopedContinuation({
      partyCards: cutover.partyCards,
      count: 1,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState,
      week: state.week,
    })

    const perturbedCampaign = createSeededRng(state.rngState)
    perturbedCampaign.next()
    perturbedCampaign.next()
    perturbedCampaign.next()

    const afterPerturb = drawPartyCardsWithScopedContinuation({
      partyCards: cutover.partyCards,
      count: 1,
      runSeed: state.rngSeed,
      legacyRngState: perturbedCampaign.getState(),
      week: state.week,
    })

    expect(afterPerturb.drawnCardIds).toEqual(baseline.drawnCardIds)
    expect(afterPerturb.nextState.hand).toEqual(baseline.nextState.hand)
  })

  it('manual and weekly hand-limit paths share one continuation contract', () => {
    const state = createStartingState()
    const afterManual = drawPartyCardsWithScopedContinuation({
      partyCards: state.partyCards!,
      count: 1,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState,
      week: state.week,
    })

    const weekly = drawPartyCardsToHandLimitWithScopedContinuation({
      partyCards: afterManual.nextState,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState,
      week: state.week,
    })

    expect(weekly.nextState.hand.length).toBe(weekly.nextState.maxHandSize)
    expect(weekly.nextState.drawContinuation?.cutoverMarkerId).toBe(
      afterManual.nextState.drawContinuation?.cutoverMarkerId,
    )
    // Pure deck shifts do not consume RNG; force a reshuffle so the shared
    // continuation advances under the same contract.
    const exhausted = {
      ...weekly.nextState,
      deck: [] as string[],
      discard: [...weekly.nextState.deck, ...weekly.nextState.discard],
    }
    const afterReshuffle = drawPartyCardsWithScopedContinuation({
      partyCards: exhausted,
      count: 1,
      runSeed: state.rngSeed,
      legacyRngState: state.rngState,
      week: state.week,
    })
    expect(afterReshuffle.nextState.drawContinuation!.streamState).not.toBe(
      weekly.nextState.drawContinuation!.streamState,
    )
  })

  it('advanceWeek party-card refresh does not advance campaign rngState for draws', () => {
    const state = createStartingState()
    state.rngSeed = 77
    state.rngState = 77

    const withAssignment = assignTeam(state, 'case-001', 't_nightwatch')
    withAssignment.cases['case-001'] = {
      ...withAssignment.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      difficulty: { combat: 400, investigation: 400, utility: 400, social: 400 },
    }

    // Empty deck + discard forces a reshuffle so the scoped stream is consumed.
    withAssignment.partyCards = {
      ...withAssignment.partyCards!,
      hand: [],
      deck: [],
      discard: [
        ...withAssignment.partyCards!.deck,
        ...withAssignment.partyCards!.hand,
        ...withAssignment.partyCards!.discard,
      ],
    }

    const root = ensurePartyCardDrawContinuation({
      partyCards: withAssignment.partyCards,
      runSeed: 77,
      legacyRngState: 77,
      week: withAssignment.week,
    })
    withAssignment.partyCards = root.partyCards

    const next = advanceWeek(withAssignment)

    expect(next.partyCards?.hand.length).toBe(next.partyCards!.maxHandSize)
    expect(next.partyCards?.drawContinuation?.cutoverMarkerId).toBe(
      PARTY_CARD_DRAW_CUTOVER_MARKER_ID,
    )
    expect(next.partyCards?.drawContinuation?.streamState).not.toBe(
      root.continuation.streamState,
    )
  })

  it('sanitize drops unsupported drawContinuation schema versions', () => {
    const base = createStartingState()
    const cards = base.partyCards!
    const sanitized = sanitizePersistedPartyCardState(
      {
        ...cards,
        drawContinuation: {
          schemaVersion: 'invalid',
          runSeed: 1,
          epoch: 0,
          streamState: 99,
          selectorVersion: 'spe-3164.draw.v1',
        },
      },
      cards,
      base.cases,
      base.teams,
      base.week,
    )
    expect(sanitized?.drawContinuation).toBeUndefined()
  })

  it('engine low-level draw still accepts injected RNG for unit tests', () => {
    const cards = createStartingState().partyCards!
    const rng = createSeededRng(4242)
    const draw = drawPartyCards(cards, 2, rng.next)
    expect(draw.drawnCardIds).toHaveLength(2)
  })
})
