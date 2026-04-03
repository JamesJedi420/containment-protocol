import {
  readEnumParam,
  readStringParam,
  writeEnumParam,
  writeStringParam,
} from '../../app/searchParams'
import { APP_ROUTES } from '../../app/routes'
import { type GameState, type InstructorData, type StatKey } from '../../domain/models'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../../domain/teamSimulation'
import { getInstructorBonus } from '../../domain/sim/instructorAssignment'
import {
  getTrainingCancelRefund,
  getTrainingFatigueSchedule,
  getTrainingIncurredFatigue,
  getTrainingProjectedTotalFatigue,
} from '../../domain/sim/training'

export const TRAINING_READINESS_FILTERS = [
  'all',
  'ready',
  'training',
  'deployed',
  'inactive',
] as const
export const TRAINING_QUEUE_SCOPE_FILTERS = ['all', 'agent', 'team'] as const
export const TRAINING_SORT_FILTERS = ['readiness', 'name', 'fatigue'] as const

export type TrainingReadinessFilter = (typeof TRAINING_READINESS_FILTERS)[number]
export type TrainingQueueScopeFilter = (typeof TRAINING_QUEUE_SCOPE_FILTERS)[number]
export type TrainingSortFilter = (typeof TRAINING_SORT_FILTERS)[number]

export interface TrainingListFilters {
  q: string
  readiness: TrainingReadinessFilter
  queueScope: TrainingQueueScopeFilter
  sort: TrainingSortFilter
}

export const DEFAULT_TRAINING_LIST_FILTERS: TrainingListFilters = {
  q: '',
  readiness: 'all',
  queueScope: 'all',
  sort: 'readiness',
}

export interface TrainingRosterView {
  agent: GameState['agents'][string]
  teamName?: string
  assignedCaseTitle?: string
  queueEntry?: GameState['trainingQueue'][number]
  readiness: 'ready' | 'training' | 'deployed' | 'inactive'
  readinessLabel: string
  readinessReasons: string[]
  agentLink: string
  canTrain: boolean
  assignedInstructorId?: string
  assignedInstructorName?: string
  instructorBonus?: number
  instructorSpecialty?: StatKey
}

export interface TeamTrainingView {
  team: GameState['teams'][string]
  memberNames: string[]
  memberCount: number
  strongestBondPairLabel?: string
  strongestBondDepth: number
  totalBondDepth: number
  assignedCaseTitle?: string
  queueEntries: GameState['trainingQueue']
  readiness: 'ready' | 'training' | 'deployed' | 'inactive' | 'undersized'
  readinessLabel: string
  readinessReasons: string[]
  teamLink: string
  canTrain: boolean
}

export interface TrainingQueueView {
  entry: GameState['trainingQueue'][number]
  entries: GameState['trainingQueue']
  scope: 'agent' | 'team'
  progressPercent: number
  subjectLabel: string
  subjectLink?: string
  detailLabel: string
  remainingLabel: string
  incurredFatigueLabel: string
  cancelRefundLabel: string
  fatigueScheduleLabel: string
  assignedInstructorId?: string
  assignedInstructorName?: string
  instructorBonus?: number
}

export interface TrainingSummary {
  totalAgents: number
  readyAgents: number
  trainingAgents: number
  deployedAgents: number
  inactiveAgents: number
  activeQueue: number
  readyTeams: number
  teamDrills: number
}

export function readTrainingListFilters(searchParams: URLSearchParams): TrainingListFilters {
  return {
    q: readStringParam(searchParams, 'q'),
    readiness: readEnumParam(
      searchParams,
      'readiness',
      TRAINING_READINESS_FILTERS,
      DEFAULT_TRAINING_LIST_FILTERS.readiness
    ),
    queueScope: readEnumParam(
      searchParams,
      'queueScope',
      TRAINING_QUEUE_SCOPE_FILTERS,
      DEFAULT_TRAINING_LIST_FILTERS.queueScope
    ),
    sort: readEnumParam(
      searchParams,
      'sort',
      TRAINING_SORT_FILTERS,
      DEFAULT_TRAINING_LIST_FILTERS.sort
    ),
  }
}

export function writeTrainingListFilters(
  filters: TrainingListFilters,
  baseSearchParams?: URLSearchParams
) {
  const nextSearchParams = new URLSearchParams(baseSearchParams)

  writeStringParam(nextSearchParams, 'q', filters.q)
  writeEnumParam(
    nextSearchParams,
    'readiness',
    filters.readiness,
    DEFAULT_TRAINING_LIST_FILTERS.readiness
  )
  writeEnumParam(
    nextSearchParams,
    'queueScope',
    filters.queueScope,
    DEFAULT_TRAINING_LIST_FILTERS.queueScope
  )
  writeEnumParam(nextSearchParams, 'sort', filters.sort, DEFAULT_TRAINING_LIST_FILTERS.sort)

  return nextSearchParams
}

