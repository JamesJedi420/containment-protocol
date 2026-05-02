import { describe, it, expect } from 'vitest'
import { createSquadMetadata } from '../domain/squadMetadata'
import {
  assignSquadRoom,
  reassignSquadRoom,
  clearSquadRoom,
  deriveReadinessSurface,
  type SquadRoomType,
} from '../domain/squadRoomAssignment'

// ── fixture ───────────────────────────────────────────────────────────────────

function makeSquad() {
  const result = createSquadMetadata({
    squadId: 'squad-beta',
    name: 'Beta Squad',
    role: 'containment',
    doctrine: 'secure_and_hold',
    shift: 'day',
    assignedZone: 'zone-2',
    designatedLeaderId: 'op-reyes',
  })
  if (!result.ok) throw new Error('fixture squad creation failed')
  return result.metadata
}

// ── AC 1: assignSquadRoom returns typed success ───────────────────────────────

describe('assignSquadRoom', () => {
  it('returns ok:true with the assigned room type on valid input', () => {
    const result = assignSquadRoom('squad-beta', 'staging')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.record.squadId).toBe('squad-beta')
    expect(result.record.roomType).toBe('staging')
  })

  it('accepts every valid room type', () => {
    const roomTypes: SquadRoomType[] = [
      'barracks',
      'staging',
      'armory',
      'vehicle_bay',
      'training_room',
      'recovery_room',
    ]
    for (const rt of roomTypes) {
      const r = assignSquadRoom('squad-1', rt)
      expect(r.ok, `expected ok for room type "${rt}"`).toBe(true)
    }
  })

  // AC 2: typed failures
  it('returns missing_squad_id for empty squad id', () => {
    const r = assignSquadRoom('', 'staging')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('missing_squad_id')
  })

  it('returns missing_squad_id for null squad id', () => {
    const r = assignSquadRoom(null, 'barracks')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('missing_squad_id')
  })

  it('returns invalid_room_type for unrecognised room type', () => {
    const r = assignSquadRoom('squad-1', 'conference_room')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('invalid_room_type')
  })

  it('returns invalid_room_type for null room type', () => {
    const r = assignSquadRoom('squad-1', null)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('invalid_room_type')
  })
})

// ── AC 3: reassignSquadRoom is deterministic ──────────────────────────────────

describe('reassignSquadRoom', () => {
  it('returns the new room type on a valid reassignment', () => {
    const r = reassignSquadRoom('squad-beta', 'armory')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.record.roomType).toBe('armory')
  })

  it('is idempotent: calling twice with same input returns same result', () => {
    const a = reassignSquadRoom('squad-beta', 'vehicle_bay')
    const b = reassignSquadRoom('squad-beta', 'vehicle_bay')
    expect(a).toEqual(b)
  })

  it('replacing staging with barracks changes the returned room type', () => {
    const a = reassignSquadRoom('squad-1', 'staging')
    const b = reassignSquadRoom('squad-1', 'barracks')
    expect(a.ok && a.record.roomType).toBe('staging')
    expect(b.ok && b.record.roomType).toBe('barracks')
  })
})

// ── AC 4: clearSquadRoom returns typed clear-success ─────────────────────────

describe('clearSquadRoom', () => {
  it('returns ok:true with the squad id on a valid clear', () => {
    const r = clearSquadRoom('squad-beta')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.squadId).toBe('squad-beta')
  })

  it('returns missing_squad_id for empty squad id', () => {
    const r = clearSquadRoom('')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('missing_squad_id')
  })

  it('returns missing_squad_id for null squad id', () => {
    const r = clearSquadRoom(null)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('missing_squad_id')
  })
})

// ── AC 5: deriveReadinessSurface returns different tier/properties per room ───

describe('deriveReadinessSurface — distinct surfaces per room type', () => {
  const squad = makeSquad()

  it('staging → high tier, quickDeploy + gearAccess', () => {
    const s = deriveReadinessSurface(squad, 'staging')
    expect(s.tier).toBe('high')
    expect(s.properties.quickDeploy).toBe(true)
    expect(s.properties.gearAccess).toBe(true)
    expect(s.properties.vehicleAccess).toBe(false)
    expect(s.squadId).toBe('squad-beta')
    expect(s.roomType).toBe('staging')
  })

  it('vehicle_bay → high tier, vehicleAccess + quickDeploy', () => {
    const s = deriveReadinessSurface(squad, 'vehicle_bay')
    expect(s.tier).toBe('high')
    expect(s.properties.quickDeploy).toBe(true)
    expect(s.properties.vehicleAccess).toBe(true)
    expect(s.properties.gearAccess).toBe(false)
  })

  it('armory → standard tier, gearAccess only', () => {
    const s = deriveReadinessSurface(squad, 'armory')
    expect(s.tier).toBe('standard')
    expect(s.properties.gearAccess).toBe(true)
    expect(s.properties.quickDeploy).toBe(false)
  })

  it('barracks → standard tier, recoveryCapable', () => {
    const s = deriveReadinessSurface(squad, 'barracks')
    expect(s.tier).toBe('standard')
    expect(s.properties.recoveryCapable).toBe(true)
    expect(s.properties.quickDeploy).toBe(false)
  })

  it('training_room → limited tier, trainingCapable', () => {
    const s = deriveReadinessSurface(squad, 'training_room')
    expect(s.tier).toBe('limited')
    expect(s.properties.trainingCapable).toBe(true)
    expect(s.properties.quickDeploy).toBe(false)
  })

  it('recovery_room → limited tier, recoveryCapable', () => {
    const s = deriveReadinessSurface(squad, 'recovery_room')
    expect(s.tier).toBe('limited')
    expect(s.properties.recoveryCapable).toBe(true)
    expect(s.properties.trainingCapable).toBe(false)
    expect(s.properties.quickDeploy).toBe(false)
  })

  it('all six room types produce distinct tier+properties signatures', () => {
    const roomTypes: SquadRoomType[] = [
      'barracks', 'staging', 'armory', 'vehicle_bay', 'training_room', 'recovery_room',
    ]
    const signatures = roomTypes.map(rt => {
      const s = deriveReadinessSurface(squad, rt)
      return JSON.stringify({ tier: s.tier, props: s.properties })
    })
    const unique = new Set(signatures)
    expect(unique.size).toBe(6)
  })
})

// ── AC 6: deterministic — identical inputs produce identical outputs ───────────

describe('deriveReadinessSurface — deterministic', () => {
  const squad = makeSquad()

  it('returns identical output for the same (squad, roomType) inputs', () => {
    const a = deriveReadinessSurface(squad, 'staging')
    const b = deriveReadinessSurface(squad, 'staging')
    expect(a).toEqual(b)
  })

  it('squad roster is not mutated by deriveReadinessSurface', () => {
    const before = { ...squad }
    deriveReadinessSurface(squad, 'armory')
    expect(squad.squadId).toBe(before.squadId)
    expect(squad.name).toBe(before.name)
    expect(squad.designatedLeaderId).toBe(before.designatedLeaderId)
  })
})
