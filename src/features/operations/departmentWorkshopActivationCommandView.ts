import type { GameState } from '../../domain/models'
import {
  projectDepartmentWorkshopActivationCandidates,
  type DepartmentWorkshopActivationRouteCandidate,
} from '../../domain/departmentWorkshopActivationProjection'

export interface DepartmentWorkshopActivationCandidateView {
  constructionCaseId: string
  structuralRouteId: string
  routeLabel: string
  selectKey: string
}

export interface DepartmentWorkshopActivationDepartmentView {
  departmentId: string
  departmentLabel: string
  alreadyActivated: boolean
  candidates: readonly DepartmentWorkshopActivationCandidateView[]
}

export interface DepartmentWorkshopActivationCommandView {
  isEmpty: boolean
  hasAnyUnactivated: boolean
  departments: readonly DepartmentWorkshopActivationDepartmentView[]
}

function toCandidateView(
  candidate: DepartmentWorkshopActivationRouteCandidate
): DepartmentWorkshopActivationCandidateView {
  return {
    constructionCaseId: candidate.constructionCaseId,
    structuralRouteId: candidate.structuralRouteId,
    routeLabel: candidate.structuralRouteLabel,
    selectKey: `${candidate.constructionCaseId}::${candidate.structuralRouteId}`,
  }
}

export function getDepartmentWorkshopActivationCommandView(
  game: GameState
): DepartmentWorkshopActivationCommandView {
  const candidateList = projectDepartmentWorkshopActivationCandidates(game)

  const departments: DepartmentWorkshopActivationDepartmentView[] = candidateList.departments.map(
    ({ department, alreadyActivated, candidates }) => ({
      departmentId: department.id,
      departmentLabel: department.label,
      alreadyActivated,
      candidates: candidates.map(toCandidateView),
    })
  )

  const isEmpty = departments.every((d) => d.candidates.length === 0)
  const hasAnyUnactivated = departments.some((d) => !d.alreadyActivated && d.candidates.length > 0)

  return { isEmpty, hasAnyUnactivated, departments }
}
