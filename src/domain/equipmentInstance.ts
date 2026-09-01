import type { Agent, GameState, Id } from './models'
import {
  EQUIPMENT_SLOT_KINDS,
  getEquipmentDefinition,
  getEquipmentSlotAliases,
  getEquipmentSlotItemId,
  validateAgentLoadoutAssignment,
  type EquipmentSlotKind,
} from './equipment'
import { isEquipmentGradeId, type EquipmentGradeId } from './equipmentGrade'
import { ensureNormalizedGameState, normalizeGameState } from './teamSimulation'

export type EquipmentInstanceId = string
export type EquipmentInstanceCondition = 'operational' | 'damaged'

export type EquipmentInstanceLocation =
  { state: 'stored' } | { state: 'equipped'; agentId: Id; slot: EquipmentSlotKind }

export interface EquipmentInstanceConsumablePayload {
  resourceId: string
  capacity: number
  remaining: number
}

/** SPE-2846: immutable fabricated-lot snapshot retained on ordinary identities. */
export interface EquipmentInstanceFabricationOrigin {
  queueId: Id
  recipeId: string
  gradeId: EquipmentGradeId
  completedWeek: number
}

export interface EquipmentInstance {
  instanceId: EquipmentInstanceId
  definitionId: string
  location: EquipmentInstanceLocation
  condition: EquipmentInstanceCondition
  payload?: EquipmentInstanceConsumablePayload
  fabricationOrigin?: EquipmentInstanceFabricationOrigin
}

export type EquipmentInstanceRegistry = Record<EquipmentInstanceId, EquipmentInstance>

export type EquipmentInstanceFailureCode =
  | 'invalid_instance_id'
  | 'unknown_definition'
  | 'unknown_agent'
  | 'inventory_unavailable'
  | 'damaged_stock_ambiguity'
  | 'invalid_slot'
  | 'invalid_location'
  | 'slot_not_allowed'
  | 'slot_occupied'
  | 'agent_not_idle'
  | 'duplicate_claim'
  | 'stale_transition'
  | 'immutable_identity'
  | 'invalid_condition'
  | 'invalid_instance_shape'
  | 'malformed_payload_bounds'
  | 'invalid_consumable_profile'
  | 'specialized_materialization_required'
  | 'specialized_destruction_required'
  | 'specialized_reaggregation_required'
  | 'fabricated_provenance_required'
  | 'instance_not_stored'
  | 'payload_destruction_unsupported'
  | 'payload_reaggregation_unsupported'
  | 'condition_reaggregation_unsupported'
  | 'condition_already_operational'
  | 'inventory_capacity_exceeded'
  | 'recovery_claimed'
  | 'unauthorized_payload_transition'

export type EquipmentInstanceMutationResult =
  | { ok: true; state: GameState; instance: EquipmentInstance }
  | { ok: false; state: GameState; code: EquipmentInstanceFailureCode }

const SAFE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/
const INSTANCE_ID_PREFIX = 'equipment-instance'
const PROTOTYPE_SENSITIVE_IDS = new Set(['__proto__', 'constructor', 'prototype'])
export const COMBAT_STIM_DEFINITION_ID = 'combat_stims'
export const COMBAT_STIM_RESOURCE_ID = 'combat_stim_dose'
export const COMBAT_STIM_CAPACITY = 2

export function createCanonicalCombatStimPayload(): EquipmentInstanceConsumablePayload {
  return { resourceId: COMBAT_STIM_RESOURCE_ID, capacity: COMBAT_STIM_CAPACITY, remaining: 2 }
}

export function isCanonicalCombatStimPayload(
  value: EquipmentInstanceConsumablePayload | undefined
): value is EquipmentInstanceConsumablePayload {
  return Boolean(
    value &&
    Object.keys(value).length === 3 &&
    Object.hasOwn(value, 'resourceId') &&
    Object.hasOwn(value, 'capacity') &&
    Object.hasOwn(value, 'remaining') &&
    value.resourceId === COMBAT_STIM_RESOURCE_ID &&
    value.capacity === COMBAT_STIM_CAPACITY &&
    Number.isSafeInteger(value.remaining) &&
    value.remaining >= 0 &&
    value.remaining <= COMBAT_STIM_CAPACITY
  )
}

export function isSafeEquipmentInstanceId(value: unknown): value is EquipmentInstanceId {
  return (
    typeof value === 'string' && SAFE_ID_PATTERN.test(value) && !PROTOTYPE_SENSITIVE_IDS.has(value)
  )
}

function isSafeResourceId(value: unknown): value is string {
  return (
    typeof value === 'string' && SAFE_ID_PATTERN.test(value) && !PROTOTYPE_SENSITIVE_IDS.has(value)
  )
}

