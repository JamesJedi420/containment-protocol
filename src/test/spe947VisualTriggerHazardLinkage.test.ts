import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  evaluateFootageExposureTraffic,
  EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT,
} from '../domain/footageExposureTraffic'
import {
  resolveFootageExposureEvaluationInput,
  sanitizeSpe947VisualTriggerHazardBindings,
  SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
  SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
} from '../domain/spe947EvaluatorPersistence'
import {
  composeSpe947VisualTriggerHazardLinks,
  resolveSpe947VisualTriggerHazardLink,
} from '../domain/spe947VisualTriggerHazardLinkage'
import { BACKGROUND_FRAGMENT_LATENT_FIXTURE } from '../domain/visualTriggerHazardRegistry'

describe('spe947VisualTriggerHazardLinkage (SPE-2602 / SPE-947)', () => {
  it('empty bindings compose to an empty list without throwing', () => {
    expect(
      composeSpe947VisualTriggerHazardLinks({
        maps: {
          spe947VisualTriggerHazardBindings: {},
          spe947ContentArtifacts: {},
        },
        visualTriggerHazardRecords: {},
      })
    ).toEqual([])

    expect(
      composeSpe947VisualTriggerHazardLinks({
        maps: {},
        visualTriggerHazardRecords: {
          [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
        },
      })
    ).toEqual([])
  })

  it('missing registry id yields missing_registry without inventing a record', () => {
    const link = resolveSpe947VisualTriggerHazardLink({
      binding: {
        ...SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
        visualTriggerHazardId: 'visual-trigger:does-not-exist',
      },
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {},
    })

    expect(link.status).toBe('missing_registry')
    expect(link.registryRecord).toBeNull()
    expect(link.registryLabel).toBeNull()
    expect(link.entityLabel).toBe(EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.label)
  })

  it('missing spe947 entity with present registry yields missing_entity', () => {
    const link = resolveSpe947VisualTriggerHazardLink({
      binding: {
        ...SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
        entityId: 'artifact:does-not-exist',
      },
      maps: {
        spe947ContentArtifacts: {},
      },
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })

    expect(link.status).toBe('missing_entity')
    expect(link.entityLabel).toBeNull()
    expect(link.registryRecord).toEqual(BACKGROUND_FRAGMENT_LATENT_FIXTURE)
    expect(link.registryLabel).toBe(BACKGROUND_FRAGMENT_LATENT_FIXTURE.label)
  })

  it('authored EXAMPLE linkage resolves the SPE-2111 registry record', () => {
    const links = composeSpe947VisualTriggerHazardLinks({
      maps: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })

    expect(links).toHaveLength(1)
    expect(links[0]).toEqual({
      bindingId: SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING.id,
      entityKind: 'content_artifact',
      entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
      entityLabel: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.label,
      visualTriggerHazardId: BACKGROUND_FRAGMENT_LATENT_FIXTURE.id,
      registryLabel: BACKGROUND_FRAGMENT_LATENT_FIXTURE.label,
      status: 'resolved',
      registryRecord: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
    })
  })

  it('sanitize drops invalid bindings; EXAMPLE binding round-trips with registry present', () => {
    const sanitized = sanitizeSpe947VisualTriggerHazardBindings({
      valid: SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
      duplicate: {
        ...SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
        entityId: 'artifact:other',
      },
      missingHazardId: {
        id: 'spe947-vth-link:bad',
        entityKind: 'content_artifact',
        entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
        visualTriggerHazardId: '',
      },
      badKind: {
        id: 'spe947-vth-link:bad-kind',
        entityKind: 'not_a_kind',
        entityId: EXAMPLE_ACTIVE_FOOTAGE_ARTIFACT.id,
        visualTriggerHazardId: BACKGROUND_FRAGMENT_LATENT_FIXTURE.id,
      },
    })

    expect(sanitized).toEqual({
      [SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING.id]: SPE_947_EXAMPLE_VISUAL_TRIGGER_HAZARD_BINDING,
    })

    const state = createStartingState()
    Object.assign(state, SPE_947_EXAMPLE_PERSISTENCE_FIXTURE, {
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })

    const serialized = serializeGameSave(state)
    const loaded = loadGameSave(serialized)
    expect(loaded.spe947VisualTriggerHazardBindings).toEqual(
      state.spe947VisualTriggerHazardBindings
    )
    expect(loaded.visualTriggerHazardRecords?.[BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]).toEqual(
      BACKGROUND_FRAGMENT_LATENT_FIXTURE
    )

    const hydrated = hydrateGame({
      ...SPE_947_EXAMPLE_PERSISTENCE_FIXTURE,
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })
    const links = composeSpe947VisualTriggerHazardLinks({
      maps: {
        spe947ContentArtifacts: hydrated.spe947ContentArtifacts,
        spe947VisualTriggerHazardBindings: hydrated.spe947VisualTriggerHazardBindings,
      },
      visualTriggerHazardRecords: hydrated.visualTriggerHazardRecords,
    })
    expect(links[0]?.status).toBe('resolved')
  })

  it('empty defaults do not falsely satisfy footage exposure parent AC', () => {
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
      composeSpe947VisualTriggerHazardLinks({
        maps: {
          spe947VisualTriggerHazardBindings: state.spe947VisualTriggerHazardBindings,
        },
        visualTriggerHazardRecords: state.visualTriggerHazardRecords,
      })
    ).toEqual([])
  })
})
