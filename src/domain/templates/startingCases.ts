import { type CaseInstance } from '../models'
import { inferFactionIdFromCaseTags } from '../factions'
import { createMissionIntelState } from '../intel'
import { inferCasePressureValue, inferCaseRegionTag } from '../pressure'
import { caseTemplateMap } from './caseTemplates'

export interface StarterCaseSeed {
  id: string
  templateId: string
  title?: string
  description?: string
  stage?: number
  status?: CaseInstance['status']
  deadlineRemaining?: number
  assignedTeamIds?: string[]
}

function normalizeCaseStatus(status: StarterCaseSeed['status']) {
  if (status === 'open' || status === 'in_progress' || status === 'resolved') {
    return status
  }

  return 'open'
}

function normalizeStage(stage: number | undefined) {
  if (typeof stage !== 'number' || !Number.isFinite(stage)) {
    return 1
  }

  return Math.min(5, Math.max(1, Math.trunc(stage)))
}

function normalizeDeadlineRemaining(deadlineRemaining: number | undefined, fallback: number) {
  if (typeof deadlineRemaining !== 'number' || !Number.isFinite(deadlineRemaining)) {
    return fallback
  }

  return Math.max(0, Math.trunc(deadlineRemaining))
}

export const starterCaseSeeds: StarterCaseSeed[] = [
  {
    id: 'case-001',
    templateId: 'combat_vampire_nest',
    deadlineRemaining: 2,
  },
  {
    id: 'case-002',
    templateId: 'puzzle_whispering_archive',
    deadlineRemaining: 1,
  },
  {
    id: 'case-003',
    templateId: 'mixed_eclipse_ritual',
  },
]

export function createStarterCase(seed: StarterCaseSeed): CaseInstance {
  const template = caseTemplateMap[seed.templateId]

  if (!template) {
    throw new Error(`Unknown starter case template: ${seed.templateId}`)
  }

  return {
    id: seed.id,
    templateId: template.templateId,
    title: seed.title ?? template.title,
    description: seed.description ?? template.description,
    factionId: template.factionId ?? inferFactionIdFromCaseTags(template),
    contactId: template.contactId,
    mode: template.mode,
    kind: template.kind,
    status: normalizeCaseStatus(seed.status),
    difficulty: { ...template.difficulty },
    weights: { ...template.weights },
    tags: [...template.tags],
    requiredTags: [...(template.requiredTags ?? [])],
    requiredRoles: [...(template.requiredRoles ?? [])],
    preferredTags: [...(template.preferredTags ?? [])],
    stage: normalizeStage(seed.stage),
    durationWeeks: template.durationWeeks,
    deadlineWeeks: template.deadlineWeeks,
    deadlineRemaining: normalizeDeadlineRemaining(seed.deadlineRemaining, template.deadlineWeeks),
    pressureValue: template.pressureValue ?? inferCasePressureValue(template),
    regionTag: template.regionTag ?? inferCaseRegionTag(template),
    ...createMissionIntelState(1),
    assignedTeamIds: [...new Set(seed.assignedTeamIds ?? [])],
    onFail: {
      ...template.onFail,
      spawnCount: { ...template.onFail.spawnCount },
      spawnTemplateIds: [...template.onFail.spawnTemplateIds],
    },
    onUnresolved: {
      ...template.onUnresolved,
      spawnCount: { ...template.onUnresolved.spawnCount },
      spawnTemplateIds: [...template.onUnresolved.spawnTemplateIds],
    },
    raid: template.raid ? { ...template.raid } : undefined,
  }
}

export const starterCases = Object.fromEntries(
  starterCaseSeeds.map((seed) => {
    const starterCase = createStarterCase(seed)
    return [starterCase.id, starterCase]
  })
)
