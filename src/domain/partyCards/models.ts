import type { Id } from '../models'

export type PartyCardTarget = 'case' | 'team' | 'global'

export interface PartyCardEffect {
  scoreAdjustment: number
  fatigueAdjustment?: number
  requiredCaseTags?: string[]
}

export interface PartyCardDefinition {
  id: Id
  title: string
  description: string
  target: PartyCardTarget
  effect: PartyCardEffect
}

export interface PartyCardPlay {
  playId: Id
  cardId: Id
  targetCaseId?: Id
  targetTeamId?: Id
  weekPlayed: number
}

export interface PartyCardResolutionBonus {
  scoreAdjustment: number
  fatigueAdjustmentByTeam: Record<Id, number>
  consumedPlayIds: Id[]
  consumedCardIds: Id[]
}

/**
 * SPE-3164 — deck-local stochastic continuation for party-card draws.
 * Isolated from campaign `rngState`; established exactly once on legacy cutover.
 */
export interface PartyCardDrawContinuation {
  schemaVersion: 'spe-3164.v1'
  runSeed: number
  epoch: number
  streamState: number
  selectorVersion: string
  cutoverMarkerId?: string
}

export interface PartyCardState {
  cards: Record<Id, PartyCardDefinition>
  deck: Id[]
  hand: Id[]
  discard: Id[]
  queuedPlays: PartyCardPlay[]
  maxHandSize: number
  /** Deck-local draw stream; absent on pre-SPE-3164 saves until first draw. */
  drawContinuation?: PartyCardDrawContinuation
}
