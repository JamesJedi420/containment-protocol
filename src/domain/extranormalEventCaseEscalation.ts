/**
 * SPE-3367 — exact-once brief extranormal event → CaseInstance escalation handoff (T3).
 *
 * Pure deterministic command/resolver. Creates or reuses a canonical CaseInstance through
 * existing starter-case factory authority, then writes `escalatedCaseRef` +
 * `closureState: escalated_to_case` only after the target validates. The source event
 * remains a distinct historical record. SPE-1310 owns lifecycle progression after handoff.
 */

import {
  validateExtranormalEventRecord,
  type ExtranormalEventId,
  type ExtranormalEventRecord,
  type ExtranormalEventRecordsMap,
} from './extranormalEventRegistry'
import type { CaseInstance, CaseTemplate } from './models'
import { createStarterCase } from './templates/startingCases'

export const EXTRANORMAL_EVENT_CASE_ESCALATION_OWNER = 'SPE-3367' as const

export const EXTRANORMAL_EVENT_SOURCE_TAG_PREFIX = 'source:extranormal-event:' as const

export type ExtranormalEventCaseEscalationFailureCode =
  | 'malformed_input'
  | 'event_not_found'
  | 'event_invalid'
  | 'template_not_found'
  | 'escalated_case_ref_unresolved'
  | 'converge_case_ref_unresolved'
  | 'conflicting_case_targets'
  | 'case_id_collision'
  | 'event_id_as_case_id'

export type ExtranormalEventCaseEscalationDisposition = 'created' | 'reused' | 'converged'

export interface EscalateExtranormalEventToCaseInput {
  readonly eventId: ExtranormalEventId
  readonly events: ExtranormalEventRecordsMap
  readonly cases: Readonly<Record<string, CaseInstance>>
  /** Case template id for the create path (existing catalog / intake factory). */
  readonly templateId: string
  readonly templates?: Readonly<Record<string, CaseTemplate>>
  /**
   * Explicit many-events → one-case convergence target.
   * Must resolve to an existing CaseInstance when provided.
   */
  readonly convergeCaseRef?: string
}

export interface ExtranormalEventCaseEscalationSuccess {
  readonly ok: true
  readonly disposition: ExtranormalEventCaseEscalationDisposition
  readonly eventId: ExtranormalEventId
  readonly caseId: string
  readonly events: ExtranormalEventRecordsMap
  readonly cases: Record<string, CaseInstance>
  readonly createdCase: boolean
}

export interface ExtranormalEventCaseEscalationFailure {
  readonly ok: false
  readonly code: ExtranormalEventCaseEscalationFailureCode
  readonly reasons: readonly string[]
  readonly events: ExtranormalEventRecordsMap
  readonly cases: Readonly<Record<string, CaseInstance>>
}

export type ExtranormalEventCaseEscalationResult =
  | ExtranormalEventCaseEscalationSuccess
  | ExtranormalEventCaseEscalationFailure

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function normalizeKey(value: unknown): string {
  return normalizeToken(value).toLowerCase()
}

function fail(
  code: ExtranormalEventCaseEscalationFailureCode,
  reasons: readonly string[],
  events: ExtranormalEventRecordsMap,
  cases: Readonly<Record<string, CaseInstance>>
): ExtranormalEventCaseEscalationFailure {
  return { ok: false, code, reasons, events, cases }
}

/** Stable case id derived from an event id — never equal to the event id. */
export function deriveEscalatedCaseId(eventId: ExtranormalEventId): string {
  const trimmed = normalizeToken(eventId)
  const body = trimmed.toLowerCase().startsWith('event:')
    ? trimmed.slice('event:'.length)
    : trimmed
  const caseId = `case:escalated:${body}`
  if (normalizeKey(caseId) === normalizeKey(trimmed)) {
    return `case:escalated:from:${body || 'unknown'}`
  }
  return caseId
}

export function extranormalEventSourceTag(eventId: ExtranormalEventId): string {
  return `${EXTRANORMAL_EVENT_SOURCE_TAG_PREFIX}${normalizeToken(eventId)}`
}

function caseHasSourceTag(currentCase: CaseInstance, eventId: ExtranormalEventId): boolean {
  const expected = normalizeKey(extranormalEventSourceTag(eventId))
  return (currentCase.tags ?? []).some((tag) => normalizeKey(tag) === expected)
}

