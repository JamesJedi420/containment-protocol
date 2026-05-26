import type { GameState, Id } from '../models'
import type {
  PartyCardDefinition,
  PartyCardEffect,
  PartyCardPlay,
  PartyCardState,
  PartyCardTarget,
} from './models'

const PARTY_CARD_TARGETS: readonly PartyCardTarget[] = ['case', 'team', 'global']
const MAX_HAND_SIZE_CAP = 12
const MAX_CARD_FIELD_LENGTH = 240

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sanitizeInteger(value: unknown, fallback: number, min: number, max?: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const truncated = Math.trunc(finiteValue)
  const boundedMin = Math.max(min, truncated)
  return max === undefined ? boundedMin : Math.min(max, boundedMin)
}

function sanitizeTrimmedString(value: unknown, fallback: string, max = MAX_CARD_FIELD_LENGTH) {
  const raw = typeof value === 'string' ? value.trim() : ''
  const resolved = raw.length > 0 ? raw : fallback
  return resolved.length <= max ? resolved : `${resolved.slice(0, max - 1)}…`
}

function sanitizePartyCardTarget(value: unknown, fallback: PartyCardTarget): PartyCardTarget {
  return PARTY_CARD_TARGETS.includes(value as PartyCardTarget)
    ? (value as PartyCardTarget)
    : fallback
}

function sanitizeRequiredCaseTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const seen = new Set<string>()
  const tags: string[] = []

  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue
    }

    const tag = entry.trim()

    if (tag.length === 0 || seen.has(tag)) {
      continue
    }

    seen.add(tag)
    tags.push(tag)
  }

  return tags.length > 0 ? tags : undefined
}

/** Hydration 551: card id matches record key; title, target, effect, and tag fields are bounded. */
function sanitizePartyCardEffect(
  value: unknown,
  fallback: PartyCardEffect | undefined
): PartyCardEffect {
  const raw = isRecord(value) ? value : {}
  const fallbackEffect = fallback ?? { scoreAdjustment: 0 }

  const scoreAdjustment = sanitizeInteger(
    raw.scoreAdjustment,
    fallbackEffect.scoreAdjustment,
    -99,
    99
  )

  const effect: PartyCardEffect = { scoreAdjustment }

  if (raw.fatigueAdjustment !== undefined || fallbackEffect.fatigueAdjustment !== undefined) {
    effect.fatigueAdjustment = sanitizeInteger(
      raw.fatigueAdjustment,
      fallbackEffect.fatigueAdjustment ?? 0,
      -99,
      99
    )
  }

  const requiredCaseTags = sanitizeRequiredCaseTags(raw.requiredCaseTags ?? fallbackEffect.requiredCaseTags)

  if (requiredCaseTags) {
    effect.requiredCaseTags = requiredCaseTags
  }

  return effect
}

function sanitizePartyCardDefinition(
  cardKey: string,
  value: unknown,
  catalog: PartyCardState['cards']
): PartyCardDefinition | null {
  const fallback = catalog[cardKey]

  if (!fallback && !isRecord(value)) {
    return null
  }

  const raw = isRecord(value) ? value : {}
  const title = sanitizeTrimmedString(raw.title, fallback?.title ?? cardKey)
  const description = sanitizeTrimmedString(raw.description, fallback?.description ?? title)
  const target = sanitizePartyCardTarget(raw.target, fallback?.target ?? 'global')
  const effect = sanitizePartyCardEffect(raw.effect, fallback?.effect)

  return {
    id: cardKey,
    title,
    description,
    target,
    effect,
  }
}

/** Hydration 551: merge persisted definitions with the fallback catalog; drop unknown keys. */
function sanitizePartyCardsRecord(
  value: unknown,
  fallbackCards: PartyCardState['cards']
): PartyCardState['cards'] {
  if (!isRecord(value)) {
    return fallbackCards
  }

  const next: PartyCardState['cards'] = { ...fallbackCards }

  for (const cardKey of Object.keys(fallbackCards)) {
    if (!(cardKey in value)) {
      continue
    }

    const sanitized = sanitizePartyCardDefinition(cardKey, value[cardKey], fallbackCards)

    if (sanitized) {
      next[cardKey] = sanitized
    }
  }

  return next
}

/** Hydration 567: repair zone arrays element-by-element; never replace a whole zone from fallback. */
function sanitizeCardIds(input: unknown, knownCardIds: Set<string>): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  const seen = new Set<string>()
  const next: string[] = []

  for (const entry of input) {
    if (typeof entry !== 'string') {
      continue
    }

    const cardId = entry.trim()

    if (cardId.length === 0 || !knownCardIds.has(cardId) || seen.has(cardId)) {
      continue
    }

    seen.add(cardId)
    next.push(cardId)
  }

  return next
}

/** Deck / hand / discard zones: each card id appears in at most one pile (hand wins over deck over discard). */
function reconcilePartyCardZones(
  cards: PartyCardState['cards'],
  zones: { deck: string[]; hand: string[]; discard: string[] }
) {
  const knownCardIds = new Set(Object.keys(cards))
  const deck = sanitizeCardIds(zones.deck, knownCardIds)
  const hand = sanitizeCardIds(zones.hand, knownCardIds)
  const discard = sanitizeCardIds(zones.discard, knownCardIds)

  const assigned = new Set<string>(hand)
  const nextDeck: string[] = []
  const nextDiscard: string[] = []

  for (const cardId of deck) {
    if (assigned.has(cardId)) {
      continue
    }

    assigned.add(cardId)
    nextDeck.push(cardId)
  }

  for (const cardId of discard) {
    if (assigned.has(cardId)) {
      continue
    }

    assigned.add(cardId)
    nextDiscard.push(cardId)
  }

  return { deck: nextDeck, hand, discard: nextDiscard }
}

