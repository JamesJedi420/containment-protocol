import { getEquipmentSlotItemId } from './equipment'
import {
  readGameStateManager,
  setEncounterRuntimeState,
  setInventoryQuantity,
} from './gameStateManager'
import type { CaseInstance, GameState, Id } from './models'

export type PreparedSupportProcedureFamily = 'medical' | 'containment'
export type PreparedSupportProcedureStatus = 'prepared' | 'expended' | 'unavailable'
export type PreparedSupportProcedureOutcome =
  | 'supported'
  | 'mismatch'
  | 'unavailable'
  | 'already-expended'
export type PreparedSupportProcedureRefreshReason =
  | 'refreshed'
  | 'unavailable'
  | 'not-expended'
  | 'no-reserve-stock'

export interface PreparedSupportProcedureState {
  encounterId: string
  agentId: Id
  slot: 'utility1'
  itemId?: string
  family?: PreparedSupportProcedureFamily
  status: PreparedSupportProcedureStatus
  reserveStock: number
  reasons: string[]
}

export interface ApplyPreparedSupportProcedureResult {
  state: GameState
  applied: boolean
  outcome: PreparedSupportProcedureOutcome
  supportState: PreparedSupportProcedureState
}

export interface RefreshPreparedSupportProcedureResult {
  state: GameState
  refreshed: boolean
  reason: PreparedSupportProcedureRefreshReason
  supportState: PreparedSupportProcedureState
}

export type WardSealAnchorApplyOutcome = 'success' | 'failure' | 'mismatch' | 'already-applied'

export interface ApplyWardSealsToAnchorResult {
  state: GameState
  applied: boolean
  outcome: WardSealAnchorApplyOutcome
  supportState: PreparedSupportProcedureState
}

export type SignalJammerStatus = 'functional' | 'jammed' | 'unavailable'
export type SignalJammerJamOutcome = 'jammed' | 'already-jammed' | 'unavailable'
export type SignalJammerRepairReason =
  | 'repaired'
  | 'not-jammed'
  | 'missing-capability'
  | 'missing-repair-support-item'
  | 'unavailable'

export interface SignalJammerState {
  encounterId: string
  agentId: Id
  slot: 'utility1'
  itemId?: string
  status: SignalJammerStatus
  reasons: string[]
}

export interface JamSignalJammerResult {
  state: GameState
  transitioned: boolean
  outcome: SignalJammerJamOutcome
  jammerState: SignalJammerState
}

export interface RepairSignalJammerResult {
  state: GameState
  repaired: boolean
  reason: SignalJammerRepairReason
  jammerState: SignalJammerState
}

const PREPARED_SUPPORT_SLOT = 'utility1' as const
const SIGNAL_JAMMER_REPAIR_SUPPORT_SLOT = 'utility2' as const
const SIGNAL_JAMMER_REPAIR_CAPABLE_ROLES = new Set(['tech', 'investigator', 'field_recon'])
const SIGNAL_JAMMER_REPAIR_SUPPORT_ITEMS = new Set(['emf_sensors'])
const SIGNAL_JAMMER_ITEM_ID = 'signal_jammers'
const SEALED_KEYED_ANCHOR_TARGET_TAGS = new Set([
  'encounter-anchor:sealed-keyed',
  'encounter-anchor:sealed',
  'encounter-anchor:keyed',
  'anchor:sealed',
  'anchor:keyed',
])

const PREPARED_SUPPORT_PROCEDURE_ITEMS = {
  medkits: {
    family: 'medical',
    helpfulTags: ['medical', 'triage', 'biological', 'hazmat', 'plague', 'support'],
  },
  ward_seals: {
    family: 'containment',
    helpfulTags: ['occult', 'containment', 'ritual', 'anomaly', 'seal', 'haunt', 'spirit'],
  },
} as const satisfies Record<
  string,
  {
    family: PreparedSupportProcedureFamily
    helpfulTags: readonly string[]
  }
>

