// cspell:words partialize unequip
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import {
  appendOperationEventDrafts,
  createAgencyFrontBusinessOpenedDraft,
  createAgentInstructorAssignedDraft,
  createAgentInstructorUnassignedDraft,
  createEquipmentInstanceDestroyedDraft,
  createEquipmentInstanceMaterializedDraft,
  createEquipmentInstanceReaggregatedDraft,
  createSystemAcademyUpgradedDraft,
} from '../../domain/events'
import {
  adjustInventoryQuantity,
  clearEncounterRuntimeState,
  readGameStateManager,
  recordSceneVisit,
  setCurrentLocation as setManagedCurrentLocation,
  setDebugFlag,
  setEncounterRuntimeState,
  setInventoryQuantity,
  setPlayerProfile,
  setUiDebugState,
  type EncounterRuntimePatch,
  type ProgressClockPatch,
  type SceneVisitInput,
} from '../../domain/gameStateManager'
import {
  clearPersistentFlag as clearPersistentFlagState,
  consumeOneShotContent as consumeOneShotContentState,
  setPersistentFlag as setPersistentFlagState,
} from '../../domain/flagSystem'
import {
  applyAuthoredChoice as applyAuthoredChoiceState,
  type AuthoredChoiceDefinition,
  type AuthoredChoiceExecutionResult,
} from '../../domain/choiceSystem'
import {
  appendDeveloperLogEvent as appendDeveloperLogEventState,
  clearDeveloperLog as clearDeveloperLogState,
  type DeveloperLogEventInput,
} from '../../domain/developerLog'
import {
  applyDebugReset,
  applyEncounterDebugReset,
  applyFrontDeskRuntimeBaselineReset,
  applyQueueAndLogReset,
  type DebugResetRequest,
} from '../../domain/debugResetTools'
import { advanceDefinedProgressClock, setDefinedProgressClock } from '../../domain/progressClocks'
import {
  clearRuntimeEventQueue as clearRuntimeEventQueueState,
  dequeueRuntimeEvent as dequeueRuntimeEventState,
  enqueueRuntimeEvent as enqueueRuntimeEventState,
  listQueuedRuntimeEvents,
  peekQueuedRuntimeEvent,
  type RuntimeQueueEventInput,
} from '../../domain/eventQueue'
import {
  resolveAndApplyHiddenCombat,
  type HiddenCombatExecutionResult,
  type HiddenCombatResolutionInput,
} from '../../domain/hiddenCombatResolver'
import type { ScreenRouteContext } from '../../domain/screenRouting'
import {
  type ContractNextIntent,
  type DeveloperLogEvent,
  type GameConfig,
  type GameFlagValue,
  type GameLocationState,
  type GameState,
  type GameUiDebugState,
  type Id,
  type CertificationState,
  type MajorIncidentProvisionType,
  type MajorIncidentStrategy,
  type MissionTriageDisposition,
  type PlayerProfileState,
  type ProgressClockState,
  type RecruitmentFunnelStage,
  type StatKey,
  type WeeklyDirectiveId,
} from '../../domain/models'
import { createSeededRng, normalizeSeed } from '../../domain/math'
import { getEquipmentDefinition, type EquipmentSlotKind } from '../../domain/equipment'
import {
  COMBAT_STIM_DEFINITION_ID,
  destroyStoredOrdinaryEquipmentInstance,
  getEquipmentInstanceAtAgentSlot,
  reaggregateStoredOrdinaryEquipmentInstance,
} from '../../domain/equipmentInstance'
import { discardPartyCard, drawPartyCards, playPartyCard } from '../../domain/partyCards/engine'
import { createStartingState } from '../../data/startingState'
import { applyChapterBreakAttritionReset } from '../../domain/agent/attritionReset'
import { applyRotatingRosterContinuityReconciliation } from '../../domain/agent/rosterContinuity'
import { advanceWeek } from '../../domain/sim/advanceWeek'
import { assignTeam, launchMajorIncident, unassignTeam } from '../../domain/sim/assign'
import {
  askInvestigationQuestion as applyAskInvestigationQuestion,
  type InvestigationQuestionDomain,
} from '../../domain/investigationEconomy'
import { canAskInvestigationQuestionOnCase } from '../../features/cases/investigationCasePrepView'
import type { InfiltrationProbeAction } from '../../domain/infiltrationProbe'
import {
  applyInfiltrationWeeklyProbeActionOverride,
  canConfigureInfiltrationWeeklyProbeOnCase,
} from '../../domain/infiltrationProbeOverride'
import { applyInfiltrationEncounterCoverStance } from '../../domain/infiltrationEncounterCoverStance'
import type { InfiltrationEncounterCoverStance } from '../../domain/infiltrationEncounterCoverStance'
import {
  applyPublicDisclosurePostureChoice,
  type PublicDisclosurePostureChoice,
} from '../../domain/publicDisclosurePostureChoice'
import { applyStealthLeaveBehindSelection } from '../../domain/stealthLeaveBehindSelection'
import { queueFabrication } from '../../domain/sim/production'
import {
  queueEquipmentDeconstruction,
  type EquipmentDeconstructionSourceRef,
} from '../../domain/sim/equipmentDeconstruction'
import {
  disableEquipmentAutoScrapPolicy,
  enableEquipmentAutoScrapPolicy,
} from '../../domain/equipmentAutoScrap'
import type { EquipmentGradeId } from '../../domain/equipmentGrade'
import { invokeEmergencyGrayMarketWaiver } from '../../domain/procurementEmergency'
import {
  acknowledgeLicensedHandlingDoctrine,
  placeDelayedMarketOrder,
  purchaseMarketInventory,
  redeemFactionFavorProcurement,
  callCallableObligationProcurement,
  sellMarketInventory,
} from '../../domain/sim/market'
import { hireCandidate } from '../../domain/sim/hire'
import { scoutCandidate } from '../../domain/sim/recruitmentScouting'
import { transitionRecruitmentCandidate } from '../../domain/recruitment'
import {
  equipAgentItem,
  equipStoredEquipmentInstance,
  materializeStoredOrdinaryEquipmentInstance,
  unequipAgentItem,
} from '../../domain/sim/equipment'
import { activateCombatStim, equipStoredCombatStimInstance } from '../../domain/combatStim'
import {
  createTeam,
  deleteEmptyTeam,
  moveAgentBetweenTeams,
  renameTeam,
  setTeamLeader,
} from '../../domain/sim/teamManagement'
import {
  cancelTraining,
  reviewCertification,
  queueTeamTraining,
  queueTraining,
  spendSkillPoint,
  transitionCertification,
} from '../../domain/sim/training'
import {
  setAgentPrimaryDowntimePlan as applyPrimaryDowntimePlanToGame,
  type PlayerPrimaryDowntimeMenu,
} from '../../domain/sim/downtimeSlot'
import { upgradeAcademy } from '../../domain/sim/academyUpgrade'
import { openCourierShellFront } from '../../domain/sim/frontBusiness'
import {
  assignInstructor,
  getInstructorBonus,
  unassignInstructor,
} from '../../domain/sim/instructorAssignment'
import { applyRallySupportStaffAction } from '../../domain/hub/supportActions'
import {
  applyMissionTriageDisposition,
  clearMissionTriageDisposition,
  recomputeMissionRouting,
  routeMission,
  routeMissionToTeam,
} from '../../domain/missionIntakeRouting'
import { evaluateDeploymentEligibility } from '../../domain/deploymentReadiness'
import { reconcileAgents } from '../../domain/sim/reconciliation'
import { buildAffiliationFileWorkQueueActionRecord } from '../../domain/affiliationFileWorkQueueActionRecords'
import { buildAffiliationFileWorkQueueEvidenceResolutionRecord } from '../../domain/affiliationFileWorkQueueEvidenceResolutionRecords'
import {
  applyAffiliationFileWorkQueueEvidenceRepair,
  buildAffiliationFileWorkQueueRepairActionRecord,
} from '../../domain/affiliationFileWorkQueueRepairActionRecords'
import {
  buildAffiliationFileWorkQueueReleaseActionRecord,
  getAffiliationFileWorkQueueReleaseActionForBucket,
} from '../../domain/affiliationFileWorkQueueReleaseActionRecords'
import {
  buildAffiliationFileWorkQueueReleaseOutcomeRecord,
  getAffiliationFileWorkQueueReleaseOutcomeForAction,
} from '../../domain/affiliationFileWorkQueueReleaseOutcomeRecords'
import {
  buildAffiliationFileWorkQueueReleaseFulfillmentRecord,
  getAffiliationFileWorkQueueReleaseFulfillmentForOutcome,
} from '../../domain/affiliationFileWorkQueueReleaseFulfillmentRecords'
import {
  buildAffiliationFileWorkQueueReleasePackageRecord,
  getAffiliationFileWorkQueueReleasePackageForFulfillment,
} from '../../domain/affiliationFileWorkQueueReleasePackageRecords'
import {
  buildAffiliationFileWorkQueueFileReleaseDeliveryRecord,
  getAffiliationFileWorkQueueFileReleaseDeliveryForPackageMode,
} from '../../domain/affiliationFileWorkQueueFileReleaseDeliveryRecords'
import {
  buildAffiliationFileWorkQueueNonMissionEnforcementRecord,
  buildAffiliationFileWorkQueueNonMissionEnforcementRecordId,
  getAffiliationFileWorkQueueNonMissionEnforcementForBucket,
} from '../../domain/affiliationFileWorkQueueNonMissionEnforcementRecords'
import { buildAffiliationFileWorkQueueEvidenceRepairWorkflow } from '../../domain/affiliationFileWorkQueueEvidenceRepairWorkflows'
import { getAffiliationPersonStatusMirrorView } from '../../features/operations/affiliationPersonStatusMirrorView'
import {
  clearContractNextIntent,
  launchContract as launchContractDomain,
  refreshContractBoard,
  setContractNextIntent,
} from '../../domain/contracts'
import {
  createRunFromCurrentConfig,
  GAME_STORE_VERSION,
  hydrateGame,
  migratePersistedStore,
  parseRunExport,
  RUN_EXPORT_KIND,
  sanitizeGameConfig,
  serializeRunExport,
  stripGameTemplates,
  type PersistedStore,
} from './runTransfer'
import { GAME_SAVE_KIND, GAME_SAVE_VERSION, loadGameSave, serializeGameSave } from './saveSystem'
import {
  cancelCase as cancelCaseState,
  type CaseCancellationCommandResult,
} from '../../domain/caseLifecycleWeeklyOrchestration'
import {
  applyPreparedSupportProcedure as applyPreparedSupportProcedureState,
  refreshPreparedSupportProcedure as refreshPreparedSupportProcedureState,
} from '../../domain/supportLoadout'
import type { SquadMetadata } from '../../domain/squadMetadata'
import type { SquadKitTemplate } from '../../domain/squadKitTemplate'
import type { SquadKitAssignment } from '../../domain/squadKitAssignment'
import {
  enqueueDepartmentWorkshopWorkOrder as enqueueDepartmentWorkshopWorkOrderState,
  prioritizeDepartmentWorkshopWorkOrder as prioritizeDepartmentWorkshopWorkOrderState,
  type DepartmentWorkshopWorkOrder,
  type DepartmentWorkshopWriteResult,
} from '../../domain/departmentWorkshopQueue'
import {
  routeAndEnqueueDepartmentWorkshopWorkOrder as routeAndEnqueueDepartmentWorkshopWorkOrderState,
  type DepartmentWorkshopRoutingRequest,
  type DepartmentWorkshopRoutingResult,
} from '../../domain/departmentWorkshopRouting'
import {
  activateDepartmentWorkshopFromConstruction as activateDepartmentWorkshopFromConstructionState,
  type DepartmentWorkshopActivationRequest,
  type DepartmentWorkshopActivationResult,
} from '../../domain/departmentWorkshopActivation'
import {
  activateCaseScopedPrerequisiteProcessingOrder,
  reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder,
  type CaseScopedPrerequisiteReservationResult,
} from '../../domain/prerequisiteProcessingOrders'

