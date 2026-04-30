import { describe, expect, it } from 'vitest'
import {
  deriveRealityStatePacket,
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
    }

    const first = deriveRealityStatePacket(input)
    const second = deriveRealityStatePacket(input)

    expect(second).toEqual(first)
    expect(projectOperationalRealityAssessment(second)).toEqual(
      projectOperationalRealityAssessment(first)
    )
  })
})
