import type { ReportNote, ReportNoteType } from '../../domain/models'

export type ReportNoteCategory =
  | 'incident_response'
  | 'recruitment'
  | 'information_intake'
  | 'post_incident_review'
  | 'system'
  | 'uncategorized'

export const REPORT_NOTE_CATEGORY_LABELS: Record<ReportNoteCategory, string> = {
  incident_response: 'Incident response',
  recruitment: 'Recruitment',
  information_intake: 'Information intake',
  post_incident_review: 'Post-incident review',
  system: 'System',
  uncategorized: 'Uncategorized',
}

const INFORMATION_INTAKE_NOTE_TYPES: ReportNoteType[] = [
  'information_intake.verification',
  'information_intake.naming_hazard_cross_link',
  'information_intake.extranormal_cross_link',
  'information_intake.minor_anomaly_cross_link',
  'information_intake.unexplained_location_cross_link',
]

const POST_INCIDENT_REVIEW_NOTE_TYPES: ReportNoteType[] = [
  'post_incident_review.follow_on',
  'post_incident_review.closeout_reward_payout',
]

const INCIDENT_NOTE_TYPES: ReportNoteType[] = [
  'case.resolved',
  'case.partially_resolved',
  'case.failed',
  'case.escalated',
  'case.spawned',
  'case.raid_converted',
  'case.aggregate_battle',
]

const RECRUITMENT_NOTE_TYPES: ReportNoteType[] = [
  'system.recruitment_expired',
  'system.recruitment_generated',
  'recruitment.scouting_initiated',
  'recruitment.scouting_refined',
  'recruitment.intel_confirmed',
]

const SYSTEM_NOTE_TYPES: ReportNoteType[] = [
  'welfare_debt.accounting_cross_link',
  'coercive_protocol.integrated_health_reconciliation',
  'public_disclosure.trust_outcome',
  'public_disclosure.segment_trust_divergence',
  'system.week_delta',
  'system.party_cards_drawn',
  'system.equipment_recovered',
  'system.escalation_consequence',
  'system.proxy_conflict',
  'system.protocol_contact',
  'system.anchor_instability',
  'agent.training_completed',
  'production.queue_completed',
  'market.shifted',
  'market.transaction_recorded',
  'faction.standing_changed',
  'faction.unlock_available',
  'agency.containment_updated',
  'directive.applied',
  'support.shortfall',
  'support.restored',
  'infiltration.awareness_complication',
  'infiltration.escalation_exposed',
  'infiltration.escalation_violent',
  'infiltration.cover_strain',
  'infiltration.weekly_encounter',
  'infiltration.leave_behind_tradeoff',
  'concealment.activated',
  'hub.opportunity',
  'hub.rumor',
]

export function getReportNoteCategory(note: ReportNote): ReportNoteCategory {
  if (note.type !== undefined && RECRUITMENT_NOTE_TYPES.includes(note.type)) {
    return 'recruitment'
  }

  if (note.type !== undefined && INFORMATION_INTAKE_NOTE_TYPES.includes(note.type)) {
    return 'information_intake'
  }

  if (note.type !== undefined && POST_INCIDENT_REVIEW_NOTE_TYPES.includes(note.type)) {
    return 'post_incident_review'
  }

  if (note.type !== undefined && SYSTEM_NOTE_TYPES.includes(note.type)) {
    return 'system'
  }

  if (note.type !== undefined && INCIDENT_NOTE_TYPES.includes(note.type)) {
    return 'incident_response'
  }

  return 'uncategorized'
}

export function getAvailableReportNoteCategories(notes: ReportNote[]) {
  return [...new Set(notes.map((note) => getReportNoteCategory(note)))].sort((left, right) =>
    REPORT_NOTE_CATEGORY_LABELS[left].localeCompare(REPORT_NOTE_CATEGORY_LABELS[right])
  )
}

export function filterReportNotesByCategory(
  notes: ReportNote[],
  category: ReportNoteCategory | 'all'
) {
  if (category === 'all') {
    return notes
  }

  return notes.filter((note) => getReportNoteCategory(note) === category)
}
