import { describe, expect, it } from 'vitest'
import {
  BRIEF_COVER_UP_EVENT_FIXTURE,
  BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
  CLUSTER_SIBLING_EVENT_FIXTURE,
  sanitizeExtranormalEventRecords,
  type ExtranormalEventRecord,
  type ExtranormalEventRecordsMap,
} from './extranormalEventRegistry'
import {
  deriveEscalatedCaseId,
  escalateExtranormalEventToCase,
  extranormalEventSourceTag,
} from './extranormalEventCaseEscalation'
import type { CaseInstance } from './models'
import { createStarterCase } from './templates/startingCases'
import { caseTemplateMap } from './templates/caseTemplates'

const TEMPLATE_ID = 'info-001'

function eligibleEvent(
  overrides: Partial<ExtranormalEventRecord> = {}
): ExtranormalEventRecord {
  return {
    ...BRIEF_COVER_UP_EVENT_FIXTURE,
    id: 'event:escalation-primary',
    label: 'Escalation primary glow',
    closureState: undefined,
    resolved: undefined,
    monitoringUntilWeek: undefined,
    coverStoryCode: undefined,
    witnessPlan: undefined,
    ...overrides,
  }
}

function seedMaps(
  event: ExtranormalEventRecord,
  extras: ExtranormalEventRecordsMap = {},
  cases: Record<string, CaseInstance> = {}
) {
  return {
    events: { [event.id]: event, ...extras },
    cases,
  }
}

