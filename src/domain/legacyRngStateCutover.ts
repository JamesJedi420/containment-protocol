/**
 * SPE-3163 — legacy rngState compatibility and stochastic cutover migration.
 *
 * Pure cutover disposition + exactly-once markers. Does not rewrite GameState;
 * callers apply markers into persistence. Consumes SPE-3162 scoped identity and
 * SPE-2898 transition vocabulary.
 */

import { nextSeed } from './math'
import type { TransitionDisposition, TransitionPolicy } from './ruleChangeTransitionContract'
import {
  createScopedStochasticRng,
  createStochasticDecisionIdentity,
  deriveStochasticSeed,
  type StochasticDecisionIdentity,
} from './stochasticIdentity'

export const LEGACY_RNG_CUTOVER_OWNER = 'SPE-3163' as const
export const LEGACY_RNG_CUTOVER_SCHEMA_VERSION = 'spe-3163.v1' as const
export const LEGACY_RNG_STATE_FAMILY = 'legacy_campaign_rng_stream' as const

export const SELECTOR_PROVENANCE_KINDS = [
  'legacy_global_stream',
  'scoped_stochastic_identity',
] as const
export type SelectorProvenanceKind = (typeof SELECTOR_PROVENANCE_KINDS)[number]

export interface LegacyRngHydrationInput {
  readonly rngSeed: number
  readonly rngState: number
  /** Already-resolved historical outcomes (opaque; preserved byte-stable). */
  readonly resolvedHistoryFingerprint: string
  readonly cutoverMarkerId?: string
}

export interface LegacyRngHydrationResult {
  readonly ok: true
  readonly rngSeed: number
  readonly rngState: number
  readonly resolvedHistoryFingerprint: string
  readonly cutoverApplied: boolean
  readonly cutoverMarkerId: string | null
}

export interface LegacyRngHydrationFailure {
  readonly ok: false
  readonly reasonCode:
    | 'malformed_input'
    | 'missing_transition_metadata'
    | 'incompatible_marker'
  readonly message: string
}

export type LegacyRngHydrateResult =
  | LegacyRngHydrationResult
  | LegacyRngHydrationFailure

export interface StochasticCutoverMarker {
  readonly schemaVersion: typeof LEGACY_RNG_CUTOVER_SCHEMA_VERSION
  readonly markerId: string
  readonly stateFamily: typeof LEGACY_RNG_STATE_FAMILY
  readonly policy: TransitionPolicy
  readonly disposition: TransitionDisposition
  readonly appliedAtWeek: number
  readonly legacyRngSeed: number
  readonly legacyRngStateAtCutover: number
  readonly defaultSelectorVersion: string
}

export interface InFlightLegacySequence {
  readonly sequenceId: string
  readonly stateFamily: string
  readonly originatingSelector: 'legacy_global_stream'
  readonly legacyStreamState: number
  readonly declaredBoundary: string
  readonly currentBoundary?: string
  readonly cutoverMarkerId?: string
}

export interface InFlightContinuationResult {
  readonly continueLegacy: boolean
  readonly disposition: TransitionDisposition
  readonly reasonCode: string
  readonly nextLegacyStreamState?: number
}

export interface PostCutoverDecisionRequest {
  readonly cutover: StochasticCutoverMarker
  readonly identity: Omit<StochasticDecisionIdentity, 'schemaVersion' | 'runSeed'> & {
    readonly runSeed?: number
  }
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
}

function dispositionForPolicy(policy: TransitionPolicy): TransitionDisposition {
  switch (policy) {
    case 'prospective_only':
      return 'apply_new_rule'
    case 'grandfather_existing':
      return 'unchanged_prior_semantics'
    case 'migrate_existing':
      return 'migrate_once'
    case 'revalidate_at_boundary':
      return 'await_boundary'
    case 'invalidate_or_reissue':
      return 'invalidate'
    default: {
      const _exhaustive: never = policy
      void _exhaustive
      return 'migrate_once'
    }
  }
}

/**
 * Hydrate a representative pre-SPE-3162 save. Never mutates resolved history.
 */