function isKnownAgentId(value: unknown, agents: GameState['agents']): value is Id {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !PROTOTYPE_SENSITIVE_IDS.has(value) &&
    Object.prototype.hasOwnProperty.call(agents, value)
  )
}

function readAggregateStock(state: GameState, definitionId: string) {
  const value = state.inventory[definitionId]
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key))
}

function isValidPayload(value: unknown): value is EquipmentInstanceConsumablePayload {
  if (!isRecord(value) || !hasOnlyKeys(value, ['resourceId', 'capacity', 'remaining'])) {
    return false
  }

  return (
    isSafeResourceId(value.resourceId) &&
    Number.isSafeInteger(value.capacity) &&
    Number.isSafeInteger(value.remaining) &&
    (value.capacity as number) >= 0 &&
    (value.remaining as number) >= 0 &&
    (value.remaining as number) <= (value.capacity as number)
  )
}

function isSafeFabricationRecipeId(value: unknown): value is string {
  return (
    typeof value === 'string' && SAFE_ID_PATTERN.test(value) && !PROTOTYPE_SENSITIVE_IDS.has(value)
  )
}

function isValidFabricationOrigin(value: unknown): value is EquipmentInstanceFabricationOrigin {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['queueId', 'recipeId', 'gradeId', 'completedWeek'])
  ) {
    return false
  }
  return (
    typeof value.queueId === 'string' &&
    value.queueId.length > 0 &&
    value.queueId === value.queueId.trim() &&
    !/^(0|[1-9]\d*)$/.test(value.queueId) &&
    !PROTOTYPE_SENSITIVE_IDS.has(value.queueId) &&
    isSafeFabricationRecipeId(value.recipeId) &&
    isEquipmentGradeId(value.gradeId) &&
    Number.isSafeInteger(value.completedWeek) &&
    (value.completedWeek as number) >= 1
  )
}

function fabricationOriginsEqual(
  left: EquipmentInstanceFabricationOrigin | undefined,
  right: EquipmentInstanceFabricationOrigin | undefined
) {
  return (
    left === right ||
    (Boolean(left) &&
      Boolean(right) &&
      left?.queueId === right?.queueId &&
      left?.recipeId === right?.recipeId &&
      left?.gradeId === right?.gradeId &&
      left?.completedWeek === right?.completedWeek)
  )
}

function snapshotFabricationOrigin(
  origin: EquipmentInstanceFabricationOrigin
): EquipmentInstanceFabricationOrigin {
  return Object.freeze({
    queueId: origin.queueId,
    recipeId: origin.recipeId,
    gradeId: origin.gradeId,
    completedWeek: origin.completedWeek,
  })
}

/**
 * Validates an optional fabrication-origin snapshot against the live lot registry when present.
 * Missing lots reject as unknown provenance; matching lots must agree on recipe/grade/week/item.
 */
export function resolveFabricationOriginForDefinition(
  state: Pick<GameState, 'fabricatedEquipmentLots'>,
  definitionId: string,
  value: unknown
):
  | { ok: true; origin: EquipmentInstanceFabricationOrigin }
  | { ok: false; code: EquipmentInstanceFailureCode } {
  if (value === undefined) {
    return { ok: false, code: 'invalid_instance_shape' }
  }
  if (!isValidFabricationOrigin(value)) {
    return { ok: false, code: 'invalid_instance_shape' }
  }
  const lot = state.fabricatedEquipmentLots?.[value.queueId]
  if (!lot) {
    return { ok: false, code: 'fabricated_provenance_required' }
  }
  if (
    lot.queueId !== value.queueId ||
    lot.itemId !== definitionId ||
    lot.recipeId !== value.recipeId ||
    lot.gradeId !== value.gradeId ||
    lot.completedWeek !== value.completedWeek
  ) {
    return { ok: false, code: 'fabricated_provenance_required' }
  }
  return {
    ok: true,
    origin: {
      queueId: value.queueId,
      recipeId: value.recipeId,
      gradeId: value.gradeId,
      completedWeek: value.completedWeek,
    },
  }
}

function isEquipmentSlotKind(value: unknown): value is EquipmentSlotKind {
  return EQUIPMENT_SLOT_KINDS.includes(value as EquipmentSlotKind)
}

