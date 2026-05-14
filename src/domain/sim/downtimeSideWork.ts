import type { Agent } from '../agent/models'
import { SIDE_WORK_CALIBRATION } from './calibration'

/** Bounded risky downtime jobs (SPE-1700 courier + SPE-1702 trusted relay). */
export type DowntimeSideWorkOptionId = 'offBooksCourier' | 'trustedCourier'

/**
 * Courier lockout marker. First SPE-1700 slice: no automatic decay or redemption here; clearing
 * is explicit follow-up work outside this slice.
 */
export const OFF_BOOKS_COURIER_LOCKOUT_TAG = 'side-work-lockout:off-books-courier' as const

/**
 * SPE-1702: compact prerequisite — at least one successful paid off-books courier payout.
 * Stamped when that outcome resolves; unlocks the higher-tier trusted relay menu pick.
 */
export const OFF_BOOKS_COURIER_PAID_PREREQ_TAG = 'side-work-prereq:off-books-courier-paid' as const

export interface OffBooksCourierResolution {
  fundingDelta: number
  fatigueDelta: number
  applyExposureResidue: boolean
  applyLockoutTag: boolean
}

export type TrustedCourierResolution = OffBooksCourierResolution

export function isInactiveSideWorkResolution(r: OffBooksCourierResolution): boolean {
  return (
    r.fundingDelta === 0 &&
    r.fatigueDelta === 0 &&
    !r.applyExposureResidue &&
    !r.applyLockoutTag
  )
}

/**
 * Deterministic off-books courier: pays modest funding when the operative is not already
 * exhausted; otherwise burns the contact (lockout) with extra fatigue and no payout.
 */
export function resolveOffBooksCourierSideWork(agent: Agent): OffBooksCourierResolution {
  if (agent.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)) {
    return {
      fundingDelta: 0,
      fatigueDelta: 0,
      applyExposureResidue: false,
      applyLockoutTag: false,
    }
  }
  if (agent.fatigue >= SIDE_WORK_CALIBRATION.offBooksCourierHighFatigueThreshold) {
    return {
      fundingDelta: 0,
      fatigueDelta: SIDE_WORK_CALIBRATION.offBooksCourierLockoutFatigueDelta,
      applyExposureResidue: false,
      applyLockoutTag: true,
    }
  }
  return {
    fundingDelta: SIDE_WORK_CALIBRATION.offBooksCourierSuccessFundingDelta,
    fatigueDelta: SIDE_WORK_CALIBRATION.offBooksCourierSuccessFatigueDelta,
    applyExposureResidue: true,
    applyLockoutTag: false,
  }
}

/**
 * SPE-1702: higher-tier relay — requires prior paid courier contact; stricter fatigue gate and
 * larger bounded payout / strain. Shares the same lockout tag as the base courier when the
 * high-fatigue branch fires.
 */
export function resolveTrustedCourierSideWork(agent: Agent): TrustedCourierResolution {
  if (agent.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)) {
    return {
      fundingDelta: 0,
      fatigueDelta: 0,
      applyExposureResidue: false,
      applyLockoutTag: false,
    }
  }
  if (!agent.tags.includes(OFF_BOOKS_COURIER_PAID_PREREQ_TAG)) {
    return {
      fundingDelta: 0,
      fatigueDelta: 0,
      applyExposureResidue: false,
      applyLockoutTag: false,
    }
  }
  if (agent.fatigue >= SIDE_WORK_CALIBRATION.trustedCourierHighFatigueThreshold) {
    return {
      fundingDelta: 0,
      fatigueDelta: SIDE_WORK_CALIBRATION.trustedCourierLockoutFatigueDelta,
      applyExposureResidue: false,
      applyLockoutTag: true,
    }
  }
  return {
    fundingDelta: SIDE_WORK_CALIBRATION.trustedCourierSuccessFundingDelta,
    fatigueDelta: SIDE_WORK_CALIBRATION.trustedCourierSuccessFatigueDelta,
    applyExposureResidue: true,
    applyLockoutTag: false,
  }
}

export function canSelectOffBooksCourierSideWork(agent: Agent): boolean {
  return !agent.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)
}

export function canSelectTrustedCourierSideWork(agent: Agent): boolean {
  return (
    canSelectOffBooksCourierSideWork(agent) && agent.tags.includes(OFF_BOOKS_COURIER_PAID_PREREQ_TAG)
  )
}

export type TrustedCourierPrimaryBlockerCode = 'courier_lockout' | 'missing_paid_courier'

export function getTrustedCourierPrimaryBlocker(agent: Agent): TrustedCourierPrimaryBlockerCode | null {
  if (agent.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)) return 'courier_lockout'
  if (!agent.tags.includes(OFF_BOOKS_COURIER_PAID_PREREQ_TAG)) return 'missing_paid_courier'
  return null
}

export function trustedCourierPrimaryBlockerLabel(code: TrustedCourierPrimaryBlockerCode): string {
  switch (code) {
    case 'courier_lockout':
      return 'Off-books courier contact burned — risky side-work unavailable.'
    case 'missing_paid_courier':
      return 'Requires a successful paid off-books courier run first.'
  }
}
