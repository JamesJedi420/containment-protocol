/**
 * SPE-1761: pure projection from `GameState` into SPE-1760 `BranchPathFacts`.
 *
 * Prepares validator input only — does not run branch continuity validation,
 * persist path state, or hook runtime story/encounter flows.
 *
 * Prefix conventions (read-only projection):
 * - Witnessed events: `event:*` / `event.*` flags and event-shaped consumed one-shots only
 *   (generic one-shots such as `frontdesk.*` are gating keys, not witnessed events).
 * - Learned clues: player-known knowledge tiers plus `clue:*` / `clue.*` flags.
 * - Prior choices: dev-log `choice.executed`, authoring `lastChoiceId`, `choice:*` / `choice.*` flags.
 * - Companions: `companion.<id>` or `npc.<id>.companion` with union status values.
 * - Hidden truth (opt-in): encounter `hiddenModifierIds`, `sim.hidden.event.*`, `sim.hidden.clue.*`.
 * - Room of origin: first `sceneHistory` entry (oldest visit; history is append-ordered in gameStateManager).
 */

import type {
  BranchCompanionStatus,
  BranchInjuryStatus,
  BranchPathFacts,
  BranchSimulationTruth,
} from './branchContinuity'
import { readGameStateManager } from './gameStateManager'
import type { Agent, GameFlagValue, GameState, KnowledgeState } from './models'

export interface BranchPathProjectionOptions {
  pathId?: string
  includeSimulationTruth?: boolean
  flagPrefix?: string
  knowledgeEntityId?: string
}

const COMPANION_STATUSES = new Set<BranchCompanionStatus>([
  'present',
  'lost',
  'rescued',
  'betrayed',
  'absent',
])

const PLAYER_KNOWN_KNOWLEDGE_TIERS = new Set<KnowledgeState['tier']>([
  'observed',
  'confirmed',
  'operationalized',
  'institutionalized',
])

const CHOICE_EXECUTED_PREFIX = 'Choice executed: '

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[]) {
  return [...new Set(values.map(normalizeString).filter((value) => value.length > 0))].sort((left, right) =>
    left.localeCompare(right)
  )
}

