/** SPE-2268: message data and knowledge-bounded construction, never delivery or authority. */
import {
  INFORMATION_VERIFICATION_STATUSES,
  type InformationVerificationStatus,
} from './informationIntakeReport'
import {
  GUIDANCE_RECOMMENDED_ACTIONS,
  type GuidanceRecommendedAction,
} from './messageToServiceAvailabilityValidation'

export const COMMUNICATION_PAYLOAD_SCHEMA_VERSION = 'spe-2268.v1' as const
export const COMMUNICATION_SEMANTIC_ACTS = [
  'report',
  'request',
  'warning',
  'order',
  'authorization',
  'acknowledgement',
] as const
export type CommunicationSemanticAct = (typeof COMMUNICATION_SEMANTIC_ACTS)[number]
export type CommunicationClaimKind = 'allegation' | 'reported_observation' | 'verified_observation'

export interface CommunicationObservation {
  readonly eventRef: string
  readonly sourceRef: string
  readonly statement: string
  readonly claimKind: CommunicationClaimKind
  readonly verificationStatus: InformationVerificationStatus
  readonly confidence: number
}

/** Already-eligible producer view, supplied by the knowledge owner; not a truth query API. */
export interface SenderKnownCommunicationInputs {
  readonly speakerRef: string
  readonly stateKeys: readonly string[]
  readonly events: readonly CommunicationObservation[]
}

export interface CommunicationProvenance {
  readonly authorRef?: string
  readonly requesterRef?: string
  readonly sponsorRef?: string
  readonly approverRef?: string
  readonly authorizerRef?: string
}

export interface CommunicationPayloadRecord {
  readonly schemaVersion: typeof COMMUNICATION_PAYLOAD_SCHEMA_VERSION
  readonly id: string
  readonly speakerRef: string
  readonly sourceRef: string
  readonly recipientRefs: readonly string[]
  readonly semanticAct: CommunicationSemanticAct
  readonly mode: 'speech' | 'text' | 'nonverbal'
  readonly outputSurface: 'dialogue' | 'document' | 'signal' | 'gesture'
  /** An opaque selection supplied by SPE-2238; this module does not select a pool. */
  readonly poolId?: string
  readonly stateKeys: readonly string[]
  readonly triggerHooks: readonly string[]
  readonly logRef?: string
  readonly urgency: 'routine' | 'urgent' | 'immediate'
  readonly observations: readonly CommunicationObservation[]
  readonly provenance?: CommunicationProvenance
  readonly protectiveAction?: GuidanceRecommendedAction
}

export type CommunicationPayloadResult =
  | { readonly ok: true; readonly payload: CommunicationPayloadRecord }
  | { readonly ok: false; readonly issues: readonly string[] }

export type CommunicationPayloadRequest = Omit<
  CommunicationPayloadRecord,
  'schemaVersion' | 'speakerRef' | 'stateKeys' | 'observations'
> & {
  readonly stateKeys?: readonly string[]
  readonly eventRefs: readonly string[]
}

