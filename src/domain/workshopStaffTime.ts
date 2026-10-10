import type { GameState } from './models'
import { readDepartmentWorkshopState } from './departmentWorkshopQueue'
import {
  commitStaffTime,
  normalizeStaffTimeLedger,
  queryStaffTimeAllocation,
  releaseStaffTime,
} from './staffTimeAllocation'
import type { StaffTimeRequest, StaffTimeResult } from './staffTimeAllocation'
import {
  deriveArchiveAnalystSlotsFromMappedAgents,
  projectSpecialistLaborGateInputsByWorkOrderId,
  resolveWeekCloseSpecialistLaborOperatorSlots,
} from './specialistLaborOperatorFeed'

export function queryWorkshopStaffTime(game: GameState) {
  const allocation = queryStaffTimeAllocation(game)
  const state = readDepartmentWorkshopState(game)
  const pending = new Set(
    Object.values(state.snapshots).flatMap((s) =>
      [...s.queued, ...s.active].map((item) => item.workOrderId)
    )
  )
  const orders = Object.values(state.workOrders)
    .filter((order) => order.taskType === 'records_review' && pending.has(order.id))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const staff = allocation.availableIds
    .filter((key) => allocation.capacity.byStaffId[key].specialty === 'analysis')
    .map((key) => ({
      id: key,
      label:
        'name' in game.staff[key] && typeof game.staff[key].name === 'string'
          ? game.staff[key].name
          : key,
    }))
  return {
    ...allocation,
    orders,
    staff,
    week: game.week,
    receipts: allocation.commitments.filter((c) => c.destination.startsWith('workshop:')),
  }
}

export function reserveWorkshopStaffTime(
  game: GameState,
  request: StaffTimeRequest
): StaffTimeResult {
  const query = queryWorkshopStaffTime(game)
  if (query.unavailable) return { game, status: 'blocked', reason: 'malformed_source' }
  if (query.commitments.some((c) => c.id === request?.id)) return commitStaffTime(game, request)
  const destination = request?.destination
  const order = query.orders.find((o) => `workshop:${o.id}` === destination)
  if (
    !order ||
    request.staffIds?.length !== 1 ||
    query.capacity.byStaffId[request.staffIds[0]]?.specialty !== 'analysis' ||
    (request.displacedAlternative !== null &&
      !query.orders.some((o) => `workshop:${o.id}` === request.displacedAlternative)) ||
    request.id !== `workshop:${game.week}:${order.id}`
  )
    return { game, status: 'blocked', reason: 'invalid_request' }
  return commitStaffTime(game, request)
}

export function releaseWorkshopStaffTime(
  game: GameState,
  commitmentId: string,
  revision: string
): StaffTimeResult {
  const prior = queryStaffTimeAllocation(game).commitments.find((c) => c.id === commitmentId)
  if (!prior?.destination.startsWith('workshop:'))
    return { game, status: 'blocked', reason: 'invalid_request' }
  return releaseStaffTime(game, commitmentId, revision)
}

/** Transient per-order eligibility; specialist cache and personnel truth stay untouched. */
export function projectWorkshopAllocatedLabor(
  game: GameState,
  legacyOperators?: Parameters<typeof projectSpecialistLaborGateInputsByWorkOrderId>[1]
) {
  const baselineOperators =
    legacyOperators ?? resolveWeekCloseSpecialistLaborOperatorSlots(game).operators
  if (game.staffTimeAllocations === undefined)
    return projectSpecialistLaborGateInputsByWorkOrderId(
      game.departmentWorkshopWorkOrders,
      baselineOperators
    )
  const query = queryStaffTimeAllocation(game)
  const hasAgent = deriveArchiveAnalystSlotsFromMappedAgents(game.agents, undefined) !== undefined
  const allocationAffectsArchive =
    query.unavailable ||
    query.active.some((c) => c.postIds.some((post) => post.startsWith('staff-post:analysis:')))
  const orders = readDepartmentWorkshopState(game).workOrders
  return Object.fromEntries(
    Object.values(orders).flatMap((order) => {
      const own = query.active.find((c) => c.destination === `workshop:${order.id}`)
      if (!own && !allocationAffectsArchive) {
        const gate = projectSpecialistLaborGateInputsByWorkOrderId(
          { [order.id]: order },
          baselineOperators
        )
        return gate ? Object.entries(gate) : []
      }
      const allowed = new Set(
        own ? (query.usableCommitmentIds.includes(own.id) ? own.staffIds : []) : query.availableIds
      )
      const hasStaff =
        !query.unavailable &&
        [...allowed].some(
          (key) =>
            query.capacity.byStaffId[key]?.specialty === 'analysis' &&
            query.capacity.byStaffId[key]?.effectiveCapacity > 0
        )
      const operators =
        hasAgent || hasStaff
          ? baselineOperators
          : baselineOperators.filter((slot) => slot.roleFamily !== 'archive_analyst')
      const gate = projectSpecialistLaborGateInputsByWorkOrderId({ [order.id]: order }, operators)
      return gate ? Object.entries(gate) : []
    })
  )
}

/** Workshop explicitly ends its processing-week window after the attempt. */
export function finishWorkshopStaffTimeWindow(
  game: GameState,
  completedWeek: number
): GameState['staffTimeAllocations'] {
  const ledger = normalizeStaffTimeLedger(game.staffTimeAllocations)
  if (ledger === undefined || 'unavailable' in ledger) return ledger
  if (!Number.isSafeInteger(completedWeek) || completedWeek !== game.week)
    return game.staffTimeAllocations
  return {
    version: 1,
    commitments: ledger.commitments.map((c) =>
      c.status === 'active' && c.week <= completedWeek && c.destination.startsWith('workshop:')
        ? { ...c, status: 'released' }
        : c
    ),
  }
}
