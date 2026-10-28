import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROCEDURE_SAFETY_REQUIREMENTS,
  PROCEDURE_ROOM_STATE_PRECONDITIONS_OWNER,
  PROCEDURE_ROOM_STATE_PRECONDITIONS_SCHEMA_VERSION,
  evaluateProcedureRoomStateSafety,
  lookupProcedureSafetyRequirement,
  parseFacilityConfigurationSnapshot,
  parseRoomStateSnapshot,
  type FacilityConfigurationSnapshot,
  type RoomStateSnapshot,
} from './procedureRoomStatePreconditions'

function makeSafeContainmentRoomState(
  overrides: Partial<RoomStateSnapshot> = {}
): RoomStateSnapshot {
  return Object.freeze({
    roomId: 'containment_cell',
    lighting: 'adequate',
    locks: 'secured',
    staffPositioning: 'clear',
    ...overrides,
  })
}

function makeContainmentFacility(
  overrides: Partial<FacilityConfigurationSnapshot> = {}
): FacilityConfigurationSnapshot {
  return Object.freeze({
    facilityId: 'facility:hq-alpha',
    activeRoomIds: Object.freeze(['containment_cell', 'med_bay']),
    roomZoneAssignments: Object.freeze([
      Object.freeze({ roomId: 'containment_cell', zoneId: 'containment' }),
      Object.freeze({ roomId: 'med_bay', zoneId: 'medical' }),
    ]),
    containmentLayoutMode: 'secure_clean',
    ...overrides,
  })
}

