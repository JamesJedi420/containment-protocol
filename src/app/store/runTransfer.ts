import { createStartingState } from '../../data/startingState'
import { getProductionRecipe } from '../../data/production'
import { getTrainingProgram } from '../../data/training'
import { refreshContractBoard } from '../../domain/contracts'
import {
  createDefaultWeeklyDirectiveState,
  getWeeklyDirectiveDefinitions,
  isWeeklyDirectiveId,
} from '../../domain/directives'
import { buildReplacementPressureState } from '../../domain/agent/attrition'
import { buildTeamDeploymentReadinessState } from '../../domain/deploymentReadiness'
import { buildOperationEventTimestamp, inferOperationEventSourceSystem } from '../../domain/events'
import { normalizeRuntimeState } from '../../domain/gameStateManager'
import { normalizeMissionIntelRecord } from '../../domain/intel'
import { clamp, normalizeSeed } from '../../domain/math'
import { createDeterministicReportNote } from '../../domain/reportNotes'
import { MAX_ACADEMY_TIER } from '../../domain/sim/academyUpgrade'
import {
  getTeamAssignedCaseId,
  getTeamMemberIds,
  syncTeamSimulationState,
} from '../../domain/teamSimulation'
import {
  type CaseEscalationTrigger,
  type CaseInstance,
  type CaseSpawnTrigger,
  type FatigueBand,
  type GameConfig,
  type GameState,
  type Id,
  type MarketPressure,
  type MarketState,
  type OperationEvent,
  type OperationEventType,
  type PartyCardState,
  type ProductionQueueEntry,
  type ReportNote,
  type ReportNoteMetadata,
  type TrainingQueueEntry,
  type Team,
  type WeeklyReport,
  type WeeklyReportCaseSnapshot,
  type WeeklyReportTeamStatus,
} from '../../domain/models'
import { propagateDistortion } from '../../domain/shared/distortion'

export const GAME_STORE_VERSION = 6
export const RUN_EXPORT_KIND = 'containment-protocol-run'

export type PersistedGame = Omit<GameState, 'templates'>
export type PersistedStore = { game: PersistedGame }

export interface RunExportPayload {
  kind: typeof RUN_EXPORT_KIND
  version: number
  exportedAt: string
  game: PersistedGame
}

const OPERATION_EVENT_TYPES = [
  'assignment.team_assigned',
  'assignment.team_unassigned',
  'case.resolved',
  'case.partially_resolved',
  'case.failed',
  'case.escalated',
  'case.spawned',
  'case.raid_converted',
  'intel.report_generated',
  'agent.training_started',
  'agent.training_completed',
  'agent.training_cancelled',
  'agent.relationship_changed',
  'agent.instructor_assigned',
  'agent.instructor_unassigned',
  'agent.injured',
  'agent.betrayed',
  'agent.resigned',
  'agent.promoted',
  'agent.hired',
  'progression.xp_gained',
  'system.recruitment_expired',
  'system.recruitment_generated',
  'recruitment.scouting_initiated',
  'recruitment.scouting_refined',
  'recruitment.intel_confirmed',
  'system.party_cards_drawn',
  'production.queue_completed',
  'production.queue_started',
  'market.shifted',
  'market.transaction_recorded',
  'faction.standing_changed',
  'faction.unlock_available',
  'faction.activity',
  'agency.containment_updated',
  'directive.applied',
  'support.shortfall',
  'system.academy_upgraded',
] as const

const CASE_ESCALATION_TRIGGERS: CaseEscalationTrigger[] = ['deadline', 'failure']
const CASE_SPAWN_TRIGGERS: CaseSpawnTrigger[] = [
  'failure',
  'unresolved',
  'raid_pressure',
  'world_activity',
  'faction_offer',
  'faction_pressure',
  'pressure_threshold',
]
const MARKET_PRESSURES: MarketPressure[] = ['discounted', 'stable', 'tight']
const RECRUIT_CATEGORIES = [
  'agent',
  'staff',
  'specialist',
  'fieldTech',
  'analyst',
  'instructor',
] as const
const STAT_KEYS = ['combat', 'investigation', 'utility', 'social'] as const
const EXACT_POTENTIAL_TIERS = ['F', 'D', 'C', 'B', 'A', 'S'] as const
const SCOUT_CONFIDENCES = ['low', 'medium', 'high', 'confirmed'] as const
const MARKET_TRANSACTION_ACTIONS = ['buy', 'sell'] as const
const MARKET_TRANSACTION_CATEGORIES = ['equipment', 'component', 'material'] as const
const FACTION_UNLOCK_DISPOSITIONS = ['supportive', 'adversarial'] as const
const REPORT_NOTE_TYPES = [
  'case.resolved',
  'case.partially_resolved',
  'case.failed',
  'case.escalated',
  'case.spawned',
  'case.raid_converted',
  'agent.training_completed',
  'production.queue_completed',
  'market.shifted',
  'agency.containment_updated',
  'system.week_delta',
  'system.recruitment_expired',
  'system.recruitment_generated',
  'recruitment.scouting_initiated',
  'recruitment.scouting_refined',
  'recruitment.intel_confirmed',
  'system.party_cards_drawn',
  'system.escalation_consequence',
  'system.proxy_conflict',
  'system.protocol_contact',
  'system.anchor_instability',
  'market.transaction_recorded',
  'faction.standing_changed',
  'faction.unlock_available',
  'directive.applied',
  'support.shortfall',
] as const

const FALLBACK_WEEKLY_DIRECTIVE_ID = getWeeklyDirectiveDefinitions()[0]?.id ?? 'intel-surge'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T)
}

function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedFields(entry)) as T
  }

  if (!isRecord(value)) {
    return value
  }

  const nextValue: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      nextValue[key] = stripUndefinedFields(entry)
    }
  }

  return nextValue as T
}

const CURRENT_OPERATION_EVENT_SCHEMA_VERSION = 2 as const

function normalizeOperationEventSchemaVersion(value: unknown) {
  return (value === 1 || value === 2 ? value : CURRENT_OPERATION_EVENT_SCHEMA_VERSION) as 1 | 2
}

function normalizeLegacyOperationEventType(
  value: unknown
): OperationEventType | 'faction.activity' | null {
  if (value === 'faction.activity') {
    return value
  }

  return isOneOf(value, OPERATION_EVENT_TYPES) ? value : null
}

function migrateOperationEventToCurrentSchema<TType extends OperationEventType>(
  event: OperationEvent<TType>
): OperationEvent<TType> {
  switch (event.schemaVersion) {
    case CURRENT_OPERATION_EVENT_SCHEMA_VERSION:
      return event
    default:
      return {
        ...event,
        schemaVersion: CURRENT_OPERATION_EVENT_SCHEMA_VERSION,
      }
  }
}

function sanitizeInteger(value: number | undefined, fallback: number, min: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.trunc(finiteValue))
}

function sanitizeDecimal(value: number | undefined, fallback: number, min: number, max?: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const rounded = Number(finiteValue.toFixed(2))
  return max === undefined ? Math.max(min, rounded) : clamp(rounded, min, max)
}

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function isReportNoteMetadataArray(
  value: unknown
): value is readonly (string | number | boolean)[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => {
      const valueType = typeof entry
      return valueType === 'string' || valueType === 'number' || valueType === 'boolean'
    })
  )
}

