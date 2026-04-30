import { describe, expect, it } from 'vitest'
import {
  deriveRealityStatePacket,
  projectBehavioralRealityAssessment,
  projectOperationalRealityAssessment,
  resolveRealityRuleSurface,
} from '../domain/realityModel'

describe('realityModel', () => {
  it('distinguishes actual, perceived, and believed state deterministically', () => {
    const packet = deriveRealityStatePacket({
      packetId: 'reality:rivergate-corridor',
      subjectId: 'corridor:rivergate-east',
      label: 'Rivergate East Corridor',
      actualState: 'sealed',
      perceivedState: 'open',
      believedState: 'open_and_stable',
      existenceMode: 'physical',
      ruleDomain: 'presence',
      deviationFamily: 'perception_masking',
      confidence: 0.68,
      evidence: 'false_reading',
    })

    expect(packet.actualState).toBe('sealed')
    expect(packet.perceivedState).toBe('open')
    expect(packet.believedState).toBe('open_and_stable')
    expect(packet.truthGap).toEqual({
      actualVsPerceived: true,
      perceivedVsBelieved: true,
      actualVsBelieved: true,
    })
    expect(packet.observationStatus).toBe('false_reading')
  })

  it('keeps contradiction distinct from false-reading emergence', () => {
    const contradicted = deriveRealityStatePacket({
      packetId: 'reality:shade-contact',
      subjectId: 'entity:shade-contact',
      label: 'Shade Contact',
      actualState: 'signature_only',
      perceivedState: 'active_intruder',
      believedState: 'active_intruder',
      existenceMode: 'partially_instantiated',
      ruleDomain: 'presence',
      confidence: 0.61,
      evidence: 'contradicted',
    })
    const falseReading = deriveRealityStatePacket({
      packetId: 'reality:false-handoff',
      subjectId: 'signal:false-handoff',
      label: 'False Handoff Signal',
      actualState: 'no_handoff_window',
      perceivedState: 'handoff_window_open',
      believedState: 'handoff_window_open',
      existenceMode: 'perceptual_only',
      ruleDomain: 'presence',
      deviationFamily: 'false_continuity',
      confidence: 0.57,
      evidence: 'false_reading',
    })

    expect(contradicted.observationStatus).toBe('contradicted')
    expect(falseReading.observationStatus).toBe('false_reading')
  })

  it('resolves baseline rule lookup and declared deviation override', () => {
    const baseline = resolveRealityRuleSurface('future_pressure', 'none')
    const override = resolveRealityRuleSurface('future_pressure', 'future_pressure_fixed')

    expect(baseline).toMatchObject({
      domain: 'future_pressure',
      baselineRuleId: 'future_records_are_advisory',
      resolution: 'baseline',
    })
    expect(override).toMatchObject({
      domain: 'future_pressure',
      baselineRuleId: 'future_records_are_advisory',
      resolution: 'override',
      deviationFamily: 'future_pressure_fixed',
    })
  })

  it('changes operational handling based on truth divergence and existence mode', () => {
    const falseReadingAssessment = projectOperationalRealityAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:stairwell-decoy',
        subjectId: 'stairwell:decoy',
        label: 'Stairwell Decoy',
        actualState: 'collapsed',
        perceivedState: 'clear',
        believedState: 'clear',
        existenceMode: 'perceptual_only',
        ruleDomain: 'presence',
        deviationFamily: 'perception_masking',
        confidence: 0.64,
        evidence: 'false_reading',
      })
    )

    const baselineAssessment = projectOperationalRealityAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:secure-door',
        subjectId: 'door:secure-wing',
        label: 'Secure Wing Door',
        actualState: 'locked',
        perceivedState: 'locked',
        believedState: 'locked',
        existenceMode: 'physical',
        ruleDomain: 'presence',
        confidence: 0.93,
        evidence: 'clear',
      })
    )

    expect(falseReadingAssessment).toMatchObject({
      visibilityTrust: 'rejected',
      decisionMode: 'treat_as_false_reading',
      recommendedAction: 'verification_pass',
    })
    expect(falseReadingAssessment.reasonCodes).toContain('false-reading')
    expect(baselineAssessment).toMatchObject({
      visibilityTrust: 'trusted',
      decisionMode: 'act_on_visible_state',
      recommendedAction: 'physical_commitment',
    })
  })

  it('keeps behaviorally coherent appearance separate from uncertain inner-state', () => {
    const packet = deriveRealityStatePacket({
      packetId: 'reality:coherent-witness',
      subjectId: 'witness:echo-12',
      label: 'Echo Witness',
      actualState: 'present',
      perceivedState: 'present',
      believedState: 'present_and_reliable',
      existenceMode: 'physical',
      ruleDomain: 'presence',
      confidence: 0.81,
      evidence: 'clear',
      behaviorProfile: {
        apparentBehaviorState: 'coherent',
        inferredInnerStateStatus: 'uncertain',
        realizationClass: 'realized_being',
        counterpartEquivalence: 'not_applicable',
        inferenceConfidence: 0.52,
      },
    })

    expect(packet.behaviorProfile).toMatchObject({
      apparentBehaviorState: 'coherent',
      inferredInnerStateStatus: 'uncertain',
      realizationClass: 'realized_being',
    })
    expect(projectBehavioralRealityAssessment(packet)).toMatchObject({
      classification: 'treat_as_uncertain_agent',
      handlingMode: 'verification_interview',
      trustLevel: 'guarded',
    })
  })

  it('does not grant automatic equivalence to simulated, replayed, or duplicated behavior', () => {
    const simulated = projectBehavioralRealityAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:sim-archivist',
        subjectId: 'construct:sim-archivist',
        label: 'Simulated Archivist',
        actualState: 'active',
        perceivedState: 'active',
        believedState: 'helpful_archivist',
        existenceMode: 'partially_instantiated',
        ruleDomain: 'presence',
        confidence: 0.74,
        evidence: 'clear',
        behaviorProfile: {
          apparentBehaviorState: 'simulated_sociality',
          inferredInnerStateStatus: 'non_equivalent',
          realizationClass: 'simulated_construct',
          counterpartEquivalence: 'non_equivalent',
          inferenceConfidence: 0.71,
        },
      })
    )

    const replayed = projectBehavioralRealityAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:replay-clerk',
        subjectId: 'pattern:replay-clerk',
        label: 'Replay Clerk',
        actualState: 'looping',
        perceivedState: 'obedient',
        believedState: 'obedient',
        existenceMode: 'recorded_only',
        ruleDomain: 'presence',
        deviationFamily: 'false_continuity',
        confidence: 0.63,
        evidence: 'contradicted',
        behaviorProfile: {
          apparentBehaviorState: 'replay_loop',
          inferredInnerStateStatus: 'unknown',
          realizationClass: 'replayed_pattern',
          counterpartEquivalence: 'non_equivalent',
          inferenceConfidence: 0.33,
        },
      })
    )

    const duplicate = projectBehavioralRealityAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:duplicate-contact',
        subjectId: 'contact:double-ava',
        label: 'Duplicate Ava',
        actualState: 'present',
        perceivedState: 'present',
        believedState: 'trusted_ally',
        existenceMode: 'physical',
        ruleDomain: 'presence',
        confidence: 0.78,
        evidence: 'clear',
        behaviorProfile: {
          apparentBehaviorState: 'coherent',
          inferredInnerStateStatus: 'unknown',
          realizationClass: 'duplicate_instance',
          counterpartEquivalence: 'unverified',
          inferenceConfidence: 0.49,
        },
      })
    )

    expect(simulated).toMatchObject({
      classification: 'treat_as_non_equivalent_construct',
      handlingMode: 'pattern_containment',
      trustLevel: 'restricted',
    })
    expect(replayed).toMatchObject({
      classification: 'treat_as_replayed_pattern',
      handlingMode: 'pattern_containment',
      trustLevel: 'restricted',
    })
    expect(duplicate).toMatchObject({
      classification: 'treat_as_uncertain_agent',
      handlingMode: 'verification_interview',
      trustLevel: 'guarded',
    })
  })

  it('supports apparently sincere but misclassified real cases', () => {
    const packet = deriveRealityStatePacket({
      packetId: 'reality:misclassified-contact',
      subjectId: 'contact:mira',
      label: 'Mira Contact',
      actualState: 'present',
      perceivedState: 'hostile_construct',
      believedState: 'hostile_construct',
      existenceMode: 'physical',
      ruleDomain: 'presence',
      confidence: 0.72,
      evidence: 'contradicted',
      behaviorProfile: {
        apparentBehaviorState: 'distressed',
        inferredInnerStateStatus: 'sincere',
        realizationClass: 'misclassified_real',
        counterpartEquivalence: 'not_applicable',
        inferenceConfidence: 0.84,
      },
    })

    expect(projectBehavioralRealityAssessment(packet)).toMatchObject({
      classification: 'treat_as_misclassified_real',
      handlingMode: 'identity_reclassification',
      trustLevel: 'guarded',
    })
  })

  it('remains repeatable for identical inputs', () => {
    const input = {
      packetId: 'reality:future-ledger',
      subjectId: 'record:future-ledger',
      label: 'Future Ledger',
      actualState: 'sealed_warning',
      perceivedState: 'sealed_warning',
      believedState: 'sealed_warning',
      existenceMode: 'recorded_only' as const,
      ruleDomain: 'future_pressure' as const,
      deviationFamily: 'future_pressure_conditional' as const,
      confidence: 0.77,
      evidence: 'clear' as const,
      behaviorProfile: {
        apparentBehaviorState: 'coherent' as const,
        inferredInnerStateStatus: 'unknown' as const,
        realizationClass: 'duplicate_instance' as const,
        counterpartEquivalence: 'unverified' as const,
        inferenceConfidence: 0.58,
      },
    }

    const first = deriveRealityStatePacket(input)
    const second = deriveRealityStatePacket(input)

    expect(second).toEqual(first)
    expect(projectOperationalRealityAssessment(second)).toEqual(
      projectOperationalRealityAssessment(first)
    )
    expect(projectBehavioralRealityAssessment(second)).toEqual(
      projectBehavioralRealityAssessment(first)
    )
  })
})
