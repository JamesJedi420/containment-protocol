import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  applyFacilityLifecycleTransition,
  applyFacilityUpgrade,
  advanceFacilityUpgrades,
  getFacilityEffectSummary,
} from '../domain/facility'
import {
  normalizeFacilityLifecycleHistory,
  resolveFacilityLifecycleTransition,
} from '../domain/facilityLifecycle'
import type {
  FacilityLifecycleAction,
  FacilityLifecyclePrerequisite,
  FacilityLifecycleRequest,
} from '../domain/facilityLifecycle'
import type { FacilityInstance, FacilityStatus, GameState } from '../domain/models'
import {
  hydrateGame,
  migratePersistedStore,
  GAME_STORE_VERSION,
  parseRunExport,
  serializeRunExport,
} from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  BIOHAZARD_RESPONSE_FACILITY_ID,
  deriveDepartmentWorkshopSafetyFromFacilities,
} from '../domain/departmentWorkshopFacilityMapping'
import { registerDepartmentWorkshopCompletionOutcomes } from '../domain/departmentWorkshopLiveFacilitySafety'
import { advanceWeek } from '../domain/sim/advanceWeek'

const ID = BIOHAZARD_RESPONSE_FACILITY_ID

function game(status: FacilityStatus = 'available'): GameState {
  const source = createStartingState()
  return {
    ...source,
    funding: 1000,
    facilityState: {
      facilities: {
        [ID]: {
          facilityId: ID,
          category: 'biohazard_response_lab',
          level: 1,
          maxLevel: 3,
          status,
          effects: { researchSlots: 2 },
        },
      },
    },
  }
}

function facility(source: GameState): FacilityInstance {
  return source.facilityState!.facilities[ID]
}

function request(
  action: FacilityLifecycleAction,
  transition: number,
  week = 1
): FacilityLifecycleRequest {
  const statuses: Record<FacilityLifecycleAction, FacilityStatus> = {
    begin_construction: 'available',
    submit_construction: 'constructing',
    activate: 'inspecting',
    restrict: 'active',
    submit_restart: 'locked',
    reactivate: 'inspecting',
  }
  const kinds: Partial<Record<FacilityLifecycleAction, FacilityLifecyclePrerequisite['kind']>> = {
    submit_construction: 'construction_complete',
    activate: 'startup_readiness',
    reactivate: 'restart_readiness',
  }
  const kind = kinds[action]
  return {
    facilityId: ID,
    expectedStatus: statuses[action],
    transition,
    action,
    ...(kind
      ? {
          prerequisites: [
            {
              kind,
              authority: kind === 'construction_complete' ? 'SPE-110' : 'SPE-876',
              sourceRef: `verified:${kind}:${transition}`,
              facilityId: ID,
              transition,
              week,
              verified: true,
            },
          ],
        }
      : {}),
  }
}

function initialActivation(): GameState {
  let source = game()
  for (const [index, action] of (
    ['begin_construction', 'submit_construction', 'activate'] as const
  ).entries()) {
    const result = applyFacilityLifecycleTransition(source, request(action, index + 1))
    expect(result.outcome).toBe('applied')
    source = result.game
  }
  return source
}

function restartInspection(): GameState {
  const locked = applyFacilityLifecycleTransition(initialActivation(), request('restrict', 4)).game
  return applyFacilityLifecycleTransition(locked, request('submit_restart', 5)).game
}

