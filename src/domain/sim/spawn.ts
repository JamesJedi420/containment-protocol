import { randInt } from '../math'
import { type CaseInstance, type CaseTemplate, type GameState, type SpawnRule } from '../models'
import { inferCasePressureValue, inferCaseRegionTag } from '../pressure'
import { SIM_NOTES } from '../../data/copy'
import { EVENT_NOTE_BUILDERS } from './eventNoteBuilders'

export interface SpawnedCaseRecord {
  caseId: string
  trigger:
    | 'failure'
    | 'unresolved'
    | 'raid_pressure'
    | 'world_activity'
    | 'faction_pressure'
    | 'pressure_threshold'
  parentCaseId?: string
  factionId?: string
  factionLabel?: string
  sourceReason?: string
}

function nextId(usedIds: Set<string>, rng: () => number): string {
  let id = ''

  do {
    id = `case-spawned-${randInt(rng, 1000, 999999999)}`
  } while (usedIds.has(id))

  usedIds.add(id)

  return id
}

function pickTemplateId(
  templates: Record<string, CaseTemplate>,
  requestedTemplateIds: string[],
  rng: () => number
) {
  const candidates = requestedTemplateIds.map((templateId) => templates[templateId]).filter(Boolean)

  if (candidates.length > 0) {
    return candidates[randInt(rng, 0, candidates.length - 1)]!
  }

  const templateList = Object.values(templates)

  if (templateList.length === 0) {
    throw new Error('No templates available in state')
  }

  return templateList[randInt(rng, 0, templateList.length - 1)]!
}

function pickRuleTemplate(
  templates: Record<string, CaseTemplate>,
  requestedTemplateIds: string[],
  rng: () => number
) {
  const requestedTemplates = requestedTemplateIds
    .map((templateId) => templates[templateId])
    .filter(Boolean)

  if (requestedTemplates.length > 0) {
    return requestedTemplates[randInt(rng, 0, requestedTemplates.length - 1)]
  }

  const allTemplates = Object.values(templates)
  if (allTemplates.length === 0) {
    return undefined
  }

  return allTemplates[randInt(rng, 0, allTemplates.length - 1)]
}

export function instantiateFromTemplate(
  template: CaseTemplate,
  rng: () => number,
  usedIds: Set<string> = new Set()
): CaseInstance {
  return {
    id: nextId(usedIds, rng),
    templateId: template.templateId,
    title: template.title,
    description: template.description,
    mode: template.mode,
    kind: template.kind,
    status: 'open',
    difficulty: { ...template.difficulty },
    weights: { ...template.weights },
    tags: [...template.tags],
    requiredTags: [...(template.requiredTags ?? [])],
    requiredRoles: [...(template.requiredRoles ?? [])],
    preferredTags: [...(template.preferredTags ?? [])],
    stage: 1,
    durationWeeks: template.durationWeeks,
    deadlineWeeks: template.deadlineWeeks,
    deadlineRemaining: template.deadlineWeeks,
    pressureValue: template.pressureValue ?? inferCasePressureValue(template),
    regionTag: template.regionTag ?? inferCaseRegionTag(template),
    assignedTeamIds: [],
    onFail: { ...template.onFail },
    onUnresolved: { ...template.onUnresolved },
    raid: template.raid,
  }
}

export function applySpawnRule(
  parent: CaseInstance,
  rule: SpawnRule,
  templates: Record<string, CaseTemplate>,
  rng: () => number,
  usedIds: Set<string> = new Set()
) {
  const notes: string[] = []

  let mutated: CaseInstance = {
    ...parent,
    stage: Math.min(parent.stage + rule.stageDelta, 5),
    status: 'open',
    assignedTeamIds: [],
    weeksRemaining: undefined,
    deadlineRemaining: rule.deadlineResetWeeks ?? parent.deadlineWeeks,
  }

  if (rule.convertToRaidAtStage !== undefined && mutated.stage >= rule.convertToRaidAtStage) {
    mutated = {
      ...mutated,
      kind: 'raid',
      raid: mutated.raid ?? { minTeams: 2, maxTeams: 2 },
    }
    notes.push(SIM_NOTES.convertedToRaid())
  }

  // SPE-38: Default spawnCount to { min: 0, max: 0 } if missing for robust testability
  const spawnCount = rule.spawnCount ?? { min: 0, max: 0 }
  const count = randInt(rng, spawnCount.min, spawnCount.max)
  const spawned: CaseInstance[] = []

  for (let i = 0; i < count; i++) {
    const template = pickRuleTemplate(templates, rule.spawnTemplateIds, rng)
    if (!template) {
      continue
    }

    spawned.push(instantiateFromTemplate(template, rng, usedIds))
  }

  if (spawned.length > 0) {
    notes.push(SIM_NOTES.spawnFollowUp(spawned.length))
  }

  return { mutated, spawned, notes }
}

