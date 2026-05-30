import { describe, expect, it } from 'vitest'
import {
  CONCEALMENT_TELL_READOUT_PREFIX,
  COVER_TELL_READOUT_PREFIX,
  DISPLACEMENT_TELL_READOUT_PREFIX,
  evaluateHiddenStateModalityTell,
  formatModalityTellReadout,
  OBSERVER_THRESHOLD_STRICT_TAG,
  TELL_METADATA_SPOOF_TAG,
  TELL_ROUTE_TIMING_TAG,
  TELL_SPEECH_CADENCE_TAG,
  TELL_THERMAL_RESIDUAL_TAG,
} from '../domain/hiddenStateModalityTells'
import type { Agent, CaseInstance } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'

function createObserver(id: string, investigation: number): Agent {
  return {
    id,
    name: id,
    role: 'medium',
    baseStats: {
      combat: 10,
      investigation,
      utility: 40,
      social: 40,
    },
    tags: ['medium'],
    relationships: {},
    fatigue: 0,
    status: 'active',
  }
}

function createHiddenCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-modality-tell',
      templateId: 'combat_vampire_nest',
    }),
    mode: 'threshold',
    hiddenState: 'hidden',
    detectionConfidence: 0.2,
    counterDetection: false,
    tags: ['concealment'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: ['team-tell'],
    infiltrationCoverProfile: undefined,
    infiltrationProbePlan: undefined,
    weights: { combat: 0, investigation: 0.4, utility: 0, social: 0 },
    difficulty: { combat: 0, investigation: 40, utility: 0, social: 0 },
    ...overrides,
  }
}

describe('hiddenStateModalityTells (SPE-2286)', () => {
  it('fires concealment thermal-residual tell with prefix and score adjustment', () => {
    const caseData = createHiddenCase({ tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG] })
    const agents = [createObserver('a_thermal', 60)]

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents,
      disguiseValidationActive: false,
    })

    expect(tell.active).toBe(true)
    expect(tell.kind).toBe('thermal_residual')
    expect(tell.readoutLine).toContain(CONCEALMENT_TELL_READOUT_PREFIX)
    expect(tell.readoutLine).toContain('Residual signature')
    expect(tell.scoreAdjustment).toBeGreaterThan(0)
  })

  it('fires displacement route-timing tell referencing decoy locus', () => {
    const caseData = createHiddenCase({
      hiddenState: 'displaced',
      displacementTarget: 'annex-b',
      tags: [TELL_ROUTE_TIMING_TAG],
      difficulty: { combat: 0, investigation: 0, utility: 0, social: 0 },
    })
    const agents = [createObserver('a_route', 60)]

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents,
      disguiseValidationActive: false,
    })

    expect(tell.active).toBe(true)
    expect(tell.kind).toBe('route_timing')
    expect(tell.readoutLine).toContain(DISPLACEMENT_TELL_READOUT_PREFIX)
    expect(tell.readoutLine).toContain('annex-b')
    expect(formatModalityTellReadout('route_timing', caseData)).toContain('movement log')
  })

  it('prefers speech cadence over metadata spoof on disguised-identity cases', () => {
    const caseData = createHiddenCase({
      tags: ['disguise', TELL_SPEECH_CADENCE_TAG, TELL_METADATA_SPOOF_TAG],
      infiltrationCoverProfile: undefined,
    })
    const agents = [createObserver('a_cover', 60)]

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents,
      disguiseValidationActive: false,
    })

    expect(tell.active).toBe(true)
    expect(tell.modality).toBe('disguised_identity')
    expect(tell.kind).toBe('speech_cadence')
    expect(tell.readoutLine).toContain(COVER_TELL_READOUT_PREFIX)
  })

  it('skips tell evaluation when disguise validation is active', () => {
    const caseData = createHiddenCase({ tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG] })

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents: [createObserver('a_skip', 60)],
      disguiseValidationActive: true,
    })

    expect(tell.active).toBe(false)
  })

  it('suppresses tell under observer-threshold-strict when capability meets concealment', () => {
    const caseData = createHiddenCase({
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG, OBSERVER_THRESHOLD_STRICT_TAG],
      difficulty: { combat: 0, investigation: 15, utility: 0, social: 0 },
    })
    const strongObserver = createObserver('a_strong', 60)

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents: [strongObserver],
      disguiseValidationActive: false,
    })

    expect(tell.active).toBe(false)
  })

  it('fires tell under observer-threshold-strict when observer band is too weak', () => {
    const caseData = createHiddenCase({
      tags: ['concealment', TELL_THERMAL_RESIDUAL_TAG, OBSERVER_THRESHOLD_STRICT_TAG],
      difficulty: { combat: 0, investigation: 45, utility: 0, social: 0 },
    })
    const weakObserver = createObserver('a_weak', 20)

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents: [weakObserver],
      disguiseValidationActive: false,
    })

    expect(tell.active).toBe(true)
    expect(tell.readoutLine).toContain(CONCEALMENT_TELL_READOUT_PREFIX)
  })

  it('does not fire without a matching tell tag', () => {
    const caseData = createHiddenCase({ tags: ['concealment'] })

    const tell = evaluateHiddenStateModalityTell({
      caseData,
      agents: [createObserver('a_none', 60)],
      disguiseValidationActive: false,
    })

    expect(tell.active).toBe(false)
  })
})
