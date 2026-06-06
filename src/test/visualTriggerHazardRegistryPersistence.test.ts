import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  BACKGROUND_FRAGMENT_LATENT_FIXTURE,
  COVERED_PURSUIT_RESOLUTION_FIXTURE,
  DISPOSAL_DEADLINE_SWEEP_FIXTURE,
  sanitizeVisualTriggerHazardRecords,
} from '../domain/visualTriggerHazardRegistry'

describe('visualTriggerHazardRegistry persistence (SPE-2111 slice 2)', () => {
  it('defaults starting state to an empty visual-trigger hazard map', () => {
    expect(createStartingState().visualTriggerHazardRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeVisualTriggerHazardRecords(
      {
        valid: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
        covered: COVERED_PURSUIT_RESOLUTION_FIXTURE,
        'wrong-key': {
          ...BACKGROUND_FRAGMENT_LATENT_FIXTURE,
          id: 'visual-trigger:covered-pursuit-resolution',
        },
        duplicate: {
          ...BACKGROUND_FRAGMENT_LATENT_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          triggerMedium: 'photo',
          awarenessRequirement: 'conscious',
          derivativeHazardProfile: 'full',
          pursuitState: 'dormant',
          occlusionState: 'exposed',
        },
        franchiseLabel: {
          id: 'visual-trigger:franchise',
          label: 'SCP division broadcast hazard',
          triggerMedium: 'photo',
          awarenessRequirement: 'conscious',
          derivativeHazardProfile: 'full',
          pursuitState: 'dormant',
          occlusionState: 'exposed',
        },
        brandedObjectId: {
          id: 'visual-trigger:scp-096-recording-hazard',
          label: 'Archive hazard clip',
          triggerMedium: 'photo',
          awarenessRequirement: 'conscious',
          derivativeHazardProfile: 'full',
          pursuitState: 'dormant',
          occlusionState: 'exposed',
        },
        invalidTriggerMedium: {
          id: 'visual-trigger:invalid-medium',
          label: 'Invalid trigger medium',
          triggerMedium: 'not_a_medium',
          awarenessRequirement: 'conscious',
          derivativeHazardProfile: 'full',
          pursuitState: 'dormant',
          occlusionState: 'exposed',
        },
        activePursuitWithoutTarget: {
          id: 'visual-trigger:no-target-pursuit',
          label: 'Active pursuit without targets',
          triggerMedium: 'photo',
          awarenessRequirement: 'conscious',
          derivativeHazardProfile: 'full',
          pursuitState: 'active_pursuit',
          targetInstanceIds: [],
          occlusionState: 'exposed',
        },
        invalidOcclusionState: {
          id: 'visual-trigger:invalid-occlusion',
          label: 'Invalid occlusion state',
          triggerMedium: 'photo',
          awarenessRequirement: 'conscious',
          derivativeHazardProfile: 'full',
          pursuitState: 'dormant',
          occlusionState: 'not_a_state',
        },
      },
      fallback
    )

    expect(sanitized['visual-trigger:public-broadcast-background-fragment']).toEqual(
      BACKGROUND_FRAGMENT_LATENT_FIXTURE
    )
    expect(sanitized['visual-trigger:covered-pursuit-resolution']).toEqual(
      COVERED_PURSUIT_RESOLUTION_FIXTURE
    )
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.franchiseLabel).toBeUndefined()
    expect(sanitized.brandedObjectId).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(sanitized['wrong-key']).toBeUndefined()
    expect(sanitized.invalidTriggerMedium).toBeUndefined()
    expect(sanitized.activePursuitWithoutTarget).toBeUndefined()
    expect(sanitized.invalidOcclusionState).toBeUndefined()
    expect(Object.keys(sanitized).sort()).toEqual([
      'visual-trigger:covered-pursuit-resolution',
      'visual-trigger:public-broadcast-background-fragment',
    ])
  })

  it('round-trips fixture records with nested arrays byte-stable through save/load', () => {
    const state = createStartingState()
    state.visualTriggerHazardRecords = {
      [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      [DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]: DISPOSAL_DEADLINE_SWEEP_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.visualTriggerHazardRecords).toEqual(state.visualTriggerHazardRecords)
    expect(
      loaded.visualTriggerHazardRecords?.[BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]
        ?.hazardousMediaInstances?.[0]?.copyRepostChainRefs
    ).toEqual(
      BACKGROUND_FRAGMENT_LATENT_FIXTURE.hazardousMediaInstances?.[0]?.copyRepostChainRefs
    )
    expect(
      loaded.visualTriggerHazardRecords?.[BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]
        ?.hazardousMediaInstances?.[0]?.accessHistory
    ).toEqual(
      BACKGROUND_FRAGMENT_LATENT_FIXTURE.hazardousMediaInstances?.[0]?.accessHistory
    )
    expect(
      loaded.visualTriggerHazardRecords?.[DISPOSAL_DEADLINE_SWEEP_FIXTURE.id]
        ?.hazardousMediaInstances?.[0]?.accessHistory
    ).toEqual(
      DISPOSAL_DEADLINE_SWEEP_FIXTURE.hazardousMediaInstances?.[0]?.accessHistory
    )
  })

  it('hydrates persisted visual-trigger hazard records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        visualTriggerHazardRecords: {
          [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
          invalid: {
            id: 'visual-trigger:invalid',
            label: 'SCP division broadcast hazard',
            triggerMedium: 'photo',
            awarenessRequirement: 'conscious',
            derivativeHazardProfile: 'full',
            pursuitState: 'dormant',
            occlusionState: 'exposed',
          },
        },
      },
      fallback
    )

    expect(hydrated.visualTriggerHazardRecords).toEqual({
      [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
    })
  })
})
