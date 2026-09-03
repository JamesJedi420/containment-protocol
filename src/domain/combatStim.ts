import type { Agent, GameState, Id } from './models'
import type { AgentEnergyReserveBand } from './agent/models'
import {
  activateAgentOverdrive,
  canActivateAgentOverdrive,
  createDefaultOverdriveState,
} from './agentFatigueChannels'
import {
  COMBAT_STIM_CAPACITY,
  COMBAT_STIM_DEFINITION_ID,
  getEquipmentInstance,
  isCanonicalCombatStimPayload,
  isEquipmentInstanceClaimedForRecovery,
  isSafeEquipmentInstanceId,
  listStoredEquipmentInstances,
  relocateEquipmentInstance,
  resolveStoredEquipmentInstanceConditionRepair,
  type EquipmentInstance,
  type EquipmentInstanceId,
  type EquipmentInstanceLocation,
} from './equipmentInstance'
import { createDefaultResponderEnergyBudget, normalizeEnergyBudget } from './responderEnergyBudget'
import { ensureNormalizedGameState, normalizeGameState } from './teamSimulation'
import { appendOperationEventDrafts, createCombatStimActivatedDraft } from './events'
import type { EquipmentSlotKind } from './equipment'
import {
  equipStoredEquipmentInstance,
  isCanonicalFabricatedLotForDefinition,
} from './sim/equipment'
import { resolveFabricationOriginForDefinition } from './equipmentInstance'

export const COMBAT_STIM_ACTIVATION_REASON_CODES = [
  'invalid_instance_id',
  'unknown_instance',
  'wrong_definition',
  'malformed_payload',
  'empty',
  'not_equipped',
  'inoperable',
  'invalid_responder',
  'invalid_context',
  'no_overdrive_need',
  'already_overdriven',
  'recovery_lockout',
  'stimulant_prohibited',
] as const

export type CombatStimActivationReasonCode = (typeof COMBAT_STIM_ACTIVATION_REASON_CODES)[number]

export interface CombatStimActivationPreview {
  instanceId: EquipmentInstanceId
  available: boolean
  reasonCode?: CombatStimActivationReasonCode
  agentId?: Id
  agentName?: string
  caseId?: Id
  caseTitle?: string
  dosesRemaining?: number
  capacity?: number
  underlyingBand?: AgentEnergyReserveBand
  effectiveBand?: AgentEnergyReserveBand
}

export type CombatStimActivationResult =
  | { ok: true; state: GameState; activationId: string; preview: CombatStimActivationPreview }
  | {
      ok: false
      state: GameState
      code: CombatStimActivationReasonCode
      preview: CombatStimActivationPreview
    }

const EFFECTIVE_ENERGY_BAND: Record<AgentEnergyReserveBand, AgentEnergyReserveBand> = {
  stable: 'stable',
  taxed: 'stable',
  depleted: 'taxed',
  overdrawn: 'depleted',
}

export function resolveEffectiveResponderEnergyBand(agent: Agent): AgentEnergyReserveBand {
  const underlying = normalizeEnergyBudget(
    agent.energyBudget ?? createDefaultResponderEnergyBudget()
  ).reserveBand
  return agent.overdrive?.active && agent.overdrive.source?.kind === 'combat_stim'
    ? EFFECTIVE_ENERGY_BAND[underlying]
    : underlying
}

function unavailable(
  instanceId: string,
  reasonCode: CombatStimActivationReasonCode,
  details: Omit<CombatStimActivationPreview, 'instanceId' | 'available' | 'reasonCode'> = {}
): CombatStimActivationPreview {
  return { instanceId, available: false, reasonCode, ...details }
}

