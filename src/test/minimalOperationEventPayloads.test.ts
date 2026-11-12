import { describe, expect, it } from 'vitest'
import { validateOperationEventPayload } from '../domain/events/eventValidation'
import {
  canonicalOperationEventTypes,
  minimalOperationEventPayloads,
} from './fixtures/minimalOperationEventPayloads'

describe('minimalOperationEventPayloads fixture', () => {
  it('registers a minimal payload for every canonical event type', () => {
    expect(Object.keys(minimalOperationEventPayloads).sort()).toEqual(
      canonicalOperationEventTypes
    )
  })

  it.each(canonicalOperationEventTypes)(
    'minimal payload for %s passes validateOperationEventPayload',
    (type) => {
      const validation = validateOperationEventPayload(type, minimalOperationEventPayloads[type])
      expect(validation.success, validation.error).toBe(true)
    }
  )
})
