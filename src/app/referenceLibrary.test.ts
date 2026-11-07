import { describe, expect, it } from 'vitest'
import {
  buildReferenceIndex,
  findReferenceEntry,
  normalizeReferenceSearch,
  REFERENCE_ENTRIES,
  REFERENCE_SEARCH_POLICY,
  relatedReferenceEntries,
  searchReferenceEntries,
} from './referenceLibrary'
import { projectReferenceEntry } from './referenceLibraryView'
import {
  DEFAULT_BINDINGS,
  INPUT_ACTIONS,
  keyboardBinding,
  normalizeInputPreferences,
  resolveInputAction,
} from './inputActions'
import { ROLE_LABELS, ROLE_COVERAGE_LABELS } from '../data/copy'
import { TEAM_COVERAGE_ROLES } from '../domain/models'
import { NAVIGATION_HISTORY_LIMIT } from './navigationHistory'

const index = buildReferenceIndex()
const defaults = normalizeInputPreferences(undefined)
describe('reference identity and public projection', () => {
  it('orders categories and stable IDs deterministically, with exact direct identity', () => {
    expect(buildReferenceIndex([...REFERENCE_ENTRIES].reverse())).toEqual(index)
    expect(index.categories.map((category) => category.id)).toEqual([
      'workspace',
      'personnel',
      'information',
    ])
    expect(searchReferenceEntries(index, '', 'personnel').map((entry) => entry.id)).toEqual([
      'reference.coverage',
      'reference.specializations',
    ])
    expect(findReferenceEntry(index, 'reference.controls')?.label).toBe('Controls and bindings')
    expect(findReferenceEntry(index, 'keyboard')).toBeUndefined()
    expect(searchReferenceEntries(index, 'agent specialisations')[0]?.id).toBe(
      'reference.specializations'
    )
    expect(searchReferenceEntries(index, 'specializashuns')).toEqual([])
    for (const label of Object.values(ROLE_LABELS)) {
      expect(searchReferenceEntries(index, label).map((entry) => entry.id)).toContain(
        'reference.specializations'
      )
    }
    for (const label of Object.values(ROLE_COVERAGE_LABELS)) {
      expect(searchReferenceEntries(index, label).map((entry) => entry.id)).toContain(
        'reference.coverage'
      )
    }
    expect(searchReferenceEntries(index, '', 'missing')).toEqual([])
  })
  it('normalizes only configured lookup variants while preserving collisions and authored text', () => {
    const label = 'Café’s long–term'
    const entries = [
      { ...REFERENCE_ENTRIES[0], id: 'reference.first', label },
      { ...REFERENCE_ENTRIES[0], id: 'reference.second', label: "Cafe's long-term" },
    ]
    const collision = buildReferenceIndex(entries)
    expect(searchReferenceEntries(collision, 'CAFE`S long—term').map((entry) => entry.id)).toEqual([
      'reference.first',
      'reference.second',
    ])
    expect(findReferenceEntry(collision, 'reference.first')?.label).toBe(label)
    expect(normalizeReferenceSearch('Cafe\u0301')).toBe(normalizeReferenceSearch('Café'))
    expect(
      normalizeReferenceSearch('Café', { ...REFERENCE_SEARCH_POLICY, diacritics: false })
    ).toBe('café')
    expect(normalizeReferenceSearch('UP', { ...REFERENCE_SEARCH_POLICY, case: false })).toBe('UP')
    expect(
      normalizeReferenceSearch('a`b', { ...REFERENCE_SEARCH_POLICY, apostrophes: false })
    ).toBe('a`b')
    expect(normalizeReferenceSearch('a—b', { ...REFERENCE_SEARCH_POLICY, dashes: false })).toBe(
      'a—b'
    )
    expect(
      normalizeReferenceSearch('e\u0301', {
        ...REFERENCE_SEARCH_POLICY,
        unicode: false,
        diacritics: false,
      })
    ).toBe('e\u0301')
    expect(
      normalizeReferenceSearch('e\u0301', { ...REFERENCE_SEARCH_POLICY, diacritics: false })
    ).toBe('é')
  })
  it('omits withheld entries and facts from all lookup paths, and quarantines duplicate IDs', () => {
    const withheld = {
      ...REFERENCE_ENTRIES[1],
      publication: 'withheld' as const,
      label: 'SECRET',
      aliases: ['private'],
    }
    const safe = buildReferenceIndex([REFERENCE_ENTRIES[0], withheld])
    expect(searchReferenceEntries(safe, 'private')).toEqual([])
    expect(findReferenceEntry(safe, withheld.id)).toBeUndefined()
    expect(relatedReferenceEntries(safe, REFERENCE_ENTRIES[0])).toEqual([])
    expect(projectReferenceEntry(withheld, defaults)).toEqual({ status: 'unavailable' })
    const duplicate = buildReferenceIndex([REFERENCE_ENTRIES[0], REFERENCE_ENTRIES[0]])
    expect(duplicate.entries).toEqual([])
    expect(duplicate.unavailable).toBe(true)
    expect(
      buildReferenceIndex([
        REFERENCE_ENTRIES[0],
        { ...REFERENCE_ENTRIES[0], publication: 'withheld' },
      ]).entries
    ).toEqual([])
    expect(
      buildReferenceIndex([{ ...REFERENCE_ENTRIES[0], categoryId: 'missing' }]).unavailable
    ).toBe(true)
    expect(
      buildReferenceIndex(
        [],
        [
          { id: 'same', label: 'A' },
          { id: 'same', label: 'B' },
        ]
      ).unavailable
    ).toBe(true)
    expect(buildReferenceIndex(Array(257).fill(REFERENCE_ENTRIES[0])).unavailable).toBe(true)
  })
  it('filters stale, self and duplicate links without losing authored relation semantics', () => {
    const entry = {
      ...REFERENCE_ENTRIES[0],
      related: [
        { id: 'reference.navigation', relation: 'prerequisite' as const },
        { id: 'reference.navigation', relation: 'related' as const },
        { id: 'missing', relation: 'related' as const },
        { id: 'reference.controls', relation: 'related' as const },
      ],
    }
    expect(
      relatedReferenceEntries(index, entry).map(({ entry: target, relation }) => [
        target.id,
        relation,
      ])
    ).toEqual([['reference.navigation', 'prerequisite']])
    expect(projectReferenceEntry({ ...entry, projection: 'removed-producer' }, defaults)).toEqual({
      status: 'unavailable',
    })
  })
  it('projects canonical owner values and the current remap, with no copied rules', () => {
    const facts = (id: string) => {
      const result = projectReferenceEntry(findReferenceEntry(index, id)!, defaults)
      expect(result.status).toBe('available')
      return result.status === 'available' ? result.facts : []
    }
    expect(facts('reference.specializations').map((fact) => fact.value)).toEqual(
      Object.values(ROLE_LABELS)
    )
    expect(facts('reference.coverage').map((fact) => fact.value)).toEqual(
      TEAM_COVERAGE_ROLES.map((role) => ROLE_COVERAGE_LABELS[role])
    )
    expect(facts('reference.navigation')[0].value).toBe(String(NAVIGATION_HISTORY_LIMIT))
    expect(facts('reference.controls')).toHaveLength(INPUT_ACTIONS.length * 2)
    const preferences = normalizeInputPreferences({
      version: 1,
      overrides: { 'reference.open': [keyboardBinding('q')] },
    })
    const controls = projectReferenceEntry(REFERENCE_ENTRIES[0], preferences)
    expect(
      controls.status === 'available' &&
        controls.facts.find((fact) => fact.id === 'reference.open.keyboard')?.value
    ).toContain('Q (US position)')
    expect(
      controls.status === 'available' &&
        controls.facts.find((fact) => fact.id === 'reference.open.controller')?.value
    ).toBe('Unassigned')
  })
  it('preserves saved version-1 overrides when new defaults collide', () => {
    const overrides = {
      'settings.open': [keyboardBinding('h'), { device: 'controller' as const, button: 8 }],
    }
    const preferences = normalizeInputPreferences({ version: 1, overrides })
    expect(preferences.overrides['settings.open']).toEqual(overrides['settings.open'])
    expect(preferences.overrides['reference.open']).toEqual([])
    expect(normalizeInputPreferences(preferences)).toEqual(preferences)
    expect(DEFAULT_BINDINGS['reference.open']).toHaveLength(2)
  })
  it('allows only safe modal controller reference navigation while editing', () => {
    const next = {
      id: 'reference.next' as const,
      context: 'modal' as const,
      available: () => true,
      execute: () => {},
    }
    expect(
      resolveInputAction({ device: 'controller', button: 13 }, defaults, [next], true, true)
    ).toBe(next)
    expect(
      resolveInputAction(keyboardBinding('ArrowDown'), defaults, [next], true, true)
    ).toBeUndefined()
    expect(
      resolveInputAction(
        { device: 'controller', button: 13 },
        defaults,
        [{ ...next, context: 'route' }],
        false,
        true
      )
    ).toBeUndefined()
  })
})