interface GameStore {
  game: GameState
  appendDeveloperLogEvent: (event: DeveloperLogEventInput) => void
  clearDeveloperLog: () => void
  debugReset: (request: DebugResetRequest) => ReturnType<typeof applyDebugReset>['summary']
  debugResetFrontDeskBaseline: () => ReturnType<
    typeof applyFrontDeskRuntimeBaselineReset
  >['summary']
  debugResetQueueAndLog: () => ReturnType<typeof applyQueueAndLogReset>['summary']
  debugResetEncounterState: () => ReturnType<typeof applyEncounterDebugReset>['summary']
  setPersistentFlag: (flagId: string, value?: GameFlagValue) => void
  clearPersistentFlag: (flagId: string) => void
  consumeOneShotContent: (contentId: string, source?: string) => boolean
  enqueueRuntimeEvent: (event: RuntimeQueueEventInput) => string | null
  dequeueRuntimeEvent: () => string | null
  peekRuntimeEvent: () => string | null
  listRuntimeEventQueue: () => ReturnType<typeof listQueuedRuntimeEvents>
  clearRuntimeEventQueue: () => number
  enqueueDepartmentWorkshopWorkOrder: (
    workOrder: DepartmentWorkshopWorkOrder
  ) => DepartmentWorkshopWriteResult
  routeAndEnqueueDepartmentWorkshopWorkOrder: (
    request: DepartmentWorkshopRoutingRequest
  ) => DepartmentWorkshopRoutingResult
  activateDepartmentWorkshopFromConstruction: (
    request: DepartmentWorkshopActivationRequest
  ) => DepartmentWorkshopActivationResult
  prioritizeDepartmentWorkshopWorkOrder: (
    departmentId: string,
    workOrderId: string
  ) => DepartmentWorkshopWriteResult
  reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder: (
    workOrderId: string
  ) => CaseScopedPrerequisiteReservationResult
  activateCaseScopedPrerequisiteProcessingOrder: (
    workOrderId: string
  ) => CaseScopedPrerequisiteReservationResult
  applyAuthoredChoice: (
    choice: AuthoredChoiceDefinition,
    context?: ScreenRouteContext
  ) => AuthoredChoiceExecutionResult
  resolveHiddenEncounter: (
    input: HiddenCombatResolutionInput,
    context?: ScreenRouteContext
  ) => HiddenCombatExecutionResult
  setPlayerProfile: (patch: Partial<PlayerProfileState>) => void
  setGlobalFlag: (flagId: string, value: GameFlagValue) => void
  clearGlobalFlag: (flagId: string) => void
  markOneShotEvent: (eventId: string, source?: string) => void
  setCurrentLocation: (
    nextLocation: Pick<GameLocationState, 'hubId'> & Partial<Omit<GameLocationState, 'hubId'>>
  ) => void
  recordSceneVisit: (entry: SceneVisitInput) => void
  setEncounterRuntimeState: (encounterId: string, patch: EncounterRuntimePatch) => void
  clearEncounterRuntimeState: (encounterId: string) => void
  setProgressClock: (clockId: string, patch: ProgressClockPatch) => void
  advanceProgressClock: (
    clockId: string,
    delta: number,
    defaults?: Pick<ProgressClockState, 'label' | 'max' | 'hidden'>
  ) => void
  setUiDebugState: (patch: Partial<GameUiDebugState>) => void
  setDebugFlag: (flagId: string, enabled: boolean) => void
  setInventoryQuantity: (itemId: string, quantity: number) => void
  adjustInventoryQuantity: (itemId: string, delta: number) => void
  applyPreparedSupportProcedure: (
    encounterId: string,
    agentId: Id
  ) => ReturnType<typeof applyPreparedSupportProcedureState>
  refreshPreparedSupportProcedure: (
    encounterId: string,
    agentId: Id
  ) => ReturnType<typeof refreshPreparedSupportProcedureState>
  launchContract: (contractId: Id, teamId: Id) => void
  /** SPE-1496: capture or clear the player's bounded post-contract next intent. */
  setContractNextIntent: (intent: ContractNextIntent | null) => void
  clearContractNextIntent: () => void
  launchMajorIncident: (
    caseId: Id,
    teamIds: Id[],
    strategy?: MajorIncidentStrategy,
    provisions?: MajorIncidentProvisionType[]
  ) => void
  /** SPE-2763: explicitly emit cancellation proof without closing or mutating the case. */
  cancelCase: (caseId: Id) => CaseCancellationCommandResult
  assign: (caseId: Id, teamId: Id) => void
  unassign: (caseId: Id, teamId?: Id) => void
  /** SPE-2247: set stealth leave-behind tradeoff on an eligible in-progress infiltration case. */
  selectStealthLeaveBehind: (caseId: Id, leaveBehindId: string) => void
  /** SPE-626: ask a forensic or tactical investigation question on an in-progress case. */
  askInvestigationQuestion: (
    caseId: Id,
    domain: InvestigationQuestionDomain,
    questionId: string
  ) => void
  /** SPE-521 deferred UX: override or clear weekly infiltration probe action on an eligible case. */
  setInfiltrationWeeklyProbeAction: (caseId: Id, action: InfiltrationProbeAction | null) => void
  /** SPE-521 follow-up: set or clear infiltration encounter cover stance on an eligible case. */
  setInfiltrationEncounterCoverStance: (
    caseId: Id,
    stance: InfiltrationEncounterCoverStance | null
  ) => void
  /** SPE-861 slice 4: set disclosure posture choice on an active disclosure campaign record. */
  setPublicDisclosurePostureChoice: (recordId: Id, posture: PublicDisclosurePostureChoice) => void
  hireCandidate: (candidateId: Id) => void
  scoutCandidate: (candidateId: Id) => void
  transitionCandidateFunnel: (
    candidateId: Id,
    toStage: RecruitmentFunnelStage,
    options?: { note?: string; lossReason?: string }
  ) => boolean
  contactCandidate: (candidateId: Id, note?: string) => boolean
  screenCandidate: (candidateId: Id, note?: string) => boolean
  loseCandidate: (candidateId: Id, lossReason?: string) => boolean
  createTeam: (name: string, seedAgentId: Id) => void
  renameTeam: (teamId: Id, name: string) => void
  setTeamLeader: (teamId: Id, leaderId: Id | null) => void
  moveAgentBetweenTeams: (agentId: Id, targetTeamId?: Id | null) => void
  deleteEmptyTeam: (teamId: Id) => void
  /** SPE-1699: set the single weekly primary downtime menu action for an eligible operative. */
  setAgentPrimaryDowntimePlan: (agentId: Id, activity: PlayerPrimaryDowntimeMenu) => void
  queueTraining: (agentId: Id, trainingId: string) => void
  queueTeamTraining: (teamId: Id, trainingId: string) => void
  cancelTraining: (agentId: Id) => void
  transitionCertification: (
    agentId: Id,
    certificationId: string,
    toState: CertificationState,
    options?: { administrative?: boolean; notes?: string }
  ) => void
  reviewCertification: (
    agentId: Id,
    certificationId: string,
    approve: boolean,
    options?: { administrative?: boolean; notes?: string }
  ) => void
  spendSkillPoint: (agentId: Id, stat: StatKey) => void
  upgradeAcademy: () => void
  /** SPE-1703a: open the courier shell front when prerequisites and funding allow. */
  openCourierShellFront: () => void
  assignInstructor: (staffId: Id, agentId: Id) => void
  unassignInstructor: (staffId: Id) => void
  reconcileAgents: (leftId: Id, rightId: Id) => void
  materializeStoredEquipmentInstance: (itemId: string) => void
  destroyStoredEquipmentInstance: (instanceId: string) => void
  reaggregateStoredEquipmentInstance: (instanceId: string) => void
  equipAgentItem: (agentId: Id, slot: EquipmentSlotKind, itemId: string) => void
  equipStoredEquipmentInstance: (instanceId: string, agentId: Id, slot: EquipmentSlotKind) => void
  equipStoredCombatStimInstance: (instanceId: string, agentId: Id, slot: EquipmentSlotKind) => void
  activateCombatStim: (instanceId: string) => void
  unequipAgentItem: (agentId: Id, slot: EquipmentSlotKind) => void
  queueFabrication: (recipeId: string) => void
  queueEquipmentDeconstruction: (itemId: string, source?: EquipmentDeconstructionSourceRef) => void
  enableEquipmentAutoScrap: (thresholdGradeId: EquipmentGradeId) => void
  disableEquipmentAutoScrap: () => void
  purchaseMarketInventory: (listingId: string, bundles?: number) => void
  placeDelayedMarketOrder: (listingId: string, bundles?: number) => void
  redeemFactionFavorProcurement: (listingId: string, bundles?: number) => void
  callCallableObligationProcurement: (listingId: string, bundles?: number) => void
  /** Renew licensed-handling doctrine attestation for the current campaign week (SPE-874). */
  acknowledgeLicensedHandlingDoctrine: () => void
  /** Crisis waiver: temporarily unlock gray-market broker for sanctioned posture (SPE-1524). */
  invokeEmergencyGrayMarketWaiver: () => void
  sellMarketInventory: (listingId: string, bundles?: number) => void
  drawPartyCards: (count?: number) => void
  playPartyCard: (cardId: Id, targetCaseId?: Id, targetTeamId?: Id) => void
  discardPartyCard: (cardId: Id) => void
  setWeeklyDirective: (directiveId: WeeklyDirectiveId | null) => void
  refreshMissionRouting: () => void
  setMissionTriageDisposition: (missionId: Id, disposition: MissionTriageDisposition) => void
  clearMissionTriageDisposition: (missionId: Id) => void
  evaluateMissionDeployment: (
    missionId: Id,
    teamId: Id
  ) => ReturnType<typeof evaluateDeploymentEligibility> | null
  assignMissionTeam: (missionId: Id, teamId: Id) => boolean
  rallySupportStaff: (amount?: number) => ReturnType<typeof applyRallySupportStaffAction>['note']
  recordAffiliationFileWorkQueueAction: (entryId: string) => void
  recordAffiliationFileWorkQueueEvidenceResolution: (entryId: string) => void
  recordAffiliationFileWorkQueueRepairAction: (entryId: string, reasonCode: string) => void
  recordAffiliationFileWorkQueueReleaseAction: (entryId: string) => void
  recordAffiliationFileWorkQueueReleaseOutcome: (entryId: string) => void
  recordAffiliationFileWorkQueueReleaseFulfillment: (entryId: string) => void
  recordAffiliationFileWorkQueueReleasePackage: (entryId: string) => void
  recordAffiliationFileWorkQueueFileReleaseDelivery: (entryId: string) => void
  recordAffiliationFileWorkQueueNonMissionEnforcement: (entryId: string) => void
  recordAffiliationFileWorkQueueEvidenceRepairWorkflow: (entryId: string) => void
  advanceWeek: () => void
  setSeed: (seed: number) => void
  setSquadMetadata: (metadata: SquadMetadata) => void
  setSquadKitTemplate: (template: SquadKitTemplate) => void
  setSquadKitAssignment: (assignment: SquadKitAssignment) => void
  updateConfig: (patch: Partial<GameConfig>) => void
  exportSave: () => string
  importSave: (raw: string) => void
  exportRun: () => string
  importRun: (raw: string) => void
  newRunFromCurrentConfig: () => void
  /** SPE-281: Clear persisted operative attrition state at an explicit chapter break (deterministic). */
  applyChapterBreakAttritionContinuityReset: () => void
  /**
   * SPE-283: Apply the rotating-roster reconciliation rule to in-flight cases —
   * hidden-replacement packets whose assigned roster has no active operative
   * left are promoted to `revealed`, the inherited `route` / `displacementTarget`
   * / `detectionConfidence` decision surface is preserved, and derived routing /
   * pressure / readiness / contracts are re-derived through the canonical sequence.
   */
  applyRotatingRosterContinuityReconciliation: () => void
  reset: () => void
}

