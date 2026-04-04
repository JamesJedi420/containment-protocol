import { APP_ROUTES } from '../../app/routes'
import { readStringParam, writeEnumParam, writeStringParam } from '../../app/searchParams'
import { buildEventQueryIndex, queryEvents } from '../../domain/events'
import { formatProductionMaterialSummary, formatProductionOutputLabel } from '../../domain/crafting'
import {
  type GameState,
  type OperationEvent,
  type OperationEventSourceSystem,
  type OperationEventType,
} from '../../domain/models'

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
  | 'incident_response'
  | 'personnel'
  | 'intel_briefing'
  | 'operations_logistics'
  | 'agency_posture'

export type EventFeedTone = 'neutral' | 'success' | 'warning' | 'danger'

export type EventFeedView = {
  event: OperationEvent
  week: number
  title: string
  detail: string
  sourceLabel: string
  typeLabel: string
  timestampLabel: string
  tone: EventFeedTone
  href?: string
  searchText: string
}

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

const EVENT_FEED_PARAM_KEYS = {
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
  'assignment.team_assigned': 'Team Assigned',
  'assignment.team_unassigned': 'Team Unassigned',
  'case.resolved': 'Case Resolved',
  'case.partially_resolved': 'Case Partial',
  'case.failed': 'Case Failed',
  'case.escalated': 'Case Escalated',
  'case.spawned': 'Incident Opened',
  'case.raid_converted': 'Raid Conversion',
  'intel.report_generated': 'Intel Report',
  'agent.training_started': 'Training Started',
  'agent.training_completed': 'Training Complete',
  'agent.training_cancelled': 'Training Cancelled',
  'agent.relationship_changed': 'Relationship Changed',
  'agent.instructor_assigned': 'Instructor Assigned',
  'agent.instructor_unassigned': 'Instructor Removed',
  'agent.injured': 'Agent Injury',
  'agent.betrayed': 'Trust Breach',
  'agent.resigned': 'Agent Resignation',
  'agent.promoted': 'Agent Promotion',
  'progression.xp_gained': 'XP Gained',
  'agent.hired': 'Recruitment Hire',
  'system.recruitment_expired': 'Recruitment Expired',
  'system.recruitment_generated': 'Recruitment Generated',
  'recruitment.scouting_initiated': 'Scouting Initiated',
  'recruitment.scouting_refined': 'Scouting Refined',
  'recruitment.intel_confirmed': 'Intel Confirmed',
  'system.party_cards_drawn': 'Party Cards Drawn',
  'production.queue_started': 'Queue Started',
  'production.queue_completed': 'Queue Complete',
  'market.shifted': 'Market Shift',
  'market.transaction_recorded': 'Market Transaction',
  'faction.standing_changed': 'Faction Standing',
  'agency.containment_updated': 'Agency Update',
  'directive.applied': 'Directive Applied',
  'system.academy_upgraded': 'Academy Upgraded',
}

export const EVENT_TYPE_CATEGORIES: Record<OperationEventType, EventFeedCategory> = {
  'assignment.team_assigned': 'incident_response',
  'assignment.team_unassigned': 'incident_response',
  'case.resolved': 'incident_response',
  'case.partially_resolved': 'incident_response',
  'case.failed': 'incident_response',
  'case.escalated': 'incident_response',
  'case.spawned': 'incident_response',
  'case.raid_converted': 'incident_response',
  'intel.report_generated': 'intel_briefing',
  'agent.training_started': 'personnel',
  'agent.training_completed': 'personnel',
  'agent.training_cancelled': 'personnel',
  'agent.relationship_changed': 'personnel',
  'agent.instructor_assigned': 'personnel',
  'agent.instructor_unassigned': 'personnel',
  'agent.injured': 'personnel',
  'agent.betrayed': 'personnel',
  'agent.resigned': 'personnel',
  'agent.promoted': 'personnel',
  'progression.xp_gained': 'personnel',
  'agent.hired': 'personnel',
  'system.recruitment_expired': 'personnel',
  'system.recruitment_generated': 'personnel',
  'recruitment.scouting_initiated': 'intel_briefing',
  'recruitment.scouting_refined': 'intel_briefing',
  'recruitment.intel_confirmed': 'intel_briefing',
  'system.party_cards_drawn': 'operations_logistics',
  'production.queue_started': 'operations_logistics',
  'production.queue_completed': 'operations_logistics',
  'market.shifted': 'operations_logistics',
  'market.transaction_recorded': 'operations_logistics',
  'faction.standing_changed': 'agency_posture',
  'agency.containment_updated': 'agency_posture',
  'directive.applied': 'agency_posture',
  'system.academy_upgraded': 'operations_logistics',
}

