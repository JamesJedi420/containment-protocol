/**
 * SPE-3501 — live store/consumer step path for protected remote-work cells.
 *
 * Thin orchestration over the pure coordinator and SPE-2995 adapter input.
 * Caller-owned gate decisions and procedure adapter fixtures are accepted as
 * facts; this path does not invent facility integrity, sampling (SPE-100), or
 * a second procedure engine.
 */

import type { AgentRole } from './agent/models'
import type { CrossRoleActionParticipant } from './crossRoleActionProcedure'
import { hasOwnEnumerableKey } from './facilityCoordinationHydrate'
import type { GameState } from './models'
import {
  BINDING_SIGIL,
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
  type ProcedureDefinition,
} from './procedureDefinition'
import type {
  ProcedureExecutionPrerequisiteDecision,
  ProcedureToActionAdapterInput,
} from './procedureToActionAdapter'
import {
  abortProtectedRemoteWork,
  beginProtectedRemoteWork,
  completeProtectedRemoteWork,
  createProtectedRemoteWorkCell,
  interruptProtectedRemoteWork,
  parseFacilityProtectedRemoteWorkCells,
  resumeProtectedRemoteWork,
  runProtectedRemoteWorkPreflight,
  type ProtectedRemoteWorkInterruptKind,
  type ProtectedRemoteWorkPreflightGates,
  type ProtectedRemoteWorkReasonCode,
  type ProtectedRemoteWorkRecord,
  type ProtectedRemoteWorkResult,
} from './protectedRemoteWorkCell'

export type ProtectedRemoteWorkStepCommand =
  | {
      readonly kind: 'create'
      readonly workId: string
      readonly stationId: string
      readonly operatorRef: string
      readonly operatorNodeId: string
      readonly targetZoneRef: string
      readonly targetRef: string
      readonly capabilityTag: string
      readonly operationKey: string
    }
  | {
      readonly kind: 'preflight'
      readonly workId: string
      readonly operationKey: string
      readonly gates: ProtectedRemoteWorkPreflightGates
      readonly procedureAdapter: ProcedureToActionAdapterInput
      readonly authorizationRef?: string
    }
  | {
      readonly kind: 'begin'
      readonly workId: string
      readonly operationKey: string
      readonly procedureAdapter: ProcedureToActionAdapterInput
    }
  | {
      readonly kind: 'complete'
      readonly workId: string
      readonly operationKey: string
      readonly workCommitted: boolean
    }
  | {
      readonly kind: 'interrupt'
      readonly workId: string
      readonly operationKey: string
      readonly interruptKind: ProtectedRemoteWorkInterruptKind
      readonly routeExposure?: boolean
    }
  | {
      readonly kind: 'resume'
      readonly workId: string
      readonly operationKey: string
    }
  | {
      readonly kind: 'abort'
      readonly workId: string
      readonly operationKey: string
    }

function rejectStep(state: GameState, code: ProtectedRemoteWorkReasonCode): ProtectedRemoteWorkResult {
  return {
    ok: false,
    state,
    code,
    reasonCodes: Object.freeze([code]),
  }
}

type LoadedWork =
  | { readonly ok: true; readonly work: ProtectedRemoteWorkRecord }
  | { readonly ok: false; readonly result: ProtectedRemoteWorkResult }

function requireWork(state: GameState, workId: string): LoadedWork {
  if (typeof workId !== 'string' || workId.trim().length === 0) {
    return { ok: false, result: rejectStep(state, 'malformed_input') }
  }
  const id = workId.trim()
  const map = parseFacilityProtectedRemoteWorkCells(state.facilityProtectedRemoteWorkCells)
  if (map === undefined || !hasOwnEnumerableKey(map as Record<string, unknown>, id)) {
    return { ok: false, result: rejectStep(state, 'stale_operation') }
  }
  return { ok: true, work: map[id]! }
}

function makeParticipant(
  agentId: string,
  role: AgentRole,
  itemTags: readonly string[] = []
): CrossRoleActionParticipant {
  return {
    agentId,
    role,
    statDomains: {},
    itemTags,
  }
}

function satisfied(
  prerequisiteClass: ProcedureExecutionPrerequisiteDecision['prerequisiteClass'],
  ownerRef: string
): ProcedureExecutionPrerequisiteDecision {
  return {
    prerequisiteClass,
    ownerRef,
    state: 'satisfied',
    reason: 'verified',
  }
}

const DEMO_PREREQUISITE_DECISIONS: readonly ProcedureExecutionPrerequisiteDecision[] = Object.freeze([
  satisfied('knowledge_readiness', 'SPE-58'),
  satisfied('authorization', 'SPE-2078'),
  satisfied('competency', 'SPE-1059'),
  satisfied('compatibility_equipment', 'SPE-714'),
  satisfied('facility_environment', 'SPE-1896'),
  satisfied('operating_doctrine', 'SPE-874'),
  satisfied('procedure_exhaustion', 'SPE-3308'),
  satisfied('subject_fit', 'SPE-1907'),
])