function sanitizeReportNoteList(value: unknown, week: number): ReportNote[] {
  if (!Array.isArray(value)) {
    return []
  }

  const notes: ReportNote[] = []
  for (const [index, entry] of value.entries()) {
    if (typeof entry === 'string') {
      notes.push(createDeterministicReportNote(entry, week, index))
      continue
    }

    if (!isRecord(entry)) {
      continue
    }

    const note = stripUndefinedFields(entry)
    const id = typeof note.id === 'string' && note.id.length > 0 ? note.id : `note-${index + 1}`
    const content = typeof note.content === 'string' ? note.content : ''
    const timestamp = typeof note.timestamp === 'number' ? note.timestamp : 0
    const type = isOneOf(note.type, REPORT_NOTE_TYPES) ? note.type : undefined
    const metadata = isRecord(note.metadata)
      ? Object.entries(note.metadata).reduce<ReportNoteMetadata>(
          (sanitized, [key, metadataValue]) => {
            const valueType = typeof metadataValue

            if (
              metadataValue === null ||
              valueType === 'string' ||
              valueType === 'number' ||
              valueType === 'boolean' ||
              isReportNoteMetadataArray(metadataValue)
            ) {
              sanitized[key] = metadataValue as ReportNoteMetadata[string]
            }

            return sanitized
          },
          {}
        )
      : undefined

    notes.push({
      ...note,
      id,
      content,
      timestamp,
      type,
      metadata,
    })
  }

  return notes
}

function sanitizeNumberList(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  const sanitized = value
    .filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    .map((entry) => Math.trunc(entry))

  return sanitized.length > 0 ? sanitized : fallback
}

export function getFatigueBand(value: number): FatigueBand {
  if (value >= 45) {
    return 'critical'
  }

  if (value >= 20) {
    return 'strained'
  }

  return 'steady'
}

export function stripGameTemplates(game: GameState): PersistedGame {
  const { templates, ...persistedGame } = game
  void templates
  return stripUndefinedFields(persistedGame)
}

export function buildReportCaseSnapshot(
  currentCase: CaseInstance,
  knowledgeMap?: Record<string, import('../../domain/knowledge').KnowledgeState>
): WeeklyReportCaseSnapshot {
  const snapshot: WeeklyReportCaseSnapshot = {
    caseId: currentCase.id,
    title: currentCase.title,
    kind: currentCase.kind,
    mode: currentCase.mode,
    status: currentCase.status,
    stage: currentCase.stage,
    deadlineRemaining: currentCase.deadlineRemaining,
    durationWeeks: currentCase.durationWeeks,
    weeksRemaining: currentCase.weeksRemaining,
    assignedTeamIds: [...currentCase.assignedTeamIds],
    // SPE-59: Surface canonical knowledge state for this case (per team)
    knowledge: knowledgeMap,
    // SPE-59: Add reveal explanation for provisional/true/context
    revealExplanation: knowledgeMap
      ? Object.entries(knowledgeMap)
          .map(([teamId, ks]) => {
            const parts: string[] = []
            if (ks.provisionalClassification && ks.confirmationState === 'provisional') {
              parts.push(`Team ${teamId}: Provisional classification: ${ks.provisionalClassification}`)
            }
            if (ks.trueClassification && ks.confirmationState === 'confirmed') {
              parts.push(`Team ${teamId}: Confirmed as: ${ks.trueClassification}`)
            }
            if (ks.contextTag) {
              parts.push(`(Context: ${ks.contextTag})`)
            }
            return parts.join(' ')
          })
          .filter(Boolean)
          .join(' | ')
      : undefined,
  }

  return currentCase.distortion?.length ? propagateDistortion(currentCase, snapshot) : snapshot
}

export function buildReportCaseSnapshots(cases: GameState['cases']) {
  return Object.fromEntries(
    Object.values(cases).map((currentCase) => [
      currentCase.id,
      buildReportCaseSnapshot(currentCase),
    ])
  )
}

function getAverageFatigue(team: Team, agents: GameState['agents']) {
  const memberIds = getTeamMemberIds(team)

  if (memberIds.length === 0) {
    return 0
  }

  const totalFatigue = memberIds.reduce((sum, agentId) => sum + (agents[agentId]?.fatigue ?? 0), 0)

  return Math.round(totalFatigue / memberIds.length)
}

export function buildReportTeamStatusEntry(
  team: Team,
  agents: GameState['agents'],
  cases: GameState['cases']
): WeeklyReportTeamStatus {
  const avgFatigue = getAverageFatigue(team, agents)
  const assignedCaseId = getTeamAssignedCaseId(team)
  const assignedCase = assignedCaseId ? cases[assignedCaseId] : undefined

  return {
    teamId: team.id,
    teamName: team.name,
    assignedCaseId: assignedCaseId ?? undefined,
    assignedCaseTitle: assignedCase?.title,
    avgFatigue,
    fatigueBand: getFatigueBand(avgFatigue),
  }
}

export function buildReportTeamStatus(
  teams: GameState['teams'],
  agents: GameState['agents'],
  cases: GameState['cases']
) {
  return Object.values(teams).map((team) => buildReportTeamStatusEntry(team, agents, cases))
}

export function sanitizeGameConfig(config: unknown, fallback: GameConfig) {
  const nextConfig = { ...fallback }

  if (!isRecord(config)) {
    return nextConfig
  }

  if (config.maxActiveCases !== undefined) {
    nextConfig.maxActiveCases = sanitizeInteger(
      config.maxActiveCases as number,
      fallback.maxActiveCases,
      1
    )
  }

  if (config.trainingSlots !== undefined) {
    nextConfig.trainingSlots = sanitizeInteger(
      config.trainingSlots as number,
      fallback.trainingSlots,
      1
    )
  }

  if (config.partialMargin !== undefined) {
    nextConfig.partialMargin = sanitizeInteger(
      config.partialMargin as number,
      fallback.partialMargin,
      0
    )
  }

  if (config.stageScalar !== undefined) {
    nextConfig.stageScalar = sanitizeDecimal(
      config.stageScalar as number,
      fallback.stageScalar,
      0.05
    )
  }

  if (typeof config.challengeModeEnabled === 'boolean') {
    nextConfig.challengeModeEnabled = config.challengeModeEnabled
  }

  if (config.attritionPerWeek !== undefined) {
    nextConfig.attritionPerWeek = sanitizeInteger(
      config.attritionPerWeek as number,
      fallback.attritionPerWeek,
      1
    )
  }

  if (config.probabilityK !== undefined) {
    nextConfig.probabilityK = sanitizeDecimal(
      config.probabilityK as number,
      fallback.probabilityK,
      0.05
    )
  }

  if (config.raidCoordinationPenaltyPerExtraTeam !== undefined) {
    nextConfig.raidCoordinationPenaltyPerExtraTeam = sanitizeDecimal(
      config.raidCoordinationPenaltyPerExtraTeam as number,
      fallback.raidCoordinationPenaltyPerExtraTeam,
      0,
      1
    )
  }

  if (config.durationModel === 'capacity' || config.durationModel === 'attrition') {
    nextConfig.durationModel = config.durationModel
  }

  if (config.weeksPerYear !== undefined) {
    nextConfig.weeksPerYear = sanitizeInteger(
      config.weeksPerYear as number,
      fallback.weeksPerYear,
      1
    )
  }

  if (config.fundingBasePerWeek !== undefined) {
    nextConfig.fundingBasePerWeek = sanitizeInteger(
      config.fundingBasePerWeek as number,
      fallback.fundingBasePerWeek,
      0
    )
  }

  if (config.fundingPerResolution !== undefined) {
    nextConfig.fundingPerResolution = sanitizeInteger(
      config.fundingPerResolution as number,
      fallback.fundingPerResolution,
      0
    )
  }

  if (config.fundingPenaltyPerFail !== undefined) {
    nextConfig.fundingPenaltyPerFail = sanitizeInteger(
      config.fundingPenaltyPerFail as number,
      fallback.fundingPenaltyPerFail,
      0
    )
  }

  if (config.fundingPenaltyPerUnresolved !== undefined) {
    nextConfig.fundingPenaltyPerUnresolved = sanitizeInteger(
      config.fundingPenaltyPerUnresolved as number,
      fallback.fundingPenaltyPerUnresolved,
      0
    )
  }

  if (config.containmentWeeklyDecay !== undefined) {
    nextConfig.containmentWeeklyDecay = sanitizeInteger(
      config.containmentWeeklyDecay as number,
      fallback.containmentWeeklyDecay,
      0
    )
  }

  if (config.containmentDeltaPerResolution !== undefined) {
    nextConfig.containmentDeltaPerResolution = sanitizeInteger(
      config.containmentDeltaPerResolution as number,
      fallback.containmentDeltaPerResolution,
      0
    )
  }

  if (config.containmentDeltaPerFail !== undefined) {
    nextConfig.containmentDeltaPerFail = sanitizeInteger(
      config.containmentDeltaPerFail as number,
      fallback.containmentDeltaPerFail,
      -100
    )
  }

  if (config.containmentDeltaPerUnresolved !== undefined) {
    nextConfig.containmentDeltaPerUnresolved = sanitizeInteger(
      config.containmentDeltaPerUnresolved as number,
      fallback.containmentDeltaPerUnresolved,
      -100
    )
  }

  if (config.clearanceThresholds !== undefined) {
    nextConfig.clearanceThresholds = sanitizeNumberList(
      config.clearanceThresholds,
      fallback.clearanceThresholds
    ).sort((a, b) => a - b)
  }

  if (!nextConfig.challengeModeEnabled && nextConfig.durationModel === 'attrition') {
    nextConfig.durationModel = 'capacity'
  }

  return nextConfig
}

