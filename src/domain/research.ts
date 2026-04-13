import type {
  ResearchState,
  GameState,
  FacilityState,
  ResearchProject,
  ResearchUnlock,
  ResearchUnlockCategory,
} from './models'
import { INTEL_CALIBRATION } from './sim/calibration'

export const INTEL_DEGRADATION_REDUCTION_PER_INTEL_TOOL =
  INTEL_CALIBRATION.researchReductionPerIntelTool
export const MIN_INTEL_DEGRADATION_MULTIPLIER = INTEL_CALIBRATION.researchMitigationFloor

export interface ResearchIntelModifiers {
  confidenceDecayMultiplier: number
  uncertaintyGrowthMultiplier: number
  completedIntelProjectIds: string[]
}

export interface ResearchRequirementAssessment {
  satisfied: boolean
  missingIds: string[]
}

// --- Research System Core ---

export function createInitialResearchState(): ResearchState {
  return {
    projects: {},
    activeProjectIds: [],
    queuedProjectIds: [],
    completedProjectIds: [],
    availableProjectIds: [],
    blockedProjectIds: [],
    researchSlots: 1,
    researchSpeedMultiplier: 1,
    researchDataPool: 0,
    researchMaterialsPool: 0,
  }
}

export function queueResearchProject(state: ResearchState, projectId: string): ResearchState {
  // Only allow available projects to be queued
  if (!state.availableProjectIds.includes(projectId)) return state
  return {
    ...state,
    queuedProjectIds: [...state.queuedProjectIds, projectId],
    availableProjectIds: state.availableProjectIds.filter((id) => id !== projectId),
    projects: {
      ...state.projects,
      [projectId]: {
        ...state.projects[projectId],
        status: 'queued',
      },
    },
  }
}

export function activateResearchProjects(state: ResearchState, week: number, facilityState?: FacilityState): ResearchState {
  // Determine available slots (facility effects may add slots)
  const slots = state.researchSlots + (facilityState?.facilities ? Object.values(facilityState.facilities).reduce((sum, f) => sum + (f.effects.researchSlots || 0), 0) : 0)
  const speed = state.researchSpeedMultiplier * (facilityState?.facilities ? Object.values(facilityState.facilities).reduce((mul, f) => mul * (f.effects.researchSpeedMultiplier || 1), 1) : 1)
  const active = [...state.activeProjectIds]
  const queued = [...state.queuedProjectIds]
  const projects = { ...state.projects }
  while (active.length < slots && queued.length > 0) {
    // Deterministic: queue order, then lexical
    queued.sort()
    const nextId = queued.shift()!
    active.push(nextId)
    projects[nextId] = {
      ...projects[nextId],
      status: 'active',
      startedWeek: week,
      lastUpdatedWeek: week,
    }
  }
  return {
    ...state,
    activeProjectIds: active,
    queuedProjectIds: queued,
    projects,
    researchSlots: slots,
    researchSpeedMultiplier: speed,
  }
}

export function advanceResearchProgress(state: ResearchState, week: number, dataPool: number, materialsPool: number): ResearchState {
  const projects = { ...state.projects }
  const completed: string[] = []
  const active = [...state.activeProjectIds]
  let dataUsed = 0
  let materialsUsed = 0
  for (const projectId of active) {
    const project = projects[projectId]
    if (!project || project.status !== 'active') continue
    // Progress is deterministic: time, data, materials
    const progressTime = (project.progressTime || 0) + 1
    let progressData = (project.progressData || 0)
    let progressMaterials = (project.progressMaterials || 0)
    if (project.costData > 0 && dataPool - dataUsed > 0) {
      progressData += 1
      dataUsed += 1
    }
    if (project.costMaterials > 0 && materialsPool - materialsUsed > 0) {
      progressMaterials += 1
      materialsUsed += 1
    }
    // Check for completion
    const timeDone = progressTime >= project.costTime
    const dataDone = project.costData === 0 || progressData >= project.costData
    const materialsDone = project.costMaterials === 0 || progressMaterials >= project.costMaterials
    if (timeDone && dataDone && materialsDone) {
      completed.push(projectId)
      projects[projectId] = {
        ...project,
        status: 'completed',
        completedWeek: week,
        progressTime,
        progressData,
        progressMaterials,
        lastUpdatedWeek: week,
      }
    } else {
      projects[projectId] = {
        ...project,
        progressTime,
        progressData,
        progressMaterials,
        lastUpdatedWeek: week,
      }
    }
  }
  return {
    ...state,
    projects,
    activeProjectIds: active.filter((id) => !completed.includes(id)),
    completedProjectIds: [...state.completedProjectIds, ...completed],
    researchDataPool: state.researchDataPool - dataUsed,
    researchMaterialsPool: state.researchMaterialsPool - materialsUsed,
  }
}

