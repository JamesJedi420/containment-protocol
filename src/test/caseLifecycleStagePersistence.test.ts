import { describe, expect, it } from 'vitest'

import { hydrateGame, sanitizeCasesMap } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  normalizeCaseInstance,
  sanitizeCaseLifecycleStage,
} from '../domain/case/normalizeCase'
import { createStartingState } from '../data/startingState'
import { starterCases } from '../domain/templates/startingCases'

describe('caseLifecycleStage persistence (SPE-1310 slice 2)', () => {
  it('sanitizeCaseLifecycleStage accepts valid stages and drops unknown strings', () => {
    expect(sanitizeCaseLifecycleStage('lead', undefined)).toBe('lead')
    expect(sanitizeCaseLifecycleStage('confirmation', undefined)).toBe('confirmation')
    expect(sanitizeCaseLifecycleStage('containment', undefined)).toBe('containment')
    expect(sanitizeCaseLifecycleStage('revision', undefined)).toBe('revision')
    expect(sanitizeCaseLifecycleStage('presumed_neutralized', undefined)).toBe(
      'presumed_neutralized'
    )
    expect(sanitizeCaseLifecycleStage('bogus', undefined)).toBeUndefined()
    expect(sanitizeCaseLifecycleStage(42, undefined)).toBeUndefined()
    expect(sanitizeCaseLifecycleStage(undefined, 'lead')).toBe('lead')
  })

  it('normalizeCaseInstance drops invalid lifecycleStage without coercing to lead', () => {
    const fallback = createStartingState()
    const caseId = 'case-lifecycle-invalid'
    const seed = fallback.cases['case-001']!

    const normalized = normalizeCaseInstance(
      caseId,
      {
        ...seed,
        id: caseId,
        lifecycleStage: 'bogus',
      },
      seed,
      { week: 1, teams: fallback.teams }
    )

    expect(normalized.lifecycleStage).toBeUndefined()
  })

  it('normalizeCaseInstance omits lifecycleStage when absent from persisted entry (no fallback backfill)', () => {
    const fallback = createStartingState()
    const caseId = 'case-lifecycle-absent'
    const seed = fallback.cases['case-001']!

    expect(seed.lifecycleStage).toBe('lead')

    const normalized = normalizeCaseInstance(
      caseId,
      {
        ...seed,
        id: caseId,
        lifecycleStage: undefined,
      },
      seed,
      { week: 1, teams: fallback.teams }
    )

    expect('lifecycleStage' in normalized).toBe(false)
  })

  it('starter cases default lifecycleStage to lead', () => {
    for (const starterCase of Object.values(starterCases)) {
      expect(starterCase.lifecycleStage).toBe('lead')
    }
  })

  it('round-trips lifecycleStage byte-stable through save/load when present', () => {
    const state = createStartingState()
    const caseId = 'case-001'

    state.cases[caseId] = {
      ...state.cases[caseId]!,
      lifecycleStage: 'confirmation',
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.cases[caseId]?.lifecycleStage).toBe('confirmation')
  })

  it('preserves cases without lifecycleStage byte-stable through save/load', () => {
    const state = createStartingState()
    const caseId = 'case-legacy-no-stage'
    const seed = state.cases['case-001']!

    for (const existingCase of Object.values(state.cases)) {
      delete existingCase.lifecycleStage
    }

    state.cases[caseId] = {
      ...seed,
      id: caseId,
      title: caseId,
      assignedTeamIds: [],
    }
    delete state.cases[caseId]!.lifecycleStage

    const serialized = serializeGameSave(state)
    const loaded = loadGameSave(serialized)

    expect(loaded.cases[caseId]?.lifecycleStage).toBeUndefined()
    expect(serialized).not.toContain('"lifecycleStage"')
    for (const hydratedCase of Object.values(loaded.cases)) {
      expect(hydratedCase.lifecycleStage).toBeUndefined()
    }
  })

  it('sanitizeCasesMap drops invalid lifecycleStage during hydrate', () => {
    const fallback = createStartingState()
    const caseId = 'case-hydrate-invalid-stage'
    const seed = fallback.cases['case-001']!

    const sanitized = sanitizeCasesMap(
      {
        [caseId]: {
          ...seed,
          id: caseId,
          lifecycleStage: 'open',
        },
      },
      fallback.teams,
      1,
      fallback.cases
    )

    expect(sanitized[caseId]?.lifecycleStage).toBeUndefined()
  })

  it('hydrates valid lifecycleStage through import parsing', () => {
    const fallback = createStartingState()
    const caseId = 'case-hydrate-valid-stage'
    const seed = fallback.cases['case-001']!

    const hydrated = hydrateGame(
      {
        ...fallback,
        cases: {
          [caseId]: {
            ...seed,
            id: caseId,
            lifecycleStage: 'containment',
          },
        },
      },
      fallback
    )

    expect(hydrated.cases[caseId]?.lifecycleStage).toBe('containment')
  })
})
