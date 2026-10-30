import { appendDeveloperLogEvent } from './developerLog'
import { applyTutorialCommand, getTutorialLifecycle } from './gameStateManager'
import type { GameState } from './models'
import type {
  TutorialCommand,
  TutorialDefinition,
  TutorialEligibility,
  TutorialLifecycleState,
  TutorialRegistry,
  TutorialStatus,
  TutorialTransitionResult,
} from './tutorialLifecycle'
import { normalizeTutorialRuntime } from './tutorialPersistence'

export type TutorialDeliveryCommand =
  | TutorialCommand
  | {
      readonly type: 'report_recovery'
      readonly expectedRevision: number
    }
export type TutorialTelemetryKind =
  | 'started'
  | 'step_entered'
  | 'step_completed'
  | 'completed'
  | 'skipped'
  | 'dismissed'
  | 'suppressed'
  | 'unsuppressed'
  | 'replayed'
  | 'interrupted'
  | 'resumed'
  | 'canceled'
  | 'failed'
  | 'recovery_needed'
  | 'migrated'

export interface TutorialTelemetryRecord {
  readonly id: string
  readonly tutorialId: string
  readonly definitionVersion: number
  readonly run: number
  readonly revision: number
  readonly command: TutorialDeliveryCommand['type']
  readonly kind: TutorialTelemetryKind
  readonly stepId?: string
  readonly reason?: TutorialTransitionResult['reason']
  readonly fromVersion?: number
}

export interface TutorialDispatchResult {
  readonly changed: boolean
  readonly lifecycleChanged: boolean
  readonly reason: TutorialTransitionResult['reason'] | 'unavailable_definition' | 'recovery_needed'
  readonly events: readonly TutorialTelemetryRecord[]
  readonly completion?: {
    readonly tutorialId: string
    readonly definitionVersion: number
    readonly run: number
    readonly revision: number
  }
}

const terminalStatuses: readonly TutorialStatus[] = [
  'completed',
  'skipped',
  'dismissed',
  'canceled',
]

export interface TutorialArchiveEntry {
  readonly tutorialId: string
  readonly definitionVersion: number
  readonly kind: TutorialDefinition['kind']
  readonly status: TutorialStatus | 'unavailable'
  readonly run: number
  readonly revision?: number
  readonly completedSteps: number
  readonly skippedSteps: number
  readonly canReplay: boolean
}

/** Latest registered version per identity, in registry order; no save-only identities. */
export function currentTutorialDefinitions(
  registry: TutorialRegistry
): readonly TutorialDefinition[] {
  const current = new Map<string, TutorialDefinition>()
  for (const definition of registry.definitions) current.set(definition.id, definition)
  return Object.freeze([...current.values()])
}

export function getTutorialArchive(
  game: GameState,
  registry: TutorialRegistry,
  isVisible: (game: GameState, definition: TutorialDefinition) => boolean
): readonly TutorialArchiveEntry[] {
  return Object.freeze(
    currentTutorialDefinitions(registry)
      .filter((definition) => isVisible(game, definition))
      .map((definition) => {
        const lifecycle = getTutorialLifecycle(game, definition)
        return Object.freeze({
          tutorialId: definition.id,
          definitionVersion: definition.version,
          kind: definition.kind,
          status: lifecycle?.status ?? 'unavailable',
          run: lifecycle?.run ?? 0,
          revision: lifecycle?.revision,
          completedSteps:
            lifecycle?.stepStatuses.filter((status) => status === 'completed').length ?? 0,
          skippedSteps:
            lifecycle?.stepStatuses.filter((status) => status === 'skipped').length ?? 0,
          canReplay:
            lifecycle !== undefined &&
            definition.replayable &&
            terminalStatuses.includes(lifecycle.status) &&
            lifecycle.revision < Number.MAX_SAFE_INTEGER &&
            lifecycle.run < Number.MAX_SAFE_INTEGER,
        })
      })
  )
}

function telemetry(
  definition: TutorialDefinition,
  lifecycle: TutorialLifecycleState,
  command: TutorialDeliveryCommand,
  kind: TutorialTelemetryKind,
  extra: Pick<TutorialTelemetryRecord, 'stepId' | 'reason' | 'fromVersion'> = {}
): TutorialTelemetryRecord {
  const step = extra.stepId === undefined ? 'flow' : `step/${encodeURIComponent(extra.stepId)}`
  const reason = extra.reason === undefined ? '' : `:reason/${extra.reason}`
  return Object.freeze({
    id: `tutorial:${encodeURIComponent(definition.id)}:${definition.version}:${lifecycle.run}:${lifecycle.revision}:${command.type}:${kind}:${step}${reason}`,
    tutorialId: definition.id,
    definitionVersion: definition.version,
    run: lifecycle.run,
    revision: lifecycle.revision,
    command: command.type,
    kind,
    ...extra,
  })
}

