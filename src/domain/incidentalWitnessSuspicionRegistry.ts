/**
 * SPE-2158 slice 1: incidental witness promotion and suspicion registry.
 *
 * Bounded records for minor witnesses becoming durable actors and suspicion
 * arising through secondary detection channels without requiring immediate
 * confrontation. Reuses existing witness/case actor authority; does not
 * create a second NPC persistence or suspicion engine.
 */

export const WITNESS_PROMOTION_STATES = [
  'incidental',
  'promoted_durable',
  'dismissed',
  'escalated',
] as const
export type WitnessPromotionState = (typeof WITNESS_PROMOTION_STATES)[number]

export const DETECTION_CHANNELS = [
  'direct_observation',
  'secondary_report',
  'environmental_trace',
  'delayed_signal',
] as const
export type DetectionChannel = (typeof DETECTION_CHANNELS)[number]

export const SUSPICION_BANDS = ['none', 'low', 'moderate', 'high'] as const
export type SuspicionBand = (typeof SUSPICION_BANDS)[number]

export interface DelayedActionRef {
  readonly refId: string
  readonly actionKind: string
  readonly dueAfterSteps?: number
}

export interface IncidentalWitnessSuspicionRecord {
  readonly id: string
  readonly witnessActorRef: string
  readonly witnessPromotionState: WitnessPromotionState
  readonly detectionChannel: DetectionChannel
  readonly suspicionBand: SuspicionBand
  readonly delayedActionRefs: readonly DelayedActionRef[]
}

export interface IncidentalWitnessValidationIssue {
  readonly code: string
  readonly field: string
  readonly recordId?: string
}

export interface IncidentalWitnessValidationResult {
  readonly valid: boolean
  readonly issues: readonly IncidentalWitnessValidationIssue[]
}

const PROMOTION_SET: ReadonlySet<string> = new Set(WITNESS_PROMOTION_STATES)
const CHANNEL_SET: ReadonlySet<string> = new Set(DETECTION_CHANNELS)
const BAND_SET: ReadonlySet<string> = new Set(SUSPICION_BANDS)
const RECORD_ID = /^witness-suspicion:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ACTOR_REF = /^actor:[a-z0-9]+(?:-[a-z0-9]+)*$/

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function freezeRecord(input: IncidentalWitnessSuspicionRecord): IncidentalWitnessSuspicionRecord {
  return Object.freeze({
    id: input.id,
    witnessActorRef: input.witnessActorRef,
    witnessPromotionState: input.witnessPromotionState,
    detectionChannel: input.detectionChannel,
    suspicionBand: input.suspicionBand,
    delayedActionRefs: Object.freeze(
      input.delayedActionRefs.map((ref) => Object.freeze({ ...ref }))
    ),
  })
}