export function resolveCombatStimActivation(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimActivationPreview {
  if (!isSafeEquipmentInstanceId(instanceId)) return unavailable(instanceId, 'invalid_instance_id')
  const instance = getEquipmentInstance(state, instanceId)
  if (!instance) return unavailable(instanceId, 'unknown_instance')
  if (instance.definitionId !== COMBAT_STIM_DEFINITION_ID) {
    return unavailable(instanceId, 'wrong_definition')
  }
  if (!isCanonicalCombatStimPayload(instance.payload)) {
    return unavailable(instanceId, 'malformed_payload')
  }
  const doseDetails = {
    dosesRemaining: instance.payload.remaining,
    capacity: instance.payload.capacity,
  }
  if (instance.payload.remaining < 1) return unavailable(instanceId, 'empty', doseDetails)
  if (instance.location.state !== 'equipped') {
    return unavailable(instanceId, 'not_equipped', doseDetails)
  }
  if (instance.condition !== 'operational') {
    return unavailable(instanceId, 'inoperable', doseDetails)
  }
  const agent = state.agents[instance.location.agentId]
  if (!agent || agent.status !== 'active') {
    return unavailable(instanceId, 'invalid_responder', {
      ...doseDetails,
      agentId: instance.location.agentId,
    })
  }
  const agentDetails = { ...doseDetails, agentId: agent.id, agentName: agent.name }
  if (agent.assignment?.state !== 'assigned') {
    return unavailable(instanceId, 'invalid_context', agentDetails)
  }
  const currentCase = state.cases[agent.assignment.caseId]
  if (
    !currentCase ||
    currentCase.status === 'resolved' ||
    (currentCase.kind !== 'raid' && currentCase.stage < 4)
  ) {
    return unavailable(instanceId, 'invalid_context', agentDetails)
  }
  const contextDetails = {
    ...agentDetails,
    caseId: currentCase.id,
    caseTitle: currentCase.title,
  }
  if (agent.vitals?.statusFlags.includes('stimulant-prohibited')) {
    return unavailable(instanceId, 'stimulant_prohibited', contextDetails)
  }
  const overdrive = agent.overdrive ?? createDefaultOverdriveState()
  if (overdrive.active) return unavailable(instanceId, 'already_overdriven', contextDetails)
  if (!canActivateAgentOverdrive(overdrive)) {
    return unavailable(instanceId, 'recovery_lockout', contextDetails)
  }
  const underlyingBand = normalizeEnergyBudget(
    agent.energyBudget ?? createDefaultResponderEnergyBudget()
  ).reserveBand
  if (underlyingBand !== 'depleted' && underlyingBand !== 'overdrawn') {
    return unavailable(instanceId, 'no_overdrive_need', {
      ...contextDetails,
      underlyingBand,
      effectiveBand: underlyingBand,
    })
  }
  return {
    instanceId,
    available: true,
    ...contextDetails,
    underlyingBand,
    effectiveBand: EFFECTIVE_ENERGY_BAND[underlyingBand],
  }
}

export function activateCombatStim(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimActivationResult {
  const normalized = ensureNormalizedGameState(state)
  const preview = resolveCombatStimActivation(normalized, instanceId)
  if (!preview.available) {
    return { ok: false, state: normalized, code: preview.reasonCode!, preview }
  }
  const instance = normalized.equipmentInstances![instanceId]!
  const payload = instance.payload!
  const agentId = preview.agentId!
  const agent = normalized.agents[agentId]!
  const dosesAfter = payload.remaining - 1
  const activationOrdinal = COMBAT_STIM_CAPACITY - payload.remaining + 1
  const activationId = `combat-stim-${instanceId}-dose-${activationOrdinal}`
  const source = {
    kind: 'combat_stim' as const,
    activationId,
    equipmentInstanceId: instanceId,
    caseId: preview.caseId!,
  }
  const nextState = normalizeGameState({
    ...normalized,
    equipmentInstances: {
      ...(normalized.equipmentInstances ?? {}),
      [instanceId]: {
        ...instance,
        payload: { ...payload, remaining: dosesAfter },
      },
    },
    agents: {
      ...normalized.agents,
      [agentId]: {
        ...agent,
        overdrive: activateAgentOverdrive(agent.overdrive ?? createDefaultOverdriveState(), source),
      },
    },
  })
  return {
    ok: true,
    activationId,
    preview,
    state: appendOperationEventDrafts(nextState, [
      createCombatStimActivatedDraft({
        week: normalized.week,
        activationId,
        instanceId,
        agentId,
        agentName: preview.agentName!,
        caseId: preview.caseId!,
        caseTitle: preview.caseTitle!,
        dosesBefore: payload.remaining,
        dosesAfter,
        underlyingBand: preview.underlyingBand as 'depleted' | 'overdrawn',
        effectiveBand: preview.effectiveBand as 'taxed' | 'depleted',
      }),
    ]),
  }
}

export function equipStoredCombatStimInstance(
  state: GameState,
  instanceId: EquipmentInstanceId,
  agentId: Id,
  slot: EquipmentSlotKind
): GameState {
  const instance = getEquipmentInstance(state, instanceId)
  if (
    !instance ||
    instance.definitionId !== COMBAT_STIM_DEFINITION_ID ||
    instance.location.state !== 'stored'
  ) {
    return ensureNormalizedGameState(state)
  }
  return equipStoredEquipmentInstance(state, instanceId, agentId, slot)
}

export function listStoredCombatStimInstances(
  state: Pick<GameState, 'equipmentInstances'>
): EquipmentInstance[] {
  return listStoredEquipmentInstances(state, COMBAT_STIM_DEFINITION_ID)
}

export const COMBAT_STIM_DISPOSAL_REASON_CODES = [
  'invalid_instance_id',
  'unknown_instance',
  'wrong_definition',
  'malformed_payload',
  'not_stored',
  'agent_not_idle',
  'recovery_claimed',
  'overdrive_provenance',
] as const

export type CombatStimDisposalReasonCode = (typeof COMBAT_STIM_DISPOSAL_REASON_CODES)[number]

export interface CombatStimDisposalPreview {
  instanceId: EquipmentInstanceId
  canDispose: boolean
  reasonCode?: CombatStimDisposalReasonCode
  doseLabel?: string
  conditionLabel: string
}

export type CombatStimDisposalResult =
  | { ok: true; state: GameState; instance: EquipmentInstance }
  | { ok: false; state: GameState; code: CombatStimDisposalReasonCode }

export const COMBAT_STIM_REAGGREGATION_REASON_CODES = [
  'invalid_instance_id',
  'unknown_instance',
  'wrong_definition',
  'malformed_payload',
  'not_stored',
  'agent_not_idle',
  'condition_unsupported',
  'partial_dose',
  'depleted_dose',
  'recovery_claimed',
  'overdrive_provenance',
  'fabricated_provenance_required',
  'inventory_capacity_exceeded',
] as const

export type CombatStimReaggregationReasonCode =
  (typeof COMBAT_STIM_REAGGREGATION_REASON_CODES)[number]

export interface CombatStimReaggregationPreview {
  instanceId: EquipmentInstanceId
  canReaggregate: boolean
  reasonCode?: CombatStimReaggregationReasonCode
  doseLabel?: string
  conditionLabel: string
}

export type CombatStimReaggregationResult =
  | { ok: true; state: GameState; instance: EquipmentInstance }
  | { ok: false; state: GameState; code: CombatStimReaggregationReasonCode }

function readCombatStimAggregateStock(state: GameState) {
  const value = state.inventory[COMBAT_STIM_DEFINITION_ID]
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function snapshotCombatStimInstance(instance: EquipmentInstance): EquipmentInstance {
  const location = Object.freeze({ ...instance.location }) as EquipmentInstanceLocation
  const payload = instance.payload ? Object.freeze({ ...instance.payload }) : undefined
  const fabricationOrigin = instance.fabricationOrigin
    ? Object.freeze({ ...instance.fabricationOrigin })
    : undefined
  return Object.freeze({
    instanceId: instance.instanceId,
    definitionId: instance.definitionId,
    location,
    condition: instance.condition,
    ...(payload ? { payload } : {}),
    ...(fabricationOrigin ? { fabricationOrigin } : {}),
  })
}

function instanceHasActiveOverdriveProvenance(state: GameState, instanceId: string) {
  return Object.values(state.agents).some(
    (agent) =>
      agent.overdrive?.source?.kind === 'combat_stim' &&
      agent.overdrive.source.equipmentInstanceId === instanceId &&
      (agent.overdrive.active || agent.overdrive.recoveryDebt > 0)
  )
}

function isIdleAgent(agent: Agent | undefined) {
  return Boolean(agent && agent.status === 'active' && agent.assignment?.state === 'idle')
}

/** Stored, or equipped on an idle active agent (SPE-2855). */
function resolveCombatStimLifecycleLocation(
  state: GameState,
  instance: EquipmentInstance
): 'ok' | 'not_stored' | 'agent_not_idle' {
  if (instance.location.state === 'stored') return 'ok'
  if (instance.location.state === 'equipped') {
    return isIdleAgent(state.agents[instance.location.agentId]) ? 'ok' : 'agent_not_idle'
  }
  return 'not_stored'
}

function mapRelocateFailureToCombatStimCode(
  code: string
): 'agent_not_idle' | 'not_stored' | 'stale_transition' {
  if (code === 'agent_not_idle') return 'agent_not_idle'
  if (code === 'stale_transition') return 'stale_transition'
  return 'not_stored'
}

export function resolveCombatStimDisposal(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimDisposalPreview {
  const conditionLabel = (condition: EquipmentInstance['condition']) =>
    condition === 'damaged' ? 'Damaged' : 'Operational'
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return { instanceId, canDispose: false, reasonCode: 'invalid_instance_id', conditionLabel: '—' }
  }
  const instance = getEquipmentInstance(state, instanceId)
  if (!instance) {
    return { instanceId, canDispose: false, reasonCode: 'unknown_instance', conditionLabel: '—' }
  }
  const base = { instanceId, conditionLabel: conditionLabel(instance.condition) }
  if (instance.definitionId !== COMBAT_STIM_DEFINITION_ID) {
    return { ...base, canDispose: false, reasonCode: 'wrong_definition' }
  }
  const locationGate = resolveCombatStimLifecycleLocation(state, instance)
  if (locationGate !== 'ok') {
    return { ...base, canDispose: false, reasonCode: locationGate }
  }
  if (!isCanonicalCombatStimPayload(instance.payload)) {
    return { ...base, canDispose: false, reasonCode: 'malformed_payload', doseLabel: 'Unavailable' }
  }
  const doseLabel = `${instance.payload.remaining}/${instance.payload.capacity} doses`
  if (isEquipmentInstanceClaimedForRecovery(state, instanceId)) {
    return { ...base, canDispose: false, reasonCode: 'recovery_claimed', doseLabel }
  }
  if (instanceHasActiveOverdriveProvenance(state, instanceId)) {
    return { ...base, canDispose: false, reasonCode: 'overdrive_provenance', doseLabel }
  }
  return { ...base, canDispose: true, doseLabel }
}

export function getCombatStimStoredInstanceDisposalViews(
  state: GameState
): CombatStimDisposalPreview[] {
  return listStoredCombatStimInstances(state).map((instance) =>
    resolveCombatStimDisposal(state, instance.instanceId)
  )
}

export function getCombatStimStoredInstanceConditionRepairViews(state: GameState) {
  return listStoredCombatStimInstances(state).map((instance) =>
    resolveStoredEquipmentInstanceConditionRepair(state, instance.instanceId)
  )
}

export function destroyStoredCombatStimInstance(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimDisposalResult {
  const normalized = ensureNormalizedGameState(state)
  const preview = resolveCombatStimDisposal(normalized, instanceId)
  if (!preview.canDispose) {
    return { ok: false, state: normalized, code: preview.reasonCode! }
  }
  const instance = normalized.equipmentInstances![instanceId]!
  if (instance.location.state === 'equipped') {
    const relocated = relocateEquipmentInstance(normalized, instanceId, { state: 'stored' })
    if (!relocated.ok) {
      const code = mapRelocateFailureToCombatStimCode(relocated.code)
      return {
        ok: false,
        state: relocated.state,
        code: code === 'stale_transition' ? 'unknown_instance' : code,
      }
    }
    return destroyStoredCombatStimInstance(relocated.state, instanceId)
  }
  const equipmentInstances = { ...(normalized.equipmentInstances ?? {}) }
  delete equipmentInstances[instanceId]
  const nextState = normalizeGameState({ ...normalized, equipmentInstances })
  return { ok: true, state: nextState, instance: snapshotCombatStimInstance(instance) }
}

export function resolveCombatStimReaggregation(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimReaggregationPreview {
  const conditionLabel = (condition: EquipmentInstance['condition']) =>
    condition === 'damaged' ? 'Damaged' : 'Operational'
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return {
      instanceId,
      canReaggregate: false,
      reasonCode: 'invalid_instance_id',
      conditionLabel: '—',
    }
  }
  const instance = getEquipmentInstance(state, instanceId)
  if (!instance) {
    return {
      instanceId,
      canReaggregate: false,
      reasonCode: 'unknown_instance',
      conditionLabel: '—',
    }
  }
  const base = { instanceId, conditionLabel: conditionLabel(instance.condition) }
  if (instance.definitionId !== COMBAT_STIM_DEFINITION_ID) {
    return { ...base, canReaggregate: false, reasonCode: 'wrong_definition' }
  }
  const locationGate = resolveCombatStimLifecycleLocation(state, instance)
  if (locationGate !== 'ok') {
    return { ...base, canReaggregate: false, reasonCode: locationGate }
  }
  if (!isCanonicalCombatStimPayload(instance.payload)) {
    return {
      ...base,
      canReaggregate: false,
      reasonCode: 'malformed_payload',
      doseLabel: 'Unavailable',
    }
  }
  const doseLabel = `${instance.payload.remaining}/${instance.payload.capacity} doses`
  if (instance.condition !== 'operational') {
    return { ...base, canReaggregate: false, reasonCode: 'condition_unsupported', doseLabel }
  }
  if (instance.payload.remaining === 0) {
    return { ...base, canReaggregate: false, reasonCode: 'depleted_dose', doseLabel }
  }
  if (instance.payload.remaining !== COMBAT_STIM_CAPACITY) {
    return { ...base, canReaggregate: false, reasonCode: 'partial_dose', doseLabel }
  }
  if (instance.fabricationOrigin !== undefined) {
    return {
      ...base,
      canReaggregate: false,
      reasonCode: 'fabricated_provenance_required',
      doseLabel,
    }
  }
  if (isEquipmentInstanceClaimedForRecovery(state, instanceId)) {
    return { ...base, canReaggregate: false, reasonCode: 'recovery_claimed', doseLabel }
  }
  if (instanceHasActiveOverdriveProvenance(state, instanceId)) {
    return { ...base, canReaggregate: false, reasonCode: 'overdrive_provenance', doseLabel }
  }
  const stock = readCombatStimAggregateStock(state)
  if (!Number.isSafeInteger(stock) || stock >= Number.MAX_SAFE_INTEGER) {
    return {
      ...base,
      canReaggregate: false,
      reasonCode: 'inventory_capacity_exceeded',
      doseLabel,
    }
  }
  return { ...base, canReaggregate: true, doseLabel }
}

export function getCombatStimStoredInstanceReaggregationViews(
  state: GameState
): CombatStimReaggregationPreview[] {
  return listStoredCombatStimInstances(state).map((instance) =>
    resolveCombatStimReaggregation(state, instance.instanceId)
  )
}

export function reaggregateStoredCombatStimInstance(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimReaggregationResult {
  const normalized = ensureNormalizedGameState(state)
  const preview = resolveCombatStimReaggregation(normalized, instanceId)
  if (!preview.canReaggregate) {
    return { ok: false, state: normalized, code: preview.reasonCode! }
  }
  const instance = normalized.equipmentInstances![instanceId]!
  if (instance.location.state === 'equipped') {
    const relocated = relocateEquipmentInstance(normalized, instanceId, { state: 'stored' })
    if (!relocated.ok) {
      const code = mapRelocateFailureToCombatStimCode(relocated.code)
      return {
        ok: false,
        state: relocated.state,
        code: code === 'stale_transition' ? 'unknown_instance' : code,
      }
    }
    return reaggregateStoredCombatStimInstance(relocated.state, instanceId)
  }
  const stock = readCombatStimAggregateStock(normalized)
  const equipmentInstances = { ...(normalized.equipmentInstances ?? {}) }
  delete equipmentInstances[instanceId]
  const nextState = normalizeGameState({
    ...normalized,
    inventory: { ...normalized.inventory, [COMBAT_STIM_DEFINITION_ID]: stock + 1 },
    equipmentInstances,
  })
  return { ok: true, state: nextState, instance: snapshotCombatStimInstance(instance) }
}

export const COMBAT_STIM_RETURN_TO_LOT_REASON_CODES = [
  'invalid_instance_id',
  'stale_transition',
  'wrong_definition',
  'malformed_payload',
  'not_stored',
  'agent_not_idle',
  'condition_unsupported',
  'partial_dose',
  'depleted_dose',
  'fabricated_provenance_required',
  'recovery_claimed',
  'overdrive_provenance',
  'inventory_capacity_exceeded',
] as const

export type CombatStimReturnToLotReasonCode =
  (typeof COMBAT_STIM_RETURN_TO_LOT_REASON_CODES)[number]

export interface CombatStimReturnToLotPreview {
  instanceId: EquipmentInstanceId
  canReturnToLot: boolean
  reasonCode?: CombatStimReturnToLotReasonCode
  doseLabel?: string
  conditionLabel: string
  provenanceLabel?: string
}

export type CombatStimReturnToLotResult =
  | { ok: true; state: GameState; instance: EquipmentInstance }
  | { ok: false; state: GameState; code: CombatStimReturnToLotReasonCode }

export function resolveCombatStimReturnToLot(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimReturnToLotPreview {
  const conditionLabel = (condition: EquipmentInstance['condition']) =>
    condition === 'damaged' ? 'Damaged' : 'Operational'
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return {
      instanceId,
      canReturnToLot: false,
      reasonCode: 'invalid_instance_id',
      conditionLabel: '—',
    }
  }
  const instance = getEquipmentInstance(state, instanceId)
  if (!instance) {
    return {
      instanceId,
      canReturnToLot: false,
      reasonCode: 'stale_transition',
      conditionLabel: '—',
    }
  }
  const base = { instanceId, conditionLabel: conditionLabel(instance.condition) }
  if (instance.definitionId !== COMBAT_STIM_DEFINITION_ID) {
    return { ...base, canReturnToLot: false, reasonCode: 'wrong_definition' }
  }
  const locationGate = resolveCombatStimLifecycleLocation(state, instance)
  if (locationGate !== 'ok') {
    return { ...base, canReturnToLot: false, reasonCode: locationGate }
  }
  if (!isCanonicalCombatStimPayload(instance.payload)) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'malformed_payload',
      doseLabel: 'Unavailable',
    }
  }
  const doseLabel = `${instance.payload.remaining}/${instance.payload.capacity} doses`
  const provenanceLabel = instance.fabricationOrigin
    ? `Fabricated batch ${instance.fabricationOrigin.queueId} / week ${instance.fabricationOrigin.completedWeek}`
    : undefined
  if (instance.condition !== 'operational') {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'condition_unsupported',
      doseLabel,
      provenanceLabel,
    }
  }
  if (instance.payload.remaining === 0) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'depleted_dose',
      doseLabel,
      provenanceLabel,
    }
  }
  if (instance.payload.remaining !== COMBAT_STIM_CAPACITY) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'partial_dose',
      doseLabel,
      provenanceLabel,
    }
  }
  if (instance.fabricationOrigin === undefined) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'fabricated_provenance_required',
      doseLabel,
    }
  }
  if (isEquipmentInstanceClaimedForRecovery(state, instanceId)) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'recovery_claimed',
      doseLabel,
      provenanceLabel,
    }
  }
  if (instanceHasActiveOverdriveProvenance(state, instanceId)) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'overdrive_provenance',
      doseLabel,
      provenanceLabel,
    }
  }
  const stock = readCombatStimAggregateStock(state)
  if (!Number.isSafeInteger(stock) || stock >= Number.MAX_SAFE_INTEGER) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'inventory_capacity_exceeded',
      doseLabel,
      provenanceLabel,
    }
  }
  const originResolved = resolveFabricationOriginForDefinition(
    state,
    instance.definitionId,
    instance.fabricationOrigin
  )
  if (!originResolved.ok) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'fabricated_provenance_required',
      doseLabel,
      provenanceLabel,
    }
  }
  const origin = originResolved.origin
  const lot = state.fabricatedEquipmentLots?.[origin.queueId]
  if (!lot || !isCanonicalFabricatedLotForDefinition(state, instance.definitionId, lot)) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'fabricated_provenance_required',
      doseLabel,
      provenanceLabel,
    }
  }
  const rawTracked = lot.trackedInstanceUnits ?? 0
  if (
    !Number.isSafeInteger(rawTracked) ||
    (rawTracked as number) < 0 ||
    (rawTracked as number) > lot.quantity
  ) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'fabricated_provenance_required',
      doseLabel,
      provenanceLabel,
    }
  }
  const tracked = rawTracked as number
  if (tracked < 1) {
    return {
      ...base,
      canReturnToLot: false,
      reasonCode: 'fabricated_provenance_required',
      doseLabel,
      provenanceLabel,
    }
  }
  return {
    ...base,
    canReturnToLot: true,
    doseLabel,
    provenanceLabel,
  }
}

