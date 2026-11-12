import { describe, expect, it } from 'vitest'
import {
  ARCHIVE_LEAD_RESEARCH_PROJECT,
  RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION,
  validateResearchProjectDefinition,
} from './researchProjectDefinition'
import type { ResearchProjectDefinition } from './researchProjectDefinition'
import {
  applyResearchExecutionTick,
  classifyResearchExecutionEntry,
  createEmptyResearchExecutionRuntime,
  interruptResearchExecution,
  parseResearchExecutionRuntime,
  resolveResearchThroughput,
  resumeResearchExecution,
  serializeResearchExecutionRuntime,
} from './researchThroughputExecution'
import type { ResearchCapabilityPacket } from './researchThroughputExecution'

const validatedArchive = validateResearchProjectDefinition(ARCHIVE_LEAD_RESEARCH_PROJECT)
const archiveDefinition = validatedArchive.ok ? validatedArchive.definition : ARCHIVE_LEAD_RESEARCH_PROJECT

function capability(overrides: Partial<ResearchCapabilityPacket> = {}): ResearchCapabilityPacket {
  return {
    domainScores: { analysis: 0.8, archives: 0.75 },
    requiredDomainIds: ['analysis'],
    difficulty: 1,
    facilityGates: [{ gateId: 'biohazard_lab', satisfied: true }],
    staffCompetencyRefs: [{ competencyId: 'analysis', score: 0.7 }],
    staffTimeCommitmentId: 'staff-commit-1',
    sourceInputRefs: [
      {
        sourceId: 'source.archive-index',
        available: true,
        quality: 0.9,
        priorKnowledgeBonus: 0.2,
      },
      {
        sourceId: 'source.field-notes',
        available: true,
        quality: 0.85,
        priorKnowledgeBonus: 0.1,
      },
    ],
    ...overrides,
  }
}

describe('classifyResearchExecutionEntry', () => {
  it('classifies trivial information without persistent criteria', () => {
    const result = classifyResearchExecutionEntry({
      capability: capability({
        staffTimeCommitmentId: undefined,
        staffCompetencyRefs: [],
        sourceInputRefs: [
          {
            sourceId: 'source.only',
            available: true,
            quality: 1,
            priorKnowledgeBonus: 0,
          },
        ],
      }),
    })
    expect(result.kind).toBe('trivial_information')
    expect(result.reasonCodes).toEqual([])
  })

  it('classifies persistent research for staged milestones and staff', () => {
    const result = classifyResearchExecutionEntry({
      definition: archiveDefinition,
      capability: capability(),
    })
    expect(result.kind).toBe('persistent_research')
    expect(result.reasonCodes).toContain('multiple_sources')
    expect(result.reasonCodes).toContain('staged_milestones')
    expect(result.reasonCodes).toContain('staff_allocation')
  })
})

describe('resolveResearchThroughput', () => {
  it('produces different throughput for different capability', () => {
    const high = resolveResearchThroughput({
      capability: capability({ domainScores: { analysis: 0.9 }, difficulty: 1 }),
    })
    const low = resolveResearchThroughput({
      capability: capability({ domainScores: { analysis: 0.5 }, difficulty: 1 }),
    })
    expect(high.progressDelta).toBeGreaterThan(low.progressDelta)
    expect(high.outcome).toBe('progressed')
  })

  it('blocks insufficient capability', () => {
    const result = resolveResearchThroughput({
      capability: capability({ domainScores: { analysis: 0.1 }, difficulty: 1 }),
    })
    expect(result.outcome).toBe('blocked')
    expect(result.reasonCodes).toContain('insufficient_capability')
    expect(result.progressDelta).toBe(0)
  })

  it('blocks staff time conflict', () => {
    const result = resolveResearchThroughput({
      capability: capability({ staffTimeCommitmentConflict: true }),
    })
    expect(result.outcome).toBe('blocked')
    expect(result.reasonCodes).toContain('staff_time_conflict')
  })

  it('blocks unsatisfied facility gate', () => {
    const result = resolveResearchThroughput({
      capability: capability({
        facilityGates: [{ gateId: 'lab', satisfied: false, reasonCodes: ['lab_offline'] }],
      }),
    })
    expect(result.outcome).toBe('blocked')
    expect(result.reasonCodes).toContain('facility_gate_unsatisfied')
  })

  it('applies knowledge and reproducible modifiers without bypassing gates', () => {
    const baseline = resolveResearchThroughput({
      capability: capability({
        sourceInputRefs: [
          {
            sourceId: 'source.archive-index',
            available: true,
            quality: 0.5,
            priorKnowledgeBonus: 0,
          },
        ],
        reproducibleRecordBonus: undefined,
      }),
    })
    const boosted = resolveResearchThroughput({
      capability: capability({
        sourceInputRefs: [
          {
            sourceId: 'source.archive-index',
            available: true,
            quality: 0.5,
            priorKnowledgeBonus: 0.8,
          },
        ],
        reproducibleRecordBonus: 0.5,
      }),
    })
    expect(boosted.progressDelta).toBeGreaterThan(baseline.progressDelta)

    const gated = resolveResearchThroughput({
      capability: capability({
        reproducibleRecordBonus: 1,
        facilityGates: [{ gateId: 'lab', satisfied: false }],
      }),
    })
    expect(gated.outcome).toBe('blocked')
    expect(gated.progressDelta).toBe(0)
  })

  it('blocks unavailable required source fail-closed', () => {
    const result = resolveResearchThroughput({
      capability: capability({
        sourceInputRefs: [
          {
            sourceId: 'source.archive-index',
            available: false,
            quality: 1,
            priorKnowledgeBonus: 0,
          },
        ],
      }),
    })
    expect(result.outcome).toBe('blocked')
    expect(
      result.reasonCodes.some(
        (code) =>
          code.startsWith('source_unavailable') || code === 'required_source_unavailable',
      ),
    ).toBe(true)
  })
})

