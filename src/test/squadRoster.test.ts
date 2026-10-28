import { describe, expect, it } from 'vitest'
import {
  assignOperativeToSlot,
  createSquadRoster,
  getRosterComposition,
  removeOperativeFromSlot,
} from '../domain/squadRoster'

function createRosterFixture() {
  return createSquadRoster('squad-nightwatch', 'Nightwatch', [
    {
      slotId: 'slot-leader',
      role: 'leader',
      allowedAgentRoles: ['hunter', 'investigator'],
    },
    {
      slotId: 'slot-field-1',
      role: 'field_operative',
      allowedAgentRoles: ['hunter', 'field_recon'],
    },
    {
      slotId: 'slot-support',
      role: 'support',
      allowedAgentRoles: ['medic', 'negotiator'],
    },
  ])
}

describe('squadRoster', () => {
  it('assigns an operative when the slot is vacant and role requirements are met', () => {
    const roster = createRosterFixture()

    const result = assignOperativeToSlot(roster, 'slot-field-1', {
      id: 'a_ava',
      role: 'hunter',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(getRosterComposition(result.roster)).toEqual([
      { slotId: 'slot-leader', role: 'leader', operative: null },
      { slotId: 'slot-field-1', role: 'field_operative', operative: 'a_ava' },
      { slotId: 'slot-support', role: 'support', operative: null },
    ])
  })

  it('returns slot_occupied when attempting to assign to a filled slot', () => {
    const roster = createRosterFixture()
    const first = assignOperativeToSlot(roster, 'slot-field-1', {
      id: 'a_ava',
      role: 'hunter',
    })

    expect(first.ok).toBe(true)
    if (!first.ok) {
      return
    }

    const second = assignOperativeToSlot(first.roster, 'slot-field-1', {
      id: 'a_rook',
      role: 'field_recon',
    })

    expect(second).toMatchObject({
      ok: false,
      code: 'slot_occupied',
      slotId: 'slot-field-1',
    })
  })

  it('returns role_mismatch when operative role does not satisfy slot requirements', () => {
    const roster = createRosterFixture()

    const result = assignOperativeToSlot(roster, 'slot-support', {
      id: 'a_ava',
      role: 'hunter',
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'role_mismatch',
      slotId: 'slot-support',
    })
  })

  it('vacates a slot deterministically when removing an operative', () => {
    const roster = createRosterFixture()
    const assigned = assignOperativeToSlot(roster, 'slot-support', {
      id: 'a_casey',
      role: 'medic',
    })

    expect(assigned.ok).toBe(true)
    if (!assigned.ok) {
      return
    }

    const vacated = removeOperativeFromSlot(assigned.roster, 'slot-support')

    expect(getRosterComposition(vacated)).toEqual([
      { slotId: 'slot-leader', role: 'leader', operative: null },
      { slotId: 'slot-field-1', role: 'field_operative', operative: null },
      { slotId: 'slot-support', role: 'support', operative: null },
    ])
  })

  it('returns ordered composition readback in stable slot order', () => {
    const roster = createRosterFixture()
    const withLeader = assignOperativeToSlot(roster, 'slot-leader', {
      id: 'a_mina',
      role: 'investigator',
    })

    expect(withLeader.ok).toBe(true)
    if (!withLeader.ok) {
      return
    }

    const withSupport = assignOperativeToSlot(withLeader.roster, 'slot-support', {
      id: 'a_casey',
      role: 'medic',
    })

    expect(withSupport.ok).toBe(true)
    if (!withSupport.ok) {
      return
    }

    expect(getRosterComposition(withSupport.roster)).toEqual([
      { slotId: 'slot-leader', role: 'leader', operative: 'a_mina' },
      { slotId: 'slot-field-1', role: 'field_operative', operative: null },
      { slotId: 'slot-support', role: 'support', operative: 'a_casey' },
    ])
  })
})