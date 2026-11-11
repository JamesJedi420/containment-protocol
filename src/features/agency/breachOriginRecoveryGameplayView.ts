/**
 * SPE-3735 — mid-week Agency Facility Register consumer for breach-origin recovery.
 *
 * Projects durable recoveries and builds store step commands from caller-owned
 * escape / claim / respond attempt facts. Does not invent SPE-3055 arbitration,
 * a persisted live-registry GameState map, or SPE-3191 maintenance recovery.
 */

import type { GameState } from '../../domain/models'
import {
  isBreachRecoveryActive,
  parseFacilityBreachOriginRecoveries,
  projectExplainableBreachRecovery,
  type BreachRecoveryExplainability,
  type BreachRecoveryRecord,
  type BreachRecoveryStage,
  type BreachRecoverySubjectKind,
} from '../../domain/breachOriginRecovery'
import {
  buildBreachRecoveryRespondWorkItem,
  type BreachOriginRecoveryStepCommand,
} from '../../domain/breachOriginRecoveryLivePath'
import type { CoLocationPlacementRequest } from '../../domain/containmentCoLocationCompatibility'
import { readProductionFacilitySectionGraph } from '../../domain/facilitySectionGraph'
import {
  createLiveRegistryEntry,
  updateLiveRegistryEntry,
  type LiveRegistryEntry,
} from '../../domain/liveRegistry'
import type { RegistryWorkItem } from '../../domain/liveRegistryAlertCenter'

export const BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY = {
  heading: 'Breach-origin recovery',
  explanation:
    'Coordinate verified recontainment for an already-escaped subject through assignment, locate, capture, movement, admission, and containment verification. This is not facility maintenance recovery.',
  empty: 'No active breach-origin recoveries are recorded.',
  startLabel: 'Start breach-origin recovery',
  assignLabel: 'Assign recovery response',
  locateLabel: 'Confirm subject located',
  captureLabel: 'Confirm capture secured',
  moveLabel: 'Confirm recovery movement',
  admitLabel: 'Confirm destination admission',
  verifyLabel: 'Verify recontainment',
  nextStepUnavailable: 'No mid-week advance is available for this stage.',
} as const

export type BreachOriginRecoveryNextStep =
  'assign' | 'locate' | 'capture' | 'move' | 'admit' | 'verify' | null

export type BreachOriginRecoveryGameplayRow = Readonly<{
  recoveryId: string
  subjectRef: string
  stage: BreachRecoveryStage
  outcome: BreachRecoveryExplainability['outcome']
  reasonCodes: readonly string[]
  nextStep: BreachOriginRecoveryNextStep
  nextStepLabel: string
  active: boolean
}>

export type BreachOriginRecoveryGameplayView = Readonly<{
  rows: readonly BreachOriginRecoveryGameplayRow[]
  canStart: boolean
}>

export type BreachOriginRecoveryStartRequest = Readonly<{
  recoveryId: string
  registryEntryId: string
  subjectRef: string
  subjectLabel: string
  incidentCaseRef: string
  subjectKind: BreachRecoverySubjectKind
  recoveryObjectiveRef: string
  destinationNodeId: string
  destinationZoneRef?: string
  operationKey: string
  containedWeek: number
  escapeWeek: number
}>

const DEFAULT_START: BreachOriginRecoveryStartRequest = Object.freeze({
  recoveryId: 'rec-agency-breach-1',
  registryEntryId: 'reg-agency-escape-1',
  subjectRef: 'subject:anomaly-agency',
  subjectLabel: 'Agency escaped subject',
  incidentCaseRef: 'case:escape-agency-1',
  subjectKind: 'non_person',
  recoveryObjectiveRef: 'objective:recontain-anomaly-agency',
  destinationNodeId: 'room:med_bay',
  destinationZoneRef: 'zone:medical',
  operationKey: 'op-agency-create',
  containedWeek: 4,
  escapeWeek: 5,
})

function nextStepFor(stage: BreachRecoveryStage): BreachOriginRecoveryNextStep {
  switch (stage) {
    case 'escape_reported':
      return 'assign'
    case 'recovery_assigned':
      return 'locate'
    case 'subject_located':
      return 'capture'
    case 'capture_secured':
      return 'move'
    case 'in_transit':
      return 'move'
    case 'admission_pending':
      return 'admit'
    case 'containment_verification':
      return 'verify'
    case 'completed':
    case 'interrupted':
    case 'lost_contact':
    case 'capture_failed':
    case 'transit_interrupted':
    case 'admission_denied':
    case 'verification_failed':
    case 'failed':
      return null
    default: {
      const _exhaustive: never = stage
      void _exhaustive
      return null
    }
  }
}