function groupTrainingQueueEntries(game: GameState) {
  const grouped = new Map<string, GameState['trainingQueue']>()

  for (const entry of game.trainingQueue) {
    const key = entry.drillGroupId ?? entry.id
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  return [...grouped.values()]
}

export function getTrainingSummary(game: GameState): TrainingSummary {
  const roster = getTrainingRosterViews(game)
  const teams = getTeamTrainingViews(game)

  return {
    totalAgents: roster.length,
    readyAgents: roster.filter((view) => view.readiness === 'ready').length,
    trainingAgents: roster.filter((view) => view.readiness === 'training').length,
    deployedAgents: roster.filter((view) => view.readiness === 'deployed').length,
    inactiveAgents: roster.filter((view) => view.readiness === 'inactive').length,
    activeQueue: groupTrainingQueueEntries(game).length,
    readyTeams: teams.filter((view) => view.readiness === 'ready').length,
    teamDrills: groupTrainingQueueEntries(game).filter((entries) => (entries[0]?.scope ?? 'agent') === 'team').length,
  }
}

export function getTrainingQueueViews(game: GameState): TrainingQueueView[] {
  // Build a lookup: agentId → instructor record for O(1) access in the map below.
  const instructorByAgentId = new Map<string, { staffId: string; record: InstructorData }>()
  for (const [staffId, record] of Object.entries(game.staff)) {
    if (record.role === 'instructor' && (record as InstructorData).assignedAgentId) {
      const typed = record as InstructorData
      instructorByAgentId.set(typed.assignedAgentId!, { staffId, record: typed })
    }
  }

  return groupTrainingQueueEntries(game)
    .sort((left, right) => {
      const leftEntry = left[0]!
      const rightEntry = right[0]!

      return (
        leftEntry.remainingWeeks - rightEntry.remainingWeeks ||
        leftEntry.trainingName.localeCompare(rightEntry.trainingName) ||
        leftEntry.agentName.localeCompare(rightEntry.agentName)
      )
    })
    .map((entries) => {
      const entry = entries[0]!
      const scope = entry.scope ?? 'agent'
      const progressPercent =
        entry.durationWeeks > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(((entry.durationWeeks - entry.remainingWeeks) / entry.durationWeeks) * 100)
              )
            )
          : 100

      if (scope === 'team') {
        return {
          entry,
          entries,
          scope,
          progressPercent,
          subjectLabel: entry.teamName ?? 'Team drill',
          subjectLink: entry.teamId ? APP_ROUTES.teamDetail(entry.teamId) : undefined,
          detailLabel: `${entries.length} agent${entries.length === 1 ? '' : 's'} / ${entry.trainingName}`,
          remainingLabel: `${entry.remainingWeeks} week${entry.remainingWeeks === 1 ? '' : 's'} remaining`,
          incurredFatigueLabel: `Fatigue incurred +${getTrainingIncurredFatigue(entry)} / +${getTrainingProjectedTotalFatigue(entry)}`,
          cancelRefundLabel: `Cancel refund $${getTrainingCancelRefund(entry)}`,
          fatigueScheduleLabel: `Week schedule: ${getTrainingFatigueSchedule(entry).map((n) => `+${n}`).join(', ')}`,
        }
      }

      const instructorEntry = instructorByAgentId.get(entry.agentId)
      return {
        entry,
        entries,
        scope,
        progressPercent,
        subjectLabel: entry.agentName,
        subjectLink: APP_ROUTES.agentDetail(entry.agentId),
        detailLabel: entry.trainingName,
        remainingLabel: `${entry.remainingWeeks} week${entry.remainingWeeks === 1 ? '' : 's'} remaining`,
        incurredFatigueLabel: `Fatigue incurred +${getTrainingIncurredFatigue(entry)} / +${getTrainingProjectedTotalFatigue(entry)}`,
        cancelRefundLabel: `Cancel refund $${getTrainingCancelRefund(entry)}`,          fatigueScheduleLabel: `Week schedule: ${getTrainingFatigueSchedule(entry).map((n) => `+${n}`).join(', ')}`,        assignedInstructorId: instructorEntry?.staffId,
        assignedInstructorName: instructorEntry?.record.name,
        instructorBonus: instructorEntry
          ? instructorEntry.record.instructorSpecialty === entry.targetStat
            ? getInstructorBonus(instructorEntry.record.efficiency)
            : 0
          : undefined,
      }
    })
}

