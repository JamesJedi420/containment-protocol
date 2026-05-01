import type { AgentRole } from './agent/models'
import type { Id } from './models'

export interface SquadOperativeRef {
  id: Id
  role: AgentRole
}

export interface SquadRoleSlot {
  slotId: Id
  role: string
  allowedAgentRoles: readonly AgentRole[]
  operativeId: Id | null
}

export interface SquadRoster {
  id: Id
  name: string
  slots: readonly SquadRoleSlot[]
}

export interface SquadRoleSlotDefinition {
  slotId: Id
  role: string
  allowedAgentRoles: readonly AgentRole[]
}

export interface RosterCompositionEntry {
  slotId: Id
  role: string
  operative: Id | null
}

export type AssignOperativeFailureCode = 'slot_occupied' | 'role_mismatch'

export type AssignOperativeToSlotResult =
  | {
      ok: true
      roster: SquadRoster
    }
  | {
      ok: false
      code: AssignOperativeFailureCode
      roster: SquadRoster
      slotId: Id
    }

function normalizeAllowedRoles(roles: readonly AgentRole[]) {
  return [...new Set(roles)]
}

function cloneSlot(slot: SquadRoleSlot): SquadRoleSlot {
  return {
    slotId: slot.slotId,
    role: slot.role,
    allowedAgentRoles: normalizeAllowedRoles(slot.allowedAgentRoles),
    operativeId: slot.operativeId,
  }
}

export function createSquadRoster(
  id: Id,
  name: string,
  slotDefinitions: readonly SquadRoleSlotDefinition[]
): SquadRoster {
  return {
    id,
    name,
    slots: slotDefinitions.map((slot) => ({
      slotId: slot.slotId,
      role: slot.role,
      allowedAgentRoles: normalizeAllowedRoles(slot.allowedAgentRoles),
      operativeId: null,
    })),
  }
}

export function assignOperativeToSlot(
  roster: SquadRoster,
  slotId: Id,
  operative: SquadOperativeRef
): AssignOperativeToSlotResult {
  const targetSlot = roster.slots.find((slot) => slot.slotId === slotId)
  if (!targetSlot) {
    throw new Error(`Unknown squad roster slot: ${slotId}`)
  }

  if (targetSlot.operativeId !== null) {
    return {
      ok: false,
      code: 'slot_occupied',
      roster,
      slotId,
    }
  }

  if (!targetSlot.allowedAgentRoles.includes(operative.role)) {
    return {
      ok: false,
      code: 'role_mismatch',
      roster,
      slotId,
    }
  }

  return {
    ok: true,
    roster: {
      ...roster,
      slots: roster.slots.map((slot) =>
        slot.slotId === slotId
          ? {
              ...cloneSlot(slot),
              operativeId: operative.id,
            }
          : cloneSlot(slot)
      ),
    },
  }
}

export function removeOperativeFromSlot(roster: SquadRoster, slotId: Id): SquadRoster {
  return {
    ...roster,
    slots: roster.slots.map((slot) =>
      slot.slotId === slotId
        ? {
            ...cloneSlot(slot),
            operativeId: null,
          }
        : cloneSlot(slot)
    ),
  }
}

export function getRosterComposition(roster: SquadRoster): RosterCompositionEntry[] {
  return roster.slots.map((slot) => ({
    slotId: slot.slotId,
    role: slot.role,
    operative: slot.operativeId,
  }))
}