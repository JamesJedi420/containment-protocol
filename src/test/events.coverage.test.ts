import { describe, expect, it } from 'vitest'
import { EVENT_TYPE_TO_SOURCE_SYSTEM, type OperationEventType } from '../domain/events/types'

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
  'recruitment.candidate_departed': 'covered',
  'system.recruitment_generated': 'covered',
  'recruitment.scouting_initiated': 'covered',
  'recruitment.scouting_refined': 'covered',
  'recruitment.intel_confirmed': 'covered',
  'system.party_cards_drawn': 'covered',
  'production.queue_completed': 'covered',
  'production.queue_started': 'covered',
  'equipment.recovery_started': 'covered',
  'equipment.recovery_completed': 'covered',
  'equipment.auto_scrap_policy_changed': 'covered',
  'equipment.auto_scrap_routed': 'covered',
  'equipment.instance_materialized': 'covered',
  'equipment.instance_destroyed': 'covered',
  'equipment.instance_reaggregated': 'covered',
  'equipment.combat_stim_activated': 'covered',
  'equipment.combat_stim_overdrive_expired': 'covered',
  'equipment.combat_stim_disposed': 'covered',
  'system.equipment_recovered': 'covered',
  'market.shifted': 'covered',
  'market.transaction_recorded': 'covered',
  'market.emergency_gray_market_waiver_granted': 'covered',
  'market.emergency_gray_market_waiver_accountability_closed': 'covered',
  'market.emergency_gray_market_fallout_tick': 'covered',
  'faction.standing_changed': 'covered',
  'faction.unlock_available': 'covered',
  'agency.containment_updated': 'covered',
  'agency.front_business.opened': 'covered',
  'agency.front_business.resolved': 'covered',
  'directive.applied': 'covered',
  'support.shortfall': 'covered',
  'infiltration.awareness_complication': 'covered',
  'infiltration.escalation_exposed': 'covered',
  'infiltration.escalation_violent': 'covered',
  'infiltration.cover_strain': 'covered',
  'infiltration.weekly_encounter': 'covered',
  'infiltration.leave_behind_tradeoff': 'covered',
  'concealment.activated': 'covered',
  'system.academy_upgraded': 'covered',
  'case.aggregate_battle': 'covered',
  'staff.coping.applied': 'covered',
  'staff.coping.misconduct': 'covered',
  'staff.side_work.resolved': 'covered',
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

    const canonicalTypes = Object.keys(EVENT_TYPE_TO_SOURCE_SYSTEM) as OperationEventType[]
    const classifiedTypes = Object.keys(EVENT_TYPE_COVERAGE_STATUS) as OperationEventType[]

    expect(classifiedTypes.sort()).toEqual(canonicalTypes.sort())
  })
})
