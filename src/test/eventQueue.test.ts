// cspell:words qevt
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  clearRuntimeEventQueue,
  dequeueRuntimeEvent,
  enqueueRuntimeEvent,
  listQueuedRuntimeEvents,
  peekQueuedRuntimeEvent,
} from '../domain/eventQueue'

describe('eventQueue', () => {
  it('enqueues events in deterministic FIFO order with stable ids', () => {
    let state = createStartingState()

    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'followup.alpha',
      source: 'choice.alpha',
      week: 1,
    }).state
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'followup.beta',
      source: 'choice.beta',
      week: 1,
    }).state

    const queued = listQueuedRuntimeEvents(state)

    expect(queued.map((entry) => entry.id)).toEqual(['qevt-0001', 'qevt-0002'])
    expect(queued.map((entry) => entry.targetId)).toEqual(['followup.alpha', 'followup.beta'])
    expect(peekQueuedRuntimeEvent(state)?.id).toBe('qevt-0001')
  })

  it('dequeues events from the front and supports explicit clear', () => {
    let state = createStartingState()
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'followup.alpha',
    }).state
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'followup.beta',
    }).state

    const first = dequeueRuntimeEvent(state)
    state = first.state

    expect(first.event?.targetId).toBe('followup.alpha')
    expect(listQueuedRuntimeEvents(state).map((entry) => entry.targetId)).toEqual(['followup.beta'])

    state = clearRuntimeEventQueue(state)
    expect(listQueuedRuntimeEvents(state)).toEqual([])
    expect(peekQueuedRuntimeEvent(state)).toBeNull()
  })
})