function getPreparedSupportProcedureDefinition(itemId: string | undefined) {
  return itemId ? PREPARED_SUPPORT_PROCEDURE_ITEMS[itemId] : undefined
}

function getEncounterFlags(state: GameState, encounterId: string) {
  return {
    ...(readGameStateManager(state).encounterState[encounterId]?.flags ?? {}),
  }
}

function getReserveStock(state: GameState, itemId: string | undefined) {
  if (!itemId) {
    return 0
  }

  return Math.max(0, Math.trunc(state.inventory[itemId] ?? 0))
}

function getEncounterSupportTags(caseData: Pick<
  CaseInstance,
  'tags' | 'requiredTags' | 'preferredTags'
> | undefined) {
  return new Set([
    ...(caseData?.tags ?? []),
    ...(caseData?.requiredTags ?? []),
    ...(caseData?.preferredTags ?? []),
  ])
}

function isPreparedSupportProcedureHelpful(
  state: GameState,
  encounterId: string,
  family: PreparedSupportProcedureFamily
) {
  const caseData = state.cases[encounterId]
  const encounterTags = getEncounterSupportTags(caseData)
  const helpfulTags = Object.values(PREPARED_SUPPORT_PROCEDURE_ITEMS).find(
    (definition) => definition.family === family
  )?.helpfulTags

  if (!helpfulTags || helpfulTags.length === 0) {
    return false
  }

  return helpfulTags.some((tag) => encounterTags.has(tag))
}

export function buildPreparedSupportProcedureExpendedFlagKey(
  agentId: Id,
  family: PreparedSupportProcedureFamily
) {
  return `supportProcedure.expended.${agentId}.${family}`
}

export function buildPreparedSupportProcedureMismatchFlagKey(
  agentId: Id,
  family: PreparedSupportProcedureFamily
) {
  return `supportProcedure.mismatch.${agentId}.${family}`
}

export function buildPreparedSupportProcedureAppliedFlagKey(
  agentId: Id,
  family: PreparedSupportProcedureFamily
) {
  return `supportProcedure.applied.${agentId}.${family}`
}

export function buildPreparedSupportProcedureRefreshedFlagKey(
  agentId: Id,
  family: PreparedSupportProcedureFamily
) {
  return `supportProcedure.refreshed.${agentId}.${family}`
}

export function buildWardSealAnchorSuccessFlagKey(agentId: Id) {
  return `supportLoadout.wardSeals.anchor.success.${agentId}`
}

export function buildWardSealAnchorFailureFlagKey(agentId: Id) {
  return `supportLoadout.wardSeals.anchor.failure.${agentId}`
}

export function buildWardSealAnchorMismatchFlagKey(agentId: Id) {
  return `supportLoadout.wardSeals.anchor.mismatch.${agentId}`
}

export function buildSignalJammerJammedFlagKey(agentId: Id) {
  return `supportLoadout.signalJammer.jammed.${agentId}`
}

export function buildSignalJammerRepairedFlagKey(agentId: Id) {
  return `supportLoadout.signalJammer.repaired.${agentId}`
}

function isSealedKeyedEncounterAnchorTarget(state: GameState, encounterId: string) {
  const caseData = state.cases[encounterId]
  if (!caseData) {
    return false
  }

  const tags = getEncounterSupportTags(caseData)
  for (const tag of SEALED_KEYED_ANCHOR_TARGET_TAGS) {
    if (tags.has(tag)) {
      return true
    }
  }

  return false
}

function canAgentRepairSignalJammer(state: GameState, agentId: Id) {
  const agent = state.agents[agentId]

  if (!agent) {
    return false
  }

  if (SIGNAL_JAMMER_REPAIR_CAPABLE_ROLES.has(agent.role)) {
    return true
  }

  const tags = new Set(agent.tags ?? [])
  return tags.has('tech') || tags.has('investigator') || tags.has('signal')
}