function validatePersistedLocation(
  value: unknown,
  definitionId: string,
  agents: GameState['agents']
):
  | { valid: true; location: EquipmentInstanceLocation }
  | { valid: false; code: EquipmentInstanceFailureCode } {
  if (!isRecord(value) || typeof value.state !== 'string') {
    return { valid: false, code: 'invalid_location' }
  }
  if (value.state === 'stored') {
    return hasOnlyKeys(value, ['state'])
      ? { valid: true, location: { state: 'stored' } }
      : { valid: false, code: 'invalid_location' }
  }
  if (value.state !== 'equipped' || !hasOnlyKeys(value, ['state', 'agentId', 'slot'])) {
    return { valid: false, code: 'invalid_location' }
  }
  if (!isKnownAgentId(value.agentId, agents)) return { valid: false, code: 'unknown_agent' }
  if (!isEquipmentSlotKind(value.slot)) return { valid: false, code: 'invalid_slot' }
  const definition = getEquipmentDefinition(definitionId)
  if (!definition?.allowedSlots.includes(value.slot)) {
    return { valid: false, code: 'slot_not_allowed' }
  }
  return {
    valid: true,
    location: { state: 'equipped', agentId: value.agentId, slot: value.slot },
  }
}

function validateInstance(
  value: unknown,
  key: string,
  agents: GameState['agents'],
  fabricatedEquipmentLots: GameState['fabricatedEquipmentLots']
):
  | { valid: true; instance: EquipmentInstance }
  | { valid: false; code: EquipmentInstanceFailureCode } {
  if (!isRecord(value) || !isSafeEquipmentInstanceId(key) || value.instanceId !== key) {
    return { valid: false, code: 'invalid_instance_id' }
  }
  if (
    !hasOnlyKeys(value, [
      'instanceId',
      'definitionId',
      'location',
      'condition',
      'payload',
      'fabricationOrigin',
    ])
  ) {
    return { valid: false, code: 'invalid_instance_shape' }
  }
  if (typeof value.definitionId !== 'string' || !getEquipmentDefinition(value.definitionId)) {
    return { valid: false, code: 'unknown_definition' }
  }
  if (value.condition !== 'operational' && value.condition !== 'damaged') {
    return { valid: false, code: 'invalid_condition' }
  }
  const location = validatePersistedLocation(value.location, value.definitionId, agents)
  if (!location.valid) return location
  if (value.payload !== undefined && !isValidPayload(value.payload)) {
    return { valid: false, code: 'malformed_payload_bounds' }
  }
  let fabricationOrigin: EquipmentInstanceFabricationOrigin | undefined
  if (value.fabricationOrigin !== undefined) {
    if (value.payload !== undefined) {
      // SPE-2849: Combat Stim may retain lot provenance with a canonical dose payload.
      // Ordinary payload-bearing identities still fail closed.
      if (
        value.definitionId !== COMBAT_STIM_DEFINITION_ID ||
        !isCanonicalCombatStimPayload(
          value.payload as EquipmentInstanceConsumablePayload | undefined
        )
      ) {
        return { valid: false, code: 'fabricated_provenance_required' }
      }
    }
    const resolved = resolveFabricationOriginForDefinition(
      { fabricatedEquipmentLots },
      value.definitionId,
      value.fabricationOrigin
    )
    if (!resolved.ok) return { valid: false, code: resolved.code }
    fabricationOrigin = resolved.origin
  }

  return {
    valid: true,
    instance: {
      instanceId: key,
      definitionId: value.definitionId,
      location: location.location,
      condition: value.condition,
      ...(value.payload
        ? { payload: { ...value.payload } as EquipmentInstanceConsumablePayload }
        : {}),
      ...(fabricationOrigin ? { fabricationOrigin } : {}),
    },
  }
}

function withProjectedSlot(agent: Agent, slot: EquipmentSlotKind, definitionId?: string): Agent {
  const equipmentSlots = { ...(agent.equipmentSlots ?? {}) }
  for (const alias of getEquipmentSlotAliases(slot)) delete equipmentSlots[alias]
  if (definitionId) equipmentSlots[slot] = definitionId
  const slottedDefinitionIds = new Set(
    EQUIPMENT_SLOT_KINDS.map((slotKind) => getEquipmentSlotItemId(equipmentSlots, slotKind)).filter(
      (itemId): itemId is string => Boolean(itemId)
    )
  )
  const equipmentEffectScales = Object.fromEntries(
    Object.entries(agent.equipmentEffectScales ?? {}).filter(([itemId]) =>
      slottedDefinitionIds.has(itemId)
    )
  )
  const definition = definitionId ? getEquipmentDefinition(definitionId) : undefined
  if (definition) {
    equipmentEffectScales[definition.id] = Math.max(1, Math.trunc(definition.legacyEffectScale))
  }
  return { ...agent, equipmentSlots, equipmentEffectScales }
}

