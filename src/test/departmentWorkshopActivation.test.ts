import { afterEach, describe, expect, it } from 'vitest'

import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { useGameStore } from '../app/store/gameStore'
import { createStartingState } from '../data/startingState'
import {
  activateDepartmentWorkshopFromConstruction,
  type DepartmentWorkshopActivationRequest,
} from '../domain/departmentWorkshopActivation'
import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  type DepartmentCapabilityRegistry,
} from '../domain/departmentCapabilities'
import {
  advanceCaseConstructionClock,
  CONSTRUCTION_PROGRESS_MAX,
} from '../domain/constructionProgress'
import type { CaseInstance, GameState } from '../domain/models'

const DEPARTMENT_ID = 'department:records-analysis'
const CASE_ID = 'case:workshop-construction'
const ROUTE_ID = 'route:workshop-access'

function request(
  overrides: Partial<DepartmentWorkshopActivationRequest> = {}
): DepartmentWorkshopActivationRequest {
  return {
    departmentId: DEPARTMENT_ID,
    constructionCaseId: CASE_ID,
    structuralRouteId: ROUTE_ID,
    slotCapacity: 2,
    ...overrides,
  }
}

function constructionCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  const base = createStartingState().cases['case-001']!
  return {
    ...base,
    id: CASE_ID,
    title: 'Records workshop construction',
    status: 'in_progress',
    spatialFlags: ['ingress:service_door'],
    mapLayer: {
      authoringMode: 'map-metadata-first',
      legend: [],
      zones: [],
      routes: [
        {
          id: ROUTE_ID,
          label: 'Workshop access',
          routeClass: 'open',
          activeSymbolIds: [],
        },
      ],
      occupierKnownRouteIds: [ROUTE_ID],
      scaleAnchors: [],
    },
    ...overrides,
  }
}

function constructionState(options: { complete?: boolean; case?: CaseInstance } = {}): GameState {
  const currentCase = options.case ?? constructionCase()
  const state = createStartingState()
  const withCase = {
    ...state,
    cases: { ...state.cases, [currentCase.id]: currentCase },
  }
  return options.complete === false
    ? withCase
    : advanceCaseConstructionClock(withCase, currentCase, CONSTRUCTION_PROGRESS_MAX)
}

function reasonCodes(result: ReturnType<typeof activateDepartmentWorkshopFromConstruction>) {
  return result.reasons.map((reason) => reason.code)
}

afterEach(() => {
  useGameStore.getState().reset()
})

