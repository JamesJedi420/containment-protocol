import { describe, expect, it } from 'vitest'

import { hydrateGame, sanitizeCasesMap } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  normalizeCaseInstance,
  sanitizeCaseLifecycleInstitutionalLabel,
} from '../domain/case/normalizeCase'
import { createStartingState } from '../data/startingState'
import { starterCases } from '../domain/templates/startingCases'

describe('caseLifecycleInstitutionalLabel persistence (SPE-1310 slice 6)', () => {
  it('sanitizeCaseLifecycleInstitutionalLabel accepts valid labels and drops unknown strings', () => {
    expect(sanitizeCaseLifecycleInstitutionalLabel('preliminary_intake', undefined)).toBe(
      'preliminary_intake'
    )
    expect(sanitizeCaseLifecycleInstitutionalLabel('active_anomaly_file', undefined)).toBe(
      'active_anomaly_file'
    )
    expect(
      sanitizeCaseLifecycleInstitutionalLabel('presumed_clear_surveillance_obligations', undefined)
    ).toBe('presumed_clear_surveillance_obligations')
    expect(sanitizeCaseLifecycleInstitutionalLabel('bogus', undefined)).toBeUndefined()
    expect(sanitizeCaseLifecycleInstitutionalLabel(42, undefined)).toBeUndefined()
    expect(sanitizeCaseLifecycleInstitutionalLabel(undefined, 'preliminary_intake')).toBe(
      'preliminary_intake'
    )
  })

  it('normalizeCaseInstance drops invalid lifecycleInstitutionalLabel without fallback backfill', () => {
    const fallback = createStartingState()
    const caseId = 'case-lifecycle-invalid-label'
    const seed = fallback.cases['case-001']!

    const normalized = normalizeCaseInstance(
      caseId,
      {
        ...seed,
        id: caseId,
        lifecycleInstitutionalLabel: 'bogus',
      },
      seed,
      { week: 1, teams: fallback.teams }
    )

    expect(normalized.lifecycleInstitutionalLabel).toBeUndefined()
  })

  it('starter cases default lifecycleInstitutionalLabel to preliminary_intake', () => {
    for (const starterCase of Object.values(starterCases)) {
      expect(starterCase.lifecycleInstitutionalLabel).toBe('preliminary_intake')
    }
  })

  it('round-trips lifecycleInstitutionalLabel byte-stable through save/load when present', () => {
    const state = createStartingState()
    const caseId = 'case-001'

    state.cases[caseId] = {
      ...state.cases[caseId]!,
      lifecycleStage: 'containment',
      lifecycleInstitutionalLabel: 'active_anomaly_file',
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.cases[caseId]?.lifecycleInstitutionalLabel).toBe('active_anomaly_file')
  })

  it('sanitizeCasesMap drops invalid lifecycleInstitutionalLabel during hydrate', () => {
    const fallback = createStartingState()
    const caseId = 'case-hydrate-invalid-label'
    const seed = fallback.cases['case-001']!

    const sanitized = sanitizeCasesMap(
      {
        [caseId]: {
          ...seed,
          id: caseId,
          lifecycleInstitutionalLabel: 'bogus',
        },
      },
      fallback.teams,
      1,
      fallback.cases
    )

    expect(sanitized[caseId]?.lifecycleInstitutionalLabel).toBeUndefined()
  })

  it('hydrateGame preserves valid lifecycleInstitutionalLabel on cases', () => {
    const fallback = createStartingState()
    const caseId = 'case-hydrate-valid-label'
    const seed = fallback.cases['case-001']!

    const hydrated = hydrateGame({
      ...fallback,
      cases: {
        [caseId]: {
          ...seed,
          id: caseId,
          lifecycleStage: 'revision',
          lifecycleInstitutionalLabel: 'procedure_revision_hold',
        },
      },
    })

    expect(hydrated.cases[caseId]?.lifecycleInstitutionalLabel).toBe('procedure_revision_hold')
  })
})