export function getTrainingRosterViews(game: GameState): TrainingRosterView[] {
  const teamByAgentId = new Map<string, { teamName: string; assignedCaseTitle?: string }>()

  for (const team of Object.values(game.teams)) {
    const assignedCaseId = getTeamAssignedCaseId(team)
    const assignedCaseTitle = assignedCaseId ? game.cases[assignedCaseId]?.title : undefined

    for (const agentId of getTeamMemberIds(team)) {
      teamByAgentId.set(agentId, {
        teamName: team.name,
        assignedCaseTitle,
      })
    }
  }

  // Build a lookup: agentId → instructor record
  const instructorByAgentId = new Map<string, { staffId: string; record: InstructorData }>()
  for (const [staffId, record] of Object.entries(game.staff)) {
    if (record.role === 'instructor' && (record as InstructorData).assignedAgentId) {
      const typed = record as InstructorData
      instructorByAgentId.set(typed.assignedAgentId!, { staffId, record: typed })
    }
  }

  return Object.values(game.agents)
    .map((agent) => {
      const teamState = teamByAgentId.get(agent.id)
      const queueEntry = game.trainingQueue.find((entry) => entry.agentId === agent.id)
      const readiness = getAgentReadiness(agent.status, queueEntry, teamState?.assignedCaseTitle)
      const instructorEntry = instructorByAgentId.get(agent.id)

      return {
        agent,
        teamName: teamState?.teamName,
        assignedCaseTitle: teamState?.assignedCaseTitle,
        queueEntry,
        readiness,
        readinessLabel: getAgentReadinessLabel(readiness),
        readinessReasons: getAgentReadinessReasons(
          agent.status,
          queueEntry,
          teamState?.assignedCaseTitle
        ),
        agentLink: APP_ROUTES.agentDetail(agent.id),
        canTrain: readiness === 'ready',
        assignedInstructorId: instructorEntry?.staffId,
        assignedInstructorName: instructorEntry?.record.name,
        instructorBonus: instructorEntry
          ? queueEntry && instructorEntry.record.instructorSpecialty === queueEntry.targetStat
            ? getInstructorBonus(instructorEntry.record.efficiency)
            : 0
          : undefined,
        instructorSpecialty: instructorEntry?.record.instructorSpecialty,
      }
    })
    .sort((left, right) => {
      const order = readinessRank(right.readiness) - readinessRank(left.readiness)
      if (order !== 0) {
        return order
      }

      return (
        right.agent.fatigue - left.agent.fatigue || left.agent.name.localeCompare(right.agent.name)
      )
    })
}

export function getTeamTrainingViews(game: GameState): TeamTrainingView[] {
  return Object.values(game.teams)
    .map((team) => {
      const memberIds = getTeamMemberIds(team)
      const members = memberIds
        .map((agentId) => game.agents[agentId])
        .filter((agent): agent is GameState['agents'][string] => Boolean(agent))
      const assignedCaseId = getTeamAssignedCaseId(team)
      const assignedCaseTitle = assignedCaseId ? game.cases[assignedCaseId]?.title : undefined
      const queueEntries = game.trainingQueue.filter(
        (entry) => entry.teamId === team.id || memberIds.includes(entry.agentId)
      )
      const readiness = getTeamReadiness(members, queueEntries, assignedCaseTitle)
      const bondSummary = getTeamBondSummary(members)

      return {
        team,
        memberNames: members.map((agent) => agent.name),
        memberCount: members.length,
        strongestBondPairLabel: bondSummary.strongestBondPairLabel,
        strongestBondDepth: bondSummary.strongestBondDepth,
        totalBondDepth: bondSummary.totalBondDepth,
        assignedCaseTitle,
        queueEntries,
        readiness,
        readinessLabel: getTeamReadinessLabel(readiness),
        readinessReasons: getTeamReadinessReasons(members, queueEntries, assignedCaseTitle),
        teamLink: APP_ROUTES.teamDetail(team.id),
        canTrain: readiness === 'ready',
      }
    })
    .sort((left, right) => {
      const order = readinessRank(right.readiness) - readinessRank(left.readiness)
      if (order !== 0) {
        return order
      }

      return left.team.name.localeCompare(right.team.name)
    })
}

function getTeamBondSummary(members: GameState['agents'][string][]) {
  let strongestBondDepth = 0
  let strongestBondPairLabel: string | undefined
  let totalBondDepth = 0

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const left = members[i]!
      const right = members[j]!
      const leftBond = left.progression?.skillTree?.trainedRelationships?.[right.id] ?? 0
      const rightBond = right.progression?.skillTree?.trainedRelationships?.[left.id] ?? 0
      const pairBondDepth = (leftBond + rightBond) / 2

      totalBondDepth += pairBondDepth

      if (pairBondDepth > strongestBondDepth) {
        strongestBondDepth = pairBondDepth
        strongestBondPairLabel = `${left.name} ↔ ${right.name}`
      }
    }
  }

  return {
    strongestBondPairLabel,
    strongestBondDepth: Number(strongestBondDepth.toFixed(1)),
    totalBondDepth: Number(totalBondDepth.toFixed(1)),
  }
}