function isIdleAgent(agent: Agent | undefined) {
  return Boolean(agent && agent.status === 'active' && agent.assignment?.state === 'idle')
}

function locationsEqual(left: EquipmentInstanceLocation, right: EquipmentInstanceLocation) {
  return (
    left.state === right.state &&
    (left.state === 'stored' ||
      (right.state === 'equipped' && left.agentId === right.agentId && left.slot === right.slot))
  )
}

function payloadsEqual(
  left: EquipmentInstanceConsumablePayload | undefined,
  right: EquipmentInstanceConsumablePayload | undefined
) {
  return (
    left === right ||
    (Boolean(left) &&
      Boolean(right) &&
      left?.resourceId === right?.resourceId &&
      left?.capacity === right?.capacity &&
      left?.remaining === right?.remaining)
  )
}

function instancesEqual(left: EquipmentInstance, right: EquipmentInstance) {
  return (
    left.instanceId === right.instanceId &&
    left.definitionId === right.definitionId &&
    left.condition === right.condition &&
    locationsEqual(left.location, right.location) &&
    payloadsEqual(left.payload, right.payload) &&
    fabricationOriginsEqual(left.fabricationOrigin, right.fabricationOrigin)
  )
}

function createEquipmentInstanceSnapshot(instance: EquipmentInstance): EquipmentInstance {
  const location = Object.freeze({ ...instance.location }) as EquipmentInstanceLocation
  const payload = instance.payload ? Object.freeze({ ...instance.payload }) : undefined
  const fabricationOrigin = instance.fabricationOrigin
    ? snapshotFabricationOrigin(instance.fabricationOrigin)
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

function getHistoricalEquipmentInstanceId(event: GameState['events'][number]) {
  if (
    event.type !== 'equipment.instance_materialized' &&
    event.type !== 'equipment.instance_destroyed' &&
    event.type !== 'equipment.instance_reaggregated' &&
    event.type !== 'equipment.combat_stim_disposed' &&
    event.type !== 'equipment.combat_stim_reaggregated'
  ) {
    return undefined
  }
  return isSafeEquipmentInstanceId(event.payload.instanceId) ? event.payload.instanceId : undefined
}

function nextInstanceId(state: GameState): EquipmentInstanceId {
  const registry = state.equipmentInstances ?? {}
  const reservedIds = new Set([
    ...Object.keys(registry),
    ...state.events
      .map(getHistoricalEquipmentInstanceId)
      .filter((instanceId): instanceId is EquipmentInstanceId => Boolean(instanceId)),
    ...(state.equipmentDeconstructionQueue ?? [])
      .map((entry) => entry.sourceEquipmentInstanceId)
      .filter((instanceId): instanceId is string => Boolean(instanceId)),
    ...Object.values(state.equipmentRecoveryOutcomes ?? {})
      .map((outcome) => outcome.sourceEquipmentInstanceId)
      .filter((instanceId): instanceId is string => Boolean(instanceId)),
  ])
  let ordinal = 1
  while (reservedIds.has(`${INSTANCE_ID_PREFIX}-${state.week}-${ordinal}`)) ordinal += 1
  return `${INSTANCE_ID_PREFIX}-${state.week}-${ordinal}`
}

export function getEquipmentInstance(
  state: Pick<GameState, 'equipmentInstances'>,
  instanceId: EquipmentInstanceId
): EquipmentInstance | undefined {
  const instance = isSafeEquipmentInstanceId(instanceId)
    ? state.equipmentInstances?.[instanceId]
    : undefined
  return instance ? createEquipmentInstanceSnapshot(instance) : undefined
}

export function getEquipmentInstanceAtAgentSlot(
  state: Pick<GameState, 'equipmentInstances'>,
  agentId: Id,
  slot: EquipmentSlotKind
): EquipmentInstance | undefined {
  const instance = Object.values(state.equipmentInstances ?? {})
    .filter(
      (instance) =>
        instance.location.state === 'equipped' &&
        instance.location.agentId === agentId &&
        instance.location.slot === slot
    )
    .sort((left, right) =>
      left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0
    )
    .at(0)
  return instance ? createEquipmentInstanceSnapshot(instance) : undefined
}

export function listStoredEquipmentInstances(
  state: Pick<GameState, 'equipmentInstances'>,
  definitionId?: string
): EquipmentInstance[] {
  return Object.values(state.equipmentInstances ?? {})
    .filter(
      (instance) =>
        instance.location.state === 'stored' &&
        (definitionId === undefined || instance.definitionId === definitionId)
    )
    .sort((left, right) =>
      left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0
    )
    .map(createEquipmentInstanceSnapshot)
}

export function isEquipmentInstanceClaimedForRecovery(
  state: Pick<GameState, 'equipmentDeconstructionQueue' | 'equipmentRecoveryOutcomes'>,
  instanceId: EquipmentInstanceId
): boolean {
  if (!isSafeEquipmentInstanceId(instanceId)) return false
  return (
    (state.equipmentDeconstructionQueue ?? []).some(
      (entry) => entry.sourceEquipmentInstanceId === instanceId
    ) ||
    Object.values(state.equipmentRecoveryOutcomes ?? {}).some(
      (outcome) => outcome.sourceEquipmentInstanceId === instanceId
    )
  )
}

export function destroyStoredOrdinaryEquipmentInstance(
  state: GameState,
  instanceId: EquipmentInstanceId
): EquipmentInstanceMutationResult {
  const normalized = ensureNormalizedGameState(state)
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return { ok: false, state: normalized, code: 'invalid_instance_id' }
  }
  const instance = normalized.equipmentInstances?.[instanceId]
  if (!instance) return { ok: false, state: normalized, code: 'stale_transition' }
  if (instance.definitionId === COMBAT_STIM_DEFINITION_ID) {
    return { ok: false, state: normalized, code: 'specialized_destruction_required' }
  }
  if (instance.location.state !== 'stored') {
    return { ok: false, state: normalized, code: 'instance_not_stored' }
  }
  if (instance.payload !== undefined) {
    return { ok: false, state: normalized, code: 'payload_destruction_unsupported' }
  }
  if (isEquipmentInstanceClaimedForRecovery(normalized, instanceId)) {
    return { ok: false, state: normalized, code: 'recovery_claimed' }
  }

  const equipmentInstances = { ...(normalized.equipmentInstances ?? {}) }
  delete equipmentInstances[instanceId]
  const nextState = normalizeGameState({ ...normalized, equipmentInstances })
  return { ok: true, state: nextState, instance: createEquipmentInstanceSnapshot(instance) }
}

