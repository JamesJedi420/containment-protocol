import { describe, expect, it } from 'vitest'
import type { ResearchCapabilityPacket } from './researchThroughputExecution'
import {
  ACCELERATED_RISK_THROUGHPUT_MULTIPLIER,
  EXCEEDING_LIMITS_RISK_THROUGHPUT_MULTIPLIER,
  OWNER_REF_SPE_1199,
  OWNER_REF_SPE_1817,
  OWNER_REF_SPE_1818,
  OWNER_REF_SPE_3179,
  OWNER_REF_SPE_995,
  applyHazardousResearchConsequences,
  parseHazardousResearchPostureSelection,
  resolveHazardousResearchRiskPosture,
  serializeHazardousResearchPostureSelection,
} from './hazardousResearchRiskPosture'
import type { HazardousResearchPostureSelectionMarker } from './hazardousResearchRiskPosture'

function capability(overrides: Partial<ResearchCapabilityPacket> = {}): ResearchCapabilityPacket {
  return {
    domainScores: { analysis: 0.8 },
    difficulty: 1,
    facilityGates: [{ gateId: 'biohazard_lab', satisfied: true }],
    staffCompetencyRefs: [],
    sourceInputRefs: [
      { sourceId: 'source.a', available: true, quality: 0.9, priorKnowledgeBonus: 0 },
    ],
    ...overrides,
  }
}

describe('resolveHazardousResearchRiskPosture', () => {
  it('standard posture allows baseline multiplier with no downside channels', () => {
    const result = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'standard',
    })
    expect(result.allowed).toBe(true)
    expect(result.effectiveThroughputMultiplier).toBe(1)
    expect(result.downsideChannels).toEqual([])
  })

  it('accelerated posture exposes higher throughput and typed downside channels', () => {
    const result = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'accelerated',
    })
    expect(result.allowed).toBe(true)
    expect(result.effectiveThroughputMultiplier).toBe(ACCELERATED_RISK_THROUGHPUT_MULTIPLIER)
    expect(result.downsideChannels).toEqual(['degraded_result', 'equipment_strain'])
  })

  it('exceeding_limits posture exposes maximum multiplier and severe channels', () => {
    const result = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'exceeding_limits',
    })
    expect(result.allowed).toBe(true)
    expect(result.effectiveThroughputMultiplier).toBe(EXCEEDING_LIMITS_RISK_THROUGHPUT_MULTIPLIER)
    expect(result.downsideChannels).toEqual([
      'contamination_exposure',
      'facility_damage',
      'interruption',
      'invalid_result',
    ])
  })

  it('blocks when incident prohibition is active', () => {
    const result = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'accelerated',
      incidentProhibitionActive: true,
    })
    expect(result.allowed).toBe(false)
    expect(result.reasonCodes).toContain('incident_prohibition_active')
    expect(result.effectiveThroughputMultiplier).toBe(0)
  })

  it('records authorization without treating it as safety', () => {
    const result = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'accelerated',
      authorized: true,
      participantHarmRisk: true,
    })
    expect(result.allowed).toBe(true)
    expect(result.reasonCodes).toContain('authorization_not_equivalent_to_safety')
    expect(result.reasonCodes).toContain('participant_harm_risk_present')
  })

  it('adds observation exposure channel when observation risk is flagged', () => {
    const result = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'standard',
      observationExposureRisk: true,
    })
    expect(result.downsideChannels).toEqual(['observation_exposure'])
    expect(result.reasonCodes).toContain('observation_exposure_risk_present')
  })
})

