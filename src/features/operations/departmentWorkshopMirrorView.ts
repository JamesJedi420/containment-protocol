import type { GameState } from '../../domain/models'
import {
  readDepartmentWorkshopState,
  sanitizeDepartmentWorkshopCompletionOutcomes,
  type DepartmentWorkshopCompletionOutcome,
  type DepartmentWorkshopSnapshot,
  type DepartmentWorkshopWorkOrder,
} from '../../domain/departmentWorkshopQueue'
import { sanitizeDepartmentWorkshopUnsafeSecondaryIncidents } from '../../domain/departmentWorkshopUnsafeIncident'
import {
  formatDepartmentWorkshopBlockerLabel,
  formatDepartmentWorkshopLaneLabel,
  formatDepartmentWorkshopQualityLabel,
  formatDepartmentWorkshopQualityReasonLabel,
  formatDepartmentWorkshopSafetyLabel,
  formatDepartmentWorkshopSafetyReasonLabel,
  formatDepartmentWorkshopTaskTypeLabel,
  resolveDepartmentWorkshopBlockers,
  type DepartmentWorkshopBlockerCode,
  type DepartmentWorkshopLane,
} from '../../domain/departmentWorkshopSurfacing'

export interface DepartmentWorkshopMirrorWorkItemView {
  workOrderId: string
  caseId: string
  taskTypeLabel: string
  laneLabel: string
  progressLabel: string
  completedWork: number
  requiredWork: number
}

export interface DepartmentWorkshopMirrorBlockerView {
  code: DepartmentWorkshopBlockerCode
  label: string
}

export interface DepartmentWorkshopMirrorDepartmentView {
  departmentId: string
  slotCapacity: number
  freeSlots: number
  activeCount: number
  queuedCount: number
  pausedCount: number
  blockers: readonly DepartmentWorkshopMirrorBlockerView[]
  workItems: readonly DepartmentWorkshopMirrorWorkItemView[]
}

export interface DepartmentWorkshopMirrorOutcomeView {
  workOrderId: string
  departmentId: string
  caseId: string
  taskTypeLabel: string
  completedWeekLabel: string
  qualityLabel: string
  qualityReasonLabel: string | undefined
  safetyLabel: string
  safetyReasonLabel: string | undefined
}

export interface DepartmentWorkshopMirrorConsequenceView {
  workOrderId: string
  departmentId: string
  caseId: string
  spawnedCaseId: string
  qualityLabel: string
  safetyLabel: string
}

export interface DepartmentWorkshopMirrorSummaryView {
  departmentCount: number
  activeWorkCount: number
  queuedWorkCount: number
  pausedWorkCount: number
  outcomeCount: number
  consequenceCount: number
  week: number
}