function sanitizeCaseSnapshots(
  value: unknown,
  fallback: Record<Id, WeeklyReportCaseSnapshot>
): Record<Id, WeeklyReportCaseSnapshot> {
  if (!isRecord(value)) {
    return fallback
  }

  const nextSnapshots: Record<Id, WeeklyReportCaseSnapshot> = { ...fallback }

  for (const [entryId, snapshot] of Object.entries(value)) {
    if (!isRecord(snapshot)) {
      continue
    }

    const fallbackSnapshot = fallback[entryId]
    const caseId =
      typeof snapshot.caseId === 'string' ? snapshot.caseId : (fallbackSnapshot?.caseId ?? entryId)

    nextSnapshots[caseId] = stripUndefinedFields({
      caseId,
      title:
        typeof snapshot.title === 'string' ? snapshot.title : (fallbackSnapshot?.title ?? caseId),
      kind:
        snapshot.kind === 'case' || snapshot.kind === 'raid'
          ? snapshot.kind
          : (fallbackSnapshot?.kind ?? 'case'),
      mode:
        snapshot.mode === 'threshold' ||
        snapshot.mode === 'probability' ||
        snapshot.mode === 'deterministic'
          ? snapshot.mode
          : (fallbackSnapshot?.mode ?? 'threshold'),
      status:
        snapshot.status === 'open' ||
        snapshot.status === 'in_progress' ||
        snapshot.status === 'resolved'
          ? snapshot.status
          : (fallbackSnapshot?.status ?? 'open'),
      stage: sanitizeInteger(snapshot.stage as number | undefined, fallbackSnapshot?.stage ?? 1, 1),
      deadlineRemaining: sanitizeInteger(
        snapshot.deadlineRemaining as number | undefined,
        fallbackSnapshot?.deadlineRemaining ?? 1,
        0
      ),
      durationWeeks: sanitizeInteger(
        snapshot.durationWeeks as number | undefined,
        fallbackSnapshot?.durationWeeks ?? 1,
        1
      ),
      weeksRemaining:
        snapshot.weeksRemaining === undefined
          ? fallbackSnapshot?.weeksRemaining
          : sanitizeInteger(snapshot.weeksRemaining as number, 0, 0),
      assignedTeamIds:
        Array.isArray(snapshot.assignedTeamIds) &&
        snapshot.assignedTeamIds.every((teamId) => typeof teamId === 'string')
          ? [...snapshot.assignedTeamIds]
          : (fallbackSnapshot?.assignedTeamIds ?? []),
      missionResult: isRecord(snapshot.missionResult)
        ? (snapshot.missionResult as unknown as WeeklyReportCaseSnapshot['missionResult'])
        : fallbackSnapshot?.missionResult,
    }) as WeeklyReportCaseSnapshot
  }

  return nextSnapshots
}

function sanitizeTeamStatus(
  value: unknown,
  fallback: WeeklyReportTeamStatus[]
): WeeklyReportTeamStatus[] {
  if (!Array.isArray(value)) {
    return fallback
  }

  const nextTeamStatus: WeeklyReportTeamStatus[] = []

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.teamId !== 'string') {
      continue
    }

    const avgFatigue = sanitizeInteger(entry.avgFatigue as number | undefined, 0, 0)

    nextTeamStatus.push(
      stripUndefinedFields({
        teamId: entry.teamId,
        teamName: typeof entry.teamName === 'string' ? entry.teamName : undefined,
        assignedCaseId: typeof entry.assignedCaseId === 'string' ? entry.assignedCaseId : undefined,
        assignedCaseTitle:
          typeof entry.assignedCaseTitle === 'string' ? entry.assignedCaseTitle : undefined,
        avgFatigue,
        fatigueBand:
          entry.fatigueBand === 'steady' ||
          entry.fatigueBand === 'strained' ||
          entry.fatigueBand === 'critical'
            ? entry.fatigueBand
            : getFatigueBand(avgFatigue),
      }) as WeeklyReportTeamStatus
    )
  }

  return nextTeamStatus
}

function sanitizeInventory(value: unknown, fallback: Record<string, number>) {
  if (!isRecord(value)) {
    return fallback
  }

  const nextInventory = { ...fallback }

  for (const [itemId, quantity] of Object.entries(value)) {
    nextInventory[itemId] = sanitizeInteger(
      quantity as number | undefined,
      fallback[itemId] ?? 0,
      0
    )
  }

  return nextInventory
}

function sanitizePartyCardState(value: unknown, fallback: PartyCardState | undefined) {
  if (!fallback) {
    return undefined
  }

  if (!isRecord(value)) {
    return fallback
  }

  const cards =
    isRecord(value.cards) && Object.values(value.cards).every((entry) => isRecord(entry))
      ? (value.cards as PartyCardState['cards'])
      : fallback.cards

  const sanitizeCardIds = (input: unknown, fallbackIds: string[]) =>
    Array.isArray(input) && input.every((entry) => typeof entry === 'string')
      ? [...input]
      : [...fallbackIds]

  const queuedPlays = Array.isArray(value.queuedPlays)
    ? value.queuedPlays
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .map((entry, index) => ({
          playId:
            typeof entry.playId === 'string' && entry.playId.length > 0
              ? entry.playId
              : `play-migrated-${index + 1}`,
          cardId:
            typeof entry.cardId === 'string' && entry.cardId.length > 0
              ? entry.cardId
              : (fallback.deck[index % Math.max(fallback.deck.length, 1)] ?? `card-${index + 1}`),
          targetCaseId: typeof entry.targetCaseId === 'string' ? entry.targetCaseId : undefined,
          targetTeamId: typeof entry.targetTeamId === 'string' ? entry.targetTeamId : undefined,
          weekPlayed: sanitizeInteger(entry.weekPlayed as number | undefined, 1, 1),
        }))
    : fallback.queuedPlays

  return {
    cards,
    deck: sanitizeCardIds(value.deck, fallback.deck),
    hand: sanitizeCardIds(value.hand, fallback.hand),
    discard: sanitizeCardIds(value.discard, fallback.discard),
    queuedPlays,
    maxHandSize: sanitizeInteger(value.maxHandSize as number | undefined, fallback.maxHandSize, 0),
  } satisfies PartyCardState
}