describe('canonical whole-facility lifecycle', () => {
  it('accepts only the six authored edges and their matching inspection mode', () => {
    const available = game()
    const constructing = applyFacilityLifecycleTransition(
      available,
      request('begin_construction', 1)
    ).game
    const inspecting = applyFacilityLifecycleTransition(
      constructing,
      request('submit_construction', 2)
    ).game
    const active = applyFacilityLifecycleTransition(inspecting, request('activate', 3)).game
    const locked = applyFacilityLifecycleTransition(active, request('restrict', 4)).game
    const restarting = applyFacilityLifecycleTransition(locked, request('submit_restart', 5)).game
    const sources = [
      available,
      constructing,
      inspecting,
      active,
      locked,
      restarting,
      game('inactive'),
      game('upgrading'),
    ]
    const actions = [
      'begin_construction',
      'submit_construction',
      'activate',
      'restrict',
      'submit_restart',
      'reactivate',
    ] as const
    for (const [index, source] of sources.entries()) {
      const history = facility(source).lifecycleHistory
      const sequence = history && 'transitions' in history ? history.transitions.length + 1 : 1
      for (const action of actions) {
        const result = applyFacilityLifecycleTransition(source, request(action, sequence))
        const allowed = index < 6 && action === actions[index]
        expect(result.outcome, `${index}:${action}`).toBe(allowed ? 'applied' : 'rejected')
        if (!allowed) expect(result.game).toBe(source)
      }
    }
  })

  it('does not mutate frozen caller state or prerequisite bundles', () => {
    const source = game()
    Object.freeze(facility(source).effects)
    Object.freeze(facility(source))
    Object.freeze(source.facilityState!.facilities)
    Object.freeze(source.facilityState)
    Object.freeze(source)
    const constructing = applyFacilityLifecycleTransition(
      source,
      Object.freeze(request('begin_construction', 1))
    ).game
    const input = request('submit_construction', 2)
    Object.freeze(input.prerequisites![0])
    Object.freeze(input.prerequisites)
    Object.freeze(input)
    expect(applyFacilityLifecycleTransition(constructing, input).outcome).toBe('applied')
    expect(facility(source).status).toBe('available')
  })
  it('traverses construction, inspection, startup, restriction and renewed restart without changing identity or installed effects', () => {
    const start = game()
    let source = start
    const actions = [
      'begin_construction',
      'submit_construction',
      'activate',
      'restrict',
      'submit_restart',
      'reactivate',
    ] as const
    const statuses = ['constructing', 'inspecting', 'active', 'locked', 'inspecting', 'active']
    for (const [index, action] of actions.entries()) {
      const next = applyFacilityLifecycleTransition(source, request(action, index + 1))
      expect(next.outcome).toBe('applied')
      expect(next.receipt).toMatchObject({
        transition: index + 1,
        week: 1,
        action,
        to: statuses[index],
      })
      expect(facility(next.game)).toMatchObject({
        facilityId: ID,
        level: 1,
        maxLevel: 3,
        status: statuses[index],
      })
      expect(facility(next.game).effects).toBe(facility(start).effects)
      expect(next.game.staff).toBe(start.staff)
      expect(next.game.funding).toBe(start.funding)
      expect(facility(source).status).not.toBe(statuses[index])
      source = next.game
    }
    const history = facility(source).lifecycleHistory
    expect(
      history && 'transitions' in history && history.transitions.map((entry) => entry.cause)
    ).toEqual([
      'construction_authorized',
      'construction_verified',
      'startup_readiness_verified',
      'operation_restricted',
      'restart_inspection_requested',
      'restart_readiness_verified',
    ])
    expect(facility(start).lifecycleHistory).toBeUndefined()
    expect(getFacilityEffectSummary(source)).toEqual(getFacilityEffectSummary(start))
    expect(source).toEqual(
      actions.reduce(
        (state, action, index) =>
          applyFacilityLifecycleTransition(state, request(action, index + 1)).game,
        start
      )
    )
  })

  it('preserves exact state on replay, including in a later campaign week, and rejects conflicting or old receipts', () => {
    const active = initialActivation()
    expect(applyFacilityLifecycleTransition(active, request('activate', 3))).toMatchObject({
      outcome: 'unchanged',
      game: active,
    })
    expect(applyFacilityLifecycleTransition(active, request('activate', 3)).game).toBe(active)
    const later = { ...active, week: 2 }
    expect(applyFacilityLifecycleTransition(later, request('activate', 3)).game).toBe(later)
    expect(applyFacilityLifecycleTransition(later, request('activate', 3)).outcome).toBe(
      'unchanged'
    )
    const conflict = request('activate', 3)
    expect(
      applyFacilityLifecycleTransition(active, {
        ...conflict,
        prerequisites: [{ ...conflict.prerequisites![0], sourceRef: 'different' }],
      }).reason
    ).toBe('stale_transition')
    expect(applyFacilityLifecycleTransition(active, request('begin_construction', 1)).reason).toBe(
      'stale_transition'
    )
    expect(applyFacilityLifecycleTransition(active, request('restrict', 5)).reason).toBe(
      'stale_transition'
    )
  })

  it('requires the correct inspection provenance and distinct restart verification', () => {
    const restart = restartInspection()
    expect(applyFacilityLifecycleTransition(restart, request('activate', 6)).reason).toBe(
      'inspection_provenance_required'
    )
    const restartRequest = request('reactivate', 6)
    const startupFact = request('activate', 6).prerequisites!
    expect(
      applyFacilityLifecycleTransition(restart, { ...restartRequest, prerequisites: startupFact })
        .reason
    ).toBe('invalid_prerequisite')
    expect(applyFacilityLifecycleTransition(restart, restartRequest).outcome).toBe('applied')
    const firstInspection = applyFacilityLifecycleTransition(
      applyFacilityLifecycleTransition(game(), request('begin_construction', 1)).game,
      request('submit_construction', 2)
    ).game
    expect(applyFacilityLifecycleTransition(firstInspection, request('reactivate', 3)).reason).toBe(
      'inspection_provenance_required'
    )
  })

  it('classifies older gated receipts as stale before validating them against a later campaign week', () => {
    const activated = initialActivation()
    const restarting = restartInspection()
    const reactivated = applyFacilityLifecycleTransition(
      { ...restarting, week: 2 },
      request('reactivate', 6, 2)
    ).game
    const restrictedAgain = applyFacilityLifecycleTransition(
      { ...reactivated, week: 3 },
      request('restrict', 7, 3)
    ).game
    const cases = [
      [activated, request('submit_construction', 2)],
      [restarting, request('activate', 3)],
      [restrictedAgain, request('reactivate', 6, 2)],
    ] as const
    for (const [source, historical] of cases) {
      for (const week of [source.week, source.week + 1]) {
        const current = { ...source, week }
        const result = applyFacilityLifecycleTransition(current, historical)
        expect(result.reason).toBe('stale_transition')
        expect(result.game).toBe(current)
      }
    }
  })

  it.each([
    'available',
    'constructing',
    'inspecting',
    'active',
    'upgrading',
    'inactive',
    'locked',
  ] as const)('rejects non-authored restrict edges from %s without mutation', (status) => {
    const source = game(status)
    const result = applyFacilityLifecycleTransition(source, {
      ...request('restrict', 1),
      expectedStatus: status,
    })
    if (status === 'active') expect(result.outcome).toBe('applied')
    else {
      expect(result.outcome).toBe('rejected')
      expect(result.game).toBe(source)
    }
  })

  it('rejects stale status, absent facility, unsafe identity, invalid week, and malformed requests', () => {
    const source = game('inactive')
    expect(applyFacilityLifecycleTransition(source, request('begin_construction', 1)).reason).toBe(
      'stale_status'
    )
    expect(
      applyFacilityLifecycleTransition(source, { ...request('restrict', 1), facilityId: 'missing' })
        .reason
    ).toBe('missing_facility')
    for (const raw of [
      null,
      {},
      { ...request('restrict', 1), facilityId: '__proto__' },
      { ...request('restrict', 1), transition: 0 },
      { ...request('restrict', 1), action: 'destroy' },
    ]) {
      const result = applyFacilityLifecycleTransition(source, raw as FacilityLifecycleRequest)
      expect(result.reason).toBe('invalid_request')
      expect(result.game).toBe(source)
    }
    expect(
      resolveFacilityLifecycleTransition(facility(source), request('restrict', 1), NaN).reason
    ).toBe('invalid_campaign_week')
  })

  it.each([undefined, []])('rejects missing construction verification %j', (prerequisites) => {
    const source = applyFacilityLifecycleTransition(game(), request('begin_construction', 1)).game
    const result = applyFacilityLifecycleTransition(source, {
      ...request('submit_construction', 2),
      prerequisites,
    })
    expect(result.reason).toBe('missing_prerequisite')
    expect(result.game).toBe(source)
  })

  it.each([
    null,
    {},
    [null],
    new Array(1),
    [{ ...request('submit_construction', 2).prerequisites![0], verified: false }],
    [{ ...request('submit_construction', 2).prerequisites![0], authority: 'SPE-876' }],
    [{ ...request('submit_construction', 2).prerequisites![0], facilityId: 'other' }],
    [{ ...request('submit_construction', 2).prerequisites![0], sourceRef: '' }],
    [{ ...request('submit_construction', 2).prerequisites![0], transition: 1 }],
    [{ ...request('submit_construction', 2).prerequisites![0], week: 2 }],
  ])('rejects malformed/wrong-owner/wrong-identity/stale verification %j', (prerequisites) => {
    const source = applyFacilityLifecycleTransition(game(), request('begin_construction', 1)).game
    const result = applyFacilityLifecycleTransition(source, {
      ...request('submit_construction', 2),
      prerequisites,
    } as FacilityLifecycleRequest)
    expect(result.reason).toBe('invalid_prerequisite')
    expect(result.game).toBe(source)
  })

  it('blocks missing startup and restart authority without inventing readiness', () => {
    const active = initialActivation()
    const inspecting = applyFacilityLifecycleTransition(
      applyFacilityLifecycleTransition(game(), request('begin_construction', 1)).game,
      request('submit_construction', 2)
    ).game
    expect(
      applyFacilityLifecycleTransition(inspecting, {
        ...request('activate', 3),
        prerequisites: undefined,
      }).reason
    ).toBe('missing_prerequisite')
    expect(
      applyFacilityLifecycleTransition(restartInspection(), {
        ...request('reactivate', 6),
        prerequisites: undefined,
      }).reason
    ).toBe('missing_prerequisite')
    expect(facility(active).status).toBe('active')
  })
})

