import { getEquipmentLabel } from '../../domain/equipment'
import {
  getPreparedSupportProcedureState,
  getSignalJammerState,
  getTemporaryConjuredSupportState,
  isPreparedSupportProcedureFamilyHelpful,
  repairSignalJammer,
  resolveSupportLoadoutAffordanceIds,
  type PreparedSupportProcedureFamily,
  type PreparedSupportProcedureStatus,
  type SignalJammerStatus,
  type TemporaryConjuredSupportStatus,
} from '../../domain/supportLoadout'
import type { Agent, GameState, Id } from '../../domain/models'

export type SupportIncidentReferenceMode = 'field-compact'
export type SupportIncidentActionStatus = 'available' | 'blocked' | 'unavailable'
export type SupportIncidentActionSource = 'prepared-support' | 'runtime-tool' | 'temporary-support'

export interface SupportIncidentActionView {
  id: string
  label: string
  status: SupportIncidentActionStatus
  source: SupportIncidentActionSource
  cause?: string
}

export interface SupportIncidentPreparedProcedureView {
  family?: PreparedSupportProcedureFamily
  familyLabel: string
  status: PreparedSupportProcedureStatus
  statusLabel: string
  itemLabel: string
  reserveStock: number
  refresh: SupportIncidentActionView
}

export interface SupportIncidentRuntimeView {
  label: string
  status: string
}

export interface SupportIncidentAgentReferenceView {
  agentId: Id
  agentName: string
  roleLabel: string
  prepared: SupportIncidentPreparedProcedureView
  runtime: SupportIncidentRuntimeView[]
  actions: SupportIncidentActionView[]
  warnings: string[]
}

export interface SupportIncidentReferenceView {
  encounterId: string
  encounterTitle: string
  mode: SupportIncidentReferenceMode
  scopeLabel: string
  summary: string
  inspectedAgentCount: number
  hiddenAgentCount: number
  rows: SupportIncidentAgentReferenceView[]
  blockedActions: SupportIncidentActionView[]
  warnings: string[]
}

export interface SupportIncidentReferenceOptions {
  agentIds?: Id[]
  teamIds?: Id[]
  scopeLabel?: string
  maxRows?: number
  maxWarnings?: number
  maxBlockedActions?: number
}

const SUPPORT_REFERENCE_AGENT_ROLES = new Set([
  'investigator',
  'medium',
  'medic',
  'negotiator',
  'occultist',
  'tech',
])

const DEFAULT_MAX_ROWS = 4
const DEFAULT_MAX_WARNINGS = 3
const DEFAULT_MAX_BLOCKED_ACTIONS = 3

function uniqueStable(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.length > 0))]
}

function getTeamAgentIds(state: GameState, teamIds: readonly Id[]) {
  return teamIds.flatMap((teamId) => {
    const team = state.teams[teamId]
    if (!team) {
      return []
    }

    return team.memberIds ?? team.agentIds
  })
}

function getReferenceAgentIds(
  state: GameState,
  encounterId: string,
  options: SupportIncidentReferenceOptions
) {
  if (options.agentIds && options.agentIds.length > 0) {
    return uniqueStable(options.agentIds)
  }

  if (options.teamIds && options.teamIds.length > 0) {
    return uniqueStable(getTeamAgentIds(state, options.teamIds))
  }

  const assignedTeamIds = state.cases[encounterId]?.assignedTeamIds ?? []
  return uniqueStable(getTeamAgentIds(state, assignedTeamIds))
}

function getRoleLabel(role: string) {
  return role.replace(/_/g, ' ')
}

function getFamilyLabel(family: PreparedSupportProcedureFamily | undefined) {
  if (family === 'medical') {
    return 'Medical'
  }

  if (family === 'containment') {
    return 'Containment'
  }

  return 'None'
}

function getPreparedStatusLabel(status: PreparedSupportProcedureStatus) {
  if (status === 'prepared') {
    return 'Prepared'
  }

  if (status === 'expended') {
    return 'Expended'
  }

  return 'Unavailable'
}

function getSignalJammerStatusLabel(status: SignalJammerStatus) {
  if (status === 'functional') {
    return 'Functional'
  }

  if (status === 'jammed') {
    return 'Jammed'
  }

  return 'Unavailable'
}

function getTemporarySupportStatusLabel(status: TemporaryConjuredSupportStatus) {
  if (status === 'active') {
    return 'Active'
  }

  if (status === 'expired') {
    return 'Expired'
  }

  return 'Not spawned'
}

function getReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    'already-active': 'Temporary support is already active.',
    'already-expired': 'Temporary support already expired.',
    'already-expended': 'Prepared support is already expended.',
    'expended-in-encounter': 'Already expended in this encounter.',
    expired: 'Temporary support expired.',
    'missing-agent': 'Agent record is missing.',
    'missing-capability': 'Operator lacks tech, investigator, or signal repair capability.',
    'missing-repair-support-item': 'Missing EMF sensors in Utility 2.',
    'no-prepared-support-loadout': 'Utility 1 has no prepared support procedure.',
    'no-reserve-stock': 'No reserve stock remains.',
    'no-signal-jammer-loadout': 'Utility 1 has no signal jammer.',
    'not-active': 'Temporary support has not been spawned.',
    'not-expended': 'Only expended procedures can be refreshed.',
    'prepared-in-encounter': 'Prepared for this encounter.',
    repaired: 'Repair support is ready.',
    refreshed: 'Reserve stock can refresh this procedure.',
    spawned: 'Temporary support can be spawned.',
    'signal-jammer-functional': 'Signal jammer is functional.',
    'signal-jammer-jammed': 'Signal jammer is jammed.',
    'temporary-conjured-item-active': 'Temporary ward is active.',
    'temporary-conjured-item-expired': 'Temporary ward expired.',
    'temporary-conjured-item-not-spawned': 'Temporary ward has not been spawned.',
    unavailable: 'Required support item is unavailable.',
    'unsupported-prepared-support-item': 'Utility 1 item is not a prepared support procedure.',
    'unsupported-signal-jammer-item': 'Utility 1 item is not a signal jammer.',
    'unsupported-temporary-conjured-item': 'Utility 1 item is not temporary conjured support.',
  }

  return labels[reason] ?? reason.replace(/-/g, ' ')
}

function getFirstReasonLabel(reasons: readonly string[], fallback: string) {
  return reasons.length > 0 ? getReasonLabel(reasons[0]!) : fallback
}

function buildUnavailableAction(
  id: string,
  label: string,
  source: SupportIncidentActionSource,
  cause: string
): SupportIncidentActionView {
  return {
    id,
    label,
    status: 'unavailable',
    source,
    cause,
  }
}

function buildRefreshAction(
  encounterId: string,
  agentId: Id,
  familyLabel: string,
  supportState: ReturnType<typeof getPreparedSupportProcedureState>
): SupportIncidentActionView {
  const id = `prepared-refresh:${encounterId}:${agentId}`
  const label =
    familyLabel === 'None'
      ? 'Refresh prepared support'
      : `Refresh ${familyLabel.toLowerCase()} support`

  if (supportState.status === 'expended' && supportState.reserveStock > 0) {
    return {
      id,
      label,
      status: 'available',
      source: 'prepared-support',
      cause: getReasonLabel('refreshed'),
    }
  }

  if (supportState.status === 'expended') {
    return buildUnavailableAction(id, label, 'prepared-support', getReasonLabel('no-reserve-stock'))
  }

  if (supportState.status === 'prepared') {
    return buildUnavailableAction(id, label, 'prepared-support', getReasonLabel('not-expended'))
  }

  return buildUnavailableAction(
    id,
    label,
    'prepared-support',
    getFirstReasonLabel(supportState.reasons, getReasonLabel('unavailable'))
  )
}

function buildPreparedActions(
  encounterId: string,
  agentId: Id,
  supportState: ReturnType<typeof getPreparedSupportProcedureState>
) {
  const familyLabel = getFamilyLabel(supportState.family)
  const actions: SupportIncidentActionView[] = []

  if (supportState.status === 'prepared' && supportState.family) {
    actions.push({
      id: `prepared-apply:${encounterId}:${agentId}`,
      label: `Apply ${familyLabel.toLowerCase()} support`,
      status: 'available',
      source: 'prepared-support',
    })
  } else {
    actions.push(
      buildUnavailableAction(
        `prepared-apply:${encounterId}:${agentId}`,
        supportState.family
          ? `Apply ${familyLabel.toLowerCase()} support`
          : 'Apply prepared support',
        'prepared-support',
        supportState.status === 'expended'
          ? getReasonLabel('already-expended')
          : getFirstReasonLabel(supportState.reasons, getReasonLabel('unavailable'))
      )
    )
  }

  actions.push(buildRefreshAction(encounterId, agentId, familyLabel, supportState))
  return actions
}