export function getCombatStimStoredInstanceReturnToLotViews(
  state: GameState
): CombatStimReturnToLotPreview[] {
  return listStoredCombatStimInstances(state).map((instance) =>
    resolveCombatStimReturnToLot(state, instance.instanceId)
  )
}

export function returnFabricatedCombatStimInstanceToLot(
  state: GameState,
  instanceId: EquipmentInstanceId
): CombatStimReturnToLotResult {
  const normalized = ensureNormalizedGameState(state)
  const preview = resolveCombatStimReturnToLot(normalized, instanceId)
  if (!preview.canReturnToLot) {
    return { ok: false, state: normalized, code: preview.reasonCode! }
  }
  const instance = normalized.equipmentInstances![instanceId]!
  if (instance.location.state === 'equipped') {
    const relocated = relocateEquipmentInstance(normalized, instanceId, { state: 'stored' })
    if (!relocated.ok) {
      return {
        ok: false,
        state: relocated.state,
        code: mapRelocateFailureToCombatStimCode(relocated.code),
      }
    }
    return returnFabricatedCombatStimInstanceToLot(relocated.state, instanceId)
  }
  const originResolved = resolveFabricationOriginForDefinition(
    normalized,
    instance.definitionId,
    instance.fabricationOrigin!
  )
  if (!originResolved.ok) {
    return { ok: false, state: normalized, code: 'fabricated_provenance_required' }
  }
  const origin = originResolved.origin
  const lot = normalized.fabricatedEquipmentLots![origin.queueId]!
  const tracked = Math.max(0, Math.trunc(lot.trackedInstanceUnits ?? 0))
  const nextTracked = tracked - 1
  const stock = readCombatStimAggregateStock(normalized)
  const equipmentInstances = { ...(normalized.equipmentInstances ?? {}) }
  delete equipmentInstances[instanceId]
  const nextLots = { ...(normalized.fabricatedEquipmentLots ?? {}) }
  nextLots[lot.queueId] = Object.freeze({
    ...lot,
    trackedInstanceUnits: nextTracked,
  })
  const nextState = normalizeGameState({
    ...normalized,
    inventory: { ...normalized.inventory, [COMBAT_STIM_DEFINITION_ID]: stock + 1 },
    equipmentInstances,
    fabricatedEquipmentLots: nextLots,
  })
  return {
    ok: true,
    state: nextState,
    instance: snapshotCombatStimInstance(instance),
  }
}

