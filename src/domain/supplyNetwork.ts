import type { CaseInstance } from './models'

export type SupplyNodeType = 'command_center' | 'depot' | 'corridor'
export type SupplyNodeController = 'agency' | 'hostile' | 'contested'
export type SupplySourceType = 'command' | 'depot'
export type SupplyLinkMode = 'road'
export type SupplyLinkStatus = 'open' | 'blocked'
export type SupplyTransportClass = 'truck_column'
export type SupplyTransportStatus = 'ready' | 'disrupted'
export type SupplySupportState = 'supported' | 'unsupported'
export type SupplyBlockedReason =
  | 'no_source'
  | 'target_uncontrolled'
  | 'path_blocked'
  | 'no_transport'
  | 'transport_disrupted'

export interface SupplyNodeState {
  id: string
  label: string
  type: SupplyNodeType
  controller: SupplyNodeController
  active: boolean
  strategicValue: number
  regionTags: string[]
}

export interface SupplySourceState {
  id: string
  label: string
  type: SupplySourceType
  nodeId: string
  active: boolean
  throughput: number
}

export interface SupplyLinkState {
  id: string
  from: string
  to: string
  mode: SupplyLinkMode
  status: SupplyLinkStatus
  capacity: number
}

export interface SupplyTransportAssetState {
  id: string
  label: string
  class: SupplyTransportClass
  mode: SupplyLinkMode
  status: SupplyTransportStatus
  lift: number
  fragility: number
  routeNodeIds: string[]
}

export interface SupplyTraceState {
  regionTag: string
  state: SupplySupportState
  sourceId?: string
  sourceLabel?: string
  targetNodeId?: string
  targetNodeLabel?: string
  transportAssetId?: string
  transportAssetLabel?: string
  pathNodeIds: string[]
  pathLinkIds: string[]
  deliveredLift: number
  blockedReason?: SupplyBlockedReason
  explanation: string
}

export interface SupplyNetworkWeeklySummary {
  tracedRegionCount: number
  supportedRegionCount: number
  unsupportedRegionCount: number
  blockedRegions: string[]
  readyTransportCount: number
  disruptedTransportCount: number
  totalSourceThroughput: number
  deliveredLift: number
  strategicControlScore: number
  blockedDetails: string[]
}

export interface SupplyNetworkReportSnapshot extends SupplyNetworkWeeklySummary {
  traces: SupplyTraceState[]
  nodes: SupplyNodeState[]
  links: SupplyLinkState[]
  transportAssets: SupplyTransportAssetState[]
}

export interface SupplyNetworkState {
  nodes: SupplyNodeState[]
  sources: SupplySourceState[]
  links: SupplyLinkState[]
  transportAssets: SupplyTransportAssetState[]
  traces?: SupplyTraceState[]
  lastSummary?: SupplyNetworkWeeklySummary
}

const EMPTY_SUPPLY_SUMMARY: SupplyNetworkWeeklySummary = {
  tracedRegionCount: 0,
  supportedRegionCount: 0,
  unsupportedRegionCount: 0,
  blockedRegions: [],
  readyTransportCount: 0,
  disruptedTransportCount: 0,
  totalSourceThroughput: 0,
  deliveredLift: 0,
  strategicControlScore: 0,
  blockedDetails: [],
}

function sortById<T extends { id: string }>(entries: T[]) {
  return [...entries].sort((left, right) => left.id.localeCompare(right.id))
}

function normalizeRegionTags(regionTags: string[]) {
  return [...new Set(regionTags.filter((entry) => entry.length > 0))].sort((left, right) =>
    left.localeCompare(right)
  )
}

function normalizeNode(node: SupplyNodeState): SupplyNodeState {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    controller:
      node.controller === 'hostile' || node.controller === 'contested' ? node.controller : 'agency',
    active: Boolean(node.active),
    strategicValue: Math.max(0, Math.trunc(node.strategicValue)),
    regionTags: normalizeRegionTags(node.regionTags),
  }
}

function normalizeSource(source: SupplySourceState): SupplySourceState {
  return {
    id: source.id,
    label: source.label,
    type: source.type === 'depot' ? 'depot' : 'command',
    nodeId: source.nodeId,
    active: Boolean(source.active),
    throughput: Math.max(0, Math.trunc(source.throughput)),
  }
}

