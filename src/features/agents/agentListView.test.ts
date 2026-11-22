import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  evaluatePersonnelQuery,
  getPersonnelQueryFacet,
  type PersonnelQueryRecord,
} from '../shared/personnelQueryView'
import { DEFAULT_AGENT_LIST_FILTERS, projectAgentQueryRecord } from './agentListView'
import { getAgentView } from './agentView'

const defaults = DEFAULT_AGENT_LIST_FILTERS
const baseRecord = {
  id: 'reserve',
  name: 'Ames',
  role: 'medic',
  status: 'active',
  teamId: undefined,
  fatigue: 'steady',
  training: 'available',
  searchText: 'ames medic active reserve pool',
} satisfies PersonnelQueryRecord

describe('Agents roster query', () => {
  it('indexes the displayed identity, assignment, tags and traits from the existing agent view', () => {
    const game = createStartingState()
    const agent = Object.values(game.agents)[0]!
    agent.traits = [
      {
        id: 'internal-trait-reference',
        label: 'Even temperament',
        description: 'Excluded trait description',
        modifiers: { overall: 2 },
      },
    ]
    const view = getAgentView(game, agent.id)!
    const record = projectAgentQueryRecord({
      ...view,
      materialized: {
        ...view.materialized,
        identity: { ...view.materialized.identity, callsign: 'Wren', codename: 'Maple' },
      },
    })
    const visibleQueries = [
      agent.name,
      agent.status,
      agent.role,
      view.assignmentLabel,
      view.team?.name ?? 'Reserve Pool',
      ...view.domainTags,
      ...(view.team?.tags ?? []),
      'Even temperament',
      'WREN',
      'maple',
    ]
    for (const q of visibleQueries) {
      expect(evaluatePersonnelQuery([record], { ...defaults, q })).toEqual([agent.id])
    }
    for (const q of ['internal-trait-reference', 'Excluded trait description']) {
      expect(evaluatePersonnelQuery([record], { ...defaults, q })).toEqual([])
    }
  })

  it('combines facets and keeps reserve and unavailable team filters distinct', () => {
    const records: PersonnelQueryRecord[] = [
      baseRecord,
      {
        ...baseRecord,
        id: 'field',
        teamId: 'field-team',
        training: 'training',
        fatigue: 'strained',
      },
    ]
    expect(
      evaluatePersonnelQuery(records, {
        q: 'MEDIC',
        role: 'medic',
        status: 'active',
        team: 'field-team',
        fatigue: 'strained',
        training: 'training',
      })
    ).toEqual(['field'])
    expect(evaluatePersonnelQuery(records, { ...defaults, team: 'unassigned' })).toEqual([
      'reserve',
    ])
    expect(evaluatePersonnelQuery(records, { ...defaults, team: 'stale-team' })).toEqual([])
    expect(evaluatePersonnelQuery([], defaults)).toEqual([])
    expect(getPersonnelQueryFacet(records, 'teamId')).toEqual(['field-team'])
    expect(getPersonnelQueryFacet(records, 'role')).toEqual(['medic'])
    expect(getPersonnelQueryFacet([], 'role')).toEqual([])
  })

  it('preserves the default roster order and sorts explicitly by two keys and identity', () => {
    const input: PersonnelQueryRecord[] = [
      { ...baseRecord, id: 'z', name: 'Aardvark' },
      { ...baseRecord, id: 'b', role: 'hunter' },
      { ...baseRecord, id: 'a', role: 'hunter' },
      baseRecord,
    ]
    expect(evaluatePersonnelQuery(input, defaults)).toEqual(['z', 'b', 'a', 'reserve'])
    expect(evaluatePersonnelQuery(input, defaults, { primary: 'role' })).toEqual([
      'a',
      'b',
      'reserve',
      'z',
    ])
    const sort = { primary: 'role', secondary: 'name' } as const
    const expected = ['a', 'b', 'z', 'reserve']
    expect(evaluatePersonnelQuery(input, defaults, sort)).toEqual(expected)
    expect(evaluatePersonnelQuery([...input].reverse(), defaults, sort)).toEqual(expected)
    expect(input.map(({ id }) => id)).toEqual(['z', 'b', 'a', 'reserve'])
  })

  it('queries and orders a large roster without rebuilding the personnel projections', () => {
    const records = Array.from({ length: 1000 }, (_, index) => ({
      ...baseRecord,
      id: `agent-${String(index).padStart(4, '0')}`,
      searchText: index % 2 === 0 ? 'medic north' : 'medic south',
    })).reverse()
    const start = performance.now()
    const matches = evaluatePersonnelQuery(
      records,
      { ...defaults, q: 'north' },
      { primary: 'name' }
    )
    expect(performance.now() - start).toBeLessThan(500)
    expect(matches).toHaveLength(500)
    expect(matches[0]).toBe('agent-0000')
    expect(matches.at(-1)).toBe('agent-0998')
  })
})
