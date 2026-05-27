import { isAllowedProgressClockId, PROGRESS_CLOCK_HYDRATION_MAX } from './progressClocks'
import {
  getDefaultRuntimeLocation,
  isRuntimeSceneHistoryEntryValid,
  isRuntimeSceneValidForHub,
  resolveRuntimeCurrentLocation,
} from './runtimeLocationRegistry'
import type {
  Agent,
  CaseInstance,
  DeveloperLogDetailValue,
  DeveloperLogEvent,
  DeveloperLogEventType,
  EncounterResolutionOutcome,
  EncounterRuntimeState,
  EncounterRuntimeStatus,
  GameFlagValue,
  GameLocationState,
  GameState,
  GameUiDebugState,
  OneShotEventState,
  PlayerProfileState,
  ProgressClockState,
  RuntimeEventQueuePayloadValue,
  RuntimeEventQueueState,
  RuntimeQueuedEvent,
  RuntimeState,
  SceneHistoryEntry,
  Team,
} from './models'

const DEFAULT_PLAYER_PROFILE: PlayerProfileState = {
  id: 'director',
  displayName: 'Director',
  callsign: 'Control',
  organization: 'Containment Protocol',
}

const SCENE_HISTORY_LIMIT = 200
const DEVELOPER_LOG_HYDRATION_LIMIT = 200
const DEVELOPER_LOG_TYPES: readonly DeveloperLogEventType[] = [
  'flag.set',
  'flag.cleared',
  'one_shot.consumed',
  'route.selected',
  'choice.executed',
  'event_queue.enqueued',
  'event_queue.dequeued',
  'event_queue.cleared',
  'progress_clock.changed',
  'encounter.patched',
  'location.changed',
  'save.exported',
  'save.imported',
  'authoring.context_changed',
] as const

const RUNTIME_QUEUED_EVENT_TYPES = new Set<string>([
  'authored.follow_up',
  'encounter.follow_up',
  'encounter.patched',
  'encounter.escalation',
])

export interface GameStateManagerView {
  player: PlayerProfileState
  globalFlags: Record<string, GameFlagValue>
  oneShotEvents: Record<string, OneShotEventState>
  currentLocation: GameLocationState
  sceneHistory: SceneHistoryEntry[]
  inventory: Record<string, number>
  encounterState: Record<string, EncounterRuntimeState>
  progressClocks: Record<string, ProgressClockState>
  eventQueue: RuntimeEventQueueState
  ui: GameUiDebugState
}

export interface SceneVisitInput {
  sceneId: string
  locationId: string
  week?: number
  outcome?: string
  tags?: string[]
}

export interface EncounterRuntimePatch {
  status?: EncounterRuntimeStatus
  phase?: string
  startedWeek?: number
  resolvedWeek?: number
  latestOutcome?: EncounterResolutionOutcome
  lastResolutionId?: string
  followUpIds?: string[]
  hiddenModifierIds?: string[]
  revealedModifierIds?: string[]
  flags?: Record<string, boolean>
  lastUpdatedWeek?: number
}

export interface ProgressClockPatch {
  label?: string
  value?: number
  max?: number
  hidden?: boolean
  completedAtWeek?: number
}

export interface OneShotConsumptionResult {
  state: GameState
  consumed: boolean
  event: OneShotEventState | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function sanitizeOptionalString(value: unknown) {
  const next = sanitizeString(value)
  return next.length > 0 ? next : undefined
}

function sanitizeInteger(value: unknown, fallback: number, min = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Math.max(min, Math.trunc(fallback))
  }

  return Math.max(min, Math.trunc(value))
}

function clampCampaignWeek(value: unknown, campaignWeek: number, fallback: number) {
  const cappedWeek = Math.max(1, Math.trunc(campaignWeek))
  return Math.min(cappedWeek, sanitizeInteger(value, fallback, 1))
}

function parseQueueEventSequence(eventId: string) {
  const match = /^qevt-(\d+)$/i.exec(sanitizeString(eventId))

  return match ? Math.max(0, Number.parseInt(match[1], 10)) : 0
}

function parseDeveloperLogSequence(eventId: string) {
  const match = /^devlog-(\d+)$/i.exec(sanitizeString(eventId))

  return match ? Math.max(0, Number.parseInt(match[1], 10)) : 0
}

function isRuntimeQueuedEventTargetValid(
  type: string,
  targetId: string,
  encounterState: Record<string, EncounterRuntimeState>
) {
  if (type === 'encounter.follow_up') {
    return targetId.length > 0
  }

  if (type === 'encounter.patched' || type === 'encounter.escalation') {
    return targetId.length > 0 && encounterState[targetId] !== undefined
  }

  return targetId.length > 0
}

function sanitizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map((entry) => sanitizeString(entry)).filter((entry) => entry.length > 0))]
}

function isFlagValue(value: unknown): value is GameFlagValue {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    typeof value === 'boolean'
  )
}

/** Hydration 652-653: preserve finite numeric precision; integers stay integers. */
function sanitizeHydrationNumericValue(value: number) {
  return Number.isInteger(value) ? Math.trunc(value) : value
}

function sanitizeFlagRecord(value: unknown) {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, GameFlagValue> = {}

  for (const [flagId, rawValue] of Object.entries(value)) {
    const normalizedId = sanitizeString(flagId)

    if (normalizedId.length === 0 || !isFlagValue(rawValue) || normalizedId in next) {
      continue
    }

    next[normalizedId] =
      typeof rawValue === 'number'
        ? sanitizeHydrationNumericValue(rawValue)
        : typeof rawValue === 'string'
          ? rawValue
          : rawValue
  }

  return next
}

function sanitizePlayerProfile(value: unknown, fallback = DEFAULT_PLAYER_PROFILE): PlayerProfileState {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    id: sanitizeString(value.id, fallback.id) || fallback.id,
    displayName: sanitizeString(value.displayName, fallback.displayName) || fallback.displayName,
    ...(sanitizeOptionalString(value.callsign) ? { callsign: sanitizeOptionalString(value.callsign) } : {}),
    ...(sanitizeOptionalString(value.organization)
      ? { organization: sanitizeOptionalString(value.organization) }
      : fallback.organization
        ? { organization: fallback.organization }
        : {}),
  }
}