function isSeedFlagValue(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function isTruthyFlag(value: GameFlagValue | undefined) {
  if (value === undefined) {
    return false
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  return normalizeString(value).length > 0
}

function isHiddenSimulationFlagKey(flagId: string) {
  return flagId.startsWith('sim.hidden.')
}

/** Event-shaped ids for witnessed-event projection (flags and consumed one-shots). */
function isEventShapedKey(id: string) {
  return id.startsWith('event:') || id.startsWith('event.')
}

function isClueFlagKey(flagId: string) {
  return flagId.startsWith('clue:') || flagId.startsWith('clue.')
}

function isChoiceFlagKey(flagId: string) {
  return flagId.startsWith('choice:') || flagId.startsWith('choice.')
}

function sanitizePathSegment(value: string) {
  const trimmed = normalizeString(value)
  if (trimmed.length === 0) {
    return ''
  }

  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

function resolvePathId(game: GameState, options?: BranchPathProjectionOptions) {
  const override = normalizeString(options?.pathId)
  if (override.length > 0) {
    return override
  }

  const profile = game.campaignLedger?.profile
  const homeBaseId = sanitizePathSegment(profile?.homeBaseId ?? '')
  const week = typeof game.week === 'number' && Number.isFinite(game.week) && !Number.isNaN(game.week) ? Math.max(0, Math.trunc(game.week)) : 0
  const rngSeed =
    typeof game.rngSeed === 'number' && Number.isFinite(game.rngSeed) && !Number.isNaN(game.rngSeed) ? Math.trunc(game.rngSeed) : 0

  if (homeBaseId.length > 0) {
    return `run:${homeBaseId}:w${week}:s${rngSeed}`
  }

  return `game:week-${week}`
}

function projectAcquiredItemIds(inventory: Record<string, number>) {
  const acquired: string[] = []

  for (const [itemId, quantity] of Object.entries(inventory)) {
    const normalizedId = normalizeString(itemId)
    if (normalizedId.length === 0) {
      continue
    }

    if (typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0) {
      acquired.push(normalizedId)
    }
  }

  return normalizeStringList(acquired)
}

function projectSeedValues(
  globalFlags: Record<string, GameFlagValue>,
  options?: BranchPathProjectionOptions
) {
  const flagPrefix = normalizeString(options?.flagPrefix)
  const seedValues: Record<string, string | number | boolean> = {}

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (normalizedId.length === 0 || isHiddenSimulationFlagKey(normalizedId)) {
      continue
    }

    if (flagPrefix.length > 0 && !normalizedId.startsWith(flagPrefix)) {
      continue
    }

    if (!isSeedFlagValue(value)) {
      continue
    }

    seedValues[normalizedId] = typeof value === 'number' ? Math.trunc(value) : value
  }

  const sortedEntries = Object.entries(seedValues).sort(([left], [right]) => left.localeCompare(right))
  return Object.fromEntries(sortedEntries) as Readonly<Record<string, string | number | boolean>>
}

function projectRoomOfOriginId(
  sceneHistory: readonly { locationId: string }[],
  currentLocation: { locationId?: string; hubId?: string }
) {
  const firstSceneLocation = normalizeString(sceneHistory[0]?.locationId)
  if (firstSceneLocation.length > 0) {
    return firstSceneLocation
  }

  const currentLocationId = normalizeString(currentLocation.locationId)
  if (currentLocationId.length > 0) {
    return currentLocationId
  }

  const hubId = normalizeString(currentLocation.hubId)
  return hubId.length > 0 ? hubId : undefined
}

function projectCompanionStatusById(globalFlags: Record<string, GameFlagValue>) {
  const companionStatusById: Record<string, BranchCompanionStatus> = {}

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (normalizedId.length === 0) {
      continue
    }

    const companionMatch = /^companion\.(.+)$/.exec(normalizedId)
    if (companionMatch) {
      const companionId = normalizeString(companionMatch[1])
      if (companionId.length === 0) {
        continue
      }

      if (typeof value === 'string') {
        if (COMPANION_STATUSES.has(value as BranchCompanionStatus)) {
          companionStatusById[companionId] = value as BranchCompanionStatus
        }
      } else if (value === true) {
        companionStatusById[companionId] = 'present'
      }
      continue
    }

    const npcMatch = /^npc\.(.+)\.companion$/.exec(normalizedId)
    if (npcMatch) {
      const companionId = normalizeString(npcMatch[1])
      if (companionId.length === 0) {
        continue
      }

      if (typeof value === 'string') {
        if (COMPANION_STATUSES.has(value as BranchCompanionStatus)) {
          companionStatusById[companionId] = value as BranchCompanionStatus
        }
      } else if (value === true) {
        companionStatusById[companionId] = 'present'
      }
    }
  }

  const sortedEntries = Object.entries(companionStatusById).sort(([left], [right]) =>
    left.localeCompare(right)
  )
  return Object.fromEntries(sortedEntries) as Readonly<Record<string, BranchCompanionStatus>>
}

function projectInjuryStatus(agent: Agent): BranchInjuryStatus {
  const vitals = agent.vitals
  if (!vitals || typeof vitals.wounds !== 'number' || !Number.isFinite(vitals.wounds)) {
    return 'none'
  }

  const wounds = Math.max(0, vitals.wounds)
  const statusFlags = vitals.statusFlags ?? []
  const hasRecoveringSignal =
    agent.status === 'recovering' ||
    statusFlags.some((flag) => {
      const normalized = normalizeString(flag).toLowerCase()
      return normalized === 'recovering' || normalized === 'healed'
    })

  if (hasRecoveringSignal && wounds > 0) {
    return 'healed'
  }

  if (wounds > 0) {
    return 'wounded'
  }

  return 'none'
}

function projectInjuryStatusBySubjectId(agents: Record<string, Agent>) {
  const injuryStatusBySubjectId: Record<string, BranchInjuryStatus> = {}

  for (const [agentId, agent] of Object.entries(agents)) {
    const normalizedId = normalizeString(agentId)
    if (normalizedId.length === 0) {
      continue
    }

    injuryStatusBySubjectId[`agent:${normalizedId}`] = projectInjuryStatus(agent)
  }

  const sortedEntries = Object.entries(injuryStatusBySubjectId).sort(([left], [right]) =>
    left.localeCompare(right)
  )
  return Object.fromEntries(sortedEntries) as Readonly<Record<string, BranchInjuryStatus>>
}

function projectWitnessedEventIds(
  globalFlags: Record<string, GameFlagValue>,
  oneShotEvents: Record<string, { seen?: boolean }>
) {
  const witnessed: string[] = []

  for (const [eventId, record] of Object.entries(oneShotEvents)) {
    const normalizedId = normalizeString(eventId)
    if (normalizedId.length === 0 || isHiddenSimulationFlagKey(normalizedId)) {
      continue
    }

    if (record?.seen !== false && isEventShapedKey(normalizedId)) {
      witnessed.push(normalizedId)
    }
  }

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (normalizedId.length === 0 || isHiddenSimulationFlagKey(normalizedId)) {
      continue
    }

    if (isEventShapedKey(normalizedId) && isTruthyFlag(value)) {
      witnessed.push(normalizedId)
    }
  }

  return normalizeStringList(witnessed)
}