function buildSignalJammerActions(
  state: GameState,
  encounterId: string,
  agentId: Id,
  status: SignalJammerStatus
): SupportIncidentActionView[] {
  if (status === 'functional') {
    return [
      {
        id: `signal-jammer-jam:${encounterId}:${agentId}`,
        label: 'Jam hostile signal',
        status: 'available',
        source: 'runtime-tool',
      },
    ]
  }

  if (status !== 'jammed') {
    return []
  }

  const repairAffordance = resolveSupportLoadoutAffordanceIds(state, encounterId, agentId).includes(
    'support-loadout:signal-jammers:repair'
  )

  if (repairAffordance) {
    return [
      {
        id: `signal-jammer-repair:${encounterId}:${agentId}`,
        label: 'Repair signal jammer',
        status: 'available',
        source: 'runtime-tool',
      },
    ]
  }

  const repairAttempt = repairSignalJammer(state, encounterId, agentId)
  return [
    {
      id: `signal-jammer-repair:${encounterId}:${agentId}`,
      label: 'Repair signal jammer',
      status: 'blocked',
      source: 'runtime-tool',
      cause: getReasonLabel(repairAttempt.reason),
    },
  ]
}

function buildTemporarySupportActions(
  encounterId: string,
  agentId: Id,
  status: TemporaryConjuredSupportStatus
): SupportIncidentActionView[] {
  if (status === 'active') {
    return [
      {
        id: `temporary-support-use:${encounterId}:${agentId}`,
        label: 'Use temporary ward',
        status: 'available',
        source: 'temporary-support',
      },
    ]
  }

  if (status === 'expired') {
    return [
      buildUnavailableAction(
        `temporary-support-use:${encounterId}:${agentId}`,
        'Use temporary ward',
        'temporary-support',
        getReasonLabel('expired')
      ),
    ]
  }

  return [
    {
      id: `temporary-support-spawn:${encounterId}:${agentId}`,
      label: 'Spawn temporary ward',
      status: 'available',
      source: 'temporary-support',
    },
  ]
}

function shouldInspectAgent(
  agent: Agent,
  supportState: ReturnType<typeof getPreparedSupportProcedureState>,
  signalItemId: string | undefined,
  temporaryItemId: string | undefined
) {
  return (
    supportState.status !== 'unavailable' ||
    Boolean(signalItemId) ||
    Boolean(temporaryItemId) ||
    SUPPORT_REFERENCE_AGENT_ROLES.has(agent.role)
  )
}

function buildAgentReference(
  state: GameState,
  encounterId: string,
  agent: Agent
): SupportIncidentAgentReferenceView | null {
  const supportState = getPreparedSupportProcedureState(state, encounterId, agent.id)
  const signalState = getSignalJammerState(state, encounterId, agent.id)
  const temporaryState = getTemporaryConjuredSupportState(state, encounterId, agent.id)
  const signalItemId = signalState.itemId === 'signal_jammers' ? signalState.itemId : undefined
  const temporaryItemId =
    temporaryState.itemId === 'warding_kits' ? temporaryState.itemId : undefined

  if (!shouldInspectAgent(agent, supportState, signalItemId, temporaryItemId)) {
    return null
  }

  const familyLabel = getFamilyLabel(supportState.family)
  const runtime: SupportIncidentRuntimeView[] = []
  const actions = buildPreparedActions(encounterId, agent.id, supportState)
  const warnings: string[] = []

  if (supportState.family && supportState.status === 'prepared') {
    const helpful = isPreparedSupportProcedureFamilyHelpful(state, encounterId, supportState.family)
    if (!helpful) {
      warnings.push(`${familyLabel} support is prepared, but this incident is likely a poor fit.`)
    }
  }

  if (supportState.status === 'expended' && supportState.reserveStock <= 0) {
    warnings.push(`${familyLabel} support is expended and cannot refresh from reserve stock.`)
  }

  if (signalItemId) {
    runtime.push({
      label: getEquipmentLabel(signalItemId),
      status: getSignalJammerStatusLabel(signalState.status),
    })
    actions.push(...buildSignalJammerActions(state, encounterId, agent.id, signalState.status))

    if (signalState.status === 'jammed') {
      warnings.push('Signal jammer is jammed; repair status affects live comms options.')
    }
  }

  if (temporaryItemId) {
    runtime.push({
      label: getEquipmentLabel(temporaryItemId),
      status: getTemporarySupportStatusLabel(temporaryState.status),
    })
    actions.push(...buildTemporarySupportActions(encounterId, agent.id, temporaryState.status))

    if (temporaryState.status === 'expired') {
      warnings.push('Temporary ward is expired; do not count it as live protection.')
    }
  }

  const blockedRepair = actions.find(
    (action) => action.id.startsWith('signal-jammer-repair') && action.status !== 'available'
  )
  if (blockedRepair?.cause) {
    warnings.push(`Signal repair blocked: ${blockedRepair.cause}`)
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    roleLabel: getRoleLabel(agent.role),
    prepared: {
      ...(supportState.family ? { family: supportState.family } : {}),
      familyLabel,
      status: supportState.status,
      statusLabel: getPreparedStatusLabel(supportState.status),
      itemLabel: supportState.itemId ? getEquipmentLabel(supportState.itemId) : 'No prepared item',
      reserveStock: supportState.reserveStock,
      refresh: buildRefreshAction(encounterId, agent.id, familyLabel, supportState),
    },
    runtime,
    actions,
    warnings: uniqueStable(warnings),
  }
}

