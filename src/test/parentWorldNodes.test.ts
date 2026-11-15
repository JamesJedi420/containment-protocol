import { describe, expect, it } from 'vitest'
import { findParentWorldNode, parseParentWorldNodes } from '../domain/parentWorldNodes'

describe('parent world node membership', () => {
  const input = {
    worldRef: 'world:one',
    nodes: [
      { nodeRef: 'node:west', localState: { access: 'closed', climate: 'cold' } },
      { nodeRef: 'node:east', localState: { access: 'open', climate: 'warm' } },
    ],
  }

  it('keeps distinct local states under one parent without implying connectivity', () => {
    const result = parseParentWorldNodes(input)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.reason)
    expect(result.world.worldRef).toBe('world:one')
    expect(findParentWorldNode(result.world, 'node:east')?.localState.access).toBe('open')
    expect(findParentWorldNode(result.world, 'node:west')?.localState.access).toBe('closed')
    expect(findParentWorldNode(result.world, 'node:missing')).toBeUndefined()
    expect(result.world).not.toHaveProperty('routes')
  })

  it('produces a stable immutable snapshot regardless of caller ordering', () => {
    const result = parseParentWorldNodes(input)
    const reversed = parseParentWorldNodes({ ...input, nodes: [...input.nodes].reverse() })
    expect(result).toEqual(reversed)
    if (!result.ok) throw new Error(result.reason)
    expect(Object.isFrozen(result.world.nodes[0].localState)).toBe(true)
    const original = input.nodes[0].localState.access
    input.nodes[0].localState.access = 'changed'
    expect(findParentWorldNode(result.world, 'node:west')?.localState.access).toBe(original)
    input.nodes[0].localState.access = original
  })

  it('rejects malformed state, duplicate nodes, and sparse nodes', () => {
    expect(
      parseParentWorldNodes({ ...input, nodes: [input.nodes[0], input.nodes[0]] })
    ).toMatchObject({ ok: false, reason: 'duplicate-node' })
    expect(
      parseParentWorldNodes({ ...input, nodes: [{ nodeRef: 'node:x', localState: {} }] })
    ).toMatchObject({ ok: false, reason: 'invalid-local-state' })
    expect(parseParentWorldNodes({ ...input, nodes: new Array(1) })).toMatchObject({
      ok: false,
      reason: 'invalid-node',
    })
    expect(parseParentWorldNodes({ ...input, worldRef: '' })).toMatchObject({
      ok: false,
      reason: 'invalid-world',
    })
  })
})
