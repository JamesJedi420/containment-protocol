import { describe, expect, it } from 'vitest'
import type { ReportNoteType } from '../domain/models'

/**
 * SPE-216 audit registry: active producers confirmed; no stale types removed.
 * Future UI follow-up tracked for hub/support report surfacing (Linear draft).
 */
export const REPORT_NOTE_TYPE_AUDIT = {
  'case.resolved': {
    status: 'active',
    producer: 'advanceWeek/eventDraftPipeline',
    category: 'incident_response',
  },
  'case.partially_resolved': {
    status: 'active',
    producer: 'advanceWeek/eventDraftPipeline',
    category: 'incident_response',
  },
  'case.failed': {
    status: 'active',
    producer: 'advanceWeek/eventDraftPipeline',
    category: 'incident_response',
  },
  'case.escalated': {
    status: 'active',
    producer: 'advanceWeek/eventDraftPipeline',
    category: 'incident_response',
  },
  'case.spawned': {
    status: 'active',
    producer: 'advanceWeek/eventDraftPipeline',
    category: 'incident_response',
  },
  'case.raid_converted': {
    status: 'active',
    producer: 'advanceWeek/eventDraftPipeline',
    category: 'incident_response',
  },
  'case.aggregate_battle': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'incident_response',
  },
  'agent.training_completed': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'production.queue_completed': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'market.shifted': { status: 'active', producer: 'advanceWeek/market', category: 'system' },
  'market.transaction_recorded': { status: 'active', producer: 'market', category: 'system' },
  'faction.standing_changed': {
    status: 'active',
    producer: 'advanceWeek/factions',
    category: 'system',
  },
  'faction.unlock_available': {
    status: 'active',
    producer: 'advanceWeek/factions',
    category: 'system',
  },
  'agency.containment_updated': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'system.week_delta': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'system.recruitment_expired': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'recruitment',
  },
  'system.recruitment_generated': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'recruitment',
  },
  'recruitment.scouting_initiated': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'recruitment',
  },
  'recruitment.scouting_refined': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'recruitment',
  },
  'recruitment.intel_confirmed': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'recruitment',
  },
  'system.party_cards_drawn': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'system.escalation_consequence': {
    status: 'active',
    producer: 'reportNotes',
    category: 'system',
  },
  'system.proxy_conflict': { status: 'active', producer: 'reportNotes', category: 'system' },
  'system.protocol_contact': { status: 'active', producer: 'reportNotes', category: 'system' },
  'system.anchor_instability': { status: 'active', producer: 'reportNotes', category: 'system' },
  'directive.applied': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'support.shortfall': {
    status: 'active',
    producer: 'advanceWeek/reportNotes.support',
    category: 'system',
  },
  'infiltration.awareness_complication': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'system',
  },
  'infiltration.escalation_exposed': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'system',
  },
  'infiltration.escalation_violent': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'system',
  },
  'infiltration.cover_strain': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'infiltration.weekly_encounter': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'system',
  },
  'infiltration.leave_behind_tradeoff': {
    status: 'active',
    producer: 'advanceWeek',
    category: 'system',
  },
  'concealment.activated': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'support.restored': {
    status: 'active',
    producer: 'supportActions + pendingReportNotes/advanceWeek',
    category: 'system',
  },
  'hub.opportunity': { status: 'active', producer: 'hubReportNotes', category: 'system' },
  'hub.rumor': { status: 'active', producer: 'hubReportNotes', category: 'system' },
  'system.equipment_recovered': { status: 'active', producer: 'advanceWeek', category: 'system' },
  'information_intake.verification': {
    status: 'active',
    producer: 'informationIntakeWeeklyReportNotes',
    category: 'information_intake',
  },
  'information_intake.naming_hazard_cross_link': {
    status: 'active',
    producer: 'informationIntakeNamingHazardCrossLinkWeeklyReportNotes',
    category: 'information_intake',
  },
  'information_intake.extranormal_cross_link': {
    status: 'active',
    producer: 'informationIntakeExtranormalCrossLinkWeeklyReportNotes',
    category: 'information_intake',
  },
  'information_intake.minor_anomaly_cross_link': {
    status: 'active',
    producer: 'informationIntakeMinorAnomalyCrossLinkWeeklyReportNotes',
    category: 'information_intake',
  },
  'information_intake.unexplained_location_cross_link': {
    status: 'active',
    producer: 'informationIntakeUnexplainedLocationCrossLinkWeeklyReportNotes',
    category: 'information_intake',
  },
  'welfare_debt.accounting_cross_link': {
    status: 'active',
    producer: 'welfareDebtAccountingCrossLinkWeeklyReportNotes',
    category: 'system',
  },
  'coercive_protocol.integrated_health_reconciliation': {
    status: 'active',
    producer: 'coerciveProtocolIntegratedHealthCrossReconciliationWeeklyReportNotes',
    category: 'system',
  },
  'post_incident_review.follow_on': {
    status: 'active',
    producer: 'postIncidentReviewFollowOnWeeklyReportNotes',
    category: 'post_incident_review',
  },
  'post_incident_review.closeout_reward_payout': {
    status: 'active',
    producer: 'postIncidentReviewCloseoutRewardPayoutSurfacing',
    category: 'post_incident_review',
  },
  'public_disclosure.trust_outcome': {
    status: 'active',
    producer: 'publicDisclosureTrustOutcomeWeeklyReportNotes',
    category: 'system',
  },
  'public_disclosure.segment_trust_divergence': {
    status: 'active',
    producer: 'publicDisclosureSegmentedTrustOutcomeWeeklyReportNotes',
    category: 'system',
  },
  'cognitive_hazard.simulation_trigger': {
    status: 'active',
    producer: 'cognitiveHazardSimulationTriggerWeeklyReportNotes',
    category: 'system',
  },
  'contribution_release.publish_queue_execution': {
    status: 'active',
    producer: 'publishQueueWeeklyReportNotes',
    category: 'system',
  },
  'contribution_release.modifiable_data_pack_governance': {
    status: 'active',
    producer: 'modifiableDataPackWeeklyReportNotes',
    category: 'system',
  },
  'contribution_release.modifiable_data_pack_publish_enqueue': {
    status: 'active',
    producer: 'modifiableDataPackPublishQueueEnqueueWeeklyReportNotes',
    category: 'system',
  },
  'visual_trigger_hazard.weekly_transition': {
    status: 'active',
    producer: 'visualTriggerHazardWeeklyReportNotes',
    category: 'system',
  },
  'entity_welfare_reclassification.weekly_transition': {
    status: 'active',
    producer: 'entityWelfareReclassificationWeeklyReportNotes',
    category: 'system',
  },
  'affiliation_person_status.weekly_progression': {
    status: 'active',
    producer: 'affiliationPersonStatusWeeklyReportNotes',
    category: 'system',
  },
  'pattern_source_series.weekly_transition': {
    status: 'active',
    producer: 'patternSourceSeriesWeeklyReportNotes',
    category: 'system',
  },
} as const satisfies Record<
  ReportNoteType,
  { status: 'active' | 'future-reserved' | 'stale'; producer: string; category: string }
>

describe('ReportNoteType audit (SPE-216)', () => {
  it('covers every ReportNoteType union member as active', () => {
    const entries = Object.entries(REPORT_NOTE_TYPE_AUDIT) as Array<
      [ReportNoteType, (typeof REPORT_NOTE_TYPE_AUDIT)[ReportNoteType]]
    >

    expect(entries).toHaveLength(57)
    expect(entries.every(([, audit]) => audit.status === 'active')).toBe(true)
  })
})