function sanitizeLocationState(value: unknown, week: number): GameLocationState {
  if (!isRecord(value)) {
    return getDefaultRuntimeLocation(week)
  }

  return resolveRuntimeCurrentLocation(
    {
      hubId: sanitizeString(value.hubId),
      locationId: sanitizeOptionalString(value.locationId),
      sceneId: sanitizeOptionalString(value.sceneId),
      updatedWeek: clampCampaignWeek(value.updatedWeek, week, week),
    },
    week
  )
}

function sceneHistoryDedupeKey(entry: SceneHistoryEntry) {
  return `${entry.locationId}:${entry.sceneId}:${entry.week}`
}

function finalizeSceneHistoryEntries(entries: SceneHistoryEntry[]): SceneHistoryEntry[] {
  const dedupedByKey = new Map<string, SceneHistoryEntry>()

  for (const entry of entries) {
    dedupedByKey.set(sceneHistoryDedupeKey(entry), entry)
  }

  return [...dedupedByKey.values()]
    .sort(
      (left, right) =>
        left.week - right.week ||
        left.locationId.localeCompare(right.locationId) ||
        left.sceneId.localeCompare(right.sceneId)
    )
    .slice(-SCENE_HISTORY_LIMIT)
}

function sanitizeSceneHistoryEntry(value: unknown, campaignWeek: number): SceneHistoryEntry | null {
  if (!isRecord(value)) {
    return null
  }

  const sceneId = sanitizeString(value.sceneId)
  const locationId = sanitizeString(value.locationId)

  if (sceneId.length === 0 || locationId.length === 0) {
    return null
  }

  if (!isRuntimeSceneHistoryEntryValid(locationId, sceneId)) {
    return null
  }

  return {
    sceneId,
    locationId,
    week: clampCampaignWeek(value.week, campaignWeek, 1),
    ...(sanitizeOptionalString(value.outcome) ? { outcome: sanitizeOptionalString(value.outcome) } : {}),
    ...(sanitizeStringList(value.tags).length > 0 ? { tags: sanitizeStringList(value.tags) } : {}),
  }
}

function sanitizeOneShotEvents(value: unknown, week: number) {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, OneShotEventState> = {}

  for (const [eventId, rawEntry] of Object.entries(value)) {
    const normalizedId = sanitizeString(eventId)

    if (normalizedId.length === 0) {
      continue
    }

    if (rawEntry === true) {
      next[normalizedId] = {
        eventId: normalizedId,
        seen: true,
        firstSeenWeek: clampCampaignWeek(week, week, 1),
      }
      continue
    }

    if (!isRecord(rawEntry)) {
      continue
    }

    if (rawEntry.seen !== true) {
      continue
    }

    next[normalizedId] = {
      eventId: normalizedId,
      seen: true,
      firstSeenWeek: clampCampaignWeek(rawEntry.firstSeenWeek, week, week),
      ...(sanitizeOptionalString(rawEntry.source) ? { source: sanitizeOptionalString(rawEntry.source) } : {}),
    }
  }

  return next
}

function sanitizeEncounterFlags(value: unknown) {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, boolean> = {}

  for (const [flagId, rawValue] of Object.entries(value)) {
    const normalizedId = sanitizeString(flagId)

    if (normalizedId.length === 0 || typeof rawValue !== 'boolean' || normalizedId in next) {
      continue
    }

    next[normalizedId] = rawValue
  }

  return next
}

function reconcileEncounterModifierLists(
  hiddenModifierIds: readonly string[] | undefined,
  revealedModifierIds: readonly string[] | undefined
) {
  const revealed = sanitizeStringList(revealedModifierIds)
  const revealedSet = new Set(revealed)
  const hidden = sanitizeStringList(hiddenModifierIds).filter((modifierId) => !revealedSet.has(modifierId))

  return {
    hiddenModifierIds: hidden,
    revealedModifierIds: revealed,
  }
}

function isEncounterResolutionOutcome(value: unknown): value is EncounterResolutionOutcome {
  return (
    value === 'success' ||
    value === 'partial' ||
    value === 'failure' ||
    value === 'failed' ||
    value === 'dismissed'
  )
}

function finalizeEncounterRuntimeState(
  encounter: EncounterRuntimeState,
  campaignWeek: number
): EncounterRuntimeState {
  const status = encounter.status ?? 'available'
  const startedWeek =
    typeof encounter.startedWeek === 'number'
      ? clampCampaignWeek(encounter.startedWeek, campaignWeek, campaignWeek)
      : undefined
  let resolvedWeek =
    typeof encounter.resolvedWeek === 'number'
      ? clampCampaignWeek(encounter.resolvedWeek, campaignWeek, campaignWeek)
      : undefined
  let latestOutcome = encounter.latestOutcome
  let lastResolutionId = encounter.lastResolutionId

  if (status === 'active') {
    resolvedWeek = undefined
    latestOutcome = undefined
    lastResolutionId = undefined
  }

  if (status === 'resolved') {
    if (!latestOutcome) {
      latestOutcome = 'failure'
    }

    const resolvedAnchor = resolvedWeek ?? startedWeek ?? campaignWeek
    const startAnchor = startedWeek ?? 1
    resolvedWeek = Math.max(startAnchor, clampCampaignWeek(resolvedAnchor, campaignWeek, startAnchor))
  } else if (resolvedWeek !== undefined && startedWeek !== undefined) {
    resolvedWeek = Math.max(
      startedWeek,
      clampCampaignWeek(resolvedWeek, campaignWeek, startedWeek)
    )
  } else if (resolvedWeek !== undefined) {
    resolvedWeek = clampCampaignWeek(resolvedWeek, campaignWeek, campaignWeek)
  }

  const modifierLists = reconcileEncounterModifierLists(
    encounter.hiddenModifierIds,
    encounter.revealedModifierIds
  )

  const nextEncounter: EncounterRuntimeState = {
    encounterId: encounter.encounterId,
    status,
    ...(encounter.phase ? { phase: encounter.phase } : {}),
    ...(startedWeek !== undefined ? { startedWeek } : {}),
    hiddenModifierIds: modifierLists.hiddenModifierIds,
    revealedModifierIds: modifierLists.revealedModifierIds,
    flags: encounter.flags,
    lastUpdatedWeek: clampCampaignWeek(encounter.lastUpdatedWeek, campaignWeek, campaignWeek),
  }

  if (resolvedWeek !== undefined) {
    nextEncounter.resolvedWeek = resolvedWeek
  }

  if (latestOutcome !== undefined) {
    nextEncounter.latestOutcome = latestOutcome
  }

  if (lastResolutionId !== undefined) {
    nextEncounter.lastResolutionId = lastResolutionId
  }

  if (encounter.followUpIds && encounter.followUpIds.length > 0) {
    nextEncounter.followUpIds = encounter.followUpIds
  }

  return nextEncounter
}

