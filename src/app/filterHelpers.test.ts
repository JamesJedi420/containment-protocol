// cspell:words watchlist
import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  DEFAULT_AGENT_LIST_FILTERS,
  readAgentListFilters,
  writeAgentListFilters,
} from '../features/agents/agentListView'
import {
  DEFAULT_CASE_LIST_FILTERS,
  readCaseListFilters,
  writeCaseListFilters,
} from '../features/cases/caseView'
import {
  DEFAULT_EVENT_FEED_FILTERS,
  readEventFeedFilters,
  writeEventFeedFilters,
} from '../features/dashboard/eventFeedView'
import {
  DEFAULT_INTEL_FILTERS,
  readIntelFilters,
  writeIntelFilters,
} from '../features/intel/intelView'
import {
  DEFAULT_MARKET_FILTERS,
  readMarketFilters,
  writeMarketFilters,
} from '../features/market/marketView'
import {
  DEFAULT_RECRUITMENT_LIST_FILTERS,
  readRecruitmentListFilters,
  writeRecruitmentListFilters,
} from '../features/recruitment/recruitmentListView'
import {
  DEFAULT_REGISTRY_LIST_FILTERS,
  readRegistryListFilters,
  writeRegistryListFilters,
} from '../features/registry/registryListView'
import {
  DEFAULT_TEAM_LIST_FILTERS,
  readTeamListFilters,
  writeTeamListFilters,
} from '../features/teams/teamView'
import {
  DEFAULT_TRAINING_LIST_FILTERS,
  readTrainingListFilters,
  writeTrainingListFilters,
} from '../features/training/trainingView'

