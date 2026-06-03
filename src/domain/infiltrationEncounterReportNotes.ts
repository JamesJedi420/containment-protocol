/**
 * SPE-2250 follow-up: player-facing weekly report copy for infiltration prep and outcomes.
 */

import type { InfiltrationCoverRole } from './infiltrationCover'
import {
  isInfiltrationProbeEligible,
  resolveWeeklyInfiltrationProbeAction,
  type InfiltrationProbeAction,
  type InfiltrationStage,
} from './infiltrationProbe'
import { readInfiltrationWeeklyProbeActionOverride } from './infiltrationProbeOverride'
import type { CaseInstance, Id } from './models'
import { getStealthLeaveBehindById, DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY } from './stealthLeaveBehindRegistry'

export const INFILTRATION_PROBE_ACTION_LABELS: Record<InfiltrationProbeAction, string> = {
  probe_access: 'access probe',
  probe_route: 'route probe',
  cleanup: 'cover cleanup',
}

export const INFILTRATION_COVER_ROLE_LABELS: Record<InfiltrationCoverRole, string> = {
  uniform_guard: 'uniform guard cover',
  civilian_staff: 'civilian staff cover',
  courier: 'courier cover',
  maintenance: 'maintenance cover',
  official_inspector: 'official inspector cover',
}

export const INFILTRATION_STAGE_LABELS: Record<InfiltrationStage, string> = {
  probing: 'probing',
  exposed: 'cover exposed',
  violent: 'violent escalation',
}

/** Deterministic operational detail per weekly probe action (report-facing). */
export const INFILTRATION_PROBE_ENCOUNTER_DETAILS: Record<InfiltrationProbeAction, string> = {
  probe_access: 'Operators exercised badge chains and restricted corridors.',
  probe_route: 'Operators mapped patrol gaps and service routes.',
  cleanup: 'Operators burned back-channel contacts to reduce scrutiny.',
}

/** Observer pressure when infiltration stage is no longer routine probing. */
export const INFILTRATION_STAGE_OBSERVER_CLAUSES: Record<
  Exclude<InfiltrationStage, 'probing'>,
  string
> = {
  exposed: 'Local observers treat the claimed role as doubtful.',
  violent: 'Site security posture shifted toward force response.',
}

/** Role-specific observer friction when cover posture is active. */
export const INFILTRATION_COVER_ROLE_OBSERVER_FRICTION: Record<InfiltrationCoverRole, string> = {
  uniform_guard: 'Checkpoint staff compare badge sequences against shift rosters.',
  civilian_staff: 'Supervisors cross-check staff badges against room assignments.',
  courier: 'Receiving clerks verify delivery manifests against courier credentials.',
  maintenance: 'Facilities leads question tool manifests and work-order timing.',
  official_inspector: 'Site liaisons demand inspection paperwork before granting access.',
}

export type InfiltrationProbeActionSource = 'override' | 'authored' | 'heuristic'

export interface InfiltrationEncounterReportContext {
  readonly probeAction: InfiltrationProbeAction
  readonly probeActionSource: InfiltrationProbeActionSource
  readonly stage: InfiltrationStage
  readonly awareness: number
  readonly probeProgress: number
  readonly coverRole?: InfiltrationCoverRole
  readonly leaveBehindLabel?: string
}

export interface InfiltrationEncounterEventPayload {
  week: number
  caseId: Id
  caseTitle: string
  summary: string
  infiltrationAwareness?: number
  infiltrationProbeProgress?: number
  infiltrationStage?: InfiltrationStage
  probeAction?: InfiltrationProbeAction
  probeActionSource?: InfiltrationProbeActionSource
  coverRole?: InfiltrationCoverRole
  leaveBehindId?: string
  leaveBehindLabel?: string
}

function roundBand(value: number) {
  return Math.round(value * 1000) / 1000
}

