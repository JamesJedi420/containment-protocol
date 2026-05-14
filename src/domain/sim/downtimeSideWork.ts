import type { Agent } from '../agent/models'
import { SIDE_WORK_CALIBRATION } from './calibration'

/** Single bounded risky downtime job for SPE-1700 slice 1. */
export type DowntimeSideWorkOptionId = 'offBooksCourier'

/**
 * Courier lockout marker. First SPE-1700 slice: no automatic decay or redemption here; clearing
 * is explicit follow-up work outside this slice.
 */
export const OFF_BOOKS_COURIER_LOCKOUT_TAG = 'side-work-lockout:off-books-courier' as const

export interface OffBooksCourierResolution {
  fundingDelta: number
  fatigueDelta: number
  applyExposureResidue: boolean
  applyLockoutTag: boolean
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

export function canSelectOffBooksCourierSideWork(agent: Agent): boolean {
  return !agent.tags.includes(OFF_BOOKS_COURIER_LOCKOUT_TAG)
}
