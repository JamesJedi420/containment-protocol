import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createOperationEvent } from '../domain/events/eventBus'
import { buildHubReportNotes } from '../domain/hub/hubReportNotes'
import { generateHubState, type HubState } from '../domain/hub/hubState'
import type { GameState, LegitimacyState } from '../domain/models'

function makeHubGame(overrides: Partial<GameState> = {}): GameState {
  return {
    ...structuredClone(createStartingState()),
    events: [],
    ...overrides,
  }
}

function makeStandingEvent(
  sequence: number,
  factionId: 'oversight' | 'black_budget',
  delta: number
) {
  const factionName = factionId === 'oversight' ? 'Oversight Bureau' : 'Black Budget Programs'

  return createOperationEvent(sequence, {
    type: 'faction.standing_changed',
    sourceSystem: 'faction',
    payload: {
      week: 1,
      factionId,
      factionName,
      delta,
      standingBefore: 0,
      standingAfter: delta,
      reason: 'case.resolved',
    },
  })
}

function makeRankedHubGame(legitimacy?: LegitimacyState): GameState {
  return makeHubGame({
    legitimacy,
    events: [makeStandingEvent(1, 'oversight', 10), makeStandingEvent(2, 'black_budget', 8)],
  })
}

describe('SPE-53: Hub Simulation & Opportunity Generation', () => {
  it('gates first opportunity by legitimacy and explains result', () => {
    const levels: Array<{
      legitimacy: LegitimacyState
      state: 'allowed' | 'risky' | 'costly' | 'blocked'
      explanation: RegExp
    }> = [
      {
        legitimacy: { sanctionLevel: 'sanctioned' },
        state: 'allowed',
        explanation: /sanctioned/i,
      },
      {
        legitimacy: { sanctionLevel: 'covert' },
        state: 'risky',
        explanation: /covert/i,
      },
      {
        legitimacy: { sanctionLevel: 'tolerated' },
        state: 'costly',
        explanation: /costly/i,
      },
      {
        legitimacy: { sanctionLevel: 'unsanctioned' },
        state: 'blocked',
        explanation: /blocked/i,
      },
    ]

    for (const level of levels) {
      const hub = generateHubState(makeRankedHubGame(level.legitimacy))
      const opportunity = hub.opportunities[0]

      expect(opportunity?.requiredSanctionLevel).toBe('sanctioned')
      expect(opportunity?.accessState).toBe(level.state)
      expect(opportunity?.accessExplanation).toMatch(level.explanation)
    }
  })

  it('surfaces risky access state in hub opportunity notes', () => {
    const game = makeRankedHubGame({ sanctionLevel: 'covert' })
    const hub = generateHubState(game)
    const notes = buildHubReportNotes(hub, game.week)
    const opportunityNote = notes.find((note) => note.type === 'hub.opportunity')

    expect(opportunityNote).toBeDefined()
    expect(opportunityNote?.content).toContain('covert')
    expect(opportunityNote?.metadata?.accessState).toBe('risky')
    expect(opportunityNote?.metadata?.requiredSanctionLevel).toBe('sanctioned')
  })

  it('generates multiple opportunities and rumors for top factions', () => {
    const hub = generateHubState(makeRankedHubGame())

    expect(hub.districtKey).toBe('central_hub')
    expect(hub.opportunities).toHaveLength(2)
    expect(hub.opportunities.map((opportunity) => opportunity.factionId)).toEqual([
      'oversight',
      'black_budget',
    ])
    expect(hub.rumors).toHaveLength(2)
    expect(hub.rumors.every((rumor) => typeof rumor.confidence === 'number')).toBe(true)
  })

  it('persists hub state across weeks', () => {
    const game = makeRankedHubGame()
    const hub1 = generateHubState(game)
    const hub2 = generateHubState({ ...game, week: 2, hubState: hub1 })

    expect(hub1.districtKey).toBe('central_hub')
    expect(hub2.districtKey).toBe('central_hub')
    expect(hub2.opportunities.length).toBeGreaterThan(0)
  })

  it('surfaces hub opportunity and rumor metadata in report notes', () => {
    const hub: HubState = {
      districtKey: 'central_hub',
      factionPresence: { oversight: 10 },
      opportunities: [
        {
          id: 'opportunity-oversight',
          label: 'Test Opportunity',
          detail: 'Test detail',
          factionId: 'oversight',
          confidence: 0.8,
          accessState: 'allowed',
          requiredSanctionLevel: 'sanctioned',
        },
      ],
      rumors: [
        {
          id: 'rumor-oversight',
          label: 'Test Rumor',
          detail: 'Rumor detail',
          confidence: 0.4,
          misleading: true,
          filtered: true,
        },
      ],
    }

    const notes = buildHubReportNotes(hub, 1)
    const rumorNote = notes.find((note) => note.type === 'hub.rumor')

    expect(notes.some((note) => note.type === 'hub.opportunity')).toBe(true)
    expect(rumorNote).toBeDefined()
    expect(rumorNote?.metadata?.misleading).toBe(true)
    expect(rumorNote?.metadata?.filtered).toBe(true)
  })
})