describe('extranormalEventCaseEscalation (SPE-3367)', () => {
  it('creates one CaseInstance for an eligible event and stores escalatedCaseRef', () => {
    const event = eligibleEvent()
    const { events, cases } = seedMaps(event)

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events,
      cases,
      templateId: TEMPLATE_ID,
      templates: caseTemplateMap,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.disposition).toBe('created')
    expect(result.createdCase).toBe(true)
    expect(result.caseId).toBe(deriveEscalatedCaseId(event.id))
    expect(result.caseId).not.toBe(event.id)
    expect(result.events[event.id]?.escalatedCaseRef).toBe(result.caseId)
    expect(result.events[event.id]?.closureState).toBe('escalated_to_case')
    expect(result.cases[result.caseId]?.id).toBe(result.caseId)
    expect(result.cases[result.caseId]?.tags).toContain(extranormalEventSourceTag(event.id))
    expect(result.cases[result.caseId]?.lifecycleStage).toBe('lead')
    // Source event remains a distinct queryable record.
    expect(result.events[event.id]?.id).toBe(event.id)
    expect(result.events[event.id]?.label).toBe(event.label)
  })

  it('rerunning the same escalation reuses the same case with no duplicate', () => {
    const event = eligibleEvent()
    const first = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: {},
      templateId: TEMPLATE_ID,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = escalateExtranormalEventToCase({
      eventId: event.id,
      events: first.events,
      cases: first.cases,
      templateId: TEMPLATE_ID,
    })

    expect(second.ok).toBe(true)
    if (!second.ok) return

    expect(second.disposition).toBe('reused')
    expect(second.createdCase).toBe(false)
    expect(second.caseId).toBe(first.caseId)
    expect(Object.keys(second.cases)).toEqual(Object.keys(first.cases))
    expect(second.events).toBe(first.events)
    expect(second.cases).toBe(first.cases)
  })

  it('does not create another case when already linked to a valid target', () => {
    const existing = createStarterCase({
      id: 'case:preexisting-target',
      templateId: TEMPLATE_ID,
      title: 'Preexisting escalated case',
    })
    const event = eligibleEvent({
      closureState: 'escalated_to_case',
      escalatedCaseRef: existing.id,
    })

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: { [existing.id]: existing },
      templateId: TEMPLATE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.disposition).toBe('reused')
    expect(result.createdCase).toBe(false)
    expect(result.caseId).toBe(existing.id)
    expect(Object.keys(result.cases)).toHaveLength(1)
  })

  it('converges two explicitly related events onto one existing case', () => {
    const primary = {
      ...BRIEF_COVER_UP_EVENT_WITH_CLUSTER,
      closureState: undefined,
      resolved: undefined,
      monitoringUntilWeek: undefined,
      coverStoryCode: undefined,
      witnessPlan: undefined,
    }
    const first = escalateExtranormalEventToCase({
      eventId: primary.id,
      events: { [primary.id]: primary },
      cases: {},
      templateId: TEMPLATE_ID,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const sibling = {
      ...CLUSTER_SIBLING_EVENT_FIXTURE,
      closureState: undefined,
      resolved: undefined,
      coverStoryCode: undefined,
      witnessPlan: undefined,
    }

    const second = escalateExtranormalEventToCase({
      eventId: sibling.id,
      events: {
        ...first.events,
        [sibling.id]: sibling,
      },
      cases: first.cases,
      templateId: TEMPLATE_ID,
    })

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.disposition).toBe('converged')
    expect(second.createdCase).toBe(false)
    expect(second.caseId).toBe(first.caseId)
    expect(second.events[sibling.id]?.escalatedCaseRef).toBe(first.caseId)
    expect(second.events[primary.id]?.escalatedCaseRef).toBe(first.caseId)
    expect(Object.keys(second.cases)).toHaveLength(1)
  })

  it('converges via explicit convergeCaseRef onto one existing case', () => {
    const shared = createStarterCase({
      id: 'case:shared-convergence',
      templateId: TEMPLATE_ID,
    })
    const event = eligibleEvent({ id: 'event:converge-explicit' })

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: { [shared.id]: shared },
      templateId: TEMPLATE_ID,
      convergeCaseRef: shared.id,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.disposition).toBe('converged')
    expect(result.caseId).toBe(shared.id)
    expect(result.createdCase).toBe(false)
    expect(result.events[event.id]?.escalatedCaseRef).toBe(shared.id)
    expect(result.cases[result.caseId]?.tags).toContain(extranormalEventSourceTag(event.id))
  })

  it('fails deterministically on a conflicting second case target', () => {
    const linked = createStarterCase({ id: 'case:linked-a', templateId: TEMPLATE_ID })
    const other = createStarterCase({ id: 'case:linked-b', templateId: TEMPLATE_ID })
    const event = eligibleEvent({
      closureState: 'escalated_to_case',
      escalatedCaseRef: linked.id,
    })
    const events = { [event.id]: event }
    const cases = { [linked.id]: linked, [other.id]: other }

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events,
      cases,
      templateId: TEMPLATE_ID,
      convergeCaseRef: other.id,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('conflicting_case_targets')
    expect(result.events).toBe(events)
    expect(result.cases).toBe(cases)
    expect(Object.keys(result.cases)).toHaveLength(2)
  })

  it('leaves event and case state unchanged on failure before commit', () => {
    const event = eligibleEvent()
    const events = { [event.id]: event }
    const cases = {} as Record<string, CaseInstance>

    const missingTemplate = escalateExtranormalEventToCase({
      eventId: event.id,
      events,
      cases,
      templateId: 'template-does-not-exist',
    })

    expect(missingTemplate.ok).toBe(false)
    if (missingTemplate.ok) return
    expect(missingTemplate.events).toBe(events)
    expect(missingTemplate.cases).toBe(cases)
    expect(events[event.id]).toBe(event)
    expect(Object.keys(cases)).toHaveLength(0)

    const unresolved = escalateExtranormalEventToCase({
      eventId: event.id,
      events: {
        [event.id]: {
          ...event,
          closureState: 'escalated_to_case',
          escalatedCaseRef: 'case:missing-target',
        },
      },
      cases,
      templateId: TEMPLATE_ID,
    })

    expect(unresolved.ok).toBe(false)
    if (unresolved.ok) return
    expect(unresolved.code).toBe('escalated_case_ref_unresolved')
    expect(unresolved.cases).toBe(cases)
  })

  it('keeps the source event queryable as a distinct historical record after handoff', () => {
    const event = eligibleEvent({
      id: 'event:historical-distinct',
      summary: 'Preserve occurrence evidence after escalation.',
      evidenceTypes: ['witness_statement', 'sensor_reading'],
      occurrenceWindow: { startWeek: 4, endWeek: 4 },
    })

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: {},
      templateId: TEMPLATE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const persisted = result.events[event.id]
    expect(persisted).toBeDefined()
    expect(persisted?.id).toBe(event.id)
    expect(persisted?.occurrenceWindow).toEqual(event.occurrenceWindow)
    expect(persisted?.evidenceTypes).toEqual(event.evidenceTypes)
    expect(persisted?.summary).toBe(event.summary)
    expect(result.cases[result.caseId]?.id).not.toBe(event.id)
  })

  it('preserves event → case lineage through sanitize and does not replay creation', () => {
    const event = eligibleEvent({ id: 'event:round-trip' })
    const first = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: {},
      templateId: TEMPLATE_ID,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const hydratedEvents = sanitizeExtranormalEventRecords(first.events)
    expect(hydratedEvents[event.id]?.escalatedCaseRef).toBe(first.caseId)
    expect(hydratedEvents[event.id]?.closureState).toBe('escalated_to_case')

    const replay = escalateExtranormalEventToCase({
      eventId: event.id,
      events: hydratedEvents,
      cases: first.cases,
      templateId: TEMPLATE_ID,
    })

    expect(replay.ok).toBe(true)
    if (!replay.ok) return
    expect(replay.disposition).toBe('reused')
    expect(replay.createdCase).toBe(false)
    expect(replay.caseId).toBe(first.caseId)
    expect(Object.keys(replay.cases)).toHaveLength(1)
  })

  it('does not advance SPE-1310 lifecycle stages during handoff', () => {
    const event = eligibleEvent({ id: 'event:lifecycle-handoff' })
    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: {},
      templateId: TEMPLATE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.cases[result.caseId]?.lifecycleStage).toBe('lead')
    expect(result.cases[result.caseId]?.lifecycleInstitutionalLabel).toBe('preliminary_intake')
  })

  it('rejects unrelated occupancy of the derived case id fail-closed', () => {
    const event = eligibleEvent({ id: 'event:collision-check' })
    const derivedId = deriveEscalatedCaseId(event.id)
    const unrelated = createStarterCase({
      id: derivedId,
      templateId: TEMPLATE_ID,
      title: 'Unrelated occupant',
    })

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: { [unrelated.id]: unrelated },
      templateId: TEMPLATE_ID,
    })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('case_id_collision')
    expect(result.events[event.id]?.escalatedCaseRef).toBeUndefined()
  })

  it('idempotently reclaims a derived case that already carries this event source tag', () => {
    const event = eligibleEvent({ id: 'event:source-tag-reclaim' })
    const derivedId = deriveEscalatedCaseId(event.id)
    const prior = createStarterCase({
      id: derivedId,
      templateId: TEMPLATE_ID,
      title: event.label,
    })
    const stamped: CaseInstance = {
      ...prior,
      tags: [...prior.tags, extranormalEventSourceTag(event.id)],
    }

    const result = escalateExtranormalEventToCase({
      eventId: event.id,
      events: { [event.id]: event },
      cases: { [stamped.id]: stamped },
      templateId: TEMPLATE_ID,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.disposition).toBe('reused')
    expect(result.createdCase).toBe(false)
    expect(result.caseId).toBe(derivedId)
    expect(result.events[event.id]?.escalatedCaseRef).toBe(derivedId)
  })
})