describe('applyHazardousResearchConsequences', () => {
  it('ordinary risky execution emits progress bonus and durable experiment deviation', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'accelerated',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'progressed',
        progressDelta: 0.8,
        reasonCodes: [],
        explanationSummary: 'ok',
      },
      postureResolution: posture,
      experimentRecordRef: 'experiment-42',
    })
    expect(intents.some((i) => i.kind === 'progress_bonus')).toBe(true)
    expect(
      intents.some(
        (i) => i.kind === 'experiment_record_deviation' && i.targetRef === OWNER_REF_SPE_3179,
      ),
    ).toBe(true)
    expect(intents.some((i) => i.kind === 'equipment_damage')).toBe(true)
  })

  it('beneficial high-risk run can include unexpected discovery', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'exceeding_limits',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'progressed',
        progressDelta: 0.9,
        reasonCodes: [],
        explanationSummary: 'ok',
      },
      postureResolution: posture,
    })
    expect(intents.some((i) => i.kind === 'unexpected_discovery')).toBe(true)
    expect(intents.some((i) => i.kind === 'progress_bonus')).toBe(true)
  })

  it('degraded tick routes reliability degradation without claim invalidation', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'accelerated',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'degraded',
        progressDelta: 0.3,
        reasonCodes: ['degraded_throughput'],
        explanationSummary: 'degraded',
      },
      postureResolution: posture,
    })
    const degraded = intents.find((i) => i.kind === 'degraded_result')
    expect(degraded?.targetRef).toBe(OWNER_REF_SPE_995)
    expect(degraded?.reasonCodes).toContain('not_claim_invalidation')
    expect(intents.some((i) => i.targetRef === OWNER_REF_SPE_1199)).toBe(false)
  })

  it('invalid reliability on harmful run does not auto-route claim invalidation', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'exceeding_limits',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'blocked',
        progressDelta: 0,
        reasonCodes: ['insufficient_capability'],
        explanationSummary: 'blocked',
      },
      postureResolution: posture,
    })
    const invalid = intents.find((i) => i.kind === 'invalid_result')
    expect(invalid?.targetRef).toBe(OWNER_REF_SPE_995)
    expect(invalid?.reasonCodes).toContain('execution_reliability_failure')
    expect(invalid?.reasonCodes).toContain('not_claim_invalidation')
    expect(
      intents.some(
        (i) => i.targetRef === OWNER_REF_SPE_1199 && i.reasonCodes.includes('explicit_claim_invalidation_route'),
      ),
    ).toBe(false)
  })

  it('explicit claim invalidation route is opt-in only', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'exceeding_limits',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'blocked',
        progressDelta: 0,
        reasonCodes: [],
        explanationSummary: 'blocked',
      },
      postureResolution: posture,
      explicitlyRouteClaimInvalidation: true,
    })
    expect(
      intents.some(
        (i) =>
          i.targetRef === OWNER_REF_SPE_1199 &&
          i.reasonCodes.includes('explicit_claim_invalidation_route'),
      ),
    ).toBe(true)
  })

  it('persistent harmful consequence on failed risky execution', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'exceeding_limits',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'interrupted',
        progressDelta: 0,
        reasonCodes: ['execution_interrupted'],
        explanationSummary: 'interrupted',
      },
      postureResolution: posture,
      experimentRecordRef: 'experiment-fail',
    })
    expect(intents.length).toBeGreaterThan(0)
    expect(
      intents.some((i) => i.kind === 'experiment_record_deviation' && i.targetRef === OWNER_REF_SPE_3179),
    ).toBe(true)
    expect(intents.some((i) => i.kind === 'interruption')).toBe(true)
  })

  it('blocked posture resolution emits prohibition-routed interruption', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'accelerated',
      incidentProhibitionActive: true,
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'blocked',
        progressDelta: 0,
        reasonCodes: [],
        explanationSummary: 'blocked',
      },
      postureResolution: posture,
    })
    expect(intents).toHaveLength(1)
    expect(intents[0]?.kind).toBe('interruption')
    expect(intents[0]?.targetRef).toBe(OWNER_REF_SPE_1817)
  })

  it('observation exposure routes through observation safety owner', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'standard',
      observationExposureRisk: true,
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'progressed',
        progressDelta: 0.2,
        reasonCodes: [],
        explanationSummary: 'ok',
      },
      postureResolution: posture,
    })
    const exposure = intents.find(
      (i) =>
        i.kind === 'contamination_exposure' &&
        i.reasonCodes.includes('observation_exposure_not_automatically_safe'),
    )
    expect(exposure?.targetRef).toBe(OWNER_REF_SPE_1818)
  })

  it('sorts intents deterministically by kind then targetRef', () => {
    const posture = resolveHazardousResearchRiskPosture({
      capability: capability(),
      posture: 'exceeding_limits',
    })
    const intents = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'progressed',
        progressDelta: 0.6,
        reasonCodes: [],
        explanationSummary: 'ok',
      },
      postureResolution: posture,
      experimentRecordRef: 'experiment-order',
    })
    const keys = intents.map((i) => `${i.kind}:${i.targetRef}`)
    const sorted = [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(keys).toEqual(sorted)

    const replay = applyHazardousResearchConsequences({
      projectId: 'project.hazard',
      tick: {
        outcome: 'progressed',
        progressDelta: 0.6,
        reasonCodes: [],
        explanationSummary: 'ok',
      },
      postureResolution: posture,
      experimentRecordRef: 'experiment-order',
    })
    expect(replay.map((i) => `${i.kind}:${i.targetRef}`)).toEqual(keys)
  })
})

describe('posture selection serialize/parse', () => {
  it('round-trips explicit posture markers for save/load idempotency', () => {
    const marker: HazardousResearchPostureSelectionMarker = {
      schemaVersion: 'spe-3344.posture.v1',
      posture: 'exceeding_limits',
      experimentRecordRef: 'experiment-save-1',
    }
    const raw = serializeHazardousResearchPostureSelection(marker)
    const parsed = parseHazardousResearchPostureSelection(raw)
    expect(parsed).toEqual(marker)
    expect(parseHazardousResearchPostureSelection(JSON.parse(raw))).toEqual(marker)
    expect(parseHazardousResearchPostureSelection({ schemaVersion: 'other', posture: 'standard' })).toBeNull()
  })
})
