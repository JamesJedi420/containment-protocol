/** SPE-2268 bounded adapters. No transmission, clearance grant, or command execution. */
import {
  validateInformationIntakeReport,
  type InformationIntakeReportRecord,
} from './informationIntakeReport'
import {
  MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
  parsePublicGuidanceMessagePacket,
  validatePublicGuidanceAgainstServices,
  type PublicGuidanceMessagePacket,
  type PublicGuidanceServiceValidationResult,
} from './messageToServiceAvailabilityValidation'
import {
  parseCommunicationPayload,
  type CommunicationClaimKind,
  type CommunicationObservation,
  type CommunicationPayloadRecord,
  type SenderKnownCommunicationInputs,
} from './communicationPayload'

/** Intake source already visible to the producer; eligibility is supplied by the knowledge owner. */
export function observationFromEligibleIntakeReport(
  report: InformationIntakeReportRecord,
  eventRef: string,
  eligibleEventRefs: readonly string[],
  claimKind: CommunicationClaimKind
): CommunicationObservation | null {
  if (typeof eventRef !== 'string' || !eventRef || eventRef !== eventRef.trim()) return null
  if (!Array.isArray(eligibleEventRefs) || !eligibleEventRefs.includes(eventRef)) return null
  try {
    if (!validateInformationIntakeReport(report).valid) return null
  } catch {
    return null // The existing typed validator is not a raw-JSON parser.
  }
  const matches = [...report.corroborationHistory, ...report.contradictionHistory].filter(
    (event) => event.eventId === eventRef
  )
  if (matches.length !== 1) return null
  if (
    claimKind === 'verified_observation' &&
    report.verificationStatus !== 'verified' &&
    report.verificationStatus !== 'escalated_confidence'
  )
    return null
  if (!['allegation', 'reported_observation', 'verified_observation'].includes(claimKind))
    return null
  const event = matches[0]!
  if (
    typeof event.sourceRef !== 'string' ||
    !event.sourceRef ||
    event.sourceRef !== event.sourceRef.trim()
  )
    return null
  const statement = [event.note, report.summary, report.label].find(
    (value) => typeof value === 'string' && value.trim().length > 0
  )
  if (typeof statement !== 'string') return null
  return Object.freeze({
    eventRef,
    sourceRef: event.sourceRef,
    statement: statement.trim(),
    claimKind,
    verificationStatus: report.verificationStatus,
    confidence: report.confidenceScore,
  })
}

export type CommunicationGuidanceContext = Omit<
  PublicGuidanceMessagePacket,
  'schemaVersion' | 'messageId' | 'recommendedAction'
>

export type CommunicationGuidanceHandoff =
  | {
      readonly ok: true
      readonly payload: CommunicationPayloadRecord
      readonly packet: PublicGuidanceMessagePacket
      /** SPE-862 feasibility only: even disposition=release grants no release authority. */
      readonly serviceFeasibility: PublicGuidanceServiceValidationResult
    }
  | { readonly ok: false; readonly issues: readonly string[] }

/** An immutable handoff envelope; downstream lifecycle remains SPE-1093-owned. */
export function buildCommunicationGuidanceHandoff(
  rawPayload: unknown,
  known: SenderKnownCommunicationInputs,
  context: CommunicationGuidanceContext,
  serviceRegistry: unknown
): CommunicationGuidanceHandoff {
  const parsed = parseCommunicationPayload(rawPayload, known)
  if (!parsed.ok) return parsed
  if (!parsed.payload.protectiveAction) return { ok: false, issues: ['missing_protective_action'] }
  const packet = parsePublicGuidanceMessagePacket({
    ...context,
    schemaVersion: MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
    messageId: parsed.payload.id,
    recommendedAction: parsed.payload.protectiveAction,
  })
  if (!packet) return { ok: false, issues: ['invalid_guidance_context'] }
  return Object.freeze({
    ok: true,
    payload: parsed.payload,
    packet,
    serviceFeasibility: validatePublicGuidanceAgainstServices({
      packet,
      registry: serviceRegistry,
    }),
  })
}