/** Hydration 561: trim play ids, drop blanks, and regenerate duplicates (`playId-dup-N`). */
function assignUniqueQueuedPlayIds(plays: PartyCardPlay[]): PartyCardPlay[] {
  const seen = new Set<string>()
  const next: PartyCardPlay[] = []

  for (const [index, play] of plays.entries()) {
    const trimmed = play.playId.trim()
    const baseId = trimmed.length > 0 ? trimmed : `play-migrated-${index + 1}`
    let resolvedId = baseId

    if (seen.has(resolvedId)) {
      resolvedId = `${baseId}-dup-${index + 1}`
    }

    seen.add(resolvedId)
    next.push(resolvedId === play.playId ? play : { ...play, playId: resolvedId })
  }

  return next
}

/** Hydration 568: drop queued plays with missing or unknown cardId; never fabricate from fallback deck. */
function sanitizeQueuedPlays(
  value: unknown,
  cards: PartyCardState['cards'],
  cases: GameState['cases'],
  teams: GameState['teams'],
  campaignWeek: number
): PartyCardPlay[] {
  const knownCardIds = new Set(Object.keys(cards))
  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))

  if (!Array.isArray(value)) {
    return []
  }

  const sanitized = value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry, index) => {
      const cardId =
        typeof entry.cardId === 'string' && entry.cardId.trim().length > 0
          ? entry.cardId.trim()
          : null
      const playId =
        typeof entry.playId === 'string' && entry.playId.trim().length > 0
          ? entry.playId.trim()
          : `play-migrated-${index + 1}`

      if (!cardId || !knownCardIds.has(cardId)) {
        return null
      }

      const card = cards[cardId]
      let targetCaseId =
        typeof entry.targetCaseId === 'string' && entry.targetCaseId.trim().length > 0
          ? entry.targetCaseId.trim()
          : undefined
      let targetTeamId =
        typeof entry.targetTeamId === 'string' && entry.targetTeamId.trim().length > 0
          ? entry.targetTeamId.trim()
          : undefined

      if (card?.target !== 'case') {
        targetCaseId = undefined
      }

      if (card?.target !== 'team') {
        targetTeamId = undefined
      }

      if (targetCaseId && !(targetCaseId in cases)) {
        targetCaseId = undefined
      }

      if (targetTeamId && !(targetTeamId in teams)) {
        targetTeamId = undefined
      }

      if (card?.target === 'case' && !targetCaseId) {
        return null
      }

      if (card?.target === 'team' && !targetTeamId) {
        return null
      }

      const weekPlayed = sanitizeInteger(entry.weekPlayed, 1, 1, cappedWeek)

      return {
        playId,
        cardId,
        ...(targetCaseId ? { targetCaseId } : {}),
        ...(targetTeamId ? { targetTeamId } : {}),
        weekPlayed,
      } satisfies PartyCardPlay
    })
    .filter((entry): entry is PartyCardPlay => entry !== null)

  return assignUniqueQueuedPlayIds(sanitized)
}

/** Hydration 563: malformed payloads keep catalog cards but do not resurrect fallback zone piles. */
function buildEmptyPartyCardZones(cards: PartyCardState['cards']) {
  return reconcilePartyCardZones(cards, { deck: [], hand: [], discard: [] })
}

/**
 * Hydration problems 466, 551-553, 560-563: party card definitions, zones, queued plays, targets, and maxHandSize.
 */
export function sanitizePersistedPartyCardState(
  value: unknown,
  fallback: PartyCardState | undefined,
  cases: GameState['cases'],
  teams: GameState['teams'],
  campaignWeek = 1
): PartyCardState | undefined {
  if (!fallback) {
    return undefined
  }

  const cards = isRecord(value) ? sanitizePartyCardsRecord(value.cards, fallback.cards) : fallback.cards

  if (!isRecord(value)) {
    const zones = buildEmptyPartyCardZones(cards)

    return {
      cards,
      deck: zones.deck,
      hand: zones.hand,
      discard: zones.discard,
      queuedPlays: [],
      maxHandSize: Math.max(zones.hand.length, fallback.maxHandSize, 1),
    }
  }

  const zones = reconcilePartyCardZones(cards, {
    deck: sanitizeCardIds(value.deck, new Set(Object.keys(cards))),
    hand: sanitizeCardIds(value.hand, new Set(Object.keys(cards))),
    discard: sanitizeCardIds(value.discard, new Set(Object.keys(cards))),
  })

  const maxHandSize = Math.max(
    zones.hand.length,
    sanitizeInteger(value.maxHandSize, fallback.maxHandSize, 1, MAX_HAND_SIZE_CAP)
  )

  return {
    cards,
    deck: zones.deck,
    hand: zones.hand,
    discard: zones.discard,
    queuedPlays: sanitizeQueuedPlays(value.queuedPlays, cards, cases, teams, campaignWeek),
    maxHandSize,
  }
}
