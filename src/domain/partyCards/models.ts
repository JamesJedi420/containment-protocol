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

export interface PartyCardState {
  cards: Record<Id, PartyCardDefinition>
  deck: Id[]
  hand: Id[]
  discard: Id[]
  queuedPlays: PartyCardPlay[]
  maxHandSize: number
}
