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
  type EquipmentInstance,
  type EquipmentInstanceId,
  type EquipmentInstanceLocation,
} from './equipmentInstance'
import { createDefaultResponderEnergyBudget, normalizeEnergyBudget } from './responderEnergyBudget'
import { ensureNormalizedGameState, normalizeGameState } from './teamSimulation'
import { appendOperationEventDrafts, createCombatStimActivatedDraft } from './events'
import type { EquipmentSlotKind } from './equipment'
import { equipStoredEquipmentInstance } from './sim/equipment'

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

function snapshotCombatStimInstance(instance: EquipmentInstance): EquipmentInstance {
  const location = Object.freeze({ ...instance.location }) as EquipmentInstanceLocation
  const payload = instance.payload ? Object.freeze({ ...instance.payload }) : undefined
  return Object.freeze({
    instanceId: instance.instanceId,
    definitionId: instance.definitionId,
    location,
    condition: instance.condition,
    ...(payload ? { payload } : {}),
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
  if (instance.location.state !== 'stored') {
    return { ...base, canDispose: false, reasonCode: 'not_stored' }
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

export function getCombatStimStoredInstanceDisposalViews(state: GameState): CombatStimDisposalPreview[] {
  return listStoredCombatStimInstances(state).map((instance) =>
    resolveCombatStimDisposal(state, instance.instanceId)
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
  const equipmentInstances = { ...(normalized.equipmentInstances ?? {}) }
  delete equipmentInstances[instanceId]
  const nextState = normalizeGameState({ ...normalized, equipmentInstances })
  return { ok: true, state: nextState, instance: snapshotCombatStimInstance(instance) }
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
    not_stored: 'Only stored Combat Stim instances can be disposed.',
    recovery_claimed: 'Recovery is already queued or completed for this instance.',
    overdrive_provenance: 'Active overdrive or recovery debt still references this instance.',
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
