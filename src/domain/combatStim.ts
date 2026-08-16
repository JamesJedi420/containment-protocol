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
  isSafeEquipmentInstanceId,
  relocateEquipmentInstance,
  type EquipmentInstance,
  type EquipmentInstanceId,
} from './equipmentInstance'
import { createDefaultResponderEnergyBudget, normalizeEnergyBudget } from './responderEnergyBudget'
import { ensureNormalizedGameState, normalizeGameState } from './teamSimulation'
import { appendOperationEventDrafts, createCombatStimActivatedDraft } from './events'
import type { EquipmentSlotKind } from './equipment'

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
  const relocated = relocateEquipmentInstance(state, instanceId, {
    state: 'equipped',
    agentId,
    slot,
  })
  return relocated.state
}

export function listStoredCombatStimInstances(
  state: Pick<GameState, 'equipmentInstances'>
): EquipmentInstance[] {
  return Object.values(state.equipmentInstances ?? {})
    .filter(
      (instance) =>
        instance.definitionId === COMBAT_STIM_DEFINITION_ID && instance.location.state === 'stored'
    )
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId))
    .map((instance) => ({
      ...instance,
      location: { ...instance.location },
      ...(instance.payload ? { payload: { ...instance.payload } } : {}),
    }))
}

export {
  applyCombatStimRecoveryDebtAtWeekClose,
  expireCombatStimOverdrivesAtWeekClose,
} from './combatStimWeekClose'

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
