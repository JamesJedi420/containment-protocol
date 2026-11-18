/**
 * SPE-2201 — constructed entity purpose-drift registry (pure, caller-owned).
 *
 * Records intended purpose, observable drift state, uncertain creator attribution,
 * and failure mode without creating a lifecycle, autonomy, or behavior-control engine.
 */

import { assertNonEmptyId } from './assertBoundedInteger'

export const CONSTRUCTED_ENTITY_PURPOSE_DRIFT_OWNER = 'SPE-2201' as const

export type PurposeDriftState = 'stable' | 'drifting' | 'diverged' | 'failed'

export type FailureMode = 'none' | 'partial' | 'complete' | 'catastrophic'

export interface ConstructedEntityPurposeDriftRecord {
  readonly entityId: string
  readonly intendedPurpose: string
  readonly currentBehaviorSummary: string
  readonly driftState: PurposeDriftState
  readonly creatorKnown: boolean
  readonly creatorId?: string
  readonly failureMode: FailureMode
  readonly owner: typeof CONSTRUCTED_ENTITY_PURPOSE_DRIFT_OWNER
}

const VALID_DRIFT_STATES = new Set<PurposeDriftState>(['stable', 'drifting', 'diverged', 'failed'])
const VALID_FAILURE_MODES = new Set<FailureMode>(['none', 'partial', 'complete', 'catastrophic'])

function assertDriftState(value: unknown): PurposeDriftState {
  if (typeof value !== 'string' || !VALID_DRIFT_STATES.has(value as PurposeDriftState)) {
    throw new Error('driftState must be one of stable|drifting|diverged|failed')
  }
  return value as PurposeDriftState
}

function assertFailureMode(value: unknown): FailureMode {
  if (typeof value !== 'string' || !VALID_FAILURE_MODES.has(value as FailureMode)) {
    throw new Error('failureMode must be one of none|partial|complete|catastrophic')
  }
  return value as FailureMode
}

/** Create or normalize a purpose-drift record. Does not mutate callers or invent control logic. */
export function normalizeConstructedEntityPurposeDrift(
  input: Partial<ConstructedEntityPurposeDriftRecord> & { entityId: string }
): ConstructedEntityPurposeDriftRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('purpose-drift input is required')
  }
  const entityId = assertNonEmptyId(input.entityId, 'entityId')
  const intendedPurpose = assertNonEmptyId(input.intendedPurpose, 'intendedPurpose')
  const currentBehaviorSummary = assertNonEmptyId(
    input.currentBehaviorSummary,
    'currentBehaviorSummary'
  )
  const driftState = assertDriftState(input.driftState)
  const failureMode = assertFailureMode(input.failureMode)
  if (typeof input.creatorKnown !== 'boolean') {
    throw new Error('creatorKnown must be a boolean')
  }
  const creatorKnown = input.creatorKnown
  let creatorId: string | undefined
  if (creatorKnown) {
    creatorId = assertNonEmptyId(input.creatorId, 'creatorId')
  } else if (input.creatorId !== undefined && input.creatorId !== null && input.creatorId !== '') {
    throw new Error('creatorId must be omitted when creatorKnown is false')
  }

  return Object.freeze({
    entityId,
    intendedPurpose,
    currentBehaviorSummary,
    driftState,
    creatorKnown,
    ...(creatorKnown && creatorId !== undefined ? { creatorId } : {}),
    failureMode,
    owner: CONSTRUCTED_ENTITY_PURPOSE_DRIFT_OWNER,
  })
}