function sanitizeEncounterRuntimeState(
  encounterId: string,
  value: unknown,
  week: number
): EncounterRuntimeState {
  const fallback: EncounterRuntimeState = {
    encounterId,
    status: 'available',
    hiddenModifierIds: [],
    revealedModifierIds: [],
    flags: {},
    lastUpdatedWeek: clampCampaignWeek(week, week, 1),
  }

  if (!isRecord(value)) {
    return fallback
  }

  const normalizedStatus = sanitizeString(value.status, fallback.status ?? 'available')
  const status: EncounterRuntimeStatus =
    normalizedStatus === 'hidden' ||
    normalizedStatus === 'available' ||
    normalizedStatus === 'active' ||
    normalizedStatus === 'resolved' ||
    normalizedStatus === 'locked' ||
    normalizedStatus === 'archived'
      ? normalizedStatus
      : fallback.status ?? 'available'

  const encounter: EncounterRuntimeState = {
    encounterId,
    status,
    ...(sanitizeOptionalString(value.phase) ? { phase: sanitizeOptionalString(value.phase) } : {}),
    ...(typeof value.startedWeek === 'number'
      ? { startedWeek: clampCampaignWeek(value.startedWeek, week, week) }
      : {}),
    ...(typeof value.resolvedWeek === 'number'
      ? { resolvedWeek: clampCampaignWeek(value.resolvedWeek, week, week) }
      : {}),
    ...(isEncounterResolutionOutcome(value.latestOutcome) ? { latestOutcome: value.latestOutcome } : {}),
    ...(sanitizeOptionalString(value.lastResolutionId)
      ? { lastResolutionId: sanitizeOptionalString(value.lastResolutionId) }
      : {}),
    ...(sanitizeStringList(value.followUpIds).length > 0
      ? { followUpIds: sanitizeStringList(value.followUpIds) }
      : {}),
    hiddenModifierIds: sanitizeStringList(value.hiddenModifierIds),
    revealedModifierIds: sanitizeStringList(value.revealedModifierIds),
    flags: sanitizeEncounterFlags(value.flags),
    lastUpdatedWeek: clampCampaignWeek(value.lastUpdatedWeek, week, week),
  }

  return finalizeEncounterRuntimeState(encounter, week)
}

function sanitizeEncounterRuntimeMap(value: unknown, week: number) {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, EncounterRuntimeState> = {}

  for (const [encounterId, rawEntry] of Object.entries(value)) {
    const normalizedId = sanitizeString(encounterId)

    if (normalizedId.length === 0) {
      continue
    }

    next[normalizedId] = sanitizeEncounterRuntimeState(normalizedId, rawEntry, week)
  }

  return next
}

function sanitizeProgressClockState(
  clockId: string,
  value: unknown,
  week: number
): ProgressClockState {
  const fallbackMax = 4
  const fallbackLabel = clockId

  if (!isRecord(value)) {
    return {
      id: clockId,
      label: fallbackLabel,
      value: 0,
      max: fallbackMax,
    }
  }

  const max = Math.min(
    PROGRESS_CLOCK_HYDRATION_MAX,
    Math.max(1, sanitizeInteger(value.max, fallbackMax, 1))
  )
  const valueClamped = Math.min(max, sanitizeInteger(value.value, 0, 0))

  return {
    id: clockId,
    label: sanitizeString(value.label, fallbackLabel) || fallbackLabel,
    value: valueClamped,
    max,
    ...(typeof value.hidden === 'boolean' ? { hidden: value.hidden } : {}),
    ...(valueClamped >= max
      ? { completedAtWeek: clampCampaignWeek(value.completedAtWeek, week, week) }
      : {}),
  }
}

function sanitizeProgressClockMap(value: unknown, week: number) {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, ProgressClockState> = {}

  for (const [clockId, rawEntry] of Object.entries(value)) {
    const normalizedId = sanitizeString(clockId)

    if (
      normalizedId.length === 0 ||
      !isAllowedProgressClockId(normalizedId) ||
      normalizedId in next
    ) {
      continue
    }

    next[normalizedId] = sanitizeProgressClockState(normalizedId, rawEntry, week)
  }

  return next
}

function sanitizeRuntimeEventQueuePayloadValue(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return sanitizeHydrationNumericValue(value)
  }

  if (typeof value === 'string') {
    const normalized = sanitizeString(value)
    return normalized.length > 0 ? normalized : null
  }

  if (Array.isArray(value)) {
    const list = sanitizeStringList(value)
    return list.length > 0 ? list : null
  }

  return null
}

