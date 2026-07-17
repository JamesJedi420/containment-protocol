import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_COMMUNITY_ADVISORY_BODY,
  EXAMPLE_INCIDENT_BASELINE,
  EXAMPLE_SUPPORT_ROUTING_SIGNAL,
  evaluateCommunityAdvisoryDecisionInfluence,
  type CommunityAdvisorySignal,
  type IncidentResponseDecision,
} from '../domain/communityAdvisoryDecisionInfluence'

function signal(overrides: Partial<CommunityAdvisorySignal> = {}): CommunityAdvisorySignal {
  return {
    ...EXAMPLE_SUPPORT_ROUTING_SIGNAL,
    ...overrides,
    recommendation: {
      ...EXAMPLE_SUPPORT_ROUTING_SIGNAL.recommendation,
      ...(overrides.recommendation ?? {}),
    },
  }
}

function baseline(overrides: Partial<IncidentResponseDecision> = {}): IncidentResponseDecision {
  return {
    ...EXAMPLE_INCIDENT_BASELINE,
    ...overrides,
  }
}

describe('communityAdvisoryDecisionInfluence (SPE-2620 / SPE-956 slice 1)', () => {
  it('adopts an in-scope signal that meets the influence threshold and changes support routing', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(result.disposition).toBe('adopted')
    expect(result.reasonCodes).toEqual(['advisory_adopted'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'support_routing',
      fromValue: 'standard_ops_desk',
      toValue: 'community_liaison_first',
    })
    expect(result.resolved.supportRouting).toBe('community_liaison_first')
    expect(result.resolved.responseTiming).toBe(EXAMPLE_INCIDENT_BASELINE.responseTiming)
    expect(result.baseline).toEqual(EXAMPLE_INCIDENT_BASELINE)
    expect(result.bodyId).toBe('advisory-body:riverside-stakeholders')
  })

  it('modifies when the signal meets the threshold but attaches conditions', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: signal({
        recommendation: {
          scope: 'framing',
          proposedValue: 'survivor_centered_brief',
        },
        conditions: Object.freeze(['pending_survivor_consent']),
      }),
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(result.disposition).toBe('modified')
    expect(result.reasonCodes).toEqual(['advisory_modified_with_conditions'])
    expect(result.proposedAdjustment).toEqual({
      scope: 'framing',
      fromValue: 'agency_first_brief',
      toValue: 'survivor_centered_brief',
    })
    expect(result.resolved.framing).toBe('survivor_centered_brief')
    expect(result.conditions).toEqual(['pending_survivor_consent'])
  })

  it('rejects when the recommendation exceeds authorized decision scope', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: signal({
        recommendation: {
          scope: 'restriction_level',
          proposedValue: 'full_cordon',
        },
      }),
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(result.disposition).toBe('rejected')
    expect(result.reasonCodes).toEqual(['advisory_rejected', 'recommendation_out_of_scope'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_INCIDENT_BASELINE)
  })

  it('rejects a routine signal that fails the influence threshold without changing the baseline', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: signal({
        supportBand: 'low',
        confidence: 0.4,
        urgency: 'routine',
      }),
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(result.disposition).toBe('rejected')
    expect(result.reasonCodes).toEqual(['advisory_rejected', 'below_influence_threshold'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_INCIDENT_BASELINE)
    expect(result.supportScore).toBeLessThan(result.influenceThreshold)
  })

  it('defers an elevated/urgent signal that fails the influence threshold without changing the baseline', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: signal({
        supportBand: 'moderate',
        confidence: 0.5,
        urgency: 'urgent',
      }),
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(result.disposition).toBe('deferred')
    expect(result.reasonCodes).toEqual(['advisory_deferred', 'below_influence_threshold'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_INCIDENT_BASELINE)
  })

  it('returns a deterministic deferred no-op when evaluation input is missing', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence(undefined)

    expect(result.disposition).toBe('deferred')
    expect(result.reasonCodes).toEqual(['missing_evaluation_input'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.bodyId).toBeNull()
    expect(result.resolved).toEqual(result.baseline)
  })

  it('returns a deferred no-op when body, signal, or baseline is missing', () => {
    const missingBody = evaluateCommunityAdvisoryDecisionInfluence({
      body: null,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })
    expect(missingBody.disposition).toBe('deferred')
    expect(missingBody.reasonCodes).toContain('missing_advisory_body')
    expect(missingBody.proposedAdjustment).toBeNull()
    expect(missingBody.resolved).toEqual(EXAMPLE_INCIDENT_BASELINE)

    const missingSignal = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: null,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })
    expect(missingSignal.disposition).toBe('deferred')
    expect(missingSignal.reasonCodes).toContain('missing_advisory_signal')
    expect(missingSignal.proposedAdjustment).toBeNull()

    const missingBaseline = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: null,
    })
    expect(missingBaseline.disposition).toBe('deferred')
    expect(missingBaseline.reasonCodes).toContain('missing_incident_baseline')
    expect(missingBaseline.proposedAdjustment).toBeNull()
  })

  it('rejects when signal bodyId does not match the advisory body', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: signal({ bodyId: 'advisory-body:other' }),
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(result.disposition).toBe('rejected')
    expect(result.reasonCodes).toEqual(['advisory_rejected', 'body_signal_mismatch'])
    expect(result.proposedAdjustment).toBeNull()
    expect(result.resolved).toEqual(EXAMPLE_INCIDENT_BASELINE)
  })

  it('keeps reason codes unique and sorted across paths', () => {
    const adopted = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })
    const rejected = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: signal({
        recommendation: { scope: 'restriction_level', proposedValue: 'full_cordon' },
      }),
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })

    expect(adopted.reasonCodes).toEqual([...adopted.reasonCodes].sort((a, b) => a.localeCompare(b)))
    expect(rejected.reasonCodes).toEqual(
      [...new Set(rejected.reasonCodes)].sort((a, b) => a.localeCompare(b))
    )
  })

  it('freezes the result envelope and does not mutate the baseline input', () => {
    const inputBaseline = baseline()
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: inputBaseline,
    })

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasonCodes)).toBe(true)
    expect(Object.isFrozen(result.resolved)).toBe(true)
    expect(Object.isFrozen(result.baseline)).toBe(true)
    expect(inputBaseline.supportRouting).toBe('standard_ops_desk')
    expect(result.resolved).not.toBe(inputBaseline)
    expect(result.baseline).not.toBe(inputBaseline)
  })

  it('returns byte-stable decisions for the same inputs', () => {
    const input = {
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: EXAMPLE_INCIDENT_BASELINE,
    }

    const first = evaluateCommunityAdvisoryDecisionInfluence(input)
    const second = evaluateCommunityAdvisoryDecisionInfluence(input)

    expect(second).toEqual(first)
  })

  it('exposes an authored body with mission, membership, stakeholders, scope, and criteria', () => {
    expect(EXAMPLE_COMMUNITY_ADVISORY_BODY.mission.length).toBeGreaterThan(0)
    expect(EXAMPLE_COMMUNITY_ADVISORY_BODY.membershipRule.length).toBeGreaterThan(0)
    expect(EXAMPLE_COMMUNITY_ADVISORY_BODY.decisionCriteria.length).toBeGreaterThan(0)
    expect(EXAMPLE_COMMUNITY_ADVISORY_BODY.representedStakeholderClasses.length).toBeGreaterThan(0)
    expect(EXAMPLE_COMMUNITY_ADVISORY_BODY.authorizedDecisionScopes).toEqual([
      'framing',
      'response_timing',
      'support_routing',
    ])
    expect(EXAMPLE_COMMUNITY_ADVISORY_BODY.influenceThreshold).toBeGreaterThan(0)
  })

  it('defers a partial baseline instead of inventing missing decision fields', () => {
    const result = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: EXAMPLE_SUPPORT_ROUTING_SIGNAL,
      baseline: {
        incidentId: 'incident:partial',
        responseTiming: 'now',
      } as IncidentResponseDecision,
    })

    expect(result.disposition).toBe('deferred')
    expect(result.reasonCodes).toEqual(['invalid_incident_baseline'])
    expect(result.proposedAdjustment).toBeNull()
  })

  it('defers malformed condition payloads instead of adopting them', () => {
    const objectConditions = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: {
        ...EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        conditions: {} as unknown as readonly string[],
      },
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })
    expect(objectConditions.disposition).toBe('deferred')
    expect(objectConditions.reasonCodes).toEqual(['invalid_advisory_conditions'])
    expect(objectConditions.proposedAdjustment).toBeNull()
    expect(objectConditions.resolved).toEqual(EXAMPLE_INCIDENT_BASELINE)

    const numericConditions = evaluateCommunityAdvisoryDecisionInfluence({
      body: EXAMPLE_COMMUNITY_ADVISORY_BODY,
      signal: {
        ...EXAMPLE_SUPPORT_ROUTING_SIGNAL,
        conditions: [42] as unknown as readonly string[],
      },
      baseline: EXAMPLE_INCIDENT_BASELINE,
    })
    expect(numericConditions.disposition).toBe('deferred')
    expect(numericConditions.reasonCodes).toEqual(['invalid_advisory_conditions'])
    expect(numericConditions.proposedAdjustment).toBeNull()
  })
})