function hasSignalJammerRepairSupportItem(state: GameState, agentId: Id) {
  const agent = state.agents[agentId]
  if (!agent) {
    return false
  }

  const repairItemId = getEquipmentSlotItemId(agent.equipmentSlots, SIGNAL_JAMMER_REPAIR_SUPPORT_SLOT)
  return Boolean(repairItemId && SIGNAL_JAMMER_REPAIR_SUPPORT_ITEMS.has(repairItemId))
}

export function getSignalJammerState(
  state: GameState,
  encounterId: string,
  agentId: Id
): SignalJammerState {
  const agent = state.agents[agentId]

  if (!agent) {
    return {
      encounterId,
      agentId,
      slot: PREPARED_SUPPORT_SLOT,
      status: 'unavailable',
      reasons: ['missing-agent'],
    }
  }

  const itemId = getEquipmentSlotItemId(agent.equipmentSlots, PREPARED_SUPPORT_SLOT)

  if (!itemId) {
    return {
      encounterId,
      agentId,
      slot: PREPARED_SUPPORT_SLOT,
      status: 'unavailable',
      reasons: ['no-signal-jammer-loadout'],
    }
  }

  if (itemId !== SIGNAL_JAMMER_ITEM_ID) {
    return {
      encounterId,
      agentId,
      slot: PREPARED_SUPPORT_SLOT,
      itemId,
      status: 'unavailable',
      reasons: ['unsupported-signal-jammer-item'],
    }
  }

  const encounterFlags = getEncounterFlags(state, encounterId)
  const jammed = encounterFlags[buildSignalJammerJammedFlagKey(agentId)] === true

  return {
    encounterId,
    agentId,
    slot: PREPARED_SUPPORT_SLOT,
    itemId,
    status: jammed ? 'jammed' : 'functional',
    reasons: jammed ? ['signal-jammer-jammed'] : ['signal-jammer-functional'],
  }
}

export function jamSignalJammer(
  state: GameState,
  encounterId: string,
  agentId: Id
): JamSignalJammerResult {
  const jammerState = getSignalJammerState(state, encounterId, agentId)

  if (jammerState.status === 'unavailable') {
    return {
      state,
      transitioned: false,
      outcome: 'unavailable',
      jammerState,
    }
  }

  if (jammerState.status === 'jammed') {
    return {
      state,
      transitioned: false,
      outcome: 'already-jammed',
      jammerState,
    }
  }

  const encounterFlags = getEncounterFlags(state, encounterId)
  encounterFlags[buildSignalJammerJammedFlagKey(agentId)] = true
  encounterFlags[buildSignalJammerRepairedFlagKey(agentId)] = false

  const nextState = setEncounterRuntimeState(state, encounterId, {
    phase: 'support-loadout:signal-jammers:jammed',
    flags: encounterFlags,
    lastUpdatedWeek: state.week,
  })

  return {
    state: nextState,
    transitioned: true,
    outcome: 'jammed',
    jammerState: getSignalJammerState(nextState, encounterId, agentId),
  }
}

export function repairSignalJammer(
  state: GameState,
  encounterId: string,
  agentId: Id
): RepairSignalJammerResult {
  const jammerState = getSignalJammerState(state, encounterId, agentId)

  if (jammerState.status === 'unavailable') {
    return {
      state,
      repaired: false,
      reason: 'unavailable',
      jammerState,
    }
  }

  if (jammerState.status !== 'jammed') {
    return {
      state,
      repaired: false,
      reason: 'not-jammed',
      jammerState,
    }
  }

  if (!canAgentRepairSignalJammer(state, agentId)) {
    return {
      state,
      repaired: false,
      reason: 'missing-capability',
      jammerState,
    }
  }

  if (!hasSignalJammerRepairSupportItem(state, agentId)) {
    return {
      state,
      repaired: false,
      reason: 'missing-repair-support-item',
      jammerState,
    }
  }

  const encounterFlags = getEncounterFlags(state, encounterId)
  encounterFlags[buildSignalJammerJammedFlagKey(agentId)] = false
  encounterFlags[buildSignalJammerRepairedFlagKey(agentId)] = true

  const nextState = setEncounterRuntimeState(state, encounterId, {
    phase: 'support-loadout:signal-jammers:repaired',
    flags: encounterFlags,
    lastUpdatedWeek: state.week,
  })

  return {
    state: nextState,
    repaired: true,
    reason: 'repaired',
    jammerState: getSignalJammerState(nextState, encounterId, agentId),
  }
}

