import {
  createTutorialState,
  isTutorialIdentifier,
  isTutorialLifecycleState,
  type TutorialDefinition,
  type TutorialLifecycleState,
  type TutorialStepStatus,
} from './tutorialLifecycle'

export interface PersistedTutorialRecord {
  readonly stepIds: readonly string[]
  readonly lifecycle: TutorialLifecycleState
}

export interface TutorialRuntimeState {
  readonly schemaVersion: 1
  readonly records: Readonly<Record<string, PersistedTutorialRecord>>
}

export const TUTORIAL_RECORD_LIMIT = 128
export const TUTORIAL_STEP_LIMIT = 128

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasCoherentProgress(state: TutorialLifecycleState) {
  if (state.run > state.revision) return false
  const effectiveStatus = state.status === 'suppressed' ? state.resumeStatus : state.status
  if (effectiveStatus === 'not_started')
    return (
      state.run === 0 &&
      state.cursor === 0 &&
      state.reachedCursor === 0 &&
      state.stepStatuses.every((status) => status === 'not_started')
    )
  if (state.run === 0) return false
  const activeShape =
    state.stepStatuses[state.cursor] === 'active' &&
    state.stepStatuses
      .slice(0, state.cursor)
      .every((status) => status === 'completed' || status === 'skipped') &&
    state.stepStatuses.slice(state.cursor + 1).every((status) => status === 'not_started')
  if (effectiveStatus === 'active' || effectiveStatus === 'interrupted') return activeShape
  if (effectiveStatus === 'completed' || effectiveStatus === 'skipped')
    return !state.stepStatuses.includes('active')
  return !state.stepStatuses.includes('active') || activeShape
}

export function createPersistedTutorialRecord(
  definition: TutorialDefinition,
  lifecycle: TutorialLifecycleState
): PersistedTutorialRecord {
  return Object.freeze({
    stepIds: Object.freeze(definition.steps.map((step) => step.id)),
    lifecycle: Object.freeze({
      ...lifecycle,
      stepStatuses: Object.freeze([...lifecycle.stepStatuses]),
    }),
  })
}

/** Unknown definitions are retained as inactive data until explicitly resolved against a registry. */
export function normalizeTutorialRuntime(value: unknown): TutorialRuntimeState | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.records)) return undefined
  const records: Record<string, PersistedTutorialRecord> = Object.create(null)
  let accepted = 0
  for (const id of Object.keys(value.records).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (accepted >= TUTORIAL_RECORD_LIMIT) break
    const raw = value.records[id]
    if (
      !isTutorialIdentifier(id) ||
      !isRecord(raw) ||
      !Array.isArray(raw.stepIds) ||
      raw.stepIds.length === 0 ||
      raw.stepIds.length > TUTORIAL_STEP_LIMIT ||
      !Array.from(raw.stepIds).every(isTutorialIdentifier) ||
      new Set(raw.stepIds).size !== raw.stepIds.length ||
      !isRecord(raw.lifecycle) ||
      typeof raw.lifecycle.definitionVersion !== 'number' ||
      !Number.isSafeInteger(raw.lifecycle.definitionVersion) ||
      raw.lifecycle.definitionVersion < 1
    )
      continue
    const definition = {
      id,
      version: raw.lifecycle.definitionVersion,
      steps: raw.stepIds.map((stepId: string) => ({ id: stepId })),
    }
    if (!isTutorialLifecycleState(raw.lifecycle, definition) || !hasCoherentProgress(raw.lifecycle))
      continue
    records[id] = Object.freeze({
      stepIds: Object.freeze([...raw.stepIds]),
      lifecycle: Object.freeze({
        tutorialId: id,
        definitionVersion: raw.lifecycle.definitionVersion,
        revision: raw.lifecycle.revision,
        run: raw.lifecycle.run,
        status: raw.lifecycle.status,
        cursor: raw.lifecycle.cursor,
        reachedCursor: raw.lifecycle.reachedCursor,
        stepStatuses: Object.freeze([...raw.lifecycle.stepStatuses]),
        ...(raw.lifecycle.resumeStatus !== undefined
          ? { resumeStatus: raw.lifecycle.resumeStatus }
          : {}),
      }),
    })
    accepted += 1
  }
  return Object.freeze({ schemaVersion: 1, records: Object.freeze(records) })
}

/** Migration is derived at read and committed with the next successful managed command. */
export function resolveTutorialLifecycle(
  runtime: TutorialRuntimeState | undefined,
  definition: TutorialDefinition
): TutorialLifecycleState | undefined {
  if (definition.steps.length > TUTORIAL_STEP_LIMIT) return undefined
  const record =
    runtime && Object.hasOwn(runtime.records, definition.id)
      ? runtime.records[definition.id]
      : undefined
  if (!record) return createTutorialState(definition)
  const old = record.lifecycle
  const sameLayout =
    record.stepIds.length === definition.steps.length &&
    record.stepIds.every((id, index) => id === definition.steps[index].id)
  if (old.definitionVersion > definition.version) return undefined
  if (old.definitionVersion === definition.version) return sameLayout ? old : undefined
  const revision = old.revision === Number.MAX_SAFE_INTEGER ? old.revision : old.revision + 1
  if (sameLayout)
    return Object.freeze({
      ...old,
      definitionVersion: definition.version,
      revision,
    })

  const statuses = new Map(record.stepIds.map((id, index) => [id, old.stepStatuses[index]]))
  const stepStatuses: TutorialStepStatus[] = definition.steps.map(({ id }) => {
    const status = statuses.get(id)
    return status === 'completed' || status === 'skipped' ? status : 'not_started'
  })
  const cancelActive = (status: Exclude<TutorialLifecycleState['status'], 'suppressed'>) =>
    status === 'active' || status === 'interrupted' ? 'canceled' : status
  const migrated: TutorialLifecycleState = {
    tutorialId: definition.id,
    definitionVersion: definition.version,
    revision,
    run: old.run,
    cursor: 0,
    reachedCursor: 0,
    status: old.status === 'suppressed' ? 'suppressed' : cancelActive(old.status),
    stepStatuses: Object.freeze(stepStatuses),
    ...(old.resumeStatus !== undefined ? { resumeStatus: cancelActive(old.resumeStatus) } : {}),
  }
  return Object.freeze(migrated)
}