function areStringListsEqual(
  left: readonly string[] | undefined,
  right: readonly string[] | undefined
) {
  const normalizedLeft = left ?? []
  const normalizedRight = right ?? []

  if (normalizedLeft.length !== normalizedRight.length) {
    return false
  }

  return normalizedLeft.every((entry, index) => entry === normalizedRight[index])
}

function areLocationStatesEqual(left: GameLocationState, right: GameLocationState) {
  return (
    left.hubId === right.hubId &&
    left.locationId === right.locationId &&
    left.sceneId === right.sceneId &&
    left.updatedWeek === right.updatedWeek
  )
}

function areProgressClocksEqual(
  left: ReturnType<typeof readGameStateManager>['progressClocks'][string] | undefined,
  right: ReturnType<typeof readGameStateManager>['progressClocks'][string] | undefined
) {
  return (
    left?.id === right?.id &&
    left?.label === right?.label &&
    left?.value === right?.value &&
    left?.max === right?.max &&
    left?.hidden === right?.hidden &&
    left?.completedAtWeek === right?.completedAtWeek
  )
}

function areEncounterStatesEqual(
  left: ReturnType<typeof readGameStateManager>['encounterState'][string] | undefined,
  right: ReturnType<typeof readGameStateManager>['encounterState'][string] | undefined
) {
  if (!left && !right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  const leftFlags = Object.entries(left.flags ?? {}).sort(([leftId], [rightId]) =>
    leftId.localeCompare(rightId)
  )
  const rightFlags = Object.entries(right.flags ?? {}).sort(([leftId], [rightId]) =>
    leftId.localeCompare(rightId)
  )

  return (
    left.encounterId === right.encounterId &&
    left.status === right.status &&
    left.phase === right.phase &&
    left.startedWeek === right.startedWeek &&
    left.resolvedWeek === right.resolvedWeek &&
    left.latestOutcome === right.latestOutcome &&
    left.lastResolutionId === right.lastResolutionId &&
    areStringListsEqual(left.followUpIds ?? [], right.followUpIds ?? []) &&
    left.lastUpdatedWeek === right.lastUpdatedWeek &&
    areStringListsEqual(left.hiddenModifierIds ?? [], right.hiddenModifierIds ?? []) &&
    areStringListsEqual(left.revealedModifierIds ?? [], right.revealedModifierIds ?? []) &&
    JSON.stringify(leftFlags) === JSON.stringify(rightFlags)
  )
}

function areAuthoringDebugStatesEqual(
  left: GameUiDebugState['authoring'] | undefined,
  right: GameUiDebugState['authoring'] | undefined
) {
  return (
    left?.activeContextId === right?.activeContextId &&
    left?.lastChoiceId === right?.lastChoiceId &&
    left?.lastNextTargetId === right?.lastNextTargetId &&
    left?.updatedWeek === right?.updatedWeek &&
    areStringListsEqual(left?.lastFollowUpIds, right?.lastFollowUpIds)
  )
}

function formatLocationSummary(location: GameLocationState) {
  return [location.hubId, location.locationId, location.sceneId].filter(Boolean).join(' / ')
}

function serializeDeveloperLogDetails(details: DeveloperLogEvent['details']) {
  if (!details) {
    return ''
  }

  return JSON.stringify(
    Object.fromEntries(
      Object.entries(details)
        .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
        .map(([detailId, detailValue]) => [
          detailId,
          Array.isArray(detailValue) ? [...detailValue] : detailValue,
        ])
    )
  )
}

function getLastDeveloperLogEvent(game: GameState): DeveloperLogEvent | undefined {
  const entries = readGameStateManager(game).ui.debug.eventLog ?? []
  return entries.length > 0 ? entries[entries.length - 1] : undefined
}

function appendAuthoringContextLogIfChanged(
  previousGame: GameState,
  nextGame: GameState,
  fallbackContextId?: string
) {
  const previousAuthoring = readGameStateManager(previousGame).ui.authoring
  const nextAuthoring = readGameStateManager(nextGame).ui.authoring

  if (areAuthoringDebugStatesEqual(previousAuthoring, nextAuthoring)) {
    return nextGame
  }

  return appendDeveloperLogEventState(nextGame, {
    type: 'authoring.context_changed',
    summary: 'Authored context updated',
    contextId: nextAuthoring?.activeContextId ?? fallbackContextId,
    details: {
      activeContextId: nextAuthoring?.activeContextId ?? 'n/a',
      ...(nextAuthoring?.lastChoiceId ? { lastChoiceId: nextAuthoring.lastChoiceId } : {}),
      ...(nextAuthoring?.lastNextTargetId ? { nextTargetId: nextAuthoring.lastNextTargetId } : {}),
      ...(nextAuthoring?.lastFollowUpIds?.length
        ? { followUpIds: nextAuthoring.lastFollowUpIds }
        : {}),
      ...(typeof nextAuthoring?.updatedWeek === 'number'
        ? { updatedWeek: nextAuthoring.updatedWeek }
        : {}),
    },
  })
}

// ----- Storage resolution (mirrors incidentStore.ts safety pattern) -----

const _gameMemoryStorage = new Map<string, string>()

export const gameStorageFallback: StateStorage = {
  getItem: (name) => _gameMemoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    _gameMemoryStorage.set(name, value)
  },
  removeItem: (name) => {
    _gameMemoryStorage.delete(name)
  },
}

export function resolveGameStorage(): StateStorage {
  if (typeof window !== 'undefined') {
    try {
      const candidate = window.localStorage

      if (
        candidate &&
        typeof candidate.getItem === 'function' &&
        typeof candidate.setItem === 'function' &&
        typeof candidate.removeItem === 'function'
      ) {
        return candidate
      }
    } catch {
      return gameStorageFallback
    }
  }

  return gameStorageFallback
}

