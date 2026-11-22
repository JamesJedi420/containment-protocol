import { describe, expect, it } from 'vitest'
import {
  listEligibleApproaches,
  evaluateStaffSuitability,
  resolveContactInteraction,
  type KnownSocialState,
  type StaffCapability,
} from '../domain/contactInteractionApproachResolver'

describe('SPE-3111 contact interaction approach resolver', () => {
  const baseKnown: KnownSocialState = {
    knownObjectives: [],
    knownNeeds: [],
    knownAuthority: false,
    hasFavorRecord: false,
    knownRelationshipStrength: 0,
    accessPermitted: true,
    hostilityLevel: 10,
    consentPlausible: true,
  }

  it('lists different eligible approaches for different known states', () => {
    const withNeed = listEligibleApproaches({ ...baseKnown, knownNeeds: ['supplies'] })
    const without = listEligibleApproaches(baseKnown)

    expect(withNeed.find((e) => e.approach === 'need_response')?.eligible).toBe(true)
    expect(without.find((e) => e.approach === 'need_response')?.eligible).toBe(false)
    expect(withNeed.find((e) => e.approach === 'exploratory')?.eligible).toBe(true)
  })

  it('evaluates different staff suitability from capability', () => {
    const staffHigh: StaffCapability = {
      staffId: 's1',
      socialCompetency: 80,
      contextualKnowledge: ['supplies'],
    }
    const staffLow: StaffCapability = {
      staffId: 's2',
      socialCompetency: 20,
      contextualKnowledge: [],
    }
    const known = { ...baseKnown, knownNeeds: ['supplies'] }

    const high = evaluateStaffSuitability(staffHigh, 'need_response', known)
    const low = evaluateStaffSuitability(staffLow, 'need_response', known)

    expect(high.suitability).toBe('strong')
    expect(low.suitability).toBe('unavailable')
  })

  it('keeps potentially useful approach unavailable without revealing hidden state', () => {
    const result = listEligibleApproaches(baseKnown)
    const authority = result.find((e) => e.approach === 'authority_leverage')
    expect(authority?.eligible).toBe(false)
    expect(authority?.reason).toBe('authority_unknown')
    // No hidden motive or true authority flag is exposed
  })

  it('uses exploratory fallback and returns bounded result', () => {
    const outcome = resolveContactInteraction({
      interactionId: 'i1',
      contactId: 'c1',
      knownState: baseKnown,
    })
    expect(outcome.approachUsed).toBe('exploratory')
    expect(outcome.outcomeKind).toBe('disclosure')
    expect(outcome.reason).toContain('exploratory')
  })

  it('produces partial/friction outcome for weak or constrained cases', () => {
    const outcome = resolveContactInteraction({
      interactionId: 'i2',
      contactId: 'c2',
      knownState: { ...baseKnown, hostilityLevel: 80 },
      selectedApproach: 'exploratory',
    })
    expect(outcome.outcomeKind).toBe('friction')
  })

  it('emits idempotent downstream handoff without local persistence', () => {
    const outcome = resolveContactInteraction({
      interactionId: 'i3',
      contactId: 'c3',
      knownState: { ...baseKnown, knownNeeds: ['info'] },
      selectedApproach: 'need_response',
    })
    expect(outcome.handoffs.length).toBe(1)
    expect(outcome.handoffs[0].owner).toBe('SPE-208')
    expect(outcome.handoffs[0].idempotentKey).toBe('i3:relationship')
    // Second call with same key would be ignored by owner; no duplicate state here
  })

  it('rejects malformed input', () => {
    expect(() =>
      resolveContactInteraction({
        interactionId: '',
        contactId: 'c',
        knownState: baseKnown,
      })
    ).toThrow()
  })
})
