import { describe, expect, it } from 'vitest'
import { projectDepartmentWorkshopActivationCandidates } from './departmentWorkshopActivationProjection'
import { DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY } from './departmentCapabilities'
import { CONSTRUCTION_PROGRESS_MAX, getConstructionProgressClockId } from './constructionProgress'
import { setDefinedProgressClock } from './progressClocks'
import type { GameState } from './models'

const DEPT_BIO = 'department:biohazard-response'
const DEPT_CONCEPT = 'department:concept-embodiment-research'

function caseWithRoutes(caseId: string, routes: { id: string; label: string }[]) {
  return {
    id: caseId,
    title: `Case ${caseId}`,
    status: 'open',
    deadlineRemaining: 4,
    mapLayer: {
      authoringMode: 'map-metadata-first',
      legend: [],
      zones: [],
      routes,
      occupierKnownRouteIds: [],
      scaleAnchors: [],
    },
  }
}

function withCompletedClock(base: object, caseId: string): GameState {
  const clockId = getConstructionProgressClockId(caseId)
  return setDefinedProgressClock(base as GameState, clockId, {
    id: clockId,
    label: `Construction: ${caseId}`,
    value: CONSTRUCTION_PROGRESS_MAX,
    max: CONSTRUCTION_PROGRESS_MAX,
  })
}

function makeBase(cases: Record<string, object>, snapshots?: Record<string, object>): object {
  return {
    cases,
    week: 1,
    inventory: {},
    departmentWorkshopSnapshots: snapshots ?? {},
  }
}

describe('projectDepartmentWorkshopActivationCandidates', () => {
  it('returns all registry departments even when no eligible cases exist', () => {
    const source = makeBase({}) as GameState
    const result = projectDepartmentWorkshopActivationCandidates(source)
    expect(result.departments.length).toBeGreaterThan(0)
    expect(result.departments.every((department) => department.candidates.length === 0)).toBe(true)
  })

  it('produces no candidates for a case that is not construction-complete', () => {
    const source = makeBase({
      'case-incomplete': caseWithRoutes('case-incomplete', [{ id: 'r1', label: 'R1' }]),
    }) as GameState
    const result = projectDepartmentWorkshopActivationCandidates(source)
    expect(result.departments.every((department) => department.candidates.length === 0)).toBe(true)
  })

  it('produces candidates for a completed construction case with routes', () => {
    const source = withCompletedClock(
      makeBase({
        'case-a': caseWithRoutes('case-a', [
          { id: 'route-1', label: 'Route Alpha' },
          { id: 'route-2', label: 'Route Beta' },
        ]),
      }),
      'case-a'
    )

    const result = projectDepartmentWorkshopActivationCandidates(source)
    const allCandidates = result.departments.flatMap((department) => department.candidates)
    expect(allCandidates.length).toBeGreaterThan(0)

    const candidatesForCaseA = allCandidates.filter(
      (candidate) => candidate.constructionCaseId === 'case-a'
    )
    expect(candidatesForCaseA.some((candidate) => candidate.structuralRouteId === 'route-1')).toBe(
      true
    )
    expect(candidatesForCaseA.some((candidate) => candidate.structuralRouteId === 'route-2')).toBe(
      true
    )
  })

  it('carries the route label from the map layer', () => {
    const source = withCompletedClock(
      makeBase({ 'case-b': caseWithRoutes('case-b', [{ id: 'route-x', label: 'Corridor X' }]) }),
      'case-b'
    )

    const result = projectDepartmentWorkshopActivationCandidates(source)
    const candidate = result.departments
      .flatMap((department) => department.candidates)
      .find((entry) => entry.structuralRouteId === 'route-x')
    expect(candidate?.structuralRouteLabel).toBe('Corridor X')
  })

  it('keeps activated departments visible without exposing actionable candidates', () => {
    const source = withCompletedClock(
      makeBase(
        { 'case-c': caseWithRoutes('case-c', [{ id: 'r1', label: 'R1' }]) },
        {
          [DEPT_BIO]: {
            departmentId: DEPT_BIO,
            slotCapacity: 1,
            queued: [],
            active: [],
            paused: [],
          },
        }
      ),
      'case-c'
    )

    const result = projectDepartmentWorkshopActivationCandidates(source)
    const bio = result.departments.find((department) => department.department.id === DEPT_BIO)
    const concept = result.departments.find(
      (department) => department.department.id === DEPT_CONCEPT
    )
    expect(bio?.alreadyActivated).toBe(true)
    expect(bio?.candidates).toEqual([])
    expect(concept?.alreadyActivated).toBe(false)
    expect(concept?.candidates.length).toBeGreaterThan(0)
  })

  it('excludes completed cases with no map-layer routes', () => {
    const baseNoRoutes = makeBase({
      'case-no-routes': {
        id: 'case-no-routes',
        title: 'No routes',
        status: 'open',
        deadlineRemaining: 4,
        mapLayer: { routes: [] },
      },
      'case-no-maplayer': {
        id: 'case-no-maplayer',
        title: 'No map layer',
        status: 'open',
        deadlineRemaining: 4,
      },
    })
    const source = withCompletedClock(
      withCompletedClock(baseNoRoutes, 'case-no-routes'),
      'case-no-maplayer'
    )

    const result = projectDepartmentWorkshopActivationCandidates(source)
    expect(result.departments.every((department) => department.candidates.length === 0)).toBe(true)
  })

  it('returns departments sorted by department ID in code-unit order', () => {
    const source = makeBase({}) as GameState
    const result = projectDepartmentWorkshopActivationCandidates(
      source,
      DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
    )
    const ids = result.departments.map((department) => department.department.id)
    const sorted = [...ids].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    expect(ids).toEqual(sorted)
  })

  it('returns candidates sorted by case ID then route ID within a department', () => {
    const source = withCompletedClock(
      withCompletedClock(
        makeBase({
          'case-z': caseWithRoutes('case-z', [
            { id: 'route-b', label: 'B' },
            { id: 'route-a', label: 'A' },
          ]),
          'case-a': caseWithRoutes('case-a', [{ id: 'route-c', label: 'C' }]),
        }),
        'case-z'
      ),
      'case-a'
    )

    const result = projectDepartmentWorkshopActivationCandidates(source)
    const candidatesForFirstDepartment = result.departments[0]?.candidates ?? []
    const keys = candidatesForFirstDepartment.map(
      (candidate) => `${candidate.constructionCaseId}::${candidate.structuralRouteId}`
    )
    const sorted = [...keys].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    expect(keys).toEqual(sorted)
  })
})
