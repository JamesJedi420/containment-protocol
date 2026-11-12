import { describe, expect, it } from 'vitest'
import {
  resolveCaptureSecureOutcome,
  toCaptureSecureEvidence,
} from '../domain/captureSecureOutcome'
import { confirmCaptureSecure } from '../domain/breachOriginRecovery'
import {
  advanceBreachRecoveryToLocated,
  createBreachEscapeRespondFixture,
} from './helpers/breachOriginRecoveryFixtures'

describe('SPE-104 capture-secure outcome producer', () => {
  it('resolves secured success with stable outcomeId', () => {
    const first = resolveCaptureSecureOutcome({
      attemptId: ' attempt-1 ',
      subjectRef: ' subject:anomaly-a ',
      controlCommitted: true,
      restraintCompatible: true,
    })
    const second = resolveCaptureSecureOutcome({
      attemptId: 'attempt-1',
      subjectRef: 'subject:anomaly-a',
      controlCommitted: true,
      restraintCompatible: true,
    })
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(first.outcome.secured).toBe(true)
    expect(first.outcome.reasonCodes).toEqual(['capture_secured'])
    expect(first.outcome.outcomeId).toBe('capture:attempt-1')
    expect(first.outcome.outcomeId).toBe(second.outcome.outcomeId)
    expect(first.outcome.secured).toBe(second.outcome.secured)
    expect(toCaptureSecureEvidence(first.outcome)).toEqual({
      producerOwner: 'SPE-104',
      outcomeId: 'capture:attempt-1',
      subjectRef: 'subject:anomaly-a',
      secured: true,
    })
  })

  it('rejects malformed attempts without evidence', () => {
    expect(resolveCaptureSecureOutcome(null).ok).toBe(false)
    expect(
      resolveCaptureSecureOutcome({
        attemptId: '',
        subjectRef: 'subject:anomaly-a',
        controlCommitted: true,
        restraintCompatible: true,
      }).ok
    ).toBe(false)
    expect(
      resolveCaptureSecureOutcome({
        attemptId: 'attempt-2',
        subjectRef: '   ',
        controlCommitted: true,
        restraintCompatible: true,
      }).ok
    ).toBe(false)
  })

  it('fails closed for category mismatch, incompatible restraint, uncommitted control, and broken restraint', () => {
    const mismatch = resolveCaptureSecureOutcome({
      attemptId: 'attempt-mismatch',
      subjectRef: 'subject:anomaly-a',
      controlCommitted: true,
      restraintCompatible: true,
      categoryMismatch: true,
    })
    expect(mismatch.ok).toBe(true)
    if (!mismatch.ok) return
    expect(mismatch.outcome.secured).toBe(false)
    expect(mismatch.outcome.reasonCodes).toEqual(['category_mismatch'])

    const incompatibleClaim = resolveCaptureSecureOutcome({
      attemptId: 'attempt-incompatible-claim',
      subjectRef: 'subject:anomaly-a',
      controlCommitted: true,
      restraintCompatible: false,
    })
    expect(incompatibleClaim.ok).toBe(true)
    if (!incompatibleClaim.ok) return
    expect(incompatibleClaim.outcome.secured).toBe(false)
    expect(incompatibleClaim.outcome.reasonCodes).toEqual(['restraint_incompatible'])

    const incompatible = resolveCaptureSecureOutcome({
      attemptId: 'attempt-incompatible',
      subjectRef: 'subject:anomaly-a',
      controlCommitted: true,
      restraintCompatible: true,
      subjectActor: { physicality: 'nonphysical' },
    })
    expect(incompatible.ok).toBe(true)
    if (!incompatible.ok) return
    expect(incompatible.outcome.secured).toBe(false)
    expect(incompatible.outcome.reasonCodes).toEqual(['restraint_incompatible'])

    const noControl = resolveCaptureSecureOutcome({
      attemptId: 'attempt-no-control',
      subjectRef: 'subject:anomaly-a',
      controlCommitted: false,
      restraintCompatible: true,
    })
    expect(noControl.ok).toBe(true)
    if (!noControl.ok) return
    expect(noControl.outcome.secured).toBe(false)
    expect(noControl.outcome.reasonCodes).toEqual(['control_not_committed'])

    const broken = resolveCaptureSecureOutcome({
      attemptId: 'attempt-broken',
      subjectRef: 'subject:anomaly-a',
      controlCommitted: true,
      restraintCompatible: true,
      escapeBrokeRestraint: true,
    })
    expect(broken.ok).toBe(true)
    if (!broken.ok) return
    expect(broken.outcome.secured).toBe(false)
    expect(broken.outcome.reasonCodes).toEqual(['restraint_broken'])
  })

  it('feeds real producer evidence into SPE-3735 confirmCaptureSecure without completing recovery', () => {
    const captureFixture = createBreachEscapeRespondFixture({
      registryId: 'reg-escaped-1',
      caseId: 'case:escape-1',
    })
    const located = advanceBreachRecoveryToLocated('rec-capture-seam-ok', captureFixture)
    const resolved = resolveCaptureSecureOutcome({
      attemptId: 'attempt-recovery-ok',
      subjectRef: located.subjectRef,
      controlCommitted: true,
      restraintCompatible: true,
      subjectActor: {
        physicality: 'physical',
        capabilities: { canRestrain: true },
      },
    })
    expect(resolved.ok).toBe(true)
    if (!resolved.ok) return

    const secured = confirmCaptureSecure(located, {
      operationKey: 'op-capture-from-producer',
      week: 6,
      captureEvidence: toCaptureSecureEvidence(resolved.outcome),
    })
    expect(secured.ok).toBe(true)
    expect(secured.recovery?.stage).toBe('capture_secured')
    expect(secured.recovery?.captureOutcomeId).toBe('capture:attempt-recovery-ok')
    expect(secured.recovery?.stage).not.toBe('completed')

    const failedResolve = resolveCaptureSecureOutcome({
      attemptId: 'attempt-recovery-fail',
      subjectRef: located.subjectRef,
      controlCommitted: true,
      restraintCompatible: false,
    })
    expect(failedResolve.ok).toBe(true)
    if (!failedResolve.ok) return

    const locatedFail = advanceBreachRecoveryToLocated(
      'rec-capture-seam-fail',
      createBreachEscapeRespondFixture({
        registryId: 'reg-escaped-fail',
        caseId: 'case:escape-fail',
      })
    )
    const failed = confirmCaptureSecure(locatedFail, {
      operationKey: 'op-capture-from-producer-fail',
      week: 6,
      captureEvidence: toCaptureSecureEvidence(failedResolve.outcome),
    })
    expect(failed.ok).toBe(false)
    expect(failed.recovery?.stage).toBe('capture_failed')
    expect(failed.recovery?.terminalOutcomeReported).toBe(true)
    expect(failed.recovery?.stage).not.toBe('completed')
  })
})