function uniqueSortedIds(ids: readonly string[]) {
  return [...new Set(ids.filter((id) => id.length > 0))].sort((left, right) =>
    left.localeCompare(right)
  )
}

function getCompletedResearchProjects(
  game: Pick<GameState, 'researchState'>
): ResearchProject[] {
  const researchState = game.researchState

  if (!researchState) {
    return []
  }

  return uniqueSortedIds(researchState.completedProjectIds)
    .map((projectId) => researchState.projects[projectId])
    .filter(
      (project): project is ResearchProject =>
        Boolean(project) && project.status === 'completed'
    )
}

export function getCompletedResearchUnlocks(
  game: Pick<GameState, 'researchState'>,
  categories?: readonly ResearchUnlockCategory[]
): ResearchUnlock[] {
  const categoryFilter = categories ? new Set(categories) : null
  const unlockMap = new Map<string, ResearchUnlock>()

  for (const project of getCompletedResearchProjects(game)) {
    for (const unlock of project.unlocks) {
      if (categoryFilter && !categoryFilter.has(unlock.category)) {
        continue
      }

      unlockMap.set(unlock.id, { ...unlock })
    }
  }

  return [...unlockMap.values()].sort((left, right) => left.id.localeCompare(right.id))
}

export function getCompletedResearchUnlockIds(
  game: Pick<GameState, 'researchState'>,
  categories?: readonly ResearchUnlockCategory[]
) {
  return getCompletedResearchUnlocks(game, categories).map((unlock) => unlock.id)
}

export function hasCompletedResearch(
  game: Pick<GameState, 'researchState'>,
  researchId: string
) {
  if (researchId.length === 0) {
    return false
  }

  const completedProjectIds = new Set(
    getCompletedResearchProjects(game).map((project) => project.projectId)
  )

  if (completedProjectIds.has(researchId)) {
    return true
  }

  return getCompletedResearchUnlockIds(game).includes(researchId)
}

export function assessResearchRequirements(
  game: Pick<GameState, 'researchState'>,
  requiredResearchIds: readonly string[] = []
): ResearchRequirementAssessment {
  const missingIds = uniqueSortedIds(requiredResearchIds).filter(
    (researchId) => !hasCompletedResearch(game, researchId)
  )

  return {
    satisfied: missingIds.length === 0,
    missingIds,
  }
}

export function getResearchIntelModifiers(
  game: Pick<GameState, 'researchState'>
): ResearchIntelModifiers {
  const completedIntelProjectIds = getCompletedResearchProjects(game)
    .filter((project) =>
      project.unlocks.some((unlock) => unlock.category === 'intel_tool')
    )
    .map((project) => project.projectId)
  const reduction = completedIntelProjectIds.length * INTEL_DEGRADATION_REDUCTION_PER_INTEL_TOOL
  const multiplier = Math.max(
    MIN_INTEL_DEGRADATION_MULTIPLIER,
    Number((1 - reduction).toFixed(2))
  )

  return {
    confidenceDecayMultiplier: multiplier,
    uncertaintyGrowthMultiplier: multiplier,
    completedIntelProjectIds,
  }
}

export function applyResearchUnlocks(game: GameState): GameState {
  // For each completed project, apply unlocks if not already applied
  // (Integration with gear, intel, mission, training, facility, etc. is handled downstream)
  // This function can be extended for direct unlock application if needed
  return game
}

export function recomputeResearchState(state: ResearchState, week: number, facilityState?: FacilityState): ResearchState {
  // Recompute available, blocked, and queued projects based on prerequisites and facility state
  const completed = new Set(state.completedProjectIds)
  const available: string[] = []
  const blocked: string[] = []
  const projects = { ...state.projects }
  for (const [id, project] of Object.entries(projects)) {
    // Skip completed
    if (project.status === 'completed') continue
    const blockedReasons: string[] = []
    // Check research prerequisites
    if (project.requiredResearchIds && project.requiredResearchIds.length > 0) {
      for (const reqId of project.requiredResearchIds) {
        if (!completed.has(reqId)) blockedReasons.push(`missing_research:${reqId}`)
      }
    }
    // Check facility prerequisites
    if (project.requiredFacilityLevels && project.requiredFacilityLevels.length > 0 && facilityState) {
      for (const req of project.requiredFacilityLevels) {
        const fac = facilityState.facilities[req.facilityId]
        if (!fac || fac.level < req.level) blockedReasons.push(`facility_${req.facilityId}_level_${req.level}`)
      }
    }
    if (blockedReasons.length > 0) {
      blocked.push(id)
      projects[id] = { ...project, status: 'blocked', blockedReasons, lastUpdatedWeek: week }
    } else if (project.status === 'locked' || project.status === 'blocked') {
      available.push(id)
      projects[id] = { ...project, status: 'available', blockedReasons: [], lastUpdatedWeek: week }
    }
  }
  return {
    ...state,
    availableProjectIds: available,
    blockedProjectIds: blocked,
    projects,
  }
}
