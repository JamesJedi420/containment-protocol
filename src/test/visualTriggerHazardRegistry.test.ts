import { describe, expect, it } from 'vitest'
import {
  ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE,
  BACKGROUND_FRAGMENT_LATENT_FIXTURE,
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  DISPOSAL_DEADLINE_SWEEP_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
  observerAwarenessEscalation,
  projectExposureChainRisk,
  resolveDisposalDeadlineCompliance,
  resolveEffectiveDerivativeHazard,
  resolvePursuitStateAfterOcclusion,
  validateVisualTriggerHazardRecord,
  type VisualTriggerHazardRecord,
} from '../domain/visualTriggerHazardRegistry'

function baseRecord(
  overrides: Partial<VisualTriggerHazardRecord> = {}
): VisualTriggerHazardRecord {
  return {
    id: 'visual-trigger:test-base',
    label: 'Test base record',
    triggerMedium: 'photo',
    awarenessRequirement: 'conscious',
    derivativeHazardProfile: 'full',
    pursuitState: 'dormant',
    occlusionState: 'exposed',
    ...overrides,
  }
}

describe('visualTriggerHazardRegistry (SPE-2111 slice 1)', () => {
  it('validates background_fragment fixture with years-later latent activation', () => {
    const result = validateVisualTriggerHazardRecord(BACKGROUND_FRAGMENT_LATENT_FIXTURE)

    expect(result.valid).toBe(true)
    expect(BACKGROUND_FRAGMENT_LATENT_FIXTURE.triggerMedium).toBe('background_fragment')
    expect(BACKGROUND_FRAGMENT_LATENT_FIXTURE.latentActivation).toBe(true)
    expect(BACKGROUND_FRAGMENT_LATENT_FIXTURE.derivativeHazardProfile).toBe('latent')

    const derivative = resolveEffectiveDerivativeHazard('latent', true)
    expect(derivative.inheritsFullTrigger).toBe(true)
    expect(derivative.hazardWeight).toBeGreaterThan(0.8)
  })

  it('warns on subconscious_retinal exposure with filter latency shorter than exposure path', () => {
    const result = validateVisualTriggerHazardRecord(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE)

    expect(result.valid).toBe(true)
    expect(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.awarenessRequirement).toBe(
      'subconscious_retinal'
    )
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'filter_latency_below_exposure_without_failure_mode',
        severity: 'warning',
      }),
    ])
  })

  it('does not inherit full trigger profile for artistic_exempt derivative media', () => {
    const mediaInstance = ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE.hazardousMediaInstances?.[0]
    expect(mediaInstance?.derivativeHazardProfile).toBe('artistic_exempt')

    const derivative = resolveEffectiveDerivativeHazard('artistic_exempt')
    expect(derivative.inheritsFullTrigger).toBe(false)
    expect(derivative.hazardWeight).toBe(0)

    const parentDerivative = resolveEffectiveDerivativeHazard(
      ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE.derivativeHazardProfile
    )
    expect(parentDerivative.inheritsFullTrigger).toBe(true)

    const result = validateVisualTriggerHazardRecord(ARTISTIC_EXEMPT_DERIVATIVE_FIXTURE)
    expect(result.valid).toBe(true)
  })

  it('transitions pursuit band deterministically when observer awareness increases', () => {
    const record = baseRecord({
      derivativeHazardProfile: 'full',
      pursuitState: 'dormant',
      awarenessRequirement: 'conscious',
    })

    const baseline = observerAwarenessEscalation(record, 'unaware', 'unaware')
    const escalated = observerAwarenessEscalation(record, 'unaware', 'heightened')

    expect(baseline.pursuitState).toBe('dormant')
    expect(escalated.pursuitPressure).toBeGreaterThan(baseline.pursuitPressure)
    expect(escalated.pursuitState).toBe('active_pursuit')
    expect(escalated.manifestationRisk).toBeGreaterThan(baseline.manifestationRisk)

    const repeat = observerAwarenessEscalation(record, 'unaware', 'heightened')
    expect(repeat).toEqual(escalated)
  })

  it('raises dream-intrusion flag for subconscious_retinal awareness escalation', () => {
    const record = baseRecord({
      awarenessRequirement: 'subconscious_retinal',
      derivativeHazardProfile: 'partial',
    })

    const result = observerAwarenessEscalation(record, 'unaware', 'conscious')

    expect(result.dreamIntrusion).toBe(true)
    expect(result.pursuitPressure).toBeGreaterThan(0)
  })

  it('forces sweep/occlusion/redaction compliance before disposal deadline week', () => {
    const compliance = resolveDisposalDeadlineCompliance(DISPOSAL_DEADLINE_SWEEP_FIXTURE, 32)

    expect(compliance.compliant).toBe(false)
    expect(compliance.requiredActions).toEqual(
      expect.arrayContaining(['sweep', 'occlusion', 'redaction'])
    )
    expect(compliance.overdueMediaInstanceIds).toContain('media:custody-roll-11')

    const afterDeadline = resolveDisposalDeadlineCompliance(DISPOSAL_DEADLINE_SWEEP_FIXTURE, 42)
    expect(afterDeadline.overdueMediaInstanceIds).toHaveLength(0)
    expect(afterDeadline.compliant).toBe(true)
  })

  it('allows pursuit resolution when occlusionState is covered', () => {
    expect(COVERED_PURSUIT_RESOLUTION_FIXTURE.pursuitState).toBe('active_pursuit')
    expect(COVERED_PURSUIT_RESOLUTION_FIXTURE.occlusionState).toBe('covered')

    const nextState = resolvePursuitStateAfterOcclusion(COVERED_PURSUIT_RESOLUTION_FIXTURE)
    expect(nextState).toBe('resolved')

    const exposedRecord = baseRecord({
      pursuitState: 'active_pursuit',
      occlusionState: 'exposed',
      targetInstanceIds: ['target:viewer-1'],
    })
    expect(resolvePursuitStateAfterOcclusion(exposedRecord)).toBe('active_pursuit')
  })

  it('errors on imported object number in record id', () => {
    const result = validateVisualTriggerHazardRecord(
      baseRecord({
        id: 'visual-trigger:scp-096-recording-hazard',
      })
    )

    expect(result.valid).toBe(false)
    expect(
      result.issues.some(
        (issue) =>
          issue.code === 'branded_object_number_in_id' || issue.code === 'franchise_token_in_id'
      )
    ).toBe(true)
  })

  it('errors on active_pursuit without targetInstanceIds', () => {
    const result = validateVisualTriggerHazardRecord(
      baseRecord({
        pursuitState: 'active_pursuit',
        targetInstanceIds: [],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues).toEqual([
      expect.objectContaining({
        code: 'active_pursuit_without_target',
        severity: 'error',
      }),
    ])
  })

  it('projects broadcast-scale exposure chain risk from repost chains and storage scope', () => {
    const projection = projectExposureChainRisk(BACKGROUND_FRAGMENT_LATENT_FIXTURE)

    expect(projection.recordId).toBe(BACKGROUND_FRAGMENT_LATENT_FIXTURE.id)
    expect(projection.repostChainDepth).toBe(2)
    expect(projection.latentActivationForecast).toBe(true)
    expect(projection.broadcastRiskScore).toBeGreaterThan(0.4)
    expect(projection.requiredCountermeasures).toEqual(
      expect.arrayContaining(['broadcast_takedown', 'media_sweep', 'repost_chain_trace'])
    )
    expect(['local', 'regional', 'broadcast']).toContain(projection.escalationBand)
  })

  it('preserves presentationMismatchProfile on subconscious retinal fixture', () => {
    const profile = SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.presentationMismatchProfile

    expect(profile?.cameraSpecificReveal).toBe(0.67)
    expect(profile?.nonstandardMovement).toBe(0.55)

    const result = validateVisualTriggerHazardRecord(SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE)
    expect(result.valid).toBe(true)
  })

  it('validates untrusted payloads without throwing when fields are missing', () => {
    const result = validateVisualTriggerHazardRecord({} as VisualTriggerHazardRecord)

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'invalid_awareness_requirement',
        'invalid_derivative_hazard_profile',
        'invalid_occlusion_state',
        'invalid_pursuit_state',
        'invalid_trigger_medium',
        'missing_id',
        'missing_label',
      ].sort()
    )
  })

  it('produces byte-stable validation output on repeated runs', () => {
    const record = baseRecord({
      pursuitState: 'active_pursuit',
      targetInstanceIds: ['target:viewer-1'],
      filterLatencyWeeks: 1,
      exposurePathWeeks: 4,
    })

    const first = JSON.stringify(validateVisualTriggerHazardRecord(record))
    const second = JSON.stringify(validateVisualTriggerHazardRecord(record))

    expect(first).toBe(second)
  })

  it('produces byte-stable exposure projection on repeated runs', () => {
    const first = JSON.stringify(projectExposureChainRisk(BACKGROUND_FRAGMENT_LATENT_FIXTURE))
    const second = JSON.stringify(projectExposureChainRisk(BACKGROUND_FRAGMENT_LATENT_FIXTURE))

    expect(first).toBe(second)
  })
})
