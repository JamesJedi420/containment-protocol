import { CONSTRUCTION_INCOMPLETE_FLAG } from './constructionProgress'
import type { CaseInstance, GameState } from './models'

export type StrategicActionPressureLaneId =
  | 'site-incursion'
  | 'recovery'
  | 'construction'
  | 'authority-visit'
  | 'investigation'
  | 'exploration'
  | 'administration'

export interface StrategicActionPressureLaneScore {
  id: StrategicActionPressureLaneId
  label: string
  score: number
}

export interface StrategicActionBudgetProjection {
  configured: boolean
  totalBudget: number
  committedDemand: number
  remainingBudget: number
  deficit: number
  constrained: boolean
  pressureLanes: StrategicActionPressureLaneScore[]
  leadLane: StrategicActionPressureLaneScore | null
}

const LANE_DEFINITIONS: ReadonlyArray<{
  id: StrategicActionPressureLaneId
  label: string
  tags: readonly string[]
}> = [
  { id: 'site-incursion', label: 'Site incursion', tags: [] },
  { id: 'recovery', label: 'Recovery', tags: ['recovery', 'expedition', 'reintegration', 'medical'] },
  {
    id: 'construction',
    label: 'Construction',
    tags: ['construction', 'fabrication', 'site-work'],
  },
  {
    id: 'authority-visit',
    label: 'Authority visit',
    tags: ['authority', 'government', 'institution', 'police'],
  },
  {
    id: 'investigation',
    label: 'Investigation',
    tags: ['investigation', 'intel', 'evidence', 'signal', 'cyber', 'witness'],
  },
  {
    id: 'exploration',
    label: 'Exploration',
    tags: ['exploration', 'recon', 'scout', 'survey', 'relay'],
  },
  {
    id: 'administration',
    label: 'Administration',
    tags: ['administration', 'procurement', 'training', 'funding', 'logistics'],
  },
]

const LANE_PRIORITY: StrategicActionPressureLaneId[] = [
  'site-incursion',
  'recovery',
  'construction',
  'authority-visit',
  'investigation',
  'exploration',
  'administration',
]

function hasAnyTag(haystack: readonly string[], needles: readonly string[]) {
  return needles.some((needle) => haystack.includes(needle))
}

function isCommittedDeployment(currentCase: CaseInstance) {
  return currentCase.status === 'in_progress' && currentCase.assignedTeamIds.length > 0
}

function classifyDeploymentLane(currentCase: CaseInstance): StrategicActionPressureLaneId {
  if (currentCase.kind === 'raid') {
    return 'site-incursion'
  }

  if (currentCase.spatialFlags?.includes(CONSTRUCTION_INCOMPLETE_FLAG)) {
    return 'construction'
  }

  const mergedTags = [...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags]

  for (const laneId of LANE_PRIORITY) {
    if (laneId === 'site-incursion') continue

    const definition = LANE_DEFINITIONS.find((entry) => entry.id === laneId)
    if (!definition || definition.tags.length === 0) continue

    if (hasAnyTag(mergedTags, definition.tags)) {
      return laneId
    }
  }

  const dominantWeight = Object.entries(currentCase.weights).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1]
    }

    return left[0].localeCompare(right[0])
  })[0]?.[0]

  if (dominantWeight === 'investigation') return 'investigation'
  if (dominantWeight === 'utility') return 'exploration'

  return 'administration'
}

function comparePressureLaneScores(
  left: StrategicActionPressureLaneScore,
  right: StrategicActionPressureLaneScore
) {
  const scoreDelta = right.score - left.score
  if (scoreDelta !== 0) {
    return scoreDelta
  }

  return left.id.localeCompare(right.id)
}

function buildPressureLaneScores(deployments: CaseInstance[]): StrategicActionPressureLaneScore[] {
  const counts = new Map<StrategicActionPressureLaneId, number>()

  for (const currentCase of deployments) {
    const laneId = classifyDeploymentLane(currentCase)
    counts.set(laneId, (counts.get(laneId) ?? 0) + 1)
  }

  return LANE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    label: definition.label,
    score: counts.get(definition.id) ?? 0,
  }))
    .filter((lane) => lane.score > 0)
    .sort(comparePressureLaneScores)
}

export function projectStrategicActionBudget(game: GameState): StrategicActionBudgetProjection {
  const configured = typeof game.agency?.supportAvailable === 'number'
  const totalBudget = configured ? Math.max(0, Math.trunc(game.agency!.supportAvailable!)) : 0
  const deployments = Object.values(game.cases).filter(isCommittedDeployment)
  const committedDemand = deployments.length
  const remainingBudget = Math.max(0, totalBudget - committedDemand)
  const deficit = Math.max(0, committedDemand - totalBudget)
  const constrained = configured && deficit > 0
  const pressureLanes = buildPressureLaneScores(deployments)
  const leadLane = pressureLanes[0] ?? null

  return {
    configured,
    totalBudget,
    committedDemand,
    remainingBudget,
    deficit,
    constrained,
    pressureLanes,
    leadLane,
  }
}
