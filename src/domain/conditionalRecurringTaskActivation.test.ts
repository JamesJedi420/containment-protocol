import { describe, expect, it } from 'vitest'
import type { Spe3041ActivationIntent } from './containmentRequirementFulfillment'
import {
  buildActivationIdentity,
  buildObligationRecurrenceDefinition,
  evaluateConditionalRecurringActivation,
  markActivationCompleted,
  parseRecurrenceDefinition,
  recurrenceDefinitionFromSpe3181Intent,
  serializeActivationMarkers,
  type ActivationMarkers,
  type RecurrenceDefinition,
} from './conditionalRecurringTaskActivation'

function baseDefinition(
  overrides: Partial<RecurrenceDefinition> & {
    conditionGroup?: RecurrenceDefinition['conditionGroup']
  } = {}
): RecurrenceDefinition {
  return {
    templateId: 'tmpl-1',
    producerId: 'producer-a',
    producerKind: 'test_producer',
    taskKind: 'test_task',
    windowId: 'w1',
    recurrencePolicy: 'once_per_window',
    cooldownWeeks: 0,
    createsWork: true,
    conditionGroup: {
      kind: 'all',
      conditions: [
        {
          conditionId: 'stock_ok',
          sourceRef: 'facility:stock',
          operator: 'gte',
          threshold: 10,
        },
      ],
    },
    ...overrides,
  }
}

const emptyMarkers: ActivationMarkers = {
  activatedWindowIds: [],
  activationGeneration: 0,
}

describe('parseRecurrenceDefinition', () => {
  it('accepts a valid definition and rejects malformed input', () => {
    expect(parseRecurrenceDefinition(baseDefinition())).toMatchObject({
      templateId: 'tmpl-1',
      createsWork: true,
    })
    expect(parseRecurrenceDefinition(null)).toBeUndefined()
    expect(
      parseRecurrenceDefinition({
        ...baseDefinition(),
        recurrencePolicy: 'repeat_after_cooldown',
        cooldownWeeks: 0,
      })
    ).toBeUndefined()
  })
})

describe('condition groups', () => {
  it('requires all conditions for all-groups', () => {
    const definition = baseDefinition({
      conditionGroup: {
        kind: 'all',
        conditions: [
          {
            conditionId: 'a',
            sourceRef: 'src:a',
            operator: 'gte',
            threshold: 5,
          },
          {
            conditionId: 'b',
            sourceRef: 'src:b',
            operator: 'eq',
            threshold: true,
          },
        ],
      },
    })

    const partial = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 3,
      sources: [
        { sourceRef: 'src:a', value: 8, available: true },
        { sourceRef: 'src:b', value: false, available: true },
      ],
    })
    expect(partial.result).toBe('skipped_conditions')
    expect(partial.conditionDiagnostics.map((d) => d.outcome)).toEqual(['passed', 'failed'])

    const full = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 3,
      sources: [
        { sourceRef: 'src:a', value: 8, available: true },
        { sourceRef: 'src:b', value: true, available: true },
      ],
    })
    expect(full.result).toBe('activated')
    expect(full.envelope?.envelopeOwner).toBe('SPE-1287')
  })

  it('activates when any condition passes for any-groups', () => {
    const definition = baseDefinition({
      conditionGroup: {
        kind: 'any',
        conditions: [
          {
            conditionId: 'a',
            sourceRef: 'src:a',
            operator: 'gte',
            threshold: 100,
          },
          {
            conditionId: 'b',
            sourceRef: 'src:b',
            operator: 'truthy',
          },
        ],
      },
    })

    const result = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [
        { sourceRef: 'src:a', value: 1, available: true },
        { sourceRef: 'src:b', value: true, available: true },
      ],
    })
    expect(result.result).toBe('activated')
  })

  it('fails closed on unavailable sources with inspectable diagnostics', () => {
    const result = evaluateConditionalRecurringActivation({
      definition: baseDefinition(),
      markers: emptyMarkers,
      campaignWeek: 2,
      sources: [{ sourceRef: 'facility:stock', value: 99, available: false }],
    })
    expect(result.result).toBe('skipped_conditions')
    expect(result.conditionDiagnostics[0]).toMatchObject({
      outcome: 'unavailable',
      reasonCode: 'source_unavailable',
    })
  })

  it('detects threshold crossing and later reversal', () => {
    const definition = baseDefinition()
    const below = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [{ sourceRef: 'facility:stock', value: 9, available: true }],
    })
    expect(below.result).toBe('skipped_conditions')

    const crossed = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 2,
      sources: [{ sourceRef: 'facility:stock', value: 10, available: true }],
    })
    expect(crossed.result).toBe('activated')

    const reversed = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 3,
      sources: [{ sourceRef: 'facility:stock', value: 4, available: true }],
    })
    expect(reversed.result).toBe('skipped_conditions')
  })
})