function nextStepLabel(step: BreachOriginRecoveryNextStep): string {
  switch (step) {
    case 'assign':
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.assignLabel
    case 'locate':
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.locateLabel
    case 'capture':
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.captureLabel
    case 'move':
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.moveLabel
    case 'admit':
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.admitLabel
    case 'verify':
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.verifyLabel
    case null:
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.nextStepUnavailable
    default: {
      const _exhaustive: never = step
      void _exhaustive
      return BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.nextStepUnavailable
    }
  }
}

export function getDefaultBreachOriginRecoveryStartRequest(
  week: number
): BreachOriginRecoveryStartRequest {
  const escapeWeek =
    Number.isFinite(week) && week >= 0 ? Math.trunc(week) : DEFAULT_START.escapeWeek
  const containedWeek = Math.max(0, escapeWeek - 1)
  return Object.freeze({
    ...DEFAULT_START,
    recoveryId: `rec-agency-breach-w${escapeWeek}`,
    registryEntryId: `reg-agency-escape-w${escapeWeek}`,
    containedWeek,
    escapeWeek,
    operationKey: `op-agency-create-w${escapeWeek}`,
  })
}

export function buildCallerOwnedEscapeTransition(request: BreachOriginRecoveryStartRequest):
  | {
      readonly previousEntry: LiveRegistryEntry
      readonly nextEntry: LiveRegistryEntry
      readonly respondWorkItem: RegistryWorkItem
    }
  | undefined {
  const previousEntry = createLiveRegistryEntry({
    id: request.registryEntryId,
    entityId: request.subjectRef,
    entityClass: 'anomaly',
    label: request.subjectLabel,
    operationalState: 'contained',
    truthState: 'confirmed',
    confidence: 0.9,
    week: request.containedWeek,
    linkedCaseIds: [request.incidentCaseRef],
  })
  const nextEntry = updateLiveRegistryEntry(previousEntry, {
    operationalState: 'loose',
    week: request.escapeWeek,
    reasonCode: 'contained-to-loose',
    triggerSource: 'containment-breach',
  })
  const respondWorkItem = buildBreachRecoveryRespondWorkItem(previousEntry, nextEntry)
  if (respondWorkItem === undefined) return undefined
  return { previousEntry, nextEntry, respondWorkItem }
}

/** Rebuild respond work item from durable recovery identity (no live-registry SoT). */
export function rebuildRespondWorkItemForRecovery(
  recovery: BreachRecoveryRecord
): RegistryWorkItem | undefined {
  const previousEntry = createLiveRegistryEntry({
    id: recovery.escapeEvidenceRef,
    entityId: recovery.subjectRef,
    entityClass: 'anomaly',
    label: recovery.subjectRef,
    operationalState: 'contained',
    truthState: 'confirmed',
    confidence: 0.9,
    week: Math.max(0, 1),
    linkedCaseIds: [recovery.incidentCaseRef],
  })
  const nextEntry = updateLiveRegistryEntry(previousEntry, {
    operationalState: 'loose',
    week: Math.max(1, previousEntry.lastUpdatedWeek + 1),
    reasonCode: 'contained-to-loose',
    triggerSource: 'containment-breach',
  })
  return buildBreachRecoveryRespondWorkItem(previousEntry, nextEntry)
}

export function buildCreateBreachOriginRecoveryCommand(
  request: BreachOriginRecoveryStartRequest = DEFAULT_START
): BreachOriginRecoveryStepCommand | undefined {
  const transition = buildCallerOwnedEscapeTransition(request)
  if (transition === undefined) return undefined
  return {
    kind: 'create',
    recoveryId: request.recoveryId,
    previousEntry: transition.previousEntry,
    nextEntry: transition.nextEntry,
    incidentCaseRef: request.incidentCaseRef,
    subjectKind: request.subjectKind,
    recoveryObjectiveRef: request.recoveryObjectiveRef,
    destinationNodeId: request.destinationNodeId,
    destinationZoneRef: request.destinationZoneRef,
    operationKey: request.operationKey,
  }
}

export function buildAssignBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  operationKey: string
): BreachOriginRecoveryStepCommand | undefined {
  const respondWorkItem = rebuildRespondWorkItemForRecovery(recovery)
  if (respondWorkItem === undefined) return undefined
  return {
    kind: 'assign',
    recoveryId: recovery.recoveryId,
    operationKey,
    claimAttempt: {
      attemptId: `response-${recovery.recoveryId}`,
      operationRef: `operation:breach-recovery:${recovery.recoveryId}`,
      requirementRefs: ['personnel:responder-a'],
      claimCommitted: true,
    },
    respondWorkItem,
  }
}

export function buildLocateBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  operationKey: string
): BreachOriginRecoveryStepCommand {
  return {
    kind: 'locate',
    recoveryId: recovery.recoveryId,
    operationKey,
    locatedCommitted: true,
  }
}