function sanitizeTrainingQueue(value: unknown): TrainingQueueEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const nextQueue: TrainingQueueEntry[] = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      continue
    }

    const trainingId =
      typeof entry.trainingId === 'string' ? entry.trainingId : `training-${index + 1}`
    const program = getTrainingProgram(trainingId)
    const memberIds = sanitizeStringList(entry.memberIds)
    const durationWeeks = sanitizeInteger(
      entry.durationWeeks as number | undefined,
      program?.durationWeeks ?? 1,
      1
    )

    nextQueue.push({
      id: typeof entry.id === 'string' ? entry.id : `training-${index + 1}`,
      trainingId,
      trainingName:
        typeof entry.trainingName === 'string'
          ? entry.trainingName
          : (program?.name ?? `Training ${index + 1}`),
      scope:
        entry.scope === 'team' || entry.scope === 'agent'
          ? entry.scope
          : (program?.scope ?? 'agent'),
      agentId: typeof entry.agentId === 'string' ? entry.agentId : `agent-${index + 1}`,
      agentName: typeof entry.agentName === 'string' ? entry.agentName : `Agent ${index + 1}`,
      teamId: typeof entry.teamId === 'string' ? entry.teamId : undefined,
      teamName: typeof entry.teamName === 'string' ? entry.teamName : undefined,
      drillGroupId: typeof entry.drillGroupId === 'string' ? entry.drillGroupId : undefined,
      ...(memberIds.length > 0 ? { memberIds } : {}),
      targetStat: isOneOf(entry.targetStat, STAT_KEYS)
        ? entry.targetStat
        : (program?.targetStat ?? 'combat'),
      statDelta: sanitizeInteger(entry.statDelta as number | undefined, program?.statDelta ?? 1, 1),
      startedWeek: sanitizeInteger(entry.startedWeek as number | undefined, 1, 1),
      durationWeeks,
      remainingWeeks: sanitizeInteger(entry.remainingWeeks as number | undefined, durationWeeks, 0),
      fundingCost: sanitizeInteger(
        entry.fundingCost as number | undefined,
        program?.fundingCost ?? 0,
        0
      ),
      fatigueDelta: sanitizeInteger(
        entry.fatigueDelta as number | undefined,
        program?.fatigueDelta ?? 0,
        0
      ),
      recoveryBonus:
        typeof entry.recoveryBonus === 'number'
          ? sanitizeInteger(entry.recoveryBonus, 0, 0)
          : undefined,
      stabilityResistanceDelta:
        typeof entry.stabilityResistanceDelta === 'number'
          ? sanitizeInteger(entry.stabilityResistanceDelta, 0, 0)
          : undefined,
      stabilityToleranceDelta:
        typeof entry.stabilityToleranceDelta === 'number'
          ? sanitizeInteger(entry.stabilityToleranceDelta, 0, 0)
          : undefined,
      academyStatBonus:
        typeof entry.academyStatBonus === 'number'
          ? sanitizeInteger(entry.academyStatBonus, 0, 0)
          : undefined,
      relationshipDelta:
        typeof entry.relationshipDelta === 'number'
          ? sanitizeDecimal(entry.relationshipDelta, 0, Number.NEGATIVE_INFINITY)
          : undefined,
      trainedRelationshipDelta:
        typeof entry.trainedRelationshipDelta === 'number'
          ? sanitizeInteger(entry.trainedRelationshipDelta, 0, 0)
          : undefined,
    })
  }

  return nextQueue
}

function sanitizeProductionQueue(value: unknown): ProductionQueueEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  const nextQueue: ProductionQueueEntry[] = []

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      continue
    }

    const recipeId = typeof entry.recipeId === 'string' ? entry.recipeId : `recipe-${index + 1}`
    const recipe = getProductionRecipe(recipeId)
    const durationWeeks = sanitizeInteger(
      entry.durationWeeks as number | undefined,
      recipe?.durationWeeks ?? 1,
      1
    )

    nextQueue.push({
      id: typeof entry.id === 'string' ? entry.id : `queue-${index + 1}`,
      recipeId,
      recipeName:
        typeof entry.recipeName === 'string' ? entry.recipeName : (recipe?.name ?? recipeId),
      outputItemId:
        typeof entry.outputItemId === 'string'
          ? entry.outputItemId
          : (recipe?.outputItemId ?? `output-${index + 1}`),
      outputItemName:
        typeof entry.outputItemName === 'string'
          ? entry.outputItemName
          : (recipe?.outputItemName ?? `Output ${index + 1}`),
      outputQuantity: sanitizeInteger(
        entry.outputQuantity as number | undefined,
        recipe?.outputQuantity ?? 1,
        1
      ),
      startedWeek: sanitizeInteger(entry.startedWeek as number | undefined, 1, 1),
      durationWeeks,
      remainingWeeks: sanitizeInteger(entry.remainingWeeks as number | undefined, durationWeeks, 0),
      fundingCost: sanitizeInteger(
        entry.fundingCost as number | undefined,
        recipe?.baseFundingCost ?? 1,
        0
      ),
    })
  }

  return nextQueue
}

function sanitizeMarket(value: unknown, fallback: MarketState): MarketState {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    week: sanitizeInteger(value.week as number | undefined, fallback.week, 1),
    featuredRecipeId:
      typeof value.featuredRecipeId === 'string'
        ? value.featuredRecipeId
        : fallback.featuredRecipeId,
    pressure: isOneOf(value.pressure, MARKET_PRESSURES) ? value.pressure : fallback.pressure,
    costMultiplier: sanitizeDecimal(
      value.costMultiplier as number | undefined,
      fallback.costMultiplier,
      0.5,
      2
    ),
  }
}