describe('recurrence policies', () => {
  it('once_per_window is idempotent across repeated evaluation', () => {
    const definition = baseDefinition()
    const first = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 4,
      sources: [{ sourceRef: 'facility:stock', value: 12, available: true }],
    })
    expect(first.result).toBe('activated')
    expect(first.markers.activatedWindowIds).toContain('w1')

    const second = evaluateConditionalRecurringActivation({
      definition,
      markers: first.markers,
      campaignWeek: 4,
      sources: [{ sourceRef: 'facility:stock', value: 12, available: true }],
    })
    expect(second.result).toBe('idempotent_noop')
    expect(second.envelope).toBeUndefined()
    expect(second.reasonCodes).toContain('already_activated_this_window')
  })

  it('repeat_after_completion waits for producer completion then reactivates', () => {
    const definition = baseDefinition({
      recurrencePolicy: 'repeat_after_completion',
    })
    const first = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(first.result).toBe('activated')

    const blocked = evaluateConditionalRecurringActivation({
      definition,
      markers: first.markers,
      campaignWeek: 2,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(blocked.result).toBe('skipped_recurrence')
    expect(blocked.reasonCodes).toContain('awaiting_prior_completion')

    const completed = markActivationCompleted(first.markers, 2)
    expect(completed?.activeEnvelopeId).toBeUndefined()

    const second = evaluateConditionalRecurringActivation({
      definition,
      markers: completed,
      campaignWeek: 3,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
      priorInstanceCompleted: true,
    })
    expect(second.result).toBe('activated')
  })

  it('repeat_after_cooldown blocks until cooldown elapses', () => {
    const definition = baseDefinition({
      recurrencePolicy: 'repeat_after_cooldown',
      cooldownWeeks: 2,
    })
    const first = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 5,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(first.result).toBe('activated')

    const completed = markActivationCompleted(first.markers, 5)
    const cooling = evaluateConditionalRecurringActivation({
      definition,
      markers: completed,
      campaignWeek: 6,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(cooling.result).toBe('skipped_recurrence')
    expect(cooling.reasonCodes).toContain('cooldown_active')

    const ready = evaluateConditionalRecurringActivation({
      definition,
      markers: completed,
      campaignWeek: 7,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(ready.result).toBe('activated')
    expect(ready.markers.lastActivatedWeek).toBe(7)
    expect(ready.envelope?.envelopeId).not.toBe(first.envelope?.envelopeId)
  })

  it('repeat_while_condition_persists activates once while an envelope is active', () => {
    const definition = baseDefinition({
      recurrencePolicy: 'repeat_while_condition_persists',
    })
    const first = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(first.result).toBe('activated')

    const blocked = evaluateConditionalRecurringActivation({
      definition,
      markers: first.markers,
      campaignWeek: 2,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(blocked.result).toBe('idempotent_noop')

    const afterClear = markActivationCompleted(first.markers, 2)
    const again = evaluateConditionalRecurringActivation({
      definition,
      markers: afterClear,
      campaignWeek: 3,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    expect(again.result).toBe('activated')
  })
})

describe('save/load idempotency', () => {
  it('does not duplicate after serialize between qualification and activation', () => {
    const definition = baseDefinition()
    const activated = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 8,
      sources: [{ sourceRef: 'facility:stock', value: 15, available: true }],
    })
    const restored = serializeActivationMarkers(activated.markers)
    expect(restored).toEqual(activated.markers)

    const again = evaluateConditionalRecurringActivation({
      definition,
      markers: restored,
      campaignWeek: 9,
      sources: [{ sourceRef: 'facility:stock', value: 15, available: true }],
    })
    expect(again.result).toBe('idempotent_noop')
    expect(buildActivationIdentity(definition, 0)).toBe(activated.envelope?.activationIdentity)
  })

  it('successive repeat instances get distinct envelope ids', () => {
    const definition = baseDefinition({
      recurrencePolicy: 'repeat_after_completion',
    })
    const first = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
    })
    const completed = markActivationCompleted(first.markers, 2)
    const second = evaluateConditionalRecurringActivation({
      definition,
      markers: completed,
      campaignWeek: 3,
      sources: [{ sourceRef: 'facility:stock', value: 20, available: true }],
      priorInstanceCompleted: true,
    })
    expect(second.result).toBe('activated')
    expect(second.envelope?.envelopeId).not.toBe(first.envelope?.envelopeId)
  })
})

describe('two producer subsystems', () => {
  it('SPE-3181 intent adapter creates a SPE-1287 envelope once per window', () => {
    const intent: Spe3041ActivationIntent = Object.freeze({
      activationOwner: 'SPE-3041',
      requirementId: 'req-1',
      subjectRef: 'subject:cell-a',
      windowId: 'win-q1',
      idempotencyKey: '["spe-3041","subject:cell-a","req-1","win-q1"]',
      reasonCodes: Object.freeze(['work_activation_required'] as const),
    })
    const definition = recurrenceDefinitionFromSpe3181Intent(intent)
    const sourceRef = `spe-3181:intent:${intent.idempotencyKey}`

    const first = evaluateConditionalRecurringActivation({
      definition,
      markers: emptyMarkers,
      campaignWeek: 10,
      sources: [{ sourceRef, value: true, available: true }],
    })
    expect(first.result).toBe('activated')
    expect(first.envelope).toMatchObject({
      envelopeOwner: 'SPE-1287',
      producerId: 'SPE-3181',
      requirementId: 'req-1',
      taskKind: 'containment_requirement_fulfillment',
    })
    // Envelope handoff does not carry staffing/reservation/progress fields.
    expect(first.envelope).not.toHaveProperty('staffing')
    expect(first.envelope).not.toHaveProperty('reservation')
    expect(first.envelope).not.toHaveProperty('progress')

    const second = evaluateConditionalRecurringActivation({
      definition,
      markers: first.markers,
      campaignWeek: 10,
      sources: [{ sourceRef, value: true, available: true }],
    })
    expect(second.result).toBe('idempotent_noop')
  })

  it('keeps activation identities distinct for different subjects in the same window', () => {
    const cellA: Spe3041ActivationIntent = Object.freeze({
      activationOwner: 'SPE-3041',
      requirementId: 'req-1',
      subjectRef: 'subject:cell-a',
      windowId: 'win-q1',
      idempotencyKey: '["spe-3041","subject:cell-a","req-1","win-q1"]',
      reasonCodes: Object.freeze(['work_activation_required'] as const),
    })
    const cellB: Spe3041ActivationIntent = Object.freeze({
      activationOwner: 'SPE-3041',
      requirementId: 'req-1',
      subjectRef: 'subject:cell-b',
      windowId: 'win-q1',
      idempotencyKey: '["spe-3041","subject:cell-b","req-1","win-q1"]',
      reasonCodes: Object.freeze(['work_activation_required'] as const),
    })

    const definitionA = recurrenceDefinitionFromSpe3181Intent(cellA)
    const definitionB = recurrenceDefinitionFromSpe3181Intent(cellB)
    expect(buildActivationIdentity(definitionA)).not.toBe(buildActivationIdentity(definitionB))

    const activatedA = evaluateConditionalRecurringActivation({
      definition: definitionA,
      markers: emptyMarkers,
      campaignWeek: 10,
      sources: [
        { sourceRef: `spe-3181:intent:${cellA.idempotencyKey}`, value: true, available: true },
      ],
    })
    const activatedB = evaluateConditionalRecurringActivation({
      definition: definitionB,
      markers: emptyMarkers,
      campaignWeek: 10,
      sources: [
        { sourceRef: `spe-3181:intent:${cellB.idempotencyKey}`, value: true, available: true },
      ],
    })
    expect(activatedA.envelope?.envelopeId).not.toBe(activatedB.envelope?.envelopeId)

    const obligationA = buildObligationRecurrenceDefinition({
      obligationId: 'obl-work',
      windowId: 'period-1',
      createsWork: true,
      subjectRef: 'site:alpha',
    })
    const obligationB = buildObligationRecurrenceDefinition({
      obligationId: 'obl-work',
      windowId: 'period-1',
      createsWork: true,
      subjectRef: 'site:beta',
    })
    expect(buildActivationIdentity(obligationA)).not.toBe(buildActivationIdentity(obligationB))
  })

  it('obligation producer activates once for work-required periods and skips action-only', () => {
    const workDef = buildObligationRecurrenceDefinition({
      obligationId: 'obl-work',
      windowId: 'period-1',
      createsWork: true,
      subjectRef: 'site:alpha',
    })
    const work = evaluateConditionalRecurringActivation({
      definition: workDef,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [
        {
          sourceRef: 'obligation:obl-work:requires_work',
          value: true,
          available: true,
        },
      ],
    })
    expect(work.result).toBe('activated')
    expect(work.envelope?.obligationId).toBe('obl-work')
    expect(work.conditionDiagnostics[0]?.conditionId).toBe('obligation_requires_work')

    const again = evaluateConditionalRecurringActivation({
      definition: workDef,
      markers: work.markers,
      campaignWeek: 1,
      sources: [
        {
          sourceRef: 'obligation:obl-work:requires_work',
          value: true,
          available: true,
        },
      ],
    })
    expect(again.result).toBe('idempotent_noop')

    const actionOnly = buildObligationRecurrenceDefinition({
      obligationId: 'obl-action',
      windowId: 'period-1',
      createsWork: false,
    })
    const skipped = evaluateConditionalRecurringActivation({
      definition: actionOnly,
      markers: emptyMarkers,
      campaignWeek: 1,
      sources: [
        {
          sourceRef: 'obligation:obl-action:requires_work',
          value: true,
          available: true,
        },
      ],
    })
    expect(skipped.result).toBe('skipped_recurrence')
    expect(skipped.reasonCodes).toContain('no_task_for_compliance_only')
    expect(skipped.envelope).toBeUndefined()
  })
})
