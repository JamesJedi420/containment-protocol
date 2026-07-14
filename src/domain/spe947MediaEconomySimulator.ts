/**
 * SPE-2611 / SPE-2612 / SPE-947: commercialization / media-economy simulator.
 *
 * Compose/sim only over SPE-2610 persisted economy maps + SPE-2609 continuity
 * resolve/compose. SPE-2611: one authored commercialization actor/path can worsen
 * residual risk after local containment. SPE-2612: ≥2 authored actors /
 * deterministic multi-path compose over the same persisted maps (extend, do not
 * rewrite SPE-2611 single-path semantics). No full internet simulator, no SPE-956
 * graph, no mid-week mutations, no SPE-2609 status rewrite, no SPE-2610 sanitize
 * rewrite.
 */

import {
  evaluatePostCaseMediaPersistence,
  type PostCaseMediaArtifact,
  type PostCaseMediaPersistenceDecision,
  type PostCaseMediaPersistenceInput,
} from './postCaseMediaPersistence'
import {
  composeCommercializationContinuityMediaInput,
  EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
  resolveSpe947MediaEconomyContinuity,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING,
  SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE,
  type Spe947MediaEconomyContinuityBinding,
  type Spe947MediaEconomyContinuityMaps,
  type Spe947MediaEconomyContinuityReading,
  type Spe947MediaEconomyWeight,
} from './spe947MediaEconomyContinuity'

/**
 * Authored attention-economy commercialization actor (compose/sim fixture).
 * Links to a continuity binding id; does not duplicate weight/case truth.
 */
export interface Spe947MediaEconomyCommercializationActor {
  readonly id: string
  readonly label: string
  readonly continuityBindingId: string
  /**
   * Finite >= 1 amplifier applied after SPE-2609 continuity on matching
   * commercialization artifacts. Factor 1 = continuity-only; >1 worsens further.
   * Values below 1 are rejected (worsen-only surface).
   */
  readonly actorWorsenFactor: number
}

export type Spe947MediaEconomySimStatus =
  | 'worsened'
  | 'continuity_only'
  | 'empty_maps'
  | 'missing_binding'
  | 'invalid_actor'
  | 'no_commercialization'
  | 'media_blocked'
  | 'unresolved_continuity'

export type Spe947MediaEconomySimReasonCode =
  | 'empty_persisted_maps'
  | 'missing_binding'
  | 'invalid_actor'
  | 'unresolved_continuity'
  | 'commercialization_actor_applied'
  | 'adaptation_untouched'
  | 'residual_risk_worsened'
  | 'residual_risk_unchanged'
  | 'no_commercialization_target'
  | 'media_persistence_remains_risky'
  | 'media_persistence_cleared'
  | 'media_persistence_blocked'

export interface Spe947MediaEconomySimReading {
  readonly actorId: string
  readonly actorLabel: string
  readonly continuityBindingId: string
  readonly continuityReading: Spe947MediaEconomyContinuityReading | null
  readonly actorWorsenFactor: number | null
  readonly status: Spe947MediaEconomySimStatus
  readonly baseDecision: PostCaseMediaPersistenceDecision | null
  readonly continuityDecision: PostCaseMediaPersistenceDecision | null
  readonly simDecision: PostCaseMediaPersistenceDecision | null
  readonly remainsRisky: boolean
  readonly reasonCodes: readonly Spe947MediaEconomySimReasonCode[]
}

function isValidActorWorsenFactor(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
}

function persistedEconomyMapsAreEmpty(maps: Spe947MediaEconomyContinuityMaps): boolean {
  const weights = maps.spe947MediaEconomyWeights ?? {}
  const bindings = maps.spe947MediaEconomyContinuityBindings ?? {}
  return Object.keys(weights).length === 0 && Object.keys(bindings).length === 0
}

function shouldScaleCommercialArtifact(
  artifact: PostCaseMediaArtifact,
  binding: Spe947MediaEconomyContinuityBinding
): boolean {
  if (artifact.kind !== 'commercialization') {
    return false
  }

  if (binding.mediaArtifactId !== undefined && binding.mediaArtifactId.length > 0) {
    return artifact.id === binding.mediaArtifactId
  }

  return true
}

function reasonCodeForDecision(
  decision: PostCaseMediaPersistenceDecision
): Spe947MediaEconomySimReasonCode {
  switch (decision.outcome) {
    case 'remains_risky':
      return 'media_persistence_remains_risky'
    case 'cleared':
      return 'media_persistence_cleared'
    case 'blocked':
      return 'media_persistence_blocked'
    default: {
      const _exhaustive: never = decision.outcome
      return _exhaustive
    }
  }
}