export {
  applyCombatStimRecoveryDebtAtWeekClose,
  expireCombatStimOverdrivesAtWeekClose,
} from './combatStimWeekClose'

export function getCombatStimDisposalReasonLabel(code: CombatStimDisposalReasonCode) {
  const labels: Record<CombatStimDisposalReasonCode, string> = {
    invalid_instance_id: 'Invalid equipment instance.',
    unknown_instance: 'Equipment instance unavailable.',
    wrong_definition: 'This instance is not Combat Stims.',
    malformed_payload: 'Dose state is unavailable.',
    not_stored: 'Only stored or idle-equipped Combat Stim instances can be disposed.',
    agent_not_idle: 'Loadout changes are locked while this operative is not idle.',
    recovery_claimed: 'Recovery is already queued or completed for this instance.',
    overdrive_provenance: 'Active overdrive or recovery debt still references this instance.',
  }
  return labels[code]
}

export function getCombatStimReturnToLotReasonLabel(code: CombatStimReturnToLotReasonCode) {
  const labels: Record<CombatStimReturnToLotReasonCode, string> = {
    invalid_instance_id: 'Invalid equipment instance.',
    stale_transition: 'Equipment instance unavailable.',
    wrong_definition: 'This instance is not Combat Stims.',
    malformed_payload: 'Dose state is unavailable.',
    not_stored:
      'Only stored or idle-equipped Combat Stim instances can return to a fabricated lot.',
    agent_not_idle: 'Loadout changes are locked while this operative is not idle.',
    condition_unsupported: 'Damaged Combat Stim copies cannot return to fabricated-lot tracking.',
    partial_dose:
      'Only full 2/2 Combat Stim copies can return to a fabricated lot. Dispose or recover partial doses separately.',
    depleted_dose:
      'Depleted Combat Stim copies cannot return to a fabricated lot. Use recovery or disposal instead.',
    recovery_claimed: 'Recovery is already queued or completed for this instance.',
    overdrive_provenance: 'Active overdrive or recovery debt still references this instance.',
    fabricated_provenance_required:
      'This copy lacks valid fabricated-lot provenance or the source lot cannot absorb the return.',
    inventory_capacity_exceeded: 'Aggregate Combat Stim stock is already at its safe capacity.',
  }
  return labels[code]
}