function sanitizeRuntimeEventQueuePayload(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const next: Record<string, RuntimeEventQueuePayloadValue> = {}

  for (const [payloadId, rawValue] of Object.entries(value)) {
    const normalizedId = sanitizeString(payloadId)
    const normalizedValue = sanitizeRuntimeEventQueuePayloadValue(rawValue)

    if (normalizedId.length === 0 || normalizedValue === null || normalizedId in next) {
      continue
    }

    next[normalizedId] = normalizedValue
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeRuntimeQueuedEvent(
  value: unknown,
  index: number,
  week: number,
  encounterState: Record<string, EncounterRuntimeState>
): RuntimeQueuedEvent | null {
  if (!isRecord(value)) {
    return null
  }

  const type = sanitizeString(value.type)
  const targetId = sanitizeString(value.targetId)

  if (!RUNTIME_QUEUED_EVENT_TYPES.has(type) || !isRuntimeQueuedEventTargetValid(type, targetId, encounterState)) {
    return null
  }

  return {
    id: sanitizeString(value.id, `qevt-${String(index + 1).padStart(4, '0')}`),
    type,
    targetId,
    ...(sanitizeOptionalString(value.contextId)
      ? { contextId: sanitizeOptionalString(value.contextId) }
      : {}),
    ...(sanitizeOptionalString(value.source) ? { source: sanitizeOptionalString(value.source) } : {}),
    ...(typeof value.week === 'number' ? { week: clampCampaignWeek(value.week, week, week) } : {}),
    ...(sanitizeRuntimeEventQueuePayload(value.payload)
      ? { payload: sanitizeRuntimeEventQueuePayload(value.payload) }
      : {}),
  }
}

function dedupeRuntimeQueuedEventsById(entries: RuntimeQueuedEvent[]) {
  const seenIds = new Set<string>()
  const next: RuntimeQueuedEvent[] = []

  for (const [index, entry] of entries.entries()) {
    let id = entry.id

    if (seenIds.has(id)) {
      id = `${entry.id}-dup-${index + 1}`
    }

    seenIds.add(id)

    next.push(id === entry.id ? entry : { ...entry, id })
  }

  return next
}

function sanitizeRuntimeEventQueueState(
  value: unknown,
  week: number,
  encounterState: Record<string, EncounterRuntimeState>
): RuntimeEventQueueState {
  if (!isRecord(value)) {
    return {
      entries: [],
      nextSequence: 1,
    }
  }

  const entries = dedupeRuntimeQueuedEventsById(
    Array.isArray(value.entries)
      ? value.entries
          .map((entry, index) => sanitizeRuntimeQueuedEvent(entry, index, week, encounterState))
          .filter((entry): entry is RuntimeQueuedEvent => entry !== null)
      : []
  )

  const maxEntrySequence = entries.reduce(
    (max, entry) => Math.max(max, parseQueueEventSequence(entry.id)),
    0
  )

  return {
    entries,
    nextSequence: Math.max(
      1,
      entries.length + 1,
      maxEntrySequence + 1,
      sanitizeInteger(value.nextSequence, entries.length + 1, 1)
    ),
  }
}

function sanitizeDeveloperLogDetailValue(value: unknown): DeveloperLogDetailValue | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return sanitizeHydrationNumericValue(value)
  }

  if (typeof value === 'string') {
    const normalized = sanitizeString(value)
    return normalized.length > 0 ? normalized : null
  }

  if (Array.isArray(value)) {
    const list = sanitizeStringList(value)
    return list.length > 0 ? list : null
  }

  return null
}