const EVENT_FEED_CATEGORIES = Object.keys(EVENT_CATEGORY_LABELS) as EventFeedCategory[]
const EVENT_FEED_SOURCE_SYSTEMS = Object.keys(EVENT_SOURCE_LABELS) as OperationEventSourceSystem[]
const EVENT_FEED_TYPES = Object.keys(EVENT_TYPE_LABELS) as OperationEventType[]

const EVENT_FEED_CATEGORY_ALLOWED = new Set<string>(['all', ...EVENT_FEED_CATEGORIES])
const EVENT_FEED_SOURCE_ALLOWED = new Set<string>(['all', ...EVENT_FEED_SOURCE_SYSTEMS])
const EVENT_FEED_TYPE_ALLOWED = new Set<string>(['all', ...EVENT_FEED_TYPES])
const EVENT_FEED_RELATIONSHIP_VERBOSITY_ALLOWED = new Set<string>(['all', 'summary'])

function formatTimestampLabel(timestamp: string) {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 19)}Z`
}

function getSpawnTriggerLabel(
  trigger:
    | 'failure'
    | 'unresolved'
    | 'raid_pressure'
    | 'world_activity'
    | 'faction_pressure'
    | 'pressure_threshold'
) {
  if (trigger === 'raid_pressure') {
    return 'raid pressure'
  }

  if (trigger === 'world_activity') {
    return 'world activity'
  }

  if (trigger === 'faction_pressure') {
    return 'faction pressure'
  }

  if (trigger === 'pressure_threshold') {
    return 'global pressure threshold'
  }

  return trigger
}

export function buildEventFeedView(event: OperationEvent): EventFeedView {
  const timestampLabel = formatTimestampLabel(event.timestamp)
  const sourceLabel = EVENT_SOURCE_LABELS[event.sourceSystem]
  const typeLabel = EVENT_TYPE_LABELS[event.type]

  switch (event.type) {
    case 'assignment.team_assigned':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.teamName} assigned to ${event.payload.caseTitle}`,
        detail: `Week ${event.payload.week} / ${event.payload.assignedTeamCount}/${event.payload.maxTeams} team slots filled`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'neutral',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText:
          `${event.payload.teamName} ${event.payload.caseTitle} ${event.payload.caseId} ${event.payload.teamId}`.toLowerCase(),
      }

    case 'assignment.team_unassigned':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.teamName} removed from ${event.payload.caseTitle}`,
        detail: `Week ${event.payload.week} / ${event.payload.remainingTeamCount} teams remain assigned`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'warning',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText:
          `${event.payload.teamName} ${event.payload.caseTitle} ${event.payload.caseId} ${event.payload.teamId}`.toLowerCase(),
      }

    case 'case.resolved':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.caseTitle} resolved`,
        detail: `Week ${event.payload.week} / Stage ${event.payload.stage} / ${event.payload.teamIds.length} deployed team(s)`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText: `${event.payload.caseTitle} resolved ${event.payload.caseId}`.toLowerCase(),
      }

    case 'case.partially_resolved':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.caseTitle} partially stabilised`,
        detail: `Week ${event.payload.week} / Stage ${event.payload.fromStage} -> ${event.payload.toStage} / returned to queue`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'warning',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText: `${event.payload.caseTitle} partial ${event.payload.caseId}`.toLowerCase(),
      }

    case 'case.failed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.caseTitle} failed containment`,
        detail: `Week ${event.payload.week} / Stage ${event.payload.fromStage} -> ${event.payload.toStage}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'danger',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText: `${event.payload.caseTitle} failed ${event.payload.caseId}`.toLowerCase(),
      }

    case 'case.escalated':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.caseTitle} escalated`,
        detail: `Week ${event.payload.week} / ${event.payload.trigger} trigger / Stage ${event.payload.fromStage} -> ${event.payload.toStage}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: event.payload.convertedToRaid ? 'danger' : 'warning',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText:
          `${event.payload.caseTitle} escalated ${event.payload.caseId} ${event.payload.trigger}`.toLowerCase(),
      }

    case 'case.spawned':
      return {
        event,
        week: event.payload.week,
        title: `Incident opened: ${event.payload.caseTitle}`,
        detail: event.payload.sourceReason
          ? `Week ${event.payload.week} - ${event.payload.sourceReason}`
          : event.payload.parentCaseTitle
            ? `Week ${event.payload.week} - ${getSpawnTriggerLabel(event.payload.trigger)} from ${event.payload.parentCaseTitle}`
            : `Week ${event.payload.week} - ${getSpawnTriggerLabel(event.payload.trigger)}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'warning',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText:
          `${event.payload.caseTitle} ${event.payload.parentCaseTitle ?? ''} ${event.payload.templateId} ${event.payload.caseId} ${event.payload.trigger} ${event.payload.factionLabel ?? ''} ${event.payload.sourceReason ?? ''}`.toLowerCase(),
      }

    case 'case.raid_converted':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.caseTitle} converted to multi-team operation`,
        detail: `Week ${event.payload.week} / ${event.payload.minTeams}-${event.payload.maxTeams} teams required`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'danger',
        href: APP_ROUTES.caseDetail(event.payload.caseId),
        searchText:
          `${event.payload.caseTitle} raid converted ${event.payload.caseId}`.toLowerCase(),
      }

    case 'intel.report_generated':
      return {
        event,
        week: event.payload.week,
        title: `Week ${event.payload.week} intelligence report logged`,
        detail: `Resolved ${event.payload.resolvedCount} / Failed ${event.payload.failedCount} / Spawned ${event.payload.spawnedCount} / Score ${event.payload.score >= 0 ? '+' : ''}${event.payload.score}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: event.payload.score >= 0 ? 'success' : 'warning',
        href: APP_ROUTES.reportDetail(event.payload.week),
        searchText: `week ${event.payload.week} report intel ${event.payload.score}`.toLowerCase(),
      }

    case 'agent.training_started':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} started ${event.payload.trainingName}`,
        detail: `Week ${event.payload.week} / ETA ${event.payload.etaWeeks} week(s) / Cost $${event.payload.fundingCost}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'neutral',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} ${event.payload.trainingName} ${event.payload.trainingId}`.toLowerCase(),
      }

    case 'agent.training_completed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} completed ${event.payload.trainingName}`,
        detail: `Week ${event.payload.week} / Queue ${event.payload.queueId}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} ${event.payload.trainingName} ${event.payload.queueId}`.toLowerCase(),
      }

    case 'agent.training_cancelled':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} cancelled ${event.payload.trainingName}`,
        detail: `Week ${event.payload.week} / Refund $${event.payload.refund}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'warning',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} cancelled ${event.payload.trainingName} ${event.payload.trainingId}`.toLowerCase(),
      }

    case 'agent.relationship_changed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} relationship updated with ${event.payload.counterpartName}`,
        detail: `Week ${event.payload.week} / ${event.payload.reason.replace(/_/g, ' ')} / ${event.payload.previousValue.toFixed(2)} -> ${event.payload.nextValue.toFixed(2)}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: event.payload.delta >= 0 ? 'success' : 'warning',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} ${event.payload.counterpartName} ${event.payload.reason}`.toLowerCase(),
      }

    case 'agent.instructor_assigned':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.instructorName} assigned to ${event.payload.agentName}`,
        detail: `Week ${event.payload.week} / ${event.payload.instructorSpecialty} specialty / +${event.payload.bonus} training bonus`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.instructorName} ${event.payload.agentName} ${event.payload.instructorSpecialty}`.toLowerCase(),
      }

    case 'agent.instructor_unassigned':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.instructorName} removed from ${event.payload.agentName}`,
        detail: `Week ${event.payload.week} / ${event.payload.instructorSpecialty} specialty / +${event.payload.bonus} training bonus removed`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'warning',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.instructorName} ${event.payload.agentName} ${event.payload.instructorSpecialty} removed`.toLowerCase(),
      }

    case 'agent.injured':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} injured`,
        detail: `Week ${event.payload.week} / Severity ${event.payload.severity}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'danger',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText: `${event.payload.agentName} injured ${event.payload.severity}`.toLowerCase(),
      }

    case 'agent.betrayed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.betrayerName} betrayed ${event.payload.betrayedName}`,
        detail: `Week ${event.payload.week} / trust damage +${event.payload.trustDamageDelta.toFixed(2)} (total ${event.payload.trustDamageTotal.toFixed(2)})${event.payload.triggeredConsequences.length > 0 ? ` / ${event.payload.triggeredConsequences.join(', ')}` : ''}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'danger',
        href: APP_ROUTES.agentDetail(event.payload.betrayerId),
        searchText:
          `${event.payload.betrayerName} ${event.payload.betrayedName} betrayal ${event.payload.triggeredConsequences.join(' ')}`.toLowerCase(),
      }

    case 'agent.resigned':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} resigned`,
        detail: `Week ${event.payload.week} / ${event.payload.reason.replace(/_/g, ' ')}${event.payload.counterpartName ? ` / linked to ${event.payload.counterpartName}` : ''}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'danger',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} resigned ${event.payload.reason} ${event.payload.counterpartName ?? ''}`.toLowerCase(),
      }

    case 'agent.promoted':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} promoted`,
        detail: `Week ${event.payload.week} / New role ${event.payload.newRole}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText: `${event.payload.agentName} promoted ${event.payload.newRole}`.toLowerCase(),
      }

    case 'progression.xp_gained':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} gained XP`,
        detail: `Week ${event.payload.week} / +${event.payload.xpAmount} XP / ${event.payload.reason}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} xp ${event.payload.xpAmount} ${event.payload.reason}`.toLowerCase(),
      }

    case 'agent.hired':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.agentName} hired`,
        detail: `Week ${event.payload.week} / ${event.payload.recruitCategory} intake`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.agentDetail(event.payload.agentId),
        searchText:
          `${event.payload.agentName} hired ${event.payload.recruitCategory} ${event.payload.candidateId}`.toLowerCase(),
      }

    case 'recruitment.scouting_initiated':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.candidateName} scouting initiated`,
        detail: `Week ${event.payload.week} / Projected ${event.payload.projectedTier} tier / ${event.payload.confidence} confidence / Cost $${event.payload.fundingCost}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'neutral',
        href: APP_ROUTES.recruitment,
        searchText:
          `${event.payload.candidateName} scouting initiated ${event.payload.candidateId} ${event.payload.projectedTier} ${event.payload.confidence}`.toLowerCase(),
      }

    case 'recruitment.scouting_refined':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.candidateName} scouting refined`,
        detail: `Week ${event.payload.week} / ${event.payload.previousProjectedTier ? `${event.payload.previousProjectedTier} -> ` : ''}${event.payload.projectedTier} tier / ${event.payload.previousConfidence ? `${event.payload.previousConfidence} -> ` : ''}${event.payload.confidence} confidence / Cost $${event.payload.fundingCost}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.recruitment,
        searchText:
          `${event.payload.candidateName} scouting refined ${event.payload.candidateId} ${event.payload.previousProjectedTier ?? ''} ${event.payload.projectedTier} ${event.payload.previousConfidence ?? ''} ${event.payload.confidence}`.toLowerCase(),
      }

    case 'recruitment.intel_confirmed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.candidateName} intel confirmed`,
        detail: `Week ${event.payload.week} / Confirmed ${event.payload.confirmedTier ?? event.payload.projectedTier} tier / Cost $${event.payload.fundingCost}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.recruitment,
        searchText:
          `${event.payload.candidateName} intel confirmed ${event.payload.candidateId} ${event.payload.confirmedTier ?? event.payload.projectedTier}`.toLowerCase(),
      }

    case 'system.recruitment_expired':
      return {
        event,
        week: event.payload.week,
        title: 'Recruitment candidates expired',
        detail: `Week ${event.payload.week} / ${event.payload.count} candidate(s) removed from the pipeline`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'warning',
        searchText: `recruitment expired ${event.payload.count}`.toLowerCase(),
      }

    case 'system.recruitment_generated':
      return {
        event,
        week: event.payload.week,
        title: 'Recruitment pipeline refreshed',
        detail: `Week ${event.payload.week} / ${event.payload.count} new candidate(s) generated`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        searchText: `recruitment generated ${event.payload.count}`.toLowerCase(),
      }

    case 'system.party_cards_drawn':
      return {
        event,
        week: event.payload.week,
        title: 'Party cards drawn',
        detail: `Week ${event.payload.week} / ${event.payload.count} card(s) moved into hand`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'neutral',
        searchText: `party cards drawn ${event.payload.count}`.toLowerCase(),
      }

    case 'production.queue_completed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.queueName} completed`,
        detail: `Week ${event.payload.week} / Output ${formatProductionOutputLabel(event.payload.outputQuantity, event.payload.outputName)} / Inputs ${formatProductionMaterialSummary(event.payload.inputMaterials)}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        searchText:
          `${event.payload.queueName} ${event.payload.outputName} ${event.payload.outputId} ${event.payload.recipeId} ${formatProductionMaterialSummary(event.payload.inputMaterials)}`.toLowerCase(),
      }

    case 'production.queue_started':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.queueName} started`,
        detail: `Week ${event.payload.week} / ETA ${event.payload.etaWeeks} week(s) / Cost $${event.payload.fundingCost} / Output ${formatProductionOutputLabel(event.payload.outputQuantity, event.payload.outputName)} / Inputs ${formatProductionMaterialSummary(event.payload.inputMaterials)}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'neutral',
        searchText:
          `${event.payload.queueName} ${event.payload.outputName} ${event.payload.outputId} ${event.payload.recipeId} ${formatProductionMaterialSummary(event.payload.inputMaterials)}`.toLowerCase(),
      }

    case 'market.shifted':
      return {
        event,
        week: event.payload.week,
        title: `Market shifted to ${event.payload.pressure} conditions`,
        detail: `Week ${event.payload.week} / Featured ${event.payload.featuredRecipeName} / Multiplier ${event.payload.costMultiplier.toFixed(2)}x`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: event.payload.pressure === 'tight' ? 'warning' : 'neutral',
        searchText:
          `${event.payload.featuredRecipeName} ${event.payload.pressure} ${event.payload.featuredRecipeId}`.toLowerCase(),
      }

    case 'market.transaction_recorded':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.action === 'buy' ? 'Purchased' : 'Sold'} ${event.payload.quantity}x ${event.payload.itemName}`,
        detail: `Week ${event.payload.week} / ${event.payload.category} / $${event.payload.totalPrice} / ${event.payload.remainingAvailability} units remaining`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: event.payload.action === 'buy' ? 'neutral' : 'success',
        searchText:
          `${event.payload.action} ${event.payload.itemName} ${event.payload.itemId} ${event.payload.listingId} ${event.payload.category}`.toLowerCase(),
      }

    case 'faction.standing_changed':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.factionName} standing ${event.payload.delta >= 0 ? 'improved' : 'shifted down'}`,
        detail: `Week ${event.payload.week} / ${event.payload.standingBefore >= 0 ? '+' : ''}${event.payload.standingBefore} -> ${event.payload.standingAfter >= 0 ? '+' : ''}${event.payload.standingAfter}${event.payload.caseTitle ? ` / ${event.payload.caseTitle}` : ''}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: event.payload.delta > 0 ? 'success' : event.payload.delta < 0 ? 'warning' : 'neutral',
        searchText:
          `${event.payload.factionName} ${event.payload.factionId} ${event.payload.reason} ${event.payload.caseTitle ?? ''}`.toLowerCase(),
      }

    case 'agency.containment_updated':
      return {
        event,
        week: event.payload.week,
        title: 'Agency posture updated',
        detail: `Week ${event.payload.week} / Containment ${event.payload.containmentRatingBefore}% -> ${event.payload.containmentRatingAfter}% / Funding $${event.payload.fundingBefore} -> $${event.payload.fundingAfter}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone:
          event.payload.containmentDelta > 0
            ? 'success'
            : event.payload.containmentDelta < 0
              ? 'warning'
              : 'neutral',
        searchText:
          `agency containment ${event.payload.containmentRatingBefore} ${event.payload.containmentRatingAfter} funding ${event.payload.fundingBefore} ${event.payload.fundingAfter}`.toLowerCase(),
      }

    case 'directive.applied':
      return {
        event,
        week: event.payload.week,
        title: `${event.payload.directiveLabel} directive applied`,
        detail: `Week ${event.payload.week} / Directive ${event.payload.directiveId}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'neutral',
        href: APP_ROUTES.operationsDesk,
        searchText:
          `${event.payload.directiveLabel} ${event.payload.directiveId} directive`.toLowerCase(),
      }

    case 'system.academy_upgraded':
      return {
        event,
        week: event.payload.week,
        title: 'Academy upgraded',
        detail: `Week ${event.payload.week} / Tier ${event.payload.tierBefore} -> ${event.payload.tierAfter} / Cost $${event.payload.cost}`,
        sourceLabel,
        typeLabel,
        timestampLabel,
        tone: 'success',
        href: APP_ROUTES.trainingDivision,
        searchText:
          `academy upgraded ${event.payload.tierBefore} ${event.payload.tierAfter} ${event.payload.cost}`.toLowerCase(),
      }
  }
}

