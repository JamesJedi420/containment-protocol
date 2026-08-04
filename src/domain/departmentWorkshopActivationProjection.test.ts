import { describe, it, expect } from 'vitest'
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
    expect(result.departments.every((d) => d.candidates.length === 0)).toBe(true)
  })

  it('produces no candidates for a case that is not construction-complete', () => {
    const source = makeBase({
      'case-incomplete': caseWithRoutes('case-incomplete', [{ id: 'r1', label: 'R1' }]),
    }) as GameState
    const result = projectDepartmentWorkshopActivationCandidates(source)
    expect(result.departments.every((d) => d.candidates.length === 0)).toBe(true)
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
    const allCandidates = result.departments.flatMap((d) => d.candidates)
    expect(allCandidates.length).toBeGreaterThan(0)

    const candidatesForCaseA = allCandidates.filter((c) => c.constructionCaseId === 'case-a')
    expect(candidatesForCaseA.some((c) => c.structuralRouteId === 'route-1')).toBe(true)
    expect(candidatesForCaseA.some((c) => c.structuralRouteId === 'route-2')).toBe(true)
  })

  it('carries the route label from the map layer', () => {
    const source = withCompletedClock(
      makeBase({ 'case-b': caseWithRoutes('case-b', [{ id: 'route-x', label: 'Corridor X' }]) }),
      'case-b'
    )

    const result = projectDepartmentWorkshopActivationCandidates(source)
    const candidate = result.departments
      .flatMap((d) => d.candidates)
      .find((c) => c.structuralRouteId === 'route-x')
    expect(candidate?.structuralRouteLabel).toBe('Corridor X')
  })

  it('marks a department as alreadyActivated when a snapshot exists', () => {
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
    const bio = result.departments.find((d) => d.department.id === DEPT_BIO)
    const concept = result.departments.find((d) => d.department.id === DEPT_CONCEPT)
    expect(bio?.alreadyActivated).toBe(true)
    expect(concept?.alreadyActivated).toBe(false)
  })

  it('excludes completed cases with no mapLayer routes', () => {
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
    expect(result.departments.every((d) => d.candidates.length === 0)).toBe(true)
  })

  it('returns departments sorted by department ID (code-unit order)', () => {
    const source = makeBase({}) as GameState
    const result = projectDepartmentWorkshopActivationCandidates(
      source,
      DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
    )
    const ids = result.departments.map((d) => d.department.id)
    const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
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
    const candidatesForFirstDept = result.departments[0]?.candidates ?? []
    const caseIds = candidatesForFirstDept.map((c) => c.constructionCaseId)
    const sorted = [...caseIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    expect(caseIds).toEqual(sorted)
  })
})
