/**
 * SPE-911 — stakeholder notification matrix and escalation thresholds (pure, caller-owned).
 *
 * Selects configured stakeholder sets, channels, and escalation paths from an incident
 * profile. Does not compose messages, mutate communication state, or own legitimacy policy.
 */

import { assertNonEmptyId } from './assertBoundedInteger'

export const STAKEHOLDER_NOTIFICATION_OWNER = 'SPE-911' as const

export type StakeholderClass =
  | 'owners'
  | 'leadership'
  | 'legal'
  | 'hr'
  | 'public_communications'
  | 'external_partners'
  | 'local_authorities'
  | 'centralized_oversight'

export type NotificationChannel =
  | 'direct_call'
  | 'structured_report'
  | 'out_of_band_alert'
  | 'public_statement'
  | 'silent_internal_log'

export type SensitivityBranch = 'public' | 'restricted' | 'classified'

export interface IncidentNotificationProfile {
  readonly incidentId: string
  readonly impactCategory: 'low' | 'medium' | 'high' | 'critical'
  readonly sensitivity: SensitivityBranch
  readonly hasFormalPartner: boolean
  readonly acknowledgementMinutes?: number
}

export interface NotificationDuty {
  readonly stakeholder: StakeholderClass
  readonly channel: NotificationChannel
  readonly escalates: boolean
  readonly reason: string
}

export interface NotificationMatrixOutcome {
  readonly incidentId: string
  readonly duties: readonly NotificationDuty[]
  readonly owner: typeof STAKEHOLDER_NOTIFICATION_OWNER
}

const BASE_LEADERSHIP: NotificationDuty = Object.freeze({
  stakeholder: 'leadership',
  channel: 'structured_report',
  escalates: false,
  reason: 'standard leadership notification',
})

/** Resolve one notification matrix proposal without mutating communication or legitimacy state. */
export function resolveStakeholderNotifications(
  input: IncidentNotificationProfile
): NotificationMatrixOutcome {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('incident notification profile is required')
  }
  const incidentId = assertNonEmptyId(input.incidentId, 'incidentId')
  const duties: NotificationDuty[] = [BASE_LEADERSHIP]

  if (input.impactCategory === 'high' || input.impactCategory === 'critical') {
    duties.push(
      Object.freeze({
        stakeholder: 'local_authorities',
        channel: 'out_of_band_alert',
        escalates: false,
        reason: 'high/critical impact threshold',
      })
    )
  }

  if (input.sensitivity === 'classified') {
    duties.push(
      Object.freeze({
        stakeholder: 'centralized_oversight',
        channel: 'silent_internal_log',
        escalates: false,
        reason: 'classified sensitivity branch',
      })
    )
  } else if (input.sensitivity === 'restricted') {
    duties.push(
      Object.freeze({
        stakeholder: 'legal',
        channel: 'direct_call',
        escalates: false,
        reason: 'restricted sensitivity branch',
      })
    )
  }

  if (input.hasFormalPartner) {
    duties.push(
      Object.freeze({
        stakeholder: 'external_partners',
        channel: 'structured_report',
        escalates: false,
        reason: 'formal partner status',
      })
    )
  }

  const ack = input.acknowledgementMinutes
  if (typeof ack === 'number' && ack > 30) {
    duties.push(
      Object.freeze({
        stakeholder: 'leadership',
        channel: 'direct_call',
        escalates: true,
        reason: 'acknowledgement timeout escalation',
      })
    )
  }

  return Object.freeze({
    incidentId,
    duties: Object.freeze(duties),
    owner: STAKEHOLDER_NOTIFICATION_OWNER,
  })
}
