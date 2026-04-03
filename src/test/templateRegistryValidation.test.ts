import { describe, expect, it } from 'vitest'
import type { CaseTemplate } from '../domain/models'
import {
  getCaseTemplateCatalogErrors,
  getCaseTemplateCatalogDiagnostics,
} from '../domain/templates'

const makeTemplate = (
  templateId: string,
  overrides: Partial<CaseTemplate> = {}
): CaseTemplate => ({
  templateId,
  title: templateId,
  description: `${templateId} description`,
  mode: 'threshold',
  kind: 'case',
  difficulty: { combat: 10, investigation: 10, utility: 10, social: 10 },
  weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
  durationWeeks: 2,
  deadlineWeeks: 3,
  tags: ['tier-1'],
  requiredTags: [],
  preferredTags: [],
  onFail: {
    stageDelta: 1,
    spawnCount: { min: 0, max: 0 },
    spawnTemplateIds: [],
  },
  onUnresolved: {
    stageDelta: 1,
    spawnCount: { min: 0, max: 0 },
    spawnTemplateIds: [],
  },
  ...overrides,
})

describe('templateRegistryValidation', () => {
  it('collects structural catalog errors as diagnostics', () => {
    const templates = [
      makeTemplate('a', {
        onFail: {
          stageDelta: 1,
          spawnCount: { min: 1, max: 1 },
          spawnTemplateIds: ['missing-target'],
        },
      }),
    ]

    const errors = getCaseTemplateCatalogErrors(templates)
    const diagnostics = getCaseTemplateCatalogDiagnostics(templates, { errors })

    expect(errors.length).toBeGreaterThan(0)
    expect(diagnostics.errors).toEqual(errors)
    expect(diagnostics.diagnostics.some((entry) => entry.severity === 'error')).toBe(true)
  })

  it('reports duplicate tags across semantic lists as warnings', () => {
    const templates = [
      makeTemplate('dup-tags', {
        tags: ['tier-1', 'occult'],
        requiredTags: ['occult'],
      }),
    ]

    const diagnostics = getCaseTemplateCatalogDiagnostics(templates)

    expect(diagnostics.warnings.some((message) => message.includes('multiple lists'))).toBe(true)
    expect(
      diagnostics.diagnostics.some((entry) => entry.code === 'duplicate_tag_across_lists')
    ).toBe(true)
  })

  it('computes reachability from provided entry template ids', () => {
    const templates = [
      makeTemplate('entry', {
        onUnresolved: {
          stageDelta: 1,
          spawnCount: { min: 1, max: 1 },
          spawnTemplateIds: ['linked'],
        },
      }),
      makeTemplate('linked'),
      makeTemplate('orphan'),
    ]

    const diagnostics = getCaseTemplateCatalogDiagnostics(templates, {
      entryTemplateIds: ['entry'],
    })

    expect(diagnostics.reachability.entryTemplateIds).toEqual(['entry'])
    expect(diagnostics.reachability.reachableTemplateIds).toEqual(['entry', 'linked'])
    expect(diagnostics.reachability.unreachableTemplateIds).toEqual(['orphan'])
    expect(
      diagnostics.diagnostics.some((entry) => entry.code === 'unreachable_templates')
    ).toBe(true)
  })

  it('flags unsatisfied hard gates when capability sets are provided', () => {
    const templates = [
      makeTemplate('hard-gated', {
        requiredRoles: ['investigator'],
        requiredTags: ['occultist'],
      }),
    ]

    const diagnostics = getCaseTemplateCatalogDiagnostics(templates, {
      capabilitySets: [new Set(['tactical', 'tech'])],
    })

    expect(
      diagnostics.diagnostics.some((entry) => entry.code === 'hard_gate_unsatisfied')
    ).toBe(true)
  })
})
