/**
 * SPE-3735 — live store/consumer step path for breach-origin recovery.
 *
 * Thin orchestration over the pure coordinator and SPE-3055 / SPE-104 /
 * SPE-1095 producer seams. Accepts caller-owned attempt facts and escape
 * evidence inputs; does not invent claim arbitration, capture combat,
 * pathfinding, UI, week-close auto-success, or a persisted live-registry map.
 */

import type { GameState } from './models'
import {
  assignBreachRecovery,
  buildBreachEscapeEvidenceFromLiveRegistry,
  confirmCaptureSecure,
  confirmContainmentVerification,
  confirmDestinationAdmission,
  confirmRecoveryMovement,
  confirmSubjectLocated,
  createBreachOriginRecovery,
  interruptBreachRecovery,
  parseFacilityBreachOriginRecoveries,
  reportLostContact,
  type BreachRecoveryReasonCode,
  type BreachRecoveryResult,
  type BreachRecoverySubjectKind,
} from './breachOriginRecovery'
import {
  resolveCaptureSecureOutcome,
  toCaptureSecureEvidence,
  type CaptureSecureAttempt,
} from './captureSecureOutcome'
import type { CoLocationPlacementRequest } from './containmentCoLocationCompatibility'
import {
  deriveRegistryAlerts,
  type LiveRegistryEntry,
} from './liveRegistry'
import { alertToWorkItem, type RegistryWorkItem } from './liveRegistryAlertCenter'
import {
  resolveOperationalPersonnelClaimOutcome,
  toAssignmentClaimEvidence,
  type OperationalPersonnelClaimAttempt,
} from './operationalPersonnelClaimOutcome'
import type { ProcedureToActionAdapterInput } from './procedureToActionAdapter'
import {
  resolveRecoveryMovementOutcome,
  toRecoveryMovementEvidence,
  type RecoveryMovementAttempt,
} from './recoveryMovementOutcome'

export type BreachOriginRecoveryStepCommand =
  | {
      readonly kind: 'create'
      readonly recoveryId: string
      readonly previousEntry: LiveRegistryEntry
      readonly nextEntry: LiveRegistryEntry
      readonly incidentCaseRef: string
      readonly subjectKind: BreachRecoverySubjectKind
      readonly recoveryObjectiveRef: string
      readonly destinationNodeId: string
      readonly destinationZoneRef?: string
      readonly operationKey: string
      readonly custodyStatusId?: string
      readonly formerRoleCategory?: string
      /** Forbidden completion path — always rejected by the coordinator. */
      readonly statusPatchComplete?: boolean
    }
  | {
      readonly kind: 'assign'
      readonly recoveryId: string
      readonly operationKey: string
      readonly claimAttempt: OperationalPersonnelClaimAttempt
      readonly respondWorkItem: RegistryWorkItem
    }
  | {
      readonly kind: 'locate'
      readonly recoveryId: string
      readonly operationKey: string
      readonly locatedCommitted: boolean
    }
  | {
      readonly kind: 'capture'
      readonly recoveryId: string
      readonly operationKey: string
      readonly week: number
      readonly captureAttempt: CaptureSecureAttempt
    }
  | {
      readonly kind: 'move'
      readonly recoveryId: string
      readonly operationKey: string
      readonly movementAttempt: RecoveryMovementAttempt
    }
  | {
      readonly kind: 'admit'
      readonly recoveryId: string
      readonly operationKey: string
      readonly week: number
      readonly admissionCommitted: boolean
      readonly coLocation: CoLocationPlacementRequest
      readonly inboundScreen?: unknown
    }
  | {
      readonly kind: 'verify'
      readonly recoveryId: string
      readonly operationKey: string
      readonly week: number
      readonly recontainmentVerified: boolean
      readonly procedureAdapter?: ProcedureToActionAdapterInput
    }
  | {
      readonly kind: 'lost_contact'
      readonly recoveryId: string
      readonly operationKey: string
      readonly week: number
      readonly incidentOwnerHint?: string
    }
  | {
      readonly kind: 'interrupt'
      readonly recoveryId: string
      readonly operationKey: string
      readonly week: number
      readonly incidentOwnerHint?: string
    }

function rejectStep(
  state: GameState,
  code: BreachRecoveryReasonCode
): BreachRecoveryResult {
  return {
    ok: false,
    state,
    code,
    reasonCodes: Object.freeze([code]),
  }
}

type LoadedRecovery =
  | { readonly ok: true; readonly recovery: NonNullable<BreachRecoveryResult['recovery']> }
  | { readonly ok: false; readonly result: BreachRecoveryResult }

