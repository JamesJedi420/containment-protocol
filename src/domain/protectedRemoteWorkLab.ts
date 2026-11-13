import type { GameState } from './models'
import { buildAgentAvailabilityProfile } from './agent/simulation'
import { buildCompetencyProfileFromAgent, evaluateCompetencyTask } from './competencyFramework'
import {
  BLAST_DOOR_MEMBRANE_ZONE_ID,
  readContainmentBarrierStatus,
} from './containmentBarrierIntegrity'
import {
  readProductionFacilitySectionGraph,
  queryDirectSpatialAdjacency,
} from './facilitySectionGraph'
import { authorizeFacilityAction } from './layeredFacilityControl'
import {
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
  type ProcedureDefinition,
} from './procedureDefinition'
import {
  evaluateProcedureRoomStateSafety,
  parseRoomStateSnapshot,
  parseFacilityConfigurationSnapshot,
  type RoomStateSnapshot,
  type FacilityConfigurationSnapshot,
  type ProcedureSafetyRequirement,
} from './procedureRoomStatePreconditions'
import type {
  ProcedureToActionAdapterInput,
  ProcedureExecutionPrerequisiteDecision,
} from './procedureToActionAdapter'
import type {
  ProtectedRemoteWorkPreflightGates,
  ProtectedRemoteWorkRecord,
} from './protectedRemoteWorkCell'

/** One authored stationary assay supplied with this facility, not a specimen inventory. */
export const PROTECTED_LAB = Object.freeze({
  facilityId: 'facility:clinical-observation-lab',
  stationId: 'station:clinical-observation-console',
  operatorNodeId: 'room:med_bay',
  targetZoneRef: 'room:containment_cell',
  targetRef: 'sample:clinical-sealed-reference',
  capabilityTag: 'sample_observe',
  barrierZoneId: BLAST_DOOR_MEMBRANE_ZONE_ID,
})

export interface ProtectedRemoteWorkStation {
  readonly version: 1
  readonly enabled: boolean
  readonly connected: boolean
  readonly targetPresent: boolean
  readonly capabilityTags: readonly string[]
  readonly deviceTags: readonly string[]
  readonly briefedOperatorRefs: readonly string[]
  readonly roomState: RoomStateSnapshot
  readonly facilityConfiguration: FacilityConfigurationSnapshot
}

/** New-campaign authored starting facts. Hydration never grants these to absent/invalid saves. */
export function createStartingProtectedRemoteWorkStation(): ProtectedRemoteWorkStation {
  return {
    version: 1,
    enabled: true,
    connected: true,
    targetPresent: true,
    capabilityTags: [PROTECTED_LAB.capabilityTag],
    deviceTags: ['protected_observation_station'],
    briefedOperatorRefs: [],
    roomState: {
      roomId: 'containment_cell',
      lighting: 'adequate',
      locks: 'secured',
      staffPositioning: 'clear',
    },
    facilityConfiguration: {
      facilityId: PROTECTED_LAB.facilityId,
      activeRoomIds: ['med_bay', 'containment_cell'],
      roomZoneAssignments: [
        { roomId: 'med_bay', zoneId: 'medical' },
        { roomId: 'containment_cell', zoneId: 'containment' },
      ],
      containmentLayoutMode: 'secure_clean',
    },
  }
}

export function parseProtectedRemoteWorkStation(
  value: unknown
): ProtectedRemoteWorkStation | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const raw = value as Record<string, unknown>
  if (
    raw.version !== 1 ||
    typeof raw.enabled !== 'boolean' ||
    typeof raw.connected !== 'boolean' ||
    typeof raw.targetPresent !== 'boolean'
  )
    return undefined
  if (
    !Array.isArray(raw.briefedOperatorRefs) ||
    raw.briefedOperatorRefs.length > 256 ||
    raw.briefedOperatorRefs.some(
      (ref) => typeof ref !== 'string' || ref.length > 200 || ref.trim() !== ref || !ref
    )
  )
    return undefined
  const roomState = parseRoomStateSnapshot(raw.roomState)
  for (const tags of [raw.capabilityTags, raw.deviceTags]) {
    if (
      !Array.isArray(tags) ||
      tags.length > 16 ||
      tags.some((tag) => typeof tag !== 'string' || tag.length > 100 || !tag || tag.trim() !== tag)
    )
      return undefined
  }
  const facilityConfiguration = parseFacilityConfigurationSnapshot(raw.facilityConfiguration)
  if (
    !roomState ||
    roomState.roomId !== 'containment_cell' ||
    !facilityConfiguration ||
    facilityConfiguration.facilityId !== PROTECTED_LAB.facilityId
  )
    return undefined
  return Object.freeze({
    version: 1,
    enabled: raw.enabled,
    connected: raw.connected,
    targetPresent: raw.targetPresent,
    capabilityTags: Object.freeze([...new Set(raw.capabilityTags as string[])]),
    deviceTags: Object.freeze([...new Set(raw.deviceTags as string[])]),
    briefedOperatorRefs: Object.freeze([...new Set(raw.briefedOperatorRefs as string[])]),
    roomState,
    facilityConfiguration,
  })
}