export function hydrateLegacyRngState(
  input: LegacyRngHydrationInput | null | undefined,
): LegacyRngHydrateResult {
  if (!input || !isFiniteInt(input.rngSeed) || !isFiniteInt(input.rngState)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      message: 'rngSeed and rngState are required finite numbers',
    }
  }
  if (
    typeof input.resolvedHistoryFingerprint !== 'string' ||
    input.resolvedHistoryFingerprint.trim().length === 0
  ) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      message: 'resolvedHistoryFingerprint is required',
    }
  }
  const markerId =
    typeof input.cutoverMarkerId === 'string' && input.cutoverMarkerId.trim().length > 0
      ? input.cutoverMarkerId.trim()
      : null
  return Object.freeze({
    ok: true as const,
    rngSeed: Math.trunc(input.rngSeed),
    rngState: Math.trunc(input.rngState),
    resolvedHistoryFingerprint: input.resolvedHistoryFingerprint,
    cutoverApplied: markerId !== null,
    cutoverMarkerId: markerId,
  })
}

/**
 * Exactly-once cutover marker. Re-applying the same marker returns already_migrated.
 */
export function applyStochasticCutover(args: {
  readonly hydration: LegacyRngHydrationResult
  readonly markerId: string
  readonly appliedAtWeek: number
  readonly policy?: TransitionPolicy
  readonly defaultSelectorVersion?: string
  readonly existingMarker?: StochasticCutoverMarker | null
}):
  | {
      readonly ok: true
      readonly marker: StochasticCutoverMarker
      readonly disposition: TransitionDisposition
    }
  | LegacyRngHydrationFailure {
  const markerId = args.markerId.trim()
  if (markerId.length === 0 || !Number.isFinite(args.appliedAtWeek)) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      message: 'markerId and appliedAtWeek are required',
    }
  }
  if (args.existingMarker) {
    if (args.existingMarker.markerId !== markerId) {
      return {
        ok: false,
        reasonCode: 'incompatible_marker',
        message: 'existing cutover marker id does not match',
      }
    }
    return {
      ok: true,
      marker: args.existingMarker,
      disposition: 'already_migrated',
    }
  }
  if (args.hydration.cutoverMarkerId) {
    if (args.hydration.cutoverMarkerId !== markerId) {
      return {
        ok: false,
        reasonCode: 'incompatible_marker',
        message: 'hydration already carries a different cutover marker',
      }
    }
    // Fail closed: hydration only stores the marker id. Callers must pass
    // existingMarker to re-apply without minting a second cutover.
    return {
      ok: false,
      reasonCode: 'missing_transition_metadata',
      message: 'hydration already carries this cutover marker; pass existingMarker',
    }
  }
  const policy = args.policy ?? 'migrate_existing'
  const marker: StochasticCutoverMarker = Object.freeze({
    schemaVersion: LEGACY_RNG_CUTOVER_SCHEMA_VERSION,
    markerId,
    stateFamily: LEGACY_RNG_STATE_FAMILY,
    policy,
    disposition: dispositionForPolicy(policy),
    appliedAtWeek: Math.trunc(args.appliedAtWeek),
    legacyRngSeed: args.hydration.rngSeed,
    legacyRngStateAtCutover: args.hydration.rngState,
    defaultSelectorVersion: (args.defaultSelectorVersion ?? 'spe-3162.v1').trim(),
  })
  return { ok: true, marker, disposition: dispositionForPolicy(policy) }
}

/**
 * Grandfathered in-flight sequences keep legacy stream draws until boundary.
 */
