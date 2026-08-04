import { describe, expect, it } from 'vitest'
import { getDepartmentWorkshopActivationCommandView } from './departmentWorkshopActivationCommandView'
import {
  CONSTRUCTION_PROGRESS_MAX,
  getConstructionProgressClockId,
} from '../../domain/constructionProgress'
import { DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY } from '../../domain/departmentCapabilities'
import { setDefinedProgressClock } from '../../domain/progressClocks'
import type { GameState } from '../../domain/models'

const DEPT_BIO = 'department:biohazard-response'

function makeBase(cases: Record<string, object>, snapshots?: Record<string, object>): object {
  return { cases, week: 1, inventory: {}, departmentWorkshopSnapshots: snapshots ?? {} }
}

function withClock(base: object, caseId: string): GameState {
  const clockId = getConstructionProgressClockId(caseId)
  return setDefinedProgressClock(base as GameState, clockId, {
    id: clockId,
    label: `Construction: ${caseId}`,
    value: CONSTRUCTION_PROGRESS_MAX,
    max: CONSTRUCTION_PROGRESS_MAX,
  })
}

const COMPLETED_CASE = {
  id: 'case-1',
  title: 'Test case',
  status: 'open',
  deadlineRemaining: 4,
  mapLayer: {
    authoringMode: 'map-metadata-first',
    legend: [],
    zones: [],
    routes: [{ id: 'route-a', label: 'Route A', routeClass: 'open', activeSymbolIds: [] }],
    occupierKnownRouteIds: [],
    scaleAnchors: [],
  },
}

describe('getDepartmentWorkshopActivationCommandView', () => {
  it('returns an empty state when no construction-complete cases exist', () => {
    const view = getDepartmentWorkshopActivationCommandView(makeBase({}) as GameState)
    expect(view.isEmpty).toBe(true)
    expect(view.hasAnyUnactivated).toBe(false)
    expect(view.allDepartmentsActivated).toBe(false)
  })

  it('returns departments with actionable candidates for a completed case', () => {
    const view = getDepartmentWorkshopActivationCommandView(
      withClock(makeBase({ 'case-1': COMPLETED_CASE }), 'case-1')
    )
    expect(view.isEmpty).toBe(false)
    expect(view.hasAnyUnactivated).toBe(true)
    expect(view.departments.some((department) => department.candidates.length > 0)).toBe(true)
  })

  it('includes the route label in the candidate view', () => {
    const view = getDepartmentWorkshopActivationCommandView(
      withClock(makeBase({ 'case-1': COMPLETED_CASE }), 'case-1')
    )
    const candidate = view.departments.flatMap((department) => department.candidates)[0]
    expect(candidate?.routeLabel).toBe('Route A')
  })

  it('marks an activated department and removes its actionable candidates', () => {
    const source = withClock(
      makeBase(
        { 'case-1': COMPLETED_CASE },
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
      'case-1'
    )
    const view = getDepartmentWorkshopActivationCommandView(source)
    const bio = view.departments.find((department) => department.departmentId === DEPT_BIO)
    expect(bio?.alreadyActivated).toBe(true)
    expect(bio?.candidates).toEqual([])
  })

  it('distinguishes the all-departments-activated state from missing construction routes', () => {
    const snapshots = Object.fromEntries(
      DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments.map((department) => [
        department.id,
        {
          departmentId: department.id,
          slotCapacity: 1,
          queued: [],
          active: [],
          paused: [],
        },
      ])
    )
    const source = withClock(makeBase({ 'case-1': COMPLETED_CASE }, snapshots), 'case-1')
    const view = getDepartmentWorkshopActivationCommandView(source)
    expect(view.hasAnyUnactivated).toBe(false)
    expect(view.allDepartmentsActivated).toBe(true)
    expect(view.isEmpty).toBe(false)
  })

  it('generates unique select keys within a department candidate list', () => {
    const caseWithTwoRoutes = {
      ...COMPLETED_CASE,
      mapLayer: {
        ...COMPLETED_CASE.mapLayer,
        routes: [
          { id: 'route-a', label: 'Route A', routeClass: 'open', activeSymbolIds: [] },
          { id: 'route-b', label: 'Route B', routeClass: 'open', activeSymbolIds: [] },
        ],
      },
    }
    const view = getDepartmentWorkshopActivationCommandView(
      withClock(makeBase({ 'case-1': caseWithTwoRoutes }), 'case-1')
    )
    const firstDepartment = view.departments[0]
    expect(firstDepartment?.candidates.length).toBe(2)
    const keys = firstDepartment?.candidates.map((candidate) => candidate.selectKey) ?? []
    expect(new Set(keys).size).toBe(keys.length)
  })
})