export function getAvailableEventSources(events: OperationEvent[]) {
  return [...new Set(events.map((event) => event.sourceSystem))].sort((left, right) =>
    EVENT_SOURCE_LABELS[left].localeCompare(EVENT_SOURCE_LABELS[right])
  )
}

export function getAvailableEventTypes(events: OperationEvent[]) {
  return [...new Set(events.map((event) => event.type))].sort((left, right) =>
    EVENT_TYPE_LABELS[left].localeCompare(EVENT_TYPE_LABELS[right])
  )
}

export function getAvailableEventCategories(events: OperationEvent[]) {
  return [...new Set(events.map((event) => EVENT_TYPE_CATEGORIES[event.type]))].sort(
    (left, right) => EVENT_CATEGORY_LABELS[left].localeCompare(EVENT_CATEGORY_LABELS[right])
  )
}

export function getFilteredEventFeedViews(
  game: GameState,
  filters: EventFeedFilters = DEFAULT_EVENT_FEED_FILTERS
) {
  const normalizedQuery = filters.query.trim().toLowerCase()
  const eventIndex = buildEventQueryIndex(game.events)
  const filteredEvents = queryEvents(eventIndex, {
    sourceSystem: filters.sourceSystem,
    type: filters.type,
    weekMin: filters.weekMin,
    weekMax: filters.weekMax,
    entityId: filters.entityId,
  })

  const mapped = filteredEvents.map(buildEventFeedView).filter((view) => {
    if (filters.category !== 'all' && EVENT_TYPE_CATEGORIES[view.event.type] !== filters.category) {
      return false
    }

    if (filters.sourceSystem !== 'all' && view.event.sourceSystem !== filters.sourceSystem) {
      return false
    }

    if (filters.type !== 'all' && view.event.type !== filters.type) {
      return false
    }

    if (normalizedQuery.length > 0 && !view.searchText.includes(normalizedQuery)) {
      return false
    }

    return true
  })

  if (filters.relationshipVerbosity === 'summary') {
    return aggregateRelationshipEventViews(mapped)
  }

  return mapped
}