// ----- Store -----

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: createStartingState(),

      appendDeveloperLogEvent: (event) =>
        set((s) => {
          const lastEvent = getLastDeveloperLogEvent(s.game)
          const contextId =
            event.contextId ?? readGameStateManager(s.game).ui.authoring?.activeContextId
          const isDuplicate =
            lastEvent?.type === event.type &&
            lastEvent.summary === event.summary &&
            lastEvent.week ===
              (typeof event.week === 'number'
                ? Math.max(1, Math.trunc(event.week))
                : s.game.week) &&
            lastEvent.contextId === contextId &&
            serializeDeveloperLogDetails(lastEvent.details) ===
              serializeDeveloperLogDetails(event.details)

          return {
            game: isDuplicate ? s.game : appendDeveloperLogEventState(s.game, event),
          }
        }),

      clearDeveloperLog: () => set((s) => ({ game: clearDeveloperLogState(s.game) })),

      debugReset: (request) => {
        let resetSummary: ReturnType<typeof applyDebugReset>['summary'] = {
          clearedDeveloperLog: false,
          clearedEventQueue: false,
          resetFlagCount: 0,
          resetOneShotCount: 0,
          resetProgressClockCount: 0,
          clearedEncounterCount: 0,
          resetAuthoredDebugContext: false,
          fullRuntimeDebugReset: false,
        }

        set((s) => {
          const reset = applyDebugReset(s.game, request)
          resetSummary = reset.summary

          const changedSummary = [
            reset.summary.clearedDeveloperLog ? 'developer-log' : null,
            reset.summary.clearedEventQueue ? 'event-queue' : null,
            reset.summary.resetFlagCount > 0 ? `flags:${reset.summary.resetFlagCount}` : null,
            reset.summary.resetOneShotCount > 0
              ? `one-shots:${reset.summary.resetOneShotCount}`
              : null,
            reset.summary.resetProgressClockCount > 0
              ? `clocks:${reset.summary.resetProgressClockCount}`
              : null,
            reset.summary.clearedEncounterCount > 0
              ? `encounters:${reset.summary.clearedEncounterCount}`
              : null,
            reset.summary.resetAuthoredDebugContext ? 'authored-context' : null,
            reset.summary.fullRuntimeDebugReset ? 'runtime-full' : null,
          ].filter((entry): entry is string => Boolean(entry))

          const game = appendDeveloperLogEventState(reset.state, {
            type: 'authoring.context_changed',
            summary:
              changedSummary.length > 0
                ? `Debug reset applied (${changedSummary.join(', ')})`
                : 'Debug reset invoked (no-op)',
            details: {
              clearedDeveloperLog: reset.summary.clearedDeveloperLog,
              clearedEventQueue: reset.summary.clearedEventQueue,
              resetFlagCount: reset.summary.resetFlagCount,
              resetOneShotCount: reset.summary.resetOneShotCount,
              resetProgressClockCount: reset.summary.resetProgressClockCount,
              clearedEncounterCount: reset.summary.clearedEncounterCount,
              resetAuthoredDebugContext: reset.summary.resetAuthoredDebugContext,
              fullRuntimeDebugReset: reset.summary.fullRuntimeDebugReset,
            },
          })

          return { game }
        })

        return resetSummary
      },

      debugResetFrontDeskBaseline: () => {
        let resetSummary = applyFrontDeskRuntimeBaselineReset(get().game).summary

        set((s) => {
          const reset = applyFrontDeskRuntimeBaselineReset(s.game)
          resetSummary = reset.summary

          return {
            game: appendDeveloperLogEventState(reset.state, {
              type: 'authoring.context_changed',
              summary: 'Debug reset applied (front-desk baseline)',
              details: {
                clearedDeveloperLog: reset.summary.clearedDeveloperLog,
                clearedEventQueue: reset.summary.clearedEventQueue,
                clearedEncounterCount: reset.summary.clearedEncounterCount,
                resetAuthoredDebugContext: reset.summary.resetAuthoredDebugContext,
              },
            }),
          }
        })

        return resetSummary
      },

      debugResetQueueAndLog: () => {
        let resetSummary = applyQueueAndLogReset(get().game).summary

        set((s) => {
          const reset = applyQueueAndLogReset(s.game)
          resetSummary = reset.summary

          return {
            game: appendDeveloperLogEventState(reset.state, {
              type: 'authoring.context_changed',
              summary: 'Debug reset applied (queue + log)',
              details: {
                clearedDeveloperLog: reset.summary.clearedDeveloperLog,
                clearedEventQueue: reset.summary.clearedEventQueue,
              },
            }),
          }
        })

        return resetSummary
      },

      debugResetEncounterState: () => {
        let resetSummary = applyEncounterDebugReset(get().game).summary

        set((s) => {
          const reset = applyEncounterDebugReset(s.game)
          resetSummary = reset.summary

          return {
            game: appendDeveloperLogEventState(reset.state, {
              type: 'authoring.context_changed',
              summary: 'Debug reset applied (encounter state)',
              details: {
                clearedEventQueue: reset.summary.clearedEventQueue,
                clearedEncounterCount: reset.summary.clearedEncounterCount,
              },
            }),
          }
        })

        return resetSummary
      },

      setPersistentFlag: (flagId, value = true) =>
        set((s) => {
          const beforeValue = readGameStateManager(s.game).globalFlags[flagId]
          let game = setPersistentFlagState(s.game, flagId, value)
          const afterValue = readGameStateManager(game).globalFlags[flagId]

          game = appendDeveloperLogEventState(game, {
            type: 'flag.set',
            summary: `Flag set: ${flagId}`,
            details: {
              flagId,
              value:
                typeof afterValue === 'boolean' ||
                typeof afterValue === 'number' ||
                typeof afterValue === 'string'
                  ? afterValue
                  : String(value),
            },
          })

          return {
            game: beforeValue !== afterValue ? game : s.game,
          }
        }),

      clearPersistentFlag: (flagId) =>
        set((s) => {
          const beforeValue = readGameStateManager(s.game).globalFlags[flagId]
          let game = clearPersistentFlagState(s.game, flagId)
          const afterValue = readGameStateManager(game).globalFlags[flagId]

          game = appendDeveloperLogEventState(game, {
            type: 'flag.cleared',
            summary: `Flag cleared: ${flagId}`,
            details: {
              flagId,
            },
          })

          return {
            game: beforeValue !== afterValue ? game : s.game,
          }
        }),

      consumeOneShotContent: (contentId, source) => {
        let consumed = false
        set((s) => {
          const result = consumeOneShotContentState(s.game, contentId, source)
          consumed = result.consumed
          const game = result.consumed
            ? appendDeveloperLogEventState(result.state, {
                type: 'one_shot.consumed',
                summary: `One-shot consumed: ${contentId}`,
                details: {
                  contentId,
                  ...(source ? { source } : {}),
                },
              })
            : result.state
          return { game }
        })
        return consumed
      },

      enqueueRuntimeEvent: (event) => {
        let enqueuedId: string | null = null
        set((s) => {
          const result = enqueueRuntimeEventState(s.game, event)
          if (!result.event) {
            return { game: s.game }
          }

          enqueuedId = result.event.id
          const game = appendDeveloperLogEventState(result.state, {
            type: 'event_queue.enqueued',
            summary: `Runtime event queued: ${result.event.type}`,
            contextId: result.event.contextId,
            details: {
              queueEventId: result.event.id,
              type: result.event.type,
              targetId: result.event.targetId,
              ...(result.event.source ? { source: result.event.source } : {}),
            },
          })

          return { game }
        })

        return enqueuedId
      },

      dequeueRuntimeEvent: () => {
        let dequeuedId: string | null = null
        set((s) => {
          const result = dequeueRuntimeEventState(s.game)

          if (!result.event) {
            return { game: s.game }
          }

          dequeuedId = result.event.id
          const game = appendDeveloperLogEventState(result.state, {
            type: 'event_queue.dequeued',
            summary: `Runtime event dequeued: ${result.event.type}`,
            contextId: result.event.contextId,
            details: {
              queueEventId: result.event.id,
              type: result.event.type,
              targetId: result.event.targetId,
              ...(result.event.source ? { source: result.event.source } : {}),
            },
          })

          return { game }
        })

        return dequeuedId
      },

      peekRuntimeEvent: () => {
        return peekQueuedRuntimeEvent(get().game)?.id ?? null
      },

      listRuntimeEventQueue: () => listQueuedRuntimeEvents(get().game),

      clearRuntimeEventQueue: () => {
        let removed = 0
        set((s) => {
          const queueBefore = listQueuedRuntimeEvents(s.game)
          removed = queueBefore.length

          if (removed === 0) {
            return { game: s.game }
          }

          const game = appendDeveloperLogEventState(clearRuntimeEventQueueState(s.game), {
            type: 'event_queue.cleared',
            summary: 'Runtime event queue cleared',
            details: {
              removed,
            },
          })

          return { game }
        })

        return removed
      },

      enqueueDepartmentWorkshopWorkOrder: (workOrder) => {
        let writeResult: DepartmentWorkshopWriteResult | null = null
        set((s) => {
          writeResult = enqueueDepartmentWorkshopWorkOrderState(s.game, workOrder)
          if (writeResult.state === 'blocked') {
            return { game: s.game }
          }
          return {
            game: {
              ...s.game,
              departmentWorkshopWorkOrders: writeResult.workshopState.workOrders,
              departmentWorkshopSnapshots: writeResult.workshopState.snapshots,
            },
          }
        })
        return writeResult!
      },

      routeAndEnqueueDepartmentWorkshopWorkOrder: (request) => {
        let routingResult: DepartmentWorkshopRoutingResult | null = null
        set((s) => {
          routingResult = routeAndEnqueueDepartmentWorkshopWorkOrderState(s.game, request)
          const writeResult = routingResult.writeResult
          if (routingResult.state === 'blocked' || !writeResult) {
            return { game: s.game }
          }
          return {
            game: {
              ...s.game,
              departmentWorkshopWorkOrders: writeResult.workshopState.workOrders,
              departmentWorkshopSnapshots: writeResult.workshopState.snapshots,
            },
          }
        })
        return routingResult!
      },

      activateDepartmentWorkshopFromConstruction: (request) => {
        let activationResult: DepartmentWorkshopActivationResult | null = null
        set((s) => {
          activationResult = activateDepartmentWorkshopFromConstructionState(s.game, request)
          if (activationResult.state !== 'activated') {
            return { game: s.game }
          }
          return {
            game: {
              ...s.game,
              departmentWorkshopWorkOrders: activationResult.workshopState.workOrders,
              departmentWorkshopSnapshots: activationResult.workshopState.snapshots,
            },
          }
        })
        return activationResult!
      },

      prioritizeDepartmentWorkshopWorkOrder: (departmentId, workOrderId) => {
        let writeResult: DepartmentWorkshopWriteResult | null = null
        set((s) => {
          writeResult = prioritizeDepartmentWorkshopWorkOrderState(
            s.game,
            departmentId,
            workOrderId
          )
          if (writeResult.state === 'blocked') {
            return { game: s.game }
          }
          return {
            game: {
              ...s.game,
              departmentWorkshopWorkOrders: writeResult.workshopState.workOrders,
              departmentWorkshopSnapshots: writeResult.workshopState.snapshots,
            },
          }
        })
        return writeResult!
      },

      reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder: (workOrderId) => {
        let result: CaseScopedPrerequisiteReservationResult | null = null
        set((s) => {
          result = reserveAndEnqueueCaseScopedPrerequisiteProcessingOrder(s.game, workOrderId)
          if (result.state === 'blocked') return { game: s.game }
          return {
            game: {
              ...s.game,
              inventory: result.inventory,
              caseScopedPrerequisiteProcessingReservations: result.reservations,
              departmentWorkshopWorkOrders:
                result.workshopWorkOrders as GameState['departmentWorkshopWorkOrders'],
              departmentWorkshopSnapshots:
                result.workshopSnapshots as GameState['departmentWorkshopSnapshots'],
            },
          }
        })
        return result!
      },
      activateCaseScopedPrerequisiteProcessingOrder: (workOrderId) => {
        let result: CaseScopedPrerequisiteReservationResult | null = null
        set((s) => {
          result = activateCaseScopedPrerequisiteProcessingOrder(s.game, workOrderId)
          if (result.state === 'blocked') return { game: s.game }
          return {
            game: {
              ...s.game,
              inventory: result.inventory,
              caseScopedPrerequisiteProcessingReservations: result.reservations,
              departmentWorkshopWorkOrders:
                result.workshopWorkOrders as GameState['departmentWorkshopWorkOrders'],
              departmentWorkshopSnapshots:
                result.workshopSnapshots as GameState['departmentWorkshopSnapshots'],
            },
          }
        })
        return result!
      },

      applyAuthoredChoice: (choice, context) => {
        let result: AuthoredChoiceExecutionResult = {
          state: get().game,
          choiceId: choice.id,
          applied: false,
          availability: null,
          ...(choice.nextTargetId ? { nextTargetId: choice.nextTargetId } : {}),
          followUpIds: [],
          appliedConsequences: [],
          changedFlags: [],
          clearedFlags: [],
          consumedOneShots: [],
          touchedProgressClocks: [],
          touchedEncounterIds: [],
          sceneVisits: [],
          locationUpdated: false,
        }

        set((s) => {
          // Pure deterministic choice-application logic is handled by domain
          result = applyAuthoredChoiceState(s.game, choice, context)
          // Context logging, debug snapshotting, and event queue wiring remain in the store
          let gameWithDebugSnapshot: GameState = setUiDebugState(result.state, {
            authoring: {
              ...(context?.activeContextId ? { activeContextId: context.activeContextId } : {}),
              lastChoiceId: result.choiceId,
              ...(result.nextTargetId ? { lastNextTargetId: result.nextTargetId } : {}),
              lastFollowUpIds: result.followUpIds,
              updatedWeek: s.game.week,
            },
          })
          gameWithDebugSnapshot = appendDeveloperLogEventState(gameWithDebugSnapshot, {
            type: 'choice.executed',
            summary: `Choice executed: ${result.choiceId}`,
            contextId: context?.activeContextId,
            details: {
              ...(result.nextTargetId ? { nextTargetId: result.nextTargetId } : {}),
              ...(result.changedFlags.length ? { changedFlags: result.changedFlags } : {}),
              ...(result.clearedFlags.length ? { clearedFlags: result.clearedFlags } : {}),
              ...(result.consumedOneShots.length
                ? { consumedOneShots: result.consumedOneShots }
                : {}),
              ...(result.touchedProgressClocks.length
                ? { progressClocks: result.touchedProgressClocks }
                : {}),
              ...(result.touchedEncounterIds.length
                ? { encounterIds: result.touchedEncounterIds }
                : {}),
              ...(result.followUpIds.length ? { followUpIds: result.followUpIds } : {}),
            },
          })
          const queuedEvents = listQueuedRuntimeEvents(gameWithDebugSnapshot).filter(
            (event) => event.source === result.choiceId
          )
          gameWithDebugSnapshot = queuedEvents.length
            ? appendDeveloperLogEventState(gameWithDebugSnapshot, {
                type: 'event_queue.enqueued',
                summary: `Choice queued ${queuedEvents.length} follow-up event${queuedEvents.length === 1 ? '' : 's'}`,
                contextId: context?.activeContextId,
                details: {
                  choiceId: result.choiceId,
                  queueEventIds: queuedEvents.map((event) => event.id),
                  followUpIds: queuedEvents.map((event) => event.targetId),
                },
              })
            : gameWithDebugSnapshot
          gameWithDebugSnapshot = appendAuthoringContextLogIfChanged(
            s.game,
            gameWithDebugSnapshot,
            context?.activeContextId
          )
          result = {
            ...result,
            state: gameWithDebugSnapshot,
          }
          return {
            game: gameWithDebugSnapshot,
          }
        })

        return result
      },

      resolveHiddenEncounter: (input, context) => {
        let result: HiddenCombatExecutionResult = {
          resolution: {
            resolutionId: `hidden-combat.${input.encounterId}.${get().game.week}.failure`,
            outcomeId: 'failure',
            branchIsFallback: true,
            encounterId: input.encounterId,
            week: get().game.week,
            outcome: 'failure',
            success: false,
            score: 0,
            encounterPatch: {
              status: 'active',
              phase: 'hidden-combat:failure',
              flags: {
                hiddenCombatResolved: true,
                hiddenCombatSuccess: false,
                hiddenCombatPartial: false,
                hiddenCombatFailure: true,
              },
              lastUpdatedWeek: get().game.week,
            },
            followUpIds: [],
            queueEvents: [],
            flagEffects: {},
            progressEffects: [],
            allyBehaviors: [],
          },
          apply: {
            state: get().game,
            queuedEventIds: [],
            queueEvents: [],
          },
        }

        set((s) => {
          // Pure deterministic hidden-encounter resolution logic is handled by domain
          result = resolveAndApplyHiddenCombat(s.game, input, {
            contextId: context?.activeContextId,
          })
          // Event creation and queue wiring remain in the store
          let game = appendDeveloperLogEventState(result.apply.state, {
            type: 'encounter.patched',
            summary: `Hidden encounter resolved: ${result.resolution.encounterId} (${result.resolution.outcome})`,
            contextId: context?.activeContextId,
            details: {
              encounterId: result.resolution.encounterId,
              outcome: result.resolution.outcome,
              score: result.resolution.score,
              resolutionId: result.resolution.resolutionId,
              ...(result.resolution.followUpIds.length
                ? { followUpIds: result.resolution.followUpIds }
                : {}),
            },
          })
          game = result.apply.queueEvents.length
            ? appendDeveloperLogEventState(game, {
                type: 'event_queue.enqueued',
                summary: `Hidden encounter queued ${result.apply.queueEvents.length} follow-up event${result.apply.queueEvents.length === 1 ? '' : 's'}`,
                contextId: context?.activeContextId,
                details: {
                  encounterId: result.resolution.encounterId,
                  queueEventIds: result.apply.queuedEventIds,
                  followUpIds: result.apply.queueEvents.map((event) => event.targetId),
                },
              })
            : game
          result = {
            ...result,
            apply: {
              ...result.apply,
              state: game,
            },
          }
          return {
            game,
          }
        })
        return result
      },

      setPlayerProfile: (patch) => set((s) => ({ game: setPlayerProfile(s.game, patch) })),

      setGlobalFlag: (flagId, value) => get().setPersistentFlag(flagId, value),

      clearGlobalFlag: (flagId) => get().clearPersistentFlag(flagId),

      markOneShotEvent: (eventId, source) => get().consumeOneShotContent(eventId, source),

      setCurrentLocation: (nextLocation) =>
        set((s) => {
          const beforeLocation = readGameStateManager(s.game).currentLocation
          let game = setManagedCurrentLocation(s.game, nextLocation)
          const afterLocation = readGameStateManager(game).currentLocation

          game = appendDeveloperLogEventState(game, {
            type: 'location.changed',
            summary: `Location changed: ${formatLocationSummary(afterLocation)}`,
            details: {
              hubId: afterLocation.hubId,
              ...(afterLocation.locationId ? { locationId: afterLocation.locationId } : {}),
              ...(afterLocation.sceneId ? { sceneId: afterLocation.sceneId } : {}),
            },
          })

          return {
            game: areLocationStatesEqual(beforeLocation, afterLocation) ? s.game : game,
          }
        }),

      recordSceneVisit: (entry) =>
        set((s) => {
          const beforeLocation = readGameStateManager(s.game).currentLocation
          let game = recordSceneVisit(s.game, entry)
          const afterLocation = readGameStateManager(game).currentLocation

          game = areLocationStatesEqual(beforeLocation, afterLocation)
            ? game
            : appendDeveloperLogEventState(game, {
                type: 'location.changed',
                summary: `Location changed: ${formatLocationSummary(afterLocation)}`,
                details: {
                  hubId: afterLocation.hubId,
                  ...(afterLocation.locationId ? { locationId: afterLocation.locationId } : {}),
                  ...(afterLocation.sceneId ? { sceneId: afterLocation.sceneId } : {}),
                  ...(entry.outcome ? { outcome: entry.outcome } : {}),
                },
              })

          return {
            game,
          }
        }),

      setEncounterRuntimeState: (encounterId, patch) =>
        set((s) => {
          const beforeEncounter = readGameStateManager(s.game).encounterState[encounterId]
          let game = setEncounterRuntimeState(s.game, encounterId, patch)
          const afterEncounter = readGameStateManager(game).encounterState[encounterId]

          game = appendDeveloperLogEventState(game, {
            type: 'encounter.patched',
            summary: `Encounter runtime patched: ${encounterId}`,
            details: {
              encounterId,
              ...(afterEncounter?.status ? { status: afterEncounter.status } : {}),
              ...(afterEncounter?.phase ? { phase: afterEncounter.phase } : {}),
              ...((afterEncounter?.hiddenModifierIds ?? []).length
                ? { hiddenModifierIds: afterEncounter?.hiddenModifierIds ?? [] }
                : {}),
              ...((afterEncounter?.revealedModifierIds ?? []).length
                ? { revealedModifierIds: afterEncounter?.revealedModifierIds ?? [] }
                : {}),
            },
          })

          return {
            game: areEncounterStatesEqual(beforeEncounter, afterEncounter) ? s.game : game,
          }
        }),

      clearEncounterRuntimeState: (encounterId) =>
        set((s) => ({ game: clearEncounterRuntimeState(s.game, encounterId) })),

      setProgressClock: (clockId, patch) =>
        set((s) => {
          const beforeClock = readGameStateManager(s.game).progressClocks[clockId]
          let game = setDefinedProgressClock(s.game, clockId, patch)
          const afterClock = readGameStateManager(game).progressClocks[clockId]

          game = appendDeveloperLogEventState(game, {
            type: 'progress_clock.changed',
            summary: `Progress clock changed: ${clockId}`,
            details: {
              clockId,
              ...(afterClock?.label ? { label: afterClock.label } : {}),
              ...(afterClock ? { value: afterClock.value, max: afterClock.max } : {}),
            },
          })

          return {
            game: areProgressClocksEqual(beforeClock, afterClock) ? s.game : game,
          }
        }),

      advanceProgressClock: (clockId, delta, defaults) =>
        set((s) => {
          const beforeClock = readGameStateManager(s.game).progressClocks[clockId]
          let game = advanceDefinedProgressClock(s.game, clockId, delta, defaults)
          const afterClock = readGameStateManager(game).progressClocks[clockId]

          game = appendDeveloperLogEventState(game, {
            type: 'progress_clock.changed',
            summary: `Progress clock changed: ${clockId}`,
            details: {
              clockId,
              delta,
              ...(afterClock?.label ? { label: afterClock.label } : {}),
              ...(afterClock ? { value: afterClock.value, max: afterClock.max } : {}),
            },
          })

          return {
            game: areProgressClocksEqual(beforeClock, afterClock) ? s.game : game,
          }
        }),

      setUiDebugState: (patch) =>
        set((s) => {
          let game: GameState = setUiDebugState(s.game, patch)
          game = patch.authoring ? appendAuthoringContextLogIfChanged(s.game, game) : game
          return { game }
        }),

      setDebugFlag: (flagId, enabled) =>
        set((s) => ({ game: setDebugFlag(s.game, flagId, enabled) })),

      setInventoryQuantity: (itemId, quantity) =>
        set((s) => ({ game: setInventoryQuantity(s.game, itemId, quantity) })),

      adjustInventoryQuantity: (itemId, delta) =>
        set((s) => ({ game: adjustInventoryQuantity(s.game, itemId, delta) })),

      applyPreparedSupportProcedure: (encounterId, agentId) => {
        const result = applyPreparedSupportProcedureState(get().game, encounterId, agentId)

        set(() => ({ game: result.state }))

        return result
      },

      refreshPreparedSupportProcedure: (encounterId, agentId) => {
        const result = refreshPreparedSupportProcedureState(get().game, encounterId, agentId)

        set(() => ({ game: result.state }))

        return result
      },

      launchContract: (contractId, teamId) =>
        set((s) => ({ game: launchContractDomain(s.game, contractId, teamId) })),

      setContractNextIntent: (intent) =>
        set((s) => ({ game: setContractNextIntent(s.game, intent) })),

      clearContractNextIntent: () => set((s) => ({ game: clearContractNextIntent(s.game) })),

      launchMajorIncident: (caseId, teamIds, strategy = 'balanced', provisions = []) =>
        set((s) => {
          if (
            routeMission(s.game, caseId).routingBlockers.includes(
              'authority-mission-access-restricted'
            )
          ) {
            return { game: s.game }
          }

          return {
            game: launchMajorIncident(s.game, caseId, teamIds, strategy, provisions),
          }
        }),

      cancelCase: (caseId) => {
        let result: CaseCancellationCommandResult | null = null
        set((s) => {
          result = cancelCaseState(s.game, caseId)
          if (result.state === 'blocked' || result.registeredWorkOrderIds.length === 0) {
            return { game: s.game }
          }

          return {
            game: {
              ...s.game,
              caseScopedPrerequisiteProcessingTerminalSignals: result.signals,
            },
          }
        })
        return result!
      },

      assign: (caseId, teamId) =>
        set((s) => {
          const routed = routeMissionToTeam(s.game, caseId, teamId)
          if (
            !routed.assigned &&
            routeMission(s.game, caseId).routingBlockers.includes(
              'authority-mission-access-restricted'
            )
          ) {
            return { game: routed.state }
          }

          return { game: assignTeam(s.game, caseId, teamId) }
        }),

      unassign: (caseId, teamId) => set((s) => ({ game: unassignTeam(s.game, caseId, teamId) })),

      selectStealthLeaveBehind: (caseId, leaveBehindId) =>
        set((s) => {
          const result = applyStealthLeaveBehindSelection(s.game, { caseId, leaveBehindId })
          if (!result.applied) {
            return { game: s.game }
          }

          return { game: result.state }
        }),

      askInvestigationQuestion: (caseId, domain, questionId) =>
        set((s) => {
          const caseData = s.game.cases[caseId]
          if (!canAskInvestigationQuestionOnCase(caseData)) {
            return { game: s.game }
          }

          const result = applyAskInvestigationQuestion(s.game, {
            caseId,
            domain,
            questionId,
          })
          if (!result.applied) {
            return { game: s.game }
          }

          return { game: result.state }
        }),

      setInfiltrationWeeklyProbeAction: (caseId, action) =>
        set((s) => {
          const caseData = s.game.cases[caseId]
          if (caseData === undefined || !canConfigureInfiltrationWeeklyProbeOnCase(caseData)) {
            return { game: s.game }
          }

          const result = applyInfiltrationWeeklyProbeActionOverride(s.game, {
            caseId,
            action,
          })
          if (!result.applied) {
            return { game: s.game }
          }

          return { game: result.state }
        }),

      setInfiltrationEncounterCoverStance: (caseId, stance) =>
        set((s) => {
          const result = applyInfiltrationEncounterCoverStance(s.game, {
            caseId,
            stance,
          })
          if (!result.applied) {
            return { game: s.game }
          }

          return { game: result.state }
        }),

      setPublicDisclosurePostureChoice: (recordId, posture) =>
        set((s) => {
          const result = applyPublicDisclosurePostureChoice(s.game, {
            recordId,
            posture,
          })

          if (!result.applied) {
            return { game: s.game }
          }

          return { game: result.state }
        }),

      hireCandidate: (candidateId) => set((s) => ({ game: hireCandidate(s.game, candidateId) })),

      scoutCandidate: (candidateId) => set((s) => ({ game: scoutCandidate(s.game, candidateId) })),

      transitionCandidateFunnel: (candidateId, toStage, options) => {
        let transitioned = false
        set((s) => {
          // Pure deterministic funnel transition logic is handled by domain
          const transition = transitionRecruitmentCandidate(s.game, candidateId, {
            toStage,
            week: s.game.week,
            ...(options?.note ? { note: options.note } : {}),
            ...(options?.lossReason ? { lossReason: options.lossReason } : {}),
          })
          transitioned = transition.transitioned
          if (!transition.transitioned) {
            return { game: s.game }
          }
          // Event/context logging remains in the store
          const game = appendDeveloperLogEventState(transition.state, {
            type: 'authoring.context_changed',
            summary: `Candidate funnel transitioned: ${candidateId} -> ${toStage}`,
            details: {
              candidateId,
              ...(transition.fromStage ? { fromStage: transition.fromStage } : {}),
              toStage,
              ...(options?.note ? { note: options.note } : {}),
              ...(options?.lossReason ? { lossReason: options.lossReason } : {}),
            },
          })
          return { game }
        })
        return transitioned
      },

      contactCandidate: (candidateId, note) =>
        get().transitionCandidateFunnel(candidateId, 'contacted', {
          ...(note ? { note } : {}),
        }),

      screenCandidate: (candidateId, note) =>
        get().transitionCandidateFunnel(candidateId, 'screening', {
          ...(note ? { note } : {}),
        }),

      loseCandidate: (candidateId, lossReason) =>
        get().transitionCandidateFunnel(candidateId, 'lost', {
          ...(lossReason ? { lossReason } : {}),
        }),

      createTeam: (name, seedAgentId) =>
        set((s) => {
          const nextGame = createTeam(s.game, name, seedAgentId)
          const createdTeamId = Object.keys(nextGame.teams).find(
            (teamId) => !(teamId in s.game.teams)
          )

          if (!createdTeamId) {
            return { game: nextGame }
          }

          const hasMetadataKey = Boolean(nextGame.squadMetadata?.[createdTeamId])
          const hasAssignmentKey = Boolean(nextGame.squadKitAssignments?.[createdTeamId])
          if (!hasMetadataKey && !hasAssignmentKey) {
            return { game: nextGame }
          }

          const nextMetadata = nextGame.squadMetadata ? { ...nextGame.squadMetadata } : undefined
          const nextAssignments = nextGame.squadKitAssignments
            ? { ...nextGame.squadKitAssignments }
            : undefined
          if (nextMetadata) {
            delete nextMetadata[createdTeamId]
          }
          if (nextAssignments) {
            delete nextAssignments[createdTeamId]
          }

          return {
            game: {
              ...nextGame,
              squadMetadata: nextMetadata,
              squadKitAssignments: nextAssignments,
            },
          }
        }),

      renameTeam: (teamId, name) => set((s) => ({ game: renameTeam(s.game, teamId, name) })),

      setTeamLeader: (teamId, leaderId) =>
        set((s) => ({ game: setTeamLeader(s.game, teamId, leaderId) })),

      moveAgentBetweenTeams: (agentId, targetTeamId) =>
        set((s) => ({ game: moveAgentBetweenTeams(s.game, agentId, targetTeamId) })),

      deleteEmptyTeam: (teamId) =>
        set((s) => {
          const nextGame = deleteEmptyTeam(s.game, teamId)
          if (nextGame.teams[teamId]) {
            return { game: nextGame }
          }

          const hasMetadataKey = Boolean(nextGame.squadMetadata?.[teamId])
          const hasAssignmentKey = Boolean(nextGame.squadKitAssignments?.[teamId])
          if (!hasMetadataKey && !hasAssignmentKey) {
            return { game: nextGame }
          }

          const nextMetadata = nextGame.squadMetadata ? { ...nextGame.squadMetadata } : undefined
          const nextAssignments = nextGame.squadKitAssignments
            ? { ...nextGame.squadKitAssignments }
            : undefined
          if (nextMetadata) {
            delete nextMetadata[teamId]
          }
          if (nextAssignments) {
            delete nextAssignments[teamId]
          }

          return {
            game: {
              ...nextGame,
              squadMetadata: nextMetadata,
              squadKitAssignments: nextAssignments,
            },
          }
        }),

      setAgentPrimaryDowntimePlan: (agentId, activity) =>
        set((s) => ({ game: applyPrimaryDowntimePlanToGame(s.game, agentId, activity) })),

      queueTraining: (agentId, trainingId) =>
        set((s) => ({ game: queueTraining(s.game, agentId, trainingId) })),

      queueTeamTraining: (teamId, trainingId) =>
        set((s) => ({ game: queueTeamTraining(s.game, teamId, trainingId) })),

      cancelTraining: (agentId) => set((s) => ({ game: cancelTraining(s.game, agentId) })),

      transitionCertification: (agentId, certificationId, toState, options) =>
        set((s) => ({
          game: transitionCertification(s.game, agentId, certificationId, toState, options).state,
        })),

      reviewCertification: (agentId, certificationId, approve, options) =>
        set((s) => ({
          game: reviewCertification(s.game, agentId, certificationId, approve, options).state,
        })),

      spendSkillPoint: (agentId, stat) =>
        set((s) => ({ game: spendSkillPoint(s.game, agentId, stat) })),

      upgradeAcademy: () =>
        set((s) => {
          const beforeTier = s.game.academyTier ?? 0
          const beforeFunding = s.game.funding
          const next = upgradeAcademy(s.game)
          const afterTier = next.academyTier ?? 0
          // Only log event if upgrade occurred
          if (afterTier > beforeTier) {
            return {
              game: appendOperationEventDrafts(next, [
                createSystemAcademyUpgradedDraft({
                  week: next.week,
                  tierBefore: beforeTier,
                  tierAfter: afterTier,
                  fundingBefore: beforeFunding,
                  fundingAfter: next.funding,
                  cost: beforeFunding - next.funding,
                }),
              ]),
            }
          }
          // No event if no upgrade
          return { game: next }
        }),

      openCourierShellFront: () =>
        set((s) => {
          const before = s.game
          const hadCourierShell = before.agency?.courierShellFront?.type === 'courierShell'
          const next = openCourierShellFront(before)
          const hasCourierShell = next.agency?.courierShellFront?.type === 'courierShell'
          if (!hasCourierShell || hadCourierShell) {
            return { game: next }
          }
          const cost = next.agency?.courierShellFront?.startupCostPaid ?? 0
          return {
            game: appendOperationEventDrafts(next, [
              createAgencyFrontBusinessOpenedDraft({
                week: next.week,
                kind: 'courierShell',
                startupCost: cost,
                fundingBefore: before.funding,
                fundingAfter: next.funding,
              }),
            ]),
          }
        }),

      assignInstructor: (staffId, agentId) =>
        set((s) => {
          const before = s.game.staff[staffId]
          const next = assignInstructor(s.game, staffId, agentId)
          const after = next.staff[staffId]
          // Only log event if assignment actually changed
          if (
            before?.role === 'instructor' &&
            after?.role === 'instructor' &&
            after.assignedAgentId &&
            before.assignedAgentId !== after.assignedAgentId
          ) {
            const agentName = next.agents[agentId]?.name ?? s.game.agents[agentId]?.name ?? agentId
            return {
              game: appendOperationEventDrafts(next, [
                createAgentInstructorAssignedDraft({
                  week: next.week,
                  staffId,
                  instructorName: after.name,
                  agentId,
                  agentName,
                  instructorSpecialty: after.instructorSpecialty,
                  bonus: getInstructorBonus(after.efficiency),
                }),
              ]),
            }
          }
          return { game: next }
        }),

      unassignInstructor: (staffId) =>
        set((s) => {
          const before = s.game.staff[staffId]
          const assignedAgentId = before?.role === 'instructor' ? before.assignedAgentId : undefined
          const assignedAgentName = assignedAgentId
            ? (s.game.agents[assignedAgentId]?.name ?? assignedAgentId)
            : undefined
          const next = unassignInstructor(s.game, staffId)
          const after = next.staff[staffId]
          // Only log event if unassignment actually occurred
          if (
            before?.role === 'instructor' &&
            assignedAgentId &&
            after?.role === 'instructor' &&
            !after.assignedAgentId
          ) {
            return {
              game: appendOperationEventDrafts(next, [
                createAgentInstructorUnassignedDraft({
                  week: next.week,
                  staffId,
                  instructorName: before.name,
                  agentId: assignedAgentId,
                  agentName: assignedAgentName ?? assignedAgentId,
                  instructorSpecialty: before.instructorSpecialty,
                  bonus: getInstructorBonus(before.efficiency),
                }),
              ]),
            }
          }
          return { game: next }
        }),

      reconcileAgents: (leftId, rightId) =>
        set((s) => ({ game: reconcileAgents(s.game, leftId, rightId) })),

      materializeStoredEquipmentInstance: (itemId) =>
        set((s) => {
          const result = materializeStoredOrdinaryEquipmentInstance(s.game, itemId)
          if (!result.ok) return { game: result.state }
          const definition = getEquipmentDefinition(itemId)
          return {
            game: appendOperationEventDrafts(result.state, [
              createEquipmentInstanceMaterializedDraft({
                week: s.game.week,
                instanceId: result.instance.instanceId,
                definitionId: itemId,
                definitionName: definition?.name ?? itemId,
                condition: result.instance.condition,
                locationState: 'stored',
              }),
            ]),
          }
        }),

      destroyStoredEquipmentInstance: (instanceId) =>
        set((s) => {
          const result = destroyStoredOrdinaryEquipmentInstance(s.game, instanceId)
          if (!result.ok) return { game: result.state }
          const definition = getEquipmentDefinition(result.instance.definitionId)
          return {
            game: appendOperationEventDrafts(result.state, [
              createEquipmentInstanceDestroyedDraft({
                week: s.game.week,
                instanceId: result.instance.instanceId,
                definitionId: result.instance.definitionId,
                definitionName: definition?.name ?? result.instance.definitionId,
                condition: result.instance.condition,
                reason: 'manual_disposal',
              }),
            ]),
          }
        }),

      reaggregateStoredEquipmentInstance: (instanceId) =>
        set((s) => {
          const result = reaggregateStoredOrdinaryEquipmentInstance(s.game, instanceId)
          if (!result.ok) return { game: result.state }
          const definition = getEquipmentDefinition(result.instance.definitionId)
          return {
            game: appendOperationEventDrafts(result.state, [
              createEquipmentInstanceReaggregatedDraft({
                week: s.game.week,
                instanceId: result.instance.instanceId,
                definitionId: result.instance.definitionId,
                definitionName: definition?.name ?? result.instance.definitionId,
                condition: 'operational',
                reason: 'manual_untracking',
              }),
            ]),
          }
        }),

      equipAgentItem: (agentId, slot, itemId) =>
        set((s) => {
          const next = equipAgentItem(s.game, agentId, slot, itemId)
          if (itemId !== COMBAT_STIM_DEFINITION_ID) return { game: next }
          const instance = getEquipmentInstanceAtAgentSlot(next, agentId, slot)
          if (!instance || s.game.equipmentInstances?.[instance.instanceId]) return { game: next }
          const definition = getEquipmentDefinition(itemId)
          const payload = instance.payload
          return {
            game: appendOperationEventDrafts(next, [
              createEquipmentInstanceMaterializedDraft({
                week: s.game.week,
                instanceId: instance.instanceId,
                definitionId: itemId,
                definitionName: definition?.name ?? itemId,
                condition: instance.condition,
                locationState: 'equipped',
                agentId,
                slot,
                ...(payload
                  ? {
                      resourceId: payload.resourceId,
                      capacity: payload.capacity,
                      remaining: payload.remaining,
                    }
                  : {}),
              }),
            ]),
          }
        }),

      equipStoredEquipmentInstance: (instanceId, agentId, slot) =>
        set((s) => ({ game: equipStoredEquipmentInstance(s.game, instanceId, agentId, slot) })),

      equipStoredCombatStimInstance: (instanceId, agentId, slot) =>
        set((s) => ({ game: equipStoredCombatStimInstance(s.game, instanceId, agentId, slot) })),

      activateCombatStim: (instanceId) =>
        set((s) => ({ game: activateCombatStim(s.game, instanceId).state })),

      unequipAgentItem: (agentId, slot) =>
        set((s) => ({ game: unequipAgentItem(s.game, agentId, slot) })),

      queueFabrication: (recipeId) => set((s) => ({ game: queueFabrication(s.game, recipeId) })),

      queueEquipmentDeconstruction: (itemId, source) =>
        set((s) => ({ game: queueEquipmentDeconstruction(s.game, itemId, source) })),

      enableEquipmentAutoScrap: (thresholdGradeId) =>
        set((s) => ({ game: enableEquipmentAutoScrapPolicy(s.game, thresholdGradeId) })),

      disableEquipmentAutoScrap: () =>
        set((s) => ({ game: disableEquipmentAutoScrapPolicy(s.game) })),

      purchaseMarketInventory: (listingId, bundles = 1) =>
        set((s) => ({ game: purchaseMarketInventory(s.game, listingId, bundles) })),

      placeDelayedMarketOrder: (listingId, bundles = 1) =>
        set((s) => ({ game: placeDelayedMarketOrder(s.game, listingId, bundles) })),

      redeemFactionFavorProcurement: (listingId, bundles = 1) =>
        set((s) => ({ game: redeemFactionFavorProcurement(s.game, listingId, bundles) })),
      callCallableObligationProcurement: (listingId, bundles = 1) =>
        set((s) => ({ game: callCallableObligationProcurement(s.game, listingId, bundles) })),

      acknowledgeLicensedHandlingDoctrine: () =>
        set((s) => ({ game: acknowledgeLicensedHandlingDoctrine(s.game) })),

      invokeEmergencyGrayMarketWaiver: () =>
        set((s) => ({ game: invokeEmergencyGrayMarketWaiver(s.game) })),
      sellMarketInventory: (listingId, bundles = 1) =>
        set((s) => ({ game: sellMarketInventory(s.game, listingId, bundles) })),

      drawPartyCards: (count = 1) =>
        set((s) => {
          if (!s.game.partyCards) {
            return s
          }

          const rng = createSeededRng(s.game.rngState)
          const draw = drawPartyCards(s.game.partyCards, count, rng.next)

          return {
            game: {
              ...s.game,
              rngState: rng.getState(),
              partyCards: draw.nextState,
            },
          }
        }),

      playPartyCard: (cardId, targetCaseId, targetTeamId) =>
        set((s) => {
          if (!s.game.partyCards) {
            return s
          }

          const nextPartyCards = playPartyCard(s.game.partyCards, cardId, {
            weekPlayed: s.game.week,
            targetCaseId,
            targetTeamId,
          })

          return {
            game: {
              ...s.game,
              partyCards: nextPartyCards,
            },
          }
        }),

      discardPartyCard: (cardId) =>
        set((s) => {
          if (!s.game.partyCards) {
            return s
          }

          return {
            game: {
              ...s.game,
              partyCards: discardPartyCard(s.game.partyCards, cardId),
            },
          }
        }),

      setWeeklyDirective: (directiveId) =>
        set((s) => ({
          game: {
            ...s.game,
            directiveState: {
              ...s.game.directiveState,
              selectedId: directiveId,
            },
          },
        })),

      refreshMissionRouting: () =>
        set((s) => ({
          game: {
            ...s.game,
            missionRouting: recomputeMissionRouting(s.game),
          },
        })),

      setMissionTriageDisposition: (missionId, disposition) =>
        set((s) => ({
          game: applyMissionTriageDisposition(s.game, missionId, disposition),
        })),

      clearMissionTriageDisposition: (missionId) =>
        set((s) => ({
          game: clearMissionTriageDisposition(s.game, missionId),
        })),

      evaluateMissionDeployment: (missionId, teamId) => {
        const game = get().game
        if (!game.cases[missionId] || !game.teams[teamId]) {
          return null
        }

        return evaluateDeploymentEligibility(game, missionId, teamId)
      },

      assignMissionTeam: (missionId, teamId) => {
        const routed = routeMissionToTeam(get().game, missionId, teamId)

        if (!routed.assigned) {
          set(() => ({ game: routed.state }))
          return false
        }

        set(() => ({ game: assignTeam(routed.state, missionId, teamId) }))
        return true
      },

      rallySupportStaff: (amount = 2) => {
        let note: ReturnType<typeof applyRallySupportStaffAction>['note'] = null

        set((s) => {
          const result = applyRallySupportStaffAction(s.game, amount)
          note = result.note
          return { game: result.nextState }
        })

        return note
      },

      advanceWeek: () => set((s) => ({ game: advanceWeek(s.game) })),

      setSquadMetadata: (metadata) =>
        set((s) => ({
          game: {
            ...s.game,
            squadMetadata: { ...(s.game.squadMetadata ?? {}), [metadata.squadId]: metadata },
          },
        })),

      setSquadKitTemplate: (template) =>
        set((s) => ({
          game: {
            ...s.game,
            squadKitTemplates: { ...(s.game.squadKitTemplates ?? {}), [template.id]: template },
          },
        })),

      setSquadKitAssignment: (assignment) =>
        set((s) => ({
          game: {
            ...s.game,
            squadKitAssignments: {
              ...(s.game.squadKitAssignments ?? {}),
              [assignment.squadId]: assignment,
            },
          },
        })),

      applyChapterBreakAttritionContinuityReset: () =>
        set((s) => ({ game: applyChapterBreakAttritionReset(s.game) })),

      applyRotatingRosterContinuityReconciliation: () =>
        set((s) => ({ game: applyRotatingRosterContinuityReconciliation(s.game) })),

      recordAffiliationFileWorkQueueAction: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (!entry) {
            return { game: s.game }
          }

          const record = buildAffiliationFileWorkQueueActionRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            actionKind: entry.recommendedActionKind,
            actionLabel: entry.recommendedActionLabel,
            sourceBucket: entry.bucket,
            sourceReasonCodes: entry.reasonCodeLabels,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueActionRecords: {
                ...(s.game.affiliationFileWorkQueueActionRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueEvidenceResolution: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (!entry || entry.bucket !== 'missing_review') {
            return { game: s.game }
          }

          const missingReasonCodes = entry.reasonCodeLabels.filter((reasonCode) =>
            reasonCode.startsWith('missing_')
          )

          if (missingReasonCodes.length === 0) {
            return { game: s.game }
          }

          const record = buildAffiliationFileWorkQueueEvidenceResolutionRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            sourceBucket: entry.bucket,
            missingReasonCodes,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueEvidenceResolutionRecords: {
                ...(s.game.affiliationFileWorkQueueEvidenceResolutionRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueRepairAction: (entryId, reasonCode) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)
          const repairCandidate = entry?.evidenceRepairCandidates.find(
            (candidate) => candidate.reasonCode === reasonCode
          )

          if (
            !entry ||
            !repairCandidate ||
            repairCandidate.isRepairActionRecorded ||
            !reasonCode.startsWith('missing_')
          ) {
            return { game: s.game }
          }

          const record = buildAffiliationFileWorkQueueRepairActionRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            reasonCode: repairCandidate.reasonCode,
            repairLabel: repairCandidate.repairLabel,
            recordedWeek: s.game.week,
          })

          const repaired = applyAffiliationFileWorkQueueEvidenceRepair({
            state: s.game,
            workQueueEntryId: entry.id,
            reasonCode: repairCandidate.reasonCode,
            recordedWeek: s.game.week,
          })

          if (!repaired.applied) {
            return { game: s.game }
          }

          return {
            game: {
              ...repaired.state,
              affiliationFileWorkQueueRepairActionRecords: {
                ...(repaired.state.affiliationFileWorkQueueRepairActionRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueReleaseAction: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)
          const releaseAction = entry
            ? getAffiliationFileWorkQueueReleaseActionForBucket(entry.bucket)
            : null

          if (!entry || !releaseAction || entry.isReleaseActionRecorded) {
            return { game: s.game }
          }

          const sourceBucket = entry.bucket === 'allowed' ? 'allowed' : 'restricted'
          const record = buildAffiliationFileWorkQueueReleaseActionRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            actionKind: releaseAction.actionKind,
            actionLabel: releaseAction.actionLabel,
            sourceBucket,
            sourceReasonCodes: entry.reasonCodeLabels,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueReleaseActionRecords: {
                ...(s.game.affiliationFileWorkQueueReleaseActionRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueReleaseOutcome: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (
            !entry ||
            !entry.releaseActionKind ||
            !entry.isReleaseActionRecorded ||
            entry.isReleaseOutcomeRecorded
          ) {
            return { game: s.game }
          }

          const sourceBucket = entry.bucket === 'allowed' ? 'allowed' : 'restricted'
          const outcome = getAffiliationFileWorkQueueReleaseOutcomeForAction(
            entry.releaseActionKind
          )
          const record = buildAffiliationFileWorkQueueReleaseOutcomeRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            sourceActionKind: entry.releaseActionKind,
            sourceBucket,
            sourceReasonCodes: entry.reasonCodeLabels,
            outcomeKind: outcome.outcomeKind,
            outcomeLabel: outcome.outcomeLabel,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueReleaseOutcomeRecords: {
                ...(s.game.affiliationFileWorkQueueReleaseOutcomeRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueReleaseFulfillment: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (
            !entry ||
            entry.bucket !== 'allowed' ||
            !entry.releaseOutcomeKind ||
            !entry.isReleaseActionRecorded ||
            !entry.isReleaseOutcomeRecorded ||
            entry.isReleaseFulfillmentRecorded
          ) {
            return { game: s.game }
          }

          const fulfillment = getAffiliationFileWorkQueueReleaseFulfillmentForOutcome(
            entry.releaseOutcomeKind
          )

          if (!fulfillment) {
            return { game: s.game }
          }

          const record = buildAffiliationFileWorkQueueReleaseFulfillmentRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            sourceOutcomeKind: entry.releaseOutcomeKind,
            sourceBucket: 'allowed',
            sourceReasonCodes: entry.reasonCodeLabels,
            fulfillmentKind: fulfillment.fulfillmentKind,
            fulfillmentLabel: fulfillment.fulfillmentLabel,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueReleaseFulfillmentRecords: {
                ...(s.game.affiliationFileWorkQueueReleaseFulfillmentRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueReleasePackage: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (
            !entry ||
            !entry.releaseOutcomeKind ||
            !entry.releaseFulfillmentKind ||
            !entry.isReleaseFulfillmentRecorded ||
            entry.isReleasePackageRecorded
          ) {
            return { game: s.game }
          }

          const releasePackage = getAffiliationFileWorkQueueReleasePackageForFulfillment(
            entry.releaseFulfillmentKind
          )
          const record = buildAffiliationFileWorkQueueReleasePackageRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            sourceOutcomeKind: entry.releaseOutcomeKind,
            sourceFulfillmentKind: entry.releaseFulfillmentKind,
            sourceReasonCodes: entry.releaseFulfillmentSourceReasonCodes ?? [],
            packageKind: releasePackage.packageKind,
            packageLabel: releasePackage.packageLabel,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueReleasePackageRecords: {
                ...(s.game.affiliationFileWorkQueueReleasePackageRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueFileReleaseDelivery: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (
            !entry ||
            !entry.releasePackageKind ||
            !entry.releasePackageRef ||
            !entry.isReleasePackageRecorded
          ) {
            return { game: s.game }
          }

          const existingDeliveries = Object.values(
            s.game.affiliationFileWorkQueueFileReleaseDeliveryRecords ?? {}
          ).filter(
            (record) =>
              record &&
              record.workQueueEntryId === entry.id &&
              record.sourcePackageKind === entry.releasePackageKind &&
              record.sourcePackageRef === entry.releasePackageRef
          )

          const hasMetadataDelivery = existingDeliveries.some(
            (record) => record.deliveryKind === 'metadata_only_file_release_delivered'
          )
          const hasActualContentDelivery = existingDeliveries.some(
            (record) => record.deliveryKind === 'actual_file_content_release_delivered'
          )

          if (hasActualContentDelivery) {
            return { game: s.game }
          }

          const fileReleaseDelivery = getAffiliationFileWorkQueueFileReleaseDeliveryForPackageMode({
            packageKind: entry.releasePackageKind,
            mode: hasMetadataDelivery ? 'actual_file_content' : 'metadata_only',
          })
          const record = buildAffiliationFileWorkQueueFileReleaseDeliveryRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            sourcePackageKind: entry.releasePackageKind,
            sourcePackageRef: entry.releasePackageRef,
            sourceReasonCodes: entry.releasePackageSourceReasonCodes ?? [],
            deliveryKind: fileReleaseDelivery.deliveryKind,
            deliveryLabel: fileReleaseDelivery.deliveryLabel,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueFileReleaseDeliveryRecords: {
                ...(s.game.affiliationFileWorkQueueFileReleaseDeliveryRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueNonMissionEnforcement: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          if (!entry) {
            return { game: s.game }
          }

          const enforcement = getAffiliationFileWorkQueueNonMissionEnforcementForBucket(
            entry.bucket
          )

          if (!enforcement) {
            return { game: s.game }
          }

          const recordId = buildAffiliationFileWorkQueueNonMissionEnforcementRecordId({
            workQueueEntryId: entry.id,
            sourceBucket: entry.bucket,
          })

          if (s.game.affiliationFileWorkQueueNonMissionEnforcementRecords?.[recordId]) {
            return { game: s.game }
          }

          const record = buildAffiliationFileWorkQueueNonMissionEnforcementRecord({
            workQueueEntryId: entry.id,
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            sourceBucket: entry.bucket,
            sourceReasonCodes: entry.reasonCodeLabels,
            enforcementKind: enforcement.enforcementKind,
            enforcementLabel: enforcement.enforcementLabel,
            recordedWeek: s.game.week,
          })

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueNonMissionEnforcementRecords: {
                ...(s.game.affiliationFileWorkQueueNonMissionEnforcementRecords ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      recordAffiliationFileWorkQueueEvidenceRepairWorkflow: (entryId) =>
        set((s) => {
          const view = getAffiliationPersonStatusMirrorView(s.game)
          const entry = view.fileAccessWorkQueue.find((candidate) => candidate.id === entryId)

          // No-op: missing entry, not missing_review, or already recorded
          if (!entry || entry.bucket !== 'missing_review') {
            return { game: s.game }
          }

          // Check if missing_entity_welfare_reclassification_ref is in the missing codes
          const hasMissingWelfareRef = entry.reasonCodeLabels.includes(
            'missing_entity_welfare_reclassification_ref'
          )
          if (!hasMissingWelfareRef) {
            return { game: s.game }
          }

          // Build the repair workflow record
          const record = buildAffiliationFileWorkQueueEvidenceRepairWorkflow({
            workQueueEntryId: entry.id,
            evidenceType: 'missing_entity_welfare_reclassification_ref',
            subjectId: entry.subjectId,
            subjectLabel: entry.subjectLabel,
            repairLabel: 'Restore minimal welfare evidence',
            recordedWeek: s.game.week,
          })

          // Check for duplicate (same entry + evidence type already recorded)
          const existing = Object.values(
            s.game.affiliationFileWorkQueueEvidenceRepairWorkflows ?? {}
          )
          const isDuplicate = existing.some(
            (existing) =>
              existing.workQueueEntryId === record.workQueueEntryId &&
              existing.evidenceType === record.evidenceType
          )

          if (isDuplicate) {
            return { game: s.game }
          }

          return {
            game: {
              ...s.game,
              affiliationFileWorkQueueEvidenceRepairWorkflows: {
                ...(s.game.affiliationFileWorkQueueEvidenceRepairWorkflows ?? {}),
                [record.id]: record,
              },
            },
          }
        }),

      reset: () => set({ game: createStartingState() }),

      setSeed: (seed) =>
        set((s) => {
          const normalizedSeed = normalizeSeed(seed)

          return {
            game: refreshContractBoard({
              ...s.game,
              rngSeed: normalizedSeed,
              rngState: normalizedSeed,
              contracts: undefined,
            }),
          }
        }),

      updateConfig: (patch) =>
        set((s) => ({
          game: {
            ...s.game,
            config: sanitizeGameConfig(patch, s.game.config, {
              invalidAttritionPolicy: 'minimum',
            }),
          },
        })),

      exportSave: () => {
        let payload = ''

        set((s) => {
          const game = appendDeveloperLogEventState(s.game, {
            type: 'save.exported',
            summary: 'Save exported',
            details: {
              kind: GAME_SAVE_KIND,
              version: GAME_SAVE_VERSION,
            },
          })
          payload = serializeGameSave(game)
          return { game }
        })

        return payload
      },

      importSave: (raw) => {
        const importedGame = loadGameSave(raw)
        let payloadKind = GAME_SAVE_KIND
        let payloadVersion = GAME_SAVE_VERSION

        try {
          const parsed = JSON.parse(raw) as Partial<{ kind: string; version: number }>
          if (typeof parsed.kind === 'string') {
            payloadKind = parsed.kind
          }
          if (typeof parsed.version === 'number' && Number.isFinite(parsed.version)) {
            payloadVersion = Math.trunc(parsed.version)
          }
        } catch {
          // `loadGameSave` already performs real validation; this metadata parse is
          // only for a compact debug record after successful import.
        }

        set({
          game: appendDeveloperLogEventState(importedGame, {
            type: 'save.imported',
            summary: 'Save imported',
            details: {
              kind: payloadKind,
              version: payloadVersion,
            },
          }),
        })
      },

      exportRun: () => {
        let payload = ''

        set((s) => {
          const game = appendDeveloperLogEventState(s.game, {
            type: 'save.exported',
            summary: 'Run exported',
            details: {
              kind: RUN_EXPORT_KIND,
              version: GAME_STORE_VERSION,
            },
          })
          payload = serializeRunExport(game)
          return { game }
        })

        return payload
      },

      importRun: (raw) => {
        const importedGame = parseRunExport(raw)
        let payloadVersion = GAME_STORE_VERSION

        try {
          const parsed = JSON.parse(raw) as Partial<{ version: number }>
          if (typeof parsed.version === 'number' && Number.isFinite(parsed.version)) {
            payloadVersion = Math.trunc(parsed.version)
          }
        } catch {
          // `parseRunExport` already validates the payload; this metadata parse
          // only feeds the debug log after a successful import.
        }

        set({
          game: appendDeveloperLogEventState(importedGame, {
            type: 'save.imported',
            summary: 'Run imported',
            details: {
              kind: RUN_EXPORT_KIND,
              version: payloadVersion,
            },
          }),
        })
      },

      newRunFromCurrentConfig: () =>
        set((s) => ({
          game: createRunFromCurrentConfig(s.game.config, s.game.rngSeed),
        })),
    }),
    {
      name: 'containment-protocol-game-state',
      storage: createJSONStorage(resolveGameStorage),

      // Persist all simulation-critical fields; `templates` is excluded and
      // reloaded fresh from source code on every app boot.
      partialize: ({ game }): PersistedStore => ({
        game: stripGameTemplates(game),
      }),

      // After rehydration inject live template definitions so persisted saves never
      // carry stale template data from an older version of the app code.
      merge: (persistedState, currentState) => {
        const ps = persistedState as Partial<PersistedStore>
        if (!ps.game) return currentState

        const mergedGame = hydrateGame(ps.game as Partial<GameState>, currentState.game)

        return { ...currentState, game: mergedGame }
      },

      version: GAME_STORE_VERSION,

      migrate: (persistedState: unknown, version: number): PersistedStore => {
        return migratePersistedStore(persistedState, version, createStartingState())
      },
    }
  )
)
