import { describe, expect, it } from 'vitest'
import {
  EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION,
  EXPIRING_DECISION_LIFECYCLE_OWNER,
  EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION,
  applyCorrespondenceMisclassificationRepair,
  attemptLateResponse,
  cancelDecision,
  createCorrespondenceWindowDecision,
  createExpiringDecision,
  createOperationalRecommendationDecision,
  createPhaseHeldResponseDecision,
  hydrateExpiringDecisionRecord,
  isReplyActionAvailable,
  projectExpiringDecisionPresentation,
  projectTerminalProvenanceForDuty,
  refuseExplicitly,
  resolveExplicitly,
  resolveTimeoutIfDue,
  serializeExpiringDecisionRecord,
  shiftDeadline,
  supersedeDecision,
  type ExpiringDecisionRecord,
} from './expiringDecisionLifecycle'
import {
  FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
  evaluateOmissionAgainstDuty,
} from './dutyObligationRegistry'

describe('SPE-2805 expiring decision lifecycle', () => {
  it('exports contract metadata', () => {
    expect(EXPIRING_DECISION_LIFECYCLE_OWNER).toBe('SPE-2805')
    expect(EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION).toBe('spe-2805.v1')
  })

  it('uses the same lifecycle contract across two unrelated producers', () => {
    const correspondence = createCorrespondenceWindowDecision({
      id: 'dec:corr-shared',
      createdAt: 10,
      expiresAt: 14,
    })
    const recommendation = createOperationalRecommendationDecision({
      id: 'dec:rec-shared',
      createdAt: 100,
      expiresAt: 140,
    })
    expect(correspondence.ok).toBe(true)
    expect(recommendation.ok).toBe(true)
    if (!correspondence.ok || !recommendation.ok) return
    expect(correspondence.record.schemaVersion).toBe(recommendation.record.schemaVersion)
    expect(correspondence.record.producerDomain).toBe('correspondence_window')
    expect(recommendation.record.producerDomain).toBe('operational_recommendation')
    expect(correspondence.record.defaultResolution.contract).toBe('expire_without_action')
    expect(recommendation.record.defaultResolution.contract).toBe('named_domain_action')
  })

  it('resolves explicitly before expiry and suppresses timeout behavior', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-explicit',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const explicit = resolveExplicitly(created.record, {
      optionId: 'reply_acknowledge',
      at: 3,
    })
    expect(explicit.ok).toBe(true)
    if (!explicit.ok) return
    expect(explicit.record.lifecycleState).toBe('explicitly_resolved')
    expect(explicit.record.resolutionProvenance).toBe('explicit_selection')
    expect(explicit.record.selectedOptionId).toBe('reply_acknowledge')

    const timeout = resolveTimeoutIfDue(explicit.record, {
      clockDomain: 'authoritative_week',
      now: 5,
    })
    expect(timeout.ok).toBe(false)
    expect(timeout.reason).toBe('terminal')
    expect(timeout.effect).toBeUndefined()
  })

  it('expires an unanswered decision and invokes producer-declared default exactly once', () => {
    const created = createOperationalRecommendationDecision({
      id: 'dec:rec-timeout',
      createdAt: 0,
      expiresAt: 10,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const first = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_tick',
      now: 10,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.record.lifecycleState).toBe('default_resolved')
    expect(first.record.resolutionProvenance).toBe('timeout_default')
    expect(first.record.timeoutResolvedOnce).toBe(true)
    expect(first.effect?.invokedOnce).toBe(true)
    expect(first.effect?.actionRouteOwner).toBe('SPE-1127')
    expect(first.effect?.defaultOptionId).toBe('adopt_recommendation')

    const second = resolveTimeoutIfDue(first.record, {
      clockDomain: 'authoritative_tick',
      now: 11,
    })
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('already_timeout_resolved')
  })

  it('keeps explicit selection and timeout resolution historically distinguishable', () => {
    const base = createCorrespondenceWindowDecision({
      id: 'dec:corr-dist',
      createdAt: 1,
      expiresAt: 4,
    })
    expect(base.ok).toBe(true)
    if (!base.ok) return

    const explicit = resolveExplicitly(base.record, { optionId: 'reply_decline', at: 2 })
    const timed = resolveTimeoutIfDue(base.record, {
      clockDomain: 'authoritative_week',
      now: 4,
    })
    expect(explicit.ok && timed.ok).toBe(true)
    if (!explicit.ok || !timed.ok) return
    expect(explicit.record.resolutionProvenance).toBe('explicit_selection')
    expect(timed.record.resolutionProvenance).toBe('timeout_default')
    expect(explicit.record.resolutionProvenance).not.toBe(timed.record.resolutionProvenance)
  })

  it('rejects late responses after terminal resolution and prevents double-resolve', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-late',
      createdAt: 1,
      expiresAt: 3,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 3,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return

    const late = attemptLateResponse(timed.record, {
      optionId: 'reply_acknowledge',
      at: 4,
    })
    expect(late.ok).toBe(false)
    expect(late.reason).toBe('terminal')
    expect(timed.record.lifecycleState).toBe('expired')
  })

  it('respects authoritative deadline shifts before expiry', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-shift',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const early = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 5,
    })
    expect(early.ok).toBe(true)

    const shifted = shiftDeadline(created.record, {
      at: 3,
      newExpiresAt: 8,
      clockDomain: 'authoritative_week',
      deadlineSourceRef: 'spe-1585:shifted-source',
    })
    expect(shifted.ok).toBe(true)
    if (!shifted.ok) return
    expect(shifted.record.expiresAt).toBe(8)

    const notYet = resolveTimeoutIfDue(shifted.record, {
      clockDomain: 'authoritative_week',
      now: 5,
    })
    expect(notYet.ok).toBe(false)
    expect(notYet.reason).toBe('not_yet_expired')

    const due = resolveTimeoutIfDue(shifted.record, {
      clockDomain: 'authoritative_week',
      now: 8,
    })
    expect(due.ok).toBe(true)
  })

  it('preserves identical expiry and terminal behavior across save/load', () => {
    const created = createOperationalRecommendationDecision({
      id: 'dec:rec-persist',
      createdAt: 2,
      expiresAt: 20,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const resolved = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_tick',
      now: 20,
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return

    const serialized = serializeExpiringDecisionRecord(resolved.record)
    const hydrated = hydrateExpiringDecisionRecord(serialized)
    expect(hydrated).toEqual(resolved.record)
    expect(hydrated?.expiresAt).toBe(20)
    expect(hydrated?.lifecycleState).toBe('default_resolved')
    expect(hydrated?.timeoutResolvedOnce).toBe(true)
  })

  it('does not re-invoke fallback when reloading an already default-resolved decision', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-replay',
      createdAt: 1,
      expiresAt: 2,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 2,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return

    const reloaded = hydrateExpiringDecisionRecord(
      serializeExpiringDecisionRecord(timed.record)
    )
    expect(reloaded).toBeDefined()
    if (reloaded === undefined) return

    const replay = resolveTimeoutIfDue(reloaded, {
      clockDomain: 'authoritative_week',
      now: 99,
    })
    expect(replay.ok).toBe(false)
    expect(replay.reason).toBe('already_timeout_resolved')
    expect(replay.effect).toBeUndefined()
  })

  it('does not let UI option ordering affect fallback selection', () => {
    const natural = createOperationalRecommendationDecision({
      id: 'dec:rec-order-a',
      createdAt: 0,
      expiresAt: 5,
      uiPresentationOrder: ['adopt_recommendation', 'reject_recommendation', 'hold_recommendation'],
    })
    const reversed = createOperationalRecommendationDecision({
      id: 'dec:rec-order-b',
      createdAt: 0,
      expiresAt: 5,
      uiPresentationOrder: ['hold_recommendation', 'reject_recommendation', 'adopt_recommendation'],
    })
    expect(natural.ok && reversed.ok).toBe(true)
    if (!natural.ok || !reversed.ok) return

    const a = resolveTimeoutIfDue(natural.record, {
      clockDomain: 'authoritative_tick',
      now: 5,
    })
    const b = resolveTimeoutIfDue(reversed.record, {
      clockDomain: 'authoritative_tick',
      now: 5,
    })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.effect?.defaultOptionId).toBe('adopt_recommendation')
    expect(b.effect?.defaultOptionId).toBe('adopt_recommendation')
    expect(a.record.selectedOptionId).toBe(b.record.selectedOptionId)
  })

  it('supports expire_without_action no-action fallback for correspondence', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-no-action',
      createdAt: 1,
      expiresAt: 3,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.record.defaultResolution.contract).toBe('expire_without_action')
    expect(created.record.defaultResolution.actionRouteOwner).toBe('none')

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 3,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return
    expect(timed.record.lifecycleState).toBe('expired')
    expect(timed.effect?.actionRouteOwner).toBe('none')
    expect(isReplyActionAvailable(timed.record)).toBe(false)
  })

  it('routes a real-action timeout into SPE-1127 rather than mutating world state', () => {
    const created = createOperationalRecommendationDecision({
      id: 'dec:rec-route',
      createdAt: 0,
      expiresAt: 1,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_tick',
      now: 1,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return
    expect(timed.effect?.actionRouteOwner).toBe('SPE-1127')
    expect(timed.effect?.actionRouteRef).toBe('vetoable:recommendation-default-adopt')
    // Lifecycle emits route stub only — no world-state mutation fields on the record.
    expect('worldState' in timed.record).toBe(false)
  })

  it('routes phase-local held-response timeout through SPE-62, not a parallel registry', () => {
    const created = createPhaseHeldResponseDecision({
      id: 'dec:phase-hold',
      createdAt: 0,
      expiresAt: 2,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.record.clockDomain).toBe('phase_local')
    expect(created.record.producerDomain).toBe('phase_held_response')

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'phase_local',
      now: 2,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return
    expect(timed.effect?.actionRouteOwner).toBe('SPE-62')
    expect(timed.effect?.actionRouteRef).toBe('phase:held-response-timeout')
  })

  it('records async delivery failure timeout without classifying as explicit refusal', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-async',
      createdAt: 1,
      expiresAt: 4,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 4,
      causedByAsyncDeliveryFailure: true,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return
    expect(timed.record.resolutionProvenance).toBe('async_delivery_timeout')
    expect(timed.record.resolutionProvenance).not.toBe('explicit_refusal')

    const dutyProvenance = projectTerminalProvenanceForDuty(timed.record)
    expect(dutyProvenance.kind).toBe('expired')
    expect(dutyProvenance.kind).not.toBe('explicit_refusal')

    const omission = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance: dutyProvenance,
      actObserved: false,
    })
    expect(omission.result).toBe('no_omission_terminal_window')
  })

  it('exposes presentation semantics for expiry, default, and terminal provenance', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-ui',
      createdAt: 1,
      expiresAt: 6,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const openView = projectExpiringDecisionPresentation(created.record)
    expect(openView.expiresAt).toBe(6)
    expect(openView.defaultOutcomeSummary.length).toBeGreaterThan(0)
    expect(openView.replyActionAvailable).toBe(true)
    expect(openView.resolutionWasExplicit).toBeNull()

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 6,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return
    const closedView = projectExpiringDecisionPresentation(timed.record)
    expect(closedView.resolutionWasTimeout).toBe(true)
    expect(closedView.resolutionWasExplicit).toBe(false)
    expect(closedView.replyActionAvailable).toBe(false)
  })

  it('lets a correspondence-domain obligation consumer see terminal non-actionable reply', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-obligation',
      createdAt: 1,
      expiresAt: 2,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    expect(isReplyActionAvailable(created.record)).toBe(true)
    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 2,
    })
    expect(timed.ok).toBe(true)
    if (!timed.ok) return
    expect(isReplyActionAvailable(timed.record)).toBe(false)

    const provenance = projectTerminalProvenanceForDuty(timed.record)
    expect(provenance.kind).toBe('expired')
    const omission = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance,
      actObserved: false,
    })
    expect(omission.result).toBe('no_omission_terminal_window')
  })

  it('repairs a historically misclassified expired correspondence exactly once', () => {
    const legacyRaw = {
      schemaVersion: EXPIRING_DECISION_LIFECYCLE_SCHEMA_VERSION,
      id: 'dec:corr-legacy-repair',
      producerDomain: 'correspondence_window',
      createdAt: 1,
      clockDomain: 'authoritative_week',
      expiresAt: 3,
      options: [
        { optionId: 'reply_acknowledge', label: 'Acknowledge', kind: 'accept' },
        { optionId: 'reply_decline', label: 'Decline', kind: 'decline' },
      ],
      defaultResolution: {
        contract: 'expire_without_action',
        actionRouteOwner: 'none',
      },
      lifecycleState: 'explicitly_resolved',
      resolutionProvenance: 'explicit_refusal',
      resolvedAt: 3,
      timeoutResolvedOnce: false,
      legacyMisclassifiedExpiredAsRefusal: true,
    }

    const repaired = hydrateExpiringDecisionRecord(legacyRaw)
    expect(repaired).toBeDefined()
    if (repaired === undefined) return
    expect(repaired.lifecycleState).toBe('expired')
    expect(repaired.resolutionProvenance).toBe('timeout_default')
    expect(repaired.timeoutResolvedOnce).toBe(true)
    expect(repaired.hydrationRepairApplied).toBe(EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION)
    expect(repaired.selectedOptionId).toBeUndefined()
    expect(isReplyActionAvailable(repaired)).toBe(false)

    const second = hydrateExpiringDecisionRecord(serializeExpiringDecisionRecord(repaired))
    expect(second).toEqual(repaired)
    expect(second?.hydrationRepairApplied).toBe(EXPIRING_DECISION_CORRESPONDENCE_REPAIR_VERSION)

    const again = applyCorrespondenceMisclassificationRepair(repaired)
    expect(again).toEqual(repaired)
  })

  it('does not repair a legitimate explicit refusal', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-real-refusal',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const refused = refuseExplicitly(created.record, { at: 2 })
    expect(refused.ok).toBe(true)
    if (!refused.ok) return
    expect(refused.record.resolutionProvenance).toBe('explicit_refusal')

    const hydrated = hydrateExpiringDecisionRecord(
      serializeExpiringDecisionRecord(refused.record)
    )
    expect(hydrated?.resolutionProvenance).toBe('explicit_refusal')
    expect(hydrated?.lifecycleState).toBe('explicitly_resolved')
    expect(hydrated?.hydrationRepairApplied).toBeUndefined()

    const provenance = projectTerminalProvenanceForDuty(hydrated!)
    expect(provenance.kind).toBe('explicit_refusal')
  })

  it('hydrates absent records to no decision and rejects malformed input', () => {
    expect(hydrateExpiringDecisionRecord(undefined)).toBeUndefined()
    expect(hydrateExpiringDecisionRecord(null)).toBeUndefined()
    expect(hydrateExpiringDecisionRecord({})).toBeUndefined()
    expect(
      hydrateExpiringDecisionRecord({
        schemaVersion: 'wrong',
        id: 'x',
      })
    ).toBeUndefined()
  })

  it('rejects create when named_domain_action lacks declared default option', () => {
    const bad = createExpiringDecision({
      id: 'dec:bad',
      producerDomain: 'operational_recommendation',
      createdAt: 0,
      clockDomain: 'authoritative_tick',
      expiresAt: 1,
      options: [{ optionId: 'a', label: 'A', kind: 'accept' }],
      defaultResolution: {
        contract: 'named_domain_action',
        actionRouteOwner: 'SPE-1127',
        actionRouteRef: 'x',
      },
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.reason).toBe('invalid_default_contract')
  })

  it('rejects hydrate of open + timeoutResolvedOnce and does not re-fire timeout', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-inconsistent',
      createdAt: 1,
      expiresAt: 2,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const inconsistentRaw = {
      ...serializeExpiringDecisionRecord(created.record),
      lifecycleState: 'open',
      timeoutResolvedOnce: true,
    }
    expect(hydrateExpiringDecisionRecord(inconsistentRaw)).toBeUndefined()

    // Runtime guard: even a bypassed inconsistent record must not re-invoke default.
    const bypassed = {
      ...created.record,
      timeoutResolvedOnce: true,
    } as ExpiringDecisionRecord
    const replay = resolveTimeoutIfDue(bypassed, {
      clockDomain: 'authoritative_week',
      now: 2,
    })
    expect(replay.ok).toBe(false)
    expect(replay.reason).toBe('already_timeout_resolved')
    expect(replay.effect).toBeUndefined()
  })

  it('projects closed explicit selection as non-actionable for duty omission', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-explicit-duty',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const explicit = resolveExplicitly(created.record, {
      optionId: 'reply_acknowledge',
      at: 2,
    })
    expect(explicit.ok).toBe(true)
    if (!explicit.ok) return

    const provenance = projectTerminalProvenanceForDuty(explicit.record)
    expect(provenance.kind).toBe('expired')
    expect(provenance.terminalReason).toBe('explicit_selection_closed')
    const omission = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance,
      actObserved: false,
    })
    expect(omission.result).toBe('no_omission_terminal_window')
  })

  it('cancels an open decision with distinguishable provenance and rejects late response', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-cancel',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const canceled = cancelDecision(created.record, {
      at: 2,
      canceledByRef: 'admin:revoke',
    })
    expect(canceled.ok).toBe(true)
    if (!canceled.ok) return
    expect(canceled.record.lifecycleState).toBe('canceled')
    expect(canceled.record.resolutionProvenance).toBe('canceled')
    expect(canceled.record.canceledByRef).toBe('admin:revoke')

    const late = attemptLateResponse(canceled.record, {
      optionId: 'reply_acknowledge',
      at: 3,
    })
    expect(late.ok).toBe(false)
    expect(late.reason).toBe('terminal')

    const provenance = projectTerminalProvenanceForDuty(canceled.record)
    expect(provenance.kind).toBe('canceled')
    const omission = evaluateOmissionAgainstDuty({
      obligation: FIELD_LEAD_CONTAINMENT_ESCALATION_OBLIGATION,
      provenance,
      actObserved: false,
    })
    expect(omission.result).toBe('no_omission_terminal_window')
  })

  it('rejects explicit replies at or after expiresAt before the timeout sweep', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-past-expiry',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const lateExplicit = resolveExplicitly(created.record, {
      optionId: 'reply_acknowledge',
      at: 5,
    })
    expect(lateExplicit.ok).toBe(false)
    if (lateExplicit.ok) return
    expect(lateExplicit.reason).toBe('past_expiry')

    const lateRefuse = refuseExplicitly(created.record, { at: 6 })
    expect(lateRefuse.ok).toBe(false)
    if (lateRefuse.ok) return
    expect(lateRefuse.reason).toBe('past_expiry')

    const lateAttempt = attemptLateResponse(created.record, {
      optionId: 'reply_acknowledge',
      at: 7,
    })
    expect(lateAttempt.ok).toBe(false)
    if (lateAttempt.ok) return
    expect(lateAttempt.reason).toBe('past_expiry')

    const timed = resolveTimeoutIfDue(created.record, {
      clockDomain: 'authoritative_week',
      now: 5,
    })
    expect(timed.ok).toBe(true)
  })

  it('rejects deadline shifts at or after the current expiry', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-late-shift',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const lateShift = shiftDeadline(created.record, {
      at: 5,
      newExpiresAt: 10,
      clockDomain: 'authoritative_week',
    })
    expect(lateShift.ok).toBe(false)
    if (lateShift.ok) return
    expect(lateShift.reason).toBe('past_expiry')
  })

  it('rejects whitespace-only optional actionRouteRef on create', () => {
    const bad = createExpiringDecision({
      id: 'dec:empty-route-ref',
      producerDomain: 'correspondence_window',
      createdAt: 0,
      clockDomain: 'authoritative_week',
      expiresAt: 1,
      options: [{ optionId: 'reply', label: 'Reply', kind: 'accept' }],
      defaultResolution: {
        contract: 'expire_without_action',
        actionRouteOwner: 'none',
        actionRouteRef: '   ',
      },
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.reason).toBe('malformed')
  })

  it('rejects option IDs that collide only after trim', () => {
    const bad = createExpiringDecision({
      id: 'dec:trim-dup',
      producerDomain: 'correspondence_window',
      createdAt: 0,
      clockDomain: 'authoritative_week',
      expiresAt: 1,
      options: [
        { optionId: 'reply', label: 'A', kind: 'accept' },
        { optionId: ' reply ', label: 'B', kind: 'decline' },
      ],
      defaultResolution: {
        contract: 'expire_without_action',
        actionRouteOwner: 'none',
      },
    })
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.reason).toBe('malformed')
  })

  it('supersedes an open decision with distinguishable provenance and rejects late response', () => {
    const created = createCorrespondenceWindowDecision({
      id: 'dec:corr-supersede',
      createdAt: 1,
      expiresAt: 5,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return

    const superseded = supersedeDecision(created.record, {
      at: 2,
      supersededByDecisionId: 'dec:corr-replacement',
    })
    expect(superseded.ok).toBe(true)
    if (!superseded.ok) return
    expect(superseded.record.lifecycleState).toBe('superseded')
    expect(superseded.record.resolutionProvenance).toBe('superseded')
    expect(superseded.record.supersededByDecisionId).toBe('dec:corr-replacement')

    const late = attemptLateResponse(superseded.record, {
      optionId: 'reply_acknowledge',
      at: 3,
    })
    expect(late.ok).toBe(false)
    expect(late.reason).toBe('terminal')

    const provenance = projectTerminalProvenanceForDuty(superseded.record)
    expect(provenance.kind).toBe('superseded')
  })
})