/**
 * Bounded Agency demo adapter for the authored containment-lab sample observation
 * task. Not a SPE-100 sampler and not a second procedure engine.
 */
export function buildProtectedRemoteWorkDemoProcedureAdapter(
  executionKey: string
): ProcedureToActionAdapterInput {
  const definition: ProcedureDefinition = {
    ...BINDING_SIGIL,
    schemaVersion: PROCEDURE_DEFINITION_SCHEMA_VERSION,
    procedureId: 'containment_lab_sample_observation',
    canonicalName: 'Containment Lab Sample Observation',
    requirements: {
      speech: 'none',
      gesture: 'none',
      toolTags: ['evidence_kit'],
      reagents: [],
      requiresDiagram: false,
      deviceTags: [],
    },
    restrictions: {
      forbiddenRoles: [],
      requiredCertifications: [],
      requiresSpecialistAccess: false,
      usageCap: null,
    },
    availability: { rating: 'common' },
    provenance: {
      sourceSystem: 'field_manual',
      acquiredViaResearch: false,
      researchDiscipline: null,
      restrictedFaction: null,
    },
  }
  return Object.freeze({
    definition,
    eligibleRoles: ['investigator', 'field_recon'] as const,
    requiredParticipantCount: 2,
    participants: Object.freeze([
      makeParticipant('agent-a', 'investigator', ['evidence_kit']),
      makeParticipant('agent-b', 'field_recon'),
    ]),
    requiredPrerequisites: DEMO_PREREQUISITE_DECISIONS.map(({ prerequisiteClass, ownerRef }) => ({
      prerequisiteClass,
      ownerRef,
    })),
    prerequisiteDecisions: DEMO_PREREQUISITE_DECISIONS,
    executionKey,
  })
}

export const OPEN_PROTECTED_REMOTE_WORK_GATES: ProtectedRemoteWorkPreflightGates = Object.freeze({
  stationReady: true,
  stationConnected: true,
  capabilitySupported: true,
  operatorAvailable: true,
  operatorQualified: true,
  zoneAccessOk: true,
  roomConfigSafe: true,
  integrityOk: true,
})

/**
 * Apply one live remote-work step against durable GameState cells.
 */
export function applyProtectedRemoteWorkStep(
  state: GameState,
  command: ProtectedRemoteWorkStepCommand
): ProtectedRemoteWorkResult {
  switch (command.kind) {
    case 'create':
      return createProtectedRemoteWorkCell(
        {
          workId: command.workId,
          stationId: command.stationId,
          operatorRef: command.operatorRef,
          operatorNodeId: command.operatorNodeId,
          targetZoneRef: command.targetZoneRef,
          targetRef: command.targetRef,
          capabilityTag: command.capabilityTag,
          operationKey: command.operationKey,
        },
        state
      )
    case 'preflight': {
      const loaded = requireWork(state, command.workId)
      if (!loaded.ok) return loaded.result
      return runProtectedRemoteWorkPreflight(
        {
          work: loaded.work,
          operationKey: command.operationKey,
          gates: command.gates,
          procedureAdapter: command.procedureAdapter,
          ...(command.authorizationRef !== undefined
            ? { authorizationRef: command.authorizationRef }
            : {}),
        },
        state
      )
    }
    case 'begin': {
      const loaded = requireWork(state, command.workId)
      if (!loaded.ok) return loaded.result
      return beginProtectedRemoteWork(
        loaded.work,
        {
          operationKey: command.operationKey,
          procedureAdapter: command.procedureAdapter,
        },
        state
      )
    }
    case 'complete': {
      const loaded = requireWork(state, command.workId)
      if (!loaded.ok) return loaded.result
      return completeProtectedRemoteWork(
        loaded.work,
        {
          operationKey: command.operationKey,
          workCommitted: command.workCommitted,
        },
        state
      )
    }
    case 'interrupt': {
      const loaded = requireWork(state, command.workId)
      if (!loaded.ok) return loaded.result
      return interruptProtectedRemoteWork(
        loaded.work,
        {
          operationKey: command.operationKey,
          kind: command.interruptKind,
          ...(command.routeExposure !== undefined ? { routeExposure: command.routeExposure } : {}),
        },
        state
      )
    }
    case 'resume': {
      const loaded = requireWork(state, command.workId)
      if (!loaded.ok) return loaded.result
      return resumeProtectedRemoteWork(loaded.work, command.operationKey, state)
    }
    case 'abort': {
      const loaded = requireWork(state, command.workId)
      if (!loaded.ok) return loaded.result
      return abortProtectedRemoteWork(loaded.work, command.operationKey, state)
    }
    default: {
      const _exhaustive: never = command
      void _exhaustive
      return rejectStep(state, 'malformed_input')
    }
  }
}