export function reaggregateStoredOrdinaryEquipmentInstance(
  state: GameState,
  instanceId: EquipmentInstanceId
): EquipmentInstanceMutationResult {
  const normalized = ensureNormalizedGameState(state)
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return { ok: false, state: normalized, code: 'invalid_instance_id' }
  }
  const instance = normalized.equipmentInstances?.[instanceId]
  if (!instance) return { ok: false, state: normalized, code: 'stale_transition' }
  if (instance.definitionId === COMBAT_STIM_DEFINITION_ID) {
    return { ok: false, state: normalized, code: 'specialized_reaggregation_required' }
  }
  if (instance.location.state !== 'stored') {
    return { ok: false, state: normalized, code: 'instance_not_stored' }
  }
  if (instance.condition !== 'operational') {
    return { ok: false, state: normalized, code: 'condition_reaggregation_unsupported' }
  }
  if (instance.payload !== undefined) {
    return { ok: false, state: normalized, code: 'payload_reaggregation_unsupported' }
  }
  if (instance.fabricationOrigin !== undefined) {
    return { ok: false, state: normalized, code: 'fabricated_provenance_required' }
  }
  if (isEquipmentInstanceClaimedForRecovery(normalized, instanceId)) {
    return { ok: false, state: normalized, code: 'recovery_claimed' }
  }

  const stock = readAggregateStock(normalized, instance.definitionId)
  if (!Number.isSafeInteger(stock) || stock >= Number.MAX_SAFE_INTEGER) {
    return { ok: false, state: normalized, code: 'inventory_capacity_exceeded' }
  }

  const equipmentInstances = { ...(normalized.equipmentInstances ?? {}) }
  delete equipmentInstances[instanceId]
  const nextState = normalizeGameState({
    ...normalized,
    inventory: { ...normalized.inventory, [instance.definitionId]: stock + 1 },
    equipmentInstances,
  })
  return { ok: true, state: nextState, instance: createEquipmentInstanceSnapshot(instance) }
}

export type EquipmentInstanceConditionRepairReasonCode =
  | 'invalid_instance_id'
  | 'stale_transition'
  | 'instance_not_stored'
  | 'condition_already_operational'
  | 'recovery_claimed'

export interface EquipmentInstanceConditionRepairPreview {
  instanceId: EquipmentInstanceId
  canRepairCondition: boolean
  reasonCode?: EquipmentInstanceConditionRepairReasonCode
  conditionLabel: string
}

function conditionLabelForInstance(condition: EquipmentInstanceCondition) {
  return condition === 'damaged' ? 'Damaged' : 'Operational'
}

