import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  findNavigationDelta,
  isNavigationDestinationAvailable,
  NAVIGATION_HISTORY_LIMIT,
  observeNavigation,
  startNavigationHistory,
} from './navigationHistory'

const entry = (key: string, pathname = `/${key}`) => ({ key, pathname, search: '', hash: '' })

describe('session navigation history', () => {
  it('tracks back/forward POP commits and truncates the forward branch on a push', () => {
    let history = startNavigationHistory(entry('a'))
    history = observeNavigation(history, entry('b'), 'PUSH')
    history = observeNavigation(history, entry('c'), 'PUSH')
    history = observeNavigation(history, entry('b'), 'POP')
    expect(findNavigationDelta(history, -1, () => true)).toBe(-1)
    expect(findNavigationDelta(history, 1, () => true)).toBe(1)
    history = observeNavigation(history, entry('d'), 'PUSH')
    expect(history.entries.map((item) => item.key)).toEqual(['a', 'b', 'd'])
    expect(findNavigationDelta(history, 1, () => true)).toBeNull()
  })

  it('replaces the current entry without discarding forward history', () => {
    let history = startNavigationHistory(entry('a'))
    history = observeNavigation(history, entry('b'), 'PUSH')
    history = observeNavigation(history, entry('a'), 'POP')
    const original = structuredClone(history)
    history = observeNavigation(history, { ...entry('normalized'), search: '?q=Ava' }, 'REPLACE')
    expect(original.entries.map((item) => item.key)).toEqual(['a', 'b'])
    expect(history.entries.map((item) => item.key)).toEqual(['normalized', 'b'])
    expect(history.entries[0].search).toBe('?q=Ava')
    expect(findNavigationDelta(history, 1, () => true)).toBe(1)
  })

  it('skips invalid entries using the actual router distance', () => {
    let history = startNavigationHistory(entry('a'))
    history = observeNavigation(history, entry('deleted'), 'PUSH')
    history = observeNavigation(history, entry('c'), 'PUSH')
    expect(findNavigationDelta(history, -1, (item) => item.key === 'a')).toBe(-2)
    expect(findNavigationDelta(history, -1, () => false)).toBeNull()
    history = observeNavigation(history, entry('a'), 'POP')
    expect(findNavigationDelta(history, 1, (item) => item.key === 'c')).toBe(2)
  })

  it('resets at unseen POP entries and never infers history before a deep link', () => {
    let history = startNavigationHistory(entry('deep', '/agents/agent-1'))
    expect(findNavigationDelta(history, -1, () => true)).toBeNull()
    history = observeNavigation(history, entry('unknown'), 'POP')
    expect(history).toEqual(startNavigationHistory(entry('unknown')))
    expect(observeNavigation(history, entry('unknown'), 'POP')).toBe(history)
  })

  it('bounds memory and copies only route context, not arbitrary transaction state', () => {
    const input = { ...entry('a'), state: { execute: true } }
    let history = startNavigationHistory(input)
    input.pathname = '/changed'
    expect(history.entries[0]).toEqual(entry('a'))
    for (let i = 0; i < NAVIGATION_HISTORY_LIMIT + 5; i++) {
      history = observeNavigation(history, entry(`entry-${i}`), 'PUSH')
    }
    expect(history.entries).toHaveLength(NAVIGATION_HISTORY_LIMIT)
    expect(history.index).toBe(NAVIGATION_HISTORY_LIMIT - 1)
    expect(history.entries[0].key).toBe('entry-5')
  })

  it('checks existing routes and live detail records without accepting arbitrary destinations', () => {
    const game = createStartingState()
    const agentId = Object.keys(game.agents)[0]
    expect(isNavigationDestinationAvailable('/agents', game)).toBe(true)
    expect(isNavigationDestinationAvailable(`/agents/${encodeURIComponent(agentId)}`, game)).toBe(
      true
    )
    expect(isNavigationDestinationAvailable('/agents/missing', game)).toBe(false)
    expect(isNavigationDestinationAvailable('/not-a-route', game)).toBe(false)
    expect(isNavigationDestinationAvailable('//other.example', game)).toBe(false)
    delete game.agents[agentId]
    expect(isNavigationDestinationAvailable(`/agents/${encodeURIComponent(agentId)}`, game)).toBe(
      false
    )
    expect(isNavigationDestinationAvailable('/report/NaN', game)).toBe(false)
  })

  it('uses router decoding, case and trailing-slash matching for supported destinations', () => {
    const game = createStartingState()
    const templateAgent = Object.values(game.agents)[0]
    const id = 'agent / 25%'
    game.agents[id] = { ...templateAgent, id }
    expect(isNavigationDestinationAvailable(`/agents/${encodeURIComponent(id)}`, game)).toBe(true)
    expect(isNavigationDestinationAvailable('/AGENTS/', game)).toBe(true)
    expect(isNavigationDestinationAvailable('/agents/%ZZ', game)).toBe(false)
    expect(isNavigationDestinationAvailable('/agents/toString', game)).toBe(false)
  })
})
