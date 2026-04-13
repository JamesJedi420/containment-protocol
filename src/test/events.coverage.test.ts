import { describe, expect, it } from 'vitest'
import type { OperationEventType } from '../domain/models'

const EVENT_TYPE_COVERAGE_STATUS: Record<OperationEventType, 'covered' | 'future_stub'> = {
  'assignment.team_assigned': 'covered',
  'assignment.team_unassigned': 'covered',
  'case.resolved': 'covered',
  'case.partially_resolved': 'covered',
  'case.failed': 'covered',
  'case.escalated': 'covered',
  'case.spawned': 'covered',
  'case.raid_converted': 'covered',
  'intel.report_generated': 'covered',
  'agent.training_started': 'covered',
  'agent.training_completed': 'covered',
  'agent.training_cancelled': 'covered',
  'agent.relationship_changed': 'covered',
  'agent.instructor_assigned': 'covered',
  'agent.instructor_unassigned': 'covered',
  'agent.injured': 'covered',
  'agent.killed': 'covered',
  'agent.betrayed': 'covered',
  'agent.resigned': 'covered',
  'agent.promoted': 'covered',
  'progression.xp_gained': 'covered',
  'agent.hired': 'covered',
  'system.recruitment_expired': 'covered',
  'system.recruitment_generated': 'covered',
  'recruitment.scouting_initiated': 'covered',
  'recruitment.scouting_refined': 'covered',
  'recruitment.intel_confirmed': 'covered',
  'system.party_cards_drawn': 'covered',
  'production.queue_completed': 'covered',
  'production.queue_started': 'covered',
  'market.shifted': 'covered',
  'market.transaction_recorded': 'covered',
  'faction.standing_changed': 'covered',
  'faction.unlock_available': 'covered',
  'agency.containment_updated': 'covered',
  'directive.applied': 'covered',
  'system.academy_upgraded': 'covered',
}

describe('event type coverage contract', () => {
  it('requires explicit coverage/stub classification for every event type', () => {
    const statuses = Object.values(EVENT_TYPE_COVERAGE_STATUS)

    expect(statuses).toContain('covered')
    expect(
      Object.entries(EVENT_TYPE_COVERAGE_STATUS)
        .filter(([, status]) => status === 'future_stub')
        .map(([type]) => type)
    ).toEqual([])
  })
})
