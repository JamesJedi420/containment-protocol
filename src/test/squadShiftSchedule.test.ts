import { describe, it, expect } from 'vitest'
import { createSquadMetadata } from '../domain/squadMetadata'
import {
  assignSquadShift,
  deriveSquadAvailability,
  type SquadDutyState,
} from '../domain/squadShiftSchedule'

// ── fixture ───────────────────────────────────────────────────────────────────

function makeSquad() {
  const result = createSquadMetadata({
    squadId: 'squad-alpha',
    name: 'Alpha Squad',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'day',
    assignedZone: 'zone-1',
    designatedLeaderId: 'op-mina',
  })
  if (!result.ok) throw new Error('fixture squad creation failed')
  return result.metadata
}

// ── AC 1: assignSquadShift returns typed success ───────────────────────────────

describe('assignSquadShift', () => {
  it('returns ok:true with the new duty state on a valid assignment', () => {
    const result = assignSquadShift('squad-alpha', 'patrol')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.record.squadId).toBe('squad-alpha')
    expect(result.record.dutyState).toBe('patrol')
  })

  it('accepts every valid duty state', () => {
    const states: SquadDutyState[] = [
      'normal_ops',
      'patrol',
      'training',
      'standby',
      'transfer_escort',
      'lockdown',
      'breach_response',
    ]
    for (const s of states) {
      const r = assignSquadShift('squad-1', s)
      expect(r.ok, `expected ok for duty state "${s}"`).toBe(true)
    }
  })

  // AC 2: typed failures for invalid inputs
  it('returns missing_squad_id failure for empty squad id', () => {
    const r = assignSquadShift('', 'normal_ops')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('missing_squad_id')
  })

  it('returns missing_squad_id failure for null squad id', () => {
    const r = assignSquadShift(null, 'normal_ops')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('missing_squad_id')
  })

  it('returns invalid_duty_state failure for unrecognised duty state', () => {
    const r = assignSquadShift('squad-1', 'off_duty')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('invalid_duty_state')
  })

  it('returns invalid_duty_state failure for null duty state', () => {
    const r = assignSquadShift('squad-1', null)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('invalid_duty_state')
  })
})

// ── AC 3: full availability for normal_ops and standby ────────────────────────

describe('deriveSquadAvailability — full tier', () => {
  const squad = makeSquad()

  it('returns full availability for normal_ops', () => {
    const summary = deriveSquadAvailability(squad, 'normal_ops', 4)
    expect(summary.availabilityTier).toBe('full')
    expect(summary.deployableSlots).toBe(4)
    expect(summary.unavailableSlots).toBe(0)
    expect(summary.effectiveCapacityRatio).toBe(1.0)
    expect(summary.squadId).toBe('squad-alpha')
    expect(summary.dutyState).toBe('normal_ops')
  })

  it('returns full availability for standby', () => {
    const summary = deriveSquadAvailability(squad, 'standby', 4)
    expect(summary.availabilityTier).toBe('full')
    expect(summary.deployableSlots).toBe(4)
    expect(summary.unavailableSlots).toBe(0)
    expect(summary.effectiveCapacityRatio).toBe(1.0)
  })
})

// ── AC 4: reduced availability — roster composition unchanged ─────────────────

describe('deriveSquadAvailability — reduced tier', () => {
  const squad = makeSquad()

  it('returns reduced availability for patrol without mutating roster', () => {
    const summary = deriveSquadAvailability(squad, 'patrol', 4)
    expect(summary.availabilityTier).toBe('reduced')
    expect(summary.deployableSlots).toBeLessThan(4)
    expect(summary.unavailableSlots).toBeGreaterThan(0)
    expect(summary.deployableSlots + summary.unavailableSlots).toBe(4)
    // Squad metadata itself is not changed
    expect(squad.squadId).toBe('squad-alpha')
  })

  it('returns reduced availability for training', () => {
    const summary = deriveSquadAvailability(squad, 'training', 4)
    expect(summary.availabilityTier).toBe('reduced')
    expect(summary.deployableSlots + summary.unavailableSlots).toBe(4)
  })

  it('returns reduced availability for transfer_escort', () => {
    const summary = deriveSquadAvailability(squad, 'transfer_escort', 4)
    expect(summary.availabilityTier).toBe('reduced')
    expect(summary.deployableSlots + summary.unavailableSlots).toBe(4)
  })
})

// ── AC 5: unavailable for lockdown and breach_response ────────────────────────

describe('deriveSquadAvailability — unavailable tier', () => {
  const squad = makeSquad()

  it('returns unavailable for lockdown', () => {
    const summary = deriveSquadAvailability(squad, 'lockdown', 4)
    expect(summary.availabilityTier).toBe('unavailable')
    expect(summary.deployableSlots).toBe(0)
    expect(summary.unavailableSlots).toBe(4)
    expect(summary.effectiveCapacityRatio).toBe(0)
  })

  it('returns unavailable for breach_response', () => {
    const summary = deriveSquadAvailability(squad, 'breach_response', 4)
    expect(summary.availabilityTier).toBe('unavailable')
    expect(summary.deployableSlots).toBe(0)
    expect(summary.unavailableSlots).toBe(4)
    expect(summary.effectiveCapacityRatio).toBe(0)
  })
})

// ── AC 6: switching duty state produces deterministic changes ─────────────────

describe('deriveSquadAvailability — deterministic switching', () => {
  const squad = makeSquad()

  it('produces identical output for the same (squad, dutyState, totalSlots) inputs', () => {
    const a = deriveSquadAvailability(squad, 'patrol', 6)
    const b = deriveSquadAvailability(squad, 'patrol', 6)
    expect(a).toEqual(b)
  })

  it('produces different deployableSlots when switching from full to reduced', () => {
    const full = deriveSquadAvailability(squad, 'normal_ops', 6)
    const reduced = deriveSquadAvailability(squad, 'training', 6)
    expect(full.deployableSlots).toBeGreaterThan(reduced.deployableSlots)
  })

  it('produces different deployableSlots when switching from reduced to unavailable', () => {
    const reduced = deriveSquadAvailability(squad, 'patrol', 6)
    const unavail = deriveSquadAvailability(squad, 'lockdown', 6)
    expect(reduced.deployableSlots).toBeGreaterThan(unavail.deployableSlots)
    expect(unavail.deployableSlots).toBe(0)
  })
})
