/**
 * SPE-876 — pre-activation safety readiness review.
 *
 * Pure caller-owned hard activation gates: hazardous systems cannot go live
 * until the activation-kind readiness bundle is satisfied. Distinct from
 * process safety information (SPE-872), hazard analysis (SPE-873), lifecycle
 * procedures (SPE-874), and equipment integrity (SPE-877). No GameState field.
 */

export const PRE_ACTIVATION_SAFETY_READINESS_OWNER = 'SPE-876' as const

export type ActivationKind =
  | 'first_startup'
  | 'restart_after_shutdown'
  | 'restart_after_major_change'

export type ReadinessPrerequisite =
  | 'construction'
  | 'procedures'
  | 'review_findings'
  | 'change_requirements'
  | 'training'

export type ActivationAuthority = 'blocked' | 'authorized'

export interface PreActivationReadinessSnapshot {
  readonly systemId: string
  readonly activationKind: ActivationKind
  readonly constructionComplete: boolean
  readonly proceduresAvailable: boolean
  readonly reviewFindingsClosed: boolean
  readonly changeRequirementsSatisfied: boolean
  readonly trainingComplete: boolean
}

export interface PreActivationReadinessState {
  readonly systemId: string
  readonly activationKind: ActivationKind
  readonly authority: ActivationAuthority
  readonly activationAllowed: boolean
  readonly requiredBundle: readonly ReadinessPrerequisite[]
  readonly blockingConditions: readonly string[]
  readonly reasons: readonly string[]
}

const ACTIVATION_KINDS: readonly ActivationKind[] = [
  'first_startup',
  'restart_after_shutdown',
  'restart_after_major_change',
]

/** First startup and major-change restart require the full construction/change bundle. */
const FULL_BUNDLE: readonly ReadinessPrerequisite[] = Object.freeze([
  'construction',
  'procedures',
  'review_findings',
  'change_requirements',
  'training',
])

/** Restart after ordinary shutdown omits construction and change-requirement rechecks. */
const RESTART_SHUTDOWN_BUNDLE: readonly ReadinessPrerequisite[] = Object.freeze([
  'procedures',
  'review_findings',
  'training',
])

function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`pre-activation readiness ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requireActivationKind(value: string): ActivationKind {
  if ((ACTIVATION_KINDS as readonly string[]).includes(value)) {
    return value as ActivationKind
  }
  throw new Error('pre-activation readiness activationKind is invalid')
}

/**
 * Readiness prerequisite bundle for one activation kind.
 */
export function readinessBundleForKind(
  activationKind: ActivationKind,
): readonly ReadinessPrerequisite[] {
  switch (activationKind) {
    case 'first_startup':
    case 'restart_after_major_change':
      return FULL_BUNDLE
    case 'restart_after_shutdown':
      return RESTART_SHUTDOWN_BUNDLE
    default: {
      const _exhaustive: never = activationKind
      throw new Error(`pre-activation readiness unexpected kind: ${_exhaustive}`)
    }
  }
}

/**
 * Fail-closed create for one readiness snapshot.
 */
export function createPreActivationReadinessSnapshot(
  input: PreActivationReadinessSnapshot,
): PreActivationReadinessSnapshot {
  return Object.freeze({
    systemId: requireNonEmpty(input.systemId, 'systemId'),
    activationKind: requireActivationKind(input.activationKind),
    constructionComplete: Boolean(input.constructionComplete),
    proceduresAvailable: Boolean(input.proceduresAvailable),
    reviewFindingsClosed: Boolean(input.reviewFindingsClosed),
    changeRequirementsSatisfied: Boolean(input.changeRequirementsSatisfied),
    trainingComplete: Boolean(input.trainingComplete),
  })
}

function flagForPrerequisite(
  snapshot: PreActivationReadinessSnapshot,
  prerequisite: ReadinessPrerequisite,
): boolean {
  switch (prerequisite) {
    case 'construction':
      return snapshot.constructionComplete
    case 'procedures':
      return snapshot.proceduresAvailable
    case 'review_findings':
      return snapshot.reviewFindingsClosed
    case 'change_requirements':
      return snapshot.changeRequirementsSatisfied
    case 'training':
      return snapshot.trainingComplete
    default: {
      const _exhaustive: never = prerequisite
      throw new Error(`pre-activation readiness unexpected prerequisite: ${_exhaustive}`)
    }
  }
}

/**
 * Evaluate hard activation readiness for one hazardous system.
 * Unresolved review findings or incomplete training always block when required.
 */
export function evaluatePreActivationSafetyReadiness(
  input: PreActivationReadinessSnapshot,
): PreActivationReadinessState {
  const snapshot = createPreActivationReadinessSnapshot(input)
  const requiredBundle = readinessBundleForKind(snapshot.activationKind)
  const blocking: string[] = []
  const reasons: string[] = []

  for (const prerequisite of requiredBundle) {
    if (flagForPrerequisite(snapshot, prerequisite)) {
      reasons.push(`satisfied:${prerequisite}`)
      continue
    }
    blocking.push(prerequisite)
    reasons.push(`blocked:${prerequisite}`)
  }

  const allowed = blocking.length === 0
  return Object.freeze({
    systemId: snapshot.systemId,
    activationKind: snapshot.activationKind,
    authority: allowed ? 'authorized' : 'blocked',
    activationAllowed: allowed,
    requiredBundle,
    blockingConditions: Object.freeze([...blocking].sort(compareAscii)),
    reasons: Object.freeze([...reasons].sort(compareAscii)),
  })
}