function sanitizeDeveloperLogDetails(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const next: Record<string, DeveloperLogDetailValue> = {}

  for (const [detailId, rawValue] of Object.entries(value)) {
    const normalizedId = sanitizeString(detailId)
    const normalizedValue = sanitizeDeveloperLogDetailValue(rawValue)

    if (normalizedId.length === 0 || normalizedValue === null || normalizedId in next) {
      continue
    }

    next[normalizedId] = normalizedValue
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeDeveloperLogEvent(value: unknown, index: number, week: number): DeveloperLogEvent | null {
  if (!isRecord(value)) {
    return null
  }

  const type = sanitizeString(value.type)
  const summary = sanitizeString(value.summary)

  if (!DEVELOPER_LOG_TYPES.includes(type as DeveloperLogEventType) || summary.length === 0) {
    return null
  }

  return {
    id: sanitizeString(value.id, `devlog-${index + 1}`) || `devlog-${index + 1}`,
    week: clampCampaignWeek(value.week, week, week),
    type: type as DeveloperLogEventType,
    summary,
    ...(sanitizeOptionalString(value.contextId)
      ? { contextId: sanitizeOptionalString(value.contextId) }
      : {}),
    ...(sanitizeDeveloperLogDetails(value.details)
      ? { details: sanitizeDeveloperLogDetails(value.details) }
      : {}),
  }
}

function dedupeDeveloperLogEventsById(entries: DeveloperLogEvent[]) {
  const seenIds = new Set<string>()
  const next: DeveloperLogEvent[] = []

  for (const [index, entry] of entries.entries()) {
    let id = entry.id

    if (seenIds.has(id)) {
      id = `${entry.id}-dup-${index + 1}`
    }

    seenIds.add(id)

    next.push(id === entry.id ? entry : { ...entry, id })
  }

  return next
}

function sanitizeDeveloperLogEventList(value: unknown, week: number) {
  if (!Array.isArray(value)) {
    return []
  }

  return dedupeDeveloperLogEventsById(
    value
      .map((entry, index) => sanitizeDeveloperLogEvent(entry, index, week))
      .filter((entry): entry is DeveloperLogEvent => entry !== null)
  ).slice(-DEVELOPER_LOG_HYDRATION_LIMIT)
}

function sanitizeUiState(value: unknown, week: number): GameUiDebugState {
  if (!isRecord(value)) {
    return {
      debug: {
        enabled: false,
        flags: {},
        eventLog: [],
        nextEventSequence: 1,
      },
    }
  }

  const debug = isRecord(value.debug) ? value.debug : {}
  const authoring = isRecord(value.authoring) ? value.authoring : {}
  const rawEventLog = Array.isArray(debug.eventLog) ? debug.eventLog : []
  const eventLog = sanitizeDeveloperLogEventList(rawEventLog, week)
  const maxLogSequence = eventLog.reduce(
    (max, entry) => Math.max(max, parseDeveloperLogSequence(entry.id)),
    0
  )
  const nextEventSequence = Math.max(
    1,
    eventLog.length + 1,
    maxLogSequence + 1,
    sanitizeInteger(debug.nextEventSequence, eventLog.length + 1, 1)
  )
  const debugFlags = sanitizeEncounterFlags(debug.flags)

  return {
    ...(sanitizeOptionalString(value.selectedLocationId)
      ? { selectedLocationId: sanitizeOptionalString(value.selectedLocationId) }
      : {}),
    ...(sanitizeOptionalString(value.selectedSceneId)
      ? { selectedSceneId: sanitizeOptionalString(value.selectedSceneId) }
      : {}),
    ...(sanitizeOptionalString(value.selectedCaseId)
      ? { selectedCaseId: sanitizeOptionalString(value.selectedCaseId) }
      : {}),
    ...(sanitizeOptionalString(value.selectedTeamId)
      ? { selectedTeamId: sanitizeOptionalString(value.selectedTeamId) }
      : {}),
    ...(sanitizeOptionalString(value.selectedAgentId)
      ? { selectedAgentId: sanitizeOptionalString(value.selectedAgentId) }
      : {}),
    ...(sanitizeOptionalString(value.inspectorPanel)
      ? { inspectorPanel: sanitizeOptionalString(value.inspectorPanel) }
      : {}),
    ...(sanitizeOptionalString(authoring.activeContextId) ||
    sanitizeOptionalString(authoring.lastChoiceId) ||
    sanitizeOptionalString(authoring.lastNextTargetId) ||
    sanitizeStringList(authoring.lastFollowUpIds).length > 0 ||
    typeof authoring.updatedWeek === 'number'
      ? {
          authoring: {
            ...(sanitizeOptionalString(authoring.activeContextId)
              ? { activeContextId: sanitizeOptionalString(authoring.activeContextId) }
              : {}),
            ...(sanitizeOptionalString(authoring.lastChoiceId)
              ? { lastChoiceId: sanitizeOptionalString(authoring.lastChoiceId) }
              : {}),
            ...(sanitizeOptionalString(authoring.lastNextTargetId)
              ? { lastNextTargetId: sanitizeOptionalString(authoring.lastNextTargetId) }
              : {}),
            ...(sanitizeStringList(authoring.lastFollowUpIds).length > 0
              ? { lastFollowUpIds: sanitizeStringList(authoring.lastFollowUpIds) }
              : {}),
            ...(typeof authoring.updatedWeek === 'number'
              ? { updatedWeek: clampCampaignWeek(authoring.updatedWeek, week, week) }
              : {}),
          },
        }
      : {}),
    debug: {
      enabled: Object.values(debugFlags).some(Boolean),
      flags: debugFlags,
      eventLog,
      nextEventSequence,
    },
  }
}

function sanitizeInventoryRecord(value: unknown) {
  if (!isRecord(value)) {
    return {}
  }

  const next: Record<string, number> = {}

  for (const [itemId, quantity] of Object.entries(value)) {
    const normalizedId = sanitizeString(itemId)

    if (normalizedId.length === 0 || normalizedId in next) {
      continue
    }

    next[normalizedId] = sanitizeInteger(quantity, 0, 0)
  }

  return next
}

function isInventoryCanonical(value: unknown) {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([itemId, quantity]) =>
        itemId === sanitizeString(itemId) &&
        itemId.length > 0 &&
        typeof quantity === 'number' &&
        Number.isFinite(quantity) &&
        Math.trunc(quantity) === quantity &&
        quantity >= 0
    )
  )
}

export function createDefaultRuntimeState(week = 1): RuntimeState {
  return {
    player: { ...DEFAULT_PLAYER_PROFILE },
    globalFlags: {},
    oneShotEvents: {},
    currentLocation: {
      hubId: 'operations-desk',
      locationId: 'operations-desk',
      sceneId: 'dashboard',
      updatedWeek: sanitizeInteger(week, 1, 1),
    },
    sceneHistory: [],
    encounterState: {},
    progressClocks: {},
    eventQueue: {
      entries: [],
      nextSequence: 1,
    },
    ui: {
      selectedLocationId: 'operations-desk',
      selectedSceneId: 'dashboard',
      inspectorPanel: 'operations',
      debug: {
        enabled: false,
        flags: {},
      },
    },
  }
}

/**
 * Save/load extension point.
 * This normalizes authored narrative/meta state without touching domain-specific systems.
 */
export interface ReconcileRuntimeUiContext {
  cases: Record<string, CaseInstance>
  teams: Record<string, Team>
  agents: Record<string, Agent>
}

export function reconcileRuntimeUiSelections(
  runtimeState: RuntimeState,
  context: ReconcileRuntimeUiContext
): RuntimeState {
  const caseIds = new Set(Object.keys(context.cases))
  const teamIds = new Set(Object.keys(context.teams))
  const agentIds = new Set(Object.keys(context.agents))
  const defaultLocation = getDefaultRuntimeLocation(runtimeState.currentLocation.updatedWeek)

  const selectedCaseId = sanitizeOptionalString(runtimeState.ui.selectedCaseId)
  const selectedTeamId = sanitizeOptionalString(runtimeState.ui.selectedTeamId)
  const selectedAgentId = sanitizeOptionalString(runtimeState.ui.selectedAgentId)
  const selectedLocationId = sanitizeOptionalString(runtimeState.ui.selectedLocationId)
  const selectedSceneId = sanitizeOptionalString(runtimeState.ui.selectedSceneId)

  const nextUi: GameUiDebugState = {
    ...runtimeState.ui,
  }

  delete nextUi.selectedCaseId
  delete nextUi.selectedTeamId
  delete nextUi.selectedAgentId
  delete nextUi.selectedLocationId
  delete nextUi.selectedSceneId

  if (selectedCaseId && caseIds.has(selectedCaseId)) {
    nextUi.selectedCaseId = selectedCaseId
  }

  if (selectedTeamId && teamIds.has(selectedTeamId)) {
    nextUi.selectedTeamId = selectedTeamId
  }

  if (selectedAgentId && agentIds.has(selectedAgentId)) {
    nextUi.selectedAgentId = selectedAgentId
  }

  if (
    selectedLocationId &&
    selectedSceneId &&
    isRuntimeSceneHistoryEntryValid(selectedLocationId, selectedSceneId)
  ) {
    nextUi.selectedLocationId = selectedLocationId
    nextUi.selectedSceneId = selectedSceneId
  } else if (
    selectedLocationId &&
    isRuntimeSceneValidForHub(
      runtimeState.currentLocation.hubId,
      selectedLocationId,
      runtimeState.currentLocation.sceneId
    )
  ) {
    nextUi.selectedLocationId = selectedLocationId
    if (runtimeState.currentLocation.sceneId) {
      nextUi.selectedSceneId = runtimeState.currentLocation.sceneId
    }
  } else {
    nextUi.selectedLocationId = defaultLocation.locationId
    nextUi.selectedSceneId = defaultLocation.sceneId
  }

  return {
    ...runtimeState,
    ui: nextUi,
  }
}