describe('applyResearchExecutionTick', () => {
  it('consumes source yield without dropping below zero (saturation)', () => {
    let runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const heavyCapability = capability({
      domainScores: { analysis: 1 },
      difficulty: 0.2,
      sourceInputRefs: [
        {
          sourceId: 'source.archive-index',
          available: true,
          quality: 1,
          priorKnowledgeBonus: 0,
        },
      ],
    })
    for (let tick = 0; tick < 20; tick += 1) {
      const result = applyResearchExecutionTick({
        definition: archiveDefinition,
        runtime,
        capability: heavyCapability,
      })
      runtime = result.updatedRuntime!
      expect(runtime.sourceYieldRemaining['source.archive-index']).toBeGreaterThanOrEqual(0)
    }
    expect(runtime.sourceYieldRemaining['source.archive-index']).toBe(0)
  })

  it('fires mandatory milestones exact-once and completes project', () => {
    let runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const strong = capability({
      domainScores: { analysis: 1 },
      difficulty: 0.15,
    })
    const fired = new Set<string>()
    let lastOutcome = 'progressed'
    for (let tick = 0; tick < 30; tick += 1) {
      const result = applyResearchExecutionTick({
        definition: archiveDefinition,
        runtime,
        capability: strong,
      })
      runtime = result.updatedRuntime!
      lastOutcome = result.outcome
      for (const output of result.milestoneOutputs) {
        expect(fired.has(output.milestoneId)).toBe(false)
        fired.add(output.milestoneId)
      }
    }
    expect(fired.has('milestone.catalog-hit')).toBe(true)
    expect(fired.has('milestone.corroboration')).toBe(true)
    expect(lastOutcome).toBe('completed')
  })

  it('does not re-fire milestones on replay ticks', () => {
    let runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const strong = capability({ domainScores: { analysis: 1 }, difficulty: 0.1 })
    for (let tick = 0; tick < 25; tick += 1) {
      const result = applyResearchExecutionTick({
        definition: archiveDefinition,
        runtime,
        capability: strong,
      })
      runtime = result.updatedRuntime!
    }
    const replay = applyResearchExecutionTick({
      definition: archiveDefinition,
      runtime,
      capability: strong,
    })
    expect(replay.milestoneOutputs).toHaveLength(0)
  })

  it('supports optional milestones without blocking completion', () => {
    let runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const strong = capability({ domainScores: { analysis: 1 }, difficulty: 0.12 })
    let completed = false
    for (let tick = 0; tick < 40; tick += 1) {
      const result = applyResearchExecutionTick({
        definition: archiveDefinition,
        runtime,
        capability: strong,
      })
      runtime = result.updatedRuntime!
      if (result.outcome === 'completed') completed = true
    }
    expect(completed).toBe(true)
    const optionalFired = runtime.firedMilestoneIds.includes('milestone.side-channel')
    expect(typeof optionalFired).toBe('boolean')
  })

  it('fires same-tick milestones in code-unit id order', () => {
    const definition: ResearchProjectDefinition = {
      schemaVersion: RESEARCH_PROJECT_DEFINITION_SCHEMA_VERSION,
      projectId: 'research.case-order.v1',
      label: 'Case Order',
      sources: [],
      milestones: [
        {
          milestoneId: 'milestone.a',
          findingId: 'finding.a',
          findingKind: 'mandatory',
          eligibility: {},
          outputs: [{ kind: 'reveal_finding', targetRef: 'finding.a' }],
        },
        {
          milestoneId: 'milestone.A',
          findingId: 'finding.A',
          findingKind: 'mandatory',
          eligibility: {},
          outputs: [{ kind: 'reveal_finding', targetRef: 'finding.A' }],
        },
      ],
      closureRequirement: { mandatoryFindingIds: ['finding.A', 'finding.a'] },
    }

    const result = applyResearchExecutionTick({
      definition,
      runtime: createEmptyResearchExecutionRuntime(definition.projectId, definition),
      capability: capability({
        domainScores: { analysis: 1 },
        difficulty: 1,
        staffTimeCommitmentId: undefined,
        staffCompetencyRefs: [],
        sourceInputRefs: [],
      }),
    })

    expect(result.milestoneOutputs.map((output) => output.milestoneId)).toEqual([
      'milestone.A',
      'milestone.a',
    ])
    expect(result.outcome).toBe('completed')
  })
})

