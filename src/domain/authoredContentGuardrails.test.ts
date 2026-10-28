import { describe, expect, it } from 'vitest'
import { FIXTURE_CANON_RULE } from './crossPropertyCanonHandoff'
import {
  createEmptyCanonRuleRegistry,
  upsertCanonRule,
} from './canonRuleRegistry'
import {
  createEmptySharedUniverseCanonReleaseCatalog,
  materializeSharedUniverseRelease,
} from './sharedUniverseCanonReleaseCatalog'
import {
  validateAuthoredContentGeneration,
  type GenerationGuardrailRecord,
} from './authoredContentGuardrails'

const guardrail: GenerationGuardrailRecord = Object.freeze({
  schemaVersion: 'spe-2265.v1',
  guardrailId: 'guard:anomaly-default',
  requiredRuleTokenIds: Object.freeze(['rule:mirror-bleed']),
  forbiddenBreakIds: Object.freeze(['break:free-form-entity']),
  motifReuseHooks: Object.freeze(['motif:reflection']),
  noveltyBudget: 1,
})

function registryWithBleed(options?: { exceptionSubject?: string }) {
  let registry = createEmptyCanonRuleRegistry()
  registry = upsertCanonRule(registry, {
    ruleId: 'rule:mirror-bleed',
    label: 'Mirror bleed',
    domainTags: ['supernatural'],
    behaviorOutcomeToken: 'outcome:bleed-adjacent',
    exceptionRefs: options?.exceptionSubject
      ? [
          {
            exceptionId: 'exc:coexist',
            caseOrSubjectId: options.exceptionSubject,
            note: 'Governed coexistence exception',
          },
        ]
      : [],
  })
  registry = upsertCanonRule(registry, {
    ruleId: 'rule:sealed-reflection',
    label: 'Sealed reflection',
    domainTags: ['supernatural'],
    behaviorOutcomeToken: 'outcome:no-bleed',
    exceptionRefs: [],
  })
  return registry
}