export const CONTAINMENT_LAB_OBSERVATION_PROCEDURE: ProcedureDefinition = {
  schemaVersion: PROCEDURE_DEFINITION_SCHEMA_VERSION,
  procedureId: 'containment_lab_sample_observation',
  canonicalName: 'Sealed reference sample observation',
  aliases: [],
  tier: 1,
  taxonomy: {
    intent: 'detection',
    effectDomain: 'informational',
    executionMethod: 'device',
    originTradition: null,
  },
  requirements: {
    speech: 'none',
    gesture: 'none',
    toolTags: [],
    reagents: [],
    requiresDiagram: false,
    deviceTags: ['protected_observation_station'],
    environmentalConditions: ['sealed_target_compartment'],
  },
  activationTiming: 'one_action',
  targeting: {
    geometry: 'single_target',
    rangeMeters: 5,
    resistance: 'none',
    voluntaryResistanceSuppression: false,
    coverSensitive: false,
  },
  persistence: {
    duration: { value: 1, unit: 'minutes', maintainable: false },
    dismissible: true,
    expiryState: null,
  },
  restrictions: {
    forbiddenRoles: [],
    requiredCertifications: [],
    requiresSpecialistAccess: false,
    usageCap: null,
  },
  provenance: {
    sourceSystem: 'clinical_observation_station_manual',
    acquiredViaResearch: false,
    researchDiscipline: null,
    restrictedFaction: null,
  },
  availability: { rating: 'common', sourceCount: 1 },
}

const ROOM_REQUIREMENT: ProcedureSafetyRequirement = {
  procedureId: CONTAINMENT_LAB_OBSERVATION_PROCEDURE.procedureId,
  requiredRoomId: 'containment_cell',
  checks: [
    { kind: 'lighting', minimum: 'adequate' },
    { kind: 'locks', required: 'secured' },
    { kind: 'staffPositioning', required: 'clear' },
    {
      kind: 'facilityConfiguration',
      expectedZone: 'containment',
      requiredContainmentMode: 'secure_clean',
    },
  ],
}

