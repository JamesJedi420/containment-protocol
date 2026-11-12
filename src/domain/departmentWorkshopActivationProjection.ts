import {
  DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY,
  type DepartmentCapabilityRegistry,
  type DepartmentDefinition,
} from './departmentCapabilities'
import { isConstructionComplete } from './constructionProgress'
import type { GameState } from './models'

export interface DepartmentWorkshopActivationRouteCandidate {
  readonly departmentId: string
  readonly constructionCaseId: string
  readonly structuralRouteId: string
  readonly structuralRouteLabel: string
}

export interface DepartmentWorkshopActivationDepartmentCandidates {
  readonly department: DepartmentDefinition
  readonly alreadyActivated: boolean
  readonly candidates: readonly DepartmentWorkshopActivationRouteCandidate[]
}

export interface DepartmentWorkshopActivationCandidateList {
  readonly departments: readonly DepartmentWorkshopActivationDepartmentCandidates[]
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Projects eligible department workshop activation candidates from GameState.
 * Activated departments remain visible for presentation but never expose
 * actionable construction-route candidates.
 */
export function projectDepartmentWorkshopActivationCandidates(
  source: GameState,
  registry: DepartmentCapabilityRegistry = DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY
): DepartmentWorkshopActivationCandidateList {
  const snapshots: Record<string, unknown> = isRecord(source.departmentWorkshopSnapshots)
    ? source.departmentWorkshopSnapshots
    : {}
  const sortedCaseIds = Object.keys(source.cases ?? {}).sort(compareCodeUnits)
  const sortedDepartments = [...registry.departments].sort((a, b) => compareCodeUnits(a.id, b.id))

  const departments: DepartmentWorkshopActivationDepartmentCandidates[] = sortedDepartments.map(
    (department) => {
      const alreadyActivated = Object.prototype.hasOwnProperty.call(snapshots, department.id)
      if (alreadyActivated) {
        return { department, alreadyActivated, candidates: [] }
      }

      const candidates: DepartmentWorkshopActivationRouteCandidate[] = []
      for (const caseId of sortedCaseIds) {
        if (!isConstructionComplete(source, caseId)) continue
        const routes = source.cases[caseId]?.mapLayer?.routes
        if (!Array.isArray(routes) || routes.length === 0) continue

        const sortedRoutes = [...routes].sort((a, b) => compareCodeUnits(a.id, b.id))
        for (const route of sortedRoutes) {
          if (typeof route?.id !== 'string' || route.id.length === 0) continue
          candidates.push({
            departmentId: department.id,
            constructionCaseId: caseId,
            structuralRouteId: route.id,
            structuralRouteLabel: typeof route.label === 'string' ? route.label : route.id,
          })
        }
      }

      return { department, alreadyActivated, candidates }
    }
  )

  return { departments }
}