function findCaseByRef(
  cases: Readonly<Record<string, CaseInstance>>,
  ref: string
): CaseInstance | undefined {
  const normalized = normalizeKey(ref)
  if (!normalized) {
    return undefined
  }

  const direct = cases[ref] ?? cases[normalizeToken(ref)]
  if (direct) {
    return direct
  }

  for (const currentCase of Object.values(cases)) {
    if (normalizeKey(currentCase.id) === normalized) {
      return currentCase
    }
  }

  return undefined
}

function collectClusterConvergenceCaseIds(
  event: ExtranormalEventRecord,
  events: ExtranormalEventRecordsMap,
  cases: Readonly<Record<string, CaseInstance>>
): string[] {
  const cluster = event.similarEventCluster ?? []
  const resolved = new Set<string>()

  for (const ref of [...cluster].sort((left, right) =>
    left.eventId.localeCompare(right.eventId)
  )) {
    const peer = events[ref.eventId]
    if (!peer) {
      continue
    }

    const peerRef = normalizeToken(peer.escalatedCaseRef ?? '')
    if (!peerRef) {
      continue
    }

    const peerCase = findCaseByRef(cases, peerRef)
    if (peerCase) {
      resolved.add(peerCase.id)
    }
  }

  return [...resolved].sort((left, right) => left.localeCompare(right))
}

function linkEventToCase(
  event: ExtranormalEventRecord,
  caseId: string
): ExtranormalEventRecord {
  return {
    ...event,
    closureState: 'escalated_to_case',
    escalatedCaseRef: caseId,
  }
}

function withSourceTag(currentCase: CaseInstance, eventId: ExtranormalEventId): CaseInstance {
  const tag = extranormalEventSourceTag(eventId)
  const tags = currentCase.tags ?? []
  if (tags.some((entry) => normalizeKey(entry) === normalizeKey(tag))) {
    return currentCase
  }

  return {
    ...currentCase,
    tags: [...tags, tag],
  }
}

function commitSuccess(input: {
  disposition: ExtranormalEventCaseEscalationDisposition
  event: ExtranormalEventRecord
  caseId: string
  events: ExtranormalEventRecordsMap
  cases: Readonly<Record<string, CaseInstance>>
  nextCase?: CaseInstance
  createdCase: boolean
}): ExtranormalEventCaseEscalationSuccess {
  const linked = linkEventToCase(input.event, input.caseId)
  const alreadyLinked =
    input.event.closureState === 'escalated_to_case' &&
    normalizeToken(input.event.escalatedCaseRef ?? '') === input.caseId

  const nextEvents =
    alreadyLinked && linked.escalatedCaseRef === input.event.escalatedCaseRef
      ? input.events
      : { ...input.events, [input.event.id]: linked }

  let nextCases: Record<string, CaseInstance>
  if (input.nextCase) {
    nextCases = { ...input.cases, [input.nextCase.id]: input.nextCase }
  } else if (alreadyLinked) {
    nextCases = input.cases as Record<string, CaseInstance>
  } else {
    nextCases = { ...input.cases }
  }

  return {
    ok: true,
    disposition: input.disposition,
    eventId: input.event.id,
    caseId: input.caseId,
    events: nextEvents,
    cases: nextCases,
    createdCase: input.createdCase,
  }
}

/**
 * Exact-once escalate an eligible brief extranormal event into a CaseInstance.
 *
 * - Reuses a valid already-linked `escalatedCaseRef`.
 * - Supports explicit or cluster-authored many-events → one-case convergence.
 * - Creates exactly one case via `createStarterCase` when no valid target exists.
 * - Rejects conflicting targets and unrelated case-id occupancy fail-closed.
 * - On failure, returns the input maps unchanged (same references).
 */