function projectLearnedClueIds(
  knowledge: Record<string, KnowledgeState>,
  globalFlags: Record<string, GameFlagValue>,
  knowledgeEntityId?: string
) {
  const learned: string[] = []
  const entityFilter = normalizeString(knowledgeEntityId)

  for (const entry of Object.values(knowledge)) {
    if (!entry) {
      continue
    }

    if (entityFilter.length > 0 && normalizeString(entry.entityId) !== entityFilter) {
      continue
    }

    if (!PLAYER_KNOWN_KNOWLEDGE_TIERS.has(entry.tier)) {
      continue
    }

    const subjectId = normalizeString(entry.subjectId)
    if (subjectId.length > 0) {
      learned.push(subjectId)
    }
  }

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (normalizedId.length === 0 || isHiddenSimulationFlagKey(normalizedId)) {
      continue
    }

    if (isClueFlagKey(normalizedId) && isTruthyFlag(value)) {
      learned.push(normalizedId)
    }
  }

  return normalizeStringList(learned)
}

function projectPriorChoiceIds(
  globalFlags: Record<string, GameFlagValue>,
  lastChoiceId: string | undefined,
  eventLog: readonly { type: string; summary: string }[]
) {
  const priorChoices: string[] = []

  const authoringChoice = normalizeString(lastChoiceId)
  if (authoringChoice.length > 0) {
    priorChoices.push(authoringChoice)
  }

  for (const entry of eventLog) {
    if (entry.type !== 'choice.executed') {
      continue
    }

    const summary = normalizeString(entry.summary)
    if (!summary.startsWith(CHOICE_EXECUTED_PREFIX)) {
      continue
    }

    const choiceId = normalizeString(summary.slice(CHOICE_EXECUTED_PREFIX.length))
    if (choiceId.length > 0) {
      priorChoices.push(choiceId)
    }
  }

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (normalizedId.length === 0 || isHiddenSimulationFlagKey(normalizedId)) {
      continue
    }

    if (isChoiceFlagKey(normalizedId) && isTruthyFlag(value)) {
      priorChoices.push(normalizedId)
    }
  }

  return normalizeStringList(priorChoices)
}