function normalizeLink(link: SupplyLinkState): SupplyLinkState {
  return {
    id: link.id,
    from: link.from,
    to: link.to,
    mode: 'road',
    status: link.status === 'blocked' ? 'blocked' : 'open',
    capacity: Math.max(0, Math.trunc(link.capacity)),
  }
}

function normalizeTransportAsset(asset: SupplyTransportAssetState): SupplyTransportAssetState {
  return {
    id: asset.id,
    label: asset.label,
    class: 'truck_column',
    mode: 'road',
    status: asset.status === 'disrupted' ? 'disrupted' : 'ready',
    lift: Math.max(0, Math.trunc(asset.lift)),
    fragility: Math.max(0, Math.trunc(asset.fragility)),
    routeNodeIds: normalizeRegionTags(asset.routeNodeIds),
  }
}

function getSupplyTargetRegions(state: SupplyNetworkState, cases: readonly CaseInstance[]) {
  const caseRegions = cases
    .map((currentCase) => currentCase.regionTag)
    .filter((regionTag): regionTag is string => typeof regionTag === 'string' && regionTag.length > 0)
  const nodeRegions = state.nodes.flatMap((node) => node.regionTags)

  return normalizeRegionTags([...caseRegions, ...nodeRegions])
}

function findTargetNode(state: SupplyNetworkState, regionTag: string) {
  return [...state.nodes]
    .filter((node) => node.regionTags.includes(regionTag))
    .sort((left, right) => {
      return (
        Number(right.controller === 'agency') - Number(left.controller === 'agency') ||
        Number(right.active) - Number(left.active) ||
        right.strategicValue - left.strategicValue ||
        left.id.localeCompare(right.id)
      )
    })[0]
}

function buildAdjacency(state: SupplyNetworkState) {
  const adjacency = new Map<string, Array<{ nodeId: string; link: SupplyLinkState }>>()

  for (const link of state.links) {
    if (!adjacency.has(link.from)) {
      adjacency.set(link.from, [])
    }
    if (!adjacency.has(link.to)) {
      adjacency.set(link.to, [])
    }

    adjacency.get(link.from)?.push({ nodeId: link.to, link })
    adjacency.get(link.to)?.push({ nodeId: link.from, link })
  }

  return adjacency
}

function findPath(
  state: SupplyNetworkState,
  sourceNodeId: string,
  targetNodeId: string
): { nodeIds: string[]; linkIds: string[]; pathCapacity: number } | null {
  if (sourceNodeId === targetNodeId) {
    return {
      nodeIds: [sourceNodeId],
      linkIds: [],
      pathCapacity: Number.POSITIVE_INFINITY,
    }
  }

  const nodeById = new Map(state.nodes.map((node) => [node.id, node]))
  const linkById = new Map(state.links.map((link) => [link.id, link]))
  const adjacency = buildAdjacency(state)
  const queue: string[] = [sourceNodeId]
  const visited = new Set<string>([sourceNodeId])
  const previous = new Map<string, { nodeId: string; linkId: string }>()

  while (queue.length > 0) {
    const nodeId = queue.shift()

    if (!nodeId) {
      continue
    }

    const neighbors = adjacency.get(nodeId) ?? []

    for (const neighbor of neighbors) {
      const neighborNode = nodeById.get(neighbor.nodeId)

      if (
        !neighborNode ||
        visited.has(neighbor.nodeId) ||
        neighbor.link.status !== 'open' ||
        !neighborNode.active ||
        neighborNode.controller !== 'agency'
      ) {
        continue
      }

      previous.set(neighbor.nodeId, { nodeId, linkId: neighbor.link.id })

      if (neighbor.nodeId === targetNodeId) {
        const nodeIds = [targetNodeId]
        const linkIds: string[] = []
        let cursor = targetNodeId

        while (cursor !== sourceNodeId) {
          const step = previous.get(cursor)

          if (!step) {
            return null
          }

          linkIds.unshift(step.linkId)
          nodeIds.unshift(step.nodeId)
          cursor = step.nodeId
        }

        const pathCapacity = linkIds.reduce((minCapacity, linkId) => {
          const link = linkById.get(linkId)
          return Math.min(minCapacity, link?.capacity ?? 0)
        }, Number.POSITIVE_INFINITY)

        return {
          nodeIds,
          linkIds,
          pathCapacity,
        }
      }

      visited.add(neighbor.nodeId)
      queue.push(neighbor.nodeId)
    }
  }

  return null
}

