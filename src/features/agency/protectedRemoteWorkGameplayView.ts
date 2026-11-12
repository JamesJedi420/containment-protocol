/**
 * SPE-3501 — Agency Facility Register consumer for protected remote-work cells.
 *
 * Projects durable cells into allowed actions, hazards, blockers, and state
 * changes for the existing Agency surface. Does not invent SPE-100 sampling,
 * SPE-328 remote tools, or a new control-surface framework.
 */

import type { GameState } from '../../domain/models'
import {
  isProtectedRemoteWorkActive,
  parseFacilityProtectedRemoteWorkCells,
  projectExplainableProtectedRemoteWork,
  type ProtectedRemoteWorkExplainability,
  type ProtectedRemoteWorkRecord,
  type ProtectedRemoteWorkStage,
} from '../../domain/protectedRemoteWorkCell'
import {
  OPEN_PROTECTED_REMOTE_WORK_GATES,
  buildProtectedRemoteWorkDemoProcedureAdapter,
  type ProtectedRemoteWorkStepCommand,
} from '../../domain/protectedRemoteWorkCellLivePath'

export const PROTECTED_REMOTE_WORK_GAMEPLAY_COPY = {
  heading: 'Protected remote-work cell',
  explanation:
    'Run an authorized containment-lab sample observation from a protected station against a sealed target zone. The operator stays outside the hazard zone; blockers and exposure routing remain inspectable.',
  empty: 'No protected remote-work cells are recorded.',
  startLabel: 'Start remote sample observation',
  hazardCritical: 'Critical hazard: sealed target zone remains hazardous; spatial separation never clears exposure.',
  nextStepUnavailable: 'No mid-week advance is available for this stage.',
} as const

export type ProtectedRemoteWorkNextStep =
  | 'preflight'
  | 'begin'
  | 'complete'
  | 'resume'
  | 'abort'
  | null

export type ProtectedRemoteWorkGameplayRow = Readonly<{
  workId: string
  stationId: string
  operatorRef: string
  targetRef: string
  targetZoneRef: string
  capabilityTag: string
  stage: ProtectedRemoteWorkStage
  outcome: ProtectedRemoteWorkExplainability['outcome']
  reasonCodes: readonly string[]
  hazards: readonly string[]
  blockers: readonly string[]
  allowedActions: readonly ProtectedRemoteWorkNextStep[]
  nextStep: ProtectedRemoteWorkNextStep
  nextStepLabel: string
  active: boolean
  exposureCleared: boolean
}>

export type ProtectedRemoteWorkGameplayView = Readonly<{
  rows: readonly ProtectedRemoteWorkGameplayRow[]
  canStart: boolean
}>

export type ProtectedRemoteWorkStartRequest = Readonly<{
  workId: string
  stationId: string
  operatorRef: string
  operatorNodeId: string
  targetZoneRef: string
  targetRef: string
  capabilityTag: string
  operationKey: string
  executionKey: string
}>

function defaultStart(week: number): ProtectedRemoteWorkStartRequest {
  const safeWeek =
    typeof week === 'number' && Number.isFinite(week) && week >= 0 ? Math.trunc(week) : 0
  return Object.freeze({
    workId: `rw-agency-${safeWeek}`,
    stationId: 'station:glovebox-agency',
    operatorRef: 'operative:lab-tech-agency',
    operatorNodeId: 'room:observation_booth',
    targetZoneRef: 'zone:containment_lab',
    targetRef: 'sample:andromeda-fragment',
    capabilityTag: 'sample_observe',
    operationKey: `op-agency-create-w${safeWeek}`,
    executionKey: `exec-remote-lab-agency-w${safeWeek}`,
  })
}

export function getDefaultProtectedRemoteWorkStartRequest(
  week: number
): ProtectedRemoteWorkStartRequest {
  return defaultStart(week)
}

function nextStepFor(stage: ProtectedRemoteWorkStage): ProtectedRemoteWorkNextStep {
  switch (stage) {
    case 'requested':
    case 'blocked':
      return 'preflight'
    case 'authorized':
      return 'begin'
    case 'in_progress':
      return 'complete'
    case 'held':
      return 'resume'
    case 'completed':
    case 'failed':
    case 'aborted':
      return null
    default: {
      const _exhaustive: never = stage
      void _exhaustive
      return null
    }
  }
}

function allowedActionsFor(stage: ProtectedRemoteWorkStage): readonly ProtectedRemoteWorkNextStep[] {
  switch (stage) {
    case 'requested':
    case 'blocked':
      return Object.freeze(['preflight', 'abort'])
    case 'authorized':
      return Object.freeze(['begin', 'abort'])
    case 'in_progress':
      return Object.freeze(['complete'])
    case 'held':
      return Object.freeze(['resume', 'abort'])
    case 'completed':
    case 'failed':
    case 'aborted':
      return Object.freeze([])
    default: {
      const _exhaustive: never = stage
      void _exhaustive
      return Object.freeze([])
    }
  }
}