function sanitizeOperationEvents(events: unknown, fallback: OperationEvent[]): OperationEvent[] {
  if (!Array.isArray(events)) {
    return fallback
  }

  const nextEvents: OperationEvent[] = []

  for (const [index, entry] of events.entries()) {
    if (!isRecord(entry) || !isRecord(entry.payload)) {
      continue
    }

    const eventType = normalizeLegacyOperationEventType(entry.type)

    if (!eventType) {
      continue
    }

    const payload = entry.payload
    const week = sanitizeInteger(payload.week as number | undefined, 1, 1)
    const schemaVersion = normalizeOperationEventSchemaVersion(entry.schemaVersion)
    const createBase = <TType extends OperationEventType>(
      type: TType
    ): Pick<
      OperationEvent<TType>,
      'id' | 'schemaVersion' | 'type' | 'sourceSystem' | 'timestamp'
    > => ({
      id:
        typeof entry.id === 'string' && entry.id.length > 0
          ? entry.id
          : `evt-migrated-${String(index + 1).padStart(6, '0')}`,
      schemaVersion,
      type,
      sourceSystem: inferOperationEventSourceSystem(type),
      timestamp:
        typeof entry.timestamp === 'string' && !Number.isNaN(Date.parse(entry.timestamp))
          ? entry.timestamp
          : buildOperationEventTimestamp(week, index + 1),
    })

    switch (eventType) {
      case 'assignment.team_assigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('assignment.team_assigned'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              caseKind: payload.caseKind === 'raid' ? 'raid' : 'case',
              teamId: typeof payload.teamId === 'string' ? payload.teamId : `team-${index + 1}`,
              teamName:
                typeof payload.teamName === 'string' ? payload.teamName : `Team ${index + 1}`,
              assignedTeamCount: sanitizeInteger(
                payload.assignedTeamCount as number | undefined,
                1,
                0
              ),
              maxTeams: sanitizeInteger(payload.maxTeams as number | undefined, 1, 1),
            },
          })
        )
        break

      case 'assignment.team_unassigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('assignment.team_unassigned'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              teamId: typeof payload.teamId === 'string' ? payload.teamId : `team-${index + 1}`,
              teamName:
                typeof payload.teamName === 'string' ? payload.teamName : `Team ${index + 1}`,
              remainingTeamCount: sanitizeInteger(
                payload.remainingTeamCount as number | undefined,
                0,
                0
              ),
            },
          })
        )
        break

      case 'case.resolved':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.resolved'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode:
                payload.mode === 'probability' || payload.mode === 'deterministic'
                  ? payload.mode
                  : 'threshold',
              kind: payload.kind === 'raid' ? 'raid' : 'case',
              stage: sanitizeInteger(payload.stage as number | undefined, 1, 1),
              teamIds: sanitizeStringList(payload.teamIds),
            },
          })
        )
        break

      case 'case.partially_resolved':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.partially_resolved'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode:
                payload.mode === 'probability' || payload.mode === 'deterministic'
                  ? payload.mode
                  : 'threshold',
              kind: payload.kind === 'raid' ? 'raid' : 'case',
              fromStage: sanitizeInteger(payload.fromStage as number | undefined, 1, 1),
              toStage: sanitizeInteger(payload.toStage as number | undefined, 1, 1),
              teamIds: sanitizeStringList(payload.teamIds),
            },
          })
        )
        break

      case 'case.failed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.failed'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              mode:
                payload.mode === 'probability' || payload.mode === 'deterministic'
                  ? payload.mode
                  : 'threshold',
              kind: payload.kind === 'raid' ? 'raid' : 'case',
              fromStage: sanitizeInteger(payload.fromStage as number | undefined, 1, 1),
              toStage: sanitizeInteger(payload.toStage as number | undefined, 1, 1),
              teamIds: sanitizeStringList(payload.teamIds),
            },
          })
        )
        break

      case 'case.escalated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.escalated'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              fromStage: sanitizeInteger(payload.fromStage as number | undefined, 1, 1),
              toStage: sanitizeInteger(payload.toStage as number | undefined, 1, 1),
              trigger: isOneOf(payload.trigger, CASE_ESCALATION_TRIGGERS)
                ? payload.trigger
                : 'deadline',
              deadlineRemaining: sanitizeInteger(
                payload.deadlineRemaining as number | undefined,
                1,
                0
              ),
              convertedToRaid:
                typeof payload.convertedToRaid === 'boolean' ? payload.convertedToRaid : false,
            },
          })
        )
        break

      case 'case.spawned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.spawned'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              templateId:
                typeof payload.templateId === 'string'
                  ? payload.templateId
                  : `template-${index + 1}`,
              kind: payload.kind === 'raid' ? 'raid' : 'case',
              stage: sanitizeInteger(payload.stage as number | undefined, 1, 1),
              trigger: isOneOf(payload.trigger, CASE_SPAWN_TRIGGERS)
                ? payload.trigger
                : 'unresolved',
              parentCaseId:
                typeof payload.parentCaseId === 'string' ? payload.parentCaseId : undefined,
              parentCaseTitle:
                typeof payload.parentCaseTitle === 'string' ? payload.parentCaseTitle : undefined,
              factionId: typeof payload.factionId === 'string' ? payload.factionId : undefined,
              factionLabel:
                typeof payload.factionLabel === 'string' ? payload.factionLabel : undefined,
              sourceReason:
                typeof payload.sourceReason === 'string' ? payload.sourceReason : undefined,
            },
          })
        )
        break

      case 'case.raid_converted':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('case.raid_converted'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string' ? payload.caseTitle : `Case ${index + 1}`,
              stage: sanitizeInteger(payload.stage as number | undefined, 1, 1),
              trigger: isOneOf(payload.trigger, CASE_ESCALATION_TRIGGERS)
                ? payload.trigger
                : 'deadline',
              minTeams: sanitizeInteger(payload.minTeams as number | undefined, 2, 1),
              maxTeams: sanitizeInteger(payload.maxTeams as number | undefined, 2, 1),
            },
          })
        )
        break

      case 'intel.report_generated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('intel.report_generated'),
            payload: {
              week,
              resolvedCount: sanitizeInteger(payload.resolvedCount as number | undefined, 0, 0),
              failedCount: sanitizeInteger(payload.failedCount as number | undefined, 0, 0),
              partialCount: sanitizeInteger(payload.partialCount as number | undefined, 0, 0),
              unresolvedCount: sanitizeInteger(payload.unresolvedCount as number | undefined, 0, 0),
              spawnedCount: sanitizeInteger(payload.spawnedCount as number | undefined, 0, 0),
              noteCount: sanitizeInteger(payload.noteCount as number | undefined, 0, 0),
              score: sanitizeInteger(
                payload.score as number | undefined,
                0,
                Number.MIN_SAFE_INTEGER
              ),
            },
          })
        )
        break

      case 'agent.training_started':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.training_started'),
            payload: {
              week,
              queueId: typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              trainingId:
                typeof payload.trainingId === 'string'
                  ? payload.trainingId
                  : `training-${index + 1}`,
              trainingName:
                typeof payload.trainingName === 'string'
                  ? payload.trainingName
                  : `Training ${index + 1}`,
              teamName: typeof payload.teamName === 'string' ? payload.teamName : undefined,
              etaWeeks: sanitizeInteger(payload.etaWeeks as number | undefined, 1, 0),
              fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agent.training_completed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.training_completed'),
            payload: {
              week,
              queueId: typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              trainingId:
                typeof payload.trainingId === 'string'
                  ? payload.trainingId
                  : `training-${index + 1}`,
              trainingName:
                typeof payload.trainingName === 'string'
                  ? payload.trainingName
                  : `Training ${index + 1}`,
            },
          })
        )
        break

      case 'agent.training_cancelled':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.training_cancelled'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              trainingId:
                typeof payload.trainingId === 'string'
                  ? payload.trainingId
                  : `training-${index + 1}`,
              trainingName:
                typeof payload.trainingName === 'string'
                  ? payload.trainingName
                  : `Training ${index + 1}`,
              refund: sanitizeInteger(payload.refund as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agent.relationship_changed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.relationship_changed'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              counterpartId:
                typeof payload.counterpartId === 'string'
                  ? payload.counterpartId
                  : `counterpart-${index + 1}`,
              counterpartName:
                typeof payload.counterpartName === 'string'
                  ? payload.counterpartName
                  : `Counterpart ${index + 1}`,
              previousValue: Number(payload.previousValue ?? 0),
              nextValue: Number(payload.nextValue ?? 0),
              delta: Number(payload.delta ?? 0),
              reason:
                payload.reason === 'mission_success' ||
                payload.reason === 'mission_partial' ||
                payload.reason === 'mission_fail' ||
                payload.reason === 'passive_drift' ||
                payload.reason === 'external_event' ||
                payload.reason === 'reconciliation' ||
                payload.reason === 'spontaneous_event' ||
                payload.reason === 'betrayal'
                  ? payload.reason
                  : 'passive_drift',
            },
          })
        )
        break

      case 'agent.instructor_assigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.instructor_assigned'),
            payload: {
              week,
              staffId: typeof payload.staffId === 'string' ? payload.staffId : `staff-${index + 1}`,
              instructorName:
                typeof payload.instructorName === 'string'
                  ? payload.instructorName
                  : `Instructor ${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              instructorSpecialty: isOneOf(payload.instructorSpecialty, STAT_KEYS)
                ? payload.instructorSpecialty
                : 'combat',
              bonus: sanitizeInteger(payload.bonus as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agent.instructor_unassigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.instructor_unassigned'),
            payload: {
              week,
              staffId: typeof payload.staffId === 'string' ? payload.staffId : `staff-${index + 1}`,
              instructorName:
                typeof payload.instructorName === 'string'
                  ? payload.instructorName
                  : `Instructor ${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              instructorSpecialty: isOneOf(payload.instructorSpecialty, STAT_KEYS)
                ? payload.instructorSpecialty
                : 'combat',
              bonus: sanitizeInteger(payload.bonus as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'agent.injured':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.injured'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              severity: typeof payload.severity === 'string' ? payload.severity : 'unknown',
            },
          })
        )
        break

      case 'agent.betrayed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.betrayed'),
            payload: {
              week,
              betrayerId:
                typeof payload.betrayerId === 'string' ? payload.betrayerId : `agent-${index + 1}`,
              betrayerName:
                typeof payload.betrayerName === 'string'
                  ? payload.betrayerName
                  : `Agent ${index + 1}`,
              betrayedId:
                typeof payload.betrayedId === 'string'
                  ? payload.betrayedId
                  : `counterpart-${index + 1}`,
              betrayedName:
                typeof payload.betrayedName === 'string'
                  ? payload.betrayedName
                  : `Counterpart ${index + 1}`,
              trustDamageDelta: Number(payload.trustDamageDelta ?? 0),
              trustDamageTotal: Number(payload.trustDamageTotal ?? 0),
              triggeredConsequences: Array.isArray(payload.triggeredConsequences)
                ? payload.triggeredConsequences.filter(
                    (
                      entry
                    ): entry is
                      | 'benching'
                      | 'performance_penalty'
                      | 'disciplinary'
                      | 'resignation' =>
                      entry === 'benching' ||
                      entry === 'performance_penalty' ||
                      entry === 'disciplinary' ||
                      entry === 'resignation'
                  )
                : [],
            },
          })
        )
        break

      case 'agent.resigned':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.resigned'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              reason: 'trust_failure_cumulative',
              counterpartId:
                typeof payload.counterpartId === 'string' ? payload.counterpartId : undefined,
              counterpartName:
                typeof payload.counterpartName === 'string' ? payload.counterpartName : undefined,
            },
          })
        )
        break

      case 'agent.promoted':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.promoted'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              newRole:
                payload.newRole === 'occultist' ||
                payload.newRole === 'investigator' ||
                payload.newRole === 'field_recon' ||
                payload.newRole === 'medium' ||
                payload.newRole === 'tech' ||
                payload.newRole === 'medic' ||
                payload.newRole === 'negotiator'
                  ? payload.newRole
                  : 'hunter',
              previousLevel: sanitizeInteger(payload.previousLevel as number | undefined, 1, 1),
              newLevel: sanitizeInteger(payload.newLevel as number | undefined, 2, 1),
              levelsGained: sanitizeInteger(payload.levelsGained as number | undefined, 1, 0),
              skillPointsGranted: sanitizeInteger(
                payload.skillPointsGranted as number | undefined,
                0,
                0
              ),
            },
          })
        )
        break

      case 'agent.hired':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agent.hired'),
            payload: {
              week,
              candidateId:
                typeof payload.candidateId === 'string' ? payload.candidateId : `cand-${index + 1}`,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              recruitCategory: isOneOf(payload.recruitCategory, RECRUIT_CATEGORIES)
                ? payload.recruitCategory
                : 'agent',
            },
          })
        )
        break

      case 'progression.xp_gained':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('progression.xp_gained'),
            payload: {
              week,
              agentId: typeof payload.agentId === 'string' ? payload.agentId : `agent-${index + 1}`,
              agentName:
                typeof payload.agentName === 'string' ? payload.agentName : `Agent ${index + 1}`,
              xpAmount: sanitizeInteger(payload.xpAmount as number | undefined, 0, 0),
              reason: typeof payload.reason === 'string' ? payload.reason : 'unknown',
              totalXp: sanitizeInteger(payload.totalXp as number | undefined, 0, 0),
              level: sanitizeInteger(payload.level as number | undefined, 1, 1),
              levelsGained: sanitizeInteger(payload.levelsGained as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'system.recruitment_expired':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.recruitment_expired'),
            payload: {
              week,
              count: sanitizeInteger(payload.count as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'system.recruitment_generated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.recruitment_generated'),
            payload: {
              week,
              count: sanitizeInteger(payload.count as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'system.party_cards_drawn':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.party_cards_drawn'),
            payload: {
              week,
              count: sanitizeInteger(payload.count as number | undefined, 0, 0),
            },
          })
        )
        break

      case 'recruitment.scouting_initiated':
      case 'recruitment.scouting_refined':
      case 'recruitment.intel_confirmed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase(eventType),
            payload: {
              week,
              candidateId:
                typeof payload.candidateId === 'string' ? payload.candidateId : `cand-${index + 1}`,
              candidateName:
                typeof payload.candidateName === 'string'
                  ? payload.candidateName
                  : `Candidate ${index + 1}`,
              fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
              stage: clamp(sanitizeInteger(payload.stage as number | undefined, 1, 1), 1, 3) as 1 | 2 | 3,
              projectedTier: isOneOf(payload.projectedTier, EXACT_POTENTIAL_TIERS)
                ? payload.projectedTier
                : 'C',
              confidence: isOneOf(payload.confidence, SCOUT_CONFIDENCES)
                ? payload.confidence
                : 'low',
              previousProjectedTier: isOneOf(payload.previousProjectedTier, EXACT_POTENTIAL_TIERS)
                ? payload.previousProjectedTier
                : undefined,
              previousConfidence: isOneOf(payload.previousConfidence, SCOUT_CONFIDENCES)
                ? payload.previousConfidence
                : undefined,
              confirmedTier: isOneOf(payload.confirmedTier, EXACT_POTENTIAL_TIERS)
                ? payload.confirmedTier
                : undefined,
              revealLevel: sanitizeInteger(payload.revealLevel as number | undefined, 1, 1),
              sourceFactionId:
                typeof payload.sourceFactionId === 'string' ? payload.sourceFactionId : undefined,
              sourceFactionName:
                typeof payload.sourceFactionName === 'string'
                  ? payload.sourceFactionName
                  : undefined,
              sourceContactId:
                typeof payload.sourceContactId === 'string' ? payload.sourceContactId : undefined,
              sourceContactName:
                typeof payload.sourceContactName === 'string'
                  ? payload.sourceContactName
                  : undefined,
            },
          })
        )
        break

      case 'production.queue_started':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('production.queue_started'),
            payload: {
              week,
              queueId: typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
              queueName:
                typeof payload.queueName === 'string' ? payload.queueName : `Queue ${index + 1}`,
              recipeId:
                typeof payload.recipeId === 'string' ? payload.recipeId : `recipe-${index + 1}`,
              outputId:
                typeof payload.outputId === 'string' ? payload.outputId : `output-${index + 1}`,
              outputName:
                typeof payload.outputName === 'string' ? payload.outputName : `Output ${index + 1}`,
              outputQuantity: sanitizeInteger(payload.outputQuantity as number | undefined, 1, 1),
              etaWeeks: sanitizeInteger(payload.etaWeeks as number | undefined, 1, 0),
              fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
              inputMaterials: [],
            },
          })
        )
        break

      case 'production.queue_completed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('production.queue_completed'),
            payload: {
              week,
              queueId: typeof payload.queueId === 'string' ? payload.queueId : `queue-${index + 1}`,
              queueName:
                typeof payload.queueName === 'string' ? payload.queueName : `Queue ${index + 1}`,
              recipeId:
                typeof payload.recipeId === 'string' ? payload.recipeId : `recipe-${index + 1}`,
              outputId:
                typeof payload.outputId === 'string' ? payload.outputId : `output-${index + 1}`,
              outputName:
                typeof payload.outputName === 'string' ? payload.outputName : `Output ${index + 1}`,
              outputQuantity: sanitizeInteger(payload.outputQuantity as number | undefined, 1, 1),
              fundingCost: sanitizeInteger(payload.fundingCost as number | undefined, 0, 0),
              inputMaterials: [],
            },
          })
        )
        break

      case 'market.shifted':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.shifted'),
            payload: {
              week,
              featuredRecipeId:
                typeof payload.featuredRecipeId === 'string'
                  ? payload.featuredRecipeId
                  : `recipe-${index + 1}`,
              featuredRecipeName:
                typeof payload.featuredRecipeName === 'string'
                  ? payload.featuredRecipeName
                  : `Recipe ${index + 1}`,
              pressure: isOneOf(payload.pressure, MARKET_PRESSURES) ? payload.pressure : 'stable',
              costMultiplier: sanitizeDecimal(
                payload.costMultiplier as number | undefined,
                1,
                0.5,
                2
              ),
            },
          })
        )
        break

      case 'market.transaction_recorded':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('market.transaction_recorded'),
            payload: {
              week,
              marketWeek: sanitizeInteger(payload.marketWeek as number | undefined, week, 1),
              transactionId:
                typeof payload.transactionId === 'string'
                  ? payload.transactionId
                  : `txn-${week}-${index + 1}`,
              action: isOneOf(payload.action, MARKET_TRANSACTION_ACTIONS) ? payload.action : 'buy',
              listingId:
                typeof payload.listingId === 'string' ? payload.listingId : `listing-${index + 1}`,
              itemId: typeof payload.itemId === 'string' ? payload.itemId : `item-${index + 1}`,
              itemName:
                typeof payload.itemName === 'string' ? payload.itemName : `Item ${index + 1}`,
              category: isOneOf(payload.category, MARKET_TRANSACTION_CATEGORIES)
                ? payload.category
                : 'material',
              quantity: sanitizeInteger(payload.quantity as number | undefined, 1, 0),
              bundleCount: sanitizeInteger(payload.bundleCount as number | undefined, 1, 0),
              unitPrice: sanitizeInteger(payload.unitPrice as number | undefined, 0, 0),
              totalPrice: sanitizeInteger(payload.totalPrice as number | undefined, 0, 0),
              remainingAvailability: sanitizeInteger(
                payload.remainingAvailability as number | undefined,
                0,
                0
              ),
            },
          })
        )
        break

      case 'faction.activity':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('faction.standing_changed'),
            payload: {
              week,
              factionId:
                typeof payload.factionId === 'string' ? payload.factionId : `faction-${index + 1}`,
              factionName:
                typeof payload.factionName === 'string'
                  ? payload.factionName
                  : `Faction ${index + 1}`,
              delta: 0,
              standingBefore: 0,
              standingAfter: 0,
              reason: 'case.resolved',
              caseTitle: typeof payload.summary === 'string' ? payload.summary : undefined,
            },
          })
        )
        break

      case 'faction.standing_changed':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('faction.standing_changed'),
            payload: {
              week,
              factionId:
                typeof payload.factionId === 'string' ? payload.factionId : `faction-${index + 1}`,
              factionName:
                typeof payload.factionName === 'string'
                  ? payload.factionName
                  : `Faction ${index + 1}`,
              delta: sanitizeInteger(payload.delta as number | undefined, 0, -9999),
              standingBefore: sanitizeInteger(
                payload.standingBefore as number | undefined,
                0,
                -9999
              ),
              standingAfter: sanitizeInteger(payload.standingAfter as number | undefined, 0, -9999),
              reason:
                payload.reason === 'case.partially_resolved' ||
                payload.reason === 'case.failed' ||
                payload.reason === 'case.escalated' ||
                payload.reason === 'recruitment.hired'
                  ? payload.reason
                  : 'case.resolved',
              caseId: typeof payload.caseId === 'string' ? payload.caseId : undefined,
              caseTitle: typeof payload.caseTitle === 'string' ? payload.caseTitle : undefined,
              interactionLabel:
                typeof payload.interactionLabel === 'string'
                  ? payload.interactionLabel
                  : undefined,
              contactId: typeof payload.contactId === 'string' ? payload.contactId : undefined,
              contactName:
                typeof payload.contactName === 'string' ? payload.contactName : undefined,
              contactRelationshipBefore: sanitizeInteger(
                payload.contactRelationshipBefore as number | undefined,
                0,
                -9999
              ),
              contactRelationshipAfter: sanitizeInteger(
                payload.contactRelationshipAfter as number | undefined,
                0,
                -9999
              ),
              contactDelta: sanitizeInteger(payload.contactDelta as number | undefined, 0, -9999),
            },
          })
        )
        break

      case 'faction.unlock_available':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('faction.unlock_available'),
            payload: {
              week,
              factionId:
                typeof payload.factionId === 'string' ? payload.factionId : `faction-${index + 1}`,
              factionName:
                typeof payload.factionName === 'string'
                  ? payload.factionName
                  : `Faction ${index + 1}`,
              contactId: typeof payload.contactId === 'string' ? payload.contactId : undefined,
              contactName:
                typeof payload.contactName === 'string' ? payload.contactName : undefined,
              label: typeof payload.label === 'string' ? payload.label : `Unlock ${index + 1}`,
              summary:
                typeof payload.summary === 'string'
                  ? payload.summary
                  : `Faction unlock available (${index + 1})`,
              disposition: isOneOf(payload.disposition, FACTION_UNLOCK_DISPOSITIONS)
                ? payload.disposition
                : 'supportive',
            },
          })
        )
        break

      case 'agency.containment_updated':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('agency.containment_updated'),
            payload: {
              week,
              containmentRatingBefore: sanitizeInteger(
                payload.containmentRatingBefore as number | undefined,
                0,
                0
              ),
              containmentRatingAfter: sanitizeInteger(
                payload.containmentRatingAfter as number | undefined,
                0,
                0
              ),
              containmentDelta: sanitizeInteger(
                payload.containmentDelta as number | undefined,
                0,
                -100
              ),
              clearanceLevelBefore: sanitizeInteger(
                payload.clearanceLevelBefore as number | undefined,
                1,
                1
              ),
              clearanceLevelAfter: sanitizeInteger(
                payload.clearanceLevelAfter as number | undefined,
                1,
                1
              ),
              fundingBefore: sanitizeInteger(payload.fundingBefore as number | undefined, 0, 0),
              fundingAfter: sanitizeInteger(payload.fundingAfter as number | undefined, 0, 0),
              fundingDelta: sanitizeInteger(payload.fundingDelta as number | undefined, 0, -10000),
            },
          })
        )
        break

      case 'directive.applied':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('directive.applied'),
            payload: {
              week,
              directiveId: isWeeklyDirectiveId(payload.directiveId)
                ? payload.directiveId
                : FALLBACK_WEEKLY_DIRECTIVE_ID,
              directiveLabel:
                typeof payload.directiveLabel === 'string'
                  ? payload.directiveLabel
                  : 'Directive applied',
            },
          })
        )
        break

      case 'support.shortfall':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('support.shortfall'),
            payload: {
              week,
              caseId: typeof payload.caseId === 'string' ? payload.caseId : `case-${index + 1}`,
              caseTitle:
                typeof payload.caseTitle === 'string'
                  ? payload.caseTitle
                  : `Case ${index + 1}`,
              remainingSupport: sanitizeInteger(
                payload.remainingSupport as number | undefined,
                0,
                0
              ),
            },
          })
        )
        break

      case 'system.academy_upgraded':
        nextEvents.push(
          migrateOperationEventToCurrentSchema({
            ...createBase('system.academy_upgraded'),
            payload: {
              week,
              tierBefore: sanitizeInteger(payload.tierBefore as number | undefined, 0, 0),
              tierAfter: sanitizeInteger(payload.tierAfter as number | undefined, 1, 0),
              fundingBefore: sanitizeInteger(payload.fundingBefore as number | undefined, 0, 0),
              fundingAfter: sanitizeInteger(payload.fundingAfter as number | undefined, 0, 0),
              cost: sanitizeInteger(payload.cost as number | undefined, 0, 0),
            },
          })
        )
        break
    }
  }

  return nextEvents
}