function issuesResult(
  issues: IncidentalWitnessValidationIssue[]
): IncidentalWitnessValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.recordId ?? '', b.recordId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateRecord(
  input: unknown,
  index: number,
  issues: IncidentalWitnessValidationIssue[],
  seenIds: Set<string>
): IncidentalWitnessSuspicionRecord | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const id = token(input.id)
  const witnessActorRef = token(input.witnessActorRef)
  const promotion = token(input.witnessPromotionState)
  const channel = token(input.detectionChannel)
  const band = token(input.suspicionBand)
  let legal = true

  if (!RECORD_ID.test(id)) {
    issues.push({
      code: 'invalid_record_id',
      field: `${field}.id`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  } else {
    if (seenIds.has(id)) {
      issues.push({ code: 'duplicate_record_id', field: `${field}.id`, recordId: id })
    }
    seenIds.add(id)
  }
  if (!ACTOR_REF.test(witnessActorRef)) {
    issues.push({
      code: 'invalid_witness_actor_ref',
      field: `${field}.witnessActorRef`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!PROMOTION_SET.has(promotion)) {
    issues.push({
      code: 'unknown_promotion_state',
      field: `${field}.witnessPromotionState`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!CHANNEL_SET.has(channel)) {
    issues.push({
      code: 'unknown_detection_channel',
      field: `${field}.detectionChannel`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!BAND_SET.has(band)) {
    issues.push({
      code: 'unknown_suspicion_band',
      field: `${field}.suspicionBand`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }

  const delayed = input.delayedActionRefs
  const delayedRefs: DelayedActionRef[] = []
  if (delayed !== undefined) {
    if (!Array.isArray(delayed)) {
      issues.push({
        code: 'invalid_delayed_action_refs',
        field: `${field}.delayedActionRefs`,
        ...(id ? { recordId: id } : {}),
      })
      legal = false
    } else {
      for (let dIndex = 0; dIndex < delayed.length; dIndex += 1) {
        const d = delayed[dIndex]
        if (!isPlainRecord(d)) {
          issues.push({
            code: 'invalid_delayed_action_ref',
            field: `${field}.delayedActionRefs[${dIndex}]`,
            ...(id ? { recordId: id } : {}),
          })
          legal = false
          continue
        }
        const refId = token(d.refId)
        const actionKind = token(d.actionKind)
        if (!refId || !actionKind) {
          issues.push({
            code: 'invalid_delayed_action_ref',
            field: `${field}.delayedActionRefs[${dIndex}]`,
            ...(id ? { recordId: id } : {}),
          })
          legal = false
          continue
        }
        const dueAfterSteps = d.dueAfterSteps
        if (
          dueAfterSteps !== undefined &&
          (typeof dueAfterSteps !== 'number' ||
            !Number.isSafeInteger(dueAfterSteps) ||
            dueAfterSteps < 0)
        ) {
          issues.push({
            code: 'invalid_due_after_steps',
            field: `${field}.delayedActionRefs[${dIndex}].dueAfterSteps`,
            recordId: id,
          })
          legal = false
          continue
        }
        delayedRefs.push({
          refId,
          actionKind,
          ...(typeof dueAfterSteps === 'number' ? { dueAfterSteps } : {}),
        })
      }
    }
  }

  if (!legal) return null

  return freezeRecord({
    id,
    witnessActorRef,
    witnessPromotionState: promotion as WitnessPromotionState,
    detectionChannel: channel as DetectionChannel,
    suspicionBand: band as SuspicionBand,
    delayedActionRefs: delayedRefs,
  })
}

function parseRegistry(input: unknown): {
  records: IncidentalWitnessSuspicionRecord[]
  validation: IncidentalWitnessValidationResult
} {
  const records: IncidentalWitnessSuspicionRecord[] = []
  if (!Array.isArray(input)) {
    return { records, validation: issuesResult([{ code: 'invalid_registry', field: 'records' }]) }
  }

  const issues: IncidentalWitnessValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const record = validateRecord(input[index], index, issues, seenIds)
    if (!record) continue
    records.push(record)
  }

  return { records, validation: issuesResult(issues) }
}

export function validateIncidentalWitnessSuspicionRecords(
  input: unknown
): IncidentalWitnessValidationResult {
  return parseRegistry(input).validation
}

export function normalizeIncidentalWitnessSuspicionRecords(
  input: readonly IncidentalWitnessSuspicionRecord[]
): readonly IncidentalWitnessSuspicionRecord[] | null {
  const { validation, records } = parseRegistry(input)
  if (!validation.valid) return null
  const ordered = records.sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

/** Authored slice-1 fixtures. Not live campaign state. */
export const INCIDENTAL_WITNESS_SUSPICION_FIXTURE_RECORDS: readonly IncidentalWitnessSuspicionRecord[] =
  Object.freeze([
    Object.freeze({
      id: 'witness-suspicion:bystander-01',
      witnessActorRef: 'actor:bystander-01',
      witnessPromotionState: 'incidental',
      detectionChannel: 'secondary_report',
      suspicionBand: 'low',
      delayedActionRefs: Object.freeze([
        Object.freeze({
          refId: 'action:follow-up-interview',
          actionKind: 'interview',
          dueAfterSteps: 3,
        }),
      ]),
    }),
    Object.freeze({
      id: 'witness-suspicion:observer-02',
      witnessActorRef: 'actor:observer-02',
      witnessPromotionState: 'promoted_durable',
      detectionChannel: 'environmental_trace',
      suspicionBand: 'moderate',
      delayedActionRefs: Object.freeze([]),
    }),
  ])
