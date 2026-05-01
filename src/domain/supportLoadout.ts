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

const PREPARED_SUPPORT_SLOT = 'utility1' as const

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