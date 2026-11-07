import { describe, expect, it } from 'vitest'
import { projectCompactCard, validateCompactCard } from '../domain/compactCards'
import type { CompactCardRecord } from '../domain/compactCards'

const known = (value: string | number) => ({ state: 'known' as const, value })
const item: CompactCardRecord = {
  id: 'public-lamp',
  category: 'item',
  name: known('Survey lamp'),
  hook: known('Recovered from the north tunnel'),
  sourceTags: ['survey', 'equipment'],
  fields: [
    { id: 'power', label: 'Power', value: known(4), depth: 'browse' },
    {
      id: 'range',
      label: 'Range',
      value: { state: 'estimated', value: 12, confidence: 'limited' },
      depth: 'inspect',
    },
  ],
}
const actor: CompactCardRecord = {
  id: 'public-actor',
  category: 'actor',
  name: known('River'),
  mode: { kind: 'live' },
  fields: [],
  personnel: { assignment: known('Survey'), readiness: known('Ready') },
}
function ready(record: unknown) {
  const result = projectCompactCard(record)
  if (result.status !== 'ready') throw new Error(result.issues.join(','))
  return result.card
}

describe('compact card contract', () => {
  it('rejects sparse tags and ignores personnel inherited from a prototype', () => {
    expect(validateCompactCard({ ...item, sourceTags: new Array(2) })).toContain(
      'source-tags-invalid'
    )
    const personnel = Object.create({ readiness: { state: 'known', value: 'Inherited secret' } })
    personnel.assignment = known('Survey')
    expect(ready({ ...actor, personnel }).browse.map((field) => field.id)).toEqual([
      'actor.assignment',
    ])
  })
  it('shares a grammar across operational actor, item and anomaly records', () => {
    const equipment = ready(item)
    expect(equipment.hook).toEqual(known('Recovered from the north tunnel'))
    expect(equipment.browse[0].value).toEqual(known(4))
    expect(equipment.inspect[0].value).toEqual({
      state: 'estimated',
      value: 12,
      confidence: 'limited',
    })
    expect(ready(actor).browse.map((field) => field.id)).toEqual([
      'actor.assignment',
      'actor.readiness',
    ])
    expect(ready({ ...item, category: 'anomaly' }).category).toBe('anomaly')
    expect(equipment.mode).toBeUndefined()
    expect(validateCompactCard({ ...item, personnel: {} })).toContain('actor-fields-on-non-actor')
  })

  it.each(['historical', 'memorial'] as const)(
    'keeps %s values separate from later live changes',
    (kind) => {
      const historical = {
        ...actor,
        mode: { kind, week: 3, recordRef: 'public-record-3', reconstruction: 'snapshot' },
        personnel: { assignment: known('Archive') },
      }
      const projected = ready(historical)
      historical.personnel.assignment.value = 'Later assignment'
      expect(projected.browse[0].value).toEqual(known('Archive'))
      expect(projected.mode).toEqual({
        kind,
        week: 3,
        recordRef: 'public-record-3',
        reconstruction: 'snapshot',
      })
      expect(projected.qualifier).toContain('week 3')
      expect(ready(actor).qualifier).toContain('Current')
      expect(validateCompactCard({ ...historical, mode: { kind, week: 3 } })).toContain(
        'historical-source-required'
      )
    }
  )

  it('renders missing legacy identity without substituting operational data', () => {
    const unavailable = {
      ...actor,
      personnel: undefined,
      mode: { kind: 'unavailable', reason: 'legacy' },
    }
    expect(ready(unavailable).browse).toEqual([])
    expect(ready(unavailable).qualifier).toContain('Unavailable legacy')
    expect(
      validateCompactCard({ ...unavailable, personnel: { readiness: known('Ready') } })
    ).toContain('unavailable-operational-data-forbidden')
    expect(validateCompactCard({ ...unavailable, fields: item.fields })).toContain(
      'unavailable-operational-data-forbidden'
    )
  })

  it('strips hidden payloads and provenance from every suppressed value', () => {
    const secret = { state: 'redacted', value: 'SECRET', provenance: ['SECRET'], extra: 'SECRET' }
    const projected = ready({
      ...actor,
      name: secret,
      subjectRef: secret,
      hook: secret,
      personnel: { assignment: secret, readiness: { ...secret, state: 'unavailable' } },
      fields: [{ id: 'public', label: 'Public label', depth: 'inspect', value: secret }],
    })
    expect(JSON.stringify(projected)).not.toContain('SECRET')
    expect(projected.name).toEqual({ state: 'redacted' })
    expect(projected.browse[1].value).toEqual({ state: 'unavailable' })
  })

  it('is stable across key order, copies inputs and freezes all projected collections', () => {
    const first = {
      ...actor,
      sourceTags: ['z', 'a', 'z'],
      personnel: {
        readiness: known('Ready'),
        assignment: { ...known('Survey'), provenance: ['z', 'a', 'z'] },
      },
    }
    const second = {
      ...actor,
      sourceTags: ['a', 'z'],
      personnel: {
        assignment: { provenance: ['a', 'z'], ...known('Survey') },
        readiness: known('Ready'),
      },
    }
    const before = JSON.stringify(first)
    const card = ready(first)
    expect(JSON.stringify(card)).toBe(JSON.stringify(ready(second)))
    expect(JSON.stringify(first)).toBe(before)
    expect(Object.isFrozen(card)).toBe(true)
    expect(Object.isFrozen(card.browse)).toBe(true)
    expect(Object.isFrozen(card.browse[0].value)).toBe(true)
    expect(Object.isFrozen(card.sourceTags)).toBe(true)
  })

  it('rejects malformed, ambiguous and unbounded records without exposing their contents', () => {
    for (const bad of [
      null,
      {},
      { ...item, category: { toString: () => 'item' } },
      { ...item, name: known(Infinity) },
      { ...item, name: known('x'.repeat(321)) },
      { ...item, fields: [item.fields[0], item.fields[0]] },
      { ...item, fields: [{ ...item.fields[0], id: 'actor.assignment' }] },
      {
        ...actor,
        mode: { kind: 'historical', week: -1, recordRef: 'record', reconstruction: 'snapshot' },
      },
    ]) {
      expect(projectCompactCard(bad).status).toBe('invalid')
    }
    expect(
      validateCompactCard({
        ...item,
        fields: [{ ...item.fields[0], depth: { toString: () => 'browse' } }],
      })
    ).toContain('field-invalid')
  })
})