function sanitizeWeeklyDirectiveState(
  value: unknown,
  fallback = createDefaultWeeklyDirectiveState()
) {
  if (!isRecord(value)) {
    return fallback
  }

  return {
    selectedId: isWeeklyDirectiveId(value.selectedId) ? value.selectedId : fallback.selectedId,
    history: Array.isArray(value.history)
      ? value.history
          .filter(
            (entry): entry is { week: number; directiveId: string } =>
              isRecord(entry) &&
              typeof entry.week === 'number' &&
              typeof entry.directiveId === 'string'
          )
          .filter((entry) => isWeeklyDirectiveId(entry.directiveId))
          .map((entry) => ({
            week: sanitizeInteger(entry.week, 1, 1),
            directiveId: entry.directiveId,
          }))
      : fallback.history,
  }
}

function sanitizeWeeklyReports(
  reports: unknown,
  cases: GameState['cases'],
  teams: GameState['teams'],
  agents: GameState['agents']
) {
  if (!Array.isArray(reports)) {
    return []
  }

  const fallbackCaseSnapshots = buildReportCaseSnapshots(cases)
  const fallbackTeamStatus = buildReportTeamStatus(teams, agents, cases)
  const nextReports: WeeklyReport[] = []

  for (const [index, report] of reports.entries()) {
    if (!isRecord(report)) {
      continue
    }

    const week = sanitizeInteger(report.week as number | undefined, index + 1, 1)

    nextReports.push(
      stripUndefinedFields({
        week,
        rngStateBefore: normalizeSeed((report.rngStateBefore as number | undefined) ?? index + 1),
        rngStateAfter: normalizeSeed((report.rngStateAfter as number | undefined) ?? index + 1),
        newCases: sanitizeStringList(report.newCases),
        progressedCases: sanitizeStringList(report.progressedCases),
        resolvedCases: sanitizeStringList(report.resolvedCases),
        failedCases: sanitizeStringList(report.failedCases),
        partialCases: sanitizeStringList(report.partialCases),
        unresolvedTriggers: sanitizeStringList(report.unresolvedTriggers),
        spawnedCases: sanitizeStringList(report.spawnedCases),
        maxStage: sanitizeInteger(report.maxStage as number | undefined, 0, 0),
        avgFatigue: sanitizeInteger(report.avgFatigue as number | undefined, 0, 0),
        teamStatus: sanitizeTeamStatus(report.teamStatus, fallbackTeamStatus),
        caseSnapshots: sanitizeCaseSnapshots(report.caseSnapshots, fallbackCaseSnapshots),
        notes: sanitizeReportNoteList(report.notes, week),
      }) as WeeklyReport
    )
  }

  return nextReports
}