describe('lifecycle persistence and upgrade compatibility', () => {
  it('round-trips every authored phase through manual save, export, and persisted-store migration', () => {
    let source = game()
    for (const [index, action] of (
      [
        'begin_construction',
        'submit_construction',
        'activate',
        'restrict',
        'submit_restart',
        'reactivate',
      ] as const
    ).entries()) {
      source = applyFacilityLifecycleTransition(source, request(action, index + 1)).game
      const saved = loadGameSave(serializeGameSave(source))
      const exported = parseRunExport(serializeRunExport(source))
      const migrated = migratePersistedStore({ game: source }, GAME_STORE_VERSION)
      for (const loaded of [saved, exported, migrated.game]) {
        expect(loaded.facilityState).toEqual(source.facilityState)
        expect(
          applyFacilityLifecycleTransition(loaded as GameState, request(action, index + 1)).outcome
        ).toBe('unchanged')
      }
    }
  })

  it('preserves legacy facilities without fabricated history and repairs unproven new states', () => {
    for (const status of ['available', 'active', 'locked', 'inactive'] as const) {
      expect(facility(hydrateGame(game(status))).status).toBe(status)
      expect(facility(hydrateGame(game(status))).lifecycleHistory).toBeUndefined()
    }
    for (const status of ['constructing', 'inspecting'] as const) {
      const loaded = hydrateGame(game(status))
      expect(facility(loaded).status).toBe('inactive')
      expect(applyFacilityLifecycleTransition(game(status), request('activate', 1)).reason).toBe(
        'lifecycle_unavailable'
      )
    }
  })

  it.each([
    'null',
    'empty',
    'sequence',
    'future',
    'chronology',
    'cause',
    'edge',
    'status',
    'evidence',
    'sparse',
    'version',
    'inherited',
  ])('retains unavailable authority after malformed %s history and repeated save/load', (kind) => {
    const source = initialActivation()
    const valid = JSON.parse(JSON.stringify(facility(source).lifecycleHistory))
    let invalid: unknown = valid
    if (kind === 'null') invalid = null
    if (kind === 'empty') valid.transitions = []
    if (kind === 'sequence') valid.transitions[1].transition = 1
    if (kind === 'future') valid.transitions[2].week = 2
    if (kind === 'chronology') {
      source.week = 2
      valid.transitions[0].week = 2
    }
    if (kind === 'cause') valid.transitions[2].cause = 'operation_restricted'
    if (kind === 'edge') valid.transitions[1].from = 'active'
    if (kind === 'status') valid.transitions.pop()
    if (kind === 'evidence') valid.transitions[2].prerequisites[0].verified = false
    if (kind === 'sparse') valid.transitions = new Array(3)
    if (kind === 'version') valid.version = 2
    if (kind === 'inherited') invalid = Object.assign(Object.create({ unavailable: true }), valid)
    facility(source).lifecycleHistory = invalid as FacilityInstance['lifecycleHistory']
    const result = applyFacilityLifecycleTransition(source, request('restrict', 4, source.week))
    expect(result.reason).toBe('lifecycle_unavailable')
    expect(result.game).toBe(source)
    for (const loaded of [
      hydrateGame(source),
      loadGameSave(serializeGameSave(source)),
      parseRunExport(serializeRunExport(source)),
    ]) {
      expect(facility(loaded).lifecycleHistory).toEqual({ version: 1, unavailable: true })
      expect(facility(loadGameSave(serializeGameSave(loaded))).lifecycleHistory).toEqual({
        version: 1,
        unavailable: true,
      })
    }
  })

  it('normalizes invalid provenance on inspecting to inactive without making history usable', () => {
    const source = game('inspecting')
    facility(source).lifecycleHistory = { version: 1, unavailable: true }
    const loaded = hydrateGame(source)
    expect(facility(loaded)).toMatchObject({
      status: 'inactive',
      lifecycleHistory: { version: 1, unavailable: true },
    })
  })

  it('preserves an active tracked facility through timed upgrade, hydration, pending effects, completion and lifecycle resumption', () => {
    const active = initialActivation()
    const upgrade = applyFacilityUpgrade(active, ID, {
      costMoney: 0,
      buildWeeks: 2,
      effectDeltas: { researchSlots: 1 },
    })
    expect(facility(upgrade)).toMatchObject({
      status: 'upgrading',
      upgradeStartedWeek: 1,
      upgradeCompleteWeek: 3,
      pendingEffectDeltas: { researchSlots: 1 },
    })
    expect(applyFacilityLifecycleTransition(upgrade, request('restrict', 4)).reason).toBe(
      'upgrade_in_progress'
    )
    const loaded = loadGameSave(serializeGameSave(upgrade))
    expect(facility(loaded)).toEqual(facility(upgrade))
    expect(advanceFacilityUpgrades({ ...loaded, week: 2 })).toMatchObject({
      facilityState: loaded.facilityState,
    })
    const completed = advanceFacilityUpgrades({ ...loaded, week: 3 })
    expect(facility(completed)).toMatchObject({
      status: 'active',
      level: 2,
      effects: { researchSlots: 3 },
    })
    expect(facility(completed).pendingEffectDeltas).toBeUndefined()
    expect(facility(completed).lifecycleHistory).toEqual(facility(active).lifecycleHistory)
    expect(facility(loadGameSave(serializeGameSave(completed)))).toEqual({
      ...facility(completed),
      upgradeInProgress: undefined,
    })
    expect(applyFacilityLifecycleTransition(completed, request('restrict', 4, 3)).outcome).toBe(
      'applied'
    )
    expect(advanceFacilityUpgrades(completed)).toBe(completed)
  })

  it('retains SPE-2549 upgrade timing repair precedence over new lifecycle statuses', () => {
    const source = game('constructing')
    facility(source).upgradeInProgress = true
    facility(source).upgradeStartedWeek = 1
    facility(source).upgradeCompleteWeek = 3
    facility(source).pendingEffectDeltas = { researchSlots: 1 }
    expect(facility(hydrateGame(source))).toMatchObject({
      status: 'upgrading',
      upgradeInProgress: true,
      upgradeCompleteWeek: 3,
    })
    facility(source).upgradeStartedWeek = undefined
    const repaired = facility(hydrateGame(source))
    expect(repaired.status).toBe('inactive')
    expect(repaired.upgradeCompleteWeek).toBeUndefined()
    expect(repaired.pendingEffectDeltas).toBeUndefined()
  })

  it('rejects a disconnected history rather than repairing it into readiness', () => {
    const history = facility(restartInspection()).lifecycleHistory!
    if (!('transitions' in history)) throw new Error('missing history')
    const disconnected = { version: 1, transitions: [history.transitions[2]] }
    expect(normalizeFacilityLifecycleHistory(disconnected, ID, 'active', 1)).toEqual({
      version: 1,
      unavailable: true,
    })
  })
})