export interface CommunicationSelectorInputs {
  readonly speakerRef: string
  readonly stateKeys: readonly string[]
  readonly recentEventRefs: readonly string[]
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}
function oneOf<T extends string>(value: unknown, choices: readonly T[]): value is T {
  return typeof value === 'string' && choices.some((choice) => choice === value)
}
function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
function strings(raw: unknown, nonempty = false): readonly string[] | null {
  if (!Array.isArray(raw) || (nonempty && raw.length === 0) || !Array.from(raw).every(text))
    return null
  return Object.freeze([...new Set(raw as string[])].sort(compare))
}
function fail(issue: string): { readonly ok: false; readonly issues: readonly string[] } {
  return { ok: false, issues: Object.freeze([issue]) }
}
function observation(raw: unknown): CommunicationObservation | null {
  if (
    !record(raw) ||
    !text(raw.eventRef) ||
    !text(raw.sourceRef) ||
    !text(raw.statement) ||
    !oneOf(raw.claimKind, ['allegation', 'reported_observation', 'verified_observation']) ||
    !oneOf(raw.verificationStatus, INFORMATION_VERIFICATION_STATUSES) ||
    typeof raw.confidence !== 'number' ||
    !Number.isFinite(raw.confidence) ||
    raw.confidence < 0 ||
    raw.confidence > 1
  )
    return null
  if (
    raw.claimKind === 'verified_observation' &&
    raw.verificationStatus !== 'verified' &&
    raw.verificationStatus !== 'escalated_confidence'
  )
    return null
  return Object.freeze({
    eventRef: raw.eventRef,
    sourceRef: raw.sourceRef,
    statement: raw.statement,
    claimKind: raw.claimKind,
    verificationStatus: raw.verificationStatus,
    confidence: raw.confidence,
  })
}
function eventMap(raw: unknown): Map<string, CommunicationObservation> | null {
  if (!Array.isArray(raw)) return null
  const map = new Map<string, CommunicationObservation>()
  for (const entry of raw) {
    const parsed = observation(entry)
    if (!parsed) return null
    const previous = map.get(parsed.eventRef)
    if (previous && JSON.stringify(previous) !== JSON.stringify(parsed)) return null
    map.set(parsed.eventRef, parsed)
  }
  return map
}
function knownInputs(raw: unknown): SenderKnownCommunicationInputs | null {
  if (!record(raw) || !text(raw.speakerRef)) return null
  const stateKeys = strings(raw.stateKeys)
  const events = eventMap(raw.events)
  if (!stateKeys || !events) return null
  return Object.freeze({
    speakerRef: raw.speakerRef,
    stateKeys,
    events: Object.freeze([...events.values()].sort((a, b) => compare(a.eventRef, b.eventRef))),
  })
}

/** Pure selector context only. SPE-2238 retains its selector and RNG algorithm. */
export function buildCommunicationSelectorInputs(
  rawKnown: SenderKnownCommunicationInputs
): CommunicationSelectorInputs | null {
  const known = knownInputs(rawKnown)
  return known
    ? Object.freeze({
        speakerRef: known.speakerRef,
        stateKeys: known.stateKeys,
        recentEventRefs: Object.freeze(known.events.map((entry) => entry.eventRef)),
      })
    : null
}

/** Validates content against the supplied sender view, preserving qualifiers rather than inferring truth. */
export function parseCommunicationPayload(
  raw: unknown,
  rawKnown: SenderKnownCommunicationInputs
): CommunicationPayloadResult {
  const known = knownInputs(rawKnown)
  if (!known) return fail('invalid_sender_known_inputs')
  if (!record(raw) || raw.schemaVersion !== COMMUNICATION_PAYLOAD_SCHEMA_VERSION)
    return fail('invalid_payload_schema')
  if (!text(raw.id) || !text(raw.sourceRef) || raw.speakerRef !== known.speakerRef)
    return fail('invalid_payload_identity')
  if (!oneOf(raw.semanticAct, COMMUNICATION_SEMANTIC_ACTS)) return fail('invalid_semantic_act')
  if (
    !oneOf(raw.mode, ['speech', 'text', 'nonverbal']) ||
    !oneOf(raw.outputSurface, ['dialogue', 'document', 'signal', 'gesture'])
  )
    return fail('invalid_output')
  if (
    (raw.mode === 'speech' && raw.outputSurface !== 'dialogue') ||
    (raw.mode === 'nonverbal' &&
      raw.outputSurface !== 'signal' &&
      raw.outputSurface !== 'gesture') ||
    (raw.mode === 'text' && raw.outputSurface !== 'document' && raw.outputSurface !== 'dialogue')
  )
    return fail('incompatible_output')
  if (!oneOf(raw.urgency, ['routine', 'urgent', 'immediate'])) return fail('invalid_urgency')
  const recipientRefs = strings(raw.recipientRefs, true)
  const stateKeys = strings(raw.stateKeys)
  const triggerHooks = strings(raw.triggerHooks)
  if (!recipientRefs || !stateKeys || !triggerHooks) return fail('invalid_payload_keys')
  if (stateKeys.some((key) => !known.stateKeys.includes(key)))
    return fail('unknown_speaker_state_key')
  for (const key of ['poolId', 'logRef'])
    if (raw[key] !== undefined && !text(raw[key])) return fail(`invalid_${key}`)
  if (
    raw.protectiveAction !== undefined &&
    !oneOf(raw.protectiveAction, GUIDANCE_RECOMMENDED_ACTIONS)
  )
    return fail('invalid_protective_action')
  let provenance: CommunicationProvenance | undefined
  if (raw.provenance !== undefined) {
    if (!record(raw.provenance)) return fail('invalid_provenance')
    const roles = [
      'authorRef',
      'requesterRef',
      'sponsorRef',
      'approverRef',
      'authorizerRef',
    ] as const
    if (Object.keys(raw.provenance).some((key) => !roles.some((role) => role === key)))
      return fail('unknown_provenance_role')
    const parsed: Record<string, string> = {}
    for (const role of roles) {
      const value = raw.provenance[role]
      if (value !== undefined) {
        if (!text(value)) return fail('invalid_provenance_ref')
        parsed[role] = value
      }
    }
    provenance = Object.keys(parsed).length ? Object.freeze(parsed) : undefined
  }
  const events = eventMap(raw.observations)
  if (!events) return fail('invalid_or_conflicting_observations')
  const eligible = new Map(known.events.map((event) => [event.eventRef, event]))
  for (const event of events.values()) {
    const permitted = eligible.get(event.eventRef)
    if (!permitted) return fail('unknown_sender_event')
    if (JSON.stringify(permitted) !== JSON.stringify(event)) return fail('changed_event_qualifiers')
  }
  const payload: CommunicationPayloadRecord = Object.freeze({
    schemaVersion: COMMUNICATION_PAYLOAD_SCHEMA_VERSION,
    id: raw.id,
    speakerRef: known.speakerRef,
    sourceRef: raw.sourceRef,
    recipientRefs,
    semanticAct: raw.semanticAct,
    mode: raw.mode,
    outputSurface: raw.outputSurface,
    ...(raw.poolId !== undefined ? { poolId: raw.poolId as string } : {}),
    stateKeys,
    triggerHooks,
    ...(raw.logRef !== undefined ? { logRef: raw.logRef as string } : {}),
    urgency: raw.urgency,
    observations: Object.freeze(
      [...events.values()].sort((a, b) => compare(a.eventRef, b.eventRef))
    ),
    ...(provenance ? { provenance } : {}),
    ...(raw.protectiveAction !== undefined
      ? { protectiveAction: raw.protectiveAction as GuidanceRecommendedAction }
      : {}),
  })
  return { ok: true, payload }
}