function nextStepLabel(step: ProtectedRemoteWorkNextStep): string {
  switch (step) {
    case 'preflight':
      return 'Run station preflight'
    case 'begin':
      return 'Begin remote procedure'
    case 'complete':
      return 'Complete remote work'
    case 'resume':
      return 'Resume held work'
    case 'abort':
      return 'Abort remote work'
    case null:
      return PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.nextStepUnavailable
    default: {
      const _exhaustive: never = step
      void _exhaustive
      return PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.nextStepUnavailable
    }
  }
}

function hazardsFor(work: ProtectedRemoteWorkRecord): readonly string[] {
  const hazards: string[] = [PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.hazardCritical]
  if (work.reasonCodes.includes('barrier_degraded') || work.reasonCodes.includes('exposure_routed')) {
    hazards.push('Barrier degradation may route exposure to the canonical exposure owner.')
  }
  if (work.reasonCodes.includes('integrity_degraded')) {
    hazards.push('Station or barrier integrity is degraded.')
  }
  return Object.freeze(hazards)
}

export function buildCreateProtectedRemoteWorkCommand(
  request: ProtectedRemoteWorkStartRequest = defaultStart(0)
): ProtectedRemoteWorkStepCommand {
  return {
    kind: 'create',
    workId: request.workId,
    stationId: request.stationId,
    operatorRef: request.operatorRef,
    operatorNodeId: request.operatorNodeId,
    targetZoneRef: request.targetZoneRef,
    targetRef: request.targetRef,
    capabilityTag: request.capabilityTag,
    operationKey: request.operationKey,
  }
}

export function buildNextProtectedRemoteWorkCommand(
  work: ProtectedRemoteWorkRecord,
  week: number
): ProtectedRemoteWorkStepCommand | undefined {
  const start = defaultStart(week)
  const step = nextStepFor(work.stage)
  switch (step) {
    case 'preflight':
      return {
        kind: 'preflight',
        workId: work.workId,
        operationKey: `op-agency-preflight-${work.workId}`,
        gates: OPEN_PROTECTED_REMOTE_WORK_GATES,
        procedureAdapter: buildProtectedRemoteWorkDemoProcedureAdapter(start.executionKey),
        authorizationRef: `auth:agency-${work.workId}`,
      }
    case 'begin':
      return {
        kind: 'begin',
        workId: work.workId,
        operationKey: `op-agency-begin-${work.workId}`,
        procedureAdapter: buildProtectedRemoteWorkDemoProcedureAdapter(
          work.procedureExecutionKey ?? start.executionKey
        ),
      }
    case 'complete':
      return {
        kind: 'complete',
        workId: work.workId,
        operationKey: `op-agency-complete-${work.workId}`,
        workCommitted: true,
      }
    case 'resume':
      return {
        kind: 'resume',
        workId: work.workId,
        operationKey: `op-agency-resume-${work.workId}`,
      }
    case 'abort':
      return {
        kind: 'abort',
        workId: work.workId,
        operationKey: `op-agency-abort-${work.workId}`,
      }
    case null:
      return undefined
    default: {
      const _exhaustive: never = step
      void _exhaustive
      return undefined
    }
  }
}

export function projectProtectedRemoteWorkGameplayView(
  game: GameState
): ProtectedRemoteWorkGameplayView {
  const map = parseFacilityProtectedRemoteWorkCells(game.facilityProtectedRemoteWorkCells)
  const rows: ProtectedRemoteWorkGameplayRow[] = []
  if (map !== undefined) {
    for (const workId of Object.keys(map).sort((left, right) => left.localeCompare(right))) {
      const work = map[workId]
      if (work === undefined) continue
      const explained = projectExplainableProtectedRemoteWork(work)
      const nextStep = nextStepFor(work.stage)
      rows.push(
        Object.freeze({
          workId: work.workId,
          stationId: work.stationId,
          operatorRef: work.operatorRef,
          targetRef: work.targetRef,
          targetZoneRef: work.targetZoneRef,
          capabilityTag: work.capabilityTag,
          stage: work.stage,
          outcome: explained.outcome,
          reasonCodes: explained.reasonCodes,
          hazards: hazardsFor(work),
          blockers: explained.reasonCodes,
          allowedActions: allowedActionsFor(work.stage),
          nextStep,
          nextStepLabel: nextStepLabel(nextStep),
          active: isProtectedRemoteWorkActive(work.stage),
          exposureCleared: work.exposureCleared,
        })
      )
    }
  }
  const start = defaultStart(game.week)
  const canStart = !rows.some(
    (row) => row.workId === start.workId || (row.active && row.stationId === start.stationId)
  )
  return Object.freeze({
    rows: Object.freeze(rows),
    canStart,
  })
}

export function getProtectedRemoteWorkRecord(
  game: GameState,
  workId: string
): ProtectedRemoteWorkRecord | undefined {
  const map = parseFacilityProtectedRemoteWorkCells(game.facilityProtectedRemoteWorkCells)
  if (map === undefined) return undefined
  return map[workId]
}
