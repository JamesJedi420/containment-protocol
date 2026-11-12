import { describe, expect, it } from 'vitest'
import {
  INCIDENT_STATE_CHANGE_KINDS,
  isIncidentStateChangeKind,
  isIncidentStateChangeResolutionKind,
  listIncidentStateChangeKinds,
  projectIncidentStateChangeResolution,
  validateIncidentStateChangeResolutionInput,
} from '../domain/incidentStateChangeResolution'

describe('SPE-1051 incident state-change success resolution (slice 2)', () => {
  it('exposes authored state-change kinds', () => {
    expect(listIncidentStateChangeKinds()).toEqual([
      'environmental',
      'political',
      'ritual',
      'logistical',
      'institutional',
      'containment',
      'evacuation',
      'evidence',
      'stabilization',
    ])
    expect(INCIDENT_STATE_CHANGE_KINDS).toHaveLength(9)
    expect(isIncidentStateChangeKind('containment')).toBe(true)
    expect(isIncidentStateChangeKind('combat')).toBe(false)
    expect(isIncidentStateChangeKind('entity_elimination')).toBe(false)
    expect(isIncidentStateChangeResolutionKind('state_change_success')).toBe(true)
    expect(isIncidentStateChangeResolutionKind('combat_win')).toBe(false)
    expect(isIncidentStateChangeResolutionKind('game_over')).toBe(false)
  })

  it('AC: configured state-change success resolves without entity elimination', () => {
    const projection = projectIncidentStateChangeResolution({
      stateChangeKind: 'containment',
      incidentId: 'incident-alpha',
    })
    expect(projection).toBeDefined()
    if (!projection) throw new Error('missing projection')

    expect(projection.resolutionKind).toBe('state_change_success')
    expect(projection.stateChangeKind).toBe('containment')
    expect(projection.incidentId).toBe('incident-alpha')
    expect(projection.entityEliminated).toBe(false)
    expect(projection.successWithoutEntityElimination).toBe(true)
    expect(projection.operatingConditionDelta).toBe(1)
    expect(isIncidentStateChangeResolutionKind(projection.resolutionKind)).toBe(true)
  })

  it('projects each allowed state-change kind as success without elimination', () => {
    for (const kind of listIncidentStateChangeKinds()) {
      const projection = projectIncidentStateChangeResolution({
        stateChangeKind: kind,
        requireEntityElimination: false,
        operatingConditionDelta: 3,
      })
      expect(projection).toMatchObject({
        resolutionKind: 'state_change_success',
        stateChangeKind: kind,
        entityEliminated: false,
        successWithoutEntityElimination: true,
        operatingConditionDelta: 3,
        incidentId: null,
      })
    }
  })

  it('fail-closes omit and malformed inputs', () => {
    expect(projectIncidentStateChangeResolution(null)).toBeUndefined()
    expect(projectIncidentStateChangeResolution(undefined)).toBeUndefined()
    expect(projectIncidentStateChangeResolution({} as never)).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'combat' as 'containment',
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'entity_elimination' as 'stabilization',
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'evacuation',
        operatingConditionDelta: -1,
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'evacuation',
        operatingConditionDelta: Number.NaN,
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'evacuation',
        operatingConditionDelta: Number.POSITIVE_INFINITY,
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'political',
        incidentId: '',
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'ritual',
        requireEntityElimination: true,
      })
    ).toBeUndefined()
    expect(
      projectIncidentStateChangeResolution({
        stateChangeKind: 'evidence',
        requireEntityElimination: 'yes' as unknown as boolean,
      })
    ).toBeUndefined()
    expect(validateIncidentStateChangeResolutionInput([])).toBe(false)
    expect(validateIncidentStateChangeResolutionInput('containment')).toBe(false)
    expect(
      validateIncidentStateChangeResolutionInput({
        stateChangeKind: 'logistical',
      })
    ).toBe(true)
    expect(
      validateIncidentStateChangeResolutionInput({
        stateChangeKind: 'logistical',
        requireEntityElimination: false,
      })
    ).toBe(true)
  })

  it('does not invent combat win, defeat, or default elimination', () => {
    const projection = projectIncidentStateChangeResolution({
      stateChangeKind: 'stabilization',
    })
    expect(projection?.resolutionKind).toBe('state_change_success')
    expect(projection?.entityEliminated).toBe(false)
    expect(projection).not.toMatchObject({ resolutionKind: 'combat_win' })
    expect(projection).not.toMatchObject({ resolutionKind: 'defeat' })
    expect(projection).not.toMatchObject({ resolutionKind: 'game_over' })
    expect(listIncidentStateChangeKinds().some((kind) => kind.includes('combat'))).toBe(false)
  })

  it('returns immutable byte-stable projections on repeat calls', () => {
    const input = Object.freeze({
      stateChangeKind: 'institutional' as const,
      incidentId: 'site-7',
      requireEntityElimination: false,
      operatingConditionDelta: 2,
    })
    const first = projectIncidentStateChangeResolution(input)
    const second = projectIncidentStateChangeResolution(input)
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(Object.isFrozen(first)).toBe(true)
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.entityEliminated = true
    }).toThrow()
    expect(() => {
      // @ts-expect-error intentional mutation probe
      first.stateChangeKind = 'combat'
    }).toThrow()
  })
})