describe('department workshop activation from construction (SPE-2788)', () => {
  it('creates one immutable empty snapshot after construction and exact route proof', () => {
    const source = constructionState()
    const before = structuredClone(source)

    const result = activateDepartmentWorkshopFromConstruction(source, request())

    expect(result.state).toBe('activated')
    expect(result.reasons).toEqual([])
    expect(result.workshopState.workOrders).toEqual({})
    expect(result.workshopState.snapshots).toEqual({
      [DEPARTMENT_ID]: {
        departmentId: DEPARTMENT_ID,
        slotCapacity: 2,
        queued: [],
        active: [],
        paused: [],
      },
    })
    expect(source).toEqual(before)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.workshopState)).toBe(true)
    expect(Object.isFrozen(result.workshopState.snapshots)).toBe(true)
    expect(Object.isFrozen(result.workshopState.snapshots[DEPARTMENT_ID])).toBe(true)
    expect(Object.isFrozen(result.workshopState.snapshots[DEPARTMENT_ID].queued)).toBe(true)
  })

  it('normalizes omitted legacy workshop registries before activation', () => {
    const legacySource = { ...constructionState() }
    delete legacySource.departmentWorkshopWorkOrders
    delete legacySource.departmentWorkshopSnapshots

    const result = activateDepartmentWorkshopFromConstruction(legacySource, request())

    expect(result.state).toBe('activated')
    expect(result.workshopState.workOrders).toEqual({})
    expect(result.workshopState.snapshots[DEPARTMENT_ID].slotCapacity).toBe(2)
  })

  it('fails closed until both construction completion and structural route evidence exist', () => {
    const missingCase = activateDepartmentWorkshopFromConstruction(createStartingState(), request())
    const incomplete = activateDepartmentWorkshopFromConstruction(
      constructionState({ complete: false }),
      request()
    )
    const missingMapCase = constructionCase({ mapLayer: undefined })
    const missingMap = activateDepartmentWorkshopFromConstruction(
      constructionState({ case: missingMapCase }),
      request()
    )
    const missingRouteCase = constructionCase({
      mapLayer: {
        ...constructionCase().mapLayer!,
        routes: [],
        occupierKnownRouteIds: [],
      },
    })
    const missingRoute = activateDepartmentWorkshopFromConstruction(
      constructionState({ case: missingRouteCase }),
      request()
    )

    expect(reasonCodes(missingCase)).toEqual(['missing-construction-case'])
    expect(reasonCodes(incomplete)).toEqual(['construction-incomplete'])
    expect(reasonCodes(missingMap)).toEqual(['missing-map-layer'])
    expect(reasonCodes(missingRoute)).toEqual(['missing-structural-route'])
    for (const result of [missingCase, incomplete, missingMap, missingRoute]) {
      expect(result.state).toBe('blocked')
      expect(result.workshopState.snapshots).toEqual({})
    }
  })

  it('rejects invalid requests, unknown departments, and malformed workshop state', () => {
    const state = constructionState()
    const invalidId = activateDepartmentWorkshopFromConstruction(
      state,
      request({ departmentId: ` ${DEPARTMENT_ID}` })
    )
    const invalidCapacity = activateDepartmentWorkshopFromConstruction(
      state,
      request({ slotCapacity: 0 })
    )
    const unknownDepartment = activateDepartmentWorkshopFromConstruction(
      state,
      request({ departmentId: 'department:unknown' })
    )
    const invalidRegistry = activateDepartmentWorkshopFromConstruction(state, request(), {
      departments: [],
      fallbackDepartmentRefs: [],
    })
    const malformedState = activateDepartmentWorkshopFromConstruction(
      {
        ...state,
        departmentWorkshopSnapshots: {
          [DEPARTMENT_ID]: {
            departmentId: DEPARTMENT_ID,
            slotCapacity: -1,
            queued: [],
            active: [],
            paused: [],
          },
        },
      },
      request()
    )

    expect(reasonCodes(invalidId)).toEqual(['invalid-activation-request'])
    expect(reasonCodes(invalidCapacity)).toEqual(['invalid-activation-request'])
    expect(reasonCodes(unknownDepartment)).toEqual(['missing-department-definition'])
    expect(reasonCodes(invalidRegistry)).toEqual(['invalid-department-registry'])
    expect(reasonCodes(malformedState)).toEqual(['invalid-workshop-state'])
  })

  it('treats an identical empty activation as unchanged and rejects conflicting capacity', () => {
    const source = constructionState()
    const first = activateDepartmentWorkshopFromConstruction(source, request())
    const activatedState = {
      ...source,
      departmentWorkshopWorkOrders: first.workshopState.workOrders,
      departmentWorkshopSnapshots: first.workshopState.snapshots,
    }

    const replay = activateDepartmentWorkshopFromConstruction(activatedState, request())
    const conflict = activateDepartmentWorkshopFromConstruction(
      activatedState,
      request({ slotCapacity: 3 })
    )
    const occupiedState = {
      ...source,
      departmentWorkshopWorkOrders: {
        'work:existing': {
          id: 'work:existing',
          departmentId: DEPARTMENT_ID,
          caseId: 'case:existing',
          taskType: 'research_case',
          requiredWork: 2,
        },
      },
      departmentWorkshopSnapshots: {
        [DEPARTMENT_ID]: {
          departmentId: DEPARTMENT_ID,
          slotCapacity: 2,
          queued: [{ workOrderId: 'work:existing', completedWork: 0 }],
          active: [],
          paused: [],
        },
      },
    } satisfies GameState
    const occupied = activateDepartmentWorkshopFromConstruction(occupiedState, request())

    expect(replay.state).toBe('unchanged')
    expect(replay.reasons).toEqual([])
    expect(replay.workshopState).toEqual(first.workshopState)
    expect(conflict.state).toBe('blocked')
    expect(reasonCodes(conflict)).toEqual(['workshop-already-active'])
    expect(conflict.workshopState.snapshots[DEPARTMENT_ID].slotCapacity).toBe(2)
    expect(reasonCodes(occupied)).toEqual(['workshop-already-active'])
    expect(occupied.workshopState.snapshots[DEPARTMENT_ID].queued).toHaveLength(1)
  })

  it('is deterministic across registry and persisted-map insertion order', () => {
    const source = constructionState()
    const first = activateDepartmentWorkshopFromConstruction(source, request())
    const secondDepartmentId = 'department:biohazard-response'
    const reorderedSource = {
      ...source,
      departmentWorkshopSnapshots: {
        [secondDepartmentId]: {
          departmentId: secondDepartmentId,
          slotCapacity: 1,
          queued: [],
          active: [],
          paused: [],
        },
      },
    }
    const reorderedRegistry: DepartmentCapabilityRegistry = {
      departments: [...DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments].reverse(),
      fallbackDepartmentRefs: [
        ...DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.fallbackDepartmentRefs,
      ].reverse(),
    }
    const withExisting = activateDepartmentWorkshopFromConstruction(
      reorderedSource,
      request(),
      reorderedRegistry
    )

    expect(first.state).toBe('activated')
    expect(withExisting.state).toBe('activated')
    expect(Object.keys(withExisting.workshopState.snapshots)).toEqual([
      secondDepartmentId,
      DEPARTMENT_ID,
    ])
    expect(withExisting.workshopState.snapshots[DEPARTMENT_ID]).toEqual(
      first.workshopState.snapshots[DEPARTMENT_ID]
    )
  })

  it('persists only activated store results and survives save hydration', () => {
    const source = constructionState()
    useGameStore.setState({ game: source })

    const activated = useGameStore.getState().activateDepartmentWorkshopFromConstruction(request())
    const activatedGame = useGameStore.getState().game
    const loaded = loadGameSave(serializeGameSave(activatedGame))

    expect(activated.state).toBe('activated')
    expect(activatedGame.departmentWorkshopSnapshots[DEPARTMENT_ID]).toEqual(
      activated.workshopState.snapshots[DEPARTMENT_ID]
    )
    expect(loaded.departmentWorkshopSnapshots[DEPARTMENT_ID]).toEqual(
      activated.workshopState.snapshots[DEPARTMENT_ID]
    )

    const unchangedGame = useGameStore.getState().game
    const unchanged = useGameStore.getState().activateDepartmentWorkshopFromConstruction(request())
    expect(unchanged.state).toBe('unchanged')
    expect(useGameStore.getState().game).toBe(unchangedGame)

    const blockedGame = useGameStore.getState().game
    const blocked = useGameStore
      .getState()
      .activateDepartmentWorkshopFromConstruction(request({ slotCapacity: 3 }))
    expect(blocked.state).toBe('blocked')
    expect(useGameStore.getState().game).toBe(blockedGame)
  })
})
