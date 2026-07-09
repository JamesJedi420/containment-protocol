import type { OperationEvent, OperationEventType } from './types'
import { operationEventPayloadSchemas, validateOperationEventPayload } from './eventValidation'

/**
 * Operation event schema versions (hydration 542).
 *
 * - **v1 → v2:** structural-compatible bump — payloads are not reshaped; migration assigns
 *   `schemaVersion: 2` and validates against `operationEventPayloadSchemas`. Invalid payloads are
 *   logged in non-test environments and dropped so canonical runtime history remains valid.
 * - **v2:** current canonical version used by `sanitizeOperationEvents` / `migrateOperationEventToCurrentSchema`.
 *
 * Per-type payload migrations belong in `eventValidation` or `sanitizeOperationEvents` when a
 * future schema requires field renames; until then, `migrateEventV1toV2` is the single entry point.
 */
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
): OperationEvent | null {
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

  if (!type || !(type in operationEventPayloadSchemas)) {
    if (SHOULD_LOG_EVENT_MIGRATION_DIAGNOSTICS) {
      console.error(
        `[event-validation] Invalid or missing event type for event ID=${eventRecord.id ?? 'unknown'}`
      )
    }

    return null
  }

  const validation = validateOperationEventPayload(type, eventRecord.payload)
  if (!validation.success) {
    if (SHOULD_LOG_EVENT_MIGRATION_DIAGNOSTICS) {
      console.error(`[event-validation] Invalid payload for event type ${type}: ${validation.error}`)
    }

    return null
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
      migrate: (event: EventWithSchemaVersion) => migrateEventV1toV2(event),
      target: 2,
    },
  }
}