function requireRecovery(state: GameState, recoveryId: string): LoadedRecovery {
  if (typeof recoveryId !== 'string' || recoveryId.trim().length === 0) {
    return { ok: false, result: rejectStep(state, 'malformed_input') }
  }
  const map = parseFacilityBreachOriginRecoveries(state.facilityBreachOriginRecoveries)
  const recovery = map?.[recoveryId.trim()]
  if (recovery === undefined) {
    return { ok: false, result: rejectStep(state, 'stale_operation') }
  }
  return { ok: true, recovery }
}

/**
 * Build the alert-center respond work item that assignment requires, from the
 * same contained→loose transition used to create escape evidence.
 */
export function buildBreachRecoveryRespondWorkItem(
  previousEntry: LiveRegistryEntry,
  nextEntry: LiveRegistryEntry
): RegistryWorkItem | undefined {
  const alerts = deriveRegistryAlerts(previousEntry, nextEntry)
  const escapeAlert = alerts.find((alert) => alert.type === 'escape')
  if (escapeAlert === undefined) return undefined
  return alertToWorkItem(escapeAlert, nextEntry, 0, true)
}

/**
 * Apply one live recovery step against durable GameState recoveries.
 * Producer-backed steps resolve SPE-3055 / SPE-104 / SPE-1095 attempt facts
 * before calling the coordinator; they never invent claim/capture/movement truth.
 */
export function applyBreachOriginRecoveryStep(
  state: GameState,
  command: BreachOriginRecoveryStepCommand
): BreachRecoveryResult {
  switch (command.kind) {
    case 'create': {
      const escapeEvidence = buildBreachEscapeEvidenceFromLiveRegistry(
        command.previousEntry,
        command.nextEntry,
        command.incidentCaseRef
      )
      if (escapeEvidence === undefined) {
        return rejectStep(state, 'escape_not_authoritative')
      }
      return createBreachOriginRecovery(
        {
          recoveryId: command.recoveryId,
          escapeEvidence,
          subjectKind: command.subjectKind,
          recoveryObjectiveRef: command.recoveryObjectiveRef,
          destinationNodeId: command.destinationNodeId,
          destinationZoneRef: command.destinationZoneRef,
          operationKey: command.operationKey,
          custodyStatusId: command.custodyStatusId,
          formerRoleCategory: command.formerRoleCategory,
          statusPatchComplete: command.statusPatchComplete,
        },
        state
      )
    }
    case 'assign': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      const resolved = resolveOperationalPersonnelClaimOutcome(command.claimAttempt)
      if (!resolved.ok) {
        return rejectStep(state, 'malformed_input')
      }
      return assignBreachRecovery(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          assignmentClaim: toAssignmentClaimEvidence(resolved.outcome),
          respondWorkItem: command.respondWorkItem,
        },
        state
      )
    }
    case 'locate': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      return confirmSubjectLocated(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          locatedCommitted: command.locatedCommitted,
        },
        state
      )
    }
    case 'capture': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      const resolved = resolveCaptureSecureOutcome(command.captureAttempt)
      if (!resolved.ok) {
        return rejectStep(state, 'malformed_input')
      }
      return confirmCaptureSecure(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          week: command.week,
          captureEvidence: toCaptureSecureEvidence(resolved.outcome),
        },
        state
      )
    }
    case 'move': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      const resolved = resolveRecoveryMovementOutcome(command.movementAttempt)
      if (!resolved.ok) {
        return rejectStep(state, 'malformed_input')
      }
      return confirmRecoveryMovement(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          movementEvidence: toRecoveryMovementEvidence(resolved.outcome),
        },
        state
      )
    }
    case 'admit': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      return confirmDestinationAdmission(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          week: command.week,
          admissionCommitted: command.admissionCommitted,
          coLocation: command.coLocation,
          inboundScreen: command.inboundScreen,
        },
        state
      )
    }
    case 'verify': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      return confirmContainmentVerification(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          week: command.week,
          recontainmentVerified: command.recontainmentVerified,
          procedureAdapter: command.procedureAdapter,
        },
        state
      )
    }
    case 'lost_contact': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      return reportLostContact(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          week: command.week,
          incidentOwnerHint: command.incidentOwnerHint,
        },
        state
      )
    }
    case 'interrupt': {
      const loaded = requireRecovery(state, command.recoveryId)
      if (!loaded.ok) return loaded.result
      return interruptBreachRecovery(
        loaded.recovery,
        {
          operationKey: command.operationKey,
          week: command.week,
          incidentOwnerHint: command.incidentOwnerHint,
        },
        state
      )
    }
    default: {
      const _exhaustive: never = command
      void _exhaustive
      return rejectStep(state, 'malformed_input')
    }
  }
}
