import type { OperationEvent, OperationEventType } from './events/types'

export type OperationNoticeStatus = 'unread' | 'read' | 'acknowledged'
export type OperationNoticeStates = Partial<Record<string, OperationNoticeStatus>>

const noticeTypes: ReadonlySet<OperationEventType> = new Set(['recruitment.candidate_departed'])

export function isOperationNotice(event: OperationEvent): boolean {
  return noticeTypes.has(event.type)
}

export function getOperationNoticeStatus(
  states: OperationNoticeStates | undefined,
  eventId: string
): OperationNoticeStatus {
  return states && Object.hasOwn(states, eventId) ? (states[eventId] ?? 'read') : 'read'
}

export function sanitizeOperationNoticeStates(
  value: unknown,
  events: readonly OperationEvent[]
): OperationNoticeStates | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined

  const entries = events.flatMap((event) => {
    if (!isOperationNotice(event) || !Object.hasOwn(value, event.id)) return []
    const status = (value as Record<string, unknown>)[event.id]
    return status === 'unread' || status === 'read' || status === 'acknowledged'
      ? ([[event.id, status]] as const)
      : []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

export function recordNewOperationNotices(
  previousEvents: readonly OperationEvent[],
  events: readonly OperationEvent[],
  states: OperationNoticeStates | undefined
): OperationNoticeStates | undefined {
  const noticeEvents = events.filter(isOperationNotice)
  if (noticeEvents.length === 0) return undefined

  const previousIds = new Set(previousEvents.filter(isOperationNotice).map((event) => event.id))
  const entries = noticeEvents.flatMap((event) => {
    if (!previousIds.has(event.id)) return [[event.id, 'unread']] as const
    return states && Object.hasOwn(states, event.id)
      ? ([[event.id, getOperationNoticeStatus(states, event.id)]] as const)
      : []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}