describe('existing live workshop consumer', () => {
  it('carries the restricted and restored lifecycle into real campaign week-close safety outcomes', () => {
    const active = initialActivation()
    active.cases = Object.fromEntries(
      Object.entries(active.cases).map(([id, current]) => [
        id,
        { ...current, status: 'resolved' as const, assignedTeamIds: [], weeksRemaining: 0 },
      ])
    )
    active.events = []
    active.reports = []
    active.departmentWorkshopWorkOrders = {
      'work:lifecycle-close': {
        id: 'work:lifecycle-close',
        departmentId: 'department:biohazard-response',
        caseId: 'case-001',
        taskType: 'research_case',
        requiredWork: 1,
      },
    }
    active.departmentWorkshopSnapshots = {
      'department:biohazard-response': {
        departmentId: 'department:biohazard-response',
        slotCapacity: 1,
        queued: [],
        active: [{ workOrderId: 'work:lifecycle-close', completedWork: 0 }],
        paused: [],
      },
    }
    active.departmentWorkshopCompletionOutcomes = {}
    const locked = applyFacilityLifecycleTransition(active, request('restrict', 4)).game
    const inspecting = applyFacilityLifecycleTransition(locked, request('submit_restart', 5)).game
    const restored = applyFacilityLifecycleTransition(inspecting, request('reactivate', 6)).game
    for (const [source, safety] of [
      [active, 'safe'],
      [locked, 'unsafe'],
      [inspecting, 'unsafe'],
      [restored, 'safe'],
    ] as const) {
      const closed = advanceWeek(source)
      expect(closed.departmentWorkshopCompletionOutcomes?.['work:lifecycle-close']).toMatchObject({
        outcome: 'completed',
        safety,
      })
      expect(facility(closed).status).toBe(facility(source).status)
      expect(facility(closed).lifecycleHistory).toEqual(facility(source).lifecycleHistory)
    }
  })

  it('grades completion from the transitioned canonical status and retains the original safety receipt on replay', () => {
    const active = initialActivation()
    active.departmentWorkshopWorkOrders = {
      'work:lifecycle': {
        id: 'work:lifecycle',
        departmentId: 'department:biohazard-response',
        caseId: 'case-001',
        taskType: 'research_case',
        requiredWork: 1,
      },
    }
    active.departmentWorkshopCompletionOutcomes = {}
    const locked = applyFacilityLifecycleTransition(active, request('restrict', 4)).game
    const inspecting = applyFacilityLifecycleTransition(locked, request('submit_restart', 5)).game
    const reopened = applyFacilityLifecycleTransition(inspecting, request('reactivate', 6)).game
    for (const [source, safety] of [
      [active, 'safe'],
      [locked, 'unsafe'],
      [inspecting, 'unsafe'],
      [reopened, 'safe'],
    ] as const) {
      const result = registerDepartmentWorkshopCompletionOutcomes(
        source,
        ['work:lifecycle'],
        source.week
      )
      expect(result.outcomes['work:lifecycle'].safety).toBe(safety)
      expect(
        deriveDepartmentWorkshopSafetyFromFacilities(source, 'department:records-analysis')
      ).toEqual({ isolation: 'good', ventilation: 'good', ppe: 'good', dualAuth: 'good' })
    }
    const unsafe = registerDepartmentWorkshopCompletionOutcomes(locked, ['work:lifecycle'], 1)
    const replay = registerDepartmentWorkshopCompletionOutcomes(
      { ...reopened, departmentWorkshopCompletionOutcomes: unsafe.outcomes },
      ['work:lifecycle'],
      1
    )
    expect(replay.outcomes['work:lifecycle'].safety).toBe('unsafe')
    expect(replay.outcomes['work:lifecycle']).toEqual(unsafe.outcomes['work:lifecycle'])
  })
})