export function applyWardSealsToSealedAnchor(
  state: GameState,
  encounterId: string,
  agentId: Id
): ApplyWardSealsToAnchorResult {
  const supportState = getPreparedSupportProcedureState(state, encounterId, agentId)
  const encounterFlags = getEncounterFlags(state, encounterId)

  const successFlagKey = buildWardSealAnchorSuccessFlagKey(agentId)
  const failureFlagKey = buildWardSealAnchorFailureFlagKey(agentId)
  const mismatchFlagKey = buildWardSealAnchorMismatchFlagKey(agentId)

  if (encounterFlags[successFlagKey] === true) {
    return {
      state,
      applied: false,
      outcome: 'already-applied',
      supportState,
    }
  }

  encounterFlags[successFlagKey] = false
  encounterFlags[failureFlagKey] = false
  encounterFlags[mismatchFlagKey] = false

  if (supportState.status === 'unavailable' || supportState.family !== 'containment') {
    encounterFlags[failureFlagKey] = true
    const nextState = setEncounterRuntimeState(state, encounterId, {
      phase: 'support-loadout:ward-seals:anchor:failure',
      flags: encounterFlags,
      lastUpdatedWeek: state.week,
    })

    return {
      state: nextState,
      applied: false,
      outcome: 'failure',
      supportState: getPreparedSupportProcedureState(nextState, encounterId, agentId),
    }
  }

  if (!isSealedKeyedEncounterAnchorTarget(state, encounterId)) {
    encounterFlags[mismatchFlagKey] = true
    encounterFlags[buildPreparedSupportProcedureExpendedFlagKey(agentId, 'containment')] = true

    const nextState = setEncounterRuntimeState(state, encounterId, {
      phase: 'support-loadout:ward-seals:anchor:mismatch',
      flags: encounterFlags,
      lastUpdatedWeek: state.week,
    })

    return {
      state: nextState,
      applied: false,
      outcome: 'mismatch',
      supportState: getPreparedSupportProcedureState(nextState, encounterId, agentId),
    }
  }

  encounterFlags[successFlagKey] = true
  encounterFlags[buildPreparedSupportProcedureAppliedFlagKey(agentId, 'containment')] = true
  encounterFlags[buildPreparedSupportProcedureMismatchFlagKey(agentId, 'containment')] = false
  encounterFlags[buildPreparedSupportProcedureExpendedFlagKey(agentId, 'containment')] = true

  const nextState = setEncounterRuntimeState(state, encounterId, {
    phase: 'support-loadout:ward-seals:anchor:success',
    flags: encounterFlags,
    lastUpdatedWeek: state.week,
  })

  return {
    state: nextState,
    applied: true,
    outcome: 'success',
    supportState: getPreparedSupportProcedureState(nextState, encounterId, agentId),
  }
}

