import type { ReportNote, ReportNoteType } from '../../domain/models'

export type ReportNoteCategory = 'incident_response' | 'recruitment' | 'system' | 'uncategorized'

export const REPORT_NOTE_CATEGORY_LABELS: Record<ReportNoteCategory, string> = {
  incident_response: 'Incident response',
  recruitment: 'Recruitment',
  system: 'System',
  uncategorized: 'Uncategorized',
}

const INCIDENT_NOTE_TYPES: ReportNoteType[] = [
  'case.resolved',
  'case.partially_resolved',
  'case.failed',
  'case.escalated',
  'case.spawned',
  'case.raid_converted',
]

const RECRUITMENT_NOTE_TYPES: ReportNoteType[] = [
  'system.recruitment_expired',
  'system.recruitment_generated',
  'recruitment.scouting_initiated',
  'recruitment.scouting_refined',
  'recruitment.intel_confirmed',
]

const SYSTEM_NOTE_TYPES: ReportNoteType[] = [
  'system.week_delta',
  'system.party_cards_drawn',
  'agent.training_completed',
  'production.queue_completed',
  'market.shifted',
  'market.transaction_recorded',
  'faction.standing_changed',
  'faction.unlock_available',
  'agency.containment_updated',
  'directive.applied',
]

export function getReportNoteCategory(note: ReportNote): ReportNoteCategory {
  if (note.type !== undefined && RECRUITMENT_NOTE_TYPES.includes(note.type)) {
    return 'recruitment'
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