/**
 * Apply actor worsen factor only to commercialization artifacts matching the binding.
 * Adaptation (and other kinds) are never scaled.
 * Returns null when caseRecord is missing (compose no-op; mirrors SPE-2609 continuity helper).
 */
export function composeCommercializationActorMediaInput(input: {
  caseRecord: PostCaseMediaPersistenceInput | null | undefined
  binding: Spe947MediaEconomyContinuityBinding
  economyWeight: Spe947MediaEconomyWeight
  actorWorsenFactor: number
}): PostCaseMediaPersistenceInput | null {
  const continuityComposed = composeCommercializationContinuityMediaInput({
    caseRecord: input.caseRecord,
    economyWeight: input.economyWeight,
    binding: input.binding,
  })
  const base = continuityComposed ?? input.caseRecord
  if (base === null || base === undefined) {
    return null
  }

  const artifacts = base.mediaArtifacts
  if (artifacts === null || artifacts === undefined || !Array.isArray(artifacts)) {
    return base
  }

  const nextArtifacts: PostCaseMediaArtifact[] = []
  for (const artifact of artifacts) {
    if (!shouldScaleCommercialArtifact(artifact, input.binding)) {
      nextArtifacts.push(artifact)
      continue
    }

    const nextWeight = artifact.riskWeight * input.actorWorsenFactor
    // Overflow / non-finite product would make SPE-2573 block as invalid config.
    if (!Number.isFinite(nextWeight) || nextWeight < 0) {
      return null
    }

    nextArtifacts.push(
      Object.freeze({
        ...artifact,
        riskWeight: nextWeight,
      })
    )
  }

  return Object.freeze({
    ...base,
    mediaArtifacts: Object.freeze(nextArtifacts),
  })
}

/**
 * Simulate one authored commercialization actor path over persisted economy maps.
 * Empty persisted maps never throw or falsely satisfy residual-risk AC.
 */
