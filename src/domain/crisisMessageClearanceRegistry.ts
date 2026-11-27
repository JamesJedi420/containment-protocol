/**
 * SPE-855 slice 1: pure crisis message clearance and shared release authority registry.
 *
 * Deterministic clearance routing, serial vs simultaneous review modes, and ownership
 * conflict effects on release timing. No GameState, no UI, no payload semantics.
 */

export type ClearanceGateRole =
  | 'communications'
  | 'policy'
  | 'subject_matter'
  | 'legal'
  | 'higher_authority'

export type ClearanceMode = 'serial' | 'simultaneous'

export type OwnershipAgreementState =
  | 'agreed'
  | 'contested'
  | 'failed'
  | 'renegotiating'

export interface ClearanceGate {
  role: ClearanceGateRole
  required: boolean
  baseDelayWeeks: number
}

export interface CrisisMessageClearanceRequest {
  messageId: string
  requiredGates: readonly ClearanceGate[]
  mode: ClearanceMode
  ownershipState: OwnershipAgreementState
  priority: 'need_to_know' | 'want_to_know'
}

export interface ClearanceOutcome {
  messageId: string
  cleared: boolean
  totalDelayWeeks: number
  activeReviewers: readonly ClearanceGateRole[]
  reasonCodes: readonly string[]
}

const OWNERSHIP_DELAY_MODIFIER: Readonly<Record<OwnershipAgreementState, number>> = {
  agreed: 0,
  contested: 1,
  renegotiating: 2,
  failed: 3,
}

function uniqueSortedRoles(roles: readonly ClearanceGateRole[]) {
  return [...new Set(roles)].sort((a, b) => a.localeCompare(b))
}

export function evaluateClearance(
  request: CrisisMessageClearanceRequest
): ClearanceOutcome {
  const required = request.requiredGates.filter((g) => g.required)
  const activeReviewers = uniqueSortedRoles(required.map((g) => g.role))

  if (required.length === 0) {
    return {
      messageId: request.messageId,
      cleared: true,
      totalDelayWeeks: 0,
      activeReviewers: [],
      reasonCodes: ['no_gates_required'],
    }
  }

  const baseDelays = required.map((g) => g.baseDelayWeeks)
  const modeDelay =
    request.mode === 'simultaneous'
      ? Math.max(...baseDelays)
      : baseDelays.reduce((sum, d) => sum + d, 0)

  const ownershipModifier = OWNERSHIP_DELAY_MODIFIER[request.ownershipState]
  const priorityModifier = request.priority === 'need_to_know' ? 0 : 1

  const totalDelayWeeks = modeDelay + ownershipModifier + priorityModifier

  const reasonCodes = [
    request.mode === 'simultaneous' ? 'simultaneous_max_delay' : 'serial_sum_delay',
    `ownership_${request.ownershipState}`,
    request.priority,
  ]

  return {
    messageId: request.messageId,
    cleared: true,
    totalDelayWeeks,
    activeReviewers,
    reasonCodes,
  }
}

export function requiresMultipleRoles(request: CrisisMessageClearanceRequest): boolean {
  const roles = new Set(request.requiredGates.filter((g) => g.required).map((g) => g.role))
  return roles.size > 1
}
