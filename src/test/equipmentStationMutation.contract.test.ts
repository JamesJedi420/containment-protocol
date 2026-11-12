import { describe, expect, it } from 'vitest'
import {
  BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
  INTERLOCK_INTEGRITY_LABOR_STATION_ID,
  PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
  eligibleClassIdForIntegrityLaborStation,
  parseEquipmentInstanceStationMutation,
  resolveBlastDoorIntegrityLabor,
  resolveInterlockIntegrityLabor,
  resolvePressureSealIntegrityLabor,
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

  it('treats a pressure-seal stamp on the blast-door resolver as malformed, not already applied', () => {
    expect(
      resolveBlastDoorIntegrityLabor({
        classId: 'blast_door',
        existingMutation: {
          stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
  })
})

describe('pressure-seal integrity-labor station resolver', () => {
  it('authors one frozen station for pressure_seal with cycleDelta 1', () => {
    expect(eligibleClassIdForIntegrityLaborStation(PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID)).toBe(
      'pressure_seal'
    )
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: undefined,
        currentWeek: 3,
      })
    ).toEqual({
      ok: true,
      stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
      cycleDelta: 1,
      mutation: { stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID, appliedWeek: 3 },
    })
  })

  it('fails closed for wrong class, already applied, mixed stamp, malformed stamp, and invalid week', () => {
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'blast_door',
        existingMutation: undefined,
        currentWeek: 1,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'interlock',
        existingMutation: undefined,
        currentWeek: 1,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: {
          stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'already_applied' })
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: { stationId: 'other_bench', appliedWeek: 1 },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
    expect(
      resolvePressureSealIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: undefined,
        currentWeek: 0,
      })
    ).toEqual({ ok: false, code: 'invalid_week' })
  })

  it('parses the authored pressure-seal station stamp without accepting unknown ids', () => {
    expect(
      parseEquipmentInstanceStationMutation({
        stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 4,
      })
    ).toEqual({
      ok: true,
      mutation: { stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID, appliedWeek: 4 },
    })
    expect(
      parseEquipmentInstanceStationMutation({
        stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 1,
        extra: true,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
  })
})

describe('interlock integrity-labor station resolver', () => {
  it('authors one frozen station for interlock with cycleDelta 1', () => {
    expect(eligibleClassIdForIntegrityLaborStation(INTERLOCK_INTEGRITY_LABOR_STATION_ID)).toBe(
      'interlock'
    )
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'interlock',
        existingMutation: undefined,
        currentWeek: 3,
      })
    ).toEqual({
      ok: true,
      stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
      cycleDelta: 1,
      mutation: { stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID, appliedWeek: 3 },
    })
  })

  it('fails closed for wrong class, already applied, mixed stamp, malformed stamp, and invalid week', () => {
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'blast_door',
        existingMutation: undefined,
        currentWeek: 1,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'pressure_seal',
        existingMutation: undefined,
        currentWeek: 1,
      })
    ).toEqual({ ok: false, code: 'invalid_class' })
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'interlock',
        existingMutation: {
          stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'already_applied' })
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'interlock',
        existingMutation: {
          stationId: BLAST_DOOR_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'interlock',
        existingMutation: {
          stationId: PRESSURE_SEAL_INTEGRITY_LABOR_STATION_ID,
          appliedWeek: 1,
        },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'interlock',
        existingMutation: { stationId: 'other_bench', appliedWeek: 1 },
        currentWeek: 2,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
    expect(
      resolveInterlockIntegrityLabor({
        classId: 'interlock',
        existingMutation: undefined,
        currentWeek: 0,
      })
    ).toEqual({ ok: false, code: 'invalid_week' })
  })

  it('parses the authored interlock station stamp without accepting unknown ids', () => {
    expect(
      parseEquipmentInstanceStationMutation({
        stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 4,
      })
    ).toEqual({
      ok: true,
      mutation: { stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID, appliedWeek: 4 },
    })
    expect(
      parseEquipmentInstanceStationMutation({
        stationId: INTERLOCK_INTEGRITY_LABOR_STATION_ID,
        appliedWeek: 1,
        extra: true,
      })
    ).toEqual({ ok: false, code: 'malformed_mutation' })
  })
})
