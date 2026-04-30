import { describe, expect, it } from 'vitest'
import {
  deriveRealityStatePacket,
  projectBehavioralRealityAssessment,
  projectFuturePressureAssessment,
  projectOperationalRealityAssessment,
  projectRealityIdentityAssessment,
  projectRealityRuleFamilyAssessment,
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

  it('classifies future-pressure families deterministically for operational interpretation', () => {
    const fixed = projectFuturePressureAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:sealed-forecast',
        subjectId: 'forecast:sealed-001',
        label: 'Sealed Forecast',
        actualState: 'storm-arrival-locked',
        existenceMode: 'recorded_only',
        ruleDomain: 'future_pressure',
        deviationFamily: 'future_pressure_fixed',
        confidence: 0.91,
        evidence: 'clear',
        futurePressureProfile: {
          family: 'fixed',
          sourceType: 'sealed_forecast',
          confidence: 0.91,
        },
      })
    )

    const predictive = projectFuturePressureAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:risk-ledger',
        subjectId: 'forecast:risk-ledger',
        label: 'Risk Ledger',
        actualState: 'riot-risk-elevated',
        existenceMode: 'recorded_only',
        ruleDomain: 'future_pressure',
        confidence: 0.64,
        evidence: 'clear',
        futurePressureProfile: {
          family: 'statistically_predictive',
          sourceType: 'anomaly_log',
          confidence: 0.64,
        },
      })
    )

    expect(fixed).toMatchObject({
      trustPosture: 'treat_as_fixed_constraint',
      handlingMode: 'compliance_planning',
      guaranteedTruth: true,
    })
    expect(predictive).toMatchObject({
      trustPosture: 'treat_as_advisory_signal',
      handlingMode: 'probabilistic_preparation',
      guaranteedTruth: false,
    })
  })

  it('distinguishes fixed, self-fulfilling, and manipulative-false future records', () => {
    const selfFulfilling = projectFuturePressureAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:prophecy-loop',
        subjectId: 'record:prophecy-loop',
        label: 'Prophecy Loop',
        actualState: 'panic-escalation-risk',
        existenceMode: 'recorded_only',
        ruleDomain: 'future_pressure',
        confidence: 0.83,
        evidence: 'clear',
        futurePressureProfile: {
          family: 'self_fulfilling',
          sourceType: 'prophecy',
          triggerConditions: ['public_disclosure', 'command_overreaction'],
          confidence: 0.83,
        },
      })
    )
    const manipulativeFalse = projectFuturePressureAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:false-contract',
        subjectId: 'record:false-contract',
        label: 'False Contract Warning',
        actualState: 'deception-channel-active',
        existenceMode: 'recorded_only',
        ruleDomain: 'future_pressure',
        deviationFamily: 'future_pressure_false',
        confidence: 0.79,
        evidence: 'contradicted',
        futurePressureProfile: {
          family: 'manipulative_false',
          sourceType: 'contract_term',
          confidence: 0.79,
        },
      })
    )

    expect(selfFulfilling).toMatchObject({
      trustPosture: 'treat_as_escalation_risk',
      handlingMode: 'interruption_planning',
      guaranteedTruth: false,
    })
    expect(selfFulfilling?.reasonCodes).toContain('trigger-conditions-present')
    expect(manipulativeFalse).toMatchObject({
      trustPosture: 'treat_as_deception',
      handlingMode: 'counter_deception_review',
      guaranteedTruth: false,
    })
  })

  it('keeps conditionally falsifiable future pressure testable rather than absolute', () => {
    const conditional = projectFuturePressureAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:observer-report',
        subjectId: 'record:observer-report',
        label: 'Observer Report',
        actualState: 'watch-if-gate-opens',
        existenceMode: 'recorded_only',
        ruleDomain: 'future_pressure',
        deviationFamily: 'future_pressure_conditional',
        confidence: 0.76,
        evidence: 'clear',
        futurePressureProfile: {
          family: 'conditionally_falsifiable',
          sourceType: 'observer_report',
          triggerConditions: ['north_gate_unsealed'],
          falsifiabilityConditions: ['north_gate_remains_locked', 'secondary-sensor-clear'],
          confidence: 0.76,
        },
      })
    )

    expect(conditional).toMatchObject({
      trustPosture: 'treat_as_testable_contingency',
      handlingMode: 'condition_verification',
      guaranteedTruth: false,
    })
    expect(conditional?.reasonCodes).toContain('falsifiability-conditions-present')
  })

  it('preserves identity across non-essential surface change when invariants hold', () => {
    const packet = deriveRealityStatePacket({
      packetId: 'reality:recovered-relic',
      subjectId: 'artifact:saint-bell',
      label: 'Saint Bell Relic',
      actualState: 'relocated_and_scored',
      existenceMode: 'physical',
      ruleDomain: 'presence',
      confidence: 0.88,
      evidence: 'clear',
      identityProfile: {
        realIdentityId: 'relic:saint-bell',
        invariantProperties: ['origin:sanctum-cast', 'seal-pattern:eightfold', 'tone-signature:ash-bell'],
        mutableTraits: ['surface:charred', 'location:rivergate-vault'],
        preservedInvariantProperties: ['origin:sanctum-cast', 'seal-pattern:eightfold', 'tone-signature:ash-bell'],
        brokenInvariantProperties: [],
        persistenceStatus: 'preserved',
        nominalAlignment: 'aligned',
        confidence: 0.88,
      },
    })

    expect(projectRealityIdentityAssessment(packet)).toMatchObject({
      identityInterpretation: 'preserve_continuity',
      handlingMode: 'continuity_sensitive_handling',
      identityTrusted: true,
    })
  })

  it('treats identity as broken when invariant rules fail', () => {
    const packet = deriveRealityStatePacket({
      packetId: 'reality:fractured-host',
      subjectId: 'entity:fractured-host',
      label: 'Fractured Host',
      actualState: 'split-and-overwritten',
      existenceMode: 'physical',
      ruleDomain: 'presence',
      confidence: 0.81,
      evidence: 'contradicted',
      identityProfile: {
        realIdentityId: 'host:arden',
        invariantProperties: ['essence-anchor:arden', 'vow-binding:lantern-oath'],
        mutableTraits: ['voice:altered', 'body:scarred'],
        preservedInvariantProperties: [],
        brokenInvariantProperties: ['essence-anchor:arden', 'vow-binding:lantern-oath'],
        persistenceStatus: 'broken',
        nominalAlignment: 'aligned',
        confidence: 0.81,
      },
    })

    expect(projectRealityIdentityAssessment(packet)).toMatchObject({
      identityInterpretation: 'treat_as_identity_break',
      handlingMode: 'new-entity-containment',
      identityTrusted: false,
    })
  })

  it('separates nominal classification from real invariant identity when they diverge', () => {
    const packet = deriveRealityStatePacket({
      packetId: 'reality:misfiled-agent',
      subjectId: 'contact:misfiled-agent',
      label: 'Misfiled Agent',
      actualState: 'present',
      perceivedState: 'hostile-impostor',
      believedState: 'hostile-impostor',
      existenceMode: 'physical',
      ruleDomain: 'presence',
      confidence: 0.73,
      evidence: 'contradicted',
      identityProfile: {
        realIdentityId: 'agent:iris-quill',
        nominalIdentityId: 'impostor:red-echo',
        invariantProperties: ['memory-key:iris-quill', 'service-mark:seven-knot'],
        mutableTraits: ['uniform:forged', 'voice:distorted'],
        preservedInvariantProperties: ['memory-key:iris-quill', 'service-mark:seven-knot'],
        brokenInvariantProperties: [],
        persistenceStatus: 'preserved',
        nominalAlignment: 'misclassified',
        confidence: 0.73,
      },
    })

    expect(projectRealityIdentityAssessment(packet)).toMatchObject({
      identityInterpretation: 'reclassify_nominal_identity',
      handlingMode: 'identity_reclassification',
      identityTrusted: false,
    })
  })

  it('switches from baseline handling to declared symbolic override when the rule family is active', () => {
    const baseline = projectRealityRuleFamilyAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:ordinary-threshold',
        subjectId: 'threshold:ordinary-threshold',
        label: 'Ordinary Threshold',
        actualState: 'closed',
        perceivedState: 'closed',
        believedState: 'closed',
        existenceMode: 'physical',
        ruleDomain: 'presence',
        confidence: 0.92,
        evidence: 'clear',
        ruleFamilyProfile: {
          familyType: 'baseline_physical',
          activationStatus: 'active',
          overrideScope: 'object',
          allowedOutcomes: ['standard_entry_denial'],
          confidence: 0.92,
        },
      }),
      'baseline_physical'
    )

    const symbolicOverride = projectRealityRuleFamilyAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:named-threshold',
        subjectId: 'threshold:named-threshold',
        label: 'Named Threshold',
        actualState: 'passage_valid_only_if_named',
        perceivedState: 'sealed',
        believedState: 'sealed',
        existenceMode: 'partially_instantiated',
        ruleDomain: 'presence',
        deviationFamily: 'symbolic_override',
        confidence: 0.84,
        evidence: 'contradicted',
        ruleFamilyProfile: {
          familyType: 'symbolic_threshold',
          triggerConditions: ['true_name_spoken'],
          validityConditions: ['threshold_mark_unbroken'],
          activationStatus: 'active',
          overrideScope: 'site',
          allowedOutcomes: ['named_passage_valid'],
          invalidatedOutcomes: ['forced_entry_valid'],
          confidence: 0.84,
        },
      }),
      'symbolic_threshold'
    )

    expect(baseline).toMatchObject({
      resolvedFamilyType: 'baseline_physical',
      validityPosture: 'allow_under_baseline',
      handlingMode: 'standard_physical_handling',
      contradictionDetected: false,
    })
    expect(symbolicOverride).toMatchObject({
      resolvedFamilyType: 'symbolic_threshold',
      validityPosture: 'allow_under_declared_override',
      handlingMode: 'symbolic_rule_compliance',
      contradictionDetected: false,
    })
  })

  it('treats declared trigger conditions as activation gates rather than automatic overrides', () => {
    const inactive = projectRealityRuleFamilyAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:oath-lock-inactive',
        subjectId: 'lock:oath-lock',
        label: 'Oath Lock',
        actualState: 'sealed',
        perceivedState: 'sealed',
        believedState: 'sealed',
        existenceMode: 'physical',
        ruleDomain: 'presence',
        confidence: 0.79,
        evidence: 'clear',
        ruleFamilyProfile: {
          familyType: 'oath_binding',
          triggerConditions: ['oath_spoken'],
          validityConditions: ['witness_present'],
          activationStatus: 'inactive',
          overrideScope: 'object',
          allowedOutcomes: ['oath_entry_valid'],
          invalidatedOutcomes: ['unauthorized_entry_valid'],
          confidence: 0.79,
        },
      }),
      'oath_binding'
    )

    expect(inactive).toMatchObject({
      validityPosture: 'deny_until_triggered',
      handlingMode: 'condition_gated_handling',
      contradictionDetected: false,
    })
    expect(inactive?.reasonCodes).toContain('trigger-conditions-present')
  })

  it('leaves baseline handling intact when a declared non-natural family is inactive', () => {
    const baseline = projectRealityRuleFamilyAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:patron-door-inactive',
        subjectId: 'door:patron-door',
        label: 'Patron Door',
        actualState: 'locked',
        perceivedState: 'locked',
        believedState: 'locked',
        existenceMode: 'physical',
        ruleDomain: 'presence',
        confidence: 0.82,
        evidence: 'clear',
        ruleFamilyProfile: {
          familyType: 'patron_mediated',
          triggerConditions: ['patron_consent'],
          activationStatus: 'inactive',
          overrideScope: 'site',
          allowedOutcomes: ['patron_entry_valid'],
          confidence: 0.82,
        },
      }),
      'baseline_physical'
    )

    expect(baseline).toMatchObject({
      resolvedFamilyType: 'baseline_physical',
      validityPosture: 'allow_under_baseline',
      handlingMode: 'standard_physical_handling',
      contradictionDetected: false,
    })
  })

  it('flags contradiction when behavior is interpreted under the wrong active rule family', () => {
    const contradiction = projectRealityRuleFamilyAssessment(
      deriveRealityStatePacket({
        packetId: 'reality:offering-gate',
        subjectId: 'gate:offering-gate',
        label: 'Offering Gate',
        actualState: 'passage_valid_after_offering',
        perceivedState: 'impassable_barrier',
        believedState: 'impassable_barrier',
        existenceMode: 'partially_instantiated',
        ruleDomain: 'presence',
        deviationFamily: 'symbolic_override',
        confidence: 0.71,
        evidence: 'contradicted',
        ruleFamilyProfile: {
          familyType: 'patron_mediated',
          triggerConditions: ['offering_accepted'],
          validityConditions: ['site_bond_intact'],
          activationStatus: 'active',
          overrideScope: 'site',
          allowedOutcomes: ['petitioner_passage_valid'],
          invalidatedOutcomes: ['forced_breach_valid'],
          confidence: 0.71,
        },
      }),
      'baseline_physical'
    )

    expect(contradiction).toMatchObject({
      resolvedFamilyType: 'patron_mediated',
      evaluationFamilyType: 'baseline_physical',
      validityPosture: 'wrong_family_contradiction',
      handlingMode: 'rule-family-verification',
      contradictionDetected: true,
    })
    expect(contradiction?.reasonCodes).toContain('wrong-family-interpretation')
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
      futurePressureProfile: {
        family: 'statistically_predictive' as const,
        sourceType: 'anomaly_log' as const,
        triggerConditions: ['pressure-threshold-exceeded'],
        falsifiabilityConditions: ['pressure-threshold-not-reached'],
        confidence: 0.62,
      },
      identityProfile: {
        realIdentityId: 'record:future-ledger',
        invariantProperties: ['ledger-seal:amber', 'scribe-mark:outer-ring'],
        mutableTraits: ['cover:burned'],
        preservedInvariantProperties: ['ledger-seal:amber'],
        brokenInvariantProperties: [],
        persistenceStatus: 'uncertain' as const,
        nominalAlignment: 'uncertain' as const,
        confidence: 0.59,
      },
      ruleFamilyProfile: {
        familyType: 'symbolic_threshold' as const,
        triggerConditions: ['threshold-name-spoken'],
        validityConditions: ['seal-remains-intact'],
        activationStatus: 'uncertain' as const,
        overrideScope: 'site' as const,
        allowedOutcomes: ['named_entry_valid'],
        invalidatedOutcomes: ['forced_entry_valid'],
        confidence: 0.61,
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
    expect(projectFuturePressureAssessment(second)).toEqual(
      projectFuturePressureAssessment(first)
    )
    expect(projectRealityIdentityAssessment(second)).toEqual(
      projectRealityIdentityAssessment(first)
    )
    expect(projectRealityRuleFamilyAssessment(second)).toEqual(
      projectRealityRuleFamilyAssessment(first)
    )
  })
})