function getAgentReadiness(
  status: GameState['agents'][string]['status'],
  queueEntry: GameState['trainingQueue'][number] | undefined,
  assignedCaseTitle: string | undefined
): TrainingRosterView['readiness'] {
  if (queueEntry) {
    return 'training'
  }

  if (status !== 'active') {
    return 'inactive'
  }

  if (assignedCaseTitle) {
    return 'deployed'
  }

  return 'ready'
}

function getAgentReadinessLabel(readiness: TrainingRosterView['readiness']) {
  if (readiness === 'ready') {
    return 'Ready for training'
  }

  if (readiness === 'training') {
    return 'In training'
  }

  if (readiness === 'deployed') {
    return 'On assignment'
  }

  return 'Unavailable'
}

function getAgentReadinessReasons(
  status: GameState['agents'][string]['status'],
  queueEntry: GameState['trainingQueue'][number] | undefined,
  assignedCaseTitle: string | undefined
) {
  if (queueEntry) {
    return [
      `Already queued for ${queueEntry.trainingName}.`,
      `${queueEntry.remainingWeeks}w remaining.`,
    ]
  }

  if (status !== 'active') {
    return [`Agent status is ${status}.`]
  }

  if (assignedCaseTitle) {
    return [`Currently deployed to ${assignedCaseTitle}.`]
  }

  return ['Available for training now.']
}

function getTeamReadiness(
  members: GameState['agents'][string][],
  queueEntries: GameState['trainingQueue'],
  assignedCaseTitle: string | undefined
): TeamTrainingView['readiness'] {
  if (members.length < 2) {
    return 'undersized'
  }

  if (queueEntries.length > 0) {
    return 'training'
  }

  if (assignedCaseTitle) {
    return 'deployed'
  }

  if (members.some((agent) => agent.status !== 'active')) {
    return 'inactive'
  }

  return 'ready'
}

function getTeamReadinessLabel(readiness: TeamTrainingView['readiness']) {
  if (readiness === 'ready') {
    return 'Ready for drill'
  }

  if (readiness === 'training') {
    return 'Drill in progress'
  }

  if (readiness === 'deployed') {
    return 'On assignment'
  }

  if (readiness === 'undersized') {
    return 'Need more members'
  }

  return 'Unavailable'
}

function getTeamReadinessReasons(
  members: GameState['agents'][string][],
  queueEntries: GameState['trainingQueue'],
  assignedCaseTitle: string | undefined
) {
  if (members.length < 2) {
    return ['Team drills require at least two active members.']
  }

  if (queueEntries.length > 0) {
    const entry = queueEntries[0]!
    return [
      `Already queued for ${entry.trainingName}.`,
      `${entry.remainingWeeks}w remaining.`,
    ]
  }

  if (assignedCaseTitle) {
    return [`Currently deployed to ${assignedCaseTitle}.`]
  }

  if (members.some((agent) => agent.status !== 'active')) {
    return ['All team members must be active before drill queueing.']
  }

  return ['Available for coordinated drills now.']
}

function readinessRank(
  readiness: TrainingRosterView['readiness'] | TeamTrainingView['readiness']
) {
  if (readiness === 'ready') {
    return 4
  }

  if (readiness === 'training') {
    return 3
  }

  if (readiness === 'deployed') {
    return 2
  }

  if (readiness === 'undersized') {
    return 1
  }

  return 0
}

export function getFilteredSortedRoster(
  views: TrainingRosterView[],
  filters: TrainingListFilters
): TrainingRosterView[] {
  const q = filters.q.trim().toLowerCase()

  let result = views

  if (q) {
    result = result.filter((view) => view.agent.name.toLowerCase().includes(q))
  }

  if (filters.readiness !== 'all') {
    result = result.filter((view) => view.readiness === filters.readiness)
  }

  if (filters.sort === 'name') {
    result = [...result].sort((left, right) =>
      left.agent.name.localeCompare(right.agent.name)
    )
  } else if (filters.sort === 'fatigue') {
    result = [...result].sort(
      (left, right) =>
        right.agent.fatigue - left.agent.fatigue ||
        left.agent.name.localeCompare(right.agent.name)
    )
  }
  // 'readiness' sort is already applied by getTrainingRosterViews — no resorting needed

  return result
}

export function getFilteredQueueViews(
  views: TrainingQueueView[],
  filters: TrainingListFilters
): TrainingQueueView[] {
  if (filters.queueScope === 'all') {
    return views
  }

  return views.filter((view) => view.scope === filters.queueScope)
}