export function continueInFlightLegacySequence(
  sequence: InFlightLegacySequence,
  cutover: StochasticCutoverMarker | null,
): InFlightContinuationResult {
  if (
    !sequence ||
    typeof sequence.sequenceId !== 'string' ||
    sequence.sequenceId.trim().length === 0 ||
    !isFiniteInt(sequence.legacyStreamState)
  ) {
    return {
      continueLegacy: false,
      disposition: 'compatibility_conflict',
      reasonCode: 'malformed_input',
    }
  }
  if (!cutover) {
    return {
      continueLegacy: true,
      disposition: 'unchanged_prior_semantics',
      reasonCode: 'pre_cutover',
      nextLegacyStreamState: nextSeed(sequence.legacyStreamState),
    }
  }
  if (sequence.cutoverMarkerId && sequence.cutoverMarkerId !== cutover.markerId) {
    return {
      continueLegacy: false,
      disposition: 'compatibility_conflict',
      reasonCode: 'missing_transition_metadata',
    }
  }
  const atBoundary =
    sequence.currentBoundary !== undefined &&
    sequence.currentBoundary === sequence.declaredBoundary
  if (atBoundary) {
    return {
      continueLegacy: false,
      disposition: 'apply_new_rule',
      reasonCode: 'boundary_reached',
    }
  }
  // Only grandfather_existing / revalidate_at_boundary keep legacy draws mid-flight.
  if (
    cutover.policy !== 'grandfather_existing' &&
    cutover.policy !== 'revalidate_at_boundary'
  ) {
    return {
      continueLegacy: false,
      disposition: dispositionForPolicy(cutover.policy),
      reasonCode: cutover.policy,
    }
  }
  return {
    continueLegacy: true,
    disposition: 'unchanged_prior_semantics',
    reasonCode: 'grandfather_existing',
    nextLegacyStreamState: nextSeed(sequence.legacyStreamState),
  }
}

/**
 * Post-cutover authoritative decisions resolve through scoped identity only.
 * Fails closed when cutover marker is absent for a consequential new decision.
 */
export function resolvePostCutoverDecision(request: PostCutoverDecisionRequest):
  | {
      readonly ok: true
      readonly provenance: 'scoped_stochastic_identity'
      readonly identity: StochasticDecisionIdentity
      readonly derivedSeed: number
      readonly sample: number
    }
  | LegacyRngHydrationFailure {
  if (!request?.cutover) {
    return {
      ok: false,
      reasonCode: 'missing_transition_metadata',
      message: 'post-cutover decisions require an applied cutover marker',
    }
  }
  try {
    const identity = createStochasticDecisionIdentity({
      runSeed: request.identity.runSeed ?? request.cutover.legacyRngSeed,
      domain: request.identity.domain,
      semanticEntityOrEventId: request.identity.semanticEntityOrEventId,
      decisionKind: request.identity.decisionKind,
      phaseOrAttemptOrIndex: request.identity.phaseOrAttemptOrIndex,
      selectorVersion:
        request.identity.selectorVersion || request.cutover.defaultSelectorVersion,
    })
    const scoped = createScopedStochasticRng(identity)
    return {
      ok: true,
      provenance: 'scoped_stochastic_identity',
      identity,
      derivedSeed: scoped.derivedSeed,
      sample: scoped.next(),
    }
  } catch (error) {
    return {
      ok: false,
      reasonCode: 'malformed_input',
      message: error instanceof Error ? error.message : 'malformed stochastic identity',
    }
  }
}

/**
 * Prove scoped identity samples are unchanged when only the legacy stream
 * position is perturbed (stream is not part of decision identity).
 */
export function assertScopedIndependentOfLegacyStream(args: {
  readonly cutover: StochasticCutoverMarker
  readonly identity: Omit<StochasticDecisionIdentity, 'schemaVersion' | 'runSeed'> & {
    readonly runSeed?: number
  }
  readonly legacyStreamPerturbation: number
}): boolean {
  const base = resolvePostCutoverDecision({
    cutover: args.cutover,
    identity: args.identity,
  })
  if (!base.ok) return false
  const perturbedCutover: StochasticCutoverMarker = Object.freeze({
    ...args.cutover,
    legacyRngStateAtCutover: nextSeed(
      args.cutover.legacyRngStateAtCutover + Math.trunc(args.legacyStreamPerturbation),
    ),
  })
  const perturbed = resolvePostCutoverDecision({
    cutover: perturbedCutover,
    identity: args.identity,
  })
  if (!perturbed.ok) return false
  return (
    base.derivedSeed === perturbed.derivedSeed &&
    base.sample === perturbed.sample &&
    deriveStochasticSeed(base.identity) === base.derivedSeed
  )
}
