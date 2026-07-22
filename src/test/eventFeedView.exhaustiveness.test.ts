import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildEventQueryIndex, queryEvents } from '../domain/events'
import {
  buildEventFeedView,
  EVENT_TYPE_CATEGORIES,
  EVENT_TYPE_LABELS,
  getFilteredEventFeedViews,
  DEFAULT_EVENT_FEED_FILTERS,
} from '../features/dashboard/eventFeedView'
import {
  canonicalOperationEventTypes,
  createMinimalOperationEvent,
  minimalOperationEventPayloads,
} from './fixtures/minimalOperationEventPayloads'

describe('EVENT_TYPE_LABELS coverage', () => {
  it('labels every canonical operation event type', () => {
    expect(Object.keys(EVENT_TYPE_LABELS).sort()).toEqual(canonicalOperationEventTypes)
  })

  it('categorizes every canonical operation event type', () => {
    expect(Object.keys(EVENT_TYPE_CATEGORIES).sort()).toEqual(canonicalOperationEventTypes)
  })
})

describe('buildEventFeedView exhaustiveness', () => {
  it.each(canonicalOperationEventTypes)(
    'does not throw for minimal payload on %s',
    (type) => {
      const event = createMinimalOperationEvent(type)
      expect(() => buildEventFeedView(event)).not.toThrow()
      const view = buildEventFeedView(event)
      expect(view.title.length).toBeGreaterThan(0)
      expect(view.detail.length).toBeGreaterThan(0)
      expect(view.searchText.length).toBeGreaterThan(0)
      expect(view.week).toBe(minimalOperationEventPayloads[type].week)
    }
  )
})

describe('event feed search surfaces', () => {
  it('queryEvents matches raw payload strings; dashboard query matches formatted searchText', () => {
    const production = createMinimalOperationEvent('production.queue_started', {
      id: 'evt-production-search',
      payload: {
        ...minimalOperationEventPayloads['production.queue_started'],
        inputMaterials: [],
      },
    })
    const game = { ...createStartingState(), events: [production] }
    const index = buildEventQueryIndex(game.events)

    const formattedPhrase = 'no input materials'
    expect(queryEvents(index, { query: formattedPhrase })).toHaveLength(0)

    const views = getFilteredEventFeedViews(game, {
      ...DEFAULT_EVENT_FEED_FILTERS,
      query: formattedPhrase,
    })
    expect(views).toHaveLength(1)
    expect(views[0]?.event.id).toBe('evt-production-search')

    const payloadPhrase = 'ward-seals'
    expect(queryEvents(index, { query: payloadPhrase })).toHaveLength(1)
    expect(views.filter((view) => view.searchText.includes(payloadPhrase))).toHaveLength(1)
  })
})
