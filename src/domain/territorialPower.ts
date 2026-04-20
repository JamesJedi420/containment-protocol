export interface TerritorialNodeState {
  id: string
  yield: number
  suppressed: boolean
  controller: string | null
}

export interface TerritorialConduitState {
  from: string
  to: string
  status: 'open' | 'blocked'
  capacity: number
}

export interface TerritorialCastingEligibilityState {
  scopeId: string
  scopeType: 'node' | 'region'
  eligible: boolean
}

export type TerritorialExpenditureResult = 'spent' | 'blocked' | 'suppressed' | 'ineligible'

export interface TerritorialExpenditureOutcome {
  scopeId: string
  scopeType: TerritorialCastingEligibilityState['scopeType']
  nodeId?: string
  result: TerritorialExpenditureResult
  amount: number
  availableYield: number
  conduitCapacity: number
}

export interface TerritorialPowerState {
  nodes: TerritorialNodeState[]
  conduits: TerritorialConduitState[]
  castingEligibility: TerritorialCastingEligibilityState[]
  lastExpenditure?: TerritorialExpenditureOutcome
}

export interface TerritorialPowerSummary {
  nodeCount: number
  totalYield: number
  availableYield: number
  suppressedNodeCount: number
  openConduitCount: number
  blockedConduitCount: number
  openConduitCapacity: number
  eligibleScopeCount: number
  controllers: string[]
  lastExpenditure?: TerritorialExpenditureOutcome
}

export interface TerritorialPowerNodeSnapshot {
  id: string
  yield: number
  effectiveYield: number
  suppressed: boolean
  controller: string | null
  eligible: boolean
}

export interface TerritorialPowerReportSnapshot extends TerritorialPowerSummary {
  nodes: TerritorialPowerNodeSnapshot[]
  conduits: TerritorialConduitState[]
  castingEligibility: TerritorialCastingEligibilityState[]
}

const EMPTY_TERRITORIAL_POWER_SUMMARY: TerritorialPowerSummary = {
  nodeCount: 0,
  totalYield: 0,
  availableYield: 0,
  suppressedNodeCount: 0,
  openConduitCount: 0,
  blockedConduitCount: 0,
  openConduitCapacity: 0,
  eligibleScopeCount: 0,
  controllers: [],
}

function normalizeNode(node: TerritorialNodeState): TerritorialNodeState {
  return {
    id: node.id,
    yield: Math.max(0, Math.trunc(node.yield)),
    suppressed: Boolean(node.suppressed),
    controller: node.controller ?? null,
  }
}

function normalizeConduit(conduit: TerritorialConduitState): TerritorialConduitState {
  return {
    from: conduit.from,
    to: conduit.to,
    status: conduit.status === 'blocked' ? 'blocked' : 'open',
    capacity: Math.max(0, Math.trunc(conduit.capacity)),
  }
}

function normalizeCastingEligibility(
  entry: TerritorialCastingEligibilityState
): TerritorialCastingEligibilityState {
  return {
    scopeId: entry.scopeId,
    scopeType: entry.scopeType === 'region' ? 'region' : 'node',
    eligible: Boolean(entry.eligible),
  }
}

function sortNodes(nodes: TerritorialNodeState[]) {
  return [...nodes].sort((left, right) => left.id.localeCompare(right.id))
}

function sortConduits(conduits: TerritorialConduitState[]) {
  return [...conduits].sort((left, right) => {
    return (
      left.from.localeCompare(right.from) ||
      left.to.localeCompare(right.to) ||
      left.status.localeCompare(right.status) ||
      left.capacity - right.capacity
    )
  })
}

function sortEligibility(entries: TerritorialCastingEligibilityState[]) {
  return [...entries].sort((left, right) => {
    return (
      left.scopeType.localeCompare(right.scopeType) || left.scopeId.localeCompare(right.scopeId)
    )
  })
}

