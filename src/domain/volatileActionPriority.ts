import type { AgentReadinessBand } from './agent/models'
import type { EquipmentInstanceCondition } from './equipmentInstance'
import type { InjurySeverity } from './sim/recoveryPipeline'

export const VOLATILE_ACTION_PRIORITY_BASE_SCORE = 55

export const VOLATILE_ACTION_PRIORITY_FACTOR_CODES = [
  'readiness',
  'posture',
  'exposure',
  'injury',
  'tool_state',
  'precision',
  'aim_commitment',
  'targeting_mode',
] as const

export type VolatileActionPriorityFactorCode =
  (typeof VOLATILE_ACTION_PRIORITY_FACTOR_CODES)[number]

export type VolatileActionPosture = 'braced' | 'mobile' | 'guarded' | 'compromised'
export type VolatileActionExposure = 'concealed' | 'covered' | 'exposed' | 'pinned'
export type VolatileActionInjury = 'none' | InjurySeverity
export type VolatileActionToolState = EquipmentInstanceCondition | 'not_required' | 'unavailable'
export type VolatileActionAimCommitment = 'none' | 'tracking' | 'committed'
export type VolatileActionTargetingMode = 'rapid_nearest_valid' | 'explicit_designation'

export type VolatileActionPriorityMode =
  | { readonly kind: 'per_actor' }
  | {
      readonly kind: 'side_phase'
      /** Exact external precedence for scene/deck-controlled side initiative. */
      readonly declaredSideOrder?: readonly string[]
    }

export interface VolatileActionPriorityActorInput {
  readonly actorId: string
  readonly sideId: string
  /** Last-resort authored tie-breaker. State-derived score always compares first. */
  readonly fallbackOrder?: number
  readonly readiness: AgentReadinessBand
  readonly posture: VolatileActionPosture
  readonly exposure: VolatileActionExposure
  readonly injury: VolatileActionInjury
  readonly toolState: VolatileActionToolState
  /** Current short-horizon precision meter, as a safe integer from 0 through 100. */
  readonly precision: number
  readonly aimCommitment: VolatileActionAimCommitment
  readonly targetingMode: VolatileActionTargetingMode
}

export interface VolatileActionPriorityInput {
  readonly encounterId: string
  readonly mode: VolatileActionPriorityMode
  readonly actors: readonly VolatileActionPriorityActorInput[]
}

export type VolatileActionPriorityRequest = Omit<VolatileActionPriorityInput, 'encounterId'>

export interface VolatileActionPriorityFactor {
  readonly code: VolatileActionPriorityFactorCode
  readonly label: string
  readonly sourceValue: string | number
  readonly sourceLabel: string
  readonly delta: number
}

export type VolatileActionPriorityBlocker = 'readiness_unavailable' | 'tool_unavailable'

export interface VolatileActorPriority {
  readonly actorId: string
  readonly sideId: string
  readonly eligible: boolean
  readonly blockers: readonly VolatileActionPriorityBlocker[]
  readonly baseScore: number
  readonly priorityScore: number | null
  readonly priorityRank: number | null
  readonly fallbackOrder: number | null
  readonly factors: readonly VolatileActionPriorityFactor[]
  readonly dominantDriverCodes: readonly VolatileActionPriorityFactorCode[]
}

export interface VolatileActionSideGroup {
  readonly sideId: string
  readonly sidePhaseIndex: number
  readonly actorIds: readonly string[]
  readonly leadActorId: string
  readonly leadPriorityScore: number
  readonly dominantDriverCodes: readonly VolatileActionPriorityFactorCode[]
}

export type VolatileActionPrioritySequence =
  | {
      readonly kind: 'per_actor'
      readonly actorIds: readonly string[]
    }
  | {
      readonly kind: 'side_phase'
      readonly precedenceSource: 'state_driven' | 'declared'
      readonly sideGroups: readonly VolatileActionSideGroup[]
    }

export interface VolatileActionPriorityResult {
  readonly encounterId: string
  readonly mode: VolatileActionPriorityMode['kind']
  readonly actorPriorities: readonly VolatileActorPriority[]
  readonly sequence: VolatileActionPrioritySequence
}

export type VolatileActionPriorityMovement =
  'earlier' | 'later' | 'unchanged' | 'entered' | 'blocked' | 'added' | 'removed'

