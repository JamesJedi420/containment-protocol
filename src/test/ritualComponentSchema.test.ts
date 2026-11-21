import { describe, expect, it } from 'vitest'
import {
  RITUAL_COMPONENT_FIXTURE_COMPONENTS,
  componentsByFrame,
  lookupRitualComponent,
  normalizeRitualComponents,
  validateRitualComponents,
} from '../domain/ritualComponentSchema'

describe('ritualComponentSchema (SPE-1332 slice 1)', () => {
  it('accepts fixture components with explicit certainty and frame', () => {
    expect(validateRitualComponents(RITUAL_COMPONENT_FIXTURE_COMPONENTS)).toEqual({
      valid: true,
      issues: [],
    })
    const normalized = normalizeRitualComponents(RITUAL_COMPONENT_FIXTURE_COMPONENTS)
    expect(normalized).not.toBeNull()
    expect(normalized!.map((c) => c.id)).toEqual([
      'ritual-component:spoken-binding',
      'ritual-component:threshold-offering',
      'ritual-component:unknown-count',
    ])
  })

  it('rejects duplicate ids, unknown kinds, and malformed ids', () => {
    const invalid = [
      ...RITUAL_COMPONENT_FIXTURE_COMPONENTS,
      {
        id: 'ritual-component:threshold-offering',
        kind: 'material',
        label: 'duplicate',
        certainty: 'known',
      },
      {
        id: 'not-a-component',
        kind: 'unknown_kind',
        label: 'bad',
        certainty: 'maybe',
      },
    ]
    const result = validateRitualComponents(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.code).sort()).toEqual([
      'duplicate_component_id',
      'invalid_component_id',
      'unknown_certainty',
      'unknown_kind',
    ])
  })

  it('lookup is order-independent and distinguishes unknown from invalid', () => {
    const components = RITUAL_COMPONENT_FIXTURE_COMPONENTS
    expect(lookupRitualComponent(components, 'ritual-component:threshold-offering').status).toBe(
      'found'
    )
    expect(lookupRitualComponent(components, 'ritual-component:absent').status).toBe(
      'unknown_component_id'
    )
    expect(lookupRitualComponent(components, 'invalid id').status).toBe('invalid_component_id')
  })

  it('groups components by frame for variant comparison', () => {
    const frame = componentsByFrame(
      RITUAL_COMPONENT_FIXTURE_COMPONENTS,
      'ritual-frame:ward-binding'
    )
    expect(frame.map((c) => c.id)).toEqual([
      'ritual-component:spoken-binding',
      'ritual-component:threshold-offering',
    ])
    expect(frame.every((c) => c.certainty !== 'unknown')).toBe(true)
  })
})