export function resolveInfiltrationProbeActionSource(
  caseData: CaseInstance
): InfiltrationProbeActionSource {
  if (readInfiltrationWeeklyProbeActionOverride(caseData) !== undefined) {
    return 'override'
  }

  if (caseData.infiltrationProbePlan !== undefined) {
    return 'authored'
  }

  return 'heuristic'
}

/** Probe action that will run (or ran) this week — mirrors `applyWeeklyInfiltrationProbeTick`. */
export function resolveWeeklyInfiltrationProbeActionUsed(
  caseData: CaseInstance
): InfiltrationProbeAction | undefined {
  if (!isInfiltrationProbeEligible(caseData)) {
    return undefined
  }

  return (
    readInfiltrationWeeklyProbeActionOverride(caseData) ??
    resolveWeeklyInfiltrationProbeAction(caseData)
  )
}

export function readInfiltrationLeaveBehindLabel(caseData: CaseInstance): string | undefined {
  const leaveBehindId = caseData.stealthLeaveBehindId?.trim()
  if (!leaveBehindId) {
    return undefined
  }

  const definition = getStealthLeaveBehindById(
    DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
    leaveBehindId
  )
  return definition?.label
}

export function buildInfiltrationEncounterReportContext(
  caseData: CaseInstance
): InfiltrationEncounterReportContext | undefined {
  const probeAction = resolveWeeklyInfiltrationProbeActionUsed(caseData)
  if (probeAction === undefined) {
    return undefined
  }

  return {
    probeAction,
    probeActionSource: resolveInfiltrationProbeActionSource(caseData),
    stage: caseData.infiltrationStage ?? 'probing',
    awareness: roundBand(caseData.infiltrationAwareness ?? 0),
    probeProgress: roundBand(caseData.infiltrationProbeProgress ?? 0),
    coverRole: caseData.infiltrationCoverProfile?.claimedRole,
    leaveBehindLabel: readInfiltrationLeaveBehindLabel(caseData),
  }
}

function formatProbeActionClause(context: InfiltrationEncounterReportContext) {
  const actionLabel = INFILTRATION_PROBE_ACTION_LABELS[context.probeAction]
  if (context.probeActionSource === 'override') {
    return `Weekly prep selected ${actionLabel} (player override).`
  }

  if (context.probeActionSource === 'authored') {
    return `Authored probe plan ran ${actionLabel} this week.`
  }

  return `Heuristic probe plan ran ${actionLabel} this week.`
}

function formatCoverClause(context: InfiltrationEncounterReportContext) {
  if (context.coverRole === undefined) {
    return ''
  }

  return ` Cover posture: ${INFILTRATION_COVER_ROLE_LABELS[context.coverRole]}.`
}

function formatProbeEncounterDetailClause(context: InfiltrationEncounterReportContext) {
  return ` ${INFILTRATION_PROBE_ENCOUNTER_DETAILS[context.probeAction]}`
}

function formatCoverRoleFrictionClause(context: InfiltrationEncounterReportContext) {
  if (context.coverRole === undefined) {
    return ''
  }

  return ` ${INFILTRATION_COVER_ROLE_OBSERVER_FRICTION[context.coverRole]}`
}

function formatStageObserverClause(context: InfiltrationEncounterReportContext) {
  if (context.stage === 'probing') {
    return ''
  }

  return ` ${INFILTRATION_STAGE_OBSERVER_CLAUSES[context.stage]}`
}

function formatLeaveBehindClause(context: InfiltrationEncounterReportContext) {
  if (!context.leaveBehindLabel) {
    return ''
  }

  return ` Leave-behind tradeoff staged: ${context.leaveBehindLabel}.`
}

function formatTrackClause(context: InfiltrationEncounterReportContext) {
  return ` Tracks at ${Math.round(context.probeProgress * 100)}% probe / ${Math.round(context.awareness * 100)}% awareness (${INFILTRATION_STAGE_LABELS[context.stage]}).`
}

