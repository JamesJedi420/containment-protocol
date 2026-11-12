/**
 * SPE-3164 — party-card draw scoped identity and deck-local continuation.
 *
 * Establishes exactly-once cutover for legacy saves (SPE-3163 vocabulary) and
 * drives both manual and weekly draws from one persisted deck-local stream.
 * Does not mutate campaign `rngState`.
 */

import {
  applyStochasticCutover,
  hydrateLegacyRngState,
} from '../legacyRngStateCutover'
import { createSeededRng, normalizeSeed } from '../math'
import {
  createStochasticDecisionIdentity,
  deriveStochasticSeed,
} from '../stochasticIdentity'
import { drawPartyCards, drawPartyCardsToHandLimit } from './engine'
import type { PartyCardDrawContinuation, PartyCardState } from './models'

export const PARTY_CARD_DRAW_OWNER = 'SPE-3164' as const
export const PARTY_CARD_DRAW_SCHEMA_VERSION = 'spe-3164.v1' as const
export const PARTY_CARD_DRAW_SELECTOR_VERSION = 'spe-3164.draw.v1' as const
export const PARTY_CARD_DRAW_DOMAIN = 'party_cards' as const
export const PARTY_CARD_DRAW_ENTITY = 'deck' as const
export const PARTY_CARD_DRAW_KIND = 'draw_continuation' as const
export const PARTY_CARD_DRAW_CUTOVER_MARKER_ID = 'spe-3164-party-card-draw-v1' as const

export interface PartyCardScopedDrawInput {
  readonly partyCards: PartyCardState
  readonly runSeed: number
  /** Campaign rngState used only as legacy hydrate evidence; never advanced. */
  readonly legacyRngState: number
  readonly week: number
}

export interface PartyCardScopedDrawResult {
  readonly nextState: PartyCardState
  readonly drawnCardIds: string[]
  readonly cutoverApplied: boolean
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

export function isValidPartyCardDrawContinuation(
  value: PartyCardDrawContinuation | undefined,
): value is PartyCardDrawContinuation {
  if (!value) return false
  return (
    value.schemaVersion === PARTY_CARD_DRAW_SCHEMA_VERSION &&
    isFiniteInt(value.runSeed) &&
    isFiniteInt(value.epoch) &&
    value.epoch >= 0 &&
    isFiniteInt(value.streamState) &&
    typeof value.selectorVersion === 'string' &&
    value.selectorVersion.trim().length > 0
  )
}

/** Stable fingerprint of authoritative card zones for SPE-3163 hydrate evidence. */
export function partyCardHistoryFingerprint(state: PartyCardState): string {
  return [
    state.deck.join(','),
    state.hand.join(','),
    state.discard.join(','),
    state.queuedPlays.map((play) => play.playId).join(','),
  ].join('|')
}

function mintRootContinuation(runSeed: number, selectorVersion: string): PartyCardDrawContinuation {
  const normalizedSeed = normalizeSeed(runSeed)
  const identity = createStochasticDecisionIdentity({
    runSeed: normalizedSeed,
    domain: PARTY_CARD_DRAW_DOMAIN,
    semanticEntityOrEventId: PARTY_CARD_DRAW_ENTITY,
    decisionKind: PARTY_CARD_DRAW_KIND,
    phaseOrAttemptOrIndex: 'epoch:0',
    selectorVersion,
  })
  return {
    schemaVersion: PARTY_CARD_DRAW_SCHEMA_VERSION,
    runSeed: normalizedSeed,
    epoch: 0,
    streamState: deriveStochasticSeed(identity),
    selectorVersion,
    cutoverMarkerId: PARTY_CARD_DRAW_CUTOVER_MARKER_ID,
  }
}

/**
 * Exactly-once cutover: preserve deck/hand/discard; mint deck-local continuation
 * from SPE-3162 scoped identity. Re-application with a valid continuation is a no-op.
 */
export function ensurePartyCardDrawContinuation(args: {
  readonly partyCards: PartyCardState
  readonly runSeed: number
  readonly legacyRngState: number
  readonly week: number
}): {
  readonly partyCards: PartyCardState
  readonly continuation: PartyCardDrawContinuation
  readonly cutoverApplied: boolean
} {
  const existing = args.partyCards.drawContinuation
  if (isValidPartyCardDrawContinuation(existing)) {
    return {
      partyCards: args.partyCards,
      continuation: existing,
      cutoverApplied: false,
    }
  }

  const runSeed = normalizeSeed(args.runSeed)
  const fingerprint = partyCardHistoryFingerprint(args.partyCards)
  const hydration = hydrateLegacyRngState({
    rngSeed: runSeed,
    rngState: Math.trunc(args.legacyRngState),
    resolvedHistoryFingerprint: fingerprint,
  })

  if (!hydration.ok) {
    const continuation = mintRootContinuation(runSeed, PARTY_CARD_DRAW_SELECTOR_VERSION)
    return {
      partyCards: { ...args.partyCards, drawContinuation: continuation },
      continuation,
      cutoverApplied: true,
    }
  }

  const cutover = applyStochasticCutover({
    hydration,
    markerId: PARTY_CARD_DRAW_CUTOVER_MARKER_ID,
    appliedAtWeek: args.week,
    policy: 'migrate_existing',
    defaultSelectorVersion: PARTY_CARD_DRAW_SELECTOR_VERSION,
  })

  if (!cutover.ok) {
    throw new Error(`party-card draw cutover failed: ${cutover.message}`)
  }

  const continuation = mintRootContinuation(runSeed, cutover.marker.defaultSelectorVersion)
  // Card zones intentionally unchanged — fingerprint still matches pre-cutover.
  if (partyCardHistoryFingerprint(args.partyCards) !== fingerprint) {
    throw new Error('party-card draw cutover mutated card history')
  }

  return {
    partyCards: { ...args.partyCards, drawContinuation: continuation },
    continuation,
    cutoverApplied: cutover.disposition !== 'already_migrated',
  }
}

function runScopedDraw(
  input: PartyCardScopedDrawInput,
  draw: (state: PartyCardState, next: () => number) => {
    nextState: PartyCardState
    drawnCardIds: string[]
  },
): PartyCardScopedDrawResult {
  const ensured = ensurePartyCardDrawContinuation({
    partyCards: input.partyCards,
    runSeed: input.runSeed,
    legacyRngState: input.legacyRngState,
    week: input.week,
  })
  const rng = createSeededRng(ensured.continuation.streamState)
  const result = draw(ensured.partyCards, rng.next)
  const nextContinuation: PartyCardDrawContinuation = {
    ...ensured.continuation,
    streamState: rng.getState(),
  }
  return {
    nextState: {
      ...result.nextState,
      drawContinuation: nextContinuation,
    },
    drawnCardIds: result.drawnCardIds,
    cutoverApplied: ensured.cutoverApplied,
  }
}

/** Manual party-card draw — campaign `rngState` is not advanced. */
export function drawPartyCardsWithScopedContinuation(
  input: PartyCardScopedDrawInput & { readonly count: number },
): PartyCardScopedDrawResult {
  return runScopedDraw(input, (state, next) => drawPartyCards(state, input.count, next))
}

/** Weekly hand-limit refresh — same continuation contract as manual draws. */
export function drawPartyCardsToHandLimitWithScopedContinuation(
  input: PartyCardScopedDrawInput,
): PartyCardScopedDrawResult {
  return runScopedDraw(input, (state, next) => drawPartyCardsToHandLimit(state, next))
}