function isActionBlocked(action: SupportIncidentActionView) {
  return action.status === 'blocked' || action.status === 'unavailable'
}

function getBlockedActionPriority(action: SupportIncidentActionView) {
  const statusPriority = action.status === 'blocked' ? 0 : 1
  const sourcePriority =
    action.source === 'runtime-tool' ? 0 : action.source === 'prepared-support' ? 1 : 2
  return statusPriority * 10 + sourcePriority
}

function buildPanelWarnings(rows: SupportIncidentAgentReferenceView[], hiddenAgentCount: number) {
  const rowWarnings = rows.flatMap((row) =>
    row.warnings.map((warning) => `${row.agentName}: ${warning}`)
  )
  const anyPreparedSupport = rows.some((row) => row.prepared.status === 'prepared')
  const anyAvailableRefresh = rows.some((row) => row.prepared.refresh.status === 'available')
  const anyBlockedAction = rows.some((row) => row.actions.some(isActionBlocked))
  const warnings = [...rowWarnings]

  if (!anyPreparedSupport && !anyAvailableRefresh) {
    warnings.push(
      'No ready prepared support or refresh reserve is visible in this incident package.'
    )
  }

  if (anyBlockedAction) {
    warnings.push(
      'At least one support action is blocked or unavailable; check causes before launch.'
    )
  }

  if (hiddenAgentCount > 0) {
    warnings.push(
      `${hiddenAgentCount} additional support candidate(s) hidden to preserve compact view.`
    )
  }

  return uniqueStable(warnings)
}

function buildSummary(
  rows: SupportIncidentAgentReferenceView[],
  blockedActions: SupportIncidentActionView[]
) {
  if (rows.length === 0) {
    return 'No support runtime carriers are visible for this incident package.'
  }

  const availableCount = rows
    .flatMap((row) => row.actions)
    .filter((action) => action.status === 'available').length
  return `${rows.length} support reference row${rows.length === 1 ? '' : 's'} / ${availableCount} available action${availableCount === 1 ? '' : 's'} / ${blockedActions.length} blocked or unavailable.`
}

export function selectSupportIncidentReferenceView(
  state: GameState,
  encounterId: string,
  options: SupportIncidentReferenceOptions = {}
): SupportIncidentReferenceView {
  const maxRows = Math.max(1, Math.trunc(options.maxRows ?? DEFAULT_MAX_ROWS))
  const maxWarnings = Math.max(1, Math.trunc(options.maxWarnings ?? DEFAULT_MAX_WARNINGS))
  const maxBlockedActions = Math.max(
    1,
    Math.trunc(options.maxBlockedActions ?? DEFAULT_MAX_BLOCKED_ACTIONS)
  )
  const caseData = state.cases[encounterId]
  const agentIds = getReferenceAgentIds(state, encounterId, options)
  const allRows = agentIds
    .map((agentId) => state.agents[agentId])
    .filter((agent): agent is Agent => Boolean(agent))
    .map((agent) => buildAgentReference(state, encounterId, agent))
    .filter((row): row is SupportIncidentAgentReferenceView => Boolean(row))
  const rows = allRows.slice(0, maxRows)
  const hiddenAgentCount = Math.max(0, allRows.length - rows.length)
  const blockedActions = rows
    .flatMap((row) => row.actions)
    .filter(isActionBlocked)
    .sort(
      (left, right) =>
        getBlockedActionPriority(left) - getBlockedActionPriority(right) ||
        left.label.localeCompare(right.label)
    )
    .slice(0, maxBlockedActions)
  const warnings = buildPanelWarnings(rows, hiddenAgentCount).slice(0, maxWarnings)

  return {
    encounterId,
    encounterTitle: caseData?.title ?? encounterId,
    mode: 'field-compact',
    scopeLabel: options.scopeLabel ?? 'Incident package',
    summary: buildSummary(rows, blockedActions),
    inspectedAgentCount: agentIds.length,
    hiddenAgentCount,
    rows,
    blockedActions,
    warnings,
  }
}