export function resolveStoredEquipmentInstanceConditionRepair(
  state: GameState,
  instanceId: EquipmentInstanceId
): EquipmentInstanceConditionRepairPreview {
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return {
      instanceId,
      canRepairCondition: false,
      reasonCode: 'invalid_instance_id',
      conditionLabel: '—',
    }
  }
  const instance = ensureNormalizedGameState(state).equipmentInstances?.[instanceId]
  if (!instance) {
    return {
      instanceId,
      canRepairCondition: false,
      reasonCode: 'stale_transition',
      conditionLabel: '—',
    }
  }
  const base = {
    instanceId,
    conditionLabel: conditionLabelForInstance(instance.condition),
  }
  if (instance.location.state !== 'stored') {
    return { ...base, canRepairCondition: false, reasonCode: 'instance_not_stored' }
  }
  if (isEquipmentInstanceClaimedForRecovery(ensureNormalizedGameState(state), instanceId)) {
    return { ...base, canRepairCondition: false, reasonCode: 'recovery_claimed' }
  }
  if (instance.condition !== 'damaged') {
    return { ...base, canRepairCondition: false, reasonCode: 'condition_already_operational' }
  }
  return { ...base, canRepairCondition: true }
}

export function getStoredEquipmentInstanceConditionRepairReasonLabel(
  code: EquipmentInstanceConditionRepairReasonCode
) {
  const labels: Record<EquipmentInstanceConditionRepairReasonCode, string> = {
    invalid_instance_id: 'Invalid equipment instance.',
    stale_transition: 'Equipment instance unavailable.',
    instance_not_stored: 'Only stored copies can be repaired.',
    condition_already_operational: 'This copy is already operational.',
    recovery_claimed: 'This copy is already claimed by equipment recovery.',
  }
  return labels[code]
}

export function repairStoredEquipmentInstanceCondition(
  state: GameState,
  instanceId: EquipmentInstanceId
): EquipmentInstanceMutationResult {
  const normalized = ensureNormalizedGameState(state)
  const preview = resolveStoredEquipmentInstanceConditionRepair(normalized, instanceId)
  if (!preview.canRepairCondition) {
    return { ok: false, state: normalized, code: preview.reasonCode ?? 'stale_transition' }
  }
  const current = normalized.equipmentInstances?.[instanceId]
  if (!current) {
    return { ok: false, state: normalized, code: 'stale_transition' }
  }
  return applyEquipmentInstanceTransition(normalized, instanceId, current, {
    ...current,
    condition: 'operational',
  })
}

function validateTargetLocation(
  state: GameState,
  definitionId: string,
  location: unknown,
  movingInstanceId?: EquipmentInstanceId
): EquipmentInstanceFailureCode | undefined {
  if (!isRecord(location) || typeof location.state !== 'string') return 'invalid_location'
  if (location.state === 'stored') {
    return hasOnlyKeys(location, ['state']) ? undefined : 'invalid_location'
  }
  if (location.state !== 'equipped' || !hasOnlyKeys(location, ['state', 'agentId', 'slot'])) {
    return 'invalid_location'
  }
  if (!isKnownAgentId(location.agentId, state.agents)) return 'unknown_agent'
  if (!isEquipmentSlotKind(location.slot)) return 'invalid_slot'
  const agent = state.agents[location.agentId]
  if (!agent) return 'unknown_agent'
  if (!isIdleAgent(agent)) return 'agent_not_idle'
  const definition = getEquipmentDefinition(definitionId)
  if (!definition?.allowedSlots.includes(location.slot)) return 'slot_not_allowed'
  const occupying = getEquipmentInstanceAtAgentSlot(state, location.agentId, location.slot)
  if (occupying && occupying.instanceId !== movingInstanceId) return 'slot_occupied'
  const projectedItem = getEquipmentSlotItemId(agent.equipmentSlots, location.slot)
  if (projectedItem && (!occupying || occupying.instanceId !== movingInstanceId)) {
    return 'slot_occupied'
  }
  const validation = validateAgentLoadoutAssignment(agent, location.slot, definitionId, {
    state: {
      ...state,
      inventory: {
        ...state.inventory,
        [definitionId]: readAggregateStock(state, definitionId) + 1,
      },
    },
  })
  return validation.valid ? undefined : 'slot_not_allowed'
}

