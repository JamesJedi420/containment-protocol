/** SPE-720: caller-supplied membership and local-state snapshots, not map topology. */
export interface ParentWorldNode {
  readonly nodeRef: string
  readonly localState: Readonly<Record<string, string>>
}

export interface ParentWorldNodes {
  readonly worldRef: string
  readonly nodes: readonly ParentWorldNode[]
}

export type ParentWorldNodesResult =
  | { readonly ok: true; readonly world: ParentWorldNodes }
  | { readonly ok: false; readonly reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  )
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value === value.trim()
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Validates and copies snapshots; caller-owned systems define what state keys mean. */
export function parseParentWorldNodes(input: unknown): ParentWorldNodesResult {
  if (!isRecord(input) || !isText(input.worldRef)) return { ok: false, reason: 'invalid-world' }
  if (!Array.isArray(input.nodes) || input.nodes.length === 0)
    return { ok: false, reason: 'invalid-nodes' }
  const seen = new Set<string>()
  const nodes: ParentWorldNode[] = []
  for (const node of input.nodes) {
    if (!isRecord(node) || !isText(node.nodeRef) || !isRecord(node.localState)) {
      return { ok: false, reason: 'invalid-node' }
    }
    if (seen.has(node.nodeRef)) return { ok: false, reason: 'duplicate-node' }
    seen.add(node.nodeRef)
    const entries = Object.entries(node.localState)
    if (entries.length === 0 || entries.some(([key, value]) => !isText(key) || !isText(value))) {
      return { ok: false, reason: 'invalid-local-state' }
    }
    entries.sort(([a], [b]) => compareIds(a, b))
    const localState = Object.freeze(Object.fromEntries(entries)) as Readonly<
      Record<string, string>
    >
    nodes.push(Object.freeze({ nodeRef: node.nodeRef, localState }))
  }
  nodes.sort((a, b) => compareIds(a.nodeRef, b.nodeRef))
  return {
    ok: true,
    world: Object.freeze({ worldRef: input.worldRef, nodes: Object.freeze(nodes) }),
  }
}

/** Returns a node only from a validated snapshot, with no inference of connectivity. */
export function findParentWorldNode(
  world: ParentWorldNodes,
  nodeRef: string
): ParentWorldNode | undefined {
  return world.nodes.find((node) => node.nodeRef === nodeRef)
}