export function getCombatStimReaggregationReasonLabel(code: CombatStimReaggregationReasonCode) {
  const labels: Record<CombatStimReaggregationReasonCode, string> = {
    invalid_instance_id: 'Invalid equipment instance.',
    unknown_instance: 'Equipment instance unavailable.',
    wrong_definition: 'This instance is not Combat Stims.',
    malformed_payload: 'Dose state is unavailable.',
    not_stored: 'Only stored or idle-equipped Combat Stim instances can return to aggregate stock.',
    agent_not_idle: 'Loadout changes are locked while this operative is not idle.',
    condition_unsupported:
      'Damaged Combat Stim copies cannot return to operational aggregate stock.',
    partial_dose:
      'Only full 2/2 Combat Stim copies can return to aggregate stock. Dispose or recover partial doses separately.',
    depleted_dose:
      'Depleted Combat Stim copies cannot return to aggregate stock. Use recovery or disposal instead.',
    recovery_claimed: 'Recovery is already queued or completed for this instance.',
    overdrive_provenance: 'Active overdrive or recovery debt still references this instance.',
    fabricated_provenance_required:
      'Fabricated Combat Stim copies cannot return to catalog stock. Use a lot return command when available.',
    inventory_capacity_exceeded: 'Aggregate Combat Stim stock is already at its safe capacity.',
  }
  return labels[code]
}

export function getCombatStimActivationReasonLabel(code: CombatStimActivationReasonCode) {
  const labels: Record<CombatStimActivationReasonCode, string> = {
    invalid_instance_id: 'Invalid equipment instance.',
    unknown_instance: 'Equipment instance unavailable.',
    wrong_definition: 'This instance is not Combat Stims.',
    malformed_payload: 'Dose state is unavailable.',
    empty: 'No doses remain.',
    not_equipped: 'Combat Stims must be equipped.',
    inoperable: 'Combat Stims are damaged.',
    invalid_responder: 'Responder cannot initiate the action.',
    invalid_context: 'Requires assignment to a raid or Stage IV operation.',
    no_overdrive_need: 'Responder energy is not depleted or overdrawn.',
    already_overdriven: 'Combat Stim overdrive is already active.',
    recovery_lockout: 'Overdrive recovery debt prevents another dose.',
    stimulant_prohibited: 'Responder has a stimulant contraindication.',
  }
  return labels[code]
}
