import { randInt } from '../math'
import { inferFactionIdFromCaseTags } from '../factions'
import { createMissionIntelState } from '../intel'
import { type CaseInstance, type CaseTemplate, type CompromisedAuthorityState, type GameState, type SpawnRule } from '../models'
import { inferCasePressureValue, inferCaseRegionTag } from '../pressure'
import { normalizeSpawnRule } from '../spawnRules'
import { applySiteGenerationToCase } from '../siteGeneration'
import { SIM_NOTES } from '../../data/copy'
import { EVENT_NOTE_BUILDERS } from './eventNoteBuilders'
import { isSecondEscalationBandWeek, PRESSURE_CALIBRATION } from './calibration'
import {
  applyPatrolWeightDistortion,
  resolveCompromisedAuthorityExposure,
  resolveCompromisedAuthorityResponse,
} from './compromisedAuthority'

export interface SpawnedCaseRecord {
  caseId: string
  trigger:
    | 'failure'
    | 'unresolved'
    | 'raid_pressure'
    | 'world_activity'
    | 'faction_offer'
    | 'faction_pressure'
    | 'pressure_threshold'
  parentCaseId?: string
  factionId?: string
  factionLabel?: string
  sourceReason?: string
  /**
   * [TEMPORARY SPE-867 seam]
   * Deterministic runtime evidence-routing result for this spawn transition.
   * - retained: no override applied (baseline behavior)
   * - suppress/misroute/forward_to_faction: overridden by compromised authority routing mode
   */
  evidenceRoutingOutcome?: 'retained' | 'suppress' | 'misroute' | 'forward_to_faction'
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
  rng: () => number,
  authority?: CompromisedAuthorityState
) {
  const selected = pickTemplateWithPatrolDistortion(
    templates,
    requestedTemplateIds,
    rng,
    authority
  )

  if (!selected) {
    throw new Error('No templates available in state')
  }

  return selected
}

function pickRuleTemplate(
  templates: Record<string, CaseTemplate>,
  requestedTemplateIds: string[],
  rng: () => number,
  authority?: CompromisedAuthorityState
) {
  return pickTemplateWithPatrolDistortion(templates, requestedTemplateIds, rng, authority)
}

/**
 * SPE-746: Pick a case template from a pool, applying patrol-distortion weights
 * when an active CompromisedAuthorityState covering the 'patrol' category is provided.
 *
 * Anti-faction intel templates are deprioritised; investigator-harassment templates
 * are boosted. The weight distortion works by duplicating templates in the selection
 * pool — making it deterministic given the same seeded RNG.
 *
 * When no authority state is provided the function behaves identically to
 * the unweighted internal pickRuleTemplate.
 *
 * @param templates      - all available CaseTemplate records
 * @param requestedIds   - optional preferred template IDs (empty = use full pool)
 * @param rng            - seeded RNG
 * @param authority      - optional active CompromisedAuthorityState
 * @returns the selected CaseTemplate, or undefined if the pool is empty
 */
export function pickTemplateWithPatrolDistortion(
  templates: Record<string, CaseTemplate>,
  requestedIds: string[],
  rng: () => number,
  authority?: CompromisedAuthorityState
): CaseTemplate | undefined {
  // Resolve the base pool
  const requested = requestedIds.map((id) => templates[id]).filter((t): t is CaseTemplate => Boolean(t))
  const basePool: CaseTemplate[] = requested.length > 0
    ? requested
    : Object.values(templates)

  if (basePool.length === 0) return undefined

  // If no authority with patrol distortion, fall back to uniform pick
  if (!authority || !authority.distortedCategories.includes('patrol')) {
    return basePool[randInt(rng, 0, basePool.length - 1)]
  }

  // Resolve override then apply weight distortion to the pool
  const override = resolveCompromisedAuthorityResponse(
    new Set(['patrol']),
    authority
  )
  const weightedPool = applyPatrolWeightDistortion(basePool, override)
  return weightedPool[randInt(rng, 0, weightedPool.length - 1)]
}

export function instantiateFromTemplate(
  template: CaseTemplate,
  rng: () => number,
  usedIds: Set<string> = new Set(),
  week = 1
): CaseInstance {
  const instantiated: CaseInstance = {
    id: nextId(usedIds, rng),
    templateId: template.templateId,
    title: template.title,
    description: template.description,
    factionId: template.factionId ?? inferFactionIdFromCaseTags(template),
    contactId: template.contactId,
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
    ...createMissionIntelState(week),
    assignedTeamIds: [],
    onFail: { ...template.onFail },
    onUnresolved: { ...template.onUnresolved },
    raid: template.raid,
  }

  return applySiteGenerationToCase({
    currentCase: instantiated,
    template,
    seedKey: instantiated.id,
  })
}