export function simulateSpe947CommercializationEconomyPath(input: {
  actor: Spe947MediaEconomyCommercializationActor
  maps: Spe947MediaEconomyContinuityMaps
}): Spe947MediaEconomySimReading {
  const actor = input.actor
  const maps = input.maps ?? {}
  const reasonCodes: Spe947MediaEconomySimReasonCode[] = []

  if (persistedEconomyMapsAreEmpty(maps)) {
    reasonCodes.push('empty_persisted_maps')
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading: null,
      actorWorsenFactor: null,
      status: 'empty_maps',
      baseDecision: null,
      continuityDecision: null,
      simDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  if (!isValidActorWorsenFactor(actor.actorWorsenFactor)) {
    reasonCodes.push('invalid_actor')
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading: null,
      actorWorsenFactor: null,
      status: 'invalid_actor',
      baseDecision: null,
      continuityDecision: null,
      simDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const bindings = maps.spe947MediaEconomyContinuityBindings ?? {}
  const binding = bindings[actor.continuityBindingId]
  if (binding === undefined) {
    reasonCodes.push('missing_binding')
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading: null,
      actorWorsenFactor: actor.actorWorsenFactor,
      status: 'missing_binding',
      baseDecision: null,
      continuityDecision: null,
      simDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const continuityReading = resolveSpe947MediaEconomyContinuity({
    binding,
    maps,
  })

  if (
    continuityReading.status === 'missing_case' ||
    continuityReading.status === 'missing_economy_weight' ||
    continuityReading.status === 'invalid_economy_weight'
  ) {
    reasonCodes.push('unresolved_continuity')
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading,
      actorWorsenFactor: actor.actorWorsenFactor,
      status: 'unresolved_continuity',
      baseDecision: null,
      continuityDecision: null,
      simDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  if (continuityReading.status === 'media_blocked') {
    reasonCodes.push(reasonCodeForDecision(continuityReading.baseDecision!))
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading,
      actorWorsenFactor: actor.actorWorsenFactor,
      status: 'media_blocked',
      baseDecision: continuityReading.baseDecision,
      continuityDecision: continuityReading.modulatedDecision,
      simDecision: continuityReading.modulatedDecision,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  if (continuityReading.status === 'no_commercialization') {
    reasonCodes.push('no_commercialization_target')
    const noCommercialArtifacts = Array.isArray(maps.spe947PostCaseMediaCases?.[binding.caseId]?.mediaArtifacts)
      ? maps.spe947PostCaseMediaCases![binding.caseId]!.mediaArtifacts!
      : []
    if (noCommercialArtifacts.some((artifact) => artifact.kind === 'adaptation')) {
      reasonCodes.push('adaptation_untouched')
    }
    reasonCodes.push(reasonCodeForDecision(continuityReading.baseDecision!))
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading,
      actorWorsenFactor: actor.actorWorsenFactor,
      status: 'no_commercialization',
      baseDecision: continuityReading.baseDecision,
      continuityDecision: continuityReading.modulatedDecision,
      simDecision: continuityReading.modulatedDecision,
      remainsRisky: continuityReading.remainsRisky,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const caseRecord = maps.spe947PostCaseMediaCases?.[binding.caseId]
  const weight = maps.spe947MediaEconomyWeights?.[binding.economyWeightId]
  if (caseRecord === undefined || weight === undefined) {
    reasonCodes.push('unresolved_continuity')
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading,
      actorWorsenFactor: actor.actorWorsenFactor,
      status: 'unresolved_continuity',
      baseDecision: continuityReading.baseDecision,
      continuityDecision: continuityReading.modulatedDecision,
      simDecision: null,
      remainsRisky: continuityReading.remainsRisky,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const rawArtifacts = caseRecord.mediaArtifacts
  const artifacts = Array.isArray(rawArtifacts) ? rawArtifacts : []
  const hasAdaptation = artifacts.some((artifact) => artifact.kind === 'adaptation')

  const baseDecision = continuityReading.baseDecision
  const continuityDecision = continuityReading.modulatedDecision
  const simInput = composeCommercializationActorMediaInput({
    caseRecord,
    binding,
    economyWeight: weight,
    actorWorsenFactor: actor.actorWorsenFactor,
  })
  if (simInput === null) {
    reasonCodes.push('unresolved_continuity')
    return Object.freeze({
      actorId: actor.id,
      actorLabel: actor.label,
      continuityBindingId: actor.continuityBindingId,
      continuityReading,
      actorWorsenFactor: actor.actorWorsenFactor,
      status: 'unresolved_continuity',
      baseDecision: continuityReading.baseDecision,
      continuityDecision: continuityReading.modulatedDecision,
      simDecision: null,
      remainsRisky: false,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }
  const simDecision = evaluatePostCaseMediaPersistence(simInput)

  reasonCodes.push('commercialization_actor_applied')
  if (hasAdaptation) {
    reasonCodes.push('adaptation_untouched')
  }

  const continuityScore = continuityDecision?.persistenceRiskScore ?? 0
  const simScore = simDecision.persistenceRiskScore
  const worsened =
    simScore > continuityScore ||
    (!(continuityDecision?.remainsRisky ?? false) && simDecision.remainsRisky)

  if (worsened) {
    reasonCodes.push('residual_risk_worsened')
  } else {
    reasonCodes.push('residual_risk_unchanged')
  }
  reasonCodes.push(reasonCodeForDecision(simDecision))

  return Object.freeze({
    actorId: actor.id,
    actorLabel: actor.label,
    continuityBindingId: actor.continuityBindingId,
    continuityReading,
    actorWorsenFactor: actor.actorWorsenFactor,
    status: worsened ? 'worsened' : 'continuity_only',
    baseDecision,
    continuityDecision,
    simDecision,
    remainsRisky: simDecision.remainsRisky,
    reasonCodes: Object.freeze(reasonCodes),
  })
}

/**
 * Simulate authored commercialization actors in deterministic id order.
 * Empty actor list → empty readings (no-op). SPE-2611 single-path semantics unchanged.
 */
export function composeSpe947CommercializationEconomySims(input: {
  actors: readonly Spe947MediaEconomyCommercializationActor[]
  maps: Spe947MediaEconomyContinuityMaps
}): readonly Spe947MediaEconomySimReading[] {
  const actors = input.actors ?? []
  // Code-unit order (not localeCompare) so actor order stays deterministic across runtimes.
  const sorted = [...actors].sort((left, right) =>
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )

  return Object.freeze(
    sorted.map((actor) =>
      simulateSpe947CommercializationEconomyPath({
        actor,
        maps: input.maps,
      })
    )
  )
}

export type Spe947MediaEconomyMultiPathStatus =
  | 'empty_actors'
  | 'empty_maps'
  | 'multi_path'

/**
 * Deterministic multi-path compose over the same persisted maps (SPE-2612).
 * Readings reuse SPE-2611 simulate path; actor order is id code-unit ascending.
 */
export interface Spe947MediaEconomyMultiPathReading {
  readonly readings: readonly Spe947MediaEconomySimReading[]
  readonly actorIdsInOrder: readonly string[]
  readonly anyRemainsRisky: boolean
  readonly anyWorsened: boolean
  readonly status: Spe947MediaEconomyMultiPathStatus
}

/**
 * Multi-path compose: same maps, ≥0 authored actors, deterministic id order.
 * Empty actor list → empty_actors (no-op; remainsRisky false).
 * Empty persisted maps with actors → empty_maps (no false AC).
 */
export function composeSpe947CommercializationEconomyMultiPath(input: {
  actors: readonly Spe947MediaEconomyCommercializationActor[]
  maps: Spe947MediaEconomyContinuityMaps
}): Spe947MediaEconomyMultiPathReading {
  const actors = input.actors ?? []
  if (actors.length === 0) {
    return Object.freeze({
      readings: Object.freeze([]),
      actorIdsInOrder: Object.freeze([]),
      anyRemainsRisky: false,
      anyWorsened: false,
      status: 'empty_actors',
    })
  }

  const readings = composeSpe947CommercializationEconomySims({
    actors,
    maps: input.maps,
  })
  const actorIdsInOrder = Object.freeze(readings.map((reading) => reading.actorId))
  const anyRemainsRisky = readings.some((reading) => reading.remainsRisky)
  const anyWorsened = readings.some((reading) => reading.status === 'worsened')

  if (persistedEconomyMapsAreEmpty(input.maps ?? {})) {
    return Object.freeze({
      readings,
      actorIdsInOrder,
      anyRemainsRisky: false,
      anyWorsened: false,
      status: 'empty_maps',
    })
  }

  return Object.freeze({
    readings,
    actorIdsInOrder,
    anyRemainsRisky,
    anyWorsened,
    status: 'multi_path',
  })
}

/** EXAMPLE actor: merch promoter worsens residual commercialization via persisted continuity maps. */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR: Spe947MediaEconomyCommercializationActor =
  Object.freeze({
    id: 'actor:merch-attention-promoter',
    label: 'Merch attention promoter',
    continuityBindingId: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id,
    actorWorsenFactor: 2,
  })

/**
 * Second EXAMPLE commercialization actor (SPE-2612): livestream tour promoter.
 * Same continuity binding / persisted maps as merch promoter; factor 3.
 * Id sorts before `actor:merch-attention-promoter` under code-unit order.
 */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR: Spe947MediaEconomyCommercializationActor =
  Object.freeze({
    id: 'actor:livestream-tour-promoter',
    label: 'Livestream tour promoter',
    continuityBindingId: SPE_947_EXAMPLE_MEDIA_ECONOMY_CONTINUITY_BINDING.id,
    actorWorsenFactor: 3,
  })

/** Authored multi-actor EXAMPLE list (≥2 commercialization paths over the same maps). */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS: readonly Spe947MediaEconomyCommercializationActor[] =
  Object.freeze([
    SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
    SPE_947_EXAMPLE_MEDIA_ECONOMY_LIVESTREAM_ACTOR,
  ])

/** Shared persisted maps for single- and multi-actor EXAMPLE fixtures. */
const SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_MAPS = Object.freeze({
  spe947PostCaseMediaCases: Object.freeze({
    [EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE.caseId!]:
      EXAMPLE_WEAK_COMMERCIALIZATION_CONTINUITY_CASE,
  }),
  ...SPE_947_EXAMPLE_MEDIA_ECONOMY_PERSISTENCE_FIXTURE,
})

/**
 * Compact sim fixture: SPE-2610 persisted economy maps + weak post-case media case + EXAMPLE actor.
 * Empty defaults ≠ AC.
 */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_FIXTURE = Object.freeze({
  actor: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTOR,
  maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_MAPS,
})

/**
 * Multi-actor sim fixture (SPE-2612): same persisted maps + ≥2 authored commercialization actors.
 * Empty defaults ≠ AC. Actor list order is intentionally reverse of id sort for tests.
 */
export const SPE_947_EXAMPLE_MEDIA_ECONOMY_MULTI_ACTOR_SIM_FIXTURE = Object.freeze({
  actors: SPE_947_EXAMPLE_MEDIA_ECONOMY_COMMERCIALIZATION_ACTORS,
  maps: SPE_947_EXAMPLE_MEDIA_ECONOMY_SIM_MAPS,
})