export interface DepartmentWorkshopMirrorView {
  isEmpty: boolean
  summary: DepartmentWorkshopMirrorSummaryView
  departments: readonly DepartmentWorkshopMirrorDepartmentView[]
  outcomesEmpty: boolean
  outcomes: readonly DepartmentWorkshopMirrorOutcomeView[]
  consequencesEmpty: boolean
  consequences: readonly DepartmentWorkshopMirrorConsequenceView[]
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function toWorkItemView(
  lane: DepartmentWorkshopLane,
  workOrderId: string,
  completedWork: number,
  workOrder: DepartmentWorkshopWorkOrder | undefined
): DepartmentWorkshopMirrorWorkItemView {
  const requiredWork = workOrder?.requiredWork ?? 0
  return Object.freeze({
    workOrderId,
    caseId: workOrder?.caseId ?? '—',
    taskTypeLabel: workOrder
      ? formatDepartmentWorkshopTaskTypeLabel(workOrder.taskType)
      : '—',
    laneLabel: formatDepartmentWorkshopLaneLabel(lane),
    progressLabel: `${completedWork}/${requiredWork}`,
    completedWork,
    requiredWork,
  })
}

function listLaneItems(
  lane: DepartmentWorkshopLane,
  items: readonly { workOrderId: string; completedWork: number }[],
  workOrders: Readonly<Record<string, DepartmentWorkshopWorkOrder>>
): DepartmentWorkshopMirrorWorkItemView[] {
  return items.map((item) =>
    toWorkItemView(lane, item.workOrderId, item.completedWork, workOrders[item.workOrderId])
  )
}

function toDepartmentView(
  snapshot: DepartmentWorkshopSnapshot,
  workOrders: Readonly<Record<string, DepartmentWorkshopWorkOrder>>
): DepartmentWorkshopMirrorDepartmentView {
  const freeSlots = Math.max(0, snapshot.slotCapacity - snapshot.active.length)
  const blockerCodes = resolveDepartmentWorkshopBlockers(snapshot)
  const workItems = Object.freeze([
    ...listLaneItems('active', snapshot.active, workOrders),
    ...listLaneItems('queued', snapshot.queued, workOrders),
    ...listLaneItems('paused', snapshot.paused, workOrders),
  ])

  return Object.freeze({
    departmentId: snapshot.departmentId,
    slotCapacity: snapshot.slotCapacity,
    freeSlots,
    activeCount: snapshot.active.length,
    queuedCount: snapshot.queued.length,
    pausedCount: snapshot.paused.length,
    blockers: Object.freeze(
      blockerCodes.map((code) =>
        Object.freeze({
          code,
          label: formatDepartmentWorkshopBlockerLabel(code),
        })
      )
    ),
    workItems,
  })
}

function toOutcomeView(outcome: DepartmentWorkshopCompletionOutcome): DepartmentWorkshopMirrorOutcomeView {
  return Object.freeze({
    workOrderId: outcome.workOrderId,
    departmentId: outcome.departmentId,
    caseId: outcome.caseId,
    taskTypeLabel: formatDepartmentWorkshopTaskTypeLabel(outcome.taskType),
    completedWeekLabel:
      Number.isFinite(outcome.completedWeek) && outcome.completedWeek >= 1
        ? `W${outcome.completedWeek}`
        : '—',
    qualityLabel: formatDepartmentWorkshopQualityLabel(outcome.quality),
    qualityReasonLabel:
      outcome.qualityReason !== undefined
        ? formatDepartmentWorkshopQualityReasonLabel(outcome.qualityReason)
        : undefined,
    safetyLabel: formatDepartmentWorkshopSafetyLabel(outcome.safety),
    safetyReasonLabel:
      outcome.safetyReason !== undefined
        ? formatDepartmentWorkshopSafetyReasonLabel(outcome.safetyReason)
        : undefined,
  })
}

/** Read-only mirror over hydrated workshop registries; does not re-grade or invent truth. */
export function getDepartmentWorkshopMirrorView(game: GameState): DepartmentWorkshopMirrorView {
  const { workOrders, snapshots } = readDepartmentWorkshopState(game)
  const outcomes = sanitizeDepartmentWorkshopCompletionOutcomes(
    game.departmentWorkshopCompletionOutcomes
  )
  const incidentMarkers = sanitizeDepartmentWorkshopUnsafeSecondaryIncidents(
    game.departmentWorkshopUnsafeSecondaryIncidents
  )

  const departments = Object.keys(snapshots)
    .sort(compareCodeUnits)
    .map((departmentId) => toDepartmentView(snapshots[departmentId]!, workOrders))

  const outcomeViews = Object.keys(outcomes)
    .sort(compareCodeUnits)
    .map((workOrderId) => toOutcomeView(outcomes[workOrderId]!))

  const consequences = Object.keys(incidentMarkers)
    .sort(compareCodeUnits)
    .map((workOrderId) => {
      const outcome = outcomes[workOrderId]
      const workOrder = workOrders[workOrderId]
      return Object.freeze({
        workOrderId,
        departmentId: outcome?.departmentId ?? workOrder?.departmentId ?? '—',
        caseId: outcome?.caseId ?? workOrder?.caseId ?? '—',
        spawnedCaseId: incidentMarkers[workOrderId]!,
        qualityLabel: outcome
          ? formatDepartmentWorkshopQualityLabel(outcome.quality)
          : '—',
        safetyLabel: outcome
          ? formatDepartmentWorkshopSafetyLabel(outcome.safety)
          : '—',
      })
    })

  const activeWorkCount = departments.reduce((sum, dept) => sum + dept.activeCount, 0)
  const queuedWorkCount = departments.reduce((sum, dept) => sum + dept.queuedCount, 0)
  const pausedWorkCount = departments.reduce((sum, dept) => sum + dept.pausedCount, 0)

  const isEmpty =
    departments.length === 0 &&
    outcomeViews.length === 0 &&
    consequences.length === 0

  return Object.freeze({
    isEmpty,
    summary: Object.freeze({
      departmentCount: departments.length,
      activeWorkCount,
      queuedWorkCount,
      pausedWorkCount,
      outcomeCount: outcomeViews.length,
      consequenceCount: consequences.length,
      week: game.week,
    }),
    departments: Object.freeze(departments),
    outcomesEmpty: outcomeViews.length === 0,
    outcomes: Object.freeze(outcomeViews),
    consequencesEmpty: consequences.length === 0,
    consequences: Object.freeze(consequences),
  })
}