function transitionEvents(
  definition: TutorialDefinition,
  before: TutorialLifecycleState,
  after: TutorialLifecycleState,
  command: TutorialCommand,
  fromVersion?: number
) {
  const events: TutorialTelemetryRecord[] = []
  const emit = (kind: TutorialTelemetryKind, stepId?: string) =>
    events.push(telemetry(definition, after, command, kind, stepId === undefined ? {} : { stepId }))
  if (fromVersion !== undefined && fromVersion < definition.version)
    events.push(telemetry(definition, after, command, 'migrated', { fromVersion }))
  const commands: Partial<Record<TutorialCommand['type'], TutorialTelemetryKind>> = {
    start: 'started',
    replay_start: 'replayed',
    dismiss: 'dismissed',
    suppress: 'suppressed',
    unsuppress: 'unsuppressed',
    interrupt: 'interrupted',
    resume: 'resumed',
    cancel: 'canceled',
  }
  const kind = commands[command.type]
  if (kind) emit(kind)
  if (command.type === 'advance' || command.type === 'complete')
    emit('step_completed', definition.steps[before.cursor].id)
  if (command.type === 'skip') emit('skipped', definition.steps[before.cursor].id)
  if (
    after.status === 'active' &&
    ['start', 'replay_start', 'advance', 'skip', 'back', 'resume'].includes(command.type)
  )
    emit('step_entered', definition.steps[after.cursor].id)
  if (isCompletion(command, before, after)) emit('completed')
  if (command.type === 'skip' && after.status === 'skipped') emit('skipped')
  return events
}

function isCompletion(
  command: TutorialCommand,
  before: TutorialLifecycleState,
  after: TutorialLifecycleState
) {
  return (
    ['advance', 'complete', 'skip'].includes(command.type) &&
    before.status === 'active' &&
    after.status === 'completed'
  )
}

function recordEvents(game: GameState, records: readonly TutorialTelemetryRecord[]) {
  let state = game
  const events: TutorialTelemetryRecord[] = []
  for (const record of records) {
    if (
      state.runtimeState?.ui.debug.eventLog?.some(
        (entry) =>
          entry.type === 'tutorial.lifecycle' && entry.details?.tutorialEventId === record.id
      )
    )
      continue
    state = appendDeveloperLogEvent(state, {
      type: 'tutorial.lifecycle',
      summary: `Tutorial ${record.kind}: ${record.tutorialId}`,
      details: {
        tutorialEventId: record.id,
        tutorialId: record.tutorialId,
        definitionVersion: record.definitionVersion,
        run: record.run,
        revision: record.revision,
        command: record.command,
        kind: record.kind,
        ...(record.stepId === undefined ? {} : { stepId: record.stepId }),
        ...(record.reason === undefined ? {} : { reason: record.reason }),
        ...(record.fromVersion === undefined ? {} : { fromVersion: record.fromVersion }),
      },
    })
    events.push(record)
  }
  return { state, events: Object.freeze(events) }
}

export function unavailableTutorialResult(): TutorialDispatchResult {
  return Object.freeze({
    changed: false,
    lifecycleChanged: false,
    reason: 'unavailable_definition',
    events: Object.freeze([]),
  })
}

/** Guidance/debug writes only. Stale tokens emit nothing, even after debug retention expires. */
export function applyTutorialDelivery(
  game: GameState,
  definition: TutorialDefinition,
  command: TutorialDeliveryCommand,
  eligibility: TutorialEligibility = {}
): { state: GameState; result: TutorialDispatchResult } {
  const before = getTutorialLifecycle(game, definition)
  if (!before) return { state: game, result: unavailableTutorialResult() }
  if (command.expectedRevision !== before.revision)
    return {
      state: game,
      result: Object.freeze({
        changed: false,
        lifecycleChanged: false,
        reason: 'stale',
        events: Object.freeze([]),
      }),
    }
  if (command.type === 'report_recovery') {
    if (before.status !== 'active')
      return {
        state: game,
        result: Object.freeze({
          changed: false,
          lifecycleChanged: false,
          reason: 'illegal',
          events: Object.freeze([]),
        }),
      }
    const recorded = recordEvents(game, [
      telemetry(definition, before, command, 'recovery_needed', {
        stepId: definition.steps[before.cursor].id,
      }),
    ])
    return {
      state: recorded.state,
      result: Object.freeze({
        changed: recorded.state !== game,
        lifecycleChanged: false,
        reason: 'recovery_needed',
        events: recorded.events,
      }),
    }
  }
  const applied = applyTutorialCommand(game, definition, command, eligibility)
  if (!applied.result) return { state: game, result: unavailableTutorialResult() }
  const { result } = applied
  const fromVersion = normalizeTutorialRuntime(game.runtimeState?.tutorials)?.records[definition.id]
    ?.lifecycle.definitionVersion
  const candidates = result.changed
    ? transitionEvents(definition, before, result.state, command, fromVersion)
    : [
        telemetry(definition, before, command, 'failed', {
          stepId: definition.steps[before.cursor].id,
          reason: result.reason,
        }),
      ]
  const recorded = recordEvents(applied.state, candidates)
  return {
    state: recorded.state,
    result: Object.freeze({
      changed: recorded.state !== game,
      lifecycleChanged: result.changed,
      reason: result.reason,
      events: recorded.events,
      ...(result.changed && isCompletion(command, before, result.state)
        ? {
            completion: Object.freeze({
              tutorialId: definition.id,
              definitionVersion: definition.version,
              run: result.state.run,
              revision: result.state.revision,
            }),
          }
        : {}),
    }),
  }
}
