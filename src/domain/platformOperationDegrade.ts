/**
 * SPE-2569 / SPE-947 AC row 4: pure platform-operation degrade evaluator.
 * Platform uptime + available vs required reach → ok | degraded | failed.
 * No GameState persistence, weekly mutation, store, or UI coupling.
 */

export const PLATFORM_UPTIME_STATES = [
  'online',
  'degraded',
  'outage',
  'crashed',
  'deleted',
] as const

export type PlatformUptimeState = (typeof PLATFORM_UPTIME_STATES)[number]

export const PLATFORM_OPERATION_OUTCOMES = ['ok', 'degraded', 'failed'] as const

export type PlatformOperationOutcome = (typeof PLATFORM_OPERATION_OUTCOMES)[number]

export interface PlatformOperationNode {
  readonly id: string
  readonly label: string
  readonly uptimeState: PlatformUptimeState
  /** Finite reach available for the operation. Optional; missing treated as 0 when compared. */
  readonly availableReach?: number
}

export interface PlatformOperationRequest {
  readonly id: string
  readonly label: string
  /** Finite reach required for full success. Must be > 0 when valid. */
  readonly requiredReach: number
}

export interface PlatformOperationEvaluationInput {
  readonly platform?: PlatformOperationNode | null
  readonly operation?: PlatformOperationRequest | null
}

export interface PlatformOperationDecision {
  readonly platformId: string
  readonly platformLabel: string
  readonly uptimeState: PlatformUptimeState | 'unknown'
  readonly availableReach: number
  readonly operationId: string
  readonly operationLabel: string
  readonly requiredReach: number
  readonly outcome: PlatformOperationOutcome
  readonly reasonCodes: readonly string[]
}

type PlatformLike = Partial<PlatformOperationNode> & Record<string, unknown>
type OperationLike = Partial<PlatformOperationRequest> & Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort(
      (left, right) => left.localeCompare(right)
    )
  )
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function normalizeId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function normalizeLabel(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function isPlatformUptimeState(value: unknown): value is PlatformUptimeState {
  return typeof value === 'string' && (PLATFORM_UPTIME_STATES as readonly string[]).includes(value)
}

function freezeDecision(decision: PlatformOperationDecision): PlatformOperationDecision {
  return Object.freeze({
    ...decision,
    reasonCodes: uniqueSorted(decision.reasonCodes),
  })
}

/**
 * Evaluates whether a platform-backed operation succeeds, degrades, or fails.
 *
 * Uptime priority (first match):
 *   deleted → failed
 *   outage | crashed → failed
 *   degraded → degraded
 *
 * When uptime is online (or after degraded already set), insufficient
 * availableReach vs requiredReach yields degraded. Online + sufficient reach → ok.
 */
export function evaluatePlatformOperationDegrade(
  input: PlatformOperationEvaluationInput | null | undefined
): PlatformOperationDecision {
  const reasonCodes: string[] = []

  if (input === null || input === undefined) {
    reasonCodes.push('missing_evaluation_input')
    return freezeDecision({
      platformId: 'platform:unknown',
      platformLabel: 'Unknown Platform',
      uptimeState: 'unknown',
      availableReach: 0,
      operationId: 'operation:unknown',
      operationLabel: 'Unknown Operation',
      requiredReach: 0,
      outcome: 'failed',
      reasonCodes,
    })
  }

  const platform = input.platform
  const operation = input.operation

  let platformId = 'platform:unknown'
  let platformLabel = 'Unknown Platform'
  let uptimeState: PlatformUptimeState | 'unknown' = 'unknown'
  let availableReach = 0
  let platformUsable = false

  if (platform === null || platform === undefined) {
    reasonCodes.push('missing_platform')
  } else if (!isRecord(platform)) {
    reasonCodes.push('invalid_platform')
  } else {
    const platformRecord = platform as PlatformLike
    platformId = normalizeId(platformRecord.id, 'platform:unknown')
    platformLabel = normalizeLabel(platformRecord.label, platformId)

    if (!isPlatformUptimeState(platformRecord.uptimeState)) {
      reasonCodes.push('missing_or_invalid_uptime_state')
      uptimeState = 'unknown'
    } else {
      uptimeState = platformRecord.uptimeState
      platformUsable = true
    }

    if (platformRecord.availableReach === undefined || platformRecord.availableReach === null) {
      reasonCodes.push('missing_available_reach')
      availableReach = 0
    } else if (!isNonNegativeFinite(platformRecord.availableReach)) {
      reasonCodes.push('invalid_available_reach')
      availableReach = 0
    } else {
      availableReach = platformRecord.availableReach
    }
  }

  let operationId = 'operation:unknown'
  let operationLabel = 'Unknown Operation'
  let requiredReach = 0
  let hasValidRequiredReach = false

  if (operation === null || operation === undefined) {
    reasonCodes.push('missing_operation')
  } else if (!isRecord(operation)) {
    reasonCodes.push('invalid_operation')
  } else {
    const operationRecord = operation as OperationLike
    operationId = normalizeId(operationRecord.id, 'operation:unknown')
    operationLabel = normalizeLabel(operationRecord.label, operationId)

    if (!isPositiveFinite(operationRecord.requiredReach)) {
      reasonCodes.push('missing_or_invalid_required_reach')
      requiredReach = 0
    } else {
      requiredReach = operationRecord.requiredReach
      hasValidRequiredReach = true
    }
  }

  let outcome: PlatformOperationOutcome

  if (!platformUsable) {
    reasonCodes.push('platform_operation_failed')
    outcome = 'failed'
  } else if (uptimeState === 'deleted') {
    reasonCodes.push('platform_deleted')
    outcome = 'failed'
  } else if (uptimeState === 'outage') {
    reasonCodes.push('platform_outage')
    outcome = 'failed'
  } else if (uptimeState === 'crashed') {
    reasonCodes.push('platform_crashed')
    outcome = 'failed'
  } else if (uptimeState === 'degraded') {
    reasonCodes.push('platform_degraded')
    outcome = 'degraded'
    if (hasValidRequiredReach && availableReach < requiredReach) {
      reasonCodes.push('insufficient_reach')
    }
  } else if (!hasValidRequiredReach) {
    // online
    reasonCodes.push('platform_operation_degraded')
    outcome = 'degraded'
  } else if (availableReach < requiredReach) {
    reasonCodes.push('insufficient_reach')
    outcome = 'degraded'
  } else {
    reasonCodes.push('platform_operation_ok')
    outcome = 'ok'
  }

  return freezeDecision({
    platformId,
    platformLabel,
    uptimeState,
    availableReach,
    operationId,
    operationLabel,
    requiredReach,
    outcome,
    reasonCodes,
  })
}

/** Compact fixture for tests and planning mirrors later. */
export const EXAMPLE_RUMOR_FORUM_OPERATION_PLATFORM: PlatformOperationNode = Object.freeze({
  id: 'platform:rumor-forum',
  label: 'Local rumor forum',
  uptimeState: 'online',
  availableReach: 40,
})

export const EXAMPLE_COUNTER_MEMETIC_BLAST: PlatformOperationRequest = Object.freeze({
  id: 'operation:counter-memetic-blast',
  label: 'Counter-memetic blast',
  requiredReach: 25,
})
