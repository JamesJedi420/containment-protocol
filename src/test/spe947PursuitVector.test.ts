import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  evaluateFootageExposureTraffic,
  EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
} from '../domain/footageExposureTraffic'
import {
  resolveFootageExposureEvaluationInput,
  SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
  SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
} from '../domain/spe947EvaluatorPersistence'
import {
  composeSpe947PursuitVectors,
  resolveSpe947PursuitVector,
} from '../domain/spe947PursuitVector'
import { resolveSpe947VisualTriggerHazardLink } from '../domain/spe947VisualTriggerHazardLinkage'
import {
  BACKGROUND_FRAGMENT_LATENT_FIXTURE,
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
} from '../domain/visualTriggerHazardRegistry'

describe('spe947PursuitVector (SPE-2604 / SPE-947)', () => {
  it('empty bindings compose to an empty list without throwing', () => {
    expect(
      composeSpe947PursuitVectors({
        maps: {
          spe947VisualTriggerHazardBindings: {},
          spe947ContentArtifacts: {},
        },
        visualTriggerHazardRecords: {},
      })
    ).toEqual([])

    expect(
      composeSpe947PursuitVectors({
        maps: {},
        visualTriggerHazardRecords: {
          [COVERED_PURSUIT_RESOLUTION_FIXTURE.id]: COVERED_PURSUIT_RESOLUTION_FIXTURE,
        },
      })
    ).toEqual([])
  })

  it('unresolved link yields unresolved_link band without inventing pursuit state', () => {
    const link = resolveSpe947VisualTriggerHazardLink({
      binding: {
        ...SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
        visualTriggerHazardId: 'visual-trigger:does-not-exist',
      },
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {},
    })

    const reading = resolveSpe947PursuitVector({ link })

    expect(reading.pursuitVectorBand).toBe('unresolved_link')
    expect(reading.pursuitState).toBeNull()
    expect(reading.targetInstanceIds).toEqual([])
    expect(reading.pursuitPressure).toBeNull()
    expect(reading.manifestationRisk).toBeNull()
    expect(reading.reasonCodes).toContain('unresolved_link')
  })

  it('dormant EXAMPLE linkage yields none band without false active pursuit', () => {
    const readings = composeSpe947PursuitVectors({
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })

    expect(readings).toHaveLength(1)
    expect(readings[0]?.pursuitVectorBand).toBe('none')
    expect(readings[0]?.pursuitState).toBe('dormant')
    expect(readings[0]?.targetInstanceIds).toEqual([])
    expect(readings[0]?.reasonCodes).toContain('pursuit_dormant')
    expect(readings[0]?.reasonCodes).not.toContain('pursuit_active')
  })

  it('active_pursuit without targets reports missing_pursuit_targets without throw', () => {
    const link = resolveSpe947VisualTriggerHazardLink({
      binding: {
        id: 'spe947-vth-link:pursuit-no-targets',
        entityKind: 'content_artifact',
        entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
        visualTriggerHazardId: 'visual-trigger:active-no-targets',
      },
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        'visual-trigger:active-no-targets': {
          ...COVERED_PURSUIT_RESOLUTION_FIXTURE,
          id: 'visual-trigger:active-no-targets',
          targetInstanceIds: [],
        },
      },
    })

    const reading = resolveSpe947PursuitVector({ link })

    expect(reading.linkStatus).toBe('resolved')
    expect(reading.pursuitVectorBand).toBe('active')
    expect(reading.pursuitState).toBe('active_pursuit')
    expect(reading.targetInstanceIds).toEqual([])
    expect(reading.reasonCodes).toContain('missing_pursuit_targets')
    expect(reading.reasonCodes).toContain('pursuit_active')
  })

  it('authored active pursuit path yields deterministic active vector with targets', () => {
    const activeBinding = {
      id: 'spe947-vth-link:pursuit-active',
      entityKind: 'content_artifact' as const,
      entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
      visualTriggerHazardId: COVERED_PURSUIT_RESOLUTION_FIXTURE.id,
    }

    const readings = composeSpe947PursuitVectors({
      maps: {
        ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
        spe947VisualTriggerHazardBindings: {
          [activeBinding.id]: activeBinding,
        },
      },
      visualTriggerHazardRecords: {
        [COVERED_PURSUIT_RESOLUTION_FIXTURE.id]: COVERED_PURSUIT_RESOLUTION_FIXTURE,
      },
    })

    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({
      bindingId: activeBinding.id,
      entityKind: 'content_artifact',
      entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
      entityLabel: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.label,
      visualTriggerHazardId: COVERED_PURSUIT_RESOLUTION_FIXTURE.id,
      registryLabel: COVERED_PURSUIT_RESOLUTION_FIXTURE.label,
      linkStatus: 'resolved',
      pursuitState: 'active_pursuit',
      pursuitVectorBand: 'active',
      targetInstanceIds: ['target:field-team-4'],
    })
    expect(readings[0]?.reasonCodes).toContain('pursuit_active')
    expect(readings[0]?.reasonCodes).not.toContain('missing_pursuit_targets')
    expect(typeof readings[0]?.pursuitPressure).toBe('number')
    expect(typeof readings[0]?.manifestationRisk).toBe('number')
  })

  it('distressed pursuit maps to latent band', () => {
    const link = resolveSpe947VisualTriggerHazardLink({
      binding: {
        id: 'spe947-vth-link:pursuit-distressed',
        entityKind: 'content_artifact',
        entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
        visualTriggerHazardId: SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.id,
      },
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        [SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE.id]: SUBCONSCIOUS_RETINAL_FILTER_FAILURE_FIXTURE,
      },
    })

    const reading = resolveSpe947PursuitVector({ link })

    expect(reading.pursuitVectorBand).toBe('latent')
    expect(reading.pursuitState).toBe('distressed')
    expect(reading.targetInstanceIds).toEqual(['target:viewer-queue-7'])
    expect(reading.reasonCodes).toContain('pursuit_distressed')
  })

  it('empty defaults do not falsely satisfy footage exposure parent AC or invent active pursuit', () => {
    const state = createStartingState()
    expect(state.spe947VisualTriggerHazardBindings).toEqual({})
    expect(state.visualTriggerHazardRecords).toEqual({})

    const decision = evaluateFootageExposureTraffic(
      resolveFootageExposureEvaluationInput(
        {
          spe947ContentArtifacts: state.spe947ContentArtifacts ?? {},
          spe947FootageExposureBindings: state.spe947FootageExposureBindings ?? {},
        },
        EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id
      )
    )

    expect(decision.amplified).toBe(false)
    expect(decision.reasonCodes).toContain('missing_artifact')
    expect(
      composeSpe947PursuitVectors({
        maps: {
          spe947VisualTriggerHazardBindings: state.spe947VisualTriggerHazardBindings,
        },
        visualTriggerHazardRecords: state.visualTriggerHazardRecords,
      })
    ).toEqual([])
  })
})
