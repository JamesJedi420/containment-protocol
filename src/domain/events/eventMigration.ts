import type { OperationEvent, OperationEventType } from './types'
import { validateOperationEventPayload } from './eventValidation'

export const SCHEMA_VERSION = 2 as const

const SHOULD_LOG_EVENT_MIGRATION_DIAGNOSTICS = (() => {
  const viteMode = (import.meta as { env?: { MODE?: string } }).env?.MODE
  if (viteMode === 'test') {
    return false
  }

  const processEnv = (
    globalThis as {
      process?: {
        env?: Record<string, string | undefined>
      }
    }
  ).process?.env

  if (!processEnv) {
    return true
  }

  const nodeEnv = processEnv.NODE_ENV?.toLowerCase()
  if (nodeEnv === 'test') {
    return false
  }

  if (typeof processEnv.VITEST === 'string' && processEnv.VITEST.length > 0) {
    return false
  }

  return true
})()

type EventWithSchemaVersion = { schemaVersion?: number } & Record<string, unknown>

export function migrateEventV1toV2<TEvent extends EventWithSchemaVersion>(
  event: TEvent
): OperationEvent {
  const eventRecord = event as EventWithSchemaVersion & {
    type?: unknown
    payload?: unknown
    id?: unknown
  }

  if (SHOULD_LOG_EVENT_MIGRATION_DIAGNOSTICS && event.schemaVersion !== 2) {
    console.warn(
      `[event-migration] Migrating event ID=${eventRecord.id ?? 'unknown'} from schemaVersion=${event.schemaVersion} to 2`
    )
  }

  const type =
    typeof eventRecord.type === 'string' ? (eventRecord.type as OperationEventType) : undefined

  if (type) {
    const validation = validateOperationEventPayload(type, eventRecord.payload)
    if (SHOULD_LOG_EVENT_MIGRATION_DIAGNOSTICS && !validation.success) {
      console.error(
        `[event-validation] Invalid payload for event type ${type}: ${validation.error}`
      )
    }
  }
  if (event.schemaVersion === 2) {
    return event as unknown as OperationEvent
  }
  // V1 events are compatible with V2 schema
  return {
    ...event,
    schemaVersion: 2,
  } as unknown as OperationEvent
}

export function getEventMigrator() {
  return {
    '1': {
      migrate: (event: EventWithSchemaVersion) => ({
        ...event,
        schemaVersion: 2,
      }),
      target: 2,
    },
  }
}