function collectHiddenEventIds(
  globalFlags: Record<string, GameFlagValue>,
  encounterState: Record<string, { hiddenModifierIds?: readonly string[] }>
) {
  const hiddenEvents: string[] = []

  for (const encounter of Object.values(encounterState)) {
    for (const modifierId of encounter.hiddenModifierIds ?? []) {
      const normalized = normalizeString(modifierId)
      if (normalized.length > 0) {
        hiddenEvents.push(normalized)
      }
    }
  }

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (!normalizedId.startsWith('sim.hidden.event.') || !isTruthyFlag(value)) {
      continue
    }

    const eventId = normalizeString(normalizedId.slice('sim.hidden.event.'.length))
    if (eventId.length > 0) {
      hiddenEvents.push(eventId)
    }
  }

  return normalizeStringList(hiddenEvents)
}

function collectHiddenLearnedClueIds(globalFlags: Record<string, GameFlagValue>) {
  const hiddenClues: string[] = []

  for (const [flagId, value] of Object.entries(globalFlags)) {
    const normalizedId = normalizeString(flagId)
    if (!normalizedId.startsWith('sim.hidden.clue.') || !isTruthyFlag(value)) {
      continue
    }

    const clueId = normalizeString(normalizedId.slice('sim.hidden.clue.'.length))
    if (clueId.length > 0) {
      hiddenClues.push(clueId)
    }
  }

  return normalizeStringList(hiddenClues)
}

function projectSimulationTruth(
  globalFlags: Record<string, GameFlagValue>,
  encounterState: Record<string, { hiddenModifierIds?: readonly string[] }>
): BranchSimulationTruth | undefined {
  const hiddenEventIds = collectHiddenEventIds(globalFlags, encounterState)
  const hiddenLearnedClueIds = collectHiddenLearnedClueIds(globalFlags)

  if (hiddenEventIds.length === 0 && hiddenLearnedClueIds.length === 0) {
    return undefined
  }

  return {
    ...(hiddenEventIds.length > 0 ? { hiddenEventIds } : {}),
    ...(hiddenLearnedClueIds.length > 0 ? { hiddenLearnedClueIds } : {}),
  }
}

export function projectBranchPathFactsFromGameState(
  game: GameState,
  options?: BranchPathProjectionOptions
): BranchPathFacts {
  const runtime = readGameStateManager(game)
  const pathId = resolvePathId(game, options)
  const acquiredItemIds = projectAcquiredItemIds(runtime.inventory)
  const seedValues = projectSeedValues(runtime.globalFlags, options)
  const roomOfOriginId = projectRoomOfOriginId(runtime.sceneHistory, runtime.currentLocation)
  const companionStatusById = projectCompanionStatusById(runtime.globalFlags)
  const injuryStatusBySubjectId = projectInjuryStatusBySubjectId(game.agents ?? {})
  const witnessedEventIds = projectWitnessedEventIds(runtime.globalFlags, runtime.oneShotEvents)
  const learnedClueIds = projectLearnedClueIds(
    game.knowledge ?? {},
    runtime.globalFlags,
    options?.knowledgeEntityId
  )
  const priorChoiceIds = projectPriorChoiceIds(
    runtime.globalFlags,
    runtime.ui.authoring?.lastChoiceId,
    runtime.ui.debug.eventLog ?? []
  )

  const pathFacts: BranchPathFacts = {
    pathId,
    acquiredItemIds,
    seedValues,
    companionStatusById,
    injuryStatusBySubjectId,
    witnessedEventIds,
    learnedClueIds,
    priorChoiceIds,
    ...(roomOfOriginId ? { roomOfOriginId } : {}),
  }

  if (options?.includeSimulationTruth === true) {
    const simulationTruth = projectSimulationTruth(runtime.globalFlags, runtime.encounterState)
    if (simulationTruth) {
      return { ...pathFacts, simulationTruth }
    }
  }

  return pathFacts
}
