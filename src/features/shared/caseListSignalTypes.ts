/** Shared case-row data contract; calculations remain in the cases feature. */
export interface MissionTriageCovertPrepMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageCovertPrepSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageCovertPrepMarker[]
  readonly deferralNote?: string
}

export interface MissionTriageIntakeSignalMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageIntakeSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageIntakeSignalMarker[]
}

export interface MissionTriageModalitySignalMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageModalitySignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageModalitySignalMarker[]
}

export interface MissionTriageCloseoutRewardPayoutSignalMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageCloseoutRewardPayoutSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageCloseoutRewardPayoutSignalMarker[]
}

export type MissionTriageDeferralCompareTone = 'low' | 'medium' | 'high'

export interface MissionTriageDeferralCompareColumn {
  readonly id: 'covertPrepCost' | 'deferralRisk' | 'escalationCarryover'
  readonly label: string
  readonly value: string
  readonly detail?: string
  readonly tone: MissionTriageDeferralCompareTone
}

export interface MissionTriageDeferralCompareCarryoverLink {
  readonly label: string
  readonly detail: string
}

export interface MissionTriageDeferralCompareView {
  readonly visible: boolean
  readonly columns: readonly MissionTriageDeferralCompareColumn[]
  readonly carryoverLink?: MissionTriageDeferralCompareCarryoverLink
}
