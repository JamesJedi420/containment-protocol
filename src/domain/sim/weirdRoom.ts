/**
 * SPE-815: Weird-room instantiation — pure function for building a runtime
 * WeirdRoomPacket from an authored WeirdRoomProfile.
 *
 * All functions are pure and deterministic; no side effects.
 */

import type { WeirdRoomPacket, WeirdRoomProfile } from '../models'

/**
 * Applies a dwell tick to a WeirdRoomPacket.
 * Increments `dwellCount` by 1 and evaluates any `dwell` escalation triggers.
 * If a trigger fires, transitions the room's kind and merges its addedOverrides
 * into the existing overrides. Returns a new packet; never mutates the input.
 */
export function applyDwell(packet: WeirdRoomPacket): WeirdRoomPacket {
  const updatedDwell = packet.dwellCount + 1
  let updated: WeirdRoomPacket = { ...packet, dwellCount: updatedDwell }

  for (const trigger of updated.escalationTriggers) {
    if (trigger.activator === 'dwell' && updatedDwell >= trigger.threshold) {
      updated = {
        ...updated,
        kind: trigger.resultKind,
        overrides: [...updated.overrides, ...trigger.addedOverrides],
      }
    }
  }

  return updated
}

/**
 * Instantiates a WeirdRoomProfile into a runtime WeirdRoomPacket.
 * The `seedKey` is used to derive a stable id for the packet; it should be
 * unique within the parent CaseInstance (e.g., `${caseId}:${profile.id}`).
 * All counters start at zero; the room begins in its authored initial state.
 */
export function buildWeirdRoomPacket(
  profile: WeirdRoomProfile,
  seedKey: string
): WeirdRoomPacket {
  return {
    id: seedKey,
    kind: profile.kind,
    overrides: [...profile.overrides],
    escalationTriggers: [...profile.escalationTriggers],
    hiddenFromSurface: profile.hiddenFromSurface,
    dwellCount: 0,
    disturbanceCount: 0,
    stagedInteractionCount: 0,
  }
}