export function buildCaptureBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  week: number,
  operationKey: string
): BreachOriginRecoveryStepCommand {
  return {
    kind: 'capture',
    recoveryId: recovery.recoveryId,
    operationKey,
    week,
    captureAttempt: {
      attemptId: `capture-${recovery.recoveryId}`,
      subjectRef: recovery.subjectRef,
      controlCommitted: true,
      restraintCompatible: true,
    },
  }
}

export function buildMoveBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  operationKey: string
): BreachOriginRecoveryStepCommand {
  return {
    kind: 'move',
    recoveryId: recovery.recoveryId,
    operationKey,
    movementAttempt: {
      attemptId: `move-${recovery.recoveryId}`,
      subjectRef: recovery.subjectRef,
      movementCommitted: true,
      arrivedAtDestination: true,
      routeEligible: true,
    },
  }
}

export function buildAdmitBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  week: number,
  operationKey: string
): BreachOriginRecoveryStepCommand {
  const graph = readProductionFacilitySectionGraph()
  const coLocation: CoLocationPlacementRequest = {
    graph,
    constraints: [
      {
        id: 'c-same-node',
        kind: 'prohibit_same_node',
        subjectClass: 'volatile_sample',
        againstClass: 'reactive_catalyst',
      },
    ],
    occupants: [
      {
        subjectId: 'occ-other',
        subjectClass: 'reactive_catalyst',
        nodeId: 'room:containment_cell',
      },
    ],
    candidate: {
      subjectId: recovery.subjectRef,
      subjectClass: 'volatile_sample',
      proposedNodeId: recovery.destinationNodeId,
      ...(recovery.destinationZoneRef !== undefined
        ? { zoneRef: recovery.destinationZoneRef }
        : {}),
    },
  }
  return {
    kind: 'admit',
    recoveryId: recovery.recoveryId,
    operationKey,
    week,
    admissionCommitted: true,
    coLocation,
  }
}

export function buildVerifyBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  week: number,
  operationKey: string
): BreachOriginRecoveryStepCommand {
  return {
    kind: 'verify',
    recoveryId: recovery.recoveryId,
    operationKey,
    week,
    recontainmentVerified: true,
  }
}

export function buildNextBreachOriginRecoveryCommand(
  recovery: BreachRecoveryRecord,
  week: number
): BreachOriginRecoveryStepCommand | undefined {
  const step = nextStepFor(recovery.stage)
  switch (step) {
    case 'assign':
      return buildAssignBreachOriginRecoveryCommand(
        recovery,
        `op-agency-assign-${recovery.recoveryId}`
      )
    case 'locate':
      return buildLocateBreachOriginRecoveryCommand(
        recovery,
        `op-agency-locate-${recovery.recoveryId}`
      )
    case 'capture':
      return buildCaptureBreachOriginRecoveryCommand(
        recovery,
        week,
        `op-agency-capture-${recovery.recoveryId}`
      )
    case 'move':
      return buildMoveBreachOriginRecoveryCommand(recovery, `op-agency-move-${recovery.recoveryId}`)
    case 'admit':
      return buildAdmitBreachOriginRecoveryCommand(
        recovery,
        week,
        `op-agency-admit-${recovery.recoveryId}`
      )
    case 'verify':
      return buildVerifyBreachOriginRecoveryCommand(
        recovery,
        week,
        `op-agency-verify-${recovery.recoveryId}`
      )
    case null:
      return undefined
    default: {
      const _exhaustive: never = step
      void _exhaustive
      return undefined
    }
  }
}

export function projectBreachOriginRecoveryGameplayView(
  game: GameState
): BreachOriginRecoveryGameplayView {
  const map = parseFacilityBreachOriginRecoveries(game.facilityBreachOriginRecoveries)
  const rows: BreachOriginRecoveryGameplayRow[] = []
  if (map !== undefined) {
    for (const recoveryId of Object.keys(map).sort((left, right) => left.localeCompare(right))) {
      const recovery = map[recoveryId]
      if (recovery === undefined) continue
      const explained = projectExplainableBreachRecovery(recovery)
      const nextStep = nextStepFor(recovery.stage)
      rows.push(
        Object.freeze({
          recoveryId: recovery.recoveryId,
          subjectRef: recovery.subjectRef,
          stage: recovery.stage,
          outcome: explained.outcome,
          reasonCodes: explained.reasonCodes,
          nextStep,
          nextStepLabel: nextStepLabel(nextStep),
          active: isBreachRecoveryActive(recovery.stage),
        })
      )
    }
  }
  const startId = getDefaultBreachOriginRecoveryStartRequest(game.week).recoveryId
  const canStart = !rows.some((row) => row.recoveryId === startId)
  return Object.freeze({
    rows: Object.freeze(rows),
    canStart,
  })
}

export function getRecoveryRecord(
  game: GameState,
  recoveryId: string
): BreachRecoveryRecord | undefined {
  const map = parseFacilityBreachOriginRecoveries(game.facilityBreachOriginRecoveries)
  return map?.[recoveryId]
}