export interface VolatileActionPriorityShift {
  readonly actorId: string
  readonly previousRank: number | null
  readonly currentRank: number | null
  readonly previousScore: number | null
  readonly currentScore: number | null
  readonly scoreDelta: number | null
  readonly movement: VolatileActionPriorityMovement
  readonly changedFactorCodes: readonly VolatileActionPriorityFactorCode[]
}

export interface VolatileActionPriorityRecalculation {
  readonly current: VolatileActionPriorityResult
  readonly shifts: readonly VolatileActionPriorityShift[]
}

const READINESS_DELTAS: Readonly<Record<AgentReadinessBand, number>> = {
  steady: 8,
  strained: 2,
  critical: -8,
  unavailable: 0,
}

const POSTURE_DELTAS: Readonly<Record<VolatileActionPosture, number>> = {
  braced: 6,
  mobile: 3,
  guarded: 0,
  compromised: -8,
}

const EXPOSURE_DELTAS: Readonly<Record<VolatileActionExposure, number>> = {
  concealed: 4,
  covered: 2,
  exposed: -4,
  pinned: -8,
}

const INJURY_DELTAS: Readonly<Record<VolatileActionInjury, number>> = {
  none: 0,
  minor: -4,
  moderate: -10,
}

const TOOL_STATE_DELTAS: Readonly<Record<VolatileActionToolState, number>> = {
  operational: 4,
  damaged: -6,
  not_required: 0,
  unavailable: 0,
}

const AIM_COMMITMENT_DELTAS: Readonly<Record<VolatileActionAimCommitment, number>> = {
  none: 0,
  tracking: 3,
  committed: 6,
}

const TARGETING_MODE_DELTAS: Readonly<Record<VolatileActionTargetingMode, number>> = {
  rapid_nearest_valid: 8,
  explicit_designation: -6,
}

const FACTOR_LABELS: Readonly<Record<VolatileActionPriorityFactorCode, string>> = {
  readiness: 'Readiness',
  posture: 'Posture',
  exposure: 'Exposure',
  injury: 'Injury',
  tool_state: 'Tool state',
  precision: 'Precision',
  aim_commitment: 'Aim commitment',
  targeting_mode: 'Targeting mode',
}

const FACTOR_ORDER = new Map(
  VOLATILE_ACTION_PRIORITY_FACTOR_CODES.map((code, index) => [code, index])
)

const SOURCE_LABELS: Readonly<
  Record<VolatileActionPriorityFactorCode, Readonly<Record<string, string>>>
