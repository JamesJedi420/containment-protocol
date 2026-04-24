import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { createSeededRng } from '../domain/math'
import {
  buildRecruitmentGenerationState,
  generateCandidates,
  removeExpiredCandidates,
} from '../domain/sim/candidateGenerator'

function generateCandidatesFromState(
  state: ReturnType<typeof createStartingState>,
  rng?: () => number
) {
  return generateCandidates(
    buildRecruitmentGenerationState(state),
    rng ?? createSeededRng(state.rngState).next
  )
}

function createHighTailRng() {
  let i = 0
  return () => {
    // Stay near the upper tail (biasing weighted picks toward later entries)
    // while still changing over time to avoid repeated-id retry loops.
    const value = 0.99 - (i % 90) * 0.001
    i += 1
    return value
  }
}

describe('recruitment candidate generation', () => {
  it('generates deterministic candidate sets from the same state seed', () => {
    const stateA = createStartingState()
    const stateB = createStartingState()

    stateA.rngSeed = 20260401
    stateA.rngState = 20260401
    stateB.rngSeed = 20260401
    stateB.rngState = 20260401

    const generatedA = generateCandidatesFromState(stateA, createSeededRng(stateA.rngState).next)
    const generatedB = generateCandidatesFromState(stateB, createSeededRng(stateB.rngState).next)

    expect(generatedA).toEqual(generatedB)
  })

  it('generates between 3 and 6 candidates for the weekly batch', () => {
    const state = createStartingState()
    state.rngSeed = 555
    state.rngState = 555

    const generated = generateCandidatesFromState(state, createSeededRng(state.rngState).next)

    expect(generated.length).toBeGreaterThanOrEqual(3)
    expect(generated.length).toBeLessThanOrEqual(6)
  })

  it('only emits agent and staff categories for the MVP pool', () => {
    const state = createStartingState()
    state.rngSeed = 1717
    state.rngState = 1717

    const generated = generateCandidatesFromState(state, createSeededRng(state.rngState).next)

    expect(
      generated.every(
        (candidate) => candidate.category === 'agent' || candidate.category === 'staff'
      )
    ).toBe(true)
  })

  it('keeps instructor candidates locked before academy tier 2', () => {
    const state = createStartingState()
    state.rngSeed = 1717
    state.rngState = 1717
    state.academyTier = 1

    // High roll repeatedly targets the tail of the weighted distribution.
    // When instructor is locked, this should still never emit instructor.
    const generated = generateCandidatesFromState(state, createHighTailRng())

    expect(generated.some((candidate) => candidate.category === 'instructor')).toBe(false)
  })

  it('can emit instructor candidates once academy tier reaches unlock threshold', () => {
    const state = createStartingState()
    state.rngSeed = 1717
    state.rngState = 1717
    state.academyTier = 2

    // Deterministically bias category selection to the tail.
    const generated = generateCandidatesFromState(state, createHighTailRng())

    expect(generated.some((candidate) => candidate.category === 'instructor')).toBe(true)
  })

  it('applies reveal-level gating to evaluation visibility', () => {
    const state = createStartingState()
    state.rngSeed = 9090
    state.rngState = 9090

    const generated = generateCandidatesFromState(state, createSeededRng(state.rngState).next)

    for (const candidate of generated) {
      if (candidate.revealLevel < 2) {
        expect(candidate.evaluation.overallVisible).toBe(false)
        expect(candidate.evaluation.overallValue).toEqual(expect.any(Number))
      }

      if (candidate.revealLevel < 1) {
        expect(candidate.costEstimate).toBeUndefined()
        expect(candidate.evaluation.potentialVisible).toBe(false)
        expect(candidate.evaluation.potentialTier).toMatch(/low|mid|high/)
      }
    }
  })

  it('biases reveal levels upward when agency reputation is stronger', () => {
    const lowReputationState = createStartingState()
    lowReputationState.rngSeed = 8080
    lowReputationState.rngState = 8080
    lowReputationState.containmentRating = 28
    lowReputationState.clearanceLevel = 1
    lowReputationState.funding = 48
    lowReputationState.agency = {
      containmentRating: 28,
      clearanceLevel: 1,
      funding: 48,
    }
    lowReputationState.agents = {}

    const highReputationState = createStartingState()
    highReputationState.rngSeed = 8080
    highReputationState.rngState = 8080
    highReputationState.containmentRating = 92
    highReputationState.clearanceLevel = 4
    highReputationState.funding = 210
    highReputationState.agency = {
      containmentRating: 92,
      clearanceLevel: 4,
      funding: 210,
    }

    const lowRng = createSeededRng(lowReputationState.rngState)
    const highRng = createSeededRng(highReputationState.rngState)

    const lowRevealTotal = Array.from({ length: 8 }, () =>
      generateCandidatesFromState(lowReputationState, lowRng.next)
    )
      .flat()
      .reduce((sum, candidate) => sum + candidate.revealLevel, 0)

    const highRevealTotal = Array.from({ length: 8 }, () =>
      generateCandidatesFromState(highReputationState, highRng.next)
    )
      .flat()
      .reduce((sum, candidate) => sum + candidate.revealLevel, 0)

    expect(highRevealTotal).toBeGreaterThan(lowRevealTotal)
  })

  it('populates shared candidate cost, status, and category-specific data', () => {
    const state = createStartingState()
    state.rngSeed = 4242
    state.rngState = 4242

    const generated = generateCandidatesFromState(state, createSeededRng(state.rngState).next)

    expect(generated.every((candidate) => candidate.hireStatus === 'available')).toBe(true)
    expect(generated.every((candidate) => candidate.funnelStage === 'prospect')).toBe(true)
    expect(generated.every((candidate) => candidate.createdWeek === state.week)).toBe(true)
    expect(generated.every((candidate) => candidate.lastUpdatedWeek === state.week)).toBe(true)
    expect(
      generated.every(
        (candidate) =>
          candidate.weeklyCost !== undefined &&
          candidate.weeklyWage === candidate.weeklyCost &&
          (candidate.revealLevel >= 1 ? candidate.costEstimate !== undefined : true) &&
          (candidate.availabilityWindow === undefined ||
            (candidate.availabilityWindow.opensWeek === state.week &&
              candidate.availabilityWindow.closesWeek === candidate.expiryWeek))
      )
    ).toBe(true)
    expect(
      generated.every(
        (candidate) =>
          Array.isArray(candidate.skills) &&
          candidate.skills.length >= 2 &&
          candidate.skills.length <= 3 &&
          Array.isArray(candidate.liabilities) &&
          candidate.liabilities.length >= 1 &&
          candidate.liabilities.length <= 2
      )
    ).toBe(true)
    expect(
      generated.every((candidate) => {
        if (candidate.category === 'agent') {
          return (
            candidate.agentData !== undefined &&
            candidate.agentData.domainStats !== undefined &&
            candidate.agentData.growthProfile !== undefined
          )
        }

        if (candidate.category === 'staff') {
          return candidate.staffData !== undefined && candidate.staffData.efficiency !== undefined
        }

        return true
      })
    ).toBe(true)
  })

  it('injects faction-sponsored recruits when faction recruit channels are unlocked', () => {
    const state = createStartingState()
    state.rngSeed = 9191
    state.rngState = 9191
    const factions = state.factions
    if (!factions) {
      throw new Error('Expected faction state to be present for recruitment generation test.')
    }

    factions.institutions.reputation = 80
    factions.institutions.contacts = (factions.institutions.contacts ?? []).map((contact) =>
      contact.id === 'institutions-halden'
        ? {
            ...contact,
            relationship: 18,
            status: 'active',
          }
        : contact
    )

    const generated = generateCandidatesFromState(state, createSeededRng(state.rngState).next)
    const sponsored = generated.find((candidate) => candidate.sourceFactionId === 'institutions')

    expect(sponsored).toMatchObject({
      category: 'agent',
      sourceFactionId: 'institutions',
      sourceFactionName: 'Academic Institutions',
      sourceContactId: 'institutions-halden',
      sourceContactName: 'Miren Halden',
      sourceRequiredTier: 'friendly',
      sourceSummary: expect.stringContaining('Research fellowship'),
    })
    expect(generated[0]?.id).toBe(sponsored?.id)
  })

  it('applies recruit-quality faction modifiers to sponsored recruit quality deterministically', () => {
    const baseState = createStartingState()
    const boostedState = createStartingState()
    baseState.rngSeed = 9191
    baseState.rngState = 9191
    boostedState.rngSeed = 9191
    boostedState.rngState = 9191

    for (const state of [baseState, boostedState]) {
      const factions = state.factions
      if (!factions) {
        throw new Error('Expected faction state to be present for recruit quality test.')
      }

      factions.institutions.reputation = 80
      factions.institutions.contacts = (factions.institutions.contacts ?? []).map((contact) =>
        contact.id === 'institutions-halden'
          ? {
              ...contact,
              relationship: 18,
              status: 'active',
            }
          : contact
      )
    }

    if (!boostedState.factions) {
      throw new Error('Expected faction state to be present for recruit quality modifier test.')
    }

    boostedState.factions.institutions.contacts =
      (boostedState.factions.institutions.contacts ?? []).map((contact) =>
        contact.id === 'institutions-halden'
          ? {
              ...contact,
              modifiers: [
                ...(contact.modifiers ?? []),
                {
                  id: 'institutions-halden-recruit-quality',
                  label: 'Prestige pipeline',
                  description: 'Halden can send stronger fellowship candidates.',
                  effect: 'recruit_quality',
                  value: 6,
                },
              ],
            }
          : contact
      )

    const generatedBase = generateCandidatesFromState(
      baseState,
      createSeededRng(baseState.rngState).next
    )
    const generatedBoosted = generateCandidatesFromState(
      boostedState,
      createSeededRng(boostedState.rngState).next
    )
    const baseSponsored = generatedBase.find((candidate) => candidate.sourceFactionId === 'institutions')
    const boostedSponsored = generatedBoosted.find(
      (candidate) => candidate.sourceFactionId === 'institutions'
    )

    expect(baseSponsored?.evaluation.overallValue).toBeLessThan(boostedSponsored?.evaluation.overallValue ?? 0)
  })

  it('removes candidates only after their expiry week has passed', () => {
    const state = createStartingState()
    state.rngSeed = 1337
    state.rngState = 1337

    const [a, b, c] = generateCandidatesFromState(state, createSeededRng(state.rngState).next)
    const withExpiry = [
      { ...a, expiryWeek: 3 },
      { ...b, expiryWeek: 5 },
      { ...c, expiryWeek: 6 },
    ]

    const remainingAtWeek5 = removeExpiredCandidates(withExpiry, 5)

    expect(remainingAtWeek5).toHaveLength(2)
    expect(remainingAtWeek5.map((candidate) => candidate.id)).toEqual([
      withExpiry[1].id,
      withExpiry[2].id,
    ])
  })
})