export function instantiateEquipmentInstance(
  state: GameState,
  definitionId: string,
  options: {
    location?: EquipmentInstanceLocation
    condition?: EquipmentInstanceCondition
    payload?: EquipmentInstanceConsumablePayload
    fabricationOrigin?: EquipmentInstanceFabricationOrigin
  } = {}
): EquipmentInstanceMutationResult {
  const normalized = ensureNormalizedGameState(state)
  const definition = getEquipmentDefinition(definitionId)
  if (!definition) return { ok: false, state: normalized, code: 'unknown_definition' }
  const stock = readAggregateStock(normalized, definitionId)
  if (stock < 1) return { ok: false, state: normalized, code: 'inventory_unavailable' }
  if ((normalized.damagedEquipmentQueue ?? []).includes(definitionId)) {
    return { ok: false, state: normalized, code: 'damaged_stock_ambiguity' }
  }
  const condition = options.condition ?? 'operational'
  if (condition !== 'operational' && condition !== 'damaged') {
    return { ok: false, state: normalized, code: 'invalid_condition' }
  }
  if (options.payload !== undefined && !isValidPayload(options.payload)) {
    return { ok: false, state: normalized, code: 'malformed_payload_bounds' }
  }
  let fabricationOrigin: EquipmentInstanceFabricationOrigin | undefined
  if (options.fabricationOrigin !== undefined) {
    // SPE-2849: Combat Stim may materialize with lot provenance + canonical 2/2 payload.
    // Ordinary identities still reject any payload alongside fabricationOrigin.
    if (definitionId !== COMBAT_STIM_DEFINITION_ID && options.payload !== undefined) {
      return { ok: false, state: normalized, code: 'fabricated_provenance_required' }
    }
    const resolved = resolveFabricationOriginForDefinition(
      normalized,
      definitionId,
      options.fabricationOrigin
    )
    if (!resolved.ok) return { ok: false, state: normalized, code: resolved.code }
    fabricationOrigin = resolved.origin
  }
  const payload =
    definitionId === COMBAT_STIM_DEFINITION_ID
      ? (options.payload ?? createCanonicalCombatStimPayload())
      : options.payload
  if (
    definitionId === COMBAT_STIM_DEFINITION_ID &&
    (!isCanonicalCombatStimPayload(payload) || payload.remaining !== COMBAT_STIM_CAPACITY)
  ) {
    return { ok: false, state: normalized, code: 'invalid_consumable_profile' }
  }
  const location = options.location ?? { state: 'stored' as const }
  const locationFailure = validateTargetLocation(normalized, definitionId, location)
  if (locationFailure) return { ok: false, state: normalized, code: locationFailure }

  const instance: EquipmentInstance = {
    instanceId: nextInstanceId(normalized),
    definitionId,
    location: { ...location },
    condition,
    ...(payload ? { payload: { ...payload } } : {}),
    ...(fabricationOrigin ? { fabricationOrigin: { ...fabricationOrigin } } : {}),
  }
  const agents = { ...normalized.agents }
  if (location.state === 'equipped') {
    agents[location.agentId] = withProjectedSlot(
      agents[location.agentId],
      location.slot,
      definitionId
    )
  }
  const nextState = normalizeGameState({
    ...normalized,
    agents,
    inventory: { ...normalized.inventory, [definitionId]: stock - 1 },
    equipmentInstances: {
      ...(normalized.equipmentInstances ?? {}),
      [instance.instanceId]: instance,
    },
  })
  return { ok: true, state: nextState, instance: createEquipmentInstanceSnapshot(instance) }
}

