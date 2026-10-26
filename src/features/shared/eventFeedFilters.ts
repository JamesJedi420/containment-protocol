import { readStringParam, writeEnumParam, writeStringParam } from '../../app/searchParams'
import type { OperationEventSourceSystem, OperationEventType } from '../../domain/models'

export type EventFeedFilters = {
  query: string
  category: EventFeedCategory | 'all'
  sourceSystem: OperationEventSourceSystem | 'all'
  type: OperationEventType | 'all'
  relationshipVerbosity: 'all' | 'summary'
  weekMin?: number
  weekMax?: number
  entityId?: string
}

export type EventFeedCategory =
  'incident_response' | 'personnel' | 'intel_briefing' | 'operations_logistics' | 'agency_posture'

export const DEFAULT_EVENT_FEED_FILTERS: EventFeedFilters = {
  query: '',
  category: 'all',
  sourceSystem: 'all',
  type: 'all',
  relationshipVerbosity: 'summary',
  weekMin: undefined,
  weekMax: undefined,
  entityId: '',
}

export const EVENT_FEED_PARAM_KEYS = {
  query: 'feedQ',
  category: 'feedCategory',
  sourceSystem: 'feedSource',
  type: 'feedType',
  relationshipVerbosity: 'feedRelVerbosity',
  weekMin: 'feedWeekMin',
  weekMax: 'feedWeekMax',
  entityId: 'feedEntity',
} as const

function readEventFeedEnum<T extends string>(
  value: string | null,
  allowed: Set<string>,
  fallback: T
): T {
  return value && allowed.has(value) ? (value as T) : fallback
}

function readWeekParam(searchParams: URLSearchParams, key: string) {
  const raw = searchParams.get(key)

  if (!raw) {
    return undefined
  }

  const parsed = Math.trunc(Number(raw))

  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined
}

function writeWeekParam(searchParams: URLSearchParams, key: string, value: number | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    searchParams.delete(key)
    return
  }

  searchParams.set(key, String(Math.trunc(value)))
}

export function readEventFeedFilters(searchParams: URLSearchParams): EventFeedFilters {
  return {
    query: readStringParam(searchParams, EVENT_FEED_PARAM_KEYS.query),
    category: readEventFeedEnum(
      searchParams.get(EVENT_FEED_PARAM_KEYS.category),
      EVENT_FEED_CATEGORY_ALLOWED,
      DEFAULT_EVENT_FEED_FILTERS.category
    ),
    sourceSystem: readEventFeedEnum(
      searchParams.get(EVENT_FEED_PARAM_KEYS.sourceSystem),
      EVENT_FEED_SOURCE_ALLOWED,
      DEFAULT_EVENT_FEED_FILTERS.sourceSystem
    ),
    type: readEventFeedEnum(
      searchParams.get(EVENT_FEED_PARAM_KEYS.type),
      EVENT_FEED_TYPE_ALLOWED,
      DEFAULT_EVENT_FEED_FILTERS.type
    ),
    relationshipVerbosity: readEventFeedEnum(
      searchParams.get(EVENT_FEED_PARAM_KEYS.relationshipVerbosity),
      EVENT_FEED_RELATIONSHIP_VERBOSITY_ALLOWED,
      DEFAULT_EVENT_FEED_FILTERS.relationshipVerbosity
    ),
    weekMin: readWeekParam(searchParams, EVENT_FEED_PARAM_KEYS.weekMin),
    weekMax: readWeekParam(searchParams, EVENT_FEED_PARAM_KEYS.weekMax),
    entityId: readStringParam(searchParams, EVENT_FEED_PARAM_KEYS.entityId),
  }
}

export function writeEventFeedFilters(
  filters: EventFeedFilters,
  baseSearchParams?: URLSearchParams
) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, EVENT_FEED_PARAM_KEYS.query, filters.query)
  writeEnumParam(
    nextSearchParams,
    EVENT_FEED_PARAM_KEYS.category,
    filters.category,
    DEFAULT_EVENT_FEED_FILTERS.category
  )
  writeEnumParam(
    nextSearchParams,
    EVENT_FEED_PARAM_KEYS.sourceSystem,
    filters.sourceSystem,
    DEFAULT_EVENT_FEED_FILTERS.sourceSystem
  )
  writeEnumParam(
    nextSearchParams,
    EVENT_FEED_PARAM_KEYS.type,
    filters.type,
    DEFAULT_EVENT_FEED_FILTERS.type
  )
  writeEnumParam(
    nextSearchParams,
    EVENT_FEED_PARAM_KEYS.relationshipVerbosity,
    filters.relationshipVerbosity,
    DEFAULT_EVENT_FEED_FILTERS.relationshipVerbosity
  )
  writeWeekParam(nextSearchParams, EVENT_FEED_PARAM_KEYS.weekMin, filters.weekMin)
  writeWeekParam(nextSearchParams, EVENT_FEED_PARAM_KEYS.weekMax, filters.weekMax)
  writeStringParam(nextSearchParams, EVENT_FEED_PARAM_KEYS.entityId, filters.entityId ?? '')

  return nextSearchParams
}

export const EVENT_CATEGORY_LABELS: Record<EventFeedCategory, string> = {
  incident_response: 'Incident response',
  personnel: 'Personnel',
  intel_briefing: 'Intel briefing',
  operations_logistics: 'Operations logistics',
  agency_posture: 'Agency posture',
}

export const EVENT_SOURCE_LABELS: Record<OperationEventSourceSystem, string> = {
  assignment: 'Assignment',
  incident: 'Incident',
  intel: 'Intel',
  agent: 'Agent',
  production: 'Production',
  faction: 'Faction',
  system: 'System',
}