function getTerritorialOpenConduitCapacity(
  conduits: TerritorialConduitState[],
  nodeId: string
) {
  return conduits
    .filter((conduit) => conduit.from === nodeId && conduit.status === 'open')
    .reduce((sum, conduit) => sum + conduit.capacity, 0)
}

function buildTerritorialExpenditureOutcome(
  nodes: TerritorialNodeState[],
  conduits: TerritorialConduitState[],
  castingEligibility: TerritorialCastingEligibilityState[]
): TerritorialExpenditureOutcome {
  const eligibleScopes = castingEligibility.filter((entry) => entry.eligible)
  const selectedScope =
    eligibleScopes.find((entry) => entry.scopeType === 'node') ?? eligibleScopes[0] ?? null

  if (!selectedScope) {
    return {
      scopeId: 'none',
      scopeType: 'node',
      result: 'ineligible',
      amount: 0,
      availableYield: 0,
      conduitCapacity: 0,
    }
  }

  const node = selectedScope.scopeType === 'node'
    ? nodes.find((entry) => entry.id === selectedScope.scopeId)
    : undefined

  if (!node) {
    return {
      scopeId: selectedScope.scopeId,
      scopeType: selectedScope.scopeType,
      result: 'ineligible',
      amount: 0,
      availableYield: 0,
      conduitCapacity: 0,
    }
  }

  const availableYield = getTerritorialNodeYield(node)
  const conduitCapacity = getTerritorialOpenConduitCapacity(conduits, node.id)

  if (node.suppressed) {
    return {
      scopeId: selectedScope.scopeId,
      scopeType: selectedScope.scopeType,
      nodeId: node.id,
      result: 'suppressed',
      amount: 0,
      availableYield,
      conduitCapacity,
    }
  }

  if (availableYield <= 0 || conduitCapacity <= 0) {
    return {
      scopeId: selectedScope.scopeId,
      scopeType: selectedScope.scopeType,
      nodeId: node.id,
      result: 'blocked',
      amount: 0,
      availableYield,
      conduitCapacity,
    }
  }

  return {
    scopeId: selectedScope.scopeId,
    scopeType: selectedScope.scopeType,
    nodeId: node.id,
    result: 'spent',
    amount: Math.min(availableYield, conduitCapacity),
    availableYield,
    conduitCapacity,
  }
}

export function getTerritorialNodeYield(node: TerritorialNodeState) {
  return node.suppressed ? 0 : Math.max(0, Math.trunc(node.yield))
}

export function isTerritorialCastingEligible(
  state: TerritorialPowerState | undefined,
  scopeId: string,
  scopeType: TerritorialCastingEligibilityState['scopeType'] = 'node'
) {
  if (!state) {
    return false
  }

  return state.castingEligibility.some(
    (entry) => entry.scopeId === scopeId && entry.scopeType === scopeType && entry.eligible
  )
}

export function getTerritorialConduitDraw(
  state: TerritorialPowerState | undefined,
  nodeId: string
) {
  if (!state) {
    return 0
  }

  const node = state.nodes.find((entry) => entry.id === nodeId)

  if (!node) {
    return 0
  }

  return Math.min(
    getTerritorialNodeYield(node),
    getTerritorialOpenConduitCapacity(state.conduits, nodeId)
  )
}

export function advanceTerritorialPowerState(
  state: TerritorialPowerState | undefined
): TerritorialPowerState | undefined {
  if (!state) {
    return undefined
  }

  const nodes = sortNodes(state.nodes.map(normalizeNode))
  const conduits = sortConduits(state.conduits.map(normalizeConduit))
  const castingEligibility = sortEligibility(
    state.castingEligibility.map(normalizeCastingEligibility)
  )

  return {
    nodes,
    conduits,
    castingEligibility,
    lastExpenditure: buildTerritorialExpenditureOutcome(nodes, conduits, castingEligibility),
  }
}

