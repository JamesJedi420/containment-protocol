import { describe, it, expect } from 'vitest'
import { getDepartmentWorkshopActivationCommandView } from './departmentWorkshopActivationCommandView'
import { CONSTRUCTION_PROGRESS_MAX, getConstructionProgressClockId } from '../../domain/constructionProgress'
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
  it('returns isEmpty=true when no construction-complete cases exist', () => {
    const source = makeBase({}) as GameState
    const view = getDepartmentWorkshopActivationCommandView(source)
    expect(view.isEmpty).toBe(true)
    expect(view.hasAnyUnactivated).toBe(false)
  })

  it('returns departments with candidates for a completed case', () => {
    const source = withClock(makeBase({ 'case-1': COMPLETED_CASE }), 'case-1')
    const view = getDepartmentWorkshopActivationCommandView(source)
    expect(view.isEmpty).toBe(false)
    expect(view.departments.some((d) => d.candidates.length > 0)).toBe(true)
  })

  it('includes route label in candidate view', () => {
    const source = withClock(makeBase({ 'case-1': COMPLETED_CASE }), 'case-1')
    const view = getDepartmentWorkshopActivationCommandView(source)
    const candidate = view.departments.flatMap((d) => d.candidates)[0]
    expect(candidate?.routeLabel).toBe('Route A')
  })

  it('marks alreadyActivated=true when department snapshot exists', () => {
    const source = withClock(
      makeBase(
        { 'case-1': COMPLETED_CASE },
        { [DEPT_BIO]: { departmentId: DEPT_BIO, slotCapacity: 1, queued: [], active: [], paused: [] } }
      ),
      'case-1'
    )
    const view = getDepartmentWorkshopActivationCommandView(source)
    const bio = view.departments.find((d) => d.departmentId === DEPT_BIO)
    expect(bio?.alreadyActivated).toBe(true)
  })

  it('hasAnyUnactivated=false when all departments with candidates are already activated', () => {
    const allDeptIds = [
      'department:biohazard-response',
      'department:concept-embodiment-research',
      'department:emergency-response',
      'department:ethics-review',
      'department:field-containment',
      'department:general-intake',
      'department:procurement-logistics',
      'department:records-analysis',
    ]
    const snapshots = Object.fromEntries(
      allDeptIds.map((id) => [id, { departmentId: id, slotCapacity: 1, queued: [], active: [], paused: [] }])
    )
    const source = withClock(makeBase({ 'case-1': COMPLETED_CASE }, snapshots), 'case-1')
    const view = getDepartmentWorkshopActivationCommandView(source)
    expect(view.hasAnyUnactivated).toBe(false)
  })

  it('generates unique selectKeys within a single department candidate list', () => {
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
    const source = withClock(makeBase({ 'case-1': caseWithTwoRoutes }), 'case-1')
    const view = getDepartmentWorkshopActivationCommandView(source)
    const firstDept = view.departments[0]
    if (!firstDept || firstDept.candidates.length < 2) return
    const keys = firstDept.candidates.map((c) => c.selectKey)
    const uniqueKeys = new Set(keys)
    expect(keys.length).toBe(uniqueKeys.size)
  })
})