describe('SPE-1896 procedure room-state preconditions', () => {
  it('exports frozen contract metadata', () => {
    expect(PROCEDURE_ROOM_STATE_PRECONDITIONS_OWNER).toBe('SPE-1896')
    expect(PROCEDURE_ROOM_STATE_PRECONDITIONS_SCHEMA_VERSION).toBe('spe-1896.v1')
    expect(DEFAULT_PROCEDURE_SAFETY_REQUIREMENTS.length).toBeGreaterThanOrEqual(2)
  })

  describe('lookupProcedureSafetyRequirement', () => {
    it('finds binding_sigil requirement with room-state checks', () => {
      const requirement = lookupProcedureSafetyRequirement('binding_sigil')
      expect(requirement?.requiredRoomId).toBe('containment_cell')
      expect(requirement?.checks.map((check) => check.kind)).toEqual([
        'lighting',
        'locks',
        'staffPositioning',
        'facilityConfiguration',
      ])
    })

    it('returns undefined for unknown procedure ids', () => {
      expect(lookupProcedureSafetyRequirement('nonexistent_procedure')).toBeUndefined()
      expect(lookupProcedureSafetyRequirement('   ')).toBeUndefined()
    })
  })

  describe('evaluateProcedureRoomStateSafety — safe proceed', () => {
    it('allows binding_sigil when all preconditions are met', () => {
      const result = evaluateProcedureRoomStateSafety({
        procedureId: 'binding_sigil',
        roomState: makeSafeContainmentRoomState(),
        facilityConfiguration: makeContainmentFacility(),
      })
      expect(result).toEqual({ ok: true })
    })
  })

  describe('evaluateProcedureRoomStateSafety — room-state precondition blocked', () => {
    it('blocks binding_sigil when locks are unlocked with inspectable reason', () => {
      const result = evaluateProcedureRoomStateSafety({
        procedureId: 'binding_sigil',
        roomState: makeSafeContainmentRoomState({ locks: 'unlocked' }),
        facilityConfiguration: makeContainmentFacility(),
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reasonCode).toBe('locks_precondition_unmet')
        expect(result.failedCheckKind).toBe('locks')
        expect(result.procedureId).toBe('binding_sigil')
        expect(result.roomId).toBe('containment_cell')
      }
    })

    it('blocks when lighting is below authored minimum', () => {
      const result = evaluateProcedureRoomStateSafety({
        procedureId: 'binding_sigil',
        roomState: makeSafeContainmentRoomState({ lighting: 'dark' }),
        facilityConfiguration: makeContainmentFacility(),
      })
      expect(result).toMatchObject({
        ok: false,
        reasonCode: 'lighting_precondition_unmet',
        failedCheckKind: 'lighting',
      })
    })

    it('blocks when staff remain in the hazard zone', () => {
      const result = evaluateProcedureRoomStateSafety({
        procedureId: 'binding_sigil',
        roomState: makeSafeContainmentRoomState({
          staffPositioning: 'personnel_in_hazard_zone',
        }),
        facilityConfiguration: makeContainmentFacility(),
      })
      expect(result).toMatchObject({
        ok: false,
        reasonCode: 'staff_positioning_precondition_unmet',
        failedCheckKind: 'staffPositioning',
      })
    })
  })

  describe('evaluateProcedureRoomStateSafety — facility configuration mismatch', () => {
    it('blocks binding_sigil when containment layout mode is open_porous', () => {
      const result = evaluateProcedureRoomStateSafety({
        procedureId: 'binding_sigil',
        roomState: makeSafeContainmentRoomState(),
        facilityConfiguration: makeContainmentFacility({
          containmentLayoutMode: 'open_porous',
        }),
      })
      expect(result).toMatchObject({
        ok: false,
        reasonCode: 'facility_containment_mode_mismatch',
        failedCheckKind: 'facilityConfiguration',
      })
    })

    it('blocks resonance_construct when armory is zoned operations instead of storage', () => {
      const result = evaluateProcedureRoomStateSafety({
        procedureId: 'resonance_construct',
        roomState: Object.freeze({
          roomId: 'armory',
          lighting: 'adequate',
          locks: 'secured',
          staffPositioning: 'clear',
        }),
        facilityConfiguration: Object.freeze({
          facilityId: 'facility:hq-beta',
          activeRoomIds: Object.freeze(['armory']),
          roomZoneAssignments: Object.freeze([
            Object.freeze({ roomId: 'armory', zoneId: 'operations' }),
          ]),
          containmentLayoutMode: 'unknown',
        }),
      })
      expect(result).toMatchObject({
        ok: false,
        reasonCode: 'facility_zone_mismatch',
        failedCheckKind: 'facilityConfiguration',
        procedureId: 'resonance_construct',
        roomId: 'armory',
      })
    })
  })

  describe('evaluateProcedureRoomStateSafety — fail-closed negative paths', () => {
    it('rejects malformed snapshots', () => {
      expect(
        evaluateProcedureRoomStateSafety({
          procedureId: 'binding_sigil',
          roomState: null,
          facilityConfiguration: makeContainmentFacility(),
        })
      ).toMatchObject({ ok: false, reasonCode: 'malformed_input' })

      expect(
        evaluateProcedureRoomStateSafety({
          procedureId: 'binding_sigil',
          roomState: makeSafeContainmentRoomState(),
          facilityConfiguration: { facilityId: '' },
        })
      ).toMatchObject({ ok: false, reasonCode: 'malformed_input' })
    })

    it('rejects unknown procedure ids', () => {
      expect(
        evaluateProcedureRoomStateSafety({
          procedureId: 'unknown_ritual',
          roomState: makeSafeContainmentRoomState(),
          facilityConfiguration: makeContainmentFacility(),
        })
      ).toMatchObject({ ok: false, reasonCode: 'unknown_procedure_id' })
    })

    it('rejects room id mismatch against requirement', () => {
      expect(
        evaluateProcedureRoomStateSafety({
          procedureId: 'binding_sigil',
          roomState: makeSafeContainmentRoomState({ roomId: 'med_bay' }),
          facilityConfiguration: makeContainmentFacility(),
        })
      ).toMatchObject({ ok: false, reasonCode: 'room_state_room_mismatch' })
    })

    it('parse helpers fail closed on unknown room refs', () => {
      expect(parseRoomStateSnapshot({ roomId: 'not_a_room', lighting: 'adequate' })).toBeUndefined()
      expect(
        parseFacilityConfigurationSnapshot({
          facilityId: 'f1',
          activeRoomIds: ['bogus_room'],
          roomZoneAssignments: [],
          containmentLayoutMode: 'secure_clean',
        })
      ).toBeUndefined()
    })

    it('treats unknown lighting as fail-closed before proceed', () => {
      expect(
        evaluateProcedureRoomStateSafety({
          procedureId: 'binding_sigil',
          roomState: makeSafeContainmentRoomState({ lighting: 'unknown' }),
          facilityConfiguration: makeContainmentFacility(),
        })
      ).toMatchObject({ ok: false, reasonCode: 'unknown_lighting_state' })
    })
  })
})
