import { describe, expect, it } from 'vitest'
import {
  ARCHIVE_LEAD_RESEARCH_PROJECT,
  RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION,
  analyzeResearchProjectSolvability,
  validateResearchProjectDefinition,
  type ResearchProjectDefinition,
} from '../domain/researchProjectDefinition'

function cloneFixture(
  overrides: Partial<ResearchProjectDefinition> = {}
): ResearchProjectDefinition {
  return {
    ...ARCHIVE_LEAD_RESEARCH_PROJECT,
    ...overrides,
    sources: overrides.sources ?? ARCHIVE_LEAD_RESEARCH_PROJECT.sources.map((s) => ({ ...s })),
    milestones:
      overrides.milestones ??
      ARCHIVE_LEAD_RESEARCH_PROJECT.milestones.map((m) => ({
        ...m,
        eligibility: { ...m.eligibility },
        outputs: m.outputs.map((o) => ({ ...o })),
      })),
    closureRequirement: {
      mandatoryFindingIds: [
        ...(overrides.closureRequirement?.mandatoryFindingIds ??
          ARCHIVE_LEAD_RESEARCH_PROJECT.closureRequirement.mandatoryFindingIds),
      ],
    },
  }
}

describe('validateResearchProjectDefinition', () => {
  it('accepts the archive-lead fixture with multiple sources and milestones', () => {
    const result = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.definition.schemaVersion).toBe(RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION)
    expect(result.definition.sources).toHaveLength(2)
    expect(result.definition.milestones.length).toBeGreaterThan(1)
    expect(result.solvability).toBe('feasible')
    expect(result.diagnostics).toEqual([])
  })

  it('validates finite analytical capacity independently of runtime consumption', () => {
    const result = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.definition.sources[0]?.analyticalCapacity).toBe(4)
    expect(result.definition.sources[1]?.analyticalCapacity).toBe(3)
  })

  it('distinguishes mandatory from optional findings', () => {
    const result = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const kinds = result.definition.milestones.map((m) => m.findingKind)
    expect(kinds).toContain('mandatory')
    expect(kinds).toContain('optional')
  })

  it('requires typed owner-routed outputs without mutating foreign state', () => {
    const result = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(
      result.definition.milestones.some((m) =>
        m.outputs.some((o) => o.kind === 'request_owner_routed_state_change')
      )
    ).toBe(true)
  })

  it('rejects duplicate source ids', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        sources: [
          { sourceId: 'source.archive-index', analyticalCapacity: 2 },
          { sourceId: 'source.archive-index', analyticalCapacity: 1 },
        ],
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'duplicate_source_id')).toBe(true)
  })

  it('rejects duplicate milestone ids', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        milestones: [
          ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[0]!,
          {
            ...ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[1]!,
            milestoneId: ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[0]!.milestoneId,
            findingId: 'finding.other',
          },
        ],
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'duplicate_milestone_id')).toBe(true)
  })

  it('rejects unknown source references on milestones', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        milestones: [
          {
            ...ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[0]!,
            eligibility: { requiredSourceIds: ['source.missing'] },
          },
        ],
        closureRequirement: { mandatoryFindingIds: ['finding.catalog-hit'] },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'invalid_source_reference')).toBe(true)
  })

  it('rejects unreachable mandatory completion', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        milestones: [
          {
            milestoneId: 'milestone.orphan',
            findingId: 'finding.orphan',
            findingKind: 'mandatory',
            eligibility: {
              requiredSourceIds: ['source.archive-index'],
              prerequisiteMilestoneIds: ['milestone.does-not-exist'],
            },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.orphan' }],
          },
        ],
        closureRequirement: { mandatoryFindingIds: ['finding.orphan'] },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(
      result.diagnostics.some(
        (d) => d.code === 'invalid_milestone_reference' || d.code === 'unreachable_mandatory'
      )
    ).toBe(true)
  })

  it('rejects mandatory requirements that exceed hard opportunity capacity bounds', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        hardOpportunityBounds: { maxAnalyticalCapacityTotal: 1 },
      })
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'hard_bounds_infeasible')).toBe(true)
  })

  it('rejects hard availability windows that put any mandatory milestone outside', () => {
    const allOutside = validateResearchProjectDefinition(
      cloneFixture({
        hardOpportunityBounds: {
          availabilityWindow: { startOrder: 10, endOrder: 12 },
        },
      })
    )
    expect(allOutside.ok).toBe(false)
    if (allOutside.ok) return
    expect(allOutside.diagnostics.some((d) => d.code === 'hard_window_infeasible')).toBe(true)

    const oneOutside = validateResearchProjectDefinition(
      cloneFixture({
        hardOpportunityBounds: {
          availabilityWindow: { startOrder: 1, endOrder: 1 },
        },
      })
    )
    expect(oneOutside.ok).toBe(false)
    if (oneOutside.ok) return
    expect(oneOutside.diagnostics.some((d) => d.code === 'hard_window_infeasible')).toBe(true)
  })

  it('accepts an alternate authored route when another route is unavailable', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        sources: [
          { sourceId: 'source.primary', analyticalCapacity: 0, analysisCost: 0 },
          { sourceId: 'source.alternate', analyticalCapacity: 5, analysisCost: 2 },
        ],
        milestones: [
          {
            milestoneId: 'milestone.primary-dead',
            findingId: 'finding.dead',
            findingKind: 'optional',
            eligibility: { requiredSourceIds: ['source.primary'], minAnalyticalSpend: 1 },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.dead' }],
          },
          {
            milestoneId: 'milestone.alternate',
            findingId: 'finding.required',
            findingKind: 'mandatory',
            eligibility: { requiredSourceIds: ['source.alternate'] },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.required' }],
          },
        ],
        closureRequirement: { mandatoryFindingIds: ['finding.required'] },
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.solvability).toBe('feasible')
  })

  it('returns runtime_dependent when mandatory eligibility needs mutable runtime conditions', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        milestones: [
          {
            milestoneId: 'milestone.staffed',
            findingId: 'finding.staffed',
            findingKind: 'mandatory',
            eligibility: {
              requiredSourceIds: ['source.archive-index'],
              requiresRuntimeConditions: true,
            },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.staffed' }],
          },
        ],
        closureRequirement: { mandatoryFindingIds: ['finding.staffed'] },
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.solvability).toBe('runtime_dependent')
    expect(result.diagnostics.some((d) => d.code === 'runtime_dependent')).toBe(true)
  })

  it('keeps feasible when only an optional milestone is runtime-dependent', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        milestones: [
          ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[0]!,
          ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[1]!,
          {
            milestoneId: 'milestone.optional-runtime',
            findingId: 'finding.optional-runtime',
            findingKind: 'optional',
            eligibility: {
              requiredSourceIds: ['source.field-notes'],
              requiresRuntimeConditions: true,
            },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.optional-runtime' }],
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.solvability).toBe('feasible')
  })

  it('rejects static mandatory blockers even when runtime-dependent prerequisites are listed first', () => {
    const validateWithPrerequisites = (prerequisiteMilestoneIds: readonly string[]) =>
      validateResearchProjectDefinition(
        cloneFixture({
          sources: [{ sourceId: 'source.valid', analyticalCapacity: 4 }],
          milestones: [
            {
              milestoneId: 'milestone.runtime-gate',
              findingId: 'finding.runtime-gate',
              findingKind: 'optional',
              eligibility: { requiresRuntimeConditions: true },
              outputs: [{ kind: 'reveal_finding', targetRef: 'finding.runtime-gate' }],
            },
            {
              milestoneId: 'milestone.cycle-a',
              findingId: 'finding.cycle-a',
              findingKind: 'optional',
              eligibility: { prerequisiteMilestoneIds: ['milestone.cycle-b'] },
              outputs: [{ kind: 'reveal_finding', targetRef: 'finding.cycle-a' }],
            },
            {
              milestoneId: 'milestone.cycle-b',
              findingId: 'finding.cycle-b',
              findingKind: 'optional',
              eligibility: { prerequisiteMilestoneIds: ['milestone.cycle-a'] },
              outputs: [{ kind: 'reveal_finding', targetRef: 'finding.cycle-b' }],
            },
            {
              milestoneId: 'milestone.required',
              findingId: 'finding.required',
              findingKind: 'mandatory',
              eligibility: {
                requiredSourceIds: ['source.valid'],
                prerequisiteMilestoneIds,
              },
              outputs: [{ kind: 'reveal_finding', targetRef: 'finding.required' }],
            },
          ],
          closureRequirement: { mandatoryFindingIds: ['finding.required'] },
        })
      )

    for (const result of [
      validateWithPrerequisites(['milestone.runtime-gate', 'milestone.cycle-a']),
      validateWithPrerequisites(['milestone.cycle-a', 'milestone.runtime-gate']),
    ]) {
      expect(result.ok).toBe(false)
      if (result.ok) continue
      expect(result.solvability).toBe('infeasible')
      expect(result.diagnostics.some((d) => d.code === 'unreachable_mandatory')).toBe(true)
    }
  })

  it('accepts unreachable optional findings when mandatory routes remain feasible', () => {
    const result = validateResearchProjectDefinition(
      cloneFixture({
        milestones: [
          ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[0]!,
          ARCHIVE_LEAD_RESEARCH_PROJECT.milestones[1]!,
          {
            milestoneId: 'milestone.optional-blocked',
            findingId: 'finding.optional-blocked',
            findingKind: 'optional',
            eligibility: {
              requiredSourceIds: ['source.field-notes'],
              prerequisiteMilestoneIds: ['milestone.optional-blocked'],
            },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.optional-blocked' }],
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.solvability).toBe('feasible')
  })

  it('does not classify source capacity exhaustion as destruction or custody loss', () => {
    const result = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const blob = JSON.stringify(result)
    expect(blob).not.toMatch(/destroyed|inaccessible|unauthentic|uncustodied/i)
    expect(result.definition.sources.every((s) => s.analyticalCapacity >= 0)).toBe(true)
  })

  it('validates timed-event bindings structurally without owning SPE-1287 lifecycle', () => {
    const result = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.definition.timedEventBindingIds).toEqual(['timed.research-archive-window'])

    const bad = validateResearchProjectDefinition(cloneFixture({ timedEventBindingIds: ['  '] }))
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.diagnostics.some((d) => d.code === 'invalid_timed_event_binding')).toBe(true)
  })

  it('produces byte-stable diagnostics for identical authored inputs', () => {
    const a = validateResearchProjectDefinition(
      cloneFixture({ hardOpportunityBounds: { maxAnalyticalCapacityTotal: 0 } })
    )
    const b = validateResearchProjectDefinition(
      cloneFixture({ hardOpportunityBounds: { maxAnalyticalCapacityTotal: 0 } })
    )
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('analyzeResearchProjectSolvability', () => {
  it('marks insufficient total capacity as unreachable mandatory', () => {
    const analysis = analyzeResearchProjectSolvability(
      cloneFixture({
        sources: [{ sourceId: 'source.archive-index', analyticalCapacity: 0, analysisCost: 5 }],
        milestones: [
          {
            milestoneId: 'milestone.only',
            findingId: 'finding.only',
            findingKind: 'mandatory',
            eligibility: {
              requiredSourceIds: ['source.archive-index'],
              minAnalyticalSpend: 5,
            },
            outputs: [{ kind: 'reveal_finding', targetRef: 'finding.only' }],
          },
        ],
        closureRequirement: { mandatoryFindingIds: ['finding.only'] },
      })
    )
    expect(analysis.status).toBe('infeasible')
    expect(analysis.diagnostics.some((d) => d.code === 'unreachable_mandatory')).toBe(true)
  })
})