function findTransportAsset(
  state: SupplyNetworkState,
  pathNodeIds: string[],
  mode: SupplyLinkMode
) {
  return [...state.transportAssets]
    .filter((asset) => asset.mode === mode)
    .sort((left, right) => {
      return (
        Number(left.status === 'ready') - Number(right.status === 'ready') ||
        right.lift - left.lift ||
        left.id.localeCompare(right.id)
      )
    })
    .reverse()
    .find((asset) => pathNodeIds.every((nodeId) => asset.routeNodeIds.includes(nodeId)))
}

function createUnsupportedTrace(
  regionTag: string,
  targetNode: SupplyNodeState | undefined,
  blockedReason: SupplyBlockedReason,
  explanation: string
): SupplyTraceState {
  return {
    regionTag,
    state: 'unsupported',
    targetNodeId: targetNode?.id,
    targetNodeLabel: targetNode?.label,
    pathNodeIds: [],
    pathLinkIds: [],
    deliveredLift: 0,
    blockedReason,
    explanation,
  }
}

function describeBlockedReason(
  blockedReason: SupplyBlockedReason,
  regionTag: string,
  targetNode: SupplyNodeState | undefined
) {
  switch (blockedReason) {
    case 'no_source':
      return `${regionTag}: no active source could project support.`
    case 'target_uncontrolled':
      return `${regionTag}: ${targetNode?.label ?? 'target node'} is not under agency control.`
    case 'path_blocked':
      return `${regionTag}: no open route reached ${targetNode?.label ?? 'the target node'}.`
    case 'no_transport':
      return `${regionTag}: no transport asset could service the traced route.`
    case 'transport_disrupted':
      return `${regionTag}: transport servicing ${targetNode?.label ?? 'the route'} is disrupted.`
  }
}

function resolveRegionTrace(
  state: SupplyNetworkState,
  regionTag: string
): SupplyTraceState {
  const targetNode = findTargetNode(state, regionTag)

  if (!targetNode || !targetNode.active || targetNode.controller !== 'agency') {
    return createUnsupportedTrace(
      regionTag,
      targetNode,
      'target_uncontrolled',
      describeBlockedReason('target_uncontrolled', regionTag, targetNode)
    )
  }

  const sources = [...state.sources]
    .filter((source) => source.active && source.throughput > 0)
    .sort((left, right) => {
      return right.throughput - left.throughput || left.id.localeCompare(right.id)
    })

  if (sources.length === 0) {
    return createUnsupportedTrace(
      regionTag,
      targetNode,
      'no_source',
      describeBlockedReason('no_source', regionTag, targetNode)
    )
  }

  const nodeById = new Map(state.nodes.map((node) => [node.id, node]))
  const attemptedUnsupported: SupplyTraceState[] = []

  for (const source of sources) {
    const sourceNode = nodeById.get(source.nodeId)

    if (!sourceNode || !sourceNode.active || sourceNode.controller !== 'agency') {
      continue
    }

    const path = findPath(state, source.nodeId, targetNode.id)

    if (!path) {
      attemptedUnsupported.push(
        createUnsupportedTrace(
          regionTag,
          targetNode,
          'path_blocked',
          describeBlockedReason('path_blocked', regionTag, targetNode)
        )
      )
      continue
    }

    const transportAsset = findTransportAsset(state, path.nodeIds, 'road')

    if (!transportAsset) {
      attemptedUnsupported.push(
        createUnsupportedTrace(
          regionTag,
          targetNode,
          'no_transport',
          describeBlockedReason('no_transport', regionTag, targetNode)
        )
      )
      continue
    }

    if (transportAsset.status !== 'ready') {
      attemptedUnsupported.push(
        createUnsupportedTrace(
          regionTag,
          targetNode,
          'transport_disrupted',
          describeBlockedReason('transport_disrupted', regionTag, targetNode)
        )
      )
      continue
    }

    const deliveredLift = Math.min(
      source.throughput,
      Number.isFinite(path.pathCapacity) ? path.pathCapacity : source.throughput,
      transportAsset.lift
    )

    if (deliveredLift <= 0) {
      attemptedUnsupported.push(
        createUnsupportedTrace(
          regionTag,
          targetNode,
          'no_transport',
          describeBlockedReason('no_transport', regionTag, targetNode)
        )
      )
      continue
    }

    return {
      regionTag,
      state: 'supported',
      sourceId: source.id,
      sourceLabel: source.label,
      targetNodeId: targetNode.id,
      targetNodeLabel: targetNode.label,
      transportAssetId: transportAsset.id,
      transportAssetLabel: transportAsset.label,
      pathNodeIds: path.nodeIds,
      pathLinkIds: path.linkIds,
      deliveredLift,
      explanation:
        `${regionTag}: ${source.label} reached ${targetNode.label}` +
        `${path.linkIds.length > 0 ? ` through ${path.linkIds.length} road link(s)` : ' locally'}` +
        ` using ${transportAsset.label}.`,
    }
  }

  return (
    attemptedUnsupported[0] ??
    createUnsupportedTrace(
      regionTag,
      targetNode,
      'no_source',
      describeBlockedReason('no_source', regionTag, targetNode)
    )
  )
}