export function hydrateGame(game: unknown, fallback = createStartingState()): GameState {
  if (!isRecord(game)) {
    return fallback
  }

  const hasPersistedContracts = Object.prototype.hasOwnProperty.call(game, 'contracts')
  const week = sanitizeInteger(game.week as number | undefined, fallback.week, 1)
  const candidates = Array.isArray(game.candidates)
    ? (game.candidates as GameState['candidates'])
    : fallback.candidates
  const recruitmentPool = Array.isArray(game.recruitmentPool)
    ? (game.recruitmentPool as GameState['candidates'])
    : candidates
  const agents =
    isRecord(game.agents) && Object.values(game.agents).every((agent) => isRecord(agent))
      ? (game.agents as GameState['agents'])
      : fallback.agents
  const teams =
    isRecord(game.teams) && Object.values(game.teams).every((team) => isRecord(team))
      ? (game.teams as GameState['teams'])
      : fallback.teams
  const cases =
    isRecord(game.cases) && Object.values(game.cases).every((currentCase) => isRecord(currentCase))
      ? (game.cases as GameState['cases'])
      : fallback.cases
  const normalizedCases = normalizeMissionIntelRecord(cases, week)
  const rngSeed = normalizeSeed((game.rngSeed as number | undefined) ?? fallback.rngSeed)

  const hydrated = syncTeamSimulationState(
    stripUndefinedFields({
      ...fallback,
      ...game,
      week,
      rngSeed,
      rngState: normalizeSeed((game.rngState as number | undefined) ?? rngSeed),
      gameOver: typeof game.gameOver === 'boolean' ? game.gameOver : fallback.gameOver,
      gameOverReason:
        typeof game.gameOverReason === 'string' ? game.gameOverReason : fallback.gameOverReason,
      directiveState: sanitizeWeeklyDirectiveState(game.directiveState, fallback.directiveState),
      agents,
      candidates: recruitmentPool,
      recruitmentPool,
      teams,
      cases: normalizedCases,
      reports: sanitizeWeeklyReports(game.reports, normalizedCases, teams, agents),
      events: sanitizeOperationEvents(game.events, fallback.events),
      inventory: sanitizeInventory(game.inventory, fallback.inventory),
      runtimeState: normalizeRuntimeState(game.runtimeState, week, fallback.runtimeState),
      partyCards: sanitizePartyCardState(game.partyCards, fallback.partyCards),
      trainingQueue: sanitizeTrainingQueue(game.trainingQueue),
      productionQueue: sanitizeProductionQueue(game.productionQueue),
      market: sanitizeMarket(game.market, fallback.market),
      config: sanitizeGameConfig(game.config, fallback.config),
      contracts: hasPersistedContracts ? game.contracts : undefined,
      academyTier: clamp(
        sanitizeInteger(game.academyTier as number | undefined, fallback.academyTier ?? 0, 0),
        0,
        MAX_ACADEMY_TIER
      ),
      containmentRating: sanitizeInteger(
        game.containmentRating as number | undefined,
        fallback.containmentRating,
        0
      ),
      clearanceLevel: sanitizeInteger(
        game.clearanceLevel as number | undefined,
        fallback.clearanceLevel,
        1
      ),
      funding: sanitizeInteger(game.funding as number | undefined, fallback.funding, 0),
      templates: fallback.templates,
    }) as GameState
  )

  return refreshContractBoard({
    ...hydrated,
    replacementPressureState: buildReplacementPressureState(hydrated),
    teams: Object.fromEntries(
      Object.entries(hydrated.teams).map(([teamId, team]) => [
        teamId,
        {
          ...team,
          deploymentReadinessState: buildTeamDeploymentReadinessState(hydrated, teamId),
        },
      ])
    ),
  })
}