describe('SPE-2265 authored content generation guardrails', () => {
  it('accepts a generated entity built from listed rule tokens', () => {
    const result = validateAuthoredContentGeneration({
      guardrail,
      registry: registryWithBleed(),
      packet: {
        packetId: 'gen:1',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:mirror',
        ruleTokenIds: ['rule:mirror-bleed'],
        motifIds: ['motif:reflection'],
      },
    })
    expect(result.ok).toBe(true)
  })

  it('rejects a packet missing token lineage', () => {
    const result = validateAuthoredContentGeneration({
      guardrail,
      registry: registryWithBleed(),
      packet: {
        packetId: 'gen:2',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:novel',
        ruleTokenIds: [],
        motifIds: ['motif:reflection'],
      },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const missing = result.diagnostics.filter((d) => d.code === 'missing_token_lineage')
    expect(missing).toHaveLength(1)
    expect(missing[0]?.message).toContain('missing canon rule token lineage')
  })

  it('rejects a forbidden break id', () => {
    const result = validateAuthoredContentGeneration({
      guardrail,
      registry: registryWithBleed(),
      packet: {
        packetId: 'gen:2b',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:break',
        ruleTokenIds: ['rule:mirror-bleed'],
        motifIds: ['motif:reflection'],
        breakIds: ['break:free-form-entity'],
      },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'forbidden_break')).toBe(true)
  })

  it('rejects when novelty budget is exceeded', () => {
    const result = validateAuthoredContentGeneration({
      guardrail,
      registry: registryWithBleed(),
      packet: {
        packetId: 'gen:2c',
        subjectKind: 'district',
        subjectId: 'district:novel',
        ruleTokenIds: ['rule:mirror-bleed'],
        motifIds: ['motif:reflection', 'motif:novel-a', 'motif:novel-b'],
      },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.diagnostics.some((d) => d.code === 'novelty_budget_exceeded')).toBe(
      true,
    )
  })

  it('rejects valid lineage with an explicitly contradictory rule combination', () => {
    const result = validateAuthoredContentGeneration({
      guardrail: {
        ...guardrail,
        requiredRuleTokenIds: ['rule:mirror-bleed', 'rule:sealed-reflection'],
      },
      registry: registryWithBleed(),
      packet: {
        packetId: 'gen:3',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:conflict',
        ruleTokenIds: ['rule:mirror-bleed', 'rule:sealed-reflection'],
        motifIds: ['motif:reflection'],
        declaredContradictions: [
          { ruleA: 'rule:mirror-bleed', ruleB: 'rule:sealed-reflection' },
        ],
      },
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    const contradiction = result.diagnostics.find(
      (d) => d.code === 'contradictory_rule_combination',
    )
    expect(contradiction?.relatedRuleIds).toEqual([
      'rule:mirror-bleed',
      'rule:sealed-reflection',
    ])
  })

  it('accepts an unusual combination when SPE-2263 records an explicit exception', () => {
    const result = validateAuthoredContentGeneration({
      guardrail: {
        ...guardrail,
        requiredRuleTokenIds: ['rule:mirror-bleed', 'rule:sealed-reflection'],
      },
      registry: registryWithBleed({ exceptionSubject: 'anomaly:excepted' }),
      packet: {
        packetId: 'gen:4',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:excepted',
        ruleTokenIds: ['rule:mirror-bleed', 'rule:sealed-reflection'],
        motifIds: ['motif:reflection'],
        declaredContradictions: [
          { ruleA: 'rule:mirror-bleed', ruleB: 'rule:sealed-reflection' },
        ],
      },
    })
    expect(result.ok).toBe(true)
  })

  it('is deterministic for identical inputs', () => {
    const packet = {
      packetId: 'gen:5',
      subjectKind: 'faction' as const,
      subjectId: 'faction:x',
      ruleTokenIds: ['rule:mirror-bleed'],
      motifIds: ['motif:reflection', 'motif:novel-a'],
    }
    const registry = registryWithBleed()
    const a = validateAuthoredContentGeneration({ guardrail, registry, packet })
    const b = validateAuthoredContentGeneration({ guardrail, registry, packet })
    expect(a).toEqual(b)
  })

  it('rejects a globally known shared-universe rule absent from the bound release', () => {
    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_CANON_RULE,
      { releaseLabel: 'guardrail-rel', setAsNewCampaignDefault: true },
    )
    expect(materialized.ok).toBe(true)
    if (!materialized.ok || !materialized.release) return

    let registry = createEmptyCanonRuleRegistry()
    registry = upsertCanonRule(registry, {
      ruleId: 'rule:mirror-bleed',
      label: 'Mirror bleed',
      domainTags: ['supernatural'],
      behaviorOutcomeToken: 'outcome:bleed-adjacent',
      exceptionRefs: [],
      sharedUniversePromotedRecordId: 'rec.rule.1',
    })

    const underBound = validateAuthoredContentGeneration({
      guardrail,
      registry,
      packet: {
        packetId: 'gen:6',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:bound',
        ruleTokenIds: ['rule:mirror-bleed'],
        motifIds: ['motif:reflection'],
      },
      boundReleaseId: materialized.release.releaseId,
      releaseCatalog: materialized.catalog,
    })
    expect(underBound.ok).toBe(true)

    const underMissing = validateAuthoredContentGeneration({
      guardrail,
      registry,
      packet: {
        packetId: 'gen:7',
        subjectKind: 'anomaly',
        subjectId: 'anomaly:unbound',
        ruleTokenIds: ['rule:mirror-bleed'],
        motifIds: ['motif:reflection'],
      },
      boundReleaseId: 'su.release.missing',
      releaseCatalog: materialized.catalog,
    })
    expect(underMissing.ok).toBe(false)
    if (underMissing.ok) return
    expect(
      underMissing.diagnostics.some((d) => d.code === 'unavailable_in_release'),
    ).toBe(true)
  })
})
