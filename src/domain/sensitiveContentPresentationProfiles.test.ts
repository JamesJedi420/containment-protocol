import { describe, expect, it } from 'vitest'
import {
  projectSensitiveContentPresentation,
  profilesPreserveMechanicalEquivalence,
  type CanonicalBodilyState,
} from './sensitiveContentPresentationProfiles'

const sampleState: CanonicalBodilyState = {
  id: 'body-001',
  injurySeverity: 'critical',
  transformationCue: 'visible tissue rupture and anomalous growth',
  warningRequired: true,
}

describe('SPE-3742 sensitive content presentation profiles', () => {
  it('projects the same authoritative state through explicit and clinical profiles with identical mechanical severity', () => {
    const explicit = projectSensitiveContentPresentation(sampleState, 'explicit')
    const clinical = projectSensitiveContentPresentation(sampleState, 'clinical')
    expect(explicit.mechanicalSeverity).toBe('critical')
    expect(clinical.mechanicalSeverity).toBe('critical')
    expect(explicit.operationalFact).toContain('tissue rupture')
    expect(clinical.operationalFact).toContain('Clinical observation')
    expect(explicit.warningText).toBeTruthy()
    expect(clinical.warningText).toBeTruthy()
  })

  it('fails closed to clinical profile on malformed input and preserves warning', () => {
    const result = projectSensitiveContentPresentation(sampleState, 'unknown')
    expect(result.profile).toBe('clinical')
    expect(result.mechanicalSeverity).toBe('critical')
    expect(result.warningText).toContain('Mandatory clinical alert')
  })

  it('confirms mechanical equivalence across all profiles', () => {
    expect(profilesPreserveMechanicalEquivalence(sampleState)).toBe(true)
  })

  it('does not mutate the original state', () => {
    const copy = { ...sampleState }
    projectSensitiveContentPresentation(sampleState, 'symbolic')
    expect(sampleState).toEqual(copy)
  })
})