function aggregateRelationshipEventViews(views: EventFeedView[]) {
  const output: EventFeedView[] = []
  const grouped = new Map<
    string,
    Array<EventFeedView & { event: OperationEvent<'agent.relationship_changed'> }>
  >()

  for (const view of views) {
    if (view.event.type !== 'agent.relationship_changed') {
      output.push(view)
      continue
    }

    const pairKey = [view.event.payload.agentId, view.event.payload.counterpartId].sort().join('::')
    const key = `${view.week}:${pairKey}:${view.event.payload.reason}`
    const bucket = grouped.get(key)
    if (bucket) {
      bucket.push(view as EventFeedView & { event: OperationEvent<'agent.relationship_changed'> })
    } else {
      grouped.set(key, [
        view as EventFeedView & { event: OperationEvent<'agent.relationship_changed'> },
      ])
    }
  }

  for (const bucket of grouped.values()) {
    if (bucket.length === 1) {
      output.push(bucket[0])
      continue
    }

    const [first] = bucket
    const deltaTotal = bucket.reduce((sum, entry) => sum + entry.event.payload.delta, 0)
    const uniqueNames = [...new Set(bucket.map((entry) => entry.event.payload.agentName))].sort()
    output.push({
      ...first,
      title: `${uniqueNames.join(' ↔ ')} relationship shift`,
      detail: `Week ${first.week} / ${first.event.payload.reason.replace(/_/g, ' ')} / ${bucket.length} updates / net ${deltaTotal >= 0 ? '+' : ''}${deltaTotal.toFixed(2)}`,
      tone: deltaTotal >= 0 ? 'success' : 'warning',
      searchText: `${first.searchText} relationship summary ${uniqueNames.join(' ')}`.toLowerCase(),
    })
  }

  return output.sort((left, right) => right.event.timestamp.localeCompare(left.event.timestamp))
}