function hasRuntimeShape(value: unknown): value is RuntimeState {
  return (
    isRecord(value) &&
    isRecord(value.player) &&
    isRecord(value.globalFlags) &&
    isRecord(value.oneShotEvents) &&
    isRecord(value.currentLocation) &&
    Array.isArray(value.sceneHistory) &&
    isRecord(value.encounterState) &&
    isRecord(value.progressClocks) &&
    isRecord(value.eventQueue) &&
    isRecord(value.ui) &&
    isRecord((value.ui as Record<string, unknown>).debug)
  )
}

export function normalizeRuntimeState(value: unknown, week: number, fallback?: RuntimeState): RuntimeState {
  const base = fallback ?? createDefaultRuntimeState(week)

  if (!isRecord(value)) {
    return { ...base }
  }

  const sceneHistory = Array.isArray(value.sceneHistory)
    ? finalizeSceneHistoryEntries(
        value.sceneHistory
          .map((entry) => sanitizeSceneHistoryEntry(entry, week))
          .filter((entry): entry is SceneHistoryEntry => entry !== null)
      )
    : base.sceneHistory
  const encounterState = sanitizeEncounterRuntimeMap(value.encounterState, week)

  return {
    player: sanitizePlayerProfile(value.player, base.player),
    globalFlags: sanitizeFlagRecord(value.globalFlags),
    oneShotEvents: sanitizeOneShotEvents(value.oneShotEvents, week),
    currentLocation: sanitizeLocationState(value.currentLocation, week),
    sceneHistory,
    encounterState,
    progressClocks: sanitizeProgressClockMap(value.progressClocks, week),
    eventQueue: sanitizeRuntimeEventQueueState(value.eventQueue, week, encounterState),
    ui: sanitizeUiState(value.ui, week),
  }
}

/**
 * Canonical entry point for consumers that need a safe, read-only snapshot of
 * cross-cutting game state. Returned objects are cloned shallowly so callers do
 * not accidentally mutate live state outside the sanctioned write helpers.
 */
export function readGameStateManager(state: GameState): GameStateManagerView {
  const normalized = ensureManagedGameState(state)
  const runtimeState = normalized.runtimeState ?? createDefaultRuntimeState(normalized.week)

  return {
    player: { ...runtimeState.player },
    globalFlags: { ...runtimeState.globalFlags },
    oneShotEvents: Object.fromEntries(
      Object.entries(runtimeState.oneShotEvents).map(([eventId, eventState]) => [
        eventId,
        { ...eventState },
      ])
    ),
    currentLocation: { ...runtimeState.currentLocation },
    sceneHistory: runtimeState.sceneHistory.map((entry) => ({
      ...entry,
      ...(entry.tags ? { tags: [...entry.tags] } : {}),
    })),
    inventory: { ...normalized.inventory },
    encounterState: Object.fromEntries(
      Object.entries(runtimeState.encounterState).map(([encounterId, encounter]) => [
        encounterId,
        {
          ...encounter,
          hiddenModifierIds: [...(encounter.hiddenModifierIds ?? [])],
          revealedModifierIds: [...(encounter.revealedModifierIds ?? [])],
          flags: { ...(encounter.flags ?? {}) },
        },
      ])
    ),
    progressClocks: Object.fromEntries(
      Object.entries(runtimeState.progressClocks).map(([clockId, clock]) => [clockId, { ...clock }])
    ),
    eventQueue: {
      nextSequence: runtimeState.eventQueue.nextSequence,
      entries: (Array.isArray(runtimeState.eventQueue.entries)
        ? runtimeState.eventQueue.entries
        : []
      ).map((entry) => ({
        ...entry,
        ...(entry.payload
          ? {
              payload: Object.fromEntries(
                Object.entries(entry.payload).map(([payloadId, payloadValue]) => [
                  payloadId,
                  Array.isArray(payloadValue) ? [...payloadValue] : payloadValue,
                ])
              ),
            }
          : {}),
      })),
    },
    ui: {
      ...runtimeState.ui,
      ...(runtimeState.ui.authoring
        ? {
            authoring: {
              ...runtimeState.ui.authoring,
              ...(runtimeState.ui.authoring.lastFollowUpIds
                ? { lastFollowUpIds: [...runtimeState.ui.authoring.lastFollowUpIds] }
                : {}),
            },
          }
        : {}),
      debug: {
        ...runtimeState.ui.debug,
        flags: { ...runtimeState.ui.debug.flags },
        eventLog: (runtimeState.ui.debug.eventLog ?? []).map((entry) => ({
          ...entry,
          ...(entry.details
            ? {
                details: Object.fromEntries(
                  Object.entries(entry.details).map(([detailId, detailValue]) => [
                    detailId,
                    Array.isArray(detailValue) ? [...detailValue] : detailValue,
                  ])
                ),
              }
            : {}),
        })),
      },
    },
  }
}

export function getPlayerProfile(state: GameState) {
  return readGameStateManager(state).player
}

export function getCurrentLocation(state: GameState) {
  return readGameStateManager(state).currentLocation
}