describe('interrupt and resume', () => {
  it('releases commitment and preserves partial progress on interrupt/resume', () => {
    let runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const tick = applyResearchExecutionTick({
      definition: archiveDefinition,
      runtime,
      capability: capability({ domainScores: { analysis: 0.9 }, difficulty: 0.5 }),
    })
    runtime = tick.updatedRuntime!
    const progressBefore = runtime.progressUnits

    runtime = interruptResearchExecution(runtime)
    expect(runtime.commitmentId).toBeNull()
    expect(runtime.interrupted).toBe(true)

    const blocked = resolveResearchThroughput({ capability: capability(), runtime })
    expect(blocked.outcome).toBe('interrupted')

    runtime = resumeResearchExecution(runtime, 'staff-commit-resumed')
    expect(runtime.interrupted).toBe(false)
    expect(runtime.commitmentId).toBe('staff-commit-resumed')
    expect(runtime.progressUnits).toBe(progressBefore)
  })
})

describe('serialize round-trip and deterministic replay', () => {
  it('round-trips runtime through serialize/parse', () => {
    const runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const json = serializeResearchExecutionRuntime(runtime)
    const parsed = parseResearchExecutionRuntime(json)
    expect(parsed).toEqual(runtime)
  })

  it('replays identically from serialized checkpoint', () => {
    let runtime = createEmptyResearchExecutionRuntime(
      archiveDefinition.projectId,
      archiveDefinition,
    )
    const cap = capability({ domainScores: { analysis: 0.95 }, difficulty: 0.25 })
    for (let tick = 0; tick < 5; tick += 1) {
      runtime = applyResearchExecutionTick({
        definition: archiveDefinition,
        runtime,
        capability: cap,
      }).updatedRuntime!
    }
    const checkpoint = serializeResearchExecutionRuntime(runtime)
    const restored = parseResearchExecutionRuntime(checkpoint)!

    const a = applyResearchExecutionTick({
      definition: archiveDefinition,
      runtime: restored,
      capability: cap,
    })
    const b = applyResearchExecutionTick({
      definition: archiveDefinition,
      runtime: parseResearchExecutionRuntime(checkpoint)!,
      capability: cap,
    })
    expect(a).toEqual(b)
  })
})

describe('one vs multi source execution path', () => {
  it('runs single-source capability through the same resolver', () => {
    const single = resolveResearchThroughput({
      capability: capability({
        sourceInputRefs: [
          {
            sourceId: 'source.archive-index',
            available: true,
            quality: 0.8,
            priorKnowledgeBonus: 0,
          },
        ],
      }),
    })
    const multi = resolveResearchThroughput({ capability: capability() })
    expect(single.outcome).toBe('progressed')
    expect(multi.outcome).toBe('progressed')
    expect(multi.throughputMultiplier).toBeGreaterThan(0)
  })
})
