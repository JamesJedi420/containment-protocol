import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  assertInvestigationNamingHazardViewsDoNotLeakTrueNames,
  buildInvestigationNamingHazardDescriptorViews,
} from '../domain/investigationNamingHazardSubstitution'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
} from '../domain/namingHazardDescriptorRegistry'

const CANAL_BRIDGE_TOPIC = 'topic:canal-bridge-incident'

function createInProgressCase(overrides: Partial<ReturnType<typeof createStarterCase>> = {}) {
  return {
    ...createStarterCase({ id: 'case-canal-bridge', templateId: 'ops-003' }),
    status: 'in_progress' as const,
    tags: [CANAL_BRIDGE_TOPIC],
    requiredTags: [],
    preferredTags: [],
    ...overrides,
  }
}

describe('investigationNamingHazardSubstitution (SPE-2116 slice 3)', () => {
  it('returns empty views when naming-hazard map is empty', () => {
    const game = createStartingState()
    game.cases['case-canal-bridge'] = createInProgressCase()

    expect(buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-canal-bridge']!)).toEqual(
      []
    )
  })

  it('routes descriptors via intake topic cross-link keys', () => {
    const game = createStartingState()
    game.cases['case-canal-bridge'] = createInProgressCase()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const views = buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-canal-bridge']!)

    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({
      descriptorId: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id,
      topicRef: CANAL_BRIDGE_TOPIC,
      safeLabel: 'East canal approach lane',
      redacted: false,
      usedGridFallback: false,
    })
    expect(views[0]?.summary).toContain('east canal lock intake')
  })

  it('never leaks true names when trueNameForbidden is set', () => {
    const game = createStartingState()
    game.cases['case-canal-bridge'] = createInProgressCase()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const views = buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-canal-bridge']!)

    expect(views[0]?.safeLabel).not.toBe(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.label)
    expect(
      assertInvestigationNamingHazardViewsDoNotLeakTrueNames(
        views,
        game.namingHazardDescriptorRecords
      )
    ).toBe(true)
  })

  it('uses grid fallback when descriptor pool is unavailable on map-style projection', () => {
    const game = createStartingState()
    game.cases['case-grid-fallback'] = createInProgressCase({
      id: 'case-grid-fallback',
      tags: [CANAL_BRIDGE_TOPIC],
      route: 'GRID-NE-14',
    })
    game.namingHazardDescriptorRecords = {
      [DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]: {
        ...DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
        intakeTopicRef: CANAL_BRIDGE_TOPIC,
        safeDescriptorPool: [],
      },
    }

    const views = buildInvestigationNamingHazardDescriptorViews(
      game,
      game.cases['case-grid-fallback']!,
      'map'
    )

    expect(views[0]?.safeLabel).toBe('GRID-NE-14')
    expect(views[0]?.usedGridFallback).toBe(true)
  })

  it('projects redacted labels when policy requires redaction', () => {
    const game = createStartingState()
    game.cases['case-redacted'] = createInProgressCase({
      id: 'case-redacted',
      tags: [CANAL_BRIDGE_TOPIC],
    })
    game.namingHazardDescriptorRecords = {
      'naming-hazard:redacted-site': {
        ...COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
        id: 'naming-hazard:redacted-site',
        intakeTopicRef: CANAL_BRIDGE_TOPIC,
        uiSubstitutionPolicy: 'redacted',
      },
    }

    const views = buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-redacted']!)

    expect(views[0]?.safeLabel).toBe('[REDACTED]')
    expect(views[0]?.redacted).toBe(true)
  })

  it('is byte-stable on repeated projection', () => {
    const game = createStartingState()
    game.cases['case-canal-bridge'] = createInProgressCase()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const first = buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-canal-bridge']!)
    const second = buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-canal-bridge']!)

    expect(first).toEqual(second)
  })

  it('ignores descriptors without matching topic keys', () => {
    const game = createStartingState()
    game.cases['case-unrelated'] = createInProgressCase({
      id: 'case-unrelated',
      tags: ['topic:unrelated'],
    })
    game.namingHazardDescriptorRecords = {
      [COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id]: COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
    }

    expect(buildInvestigationNamingHazardDescriptorViews(game, game.cases['case-unrelated']!)).toEqual([])
  })
})