/**
 * Spawn a new case from a template stored in state.templates.
 */
export function spawnCase(
  state: GameState,
  parentCase: CaseInstance | null,
  reason: 'escalation' | 'raid',
  templateIds: string[] = [],
  rng: () => number,
  usedIds: Set<string> = new Set(Object.keys(state.cases))
): CaseInstance {
  const template = pickTemplateId(state.templates, templateIds, rng)
  const stage = parentCase ? Math.min(parentCase.stage + 1, 5) : 1
  const spawnedCase = instantiateFromTemplate(template, rng, usedIds)

  return {
    ...spawnedCase,
    title: reason === 'raid' ? `${template.title} / Raid spillover` : template.title,
    kind: reason === 'raid' ? 'raid' : template.kind,
    stage,
    raid: reason === 'raid' ? (template.raid ?? { minTeams: 2, maxTeams: 2 }) : template.raid,
  }
}

function spawnFromCaseRule(
  state: GameState,
  sourceCaseIds: string[],
  getRule: (currentCase: CaseInstance) => SpawnRule,
  trigger: SpawnedCaseRecord['trigger'],
  rng: () => number
) {
  const usedIds = new Set(Object.keys(state.cases))
  const notes: string[] = []
  const spawnedEntries = sourceCaseIds.flatMap((caseId) => {
    const sourceCase = state.cases[caseId]

    if (!sourceCase) {
      return []
    }

    const rule = getRule(sourceCase)
    const { spawned, notes: ruleNotes } = applySpawnRule(
      sourceCase,
      rule,
      state.templates,
      rng,
      usedIds
    )

    ruleNotes.forEach((note) => {
      if (note === SIM_NOTES.convertedToRaid()) {
        notes.push(EVENT_NOTE_BUILDERS.raidConverted(sourceCase.id, sourceCase.title).content)
        return
      }

      if (note === SIM_NOTES.spawnFollowUp(spawned.length)) {
        notes.push(
          EVENT_NOTE_BUILDERS.spawnFollowUp(sourceCase.id, sourceCase.title, spawned.length).content
        )
        return
      }

      notes.push(`${sourceCase.title}: ${note}`)
    })

    return spawned.map((spawnedCase) => {
      const nextCase = {
        ...spawnedCase,
        stage: Math.min(sourceCase.stage + 1, 5),
      }

      return {
        currentCase: nextCase,
        record: {
          caseId: nextCase.id,
          parentCaseId: sourceCase.id,
          trigger,
        } satisfies SpawnedCaseRecord,
      }
    })
  })

  if (spawnedEntries.length === 0) {
    return { state, spawnedCaseIds: [], spawnedCases: [] as SpawnedCaseRecord[], notes }
  }

  return {
    state: {
      ...state,
      cases: {
        ...state.cases,
        ...Object.fromEntries(
          spawnedEntries.map(({ currentCase }) => [currentCase.id, currentCase])
        ),
      },
    },
    spawnedCaseIds: spawnedEntries.map(({ currentCase }) => currentCase.id),
    spawnedCases: spawnedEntries.map(({ record }) => record),
    notes,
  }
}

export function spawnFromEscalations(
  state: GameState,
  escalatedCaseIds: string[],
  rng: () => number
) {
  return spawnFromCaseRule(
    state,
    escalatedCaseIds,
    (currentCase) => currentCase.onUnresolved,
    'unresolved',
    rng
  )
}

export function spawnFromFailures(state: GameState, failedCaseIds: string[], rng: () => number) {
  return spawnFromCaseRule(
    state,
    failedCaseIds,
    (currentCase) => currentCase.onFail,
    'failure',
    rng
  )
}
