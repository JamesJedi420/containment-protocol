import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createSeededRng } from '../domain/math'
import {
  consumeResolutionPartyCards,
  drawPartyCards,
  playPartyCard,
  previewResolutionPartyCards,
} from '../domain/partyCards/engine'
import { assignTeam } from '../domain/sim/assign'
import { advanceWeek } from '../domain/sim/advanceWeek'

describe('party card engine', () => {
  it('draws deterministically from the same seed', () => {
    const stateA = createStartingState().partyCards!
    const stateB = createStartingState().partyCards!
    const rngA = createSeededRng(4242)
    const rngB = createSeededRng(4242)

    const drawA = drawPartyCards(stateA, 3, rngA.next)
    const drawB = drawPartyCards(stateB, 3, rngB.next)

    expect(drawA.drawnCardIds).toEqual(drawB.drawnCardIds)
    expect(drawA.nextState.hand).toEqual(drawB.nextState.hand)
    expect(rngA.getState()).toBe(rngB.getState())
  })

  it('queues and consumes a played card for matching case/team resolution', () => {
    const state = createStartingState()
    const cards = state.partyCards!
    const firstCard = cards.deck[0]!

    const draw = drawPartyCards(cards, 1, createSeededRng(1).next)
    const queued = playPartyCard(draw.nextState, firstCard, {
      weekPlayed: state.week,
      targetCaseId: 'case-001',
      targetTeamId: 't_nightwatch',
    })

    const preview = previewResolutionPartyCards(queued, {
      caseId: 'case-001',
      caseTags: state.cases['case-001'].tags,
      teamIds: ['t_nightwatch'],
    })

    const consumed = consumeResolutionPartyCards(queued, {
      caseId: 'case-001',
      caseTags: state.cases['case-001'].tags,
      teamIds: ['t_nightwatch'],
    })

    expect(preview.scoreAdjustment).toBeGreaterThan(0)
    expect(consumed.bonus.scoreAdjustment).toBe(preview.scoreAdjustment)
    expect(consumed.bonus.consumedCardIds).toContain(firstCard)
    expect(consumed.nextState.queuedPlays).toHaveLength(0)
  })
})

describe('party cards in weekly simulation', () => {
  it('consumes queued case card during resolution and removes queued play', () => {
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

    const firstCard = withAssignment.partyCards!.deck[0]!
    const drawn = drawPartyCards(withAssignment.partyCards!, 1, createSeededRng(7).next)
    const queued = playPartyCard(drawn.nextState, firstCard, {
      weekPlayed: withAssignment.week,
      targetCaseId: 'case-001',
      targetTeamId: 't_nightwatch',
    })

    withAssignment.partyCards = queued

    const next = advanceWeek(withAssignment)
    const report = next.reports[0]
    const hasDrawNote = report
      ? report.notes.some((note) => note.content.includes('Party cards drawn:'))
      : false

    expect(next.partyCards?.queuedPlays).toHaveLength(0)
    expect(hasDrawNote).toBe(true)
  })
})