/** Routine weekly encounter line when threshold events did not fire. */
export function formatInfiltrationWeeklyEncounterSummary(
  context: InfiltrationEncounterReportContext
): string {
  return (
    formatProbeActionClause(context) +
    formatProbeEncounterDetailClause(context) +
    formatCoverClause(context) +
    formatCoverRoleFrictionClause(context) +
    formatLeaveBehindClause(context) +
    formatStageObserverClause(context) +
    formatTrackClause(context)
  )
}

/** Prefix for threshold/complication summaries so cover role and prep show in reports. */
export function enrichInfiltrationThresholdSummary(
  baseSummary: string,
  context: InfiltrationEncounterReportContext
): string {
  const prepLead = formatProbeActionClause(context).replace(/\.$/, '')
  const encounterDetail = formatProbeEncounterDetailClause(context).trim()
  return `${prepLead}; ${encounterDetail}; ${baseSummary}${formatCoverClause(context)}${formatCoverRoleFrictionClause(context)}${formatLeaveBehindClause(context)}${formatStageObserverClause(context)}${formatTrackClause(context)}`
}

export function formatInfiltrationLeaveBehindTradeoffSummary(
  leaveBehindLabel: string,
  options?: { custodyLossSummary?: string; scoreAdjustmentReason?: string }
): string {
  const parts = [`Stealth leave-behind applied — ${leaveBehindLabel}.`]

  if (options?.scoreAdjustmentReason && options.scoreAdjustmentReason.length > 0) {
    parts.push(` ${options.scoreAdjustmentReason}`)
  }

  if (options?.custodyLossSummary && options.custodyLossSummary.length > 0) {
    parts.push(` Investigation strain: ${options.custodyLossSummary}`)
  }

  return parts.join('')
}

export function buildInfiltrationEncounterEventPayload(input: {
  week: number
  caseId: Id
  caseTitle: string
  summary: string
  caseData: CaseInstance
  context?: InfiltrationEncounterReportContext
}): InfiltrationEncounterEventPayload {
  const context = input.context ?? buildInfiltrationEncounterReportContext(input.caseData)

  return {
    week: input.week,
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    summary: input.summary,
    infiltrationAwareness: context?.awareness,
    infiltrationProbeProgress: context?.probeProgress,
    infiltrationStage: context?.stage,
    probeAction: context?.probeAction,
    probeActionSource: context?.probeActionSource,
    coverRole: context?.coverRole,
    leaveBehindId: input.caseData.stealthLeaveBehindId,
    leaveBehindLabel: context?.leaveBehindLabel,
  }
}

/** True when weekly probe ticks apply (hidden + infiltration-family tags). */
export function shouldEmitInfiltrationWeeklyEncounterNote(caseData: CaseInstance) {
  return isInfiltrationProbeEligible(caseData)
}

/** Context after a probe tick — uses post-tick tracks and stage on the merged case. */
export function buildInfiltrationEncounterReportContextAfterProbe(
  caseBeforeTick: CaseInstance,
  caseAfterTick: CaseInstance
): InfiltrationEncounterReportContext | undefined {
  const probeAction =
    readInfiltrationWeeklyProbeActionOverride(caseBeforeTick) ??
    resolveWeeklyInfiltrationProbeAction(caseBeforeTick)

  if (!isInfiltrationProbeEligible(caseAfterTick)) {
    return undefined
  }

  return {
    probeAction,
    probeActionSource: resolveInfiltrationProbeActionSource(caseBeforeTick),
    stage: caseAfterTick.infiltrationStage ?? 'probing',
    awareness: roundBand(caseAfterTick.infiltrationAwareness ?? 0),
    probeProgress: roundBand(caseAfterTick.infiltrationProbeProgress ?? 0),
    coverRole: caseAfterTick.infiltrationCoverProfile?.claimedRole,
    leaveBehindLabel: readInfiltrationLeaveBehindLabel(caseAfterTick),
  }
}