export function getPreparedSupportProcedureState(
  state: GameState,
  encounterId: string,
  agentId: Id
): PreparedSupportProcedureState {
  const agent = state.agents[agentId]

  if (!agent) {
    return {
      encounterId,
      agentId,
      slot: PREPARED_SUPPORT_SLOT,
      status: 'unavailable',
      reserveStock: 0,
      reasons: ['missing-agent'],
    }
  }

  const itemId = getEquipmentSlotItemId(agent.equipmentSlots, PREPARED_SUPPORT_SLOT)
  const definition = getPreparedSupportProcedureDefinition(itemId)

  if (!itemId) {
    return {
      encounterId,
      agentId,
      slot: PREPARED_SUPPORT_SLOT,
      status: 'unavailable',
      reserveStock: 0,
      reasons: ['no-prepared-support-loadout'],
    }
  }

  if (!definition) {
    return {
      encounterId,
      agentId,
      slot: PREPARED_SUPPORT_SLOT,
      itemId,
      status: 'unavailable',
      reserveStock: getReserveStock(state, itemId),
      reasons: ['unsupported-prepared-support-item'],
    }
  }

  const encounterFlags = getEncounterFlags(state, encounterId)
  const expended =
    encounterFlags[buildPreparedSupportProcedureExpendedFlagKey(agentId, definition.family)] === true

  return {
    encounterId,
    agentId,
    slot: PREPARED_SUPPORT_SLOT,
    itemId,
    family: definition.family,
    status: expended ? 'expended' : 'prepared',
    reserveStock: getReserveStock(state, itemId),
    reasons: expended ? ['expended-in-encounter'] : ['prepared-in-encounter'],
  }
}

export function applyPreparedSupportProcedure(
  state: GameState,
  encounterId: string,
  agentId: Id
): ApplyPreparedSupportProcedureResult {
  const supportState = getPreparedSupportProcedureState(state, encounterId, agentId)

  if (supportState.status === 'unavailable') {
    return {
      state,
      applied: false,
      outcome: 'unavailable',
      supportState,
    }
  }

  if (supportState.status === 'expended' || !supportState.family) {
    return {
      state,
      applied: false,
      outcome: 'already-expended',
      supportState,
    }
  }

  const encounterFlags = getEncounterFlags(state, encounterId)
  const helpful = isPreparedSupportProcedureHelpful(state, encounterId, supportState.family)

  encounterFlags[buildPreparedSupportProcedureExpendedFlagKey(agentId, supportState.family)] = true
  encounterFlags[buildPreparedSupportProcedureAppliedFlagKey(agentId, supportState.family)] = helpful
  encounterFlags[buildPreparedSupportProcedureMismatchFlagKey(agentId, supportState.family)] = !helpful

  const nextState = setEncounterRuntimeState(state, encounterId, {
    phase: `support-procedure:${supportState.family}:${helpful ? 'supported' : 'mismatch'}`,
    flags: encounterFlags,
    lastUpdatedWeek: state.week,
  })

  return {
    state: nextState,
    applied: true,
    outcome: helpful ? 'supported' : 'mismatch',
    supportState: getPreparedSupportProcedureState(nextState, encounterId, agentId),
  }
}

export function refreshPreparedSupportProcedure(
  state: GameState,
  encounterId: string,
  agentId: Id
): RefreshPreparedSupportProcedureResult {
  const supportState = getPreparedSupportProcedureState(state, encounterId, agentId)

  if (supportState.status === 'unavailable' || !supportState.family || !supportState.itemId) {
    return {
      state,
      refreshed: false,
      reason: 'unavailable',
      supportState,
    }
  }

  if (supportState.status !== 'expended') {
    return {
      state,
      refreshed: false,
      reason: 'not-expended',
      supportState,
    }
  }

  if (supportState.reserveStock <= 0) {
    return {
      state,
      refreshed: false,
      reason: 'no-reserve-stock',
      supportState,
    }
  }

  const withReducedReserve = setInventoryQuantity(state, supportState.itemId, supportState.reserveStock - 1)
  const encounterFlags = getEncounterFlags(withReducedReserve, encounterId)

  encounterFlags[buildPreparedSupportProcedureExpendedFlagKey(agentId, supportState.family)] = false
  encounterFlags[buildPreparedSupportProcedureRefreshedFlagKey(agentId, supportState.family)] = true

  const nextState = setEncounterRuntimeState(withReducedReserve, encounterId, {
    phase: `support-procedure:${supportState.family}:refreshed`,
    flags: encounterFlags,
    lastUpdatedWeek: state.week,
  })

  return {
    state: nextState,
    refreshed: true,
    reason: 'refreshed',
    supportState: getPreparedSupportProcedureState(nextState, encounterId, agentId),
  }
}