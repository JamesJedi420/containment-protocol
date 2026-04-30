import { describe, expect, it } from 'vitest'
import {
  PROOF_HUMAN_ACTOR,
  PROOF_SPIRIT_ACTOR,
  buildKnownProfile,
  correctKnownProfile,
  declareActor,
  isInteractionAllowed,
  resolvePhysicalityCompatibility,
  type UnifiedActorDeclaration,
} from '../domain/actorTaxonomy'

describe('actorTaxonomy slice 1', () => {
  it('uses the same declaration schema for human and spirit classes', () => {
    const human: UnifiedActorDeclaration = PROOF_HUMAN_ACTOR
    const spirit: UnifiedActorDeclaration = PROOF_SPIRIT_ACTOR

    expect(human.id).toBeTruthy()
    expect(spirit.id).toBeTruthy()

    expect(Array.isArray(human.movementModes)).toBe(true)
    expect(Array.isArray(spirit.movementModes)).toBe(true)

    expect(typeof human.capabilities.canInterview).toBe('boolean')
    expect(typeof spirit.capabilities.canInterview).toBe('boolean')
  })

  it('nonphysical state blocks physical storage and conventional restraint', () => {
    const compatibility = resolvePhysicalityCompatibility(PROOF_SPIRIT_ACTOR)
    expect(compatibility.allowsPhysicalStorage).toBe(false)
    expect(compatibility.allowsConventionalRestraint).toBe(false)

    expect(isInteractionAllowed(PROOF_SPIRIT_ACTOR, 'physically_store')).toBe(false)
    expect(isInteractionAllowed(PROOF_SPIRIT_ACTOR, 'restrain')).toBe(false)
  })

  it('explicit capability difference produces different legality results', () => {
    expect(isInteractionAllowed(PROOF_HUMAN_ACTOR, 'interview')).toBe(true)
    expect(isInteractionAllowed(PROOF_SPIRIT_ACTOR, 'interview')).toBe(false)

    expect(isInteractionAllowed(PROOF_HUMAN_ACTOR, 'ward')).toBe(false)
    expect(isInteractionAllowed(PROOF_SPIRIT_ACTOR, 'ward')).toBe(true)
  })

  it('known profile can initially differ from true profile', () => {
    const known = buildKnownProfile(
      PROOF_SPIRIT_ACTOR,
      {
        provisionalClass: 'human',
        provisionalPhysicality: 'physical',
        provisionalMovementModes: ['walking'],
        provisionalSensingChannels: ['visual'],
        provisionalCapabilities: {
          canInterview: true,
          canRestrain: true,
          canSedate: true,
          canInjure: true,
          canTrack: true,
          canPhotograph: true,
          canRecord: true,
          canWard: false,
          canBargain: false,
          canArchive: true,
          canPhysicallyStore: true,
        },
      },
      'low'
    )

    expect(known.provisionalClass).toBe('human')
    expect(known.provisionalClass).not.toBe(PROOF_SPIRIT_ACTOR.actorClass)
    expect(known.provisionalPhysicality).toBe('physical')
    expect(known.provisionalPhysicality).not.toBe(PROOF_SPIRIT_ACTOR.physicality)
  })

  it('correction deterministically updates known profile toward truth', () => {
    const initial = buildKnownProfile(
      PROOF_SPIRIT_ACTOR,
      {
        provisionalClass: 'human',
        provisionalPhysicality: 'physical',
        provisionalMovementModes: ['walking'],
        provisionalSensingChannels: ['visual'],
      },
      'low'
    )

    const correction = correctKnownProfile(initial, { declaration: PROOF_SPIRIT_ACTOR }, 'field-observation')

    expect(correction.changed).toBe(true)
    expect(correction.after.provisionalClass).toBe(PROOF_SPIRIT_ACTOR.actorClass)
    expect(correction.after.provisionalPhysicality).toBe(PROOF_SPIRIT_ACTOR.physicality)
    expect(correction.after.provisionalMovementModes).toEqual(PROOF_SPIRIT_ACTOR.movementModes)
    expect(correction.after.provisionalSensingChannels).toEqual(PROOF_SPIRIT_ACTOR.sensingChannels)
    expect(correction.after.confidence).toBe('confirmed')
    expect(correction.after.correctionCount).toBe(1)
  })

  it('repeated calls with same input return identical outputs', () => {
    const input = {
      id: 'actor-repeat-001',
      label: 'Repeat Subject',
      actorClass: 'construct' as const,
      physicality: 'anchored' as const,
      behaviorState: 'contained' as const,
      movementModes: ['walking', 'walking'],
      sensingChannels: ['visual', 'visual'],
      needs: ['maintenance', 'maintenance'],
      drives: ['hold-position', 'hold-position'],
      capabilities: {
        canInterview: false,
        canRestrain: true,
        canSedate: false,
        canInjure: true,
        canTrack: true,
        canPhotograph: true,
        canRecord: true,
        canWard: true,
        canBargain: false,
        canArchive: true,
        canPhysicallyStore: false,
      },
      lifecycleTags: ['decays', 'decays'],
    }

    const a = declareActor(input)
    const b = declareActor(input)
    expect(a).toEqual(b)

    const knownA = buildKnownProfile(a, {}, 'medium')
    const knownB = buildKnownProfile(a, {}, 'medium')
    expect(knownA).toEqual(knownB)

    const corrA = correctKnownProfile(knownA, { declaration: a }, 'lab-confirmation')
    const corrB = correctKnownProfile(knownA, { declaration: a }, 'lab-confirmation')
    expect(corrA).toEqual(corrB)
  })

  it('physical actor retains legality for physical interactions when capability allows', () => {
    const compatibility = resolvePhysicalityCompatibility(PROOF_HUMAN_ACTOR)
    expect(compatibility.allowsPhysicalStorage).toBe(true)
    expect(compatibility.allowsConventionalRestraint).toBe(true)
    expect(isInteractionAllowed(PROOF_HUMAN_ACTOR, 'physically_store')).toBe(true)
    expect(isInteractionAllowed(PROOF_HUMAN_ACTOR, 'restrain')).toBe(true)
  })
})