export function applySpawnRule(
  parent: CaseInstance,
  rule: SpawnRule,
  templates: Record<string, CaseTemplate>,
  rng: () => number,
  usedIds: Set<string> = new Set(),
  authority?: CompromisedAuthorityState
) {
  const normalizedRule = normalizeSpawnRule(rule)
  const notes: string[] = []

  let mutated: CaseInstance = {
    ...parent,
    stage: Math.min(parent.stage + normalizedRule.stageDelta, 5),
    status: 'open',
    assignedTeamIds: [],
    weeksRemaining: undefined,
    deadlineRemaining: normalizedRule.deadlineResetWeeks ?? parent.deadlineWeeks,
  }

  if (
    normalizedRule.convertToRaidAtStage !== undefined &&
    mutated.stage >= normalizedRule.convertToRaidAtStage
  ) {
    mutated = {
      ...mutated,
      kind: 'raid',
      raid: mutated.raid ?? { minTeams: 2, maxTeams: 2 },
    }
    notes.push(SIM_NOTES.convertedToRaid())
  }

  const spawnCount = normalizedRule.spawnCount
  const count = randInt(rng, spawnCount.min, spawnCount.max)
  const spawned: CaseInstance[] = []

  for (let i = 0; i < count; i++) {
    const template = pickRuleTemplate(
      templates,
      normalizedRule.spawnTemplateIds,
      rng,
      authority
    )
    if (!template) {
      continue
    }

    spawned.push(instantiateFromTemplate(template, rng, usedIds, parent.intelLastUpdatedWeek))
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
  usedIds: Set<string> = new Set(Object.keys(state.cases)),
  authority?: CompromisedAuthorityState
): CaseInstance {
  const template = pickTemplateId(state.templates, templateIds, rng, authority)
  const stage = parentCase ? Math.min(parentCase.stage + 1, 5) : 1
  const spawnedCase = instantiateFromTemplate(template, rng, usedIds, state.week)

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
  rng: () => number,
  authority?: CompromisedAuthorityState
) {
  let runtimeAuthority = authority ? { ...authority } : undefined
  const usedIds = new Set(Object.keys(state.cases))
  const notes: string[] = []
  const followUpSpawnReduction = isSecondEscalationBandWeek(state.week)
    ? PRESSURE_CALIBRATION.secondEscalationFollowUpSpawnReduction
    : 0
  const spawnedEntries = sourceCaseIds.flatMap((caseId) => {
    const sourceCase = state.cases[caseId]

    if (!sourceCase) {
      return []
    }

    const baseRule = normalizeSpawnRule(getRule(sourceCase))
    const rule =
      followUpSpawnReduction > 0
        ? {
            ...baseRule,
            spawnCount: {
              min: Math.max(0, baseRule.spawnCount.min - followUpSpawnReduction),
              max: Math.max(0, baseRule.spawnCount.max - followUpSpawnReduction),
            },
          }
        : baseRule
    const { spawned, notes: ruleNotes } = applySpawnRule(
      sourceCase,
      rule,
      state.templates,
      rng,
      usedIds,
      authority
    )

    const evidenceRoutingOutcome = runtimeAuthority
      ? (resolveCompromisedAuthorityResponse(
        new Set(['evidence']),
        runtimeAuthority
      ).evidenceRoutingMode ??
        'retained')
      : 'retained'

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
      const nextCaseBase = {
        ...spawnedCase,
        stage: Math.min(sourceCase.stage + 1, 5),
      }

      const nextCase =
        runtimeAuthority && sourceCase.beliefTracks
          ? (() => {
              const exposure = resolveCompromisedAuthorityExposure(
                runtimeAuthority,
                sourceCase.beliefTracks
              )

              runtimeAuthority = {
                ...runtimeAuthority,
                patrolAnomalyCount: exposure.updatedAnomalyCount,
              }

              return {
                ...nextCaseBase,
                beliefTracks: exposure.updatedBeliefTracks,
              }
            })()
          : nextCaseBase

      return {
        currentCase: nextCase,
        record: {
          caseId: nextCase.id,
          parentCaseId: sourceCase.id,
          trigger,
          evidenceRoutingOutcome,
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
      compromisedAuthority: runtimeAuthority,
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
  rng: () => number,
  authority?: CompromisedAuthorityState
) {
  return spawnFromCaseRule(
    state,
    escalatedCaseIds,
    (currentCase) => currentCase.onUnresolved,
    'unresolved',
    rng,
    authority
  )
}

export function spawnFromFailures(
  state: GameState,
  failedCaseIds: string[],
  rng: () => number,
  authority?: CompromisedAuthorityState
) {
  return spawnFromCaseRule(
    state,
    failedCaseIds,
    (currentCase) => currentCase.onFail,
    'failure',
    rng,
    authority
  )
}
