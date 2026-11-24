import { describe, expect, it } from 'vitest'
import type { RitualComponent } from '../domain/ritualComponentSchema'
import {
  RITUAL_COMPONENT_FIXTURE_COMPONENTS,
  RITUAL_COMPONENT_KINDS,
  compareRitualVariants,
  componentsByFrame,
  lookupRitualComponent,
  normalizeRitualComponents,
  validateRitualComponents,
} from '../domain/ritualComponentSchema'

const cureFrame = 'ritual-frame:paper-avatar-cure'
const dawn = 'ritual-variant:dawn'
const dusk = 'ritual-variant:dusk'

const fictionalCureVariants = [
  {
    id: 'ritual-component:dawn-thread',
    kind: 'material',
    label: 'sun-thread token',
    certainty: 'known',
    frameId: cureFrame,
    variantId: dawn,
    slotId: 'ritual-slot:token',
  },
  {
    id: 'ritual-component:dusk-thread',
    kind: 'material',
    label: 'moon-thread token',
    certainty: 'disputed',
    frameId: cureFrame,
    variantId: dusk,
    slotId: 'ritual-slot:token',
  },
  {
    id: 'ritual-component:dawn-echoes',
    kind: 'count',
    label: 'two phantom echoes',
    certainty: 'known',
    frameId: cureFrame,
    variantId: dawn,
    slotId: 'ritual-slot:echo-count',
  },
  {
    id: 'ritual-component:dusk-echoes',
    kind: 'count',
    label: 'three phantom echoes',
    certainty: 'known',
    frameId: cureFrame,
    variantId: dusk,
    slotId: 'ritual-slot:echo-count',
  },
  {
    id: 'ritual-component:dawn-lost-verse',
    kind: 'wording',
    label: 'lost verse',
    certainty: 'unknown',
    frameId: cureFrame,
    variantId: dawn,
    slotId: 'ritual-slot:verse',
  },
] as const satisfies readonly RitualComponent[]

const omenFrame = 'ritual-frame:reverse-moon-omen'
const fictionalOmen = [
  ['actor', 'ink courier'],
  ['object', 'impossible key'],
  ['material', 'starglass offering'],
  ['body_state', 'paper avatar folded'],
  ['wording', 'lost lantern verse'],
  ['count', 'three phantom echoes'],
  ['placement', 'door drawn in the sky'],
  ['route', 'through the mirror corridor'],
  ['time', 'when the painted moon reverses'],
  ['recipient', 'the lantern court'],
  ['failure_state', 'the illustrated door fades'],
] as const

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
    const id = 'ritual-component:threshold-offering'
    const found = lookupRitualComponent(components, id)
    expect(found.status).toBe('found')
    expect(lookupRitualComponent([...components].reverse(), id)).toEqual(found)
    expect(lookupRitualComponent([...components, components[0]], id).status).toBe(
      'ambiguous_component_id'
    )
    expect(lookupRitualComponent(components, 'ritual-component:absent').status).toBe(
      'unknown_component_id'
    )
    expect(lookupRitualComponent(components, 'invalid id').status).toBe('invalid_component_id')
  })

  it('groups ward, offering, and binding components and skips a malformed matching record', () => {
    const frame = componentsByFrame(
      [
        ...RITUAL_COMPONENT_FIXTURE_COMPONENTS,
        { ...RITUAL_COMPONENT_FIXTURE_COMPONENTS[0], id: 'ritual-component:blank', label: ' ' },
      ],
      'ritual-frame:ward-binding'
    )
    expect(frame.map((c) => c.id)).toEqual([
      'ritual-component:spoken-binding',
      'ritual-component:threshold-offering',
    ])
    expect(frame.map((c) => c.certainty)).toEqual(['disputed', 'known'])
  })

  it('aligns fictional cure variants by slot and distinguishes disputed, unknown, and absent', () => {
    const [dawnThread, duskThread, dawnEchoes, duskEchoes, dawnVerse] = fictionalCureVariants
    const expected = [
      { slotId: 'ritual-slot:echo-count', left: dawnEchoes, right: duskEchoes },
      { slotId: 'ritual-slot:token', left: dawnThread, right: duskThread },
      { slotId: 'ritual-slot:verse', left: dawnVerse, right: null },
    ]
    expect(compareRitualVariants(fictionalCureVariants, cureFrame, dawn, dusk)).toEqual(expected)
    expect(
      compareRitualVariants([...fictionalCureVariants].reverse(), cureFrame, dawn, dusk)
    ).toEqual(expected)
    expect(compareRitualVariants(fictionalCureVariants, cureFrame, dusk, dawn)).toEqual(
      expected.map(({ slotId, left, right }) => ({ slotId, left: right, right: left }))
    )
  })

  it('rejects unpaired metadata, ambiguous slots, and comparisons without both variants', () => {
    const first = fictionalCureVariants[0]
    const unpaired = { ...first, slotId: undefined }
    const duplicate = { ...first, id: 'ritual-component:second-dawn-thread' }
    const wrongKind = { ...fictionalCureVariants[1], kind: 'object' as const }

    expect(validateRitualComponents([unpaired]).issues).toMatchObject([{ code: 'invalid_slot_id' }])
    expect(validateRitualComponents([first, duplicate]).issues).toMatchObject([
      { code: 'duplicate_variant_slot' },
    ])
    expect(validateRitualComponents([first, wrongKind]).issues).toMatchObject([
      { code: 'mismatched_slot_kind' },
    ])
    expect(
      compareRitualVariants([...fictionalCureVariants, duplicate], cureFrame, dawn, dusk)
    ).toBeNull()
    expect(compareRitualVariants(fictionalCureVariants, omenFrame, dawn, dusk)).toBeNull()
    expect(compareRitualVariants(fictionalCureVariants, cureFrame, dawn, dawn)).toBeNull()
    expect(compareRitualVariants([first], cureFrame, dawn, dusk)).toBeNull()
  })

  it('stores an omen-triggered, multi-channel fictional component set', () => {
    const records: RitualComponent[] = fictionalOmen.map(([kind, label]) => ({
      id: `ritual-component:omen-${kind.replace('_', '-')}`,
      kind,
      label,
      certainty: kind === 'wording' ? 'unknown' : 'known',
      frameId: omenFrame,
    }))
    expect(records.map((component) => component.kind)).toEqual(RITUAL_COMPONENT_KINDS)
    expect(normalizeRitualComponents(records)).toEqual(componentsByFrame(records, omenFrame))
    expect(validateRitualComponents(records).valid).toBe(true)
    expect(lookupRitualComponent(records, 'ritual-component:omen-wording')).toEqual({
      status: 'found',
      component: expect.objectContaining({ certainty: 'unknown' }),
    })
  })
})