describe('filter helper read/write contracts', () => {
  it('agent helpers parse team safely and preserve unrelated params', () => {
    const game = createStartingState()
    const knownTeamId = Object.keys(game.teams)[0]!

    const filters = readAgentListFilters(
      game,
      new URLSearchParams(`q=  Alex  &team=${knownTeamId}&role=hunter&status=injured`)
    )

    expect(filters).toMatchObject({
      q: 'Alex',
      team: knownTeamId,
      role: 'hunter',
      status: 'injured',
    })

    const invalidTeam = readAgentListFilters(game, new URLSearchParams('team=ghost-team'))
    expect(invalidTeam.team).toBe(DEFAULT_AGENT_LIST_FILTERS.team)

    const output = writeAgentListFilters(
      {
        ...DEFAULT_AGENT_LIST_FILTERS,
        q: '  Field Ops  ',
        team: 'unassigned',
        training: 'training',
      },
      new URLSearchParams('tab=roster')
    )

    expect(output.get('tab')).toBe('roster')
    expect(output.get('q')).toBe('Field Ops')
    expect(output.get('team')).toBe('unassigned')
    expect(output.get('training')).toBe('training')
    expect(output.has('role')).toBe(false)
  })

  it('team helpers fallback to defaults and omit default params when writing', () => {
    const read = readTeamListFilters(
      new URLSearchParams('assignment=invalid&fatigue=critical&sort=name')
    )

    expect(read).toEqual({
      q: '',
      assignment: DEFAULT_TEAM_LIST_FILTERS.assignment,
      fatigue: 'critical',
      sort: 'name',
    })

    const output = writeTeamListFilters(
      {
        ...DEFAULT_TEAM_LIST_FILTERS,
        q: 'night watch',
        assignment: 'assigned',
      },
      new URLSearchParams('tab=teams')
    )

    expect(output.get('tab')).toBe('teams')
    expect(output.get('q')).toBe('night watch')
    expect(output.get('assignment')).toBe('assigned')
    expect(output.has('fatigue')).toBe(false)
    expect(output.has('sort')).toBe(false)
  })

  it('case helpers parse risk boolean and keep only canonical non-default keys', () => {
    const read = readCaseListFilters(
      new URLSearchParams('q=  breach  &status=open&mode=threshold&stage=4&sort=deadline&risk=1')
    )

    expect(read).toEqual({
      q: 'breach',
      status: 'open',
      mode: 'threshold',
      stage: '4',
      sort: 'deadline',
      risk: true,
    })

    const riskDisabled = readCaseListFilters(new URLSearchParams('risk=0'))
    expect(riskDisabled.risk).toBe(false)

    const output = writeCaseListFilters(
      {
        ...DEFAULT_CASE_LIST_FILTERS,
        mode: 'deterministic',
        risk: true,
      },
      new URLSearchParams('tab=ops')
    )

    expect(output.get('tab')).toBe('ops')
    expect(output.get('mode')).toBe('deterministic')
    expect(output.get('risk')).toBe('1')
    expect(output.has('status')).toBe(false)
    expect(output.has('sort')).toBe(false)
  })

  it('case helper serialization round-trips to canonical URL params', () => {
    const original = {
      ...DEFAULT_CASE_LIST_FILTERS,
      q: '  raid pressure  ',
      status: 'open' as const,
      mode: 'threshold' as const,
      stage: '4' as const,
      sort: 'deadline' as const,
      risk: true,
    }

    const serialized = writeCaseListFilters(original)
    const roundTrip = readCaseListFilters(serialized)

    expect(roundTrip).toEqual({
      ...DEFAULT_CASE_LIST_FILTERS,
      q: 'raid pressure',
      status: 'open',
      mode: 'threshold',
      stage: '4',
      sort: 'deadline',
      risk: true,
    })
  })

  it('training helpers round-trip and preserve unrelated params', () => {
    const read = readTrainingListFilters(
      new URLSearchParams('q=  squad  &readiness=training&queueScope=team&sort=name')
    )

    expect(read).toEqual({
      q: 'squad',
      readiness: 'training',
      queueScope: 'team',
      sort: 'name',
    })

    const fallback = readTrainingListFilters(
      new URLSearchParams('readiness=bogus&queueScope=bad&sort=nope')
    )
    expect(fallback).toEqual(DEFAULT_TRAINING_LIST_FILTERS)

    const output = writeTrainingListFilters(
      {
        ...DEFAULT_TRAINING_LIST_FILTERS,
        q: '  queue watch  ',
        readiness: 'deployed',
        queueScope: 'team',
        sort: 'name',
      },
      new URLSearchParams('tab=training')
    )

    expect(output.get('tab')).toBe('training')
    expect(output.get('q')).toBe('queue watch')
    expect(output.get('readiness')).toBe('deployed')
    expect(output.get('queueScope')).toBe('team')
    expect(output.get('sort')).toBe('name')

    const roundTrip = readTrainingListFilters(output)
    expect(roundTrip).toEqual({
      ...DEFAULT_TRAINING_LIST_FILTERS,
      q: 'queue watch',
      readiness: 'deployed',
      queueScope: 'team',
      sort: 'name',
    })
  })

  it('intel helpers enforce requiredTag length cap and raid toggle semantics', () => {
    const longTag = 'x'.repeat(100)

    const read = readIntelFilters(
      new URLSearchParams(
        `mode=probability&kind=raid&pressure=critical&requiredTag=${longTag}&raidCapable=1`
      )
    )

    expect(read.mode).toBe('probability')
    expect(read.kind).toBe('raid')
    expect(read.pressure).toBe('critical')
    expect(read.raidCapable).toBe(true)
    expect(read.requiredTag).toHaveLength(40)

    const fallback = readIntelFilters(new URLSearchParams('mode=bogus&kind=??&pressure=nope'))
    expect(fallback.mode).toBe(DEFAULT_INTEL_FILTERS.mode)
    expect(fallback.kind).toBe(DEFAULT_INTEL_FILTERS.kind)
    expect(fallback.pressure).toBe(DEFAULT_INTEL_FILTERS.pressure)

    const output = writeIntelFilters(
      {
        ...DEFAULT_INTEL_FILTERS,
        q: 'signal',
        raidCapable: true,
      },
      new URLSearchParams('tab=intel')
    )

    expect(output.get('tab')).toBe('intel')
    expect(output.get('q')).toBe('signal')
    expect(output.get('raidCapable')).toBe('1')
    expect(output.has('mode')).toBe(false)
  })

  it('market helpers parse enums and preserve unrelated params while omitting defaults', () => {
    const read = readMarketFilters(
      new URLSearchParams('q=  med  &category=material&sort=price-desc')
    )

    expect(read).toEqual({
      q: 'med',
      category: 'material',
      sort: 'price-desc',
    })

    const fallback = readMarketFilters(new URLSearchParams('category=bad&sort=nope'))
    expect(fallback.category).toBe(DEFAULT_MARKET_FILTERS.category)
    expect(fallback.sort).toBe(DEFAULT_MARKET_FILTERS.sort)

    const output = writeMarketFilters(
      {
        ...DEFAULT_MARKET_FILTERS,
        category: 'featured',
      },
      new URLSearchParams('tab=procurement')
    )

    expect(output.get('tab')).toBe('procurement')
    expect(output.get('category')).toBe('featured')
    expect(output.has('sort')).toBe(false)
    expect(output.has('q')).toBe(false)
  })

  it('registry helpers read and write only normalized q while preserving base params', () => {
    const game = createStartingState()
    const read = readRegistryListFilters(game, new URLSearchParams('q=%20%20Agent%20One%20%20'))
    expect(read).toEqual({
      ...DEFAULT_REGISTRY_LIST_FILTERS,
      q: 'Agent One',
    })

    const output = writeRegistryListFilters(
      { ...DEFAULT_REGISTRY_LIST_FILTERS, q: '  field  office  ' },
      new URLSearchParams('tab=registry')
    )

    expect(output.get('q')).toBe('field office')
    expect(output.get('tab')).toBe('registry')
  })

  it('recruitment helpers parse expiring flag and remove it when false', () => {
    const read = readRecruitmentListFilters(
      new URLSearchParams('q=  avery  &category=agent&sort=overall&expiring=1')
    )

    expect(read).toEqual({
      q: 'avery',
      category: 'agent',
      sort: 'overall',
      expiringSoonOnly: true,
    })

    const output = writeRecruitmentListFilters(
      {
        ...DEFAULT_RECRUITMENT_LIST_FILTERS,
        category: 'staff',
        expiringSoonOnly: false,
      },
      new URLSearchParams('tab=recruitment&expiring=1')
    )

    expect(output.get('tab')).toBe('recruitment')
    expect(output.get('category')).toBe('staff')
    expect(output.has('expiring')).toBe(false)
    expect(output.has('sort')).toBe(false)
  })

  it('event feed helpers parse week bounds and canonicalize invalid values', () => {
    const read = readEventFeedFilters(
      new URLSearchParams(
        'feedQ=  Incident  &feedCategory=incident_response&feedSource=incident&feedType=case.failed&feedWeekMin=2.9&feedWeekMax=8.2&feedEntity= case-001 '
      )
    )

    expect(read).toEqual({
      query: 'Incident',
      category: 'incident_response',
      sourceSystem: 'incident',
      type: 'case.failed',
      relationshipVerbosity: 'summary',
      weekMin: 2,
      weekMax: 8,
      entityId: 'case-001',
    })

    const invalidWeeks = readEventFeedFilters(
      new URLSearchParams(
        'feedWeekMin=0&feedWeekMax=-3&feedCategory=nope&feedSource=bad&feedType=unknown'
      )
    )

    expect(invalidWeeks.category).toBe(DEFAULT_EVENT_FEED_FILTERS.category)
    expect(invalidWeeks.sourceSystem).toBe(DEFAULT_EVENT_FEED_FILTERS.sourceSystem)
    expect(invalidWeeks.type).toBe(DEFAULT_EVENT_FEED_FILTERS.type)
    expect(invalidWeeks.relationshipVerbosity).toBe(
      DEFAULT_EVENT_FEED_FILTERS.relationshipVerbosity
    )
    expect(invalidWeeks.weekMin).toBeUndefined()
    expect(invalidWeeks.weekMax).toBeUndefined()

    const output = writeEventFeedFilters(
      {
        ...DEFAULT_EVENT_FEED_FILTERS,
        query: '  watchlist  ',
        sourceSystem: 'agent',
        weekMin: 5.9,
        weekMax: Number.NaN,
        entityId: '  agent-01  ',
      },
      new URLSearchParams('tab=dashboard&feedWeekMax=10')
    )

    expect(output.get('tab')).toBe('dashboard')
    expect(output.get('feedQ')).toBe('watchlist')
    expect(output.get('feedSource')).toBe('agent')
    expect(output.get('feedWeekMin')).toBe('5')
    expect(output.has('feedWeekMax')).toBe(false)
    expect(output.get('feedEntity')).toBe('agent-01')
    expect(output.has('feedCategory')).toBe(false)
    expect(output.has('feedType')).toBe(false)
    expect(output.has('feedRelVerbosity')).toBe(false)
  })
})
