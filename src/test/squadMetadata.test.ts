import { describe, expect, it } from 'vitest'
import { createSquadMetadata, getSquadMetadata, updateSquadMetadata } from '../domain/squadMetadata'

function createFixture() {
  const created = createSquadMetadata({
    squadId: 'squad-alpha',
    name: 'Alpha Squad',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'night',
    assignedZone: 'zone-north',
    designatedLeaderId: 'a_mina',
  })

  if (!created.ok) {
    throw new Error(`Fixture creation failed: ${created.code}`)
  }

  return created.metadata
}

describe('squadMetadata', () => {
  it('creates squad metadata successfully with canonical field values', () => {
    const created = createSquadMetadata({
      squadId: ' squad-alpha ',
      name: ' Alpha Squad ',
      role: ' rapid_response ',
      doctrine: ' containment ',
      shift: ' night ',
      assignedZone: ' zone-north ',
      designatedLeaderId: ' a_mina ',
    })

    expect(created).toEqual({
      ok: true,
      metadata: {
        squadId: 'squad-alpha',
        name: 'Alpha Squad',
        role: 'rapid_response',
        doctrine: 'containment',
        shift: 'night',
        assignedZone: 'zone-north',
        designatedLeaderId: 'a_mina',
      },
    })
  })

  it('updates squad metadata successfully with deterministic patching', () => {
    const metadata = createFixture()

    const updated = updateSquadMetadata(metadata, {
      doctrine: 'civil_protection',
      assignedZone: 'zone-central',
      designatedLeaderId: 'a_casey',
    })

    expect(updated).toEqual({
      ok: true,
      changed: true,
      metadata: {
        squadId: 'squad-alpha',
        name: 'Alpha Squad',
        role: 'rapid_response',
        doctrine: 'civil_protection',
        shift: 'night',
        assignedZone: 'zone-central',
        designatedLeaderId: 'a_casey',
      },
    })
  })

  it('rejects invalid create and update attempts with typed failures', () => {
    const invalidCreate = createSquadMetadata({
      squadId: 'squad-alpha',
      name: ' ',
      role: 'rapid_response',
      doctrine: 'containment',
      shift: 'night',
      assignedZone: 'zone-north',
      designatedLeaderId: 'a_mina',
    })
    expect(invalidCreate).toEqual({
      ok: false,
      code: 'invalid_name',
    })

    const metadata = createFixture()
    const invalidUpdate = updateSquadMetadata(metadata, {
      assignedZone: ' ',
    })

    expect(invalidUpdate).toEqual({
      ok: false,
      code: 'invalid_assigned_zone',
      metadata,
    })
    expect(invalidUpdate.metadata).toBe(metadata)
  })

  it('returns canonical readback payload without mutating source metadata', () => {
    const metadata = createFixture()

    const readback = getSquadMetadata(metadata)

    expect(readback).toEqual(metadata)
    expect(readback).not.toBe(metadata)
  })

  it('keeps deterministic no-op behavior for empty or equivalent updates', () => {
    const metadata = createFixture()

    const emptyPatch = updateSquadMetadata(metadata, {})
    expect(emptyPatch).toEqual({
      ok: true,
      changed: false,
      metadata,
    })
    expect(emptyPatch.metadata).toBe(metadata)

    const equivalentPatch = updateSquadMetadata(metadata, {
      name: ' Alpha Squad ',
      role: ' rapid_response ',
      doctrine: ' containment ',
      shift: ' night ',
      assignedZone: ' zone-north ',
      designatedLeaderId: ' a_mina ',
    })

    expect(equivalentPatch).toEqual({
      ok: true,
      changed: false,
      metadata,
    })
    expect(equivalentPatch.metadata).toBe(metadata)
  })

  it('allocates a new metadata object only when a canonical value changes', () => {
    const metadata = createFixture()

    const updated = updateSquadMetadata(metadata, {
      role: 'field_command',
    })

    expect(updated).toEqual({
      ok: true,
      changed: true,
      metadata: {
        ...metadata,
        role: 'field_command',
      },
    })
    expect(updated.metadata).not.toBe(metadata)
  })
})