export function migratePersistedStore(
  persistedState: unknown,
  version: number,
  fallback = createStartingState()
): PersistedStore {
  if (version < 1 || !isRecord(persistedState)) {
    return { game: stripGameTemplates(fallback) }
  }

  if (!('game' in persistedState)) {
    return { game: stripGameTemplates(fallback) }
  }

  return {
    game: stripGameTemplates(hydrateGame(persistedState.game, fallback)),
  }
}

export function createRunExportPayload(game: GameState): RunExportPayload {
  return {
    kind: RUN_EXPORT_KIND,
    version: GAME_STORE_VERSION,
    exportedAt: new Date().toISOString(),
    game: stripGameTemplates(game),
  }
}

export function serializeRunExport(game: GameState) {
  return JSON.stringify(createRunExportPayload(game), null, 2)
}

export function parseRunExport(raw: string, fallback = createStartingState()): GameState {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Run payload is not valid JSON.')
  }

  if (!isRecord(parsed) || parsed.kind !== RUN_EXPORT_KIND || !('game' in parsed)) {
    throw new Error('Run payload is not a supported Containment Protocol export.')
  }

  if (typeof parsed.version !== 'number' || parsed.version > GAME_STORE_VERSION) {
    throw new Error('Run payload version is not supported by this build.')
  }

  return hydrateGame(parsed.game, fallback)
}

export function createRunFromCurrentConfig(config: GameConfig, seed: number) {
  const nextGame = createStartingState()
  const normalizedSeed = normalizeSeed(seed)

  return {
    ...nextGame,
    rngSeed: normalizedSeed,
    rngState: normalizedSeed,
    config: sanitizeGameConfig(config, nextGame.config),
  }
}