export function applyEquipmentInstanceTransition(
  state: GameState,
  instanceId: EquipmentInstanceId,
  expected: EquipmentInstance,
  next: EquipmentInstance
): EquipmentInstanceMutationResult {
  const normalized = ensureNormalizedGameState(state)
  if (!isSafeEquipmentInstanceId(instanceId)) {
    return { ok: false, state: normalized, code: 'invalid_instance_id' }
  }
  const current = normalized.equipmentInstances?.[instanceId]
  if (!current || !instancesEqual(current, expected)) {
    return { ok: false, state: normalized, code: 'stale_transition' }
  }
  if (
    !isRecord(next) ||
    !hasOnlyKeys(next, [
      'instanceId',
      'definitionId',
      'location',
      'condition',
      'payload',
      'fabricationOrigin',
    ])
  ) {
    return { ok: false, state: normalized, code: 'invalid_instance_shape' }
  }
  if (next.instanceId !== instanceId || next.definitionId !== current.definitionId) {
    return { ok: false, state: normalized, code: 'immutable_identity' }
  }
  if (!fabricationOriginsEqual(current.fabricationOrigin, next.fabricationOrigin)) {
    return { ok: false, state: normalized, code: 'immutable_identity' }
  }
  if (next.condition !== 'operational' && next.condition !== 'damaged') {
    return { ok: false, state: normalized, code: 'invalid_condition' }
  }
  if (next.payload !== undefined && !isValidPayload(next.payload)) {
    return { ok: false, state: normalized, code: 'malformed_payload_bounds' }
  }
  if (
    current.definitionId === COMBAT_STIM_DEFINITION_ID &&
    !payloadsEqual(current.payload, next.payload)
  ) {
    return { ok: false, state: normalized, code: 'unauthorized_payload_transition' }
  }
  const locationFailure = validateTargetLocation(
    normalized,
    current.definitionId,
    next.location,
    instanceId
  )
  if (locationFailure) return { ok: false, state: normalized, code: locationFailure }
  if (
    current.location.state === 'equipped' &&
    !isIdleAgent(normalized.agents[current.location.agentId])
  ) {
    return { ok: false, state: normalized, code: 'agent_not_idle' }
  }

  const agents = { ...normalized.agents }
  if (current.location.state === 'equipped') {
    agents[current.location.agentId] = withProjectedSlot(
      agents[current.location.agentId],
      current.location.slot
    )
  }
  if (next.location.state === 'equipped') {
    agents[next.location.agentId] = withProjectedSlot(
      agents[next.location.agentId],
      next.location.slot,
      next.definitionId
    )
  }
  const persisted: EquipmentInstance = {
    instanceId,
    definitionId: current.definitionId,
    location: { ...next.location },
    condition: next.condition,
    ...(next.payload ? { payload: { ...next.payload } } : {}),
    ...(current.fabricationOrigin ? { fabricationOrigin: { ...current.fabricationOrigin } } : {}),
  }
  const nextState = normalizeGameState({
    ...normalized,
    agents,
    equipmentInstances: { ...(normalized.equipmentInstances ?? {}), [instanceId]: persisted },
  })
  return { ok: true, state: nextState, instance: createEquipmentInstanceSnapshot(persisted) }
}

export function relocateEquipmentInstance(
  state: GameState,
  instanceId: EquipmentInstanceId,
  location: EquipmentInstanceLocation
): EquipmentInstanceMutationResult {
  const current = getEquipmentInstance(state, instanceId)
  if (!current) {
    return {
      ok: false,
      state: ensureNormalizedGameState(state),
      code: isSafeEquipmentInstanceId(instanceId) ? 'stale_transition' : 'invalid_instance_id',
    }
  }
  return applyEquipmentInstanceTransition(state, instanceId, current, { ...current, location })
}

export function sanitizeEquipmentInstanceRegistry(
  raw: unknown,
  agents: GameState['agents'],
  excludedInstanceIds: ReadonlySet<string> = new Set(),
  fabricatedEquipmentLots: GameState['fabricatedEquipmentLots'] = undefined
): {
  equipmentInstances: EquipmentInstanceRegistry
  agents: GameState['agents']
  issues: Array<{ instanceId: string; code: EquipmentInstanceFailureCode }>
} {
  const equipmentInstances: EquipmentInstanceRegistry = {}
  const issues: Array<{ instanceId: string; code: EquipmentInstanceFailureCode }> = []
  const reconciledAgents = Object.fromEntries(
    Object.entries(agents).map(([agentId, agent]) => [agentId, { ...agent }])
  )
  if (!isRecord(raw)) return { equipmentInstances, agents: reconciledAgents, issues }

  const claimedSlots = new Set<string>()
  for (const instanceId of Object.keys(raw).sort()) {
    const validation = validateInstance(
      raw[instanceId],
      instanceId,
      reconciledAgents,
      fabricatedEquipmentLots
    )
    if (!validation.valid) {
      issues.push({ instanceId, code: validation.code })
      continue
    }
    const instance = validation.instance
    if (excludedInstanceIds.has(instanceId)) {
      if (instance.location.state === 'equipped') {
        const claimKey = `${instance.location.agentId}:${instance.location.slot}`
        if (!claimedSlots.has(claimKey)) {
          reconciledAgents[instance.location.agentId] = withProjectedSlot(
            reconciledAgents[instance.location.agentId],
            instance.location.slot
          )
        }
      }
      continue
    }
    if (instance.location.state === 'equipped') {
      const claimKey = `${instance.location.agentId}:${instance.location.slot}`
      if (claimedSlots.has(claimKey)) {
        issues.push({ instanceId, code: 'duplicate_claim' })
        instance.location = { state: 'stored' }
      } else {
        claimedSlots.add(claimKey)
        reconciledAgents[instance.location.agentId] = withProjectedSlot(
          reconciledAgents[instance.location.agentId],
          instance.location.slot,
          instance.definitionId
        )
      }
    }
    equipmentInstances[instanceId] = instance
  }

  return { equipmentInstances, agents: reconciledAgents, issues }
}
