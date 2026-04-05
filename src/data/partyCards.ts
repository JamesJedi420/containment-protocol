import type { PartyCardDefinition, PartyCardState } from '../domain/partyCards/models'

const STARTING_CARDS: Record<string, PartyCardDefinition> = {
  'card-breach-drill': {
    id: 'card-breach-drill',
    title: 'Breach Drill',
    description: 'Add +8 score against any case this week.',
    target: 'case',
    effect: {
      scoreAdjustment: 8,
    },
  },
  'card-field-briefing': {
    id: 'card-field-briefing',
    title: 'Field Briefing',
    description: 'Add +5 score against any assigned case.',
    target: 'global',
    effect: {
      scoreAdjustment: 5,
    },
  },
  'card-occult-ward': {
    id: 'card-occult-ward',
    title: 'Occult Ward',
    description: 'Add +10 score on occult-tagged cases.',
    target: 'case',
    effect: {
      scoreAdjustment: 10,
      requiredCaseTags: ['occult'],
    },
  },
  'card-surge-team': {
    id: 'card-surge-team',
    title: 'Surge Team',
    description: 'Target team gains +6 score and -1 fatigue pressure for one resolution.',
    target: 'team',
    effect: {
      scoreAdjustment: 6,
      fatigueAdjustment: -1,
    },
  },
  'card-last-push': {
    id: 'card-last-push',
    title: 'Last Push',
    description: 'Add +12 score this week at significant command effort.',
    target: 'case',
    effect: {
      scoreAdjustment: 12,
    },
  },
} as const

const STARTING_DECK = [
  'card-breach-drill',
  'card-field-briefing',
  'card-occult-ward',
  'card-surge-team',
  'card-last-push',
] as const

export function createStartingPartyCardState(): PartyCardState {
  return {
    cards: structuredClone(STARTING_CARDS),
    deck: [...STARTING_DECK],
    hand: [],
    discard: [],
    queuedPlays: [],
    maxHandSize: 3,
  }
}