export const EVENT_TYPE_LABELS: Record<OperationEventType, string> = {
  'system.equipment_recovered': 'Equipment Recovered',
  'assignment.team_assigned': 'Team Assigned',
  'assignment.team_unassigned': 'Team Unassigned',
  'case.resolved': 'Case Resolved',
  'case.partially_resolved': 'Case Partial',
  'case.failed': 'Case Failed',
  'case.escalated': 'Case Escalated',
  'case.spawned': 'Incident Opened',
  'case.raid_converted': 'Raid Conversion',
  'case.aggregate_battle': 'Battle Result',
  'intel.report_generated': 'Intel Report',
  'agent.training_started': 'Training Started',
  'agent.training_completed': 'Training Complete',
  'agent.training_cancelled': 'Training Cancelled',
  'agent.relationship_changed': 'Relationship Changed',
  'agent.instructor_assigned': 'Instructor Assigned',
  'agent.instructor_unassigned': 'Instructor Removed',
  'agent.injured': 'Agent Injury',
  'agent.killed': 'Agent Fatality',
  'agent.betrayed': 'Trust Breach',
  'agent.resigned': 'Agent Resignation',
  'agent.promoted': 'Agent Promotion',
  'progression.xp_gained': 'XP Gained',
  'agent.hired': 'Recruitment Hire',
  'system.recruitment_expired': 'Recruitment Expired',
  'recruitment.candidate_departed': 'Candidate Departed',
  'system.recruitment_generated': 'Recruitment Generated',
  'recruitment.scouting_initiated': 'Scouting Initiated',
  'recruitment.scouting_refined': 'Scouting Refined',
  'recruitment.intel_confirmed': 'Intel Confirmed',
  'system.party_cards_drawn': 'Party Cards Drawn',
  'production.queue_started': 'Queue Started',
  'production.queue_completed': 'Queue Complete',
  'equipment.recovery_started': 'Equipment Recovery Started',
  'equipment.recovery_completed': 'Equipment Recovery Complete',
  'equipment.auto_scrap_policy_changed': 'Auto-Scrap Policy Changed',
  'equipment.auto_scrap_routed': 'Auto-Scrap Routed',
  'equipment.instance_materialized': 'Equipment Instance Materialized',
  'equipment.instance_destroyed': 'Equipment Instance Destroyed',
  'equipment.instance_reaggregated': 'Equipment Instance Re-aggregated',
  'equipment.instance_condition_repaired': 'Equipment Instance Condition Repaired',
  'equipment.containment_class_deficiency_recorded': 'Containment Class Deficiency Recorded',
  'equipment.containment_class_inspected': 'Containment Class Inspected',
  'equipment.containment_class_stabilized': 'Containment Class Stabilized',
  'equipment.instance_station_mutated': 'Equipment Instance Station Mutated',
  'equipment.containment_barrier_integrity_changed': 'Containment Barrier Integrity Changed',
  'equipment.combat_stim_activated': 'Combat Stim Activated',
  'equipment.combat_stim_overdrive_expired': 'Combat Stim Overdrive Expired',
  'equipment.combat_stim_disposed': 'Combat Stim Disposed',
  'equipment.combat_stim_reaggregated': 'Combat Stim Re-aggregated',
  'market.shifted': 'Market Shift',
  'market.transaction_recorded': 'Market Transaction',
  'market.emergency_gray_market_waiver_granted': 'Emergency Gray-Market Waiver',
  'market.emergency_gray_market_waiver_accountability_closed':
    'Emergency Waiver Accountability Closed',
  'market.emergency_gray_market_fallout_tick': 'Emergency Waiver Fallout',
  'faction.standing_changed': 'Faction Standing',
  'faction.unlock_available': 'Faction Unlock',
  'agency.containment_updated': 'Agency Update',
  'agency.front_business.opened': 'Courier Shell Opened',
  'agency.front_business.resolved': 'Courier Shell Week',
  'directive.applied': 'Directive Applied',
  'support.shortfall': 'Support Shortfall',
  'system.academy_upgraded': 'Academy Upgraded',
  'staff.coping.applied': 'Coping Applied',
  'staff.coping.misconduct': 'Coping Misconduct',
  'staff.side_work.resolved': 'Side Work Resolved',
  'infiltration.awareness_complication': 'Infiltration Complication',
  'infiltration.escalation_exposed': 'Cover Exposed',
  'infiltration.escalation_violent': 'Violent Escalation',
  'infiltration.cover_strain': 'Cover Strain',
  'infiltration.weekly_encounter': 'Infiltration Weekly Encounter',
  'infiltration.leave_behind_tradeoff': 'Leave-Behind Tradeoff',
  'concealment.activated': 'Concealment Activated',
}

const EVENT_FEED_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventFeedCategory[]
const EVENT_FEED_SOURCE_SYSTEMS = Object.keys(EVENT_SOURCE_LABELS) as OperationEventSourceSystem[]
const EVENT_FEED_TYPES = Object.keys(EVENT_TYPE_LABELS) as OperationEventType[]

const EVENT_FEED_CATEGORY_ALLOWED = new Set<string>(['all', ...EVENT_FEED_CATEGORIES])
const EVENT_FEED_SOURCE_ALLOWED = new Set<string>(['all', ...EVENT_FEED_SOURCE_SYSTEMS])
const EVENT_FEED_TYPE_ALLOWED = new Set<string>(['all', ...EVENT_FEED_TYPES])
const EVENT_FEED_RELATIONSHIP_VERBOSITY_ALLOWED = new Set<string>(['all', 'summary'])
