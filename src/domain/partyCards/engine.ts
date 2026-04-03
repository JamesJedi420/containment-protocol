import { randInt } from '../math'
import type { GameState, Id } from '../models'
import type {
  PartyCardDefinition,
  PartyCardPlay,
  PartyCardResolutionBonus,
  PartyCardState,
} from './models'

interface DrawResult {
  nextState: PartyCardState
  drawnCardIds: Id[]
}

function shuffleIds(ids: Id[], nextRandom: () => number): Id[] {
  const result = [...ids]

  for (let i = result.length - 1; i > 0; i -= 1) {
    const swapIndex = randInt(nextRandom, 0, i)
    ;[result[i], result[swapIndex]] = [result[swapIndex]!, result[i]!]
  }

  return result
}

function normalizeCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function canPlayCard(card: PartyCardDefinition, caseTags: string[]) {
  const requiredTags = card.effect.requiredCaseTags ?? []

  if (requiredTags.length === 0) {
    return true
  }

  const tags = new Set(caseTags)
  return requiredTags.every((tag) => tags.has(tag))
}

export function drawPartyCards(
  state: PartyCardState,
  count: number,
  nextRandom: () => number
): DrawResult {
  const drawCount = normalizeCount(count)
  if (drawCount <= 0) {
    return { nextState: state, drawnCardIds: [] }
  }

  let deck = [...state.deck]
  let discard = [...state.discard]
  const hand = [...state.hand]
  const drawnCardIds: Id[] = []

  for (let i = 0; i < drawCount; i += 1) {
    if (deck.length === 0 && discard.length > 0) {
      deck = shuffleIds(discard, nextRandom)
      discard = []
    }

    const nextCardId = deck.shift()
    if (!nextCardId) {
      break
    }

    hand.push(nextCardId)
    drawnCardIds.push(nextCardId)
  }

  return {
    nextState: {
      ...state,
      deck,
      hand,
      discard,
    },
    drawnCardIds,
  }
}

export function drawPartyCardsToHandLimit(
  state: PartyCardState,
  nextRandom: () => number
): DrawResult {
  const needed = Math.max(0, state.maxHandSize - state.hand.length)
  return drawPartyCards(state, needed, nextRandom)
}

export function discardPartyCard(state: PartyCardState, cardId: Id): PartyCardState {
  const handIndex = state.hand.indexOf(cardId)

  if (handIndex < 0) {
    return state
  }

  const hand = state.hand.filter((entryId, index) => !(index === handIndex && entryId === cardId))

  return {
    ...state,
    hand,
    discard: [...state.discard, cardId],
  }
}

export function playPartyCard(
  state: PartyCardState,
  cardId: Id,
  input: { weekPlayed: number; targetCaseId?: Id; targetTeamId?: Id }
): PartyCardState {
  const card = state.cards[cardId]
  if (!card) {
    return state
  }

  const handIndex = state.hand.indexOf(cardId)
  if (handIndex < 0) {
    return state
  }

  if (card.target === 'case' && !input.targetCaseId) {
    return state
  }

  if (card.target === 'team' && !input.targetTeamId) {
    return state
  }

  const hand = state.hand.filter((entryId, index) => !(index === handIndex && entryId === cardId))
  const playId = `play-${input.weekPlayed}-${cardId}-${state.queuedPlays.length + 1}`

  const queuedPlays: PartyCardPlay[] = [
    ...state.queuedPlays,
    {
      playId,
      cardId,
      targetCaseId: input.targetCaseId,
      targetTeamId: input.targetTeamId,
      weekPlayed: input.weekPlayed,
    },
  ]

  return {
    ...state,
    hand,
    discard: [...state.discard, cardId],
    queuedPlays,
  }
}

export function consumeResolutionPartyCards(
  state: PartyCardState,
  args: {
    caseId: Id
    caseTags: string[]
    teamIds: Id[]
  }
): { nextState: PartyCardState; bonus: PartyCardResolutionBonus } {
  const caseId = args.caseId
  const teamIdSet = new Set(args.teamIds)

  let scoreAdjustment = 0
  const fatigueAdjustmentByTeam: Record<Id, number> = {}
  const consumedPlayIds: Id[] = []
  const consumedCardIds: Id[] = []

  const remainingPlays: PartyCardPlay[] = []

  for (const play of state.queuedPlays) {
    const card = state.cards[play.cardId]
    if (!card) {
      remainingPlays.push(play)
      continue
    }

    const caseMatches = !play.targetCaseId || play.targetCaseId === caseId
    const teamMatches = !play.targetTeamId || teamIdSet.has(play.targetTeamId)
    const canApply = canPlayCard(card, args.caseTags)

    if (!caseMatches || !teamMatches || !canApply) {
      remainingPlays.push(play)
      continue
    }

    consumedPlayIds.push(play.playId)
    consumedCardIds.push(play.cardId)
    scoreAdjustment += card.effect.scoreAdjustment

    if (play.targetTeamId && card.effect.fatigueAdjustment) {
      fatigueAdjustmentByTeam[play.targetTeamId] =
        (fatigueAdjustmentByTeam[play.targetTeamId] ?? 0) + card.effect.fatigueAdjustment
    }
  }

  return {
    nextState: {
      ...state,
      queuedPlays: remainingPlays,
    },
    bonus: {
      scoreAdjustment,
      fatigueAdjustmentByTeam,
      consumedPlayIds,
      consumedCardIds,
    },
  }
}

export function previewResolutionPartyCards(
  state: PartyCardState,
  args: {
    caseId: Id
    caseTags: string[]
    teamIds: Id[]
  }
): PartyCardResolutionBonus {
  return consumeResolutionPartyCards(state, args).bonus
}

export function getPartyCardsFromGame(game: GameState): PartyCardState | null {
  return game.partyCards ?? null
}
