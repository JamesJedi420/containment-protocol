import { describe, expect, it } from 'vitest'
import type { ReportNote, ReportNoteType } from '../../domain/models'
import {
  filterReportNotesByCategory,
  getAvailableReportNoteCategories,
  getReportNoteCategory,
  REPORT_NOTE_CATEGORY_LABELS,
  type ReportNoteCategory,
} from './reportNoteView'

function note(type: ReportNoteType): ReportNote {
  return {
    id: `note-${type}`,
    content: type,
    timestamp: 1,
    type,
  }
}

const EXPECTED_CATEGORY_BY_TYPE = {
  'case.resolved': 'incident_response',
  'case.partially_resolved': 'incident_response',
  'case.failed': 'incident_response',
  'case.escalated': 'incident_response',
  'case.spawned': 'incident_response',
  'case.raid_converted': 'incident_response',
  'case.aggregate_battle': 'incident_response',
  'system.recruitment_expired': 'recruitment',
  'system.recruitment_generated': 'recruitment',
  'recruitment.scouting_initiated': 'recruitment',
  'recruitment.scouting_refined': 'recruitment',
  'recruitment.intel_confirmed': 'recruitment',
  'system.week_delta': 'system',
  'system.party_cards_drawn': 'system',
  'system.equipment_recovered': 'system',
  'system.escalation_consequence': 'system',
  'system.proxy_conflict': 'system',
  'system.protocol_contact': 'system',
  'system.anchor_instability': 'system',
  'agent.training_completed': 'system',
  'production.queue_completed': 'system',
  'market.shifted': 'system',
  'market.transaction_recorded': 'system',
  'faction.standing_changed': 'system',
  'faction.unlock_available': 'system',
  'agency.containment_updated': 'system',
  'directive.applied': 'system',
  'support.shortfall': 'system',
  'support.restored': 'system',
  'infiltration.awareness_complication': 'system',
  'infiltration.escalation_exposed': 'system',
  'infiltration.escalation_violent': 'system',
  'infiltration.cover_strain': 'system',
  'infiltration.weekly_encounter': 'system',
  'infiltration.leave_behind_tradeoff': 'system',
  'concealment.activated': 'system',
  'hub.opportunity': 'system',
  'hub.rumor': 'system',
  'information_intake.verification': 'information_intake',
  'post_incident_review.follow_on': 'post_incident_review',
} satisfies Record<ReportNoteType, ReportNoteCategory>

describe('reportNoteView', () => {
  it('maps every ReportNoteType to a non-uncategorized bucket (SPE-215)', () => {
    for (const [type, category] of Object.entries(EXPECTED_CATEGORY_BY_TYPE) as Array<
      [ReportNoteType, ReportNoteCategory]
    >) {
      expect(getReportNoteCategory(note(type))).toBe(category)
    }
  })

  it('returns uncategorized for legacy notes without a type', () => {
    expect(
      getReportNoteCategory({
        id: 'legacy',
        content: 'Unstructured note.',
        timestamp: 1,
      })
    ).toBe('uncategorized')
  })

  it('lists available categories in label order', () => {
    const notes = [
      note('case.resolved'),
      note('system.recruitment_generated'),
      note('market.shifted'),
      note('case.aggregate_battle'),
      note('support.shortfall'),
    ]

    expect(getAvailableReportNoteCategories(notes)).toEqual([
      'incident_response',
      'recruitment',
      'system',
    ])
  })

  it('filters notes by category and preserves all for the all sentinel', () => {
    const notes = [note('case.failed'), note('support.restored'), note('hub.rumor')]

    expect(filterReportNotesByCategory(notes, 'incident_response')).toEqual([note('case.failed')])
    expect(filterReportNotesByCategory(notes, 'system')).toEqual([
      note('support.restored'),
      note('hub.rumor'),
    ])
    expect(filterReportNotesByCategory(notes, 'all')).toEqual(notes)
  })

  it('exposes stable category labels', () => {
    expect(REPORT_NOTE_CATEGORY_LABELS.incident_response).toBe('Incident response')
    expect(REPORT_NOTE_CATEGORY_LABELS.information_intake).toBe('Information intake')
    expect(REPORT_NOTE_CATEGORY_LABELS.post_incident_review).toBe('Post-incident review')
    expect(REPORT_NOTE_CATEGORY_LABELS.system).toBe('System')
  })
})