export function advanceSupplyNetworkState(
  state: SupplyNetworkState | undefined,
  cases: readonly CaseInstance[]
): SupplyNetworkState | undefined {
  if (!state) {
    return undefined
  }

  const normalizedState: SupplyNetworkState = {
    nodes: sortById(state.nodes.map(normalizeNode)),
    sources: sortById(state.sources.map(normalizeSource)),
    links: sortById(state.links.map(normalizeLink)),
    transportAssets: sortById(state.transportAssets.map(normalizeTransportAsset)),
  }
  const regions = getSupplyTargetRegions(normalizedState, cases)
  const traces = regions.map((regionTag) => resolveRegionTrace(normalizedState, regionTag))

  return {
    ...normalizedState,
    traces,
    lastSummary: buildSupplyNetworkSummary({
      ...normalizedState,
      traces,
    }),
  }
}

export function getSupplyTraceForRegion(
  state: SupplyNetworkState | undefined,
  regionTag: string | undefined
) {
  if (!state || !regionTag) {
    return undefined
  }

  return state.traces?.find((trace) => trace.regionTag === regionTag)
}

export function getCaseSupplyTrace(
  state: SupplyNetworkState | undefined,
  currentCase: Pick<CaseInstance, 'regionTag'>
) {
  return getSupplyTraceForRegion(state, currentCase.regionTag)
}

export function isCaseSupplySupported(
  state: SupplyNetworkState | undefined,
  currentCase: Pick<CaseInstance, 'regionTag'>
) {
  return getCaseSupplyTrace(state, currentCase)?.state === 'supported'
}

export function buildSupplyNetworkSummary(
  state: SupplyNetworkState | undefined
): SupplyNetworkWeeklySummary {
  if (!state) {
    return EMPTY_SUPPLY_SUMMARY
  }

  const traces = state.traces ?? []
  const unsupported = traces.filter((trace) => trace.state === 'unsupported')

  return {
    tracedRegionCount: traces.length,
    supportedRegionCount: traces.filter((trace) => trace.state === 'supported').length,
    unsupportedRegionCount: unsupported.length,
    blockedRegions: unsupported.map((trace) => trace.regionTag),
    readyTransportCount: state.transportAssets.filter((asset) => asset.status === 'ready').length,
    disruptedTransportCount: state.transportAssets.filter((asset) => asset.status === 'disrupted')
      .length,
    totalSourceThroughput: state.sources.reduce((sum, source) => sum + source.throughput, 0),
    deliveredLift: traces.reduce((sum, trace) => sum + trace.deliveredLift, 0),
    strategicControlScore: state.nodes
      .filter((node) => node.controller === 'agency' && node.active)
      .reduce((sum, node) => sum + node.strategicValue, 0),
    blockedDetails: unsupported.map((trace) => trace.explanation),
  }
}