/** Requested references are resolved only within the explicitly eligible view. No GameState argument. */
export function buildCommunicationPayload(
  request: CommunicationPayloadRequest,
  rawKnown: SenderKnownCommunicationInputs
): CommunicationPayloadResult {
  if (!record(request)) return fail('invalid_payload_request')
  const known = knownInputs(rawKnown)
  if (!known) return fail('invalid_sender_known_inputs')
  const refs = strings(request.eventRefs)
  if (!refs) return fail('invalid_event_refs')
  const events = new Map(known.events.map((event) => [event.eventRef, event]))
  const observations: CommunicationObservation[] = []
  for (const ref of refs) {
    const event = events.get(ref)
    if (!event) return fail('unknown_sender_event')
    observations.push(event)
  }
  return parseCommunicationPayload(
    {
      ...request,
      schemaVersion: COMMUNICATION_PAYLOAD_SCHEMA_VERSION,
      speakerRef: known.speakerRef,
      stateKeys: request.stateKeys === undefined ? known.stateKeys : request.stateKeys,
      observations,
    },
    known
  )
}

/** Identical repeats collapse; a changed payload under one identity is a conflict, never last-writer-wins. */
export function reconcileCommunicationPayloads(
  raw: readonly unknown[],
  known: SenderKnownCommunicationInputs
):
  | { readonly ok: true; readonly payloads: readonly CommunicationPayloadRecord[] }
  | { readonly ok: false; readonly issues: readonly string[] } {
  if (!Array.isArray(raw)) return fail('invalid_payload_collection')
  if (!knownInputs(known)) return fail('invalid_sender_known_inputs')
  const payloads = new Map<string, CommunicationPayloadRecord>()
  for (const entry of raw) {
    const result = parseCommunicationPayload(entry, known)
    if (!result.ok) return result
    const previous = payloads.get(result.payload.id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(result.payload))
      return fail('conflicting_payload_identity')
    payloads.set(result.payload.id, result.payload)
  }
  return {
    ok: true,
    payloads: Object.freeze([...payloads.values()].sort((a, b) => compare(a.id, b.id))),
  }
}