> = {
  readiness: {
    steady: 'Steady',
    strained: 'Strained',
    critical: 'Critical',
    unavailable: 'Unavailable',
  },
  posture: {
    braced: 'Braced',
    mobile: 'Mobile',
    guarded: 'Guarded',
    compromised: 'Compromised',
  },
  exposure: {
    concealed: 'Concealed',
    covered: 'Covered',
    exposed: 'Exposed',
    pinned: 'Pinned',
  },
  injury: {
    none: 'Uninjured',
    minor: 'Minor injury',
    moderate: 'Moderate injury',
  },
  tool_state: {
    operational: 'Operational',
    damaged: 'Damaged',
    not_required: 'No tool required',
    unavailable: 'Unavailable',
  },
  precision: {
    depleted: 'Depleted',
    low: 'Low',
    stable: 'Stable',
    focused: 'Focused',
    exacting: 'Exacting',
  },
  aim_commitment: {
    none: 'No committed aim',
    tracking: 'Tracking',
    committed: 'Committed',
  },
  targeting_mode: {
    rapid_nearest_valid: 'Rapid nearest-valid',
    explicit_designation: 'Explicit designation',
  },
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function assertId(value: string, field: string) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty trimmed string.`)
  }
}

function assertKnownValue<T extends string>(
  value: string,
  values: Readonly<Record<T, number>>,
  field: string
): asserts value is T {
  if (!Object.prototype.hasOwnProperty.call(values, value)) {
    throw new Error(`${field} has an unsupported value: ${value}.`)
  }
}

function resolvePrecision(precision: number) {
  if (!Number.isSafeInteger(precision) || precision < 0 || precision > 100) {
    throw new Error('precision must be a safe integer from 0 through 100.')
  }

  if (precision < 20) return { band: 'depleted', delta: -6 }
  if (precision < 40) return { band: 'low', delta: -3 }
  if (precision < 60) return { band: 'stable', delta: 0 }
  if (precision < 80) return { band: 'focused', delta: 3 }
  return { band: 'exacting', delta: 6 }
}

function factor(
  code: VolatileActionPriorityFactorCode,
  sourceValue: string | number,
  sourceLabelKey: string,
  delta: number
): VolatileActionPriorityFactor {
  return {
    code,
    label: FACTOR_LABELS[code],
    sourceValue,
    sourceLabel: SOURCE_LABELS[code][sourceLabelKey],
    delta,
  }
}

function validateActor(actor: VolatileActionPriorityActorInput) {
  assertId(actor.actorId, 'actorId')
  assertId(actor.sideId, `sideId for actor ${actor.actorId}`)

  if (
    actor.fallbackOrder !== undefined &&
    (!Number.isSafeInteger(actor.fallbackOrder) || actor.fallbackOrder < 0)
  ) {
    throw new Error(`fallbackOrder for actor ${actor.actorId} must be a non-negative safe integer.`)
  }

  assertKnownValue(actor.readiness, READINESS_DELTAS, `readiness for actor ${actor.actorId}`)
  assertKnownValue(actor.posture, POSTURE_DELTAS, `posture for actor ${actor.actorId}`)
  assertKnownValue(actor.exposure, EXPOSURE_DELTAS, `exposure for actor ${actor.actorId}`)
  assertKnownValue(actor.injury, INJURY_DELTAS, `injury for actor ${actor.actorId}`)
  assertKnownValue(actor.toolState, TOOL_STATE_DELTAS, `toolState for actor ${actor.actorId}`)
  assertKnownValue(
    actor.aimCommitment,
    AIM_COMMITMENT_DELTAS,
    `aimCommitment for actor ${actor.actorId}`
  )
  assertKnownValue(
    actor.targetingMode,
    TARGETING_MODE_DELTAS,
    `targetingMode for actor ${actor.actorId}`
  )
  resolvePrecision(actor.precision)
}

function evaluateActor(actor: VolatileActionPriorityActorInput): VolatileActorPriority {
  validateActor(actor)
  const precision = resolvePrecision(actor.precision)
  const factors = [
    factor('readiness', actor.readiness, actor.readiness, READINESS_DELTAS[actor.readiness]),
    factor('posture', actor.posture, actor.posture, POSTURE_DELTAS[actor.posture]),
    factor('exposure', actor.exposure, actor.exposure, EXPOSURE_DELTAS[actor.exposure]),
    factor('injury', actor.injury, actor.injury, INJURY_DELTAS[actor.injury]),
    factor('tool_state', actor.toolState, actor.toolState, TOOL_STATE_DELTAS[actor.toolState]),
    factor('precision', actor.precision, precision.band, precision.delta),
    factor(
      'aim_commitment',
      actor.aimCommitment,
      actor.aimCommitment,
      AIM_COMMITMENT_DELTAS[actor.aimCommitment]
    ),
    factor(
      'targeting_mode',
      actor.targetingMode,
      actor.targetingMode,
      TARGETING_MODE_DELTAS[actor.targetingMode]
    ),
  ] satisfies VolatileActionPriorityFactor[]
  const blockers: VolatileActionPriorityBlocker[] = []

  if (actor.readiness === 'unavailable') blockers.push('readiness_unavailable')
  if (actor.toolState === 'unavailable') blockers.push('tool_unavailable')

  const eligible = blockers.length === 0
  const priorityScore = eligible
    ? VOLATILE_ACTION_PRIORITY_BASE_SCORE + factors.reduce((total, entry) => total + entry.delta, 0)
    : null
  const dominantDriverCodes = factors
    .filter((entry) => entry.delta !== 0)
    .sort(
      (left, right) =>
        Math.abs(right.delta) - Math.abs(left.delta) ||
        (FACTOR_ORDER.get(left.code) ?? 0) - (FACTOR_ORDER.get(right.code) ?? 0)
    )
    .slice(0, 3)
    .map((entry) => entry.code)

  return {
    actorId: actor.actorId,
    sideId: actor.sideId,
    eligible,
    blockers,
    baseScore: VOLATILE_ACTION_PRIORITY_BASE_SCORE,
    priorityScore,
    priorityRank: null,
    fallbackOrder: actor.fallbackOrder ?? null,
    factors,
    dominantDriverCodes,
  }
}

function compareActorPriorities(left: VolatileActorPriority, right: VolatileActorPriority) {
  if (left.eligible !== right.eligible) return left.eligible ? -1 : 1

  if (left.priorityScore !== right.priorityScore) {
    return (
      (right.priorityScore ?? Number.NEGATIVE_INFINITY) -
      (left.priorityScore ?? Number.NEGATIVE_INFINITY)
    )
  }

  const leftFallback = left.fallbackOrder ?? Number.MAX_SAFE_INTEGER
  const rightFallback = right.fallbackOrder ?? Number.MAX_SAFE_INTEGER
  if (leftFallback !== rightFallback) return leftFallback - rightFallback

  return compareCodeUnits(left.actorId, right.actorId)
}

function rankActors(actors: readonly VolatileActionPriorityActorInput[]) {
  const actorIds = new Set<string>()
  const evaluated = actors.map((actor) => {
    if (actorIds.has(actor.actorId)) {
      throw new Error(`actorId must be unique: ${actor.actorId}.`)
    }
    actorIds.add(actor.actorId)
    return evaluateActor(actor)
  })
  const ordered = [...evaluated].sort(compareActorPriorities)
  let nextRank = 1

  return ordered.map((actor) => (actor.eligible ? { ...actor, priorityRank: nextRank++ } : actor))
}

function validateDeclaredSideOrder(
  declaredSideOrder: readonly string[],
  participatingSideIds: readonly string[]
) {
  const declared = new Set<string>()
  for (const sideId of declaredSideOrder) {
    assertId(sideId, 'declared side ID')
    if (declared.has(sideId)) throw new Error(`declaredSideOrder repeats sideId: ${sideId}.`)
    declared.add(sideId)
  }

  if (
    declared.size !== participatingSideIds.length ||
    participatingSideIds.some((sideId) => !declared.has(sideId))
  ) {
    throw new Error('declaredSideOrder must contain every participating side exactly once.')
  }
}

function buildSidePhaseSequence(
  priorities: readonly VolatileActorPriority[],
  mode: Extract<VolatileActionPriorityMode, { kind: 'side_phase' }>
): VolatileActionPrioritySequence {
  const participatingSideIds = [...new Set(priorities.map((priority) => priority.sideId))].sort(
    compareCodeUnits
  )
  const declaredSideOrder = mode.declaredSideOrder

  if (declaredSideOrder) validateDeclaredSideOrder(declaredSideOrder, participatingSideIds)

  const eligibleBySide = new Map<string, VolatileActorPriority[]>()
  for (const priority of priorities) {
    if (!priority.eligible) continue
    const side = eligibleBySide.get(priority.sideId) ?? []
    side.push(priority)
    eligibleBySide.set(priority.sideId, side)
  }

  const sides = [...eligibleBySide.entries()].map(([sideId, actors]) => ({
    sideId,
    actors,
    lead: actors[0],
  }))

  if (declaredSideOrder) {
    const declaredIndex = new Map(declaredSideOrder.map((sideId, index) => [sideId, index]))
    sides.sort(
      (left, right) =>
        (declaredIndex.get(left.sideId) ?? Number.MAX_SAFE_INTEGER) -
        (declaredIndex.get(right.sideId) ?? Number.MAX_SAFE_INTEGER)
    )
  } else {
    sides.sort(
      (left, right) =>
        compareActorPriorities(left.lead, right.lead) || compareCodeUnits(left.sideId, right.sideId)
    )
  }

  return {
    kind: 'side_phase',
    precedenceSource: declaredSideOrder ? 'declared' : 'state_driven',
    sideGroups: sides.map(({ sideId, actors, lead }, index) => ({
      sideId,
      sidePhaseIndex: index + 1,
      actorIds: actors.map((actor) => actor.actorId),
      leadActorId: lead.actorId,
      leadPriorityScore: lead.priorityScore as number,
      dominantDriverCodes: [...lead.dominantDriverCodes],
    })),
  }
}

/** Pure SPE-54 sequencing calculation. It chooses no action and applies no encounter state. */
export function resolveVolatileActionPriority(
  input: VolatileActionPriorityInput
): VolatileActionPriorityResult {
  assertId(input.encounterId, 'encounterId')
  if (!input.mode || (input.mode.kind !== 'per_actor' && input.mode.kind !== 'side_phase')) {
    throw new Error('mode must be per_actor or side_phase.')
  }
  if (!Array.isArray(input.actors)) throw new Error('actors must be an array.')

  const actorPriorities = rankActors(input.actors)
  const sequence =
    input.mode.kind === 'per_actor'
      ? {
          kind: 'per_actor' as const,
          actorIds: actorPriorities
            .filter((priority) => priority.eligible)
            .map((priority) => priority.actorId),
        }
      : buildSidePhaseSequence(actorPriorities, input.mode)

  return {
    encounterId: input.encounterId,
    mode: input.mode.kind,
    actorPriorities,
    sequence,
  }
}

function changedFactorCodes(
  previous: VolatileActorPriority,
  current: VolatileActorPriority
): VolatileActionPriorityFactorCode[] {
  const previousByCode = new Map(previous.factors.map((entry) => [entry.code, entry]))
  return current.factors
    .filter((entry) => {
      const prior = previousByCode.get(entry.code)
      return !prior || prior.sourceValue !== entry.sourceValue || prior.delta !== entry.delta
    })
    .map((entry) => entry.code)
}

function movementFor(
  previous: VolatileActorPriority | undefined,
  current: VolatileActorPriority | undefined
): VolatileActionPriorityMovement {
  if (!previous) return 'added'
  if (!current) return 'removed'
  if (previous.priorityRank === null && current.priorityRank !== null) return 'entered'
  if (previous.priorityRank !== null && current.priorityRank === null) return 'blocked'
  if (previous.priorityRank === null || current.priorityRank === null) return 'unchanged'
  if (current.priorityRank < previous.priorityRank) return 'earlier'
  if (current.priorityRank > previous.priorityRank) return 'later'
  return 'unchanged'
}

/** Freshly resolve a replacement snapshot and report only material actor priority changes. */
export function recalculateVolatileActionPriority(
  previous: VolatileActionPriorityResult,
  input: VolatileActionPriorityInput
): VolatileActionPriorityRecalculation {
  const current = resolveVolatileActionPriority(input)

  if (previous.encounterId !== current.encounterId) {
    throw new Error('recalculation requires the same encounterId.')
  }
  if (previous.mode !== current.mode) {
    throw new Error('recalculation requires the same priority mode.')
  }

  const previousById = new Map(previous.actorPriorities.map((actor) => [actor.actorId, actor]))
  const currentById = new Map(current.actorPriorities.map((actor) => [actor.actorId, actor]))
  const actorIds = [...new Set([...previousById.keys(), ...currentById.keys()])].sort(
    compareCodeUnits
  )
  const shifts: VolatileActionPriorityShift[] = []

  for (const actorId of actorIds) {
    const prior = previousById.get(actorId)
    const next = currentById.get(actorId)
    const factorChanges = prior && next ? changedFactorCodes(prior, next) : []
    const blockersChanged =
      prior && next
        ? prior.blockers.join('|') !== next.blockers.join('|')
        : Boolean(prior) !== Boolean(next)
    const ranksChanged = prior?.priorityRank !== next?.priorityRank
    const scoresChanged = prior?.priorityScore !== next?.priorityScore

    if (
      !prior ||
      !next ||
      factorChanges.length > 0 ||
      blockersChanged ||
      ranksChanged ||
      scoresChanged
    ) {
      shifts.push({
        actorId,
        previousRank: prior?.priorityRank ?? null,
        currentRank: next?.priorityRank ?? null,
        previousScore: prior?.priorityScore ?? null,
        currentScore: next?.priorityScore ?? null,
        scoreDelta:
          typeof prior?.priorityScore === 'number' && typeof next?.priorityScore === 'number'
            ? next.priorityScore - prior.priorityScore
            : null,
        movement: movementFor(prior, next),
        changedFactorCodes: factorChanges,
      })
    }
  }

  return { current, shifts }
}