export function buildSupplyNetworkReportSnapshot(
  state: SupplyNetworkState | undefined
): SupplyNetworkReportSnapshot | undefined {
  if (!state) {
    return undefined
  }

  return {
    ...buildSupplyNetworkSummary(state),
    traces: (state.traces ?? []).map((trace) => ({
      ...trace,
      pathNodeIds: [...trace.pathNodeIds],
      pathLinkIds: [...trace.pathLinkIds],
    })),
    nodes: state.nodes.map((node) => ({
      ...node,
      regionTags: [...node.regionTags],
    })),
    links: state.links.map((link) => ({ ...link })),
    transportAssets: state.transportAssets.map((asset) => ({
      ...asset,
      routeNodeIds: [...asset.routeNodeIds],
    })),
  }
}

export function formatSupplyNetworkRollup(
  summary: SupplyNetworkWeeklySummary | SupplyNetworkReportSnapshot | undefined
) {
  if (!summary || summary.tracedRegionCount === 0) {
    return 'No traced support network is active.'
  }

  return (
    `Support ${summary.supportedRegionCount}/${summary.tracedRegionCount} traced regions / ` +
    `${summary.readyTransportCount} ready transport / control score ${summary.strategicControlScore}` +
    `${summary.unsupportedRegionCount > 0 ? ` / blocked ${summary.blockedRegions.join(', ')}` : ''}.`
  )
}

export function formatSupplyNetworkSummaryLines(
  summary: SupplyNetworkWeeklySummary | SupplyNetworkReportSnapshot | undefined
) {
  if (!summary || summary.tracedRegionCount === 0) {
    return [formatSupplyNetworkRollup(summary)]
  }

  const lines = [
    `Support: ${summary.supportedRegionCount}/${summary.tracedRegionCount} regions traced / unsupported ${summary.unsupportedRegionCount}`,
    `Transport: ${summary.readyTransportCount} ready / ${summary.disruptedTransportCount} disrupted / delivered lift ${summary.deliveredLift}`,
    `Strategic control: ${summary.strategicControlScore} / source throughput ${summary.totalSourceThroughput}`,
  ]

  if (summary.blockedDetails.length > 0) {
    lines.push(`Blocked paths: ${summary.blockedDetails.join(' | ')}`)
  }

  return lines
}

export function createStartingSupplyNetworkState(): SupplyNetworkState {
  return {
    nodes: [
      {
        id: 'node-command',
        label: 'Directorate Command',
        type: 'command_center',
        controller: 'agency',
        active: true,
        strategicValue: 3,
        regionTags: ['global'],
      },
      {
        id: 'node-depot',
        label: 'Southside Depot',
        type: 'depot',
        controller: 'agency',
        active: true,
        strategicValue: 2,
        regionTags: ['bio_containment', 'perimeter_sector'],
      },
      {
        id: 'node-corridor',
        label: 'Occult Transit Corridor',
        type: 'corridor',
        controller: 'agency',
        active: true,
        strategicValue: 4,
        regionTags: ['occult_district'],
      },
    ],
    sources: [
      {
        id: 'source-command',
        label: 'Directorate Dispatch',
        type: 'command',
        nodeId: 'node-command',
        active: true,
        throughput: 2,
      },
    ],
    links: [
      {
        id: 'link-command-depot',
        from: 'node-command',
        to: 'node-depot',
        mode: 'road',
        status: 'open',
        capacity: 2,
      },
      {
        id: 'link-depot-corridor',
        from: 'node-depot',
        to: 'node-corridor',
        mode: 'road',
        status: 'open',
        capacity: 1,
      },
    ],
    transportAssets: [
      {
        id: 'transport-main-column',
        label: 'Main Truck Column',
        class: 'truck_column',
        mode: 'road',
        status: 'ready',
        lift: 2,
        fragility: 2,
        routeNodeIds: ['node-command', 'node-corridor', 'node-depot'],
      },
    ],
  }
}