export function buildTerritorialPowerSummary(
  state: TerritorialPowerState | undefined
): TerritorialPowerSummary {
  if (!state) {
    return EMPTY_TERRITORIAL_POWER_SUMMARY
  }

  const totalYield = state.nodes.reduce((sum, node) => sum + Math.max(0, node.yield), 0)
  const availableYield = state.nodes.reduce((sum, node) => sum + getTerritorialNodeYield(node), 0)
  const openConduitCount = state.conduits.filter((conduit) => conduit.status === 'open').length
  const blockedConduitCount = state.conduits.length - openConduitCount
  const openConduitCapacity = state.conduits
    .filter((conduit) => conduit.status === 'open')
    .reduce((sum, conduit) => sum + conduit.capacity, 0)
  const controllers = [...new Set(
    state.nodes
      .map((node) => node.controller)
      .filter((controller): controller is string => Boolean(controller))
  )].sort((left, right) => left.localeCompare(right))

  return {
    nodeCount: state.nodes.length,
    totalYield,
    availableYield,
    suppressedNodeCount: state.nodes.filter((node) => node.suppressed).length,
    openConduitCount,
    blockedConduitCount,
    openConduitCapacity,
    eligibleScopeCount: state.castingEligibility.filter((entry) => entry.eligible).length,
    controllers,
    ...(state.lastExpenditure ? { lastExpenditure: state.lastExpenditure } : {}),
  }
}

export function buildTerritorialPowerReportSnapshot(
  state: TerritorialPowerState | undefined
): TerritorialPowerReportSnapshot | undefined {
  if (!state) {
    return undefined
  }

  const summary = buildTerritorialPowerSummary(state)

  return {
    ...summary,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      yield: node.yield,
      effectiveYield: getTerritorialNodeYield(node),
      suppressed: node.suppressed,
      controller: node.controller,
      eligible: isTerritorialCastingEligible(state, node.id, 'node'),
    })),
    conduits: state.conduits.map((conduit) => ({ ...conduit })),
    castingEligibility: state.castingEligibility.map((entry) => ({ ...entry })),
  }
}

export function describeTerritorialExpenditureOutcome(
  outcome: TerritorialExpenditureOutcome | undefined
) {
  if (!outcome) {
    return 'no expenditure recorded'
  }

  if (outcome.result === 'spent') {
    return `spent ${outcome.amount} from ${outcome.nodeId ?? outcome.scopeId}`
  }

  if (outcome.result === 'blocked') {
    return `draw from ${outcome.nodeId ?? outcome.scopeId} was blocked`
  }

  if (outcome.result === 'suppressed') {
    return `${outcome.nodeId ?? outcome.scopeId} remained suppressed`
  }

  return outcome.scopeId === 'none'
    ? 'no eligible casting scope was available'
    : `${outcome.scopeId} was not eligible for expenditure`
}

export function formatTerritorialPowerRollup(
  summary: TerritorialPowerSummary | TerritorialPowerReportSnapshot | undefined
) {
  if (!summary || summary.nodeCount === 0) {
    return 'No territorial nodes are under protocol control.'
  }

  return (
    `Nodes ${summary.nodeCount} / yield ${summary.availableYield} / ` +
    `conduits ${summary.openConduitCount} open / casting ${summary.eligibleScopeCount} eligible / ` +
    `${describeTerritorialExpenditureOutcome(summary.lastExpenditure)}.`
  )
}

export function formatTerritorialPowerSummaryLines(
  summary: TerritorialPowerSummary | TerritorialPowerReportSnapshot
) {
  if (summary.nodeCount === 0) {
    return [formatTerritorialPowerRollup(summary)]
  }

  const lines = [
    `Nodes: ${summary.nodeCount} / available yield ${summary.availableYield} / suppressed ${summary.suppressedNodeCount}`,
    `Conduits: ${summary.openConduitCount} open / ${summary.blockedConduitCount} blocked / open capacity ${summary.openConduitCapacity}`,
    `Casting: ${summary.eligibleScopeCount} eligible / last expenditure ${describeTerritorialExpenditureOutcome(summary.lastExpenditure)}`,
  ]

  if (summary.controllers.length > 0) {
    lines.push(`Controllers: ${summary.controllers.join(', ')}`)
  }

  return lines
}
