import { describe, expect, it } from 'vitest'
import { FIXTURE_CANON_RULE, FIXTURE_ESTABLISHED_FACT } from './crossPropertyCanonHandoff'
import {
  createEmptyCanonRuleRegistry,
  resolveCanonRule,
  sanitizeCanonRuleRegistry,
  upsertCanonRule,
} from './canonRuleRegistry'
import {
  createEmptySharedUniverseCanonReleaseCatalog,
  materializeSharedUniverseRelease,
} from './sharedUniverseCanonReleaseCatalog'

describe('SPE-2263 canon rule registry', () => {
  it('applies the same rule across two cases with an explicit exception on the second', () => {
    let registry = createEmptyCanonRuleRegistry()
    registry = upsertCanonRule(registry, {
      ruleId: 'rule:mirror-bleed',
      label: 'Mirror bleed',
      domainTags: ['supernatural', 'reflection'],
      behaviorOutcomeToken: 'outcome:bleed-adjacent',
      exceptionRefs: [
        {
          exceptionId: 'exc:case-b-warded',
          caseOrSubjectId: 'case:b',
          note: 'Warded silver suppresses bleed',
        },
      ],
    })

    const caseA = resolveCanonRule({
      registry,
      ruleId: 'rule:mirror-bleed',
      caseOrSubjectId: 'case:a',
    })
    const caseB = resolveCanonRule({
      registry,
      ruleId: 'rule:mirror-bleed',
      caseOrSubjectId: 'case:b',
    })

    expect(caseA.kind).toBe('applied')
    expect(caseA.outcomeToken).toBe('outcome:bleed-adjacent')
    expect(caseB.kind).toBe('exception_recorded')
    expect(caseB.exceptionId).toBe('exc:case-b-warded')
    expect(caseB.outcomeToken).toBeNull()
  })

  it('lookup is deterministic for identical inputs', () => {
    let registry = createEmptyCanonRuleRegistry()
    registry = upsertCanonRule(registry, {
      ruleId: 'rule:stable',
      label: 'Stable',
      domainTags: ['b', 'a'],
      behaviorOutcomeToken: 'outcome:stable',
      exceptionRefs: [],
    })
    const first = resolveCanonRule({
      registry,
      ruleId: 'rule:stable',
      caseOrSubjectId: 'case:1',
    })
    const second = resolveCanonRule({
      registry,
      ruleId: 'rule:stable',
      caseOrSubjectId: 'case:1',
    })
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('gates shared-universe-derived rules by campaign-bound release membership', () => {
    const materialized = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_CANON_RULE,
      { releaseLabel: 'rule-rel', setAsNewCampaignDefault: true },
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

    const underBound = resolveCanonRule({
      registry,
      ruleId: 'rule:mirror-bleed',
      caseOrSubjectId: 'case:a',
      boundReleaseId: materialized.release.releaseId,
      releaseCatalog: materialized.catalog,
    })
    expect(underBound.kind).toBe('applied')

    const underOther = resolveCanonRule({
      registry,
      ruleId: 'rule:mirror-bleed',
      caseOrSubjectId: 'case:a',
      boundReleaseId: 'su.release.missing',
      releaseCatalog: materialized.catalog,
    })
    expect(underOther.kind).toBe('unavailable_in_release')

    // A rule known globally but only present in a later release stays unavailable
    // under an earlier campaign binding that lacks the member.
    const earlier = materializeSharedUniverseRelease(
      createEmptySharedUniverseCanonReleaseCatalog(),
      FIXTURE_ESTABLISHED_FACT,
      { releaseLabel: 'earlier-only' },
    )
    expect(earlier.ok).toBe(true)
    if (!earlier.ok || !earlier.release) return
    const laterCatalog = materializeSharedUniverseRelease(
      earlier.catalog,
      FIXTURE_CANON_RULE,
      {
        releaseLabel: 'later-rule',
        predecessorReleaseId: earlier.release.releaseId,
      },
    )
    expect(laterCatalog.ok).toBe(true)
    if (!laterCatalog.ok) return
    const gated = resolveCanonRule({
      registry,
      ruleId: 'rule:mirror-bleed',
      caseOrSubjectId: 'case:a',
      boundReleaseId: earlier.release.releaseId,
      releaseCatalog: laterCatalog.catalog,
    })
    expect(gated.kind).toBe('unavailable_in_release')
  })

  it('sanitizes malformed registry input to empty', () => {
    expect(sanitizeCanonRuleRegistry(null).rules).toEqual({})
  })
})
