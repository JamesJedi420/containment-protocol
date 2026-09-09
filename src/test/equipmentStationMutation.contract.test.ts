import { describe, expect, it } from 'vitest'
import {
  BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
  parseEquipmentInstanceStationMutation,
  resolveBlastDoorIntegrityLabor,
} from '../domain/equipmentStationMutation'

describe('blast-door integrity-labor station resolver', () => {
  it('authors one frozen station for blast_door with cycleDelta 1', () => {
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'blast_door',
        existingMutation: undefined,
        currentWeek: 3,
      })
    ).toEqual({
      ok: true,
      stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
      cycleDelta: 1,
      mutation: { stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID, appliedWeek: 3 },
    })
  })

  it('fails closed for wrong class, already applied, malformed stamp, and invalid week', () => {
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: undefined,
        currentWeek: 1,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'interlock',
        existingMutation: undefined,
        currentWeek: 1,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'blast_door',
        existingMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'already_applied' })
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'blast_door',
        existingMutation: { stationId: 'other_bench', appliedWeek: 1 },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'blast_door',
        existingMutation: undefined,
        currentWeek: 0,
      })
    ).toEqual({ ok: false, code: 'invalid_week' })
  })

  it('parses only the authored station stamp', () => {
    expect(
      parseEquipmentInstanceStationMutation({
        stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 4,
      })
    ).toEqual({
      ok: true,
      mutation: { stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID, appliedWeek: 4 },
    })
    expect(parseEquipmentInstanceStationMutation({ stationId: 'other', appliedWeek: 1 })).toEqual({
      ok: false,
      code: 'malformed_mutation',
    })
    expect(
      parseEquipmentInstanceStationMutation({
        stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 1,
        extra: true,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
  })
})