/** Current owner-derived facts, recomputed for every Agency command, never accepted from the UI. */
export function buildProtectedLabFacts(state: GameState, operatorRef: string, workId: string) {
  const station = parseProtectedRemoteWorkStation(state.facilityProtectedRemoteWorkStation)
  const facility = state.facilityState?.facilities[PROTECTED_LAB.facilityId]
  const agent = Object.hasOwn(state.agents, operatorRef) ? state.agents[operatorRef] : undefined
  const operatorAvailable =
    agent !== undefined && buildAgentAvailabilityProfile(agent).assignment.eligible
  const qualified =
    agent !== undefined &&
    evaluateCompetencyTask(buildCompetencyProfileFromAgent(agent), {
      taskId: CONTAINMENT_LAB_OBSERVATION_PROCEDURE.procedureId,
      requiredDomain: 'research',
      successThreshold: 45,
      partialThreshold: 45,
    }).outcome === 'success'
  const graph = readProductionFacilitySectionGraph()
  const connected =
    !!station?.connected &&
    station.facilityConfiguration.activeRoomIds.includes('med_bay') &&
    station.facilityConfiguration.activeRoomIds.includes('containment_cell') &&
    queryDirectSpatialAdjacency(
      graph,
      PROTECTED_LAB.operatorNodeId,
      PROTECTED_LAB.targetZoneRef
    ) === true
  const targetPresent = station?.targetPresent === true
  const capabilitySupported =
    station?.capabilityTags.includes(PROTECTED_LAB.capabilityTag) === true &&
    CONTAINMENT_LAB_OBSERVATION_PROCEDURE.requirements.deviceTags.every((tag) =>
      station.deviceTags.includes(tag)
    )
  const ready = !!station?.enabled && facility?.status === 'active' && !facility.upgradeInProgress
  const integrityOk =
    readContainmentBarrierStatus(state.containmentBarrierIntegrity, PROTECTED_LAB.barrierZoneId) ===
    'intact'
  const operatorZone = station?.facilityConfiguration.roomZoneAssignments.find(
    (entry) => entry.roomId === 'med_bay'
  )?.zoneId
  const targetZone = station?.facilityConfiguration.roomZoneAssignments.find(
    (entry) => entry.roomId === 'containment_cell'
  )?.zoneId
  const roomSafe =
    !!station &&
    !!operatorZone &&
    operatorZone !== targetZone &&
    evaluateProcedureRoomStateSafety({
      procedureId: CONTAINMENT_LAB_OBSERVATION_PROCEDURE.procedureId,
      roomState: station.roomState,
      facilityConfiguration: station.facilityConfiguration,
      requirements: [ROOM_REQUIREMENT],
    }).ok
  const clearanceLevel = state.agency?.clearanceLevel ?? state.clearanceLevel
  const authorization = authorizeFacilityAction({
    facilityId: PROTECTED_LAB.facilityId,
    actorId: operatorRef,
    action: 'operate',
    accessBand: Number.isFinite(clearanceLevel) && clearanceLevel >= 1 ? 'operate' : 'denied',
    powerState: ready ? 'online' : 'offline',
    commandAuthorityId: 'agency:director',
    competentForAction: qualified,
    informationReadIn: station?.briefedOperatorRefs.includes(operatorRef) === true,
  })
  const gates: ProtectedRemoteWorkPreflightGates = {
    stationReady: ready,
    stationConnected: connected && targetPresent,
    capabilitySupported,
    operatorAvailable,
    operatorQualified: qualified,
    zoneAccessOk: authorization?.authorized === true,
    roomConfigSafe: roomSafe,
    integrityOk,
  }
  const decisions: ProcedureExecutionPrerequisiteDecision[] = [
    {
      ownerRef: 'SPE-731',
      prerequisiteClass: 'authorization',
      state: gates.zoneAccessOk ? 'satisfied' : 'blocked',
      reason: authorization?.denialReason ?? 'missing_operator',
    },
    {
      ownerRef: 'SPE-1059',
      prerequisiteClass: 'competency',
      state: qualified && operatorAvailable ? 'satisfied' : 'blocked',
      reason:
        qualified && operatorAvailable ? 'qualified_available_operator' : 'operator_not_ready',
    },
    {
      ownerRef: 'SPE-1896',
      prerequisiteClass: 'facility_environment',
      state: roomSafe ? 'satisfied' : 'blocked',
      reason: roomSafe ? 'room_checks_passed' : 'room_checks_failed',
    },
    {
      ownerRef: 'SPE-3501-station',
      prerequisiteClass: 'compatibility_equipment',
      state: ready && connected && integrityOk && capabilitySupported ? 'satisfied' : 'blocked',
      reason:
        ready && connected && integrityOk && capabilitySupported
          ? 'station_ready'
          : 'station_unavailable',
    },
    {
      ownerRef: 'SPE-3501-authored-target',
      prerequisiteClass: 'subject_fit',
      state: targetPresent ? 'satisfied' : 'blocked',
      reason: targetPresent ? 'fixed_sealed_observation_target' : 'target_absent',
    },
  ]
  const procedureAdapter: ProcedureToActionAdapterInput = {
    definition: CONTAINMENT_LAB_OBSERVATION_PROCEDURE,
    eligibleRoles: agent ? [agent.role] : [],
    requiredParticipantCount: 1,
    participants: agent
      ? [{ agentId: agent.id, role: agent.role, statDomains: {}, itemTags: [] }]
      : [],
    requiredPrerequisites: decisions.map(({ ownerRef, prerequisiteClass }) => ({
      ownerRef,
      prerequisiteClass,
    })),
    prerequisiteDecisions: decisions,
    executionKey: `procedure:${workId}`,
  }
  return {
    station,
    gates,
    procedureAdapter,
    authorizationRef: `agency-clearance:${clearanceLevel}:${operatorRef}`,
  }
}

export function isAuthoredProtectedLabWork(work: ProtectedRemoteWorkRecord): boolean {
  return (
    work.stationId === PROTECTED_LAB.stationId &&
    work.operatorNodeId === PROTECTED_LAB.operatorNodeId &&
    work.targetZoneRef === PROTECTED_LAB.targetZoneRef &&
    work.targetRef === PROTECTED_LAB.targetRef &&
    work.capabilityTag === PROTECTED_LAB.capabilityTag
  )
}
