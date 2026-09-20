import {
  resolveVolatileActionPriority,
  type VolatileActionPriorityRequest,
  type VolatileActionPriorityResult,
  type VolatileActionPrioritySequence,
} from './volatileActionPriority'

export const VOLATILE_ACTION_PHASE_VARIANT_ID = 'volatile_action_v1' as const

export type VolatileActionPhaseVariantId = typeof VOLATILE_ACTION_PHASE_VARIANT_ID

export const VOLATILE_ACTION_V1_PHASE_IDS = [
  'posture_commit',
  'environmental_read',
  'clash_window',
  'effect_emission',
  'cleanup',
] as const

export type VolatileActionV1PhaseId = (typeof VOLATILE_ACTION_V1_PHASE_IDS)[number]

export type VolatileActionStakes = 'none' | 'present'

export const VOLATILE_ACTION_REACTION_WINDOW_ID = 'after_posture_commit' as const

const NO_STAKES_SKIPPED_PHASE_IDS = new Set<VolatileActionV1PhaseId>([
  'clash_window',
  'effect_emission',
])

export interface VolatileActionPhaseRecord {
  readonly id: VolatileActionV1PhaseId
  readonly status: 'ran' | 'skipped'
}

export interface VolatileActionReactionWindow {
  readonly id: typeof VOLATILE_ACTION_REACTION_WINDOW_ID
  readonly attachAfterPhaseId: 'posture_commit'
  readonly actorIds: readonly string[]
}

export interface VolatileActionPhasePipelineInput {
  readonly encounterId: string
  readonly variantId: VolatileActionPhaseVariantId
  readonly stakes: VolatileActionStakes
  readonly actionPriority: VolatileActionPriorityRequest & {
    readonly encounterId?: string
  }
}

export interface VolatileActionPhasePipelineResult {
  readonly encounterId: string
  readonly variantId: VolatileActionPhaseVariantId
  readonly actorIds: readonly string[]
  readonly phases: readonly VolatileActionPhaseRecord[]
  readonly reactionWindow: VolatileActionReactionWindow
  readonly bypassed: boolean
  readonly actionPriority: VolatileActionPriorityResult
}

function assertId(value: string, field: string) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty trimmed string.`)
  }
}

function assertStakes(value: string): asserts value is VolatileActionStakes {
  if (value === 'none' || value === 'present') return
  throw new Error('stakes must be none or present.')
}

function eligibleActorIds(sequence: VolatileActionPrioritySequence): readonly string[] {
  switch (sequence.kind) {
    case 'per_actor':
      return [...sequence.actorIds]
    case 'side_phase':
      return sequence.sideGroups.flatMap((group) => group.actorIds)
    default: {
      const exhaustive: never = sequence
      throw new Error(`unsupported sequence kind: ${String(exhaustive)}`)
    }
  }
}

/** Pure SPE-62 slice-1 phase spine. It chooses no action and applies no encounter state. */
export function resolveVolatileActionPhasePipeline(
  input: VolatileActionPhasePipelineInput
): VolatileActionPhasePipelineResult {
  if (!input || typeof input !== 'object') {
    throw new Error('phase pipeline input is required.')
  }

  assertId(input.encounterId, 'encounterId')

  if (input.variantId !== VOLATILE_ACTION_PHASE_VARIANT_ID) {
    throw new Error('variantId must be volatile_action_v1.')
  }

  assertStakes(input.stakes)

  if (!input.actionPriority || typeof input.actionPriority !== 'object') {
    throw new Error('actionPriority is required.')
  }

  if (
    input.actionPriority.encounterId !== undefined &&
    input.actionPriority.encounterId !== input.encounterId
  ) {
    throw new Error('actionPriority encounterId must match the pipeline encounterId.')
  }

  const actionPriority = resolveVolatileActionPriority({
    ...input.actionPriority,
    encounterId: input.encounterId,
  })
  const actorIds = eligibleActorIds(actionPriority.sequence)
  const bypassed = input.stakes === 'none'
  const phases = VOLATILE_ACTION_V1_PHASE_IDS.map((id) => ({
    id,
    status:
      bypassed && NO_STAKES_SKIPPED_PHASE_IDS.has(id) ? ('skipped' as const) : ('ran' as const),
  }))

  return {
    encounterId: input.encounterId,
    variantId: VOLATILE_ACTION_PHASE_VARIANT_ID,
    actorIds,
    phases,
    reactionWindow: {
      id: VOLATILE_ACTION_REACTION_WINDOW_ID,
      attachAfterPhaseId: 'posture_commit',
      actorIds,
    },
    bypassed,
    actionPriority,
  }
}
