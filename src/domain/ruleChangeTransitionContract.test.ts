import { describe, expect, it } from 'vitest'
import {
  resolveRuleChangeTransition,
  serializeTransitionMarker,
  validateRuleChangeTransitionDeclaration,
  type RuleChangeTransitionDeclaration,
  type TransitionSubject,
} from './ruleChangeTransitionContract'

const baseDeclaration = (): RuleChangeTransitionDeclaration => ({
  transitionId: 'transition:rules-v1-to-v2',
  source: { ruleId: 'rule:recruitment', versionId: 'v1' },
  target: { ruleId: 'rule:recruitment', versionId: 'v2' },
  effectivePoint: { week: 10, branchId: 'branch:main' },
  affectedFamilies: [
    { stateFamily: 'recruitment_offer', policy: 'prospective_only' },
    {
      stateFamily: 'certification',
      policy: 'grandfather_existing',
    },
    {
      stateFamily: 'equipment_grade',
      policy: 'migrate_existing',
      domainHandlerRef: 'handler:equipment-grade-migrate',
    },
    {
      stateFamily: 'assignment',
      policy: 'revalidate_at_boundary',
      revalidationBoundary: 'mission_terminal',
    },
    {
      stateFamily: 'contract_offer',
      policy: 'invalidate_or_reissue',
      domainHandlerRef: 'handler:contract-reissue',
    },
  ],
})

function subject(overrides: Partial<TransitionSubject> = {}): TransitionSubject {
  return {
    subjectId: 'subject:1',
    stateFamily: 'recruitment_offer',
    originatedWeek: 5,
    originatingRule: { ruleId: 'rule:recruitment', versionId: 'v1' },
    ...overrides,
  }
}

describe('ruleChangeTransitionContract (SPE-2898)', () => {
  it('prospective-only leaves pre-change unchanged and applies new rule to post-change', () => {
    const declaration = baseDeclaration()
    const pre = resolveRuleChangeTransition(
      declaration,
      subject({ subjectId: 'offer:old', originatedWeek: 5 })
    )
    const post = resolveRuleChangeTransition(
      declaration,
      subject({ subjectId: 'offer:new', originatedWeek: 12 })
    )
    expect(pre.ok).toBe(true)
    expect(post.ok).toBe(true)
    if (!pre.ok || !post.ok) return
    expect(pre.result.disposition).toBe('unchanged_prior_semantics')
    expect(pre.result.cohort).toBe('pre_change')
    expect(post.result.disposition).toBe('apply_new_rule')
    expect(post.result.cohort).toBe('post_change')
  })

  it('grandfathered subjects retain originating rule provenance across save/load marker round-trip', () => {
    const declaration = baseDeclaration()
    const first = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'cert:legacy',
        stateFamily: 'certification',
        originatedWeek: 3,
      })
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.result.disposition).toBe('unchanged_prior_semantics')
    expect(first.result.originatingRuleProvenance).toEqual({
      ruleId: 'rule:recruitment',
      versionId: 'v1',
    })
    expect(serializeTransitionMarker(first.result)).toBeNull()

    const second = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'cert:legacy',
        stateFamily: 'certification',
        originatedWeek: 3,
        transitionMarkerId: serializeTransitionMarker(first.result) ?? undefined,
      })
    )
    expect(second).toEqual(first)
  })

  it('migrate_existing converts exactly once and rejects half-migrated domain failure', () => {
    const declaration = baseDeclaration()
    const first = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'equip:1',
        stateFamily: 'equipment_grade',
        originatedWeek: 4,
      })
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.result.disposition).toBe('migrate_once')
    expect(first.result.transitionMarkerId).toBe('migrate:equip:1')
    expect(first.result.domainHandlerRef).toBe('handler:equipment-grade-migrate')

    const replay = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'equip:1',
        stateFamily: 'equipment_grade',
        originatedWeek: 4,
        transitionMarkerId: first.result.transitionMarkerId!,
      })
    )
    expect(replay.ok).toBe(true)
    if (!replay.ok) return
    expect(replay.result.disposition).toBe('already_migrated')
    expect(replay.result.reasonCode).toBe('migration_already_applied')

    const failed = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'equip:2',
        stateFamily: 'equipment_grade',
        originatedWeek: 4,
        domainConversionFailed: true,
      })
    )
    expect(failed.ok).toBe(true)
    if (!failed.ok) return
    expect(failed.result.disposition).toBe('domain_conversion_failed')
    expect(serializeTransitionMarker(failed.result)).toBeNull()
  })

  it('revalidate_at_boundary waits until the declared lifecycle boundary', () => {
    const declaration = baseDeclaration()
    const waiting = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'assign:1',
        stateFamily: 'assignment',
        originatedWeek: 2,
        inFlight: true,
        currentBoundary: 'mid_mission',
      })
    )
    expect(waiting.ok).toBe(true)
    if (!waiting.ok) return
    expect(waiting.result.disposition).toBe('await_boundary')
    expect(waiting.result.cohort).toBe('in_flight')

    const atBoundary = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'assign:1',
        stateFamily: 'assignment',
        originatedWeek: 2,
        inFlight: true,
        currentBoundary: 'mission_terminal',
      })
    )
    expect(atBoundary.ok).toBe(true)
    if (!atBoundary.ok) return
    expect(atBoundary.result.disposition).toBe('migrate_once')
    expect(atBoundary.result.transitionMarkerId).toBe(
      'revalidate:assign:1:mission_terminal'
    )
  })

  it('invalidate_or_reissue uses explicit cutover for in-flight records', () => {
    const declaration = baseDeclaration()
    const inFlight = resolveRuleChangeTransition(
      declaration,
      subject({
        subjectId: 'contract:1',
        stateFamily: 'contract_offer',
        originatedWeek: 6,
        inFlight: true,
      })
    )
    expect(inFlight.ok).toBe(true)
    if (!inFlight.ok) return
    expect(inFlight.result.disposition).toBe('reissue')
    expect(serializeTransitionMarker(inFlight.result)).toBe('reissue:contract:1')
  })

  it('fails visibly when a consequential state family has no transition policy', () => {
    const result = resolveRuleChangeTransition(
      baseDeclaration(),
      subject({ stateFamily: 'stochastic_selector' })
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reasonCode).toBe('missing_policy')
  })

  it('routes hard compatibility conflicts to SPE-151 without overriding grandfathering', () => {
    const result = resolveRuleChangeTransition(
      baseDeclaration(),
      subject({
        subjectId: 'cert:conflict',
        stateFamily: 'certification',
        originatedWeek: 1,
        hardCompatibilityConflict: true,
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.disposition).toBe('compatibility_conflict')
    expect(result.result.compatibilityOwnerRef).toBe('SPE-151')
    expect(result.result.reasonCode).toBe('compatibility_conflict_routed')
  })

  it('is deterministic for identical inputs and validates declarations', () => {
    const declaration = baseDeclaration()
    const input = subject({ subjectId: 'offer:stable', originatedWeek: 5 })
    const a = resolveRuleChangeTransition(declaration, input)
    const b = resolveRuleChangeTransition(declaration, input)
    expect(a).toEqual(b)

    const bad = validateRuleChangeTransitionDeclaration({
      ...declaration,
      affectedFamilies: [
        { stateFamily: 'x', policy: 'revalidate_at_boundary' },
      ],
    })
    expect(bad.ok).toBe(false)
    expect(!bad.ok && bad.reasonCode).toBe('malformed_input')
  })
})