export function getGlobalFlag(state: GameState, flagId: string) {
  const normalizedId = sanitizeString(flagId)
  return normalizedId.length > 0 ? readGameStateManager(state).globalFlags[normalizedId] : undefined
}

export function hasOneShotEventOccurred(state: GameState, eventId: string) {
  const normalizedId = sanitizeString(eventId)
  return normalizedId.length > 0 ? Boolean(readGameStateManager(state).oneShotEvents[normalizedId]) : false
}

export function getOneShotEventRecord(state: GameState, eventId: string) {
  const normalizedId = sanitizeString(eventId)
  return normalizedId.length > 0 ? readGameStateManager(state).oneShotEvents[normalizedId] ?? null : null
}

export function getProgressClock(state: GameState, clockId: string) {
  const normalizedId = sanitizeString(clockId)
  return normalizedId.length > 0 ? readGameStateManager(state).progressClocks[normalizedId] : undefined
}

export function ensureManagedGameState(state: GameState): GameState {
  const runtimeState = hasRuntimeShape(state.runtimeState)
    ? state.runtimeState
    : normalizeRuntimeState(state.runtimeState, state.week)
  const inventory = isInventoryCanonical(state.inventory)
    ? state.inventory
    : sanitizeInventoryRecord(state.inventory)

  if (runtimeState === state.runtimeState && inventory === state.inventory) {
    return state
  }

  return {
    ...state,
    runtimeState,
    inventory,
  }
}

function withRuntimeState(
  state: GameState,
  updater: (runtimeState: RuntimeState, nextInventory: Record<string, number>) => {
    runtimeState?: RuntimeState
    inventory?: Record<string, number>
  }
) {
  const normalized = ensureManagedGameState(state)
  const runtimeState = normalizeRuntimeState(normalized.runtimeState, normalized.week)
  const inventory = isInventoryCanonical(normalized.inventory)
    ? normalized.inventory
    : sanitizeInventoryRecord(normalized.inventory)
  const next = updater(runtimeState, inventory)

  return {
    ...normalized,
    runtimeState: next.runtimeState ?? runtimeState,
    inventory: next.inventory ?? inventory,
  }
}

export function setPlayerProfile(state: GameState, patch: Partial<PlayerProfileState>) {
  return withRuntimeState(state, (runtimeState) => ({
    runtimeState: {
      ...runtimeState,
      player: sanitizePlayerProfile({ ...runtimeState.player, ...patch }, runtimeState.player),
    },
  }))
}

export function setGlobalFlag(state: GameState, flagId: string, value: GameFlagValue) {
  const normalizedId = sanitizeString(flagId)

  if (normalizedId.length === 0 || !isFlagValue(value)) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => ({
    runtimeState: {
      ...runtimeState,
      globalFlags: {
        ...runtimeState.globalFlags,
        [normalizedId]: typeof value === 'number' ? Math.trunc(value) : value,
      },
    },
  }))
}

export function clearGlobalFlag(state: GameState, flagId: string) {
  const normalizedId = sanitizeString(flagId)

  if (normalizedId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const nextFlags = { ...runtimeState.globalFlags }
    delete nextFlags[normalizedId]

    return {
      runtimeState: {
        ...runtimeState,
        globalFlags: nextFlags,
      },
    }
  })
}

export function consumeOneShotEvent(
  state: GameState,
  eventId: string,
  source?: string
): OneShotConsumptionResult {
  const normalizedId = sanitizeString(eventId)

  if (normalizedId.length === 0) {
    return {
      state: ensureManagedGameState(state),
      consumed: false,
      event: null,
    }
  }

  const normalized = ensureManagedGameState(state)
  const existing = getOneShotEventRecord(normalized, normalizedId)

  if (existing) {
    return {
      state: normalized,
      consumed: false,
      event: existing,
    }
  }

  let consumedEvent: OneShotEventState | null = null
  const nextState = withRuntimeState(normalized, (runtimeState) => {
    const event: OneShotEventState = {
      eventId: normalizedId,
      seen: true,
      firstSeenWeek: normalized.week,
      ...(sanitizeOptionalString(source) ? { source: sanitizeOptionalString(source) } : {}),
    }
    consumedEvent = event

    return {
      runtimeState: {
        ...runtimeState,
        oneShotEvents: {
          ...runtimeState.oneShotEvents,
          [normalizedId]: event,
        },
      },
    }
  })

  return {
    state: nextState,
    consumed: true,
    event: consumedEvent,
  }
}

/**
 * Backwards-compatible alias.
 * Prefer `consumeOneShotEvent` or the higher-level helpers in `flagSystem.ts`
 * when authored content needs to know whether the one-shot actually fired.
 */
export function markOneShotEvent(state: GameState, eventId: string, source?: string) {
  return consumeOneShotEvent(state, eventId, source).state
}

export function setCurrentLocation(
  state: GameState,
  nextLocation: Pick<GameLocationState, 'hubId'> & Partial<Omit<GameLocationState, 'hubId'>>
) {
  const hubId = sanitizeString(nextLocation.hubId)

  if (hubId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => ({
    runtimeState: {
      ...runtimeState,
      currentLocation: sanitizeLocationState(
        {
          ...runtimeState.currentLocation,
          ...nextLocation,
          hubId,
          updatedWeek: nextLocation.updatedWeek ?? state.week,
        },
        state.week
      ),
      ui: {
        ...runtimeState.ui,
        ...(sanitizeOptionalString(nextLocation.locationId)
          ? { selectedLocationId: sanitizeOptionalString(nextLocation.locationId) }
          : {}),
        ...(sanitizeOptionalString(nextLocation.sceneId)
          ? { selectedSceneId: sanitizeOptionalString(nextLocation.sceneId) }
          : {}),
      },
    },
  }))
}

