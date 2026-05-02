import type { SquadConfigurationSummary } from './squadConfigurationSummary'

export type SquadCommandAction = 'deploy' | 'reassign_kit' | 'view_configuration'

export type SquadCommandBlockerCode =
  | 'no_metadata'
  | 'no_assigned_kit'
  | 'kit_mismatch'
  | 'vacant_required_slot'
  | 'no_designated_leader'

export interface SquadCommandBlocker {
  readonly code: SquadCommandBlockerCode
  readonly message: string
}

export type SquadCommandGateResult =
  | {
      readonly action: SquadCommandAction
      readonly allowed: true
      readonly blockers: readonly []
    }
  | {
      readonly action: SquadCommandAction
      readonly allowed: false
      readonly blockers: readonly SquadCommandBlocker[]
    }

const BLOCKER_MESSAGES: Readonly<Record<SquadCommandBlockerCode, string>> = {
  no_metadata: 'No squad configuration available.',
  no_assigned_kit: 'No kit assigned.',
  kit_mismatch: 'Assigned kit does not satisfy squad requirements.',
  vacant_required_slot: 'Required squad slot is vacant.',
  no_designated_leader: 'No designated leader.',
}

function hasDesignatedLeader(summary: SquadConfigurationSummary): boolean {
  return summary.metadata.designatedLeaderId.trim().length > 0
}

function hasVacantRequiredSlot(summary: SquadConfigurationSummary): boolean {
  return summary.occupancy.totalSlots === 0 || summary.occupancy.vacantSlots > 0
}

function toBlockers(codes: readonly SquadCommandBlockerCode[]): readonly SquadCommandBlocker[] {
  const uniqueCodes = [...new Set(codes)]
  return uniqueCodes.map((code) => ({ code, message: BLOCKER_MESSAGES[code] }))
}

export function evaluateSquadCommandActionGate(
  action: SquadCommandAction,
  summary: SquadConfigurationSummary | null
): SquadCommandGateResult {
  if (!summary) {
    return {
      action,
      allowed: false,
      blockers: toBlockers(['no_metadata']),
    }
  }

  const blockerCodes: SquadCommandBlockerCode[] = []

  if (action === 'view_configuration') {
    return {
      action,
      allowed: true,
      blockers: [],
    }
  }

  if (action === 'reassign_kit') {
    if (summary.kit.state === 'unassigned') {
      blockerCodes.push('no_assigned_kit')
    }

    if (blockerCodes.length === 0) {
      return {
        action,
        allowed: true,
        blockers: [],
      }
    }

    return {
      action,
      allowed: false,
      blockers: toBlockers(blockerCodes),
    }
  }

  if (summary.kit.state === 'unassigned') {
    blockerCodes.push('no_assigned_kit')
  }

  if (summary.kit.state === 'assigned-mismatch') {
    blockerCodes.push('kit_mismatch')
  }

  if (hasVacantRequiredSlot(summary)) {
    blockerCodes.push('vacant_required_slot')
  }

  if (!hasDesignatedLeader(summary)) {
    blockerCodes.push('no_designated_leader')
  }

  if (blockerCodes.length === 0) {
    return {
      action,
      allowed: true,
      blockers: [],
    }
  }

  return {
    action,
    allowed: false,
    blockers: toBlockers(blockerCodes),
  }
}
