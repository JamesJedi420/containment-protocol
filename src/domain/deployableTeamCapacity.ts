/**
 * SPE-3497 / SPE-3045 slice 1 — organization-wide deployable-team capacity
 * progression resolver (pure, caller-owned).
 *
 * Formula (immutable for this slice):
 *   TIER1_CAPACITY = 4
 *   TERMINAL_PROGRESSION_STEP = 12
 *   ceiling = maxDeployableTeams ∈ [6, 30]
 *   step = clamp(progressionStep, 0, TERMINAL_PROGRESSION_STEP)
 *   capacity = TIER1_CAPACITY + floor((ceiling - TIER1_CAPACITY) * step / TERMINAL_PROGRESSION_STEP)
 *
 * Contraction / grandfathering / GameState stay on SPE-3045.
 */

export const DEPLOYABLE_TEAM_CAPACITY_OWNER = 'SPE-3497' as const
export const DEPLOYABLE_TEAM_CAPACITY_FORMULA_ID = 'spe-3045.progression.v1' as const

export const TIER1_DEPLOYABLE_TEAM_CAPACITY = 4 as const
export const TERMINAL_PROGRESSION_STEP = 12 as const
export const MIN_MAX_DEPLOYABLE_TEAMS = 6 as const
export const MAX_MAX_DEPLOYABLE_TEAMS = 30 as const
export const DEFAULT_MAX_DEPLOYABLE_TEAMS = 16 as const

/** Organization-wide cap exhaustion — never overload per-team `capacity-locked`. */
export const ORGANIZATION_CAPACITY_EXHAUSTED = 'organization-capacity-exhausted' as const

export type OrganizationCapacityBlockReason = typeof ORGANIZATION_CAPACITY_EXHAUSTED

export interface DeployableTeamCapacityInput {
  readonly maxDeployableTeams: number
  readonly progressionStep: number
}

export interface DeployableTeamCapacityProvenance {
  readonly formulaId: typeof DEPLOYABLE_TEAM_CAPACITY_FORMULA_ID
  readonly owner: typeof DEPLOYABLE_TEAM_CAPACITY_OWNER
  readonly ceiling: number
  readonly progressionStep: number
  readonly clampedStep: number
  readonly capacity: number
}

export interface DeployableTeamCapacityResolution {
  readonly capacity: number
  readonly provenance: DeployableTeamCapacityProvenance
}

export interface OrganizationCapacityAssessment {
  readonly allowed: boolean
  readonly reason: OrganizationCapacityBlockReason | null
  /** Present for explanation only; never equals `capacity-locked`. */
  readonly blockKind: 'organization' | null
  readonly capacity: number
  readonly currentUsage: number
  readonly requestedAdditional: number
  readonly projectedUsage: number
  readonly provenance: DeployableTeamCapacityProvenance
}

function assertSafeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer`)
  }
  return value
}

export function validateMaxDeployableTeams(maxDeployableTeams: number): number {
  const ceiling = assertSafeInteger(maxDeployableTeams, 'maxDeployableTeams')
  if (ceiling < MIN_MAX_DEPLOYABLE_TEAMS || ceiling > MAX_MAX_DEPLOYABLE_TEAMS) {
    throw new Error(
      `maxDeployableTeams must be an integer ${MIN_MAX_DEPLOYABLE_TEAMS}–${MAX_MAX_DEPLOYABLE_TEAMS}`
    )
  }
  return ceiling
}

/**
 * Resolve usable organization-wide deployable-team capacity from the configured
 * ceiling and caller-owned progression step.
 */
export function resolveDeployableTeamCapacity(
  input: DeployableTeamCapacityInput
): DeployableTeamCapacityResolution {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('deployable team capacity input is required')
  }
  const ceiling = validateMaxDeployableTeams(input.maxDeployableTeams)
  const progressionStep = assertSafeInteger(input.progressionStep, 'progressionStep')
  const clampedStep = Math.min(TERMINAL_PROGRESSION_STEP, Math.max(0, progressionStep))
  const capacity =
    TIER1_DEPLOYABLE_TEAM_CAPACITY +
    Math.floor(
      ((ceiling - TIER1_DEPLOYABLE_TEAM_CAPACITY) * clampedStep) / TERMINAL_PROGRESSION_STEP
    )
  const provenance: DeployableTeamCapacityProvenance = Object.freeze({
    formulaId: DEPLOYABLE_TEAM_CAPACITY_FORMULA_ID,
    owner: DEPLOYABLE_TEAM_CAPACITY_OWNER,
    ceiling,
    progressionStep,
    clampedStep,
    capacity,
  })
  return Object.freeze({ capacity, provenance })
}

/**
 * Assess whether adding `requestedAdditional` allocations would exceed the
 * resolved organization-wide capacity. Distinct from per-team `capacity-locked`.
 */
export function assessOrganizationDeployableCapacity(args: {
  readonly maxDeployableTeams: number
  readonly progressionStep: number
  readonly currentUsage: number
  readonly requestedAdditional: number
}): OrganizationCapacityAssessment {
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    throw new Error('organization capacity assessment input is required')
  }
  const currentUsage = assertSafeInteger(args.currentUsage, 'currentUsage')
  const requestedAdditional = assertSafeInteger(args.requestedAdditional, 'requestedAdditional')
  if (currentUsage < 0) throw new Error('currentUsage must be nonnegative')
  if (requestedAdditional < 0) throw new Error('requestedAdditional must be nonnegative')

  const { capacity, provenance } = resolveDeployableTeamCapacity({
    maxDeployableTeams: args.maxDeployableTeams,
    progressionStep: args.progressionStep,
  })
  const projectedUsage = currentUsage + requestedAdditional
  const allowed = projectedUsage <= capacity
  return Object.freeze({
    allowed,
    reason: allowed ? null : ORGANIZATION_CAPACITY_EXHAUSTED,
    blockKind: allowed ? null : 'organization',
    capacity,
    currentUsage,
    requestedAdditional,
    projectedUsage,
    provenance,
  })
}