export function escalateExtranormalEventToCase(
  input: EscalateExtranormalEventToCaseInput
): ExtranormalEventCaseEscalationResult {
  const events = input.events
  const cases = input.cases

  if (!input || typeof input !== 'object') {
    return fail('malformed_input', ['Escalation input must be an object.'], {}, {})
  }

  const eventId = normalizeToken(input.eventId)
  if (!eventId) {
    return fail('malformed_input', ['eventId is required.'], events, cases)
  }

  const templateId = normalizeToken(input.templateId)
  if (!templateId) {
    return fail('malformed_input', ['templateId is required.'], events, cases)
  }

  const event = events[eventId]
  if (!event) {
    return fail('event_not_found', [`Extranormal event ${eventId} was not found.`], events, cases)
  }

  const validation = validateExtranormalEventRecord(event)
  if (!validation.valid) {
    return fail(
      'event_invalid',
      validation.issues.map((issue) => issue.detail),
      events,
      cases
    )
  }

  const existingRef = normalizeToken(event.escalatedCaseRef ?? '')
  if (existingRef) {
    const linkedCase = findCaseByRef(cases, existingRef)
    if (!linkedCase) {
      return fail(
        'escalated_case_ref_unresolved',
        [`Event ${eventId} escalatedCaseRef ${existingRef} does not resolve to a CaseInstance.`],
        events,
        cases
      )
    }

    const convergeRef = normalizeToken(input.convergeCaseRef ?? '')
    if (convergeRef) {
      const convergeCase = findCaseByRef(cases, convergeRef)
      if (!convergeCase) {
        return fail(
          'converge_case_ref_unresolved',
          [`convergeCaseRef ${convergeRef} does not resolve to a CaseInstance.`],
          events,
          cases
        )
      }
      if (normalizeKey(convergeCase.id) !== normalizeKey(linkedCase.id)) {
        return fail(
          'conflicting_case_targets',
          [
            `Event ${eventId} is linked to ${linkedCase.id} but convergeCaseRef resolves to ${convergeCase.id}.`,
          ],
          events,
          cases
        )
      }
    }

    return commitSuccess({
      disposition: 'reused',
      event,
      caseId: linkedCase.id,
      events,
      cases,
      createdCase: false,
    })
  }

  const candidateCaseIds: string[] = []

  const convergeRef = normalizeToken(input.convergeCaseRef ?? '')
  if (convergeRef) {
    const convergeCase = findCaseByRef(cases, convergeRef)
    if (!convergeCase) {
      return fail(
        'converge_case_ref_unresolved',
        [`convergeCaseRef ${convergeRef} does not resolve to a CaseInstance.`],
        events,
        cases
      )
    }
    candidateCaseIds.push(convergeCase.id)
  }

  for (const clusterCaseId of collectClusterConvergenceCaseIds(event, events, cases)) {
    if (!candidateCaseIds.includes(clusterCaseId)) {
      candidateCaseIds.push(clusterCaseId)
    }
  }

  if (candidateCaseIds.length > 1) {
    return fail(
      'conflicting_case_targets',
      [
        `Event ${eventId} resolves to multiple case targets: ${candidateCaseIds.join(', ')}.`,
      ],
      events,
      cases
    )
  }

  if (candidateCaseIds.length === 1) {
    const caseId = candidateCaseIds[0]!
    return commitSuccess({
      disposition: 'converged',
      event,
      caseId,
      events,
      cases,
      createdCase: false,
    })
  }

  const derivedCaseId = deriveEscalatedCaseId(eventId)
  if (normalizeKey(derivedCaseId) === normalizeKey(eventId)) {
    return fail(
      'event_id_as_case_id',
      [`Derived case id must not equal event id ${eventId}.`],
      events,
      cases
    )
  }

  const occupying = findCaseByRef(cases, derivedCaseId)
  if (occupying) {
    if (caseHasSourceTag(occupying, eventId)) {
      return commitSuccess({
        disposition: 'reused',
        event,
        caseId: occupying.id,
        events,
        cases,
        createdCase: false,
      })
    }

    return fail(
      'case_id_collision',
      [
        `Derived case id ${derivedCaseId} is occupied by an unrelated CaseInstance.`,
      ],
      events,
      cases
    )
  }

  if (input.templates) {
    const template = input.templates[templateId]
    if (!template) {
      return fail(
        'template_not_found',
        [`Case template ${templateId} was not found in the provided catalog.`],
        events,
        cases
      )
    }
  }

  let created: CaseInstance
  try {
    created = createStarterCase({
      id: derivedCaseId,
      templateId,
      title: event.label,
      description: event.summary ?? event.label,
      status: 'open',
      stage: 1,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown template error'
    return fail('template_not_found', [message], events, cases)
  }

  const stamped = withSourceTag(created, eventId)

  return commitSuccess({
    disposition: 'created',
    event,
    caseId: stamped.id,
    events,
    cases,
    nextCase: stamped,
    createdCase: true,
  })
}