export function recordSceneVisit(state: GameState, input: SceneVisitInput) {
  const sceneId = sanitizeString(input.sceneId)
  const locationId = sanitizeString(input.locationId)

  if (sceneId.length === 0 || locationId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const nextEntry = sanitizeSceneHistoryEntry({
      sceneId,
      locationId,
      week: input.week ?? state.week,
      outcome: input.outcome,
      tags: input.tags,
    })

    if (!nextEntry) {
      return { runtimeState }
    }

    const nextHistory = [...runtimeState.sceneHistory, nextEntry].slice(-SCENE_HISTORY_LIMIT)
    return {
      runtimeState: {
        ...runtimeState,
        sceneHistory: nextHistory,
        currentLocation: sanitizeLocationState(
          {
            ...runtimeState.currentLocation,
            locationId,
            sceneId,
            updatedWeek: nextEntry.week,
          },
          nextEntry.week ?? state.week
        ),
        ui: {
          ...runtimeState.ui,
          selectedLocationId: locationId,
          selectedSceneId: sceneId,
        },
      },
    }
  })
}

export function setEncounterRuntimeState(
  state: GameState,
  encounterId: string,
  patch: EncounterRuntimePatch
) {
  const normalizedId = sanitizeString(encounterId)

  if (normalizedId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const existing = runtimeState.encounterState[normalizedId]
    const nextEncounter = sanitizeEncounterRuntimeState(
      normalizedId,
      {
        ...(existing ?? {}),
        ...patch,
      },
      patch.lastUpdatedWeek ?? state.week
    )

    return {
      runtimeState: {
        ...runtimeState,
        encounterState: {
          ...runtimeState.encounterState,
          [normalizedId]: nextEncounter,
        },
      },
    }
  })
}

export function clearEncounterRuntimeState(state: GameState, encounterId: string) {
  const normalizedId = sanitizeString(encounterId)

  if (normalizedId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const nextEncounterState = { ...runtimeState.encounterState }
    delete nextEncounterState[normalizedId]

    return {
      runtimeState: {
        ...runtimeState,
        encounterState: nextEncounterState,
      },
    }
  })
}

export function setProgressClock(state: GameState, clockId: string, patch: ProgressClockPatch) {
  const normalizedId = sanitizeString(clockId)

  if (normalizedId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const existing = runtimeState.progressClocks[normalizedId]
    const nextClock = sanitizeProgressClockState(
      normalizedId,
      {
        ...(existing ?? { label: normalizedId, value: 0, max: patch.max ?? 4 }),
        ...patch,
      },
      state.week
    )

    return {
      runtimeState: {
        ...runtimeState,
        progressClocks: {
          ...runtimeState.progressClocks,
          [normalizedId]: nextClock,
        },
      },
    }
  })
}

export function advanceProgressClock(
  state: GameState,
  clockId: string,
  delta: number,
  defaults?: Pick<ProgressClockState, 'label' | 'max' | 'hidden'>
) {
  const normalizedId = sanitizeString(clockId)

  if (normalizedId.length === 0 || typeof delta !== 'number' || !Number.isFinite(delta)) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const existing = runtimeState.progressClocks[normalizedId]
    const baseMax = Math.max(1, sanitizeInteger(defaults?.max, existing?.max ?? 4, 1))
    const nextValue = Math.max(
      0,
      Math.min(baseMax, sanitizeInteger((existing?.value ?? 0) + delta, existing?.value ?? 0, 0))
    )

    return {
      runtimeState: {
        ...runtimeState,
        progressClocks: {
          ...runtimeState.progressClocks,
          [normalizedId]: sanitizeProgressClockState(
            normalizedId,
            {
              label: defaults?.label ?? existing?.label ?? normalizedId,
              max: baseMax,
              value: nextValue,
              hidden: defaults?.hidden ?? existing?.hidden,
              completedAtWeek:
                nextValue >= baseMax ? existing?.completedAtWeek ?? state.week : undefined,
            },
            state.week
          ),
        },
      },
    }
  })
}

export function setUiDebugState(state: GameState, patch: Partial<GameUiDebugState>) {
  return withRuntimeState(state, (runtimeState) => ({
    runtimeState: {
      ...runtimeState,
      ui: sanitizeUiState(
        {
        ...runtimeState.ui,
        ...patch,
        ...(isRecord(patch.authoring)
          ? {
              authoring: {
                ...(isRecord(runtimeState.ui.authoring) ? runtimeState.ui.authoring : {}),
                ...patch.authoring,
                ...(Array.isArray(patch.authoring.lastFollowUpIds)
                  ? { lastFollowUpIds: patch.authoring.lastFollowUpIds }
                  : {}),
              },
            }
          : {}),
        debug: {
          ...runtimeState.ui.debug,
          ...(isRecord(patch.debug) ? patch.debug : {}),
          flags: {
            ...runtimeState.ui.debug.flags,
            ...(isRecord(patch.debug?.flags) ? patch.debug.flags : {}),
          },
        },
      },
        state.week
      ),
    },
  }))
}

export function setDebugFlag(state: GameState, flagId: string, enabled: boolean) {
  const normalizedId = sanitizeString(flagId)

  if (normalizedId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (runtimeState) => {
    const nextFlags = {
      ...runtimeState.ui.debug.flags,
      [normalizedId]: enabled,
    }

    return {
      runtimeState: {
        ...runtimeState,
        ui: {
          ...runtimeState.ui,
          debug: {
            ...runtimeState.ui.debug,
            enabled: Object.values(nextFlags).some(Boolean),
            flags: nextFlags,
          },
        },
      },
    }
  })
}

export function setInventoryQuantity(state: GameState, itemId: string, quantity: number) {
  const normalizedId = sanitizeString(itemId)

  if (normalizedId.length === 0) {
    return ensureManagedGameState(state)
  }

  return withRuntimeState(state, (_runtimeState, inventory) => ({
    inventory: {
      ...inventory,
      [normalizedId]: sanitizeInteger(quantity, 0, 0),
    },
  }))
}

export function adjustInventoryQuantity(state: GameState, itemId: string, delta: number) {
  const normalizedId = sanitizeString(itemId)

  if (normalizedId.length === 0 || typeof delta !== 'number' || !Number.isFinite(delta)) {
    return ensureManagedGameState(state)
  }

  const current = ensureManagedGameState(state).inventory[normalizedId] ?? 0
  return setInventoryQuantity(state, normalizedId, current + delta)
}
