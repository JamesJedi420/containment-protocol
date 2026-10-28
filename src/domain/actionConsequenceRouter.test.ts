import { describe, expect, it } from 'vitest'
import {
  ACTION_CONSEQUENCE_ROUTER_OWNER,
  ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION,
  classifyConsequenceDisposition,
  CONSEQUENCE_DISPOSITIONS,
  CONSEQUENCE_FAMILIES,
  routeActionConsequences,
  type CausationReference,
  type ConsequenceIntent,
  type RouteActionConsequencesInput,
} from './actionConsequenceRouter'

const baseCausation = (
  overrides: Partial<CausationReference> = {}
): CausationReference =>
  Object.freeze({
    causationId: 'cause:ignored-warning-1',
    kind: 'ignored_warning',
    sourceActionId: 'action:field-breach-1',
    ...overrides,
  })

const baseIntent = (
  overrides: Partial<ConsequenceIntent> = {}
): ConsequenceIntent =>
  Object.freeze({
    intentId: 'intent:status-1',
    family: 'status_change',
    targetDomain: 'staff',
    targetId: 'staff:alpha',
    requestedScaleBand: 'local',
    mitigationState: 'none',
    ...overrides,
  })

const baseInput = (
  overrides: Partial<RouteActionConsequencesInput> = {}
): RouteActionConsequencesInput => ({
  actionId: 'action:field-breach-1',
  causation: baseCausation(),
  intents: [baseIntent()],
  propagationVectors: [],
  escalationRules: [],
  hardChoiceSets: [],
  ...overrides,
})

describe('SPE-2157 action consequence router', () => {
  it('routes at least four materially different consequence families through one interface', () => {
    const families = [
      'status_change',
      'denied_asset',
      'resource_burn',
      'exposure',
      'staff_effect',
    ] as const
    const result = routeActionConsequences(
      baseInput({
        intents: families.map((family, index) =>
          baseIntent({
            intentId: `intent:family-${index}`,
            family,
            targetDomain: family === 'denied_asset' ? 'evidence' : 'staff',
            targetId: `target:${index}`,
          })
        ),
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const routedFamilies = new Set(result.consequences.map((c) => c.family))
    expect(routedFamilies.size).toBeGreaterThanOrEqual(4)
    for (const family of families) {
      expect(CONSEQUENCE_FAMILIES).toContain(family)
      expect(routedFamilies.has(family)).toBe(true)
    }
    expect(result.owner).toBe(ACTION_CONSEQUENCE_ROUTER_OWNER)
    expect(result.schemaVersion).toBe(ACTION_CONSEQUENCE_ROUTER_SCHEMA_VERSION)
  })

  it('requires every emitted consequence to carry causation, target/domain, scale, and reason code', () => {
    const result = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({ intentId: 'intent:a', family: 'infrastructure_damage' }),
          baseIntent({
            intentId: 'intent:b',
            family: 'public_trust_change',
            targetDomain: 'public_state',
            targetId: 'district:north',
          }),
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.consequences.length).toBe(2)
    for (const consequence of result.consequences) {
      expect(consequence.causation.causationId).toBe('cause:ignored-warning-1')
      expect(consequence.causation.kind).toBe('ignored_warning')
      expect(consequence.causation.sourceActionId).toBe('action:field-breach-1')
      expect(consequence.targetDomain.length).toBeGreaterThan(0)
      expect(consequence.targetId.length).toBeGreaterThan(0)
      expect(consequence.scaleBand).toBeTruthy()
      expect(consequence.reasonCode).toBeTruthy()
    }
  })

  it('propagates collateral across two domains through an explicit bounded vector', () => {
    const result = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:blast',
            family: 'infrastructure_damage',
            targetDomain: 'infrastructure',
            targetId: 'node:power-a',
            requestedScaleBand: 'local',
            escalationRuleId: 'esc:local-to-adjacent',
            propagationVectorId: 'vec:infra-to-civilians',
          }),
        ],
        escalationRules: [
          { ruleId: 'esc:local-to-adjacent', fromScale: 'local', toScale: 'adjacent' },
        ],
        propagationVectors: [
          {
            vectorId: 'vec:infra-to-civilians',
            fromDomain: 'infrastructure',
            toDomain: 'civilians',
            maxScaleBand: 'adjacent',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.consequences).toHaveLength(2)
    const direct = result.consequences.find((c) => c.disposition === 'direct')
    const propagated = result.consequences.find((c) => c.disposition === 'propagated')
    expect(direct?.targetDomain).toBe('infrastructure')
    expect(propagated?.family).toBe('collateral_effect')
    expect(propagated?.targetDomain).toBe('civilians')
    expect(propagated?.propagationVectorId).toBe('vec:infra-to-civilians')
    expect(propagated?.parentConsequenceId).toBe(direct?.consequenceId)
    expect(propagated?.reasonCode).toBe('routed_propagated')
    // Two distinct domains via one vector
    expect(new Set([direct!.targetDomain, propagated!.targetDomain]).size).toBe(2)
  })

  it('rejects missing causation references', () => {
    const missing = routeActionConsequences(baseInput({ causation: null }))
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.reasonCode).toBe('missing_causation')
  })

  it('rejects invalid causation references', () => {
    const invalid = routeActionConsequences(
      baseInput({
        causation: {
          causationId: '',
          kind: 'ignored_warning',
          sourceActionId: 'action:x',
        },
      })
    )
    expect(invalid.ok).toBe(false)
    if (invalid.ok) return
    expect(invalid.reasonCode).toBe('invalid_causation')

    const badKind = routeActionConsequences(
      baseInput({
        causation: {
          causationId: 'cause:1',
          kind: 'not_a_real_cause' as CausationReference['kind'],
          sourceActionId: 'action:x',
        },
      })
    )
    expect(badKind.ok).toBe(false)
    if (badKind.ok) return
    expect(badKind.reasonCode).toBe('invalid_causation')
  })

  it('keeps a local consequence local unless an explicit escalation rule applies', () => {
    const withoutRule = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:local-only',
            requestedScaleBand: 'campaign',
          }),
        ],
      })
    )
    expect(withoutRule.ok).toBe(true)
    if (!withoutRule.ok) return
    expect(withoutRule.consequences).toHaveLength(1)
    expect(withoutRule.consequences[0]?.scaleBand).toBe('local')
    expect(withoutRule.consequences[0]?.reasonCode).toBe('local_scale_preserved')

    const withRule = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:escalated',
            requestedScaleBand: 'local',
            escalationRuleId: 'esc:local-to-site',
          }),
        ],
        escalationRules: [
          { ruleId: 'esc:local-to-site', fromScale: 'local', toScale: 'site' },
        ],
      })
    )
    expect(withRule.ok).toBe(true)
    if (!withRule.ok) return
    expect(withRule.consequences[0]?.scaleBand).toBe('site')
    expect(withRule.consequences[0]?.reasonCode).toBe('escalation_applied')
  })

  it('emits a bounded hard-choice set from canonical state', () => {
    const result = routeActionConsequences(
      baseInput({
        hardChoiceSets: [
          {
            choiceSetId: 'choice:evacuate-or-hold',
            options: [
              { optionId: 'evacuate', label: 'Evacuate civilians' },
              { optionId: 'hold', label: 'Hold perimeter' },
            ],
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.hardChoiceSets).toHaveLength(1)
    expect(result.hardChoiceSets[0]?.choiceSetId).toBe('choice:evacuate-or-hold')
    expect(result.hardChoiceSets[0]?.options).toHaveLength(2)
    expect(result.hardChoiceSets[0]?.reasonCode).toBe('hard_choice_emitted')
  })

  it('rejects empty or invalid hard-choice option sets', () => {
    const empty = routeActionConsequences(
      baseInput({
        hardChoiceSets: [{ choiceSetId: 'choice:empty', options: [] }],
      })
    )
    expect(empty.ok).toBe(false)
    if (empty.ok) return
    expect(empty.reasonCode).toBe('hard_choice_rejected_empty')

    const single = routeActionConsequences(
      baseInput({
        hardChoiceSets: [
          {
            choiceSetId: 'choice:single',
            options: [{ optionId: 'only', label: 'Only option' }],
          },
        ],
      })
    )
    expect(single.ok).toBe(false)
    if (single.ok) return
    expect(single.reasonCode).toBe('hard_choice_rejected_invalid')

    const invalidOption = routeActionConsequences(
      baseInput({
        hardChoiceSets: [
          {
            choiceSetId: 'choice:bad',
            options: [
              { optionId: '', label: 'Bad' },
              { optionId: 'ok', label: 'Ok' },
            ],
          },
        ],
      })
    )
    expect(invalidOption.ok).toBe(false)
    if (invalidOption.ok) return
    expect(invalidOption.reasonCode).toBe('hard_choice_rejected_invalid')
  })

  it('lets consumers distinguish direct, propagated, mitigated, denied, and unresolved', () => {
    const result = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({ intentId: 'intent:direct', family: 'status_change' }),
          baseIntent({
            intentId: 'intent:mitigated',
            family: 'exposure',
            mitigationState: 'partial',
            targetDomain: 'public_state',
            targetId: 'district:east',
          }),
          baseIntent({
            intentId: 'intent:denied',
            family: 'denied_asset',
            targetDomain: 'evidence',
            targetId: 'asset:badge-7',
            forcedDisposition: 'denied',
          }),
          baseIntent({
            intentId: 'intent:unresolved',
            family: 'scene_threat',
            targetDomain: 'sites',
            targetId: 'site:warehouse',
            forcedDisposition: 'unresolved',
          }),
          baseIntent({
            intentId: 'intent:collateral-source',
            family: 'cover_story_damage',
            targetDomain: 'cover_systems',
            targetId: 'cover:front-desk',
            propagationVectorId: 'vec:cover-to-public',
          }),
        ],
        propagationVectors: [
          {
            vectorId: 'vec:cover-to-public',
            fromDomain: 'cover_systems',
            toDomain: 'public_state',
            maxScaleBand: 'adjacent',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const dispositions = new Set(
      result.consequences.map((c) => classifyConsequenceDisposition(c))
    )
    for (const disposition of CONSEQUENCE_DISPOSITIONS) {
      expect(dispositions.has(disposition)).toBe(true)
    }
    expect(
      result.consequences.find((c) => c.disposition === 'mitigated')?.reasonCode
    ).toBe('routed_mitigated')
    expect(
      result.consequences.find((c) => c.disposition === 'denied')?.reasonCode
    ).toBe('routed_denied')
    expect(
      result.consequences.find((c) => c.disposition === 'unresolved')?.reasonCode
    ).toBe('routed_unresolved')
  })

  it('is deterministic with stable ordering across identical inputs', () => {
    const input = baseInput({
      intents: [
        baseIntent({ intentId: 'intent:z', family: 'clue_distortion', targetDomain: 'evidence' }),
        baseIntent({ intentId: 'intent:a', family: 'resource_burn' }),
        baseIntent({
          intentId: 'intent:m',
          family: 'site_map_delta',
          targetDomain: 'sites',
          targetId: 'site:alpha',
          propagationVectorId: 'vec:sites-to-staff',
        }),
      ],
      propagationVectors: [
        {
          vectorId: 'vec:sites-to-staff',
          fromDomain: 'sites',
          toDomain: 'staff',
          maxScaleBand: 'local',
        },
      ],
      hardChoiceSets: [
        {
          choiceSetId: 'choice:b',
          options: [
            { optionId: 'x', label: 'X' },
            { optionId: 'y', label: 'Y' },
          ],
        },
        {
          choiceSetId: 'choice:a',
          options: [
            { optionId: 'p', label: 'P' },
            { optionId: 'q', label: 'Q' },
          ],
        },
      ],
    })
    const first = routeActionConsequences(input)
    const second = routeActionConsequences(input)
    expect(first).toEqual(second)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const ids = first.consequences.map((c) => c.consequenceId)
    expect(ids).toEqual([...ids].sort())
    const choiceIds = first.hardChoiceSets.map((s) => s.choiceSetId)
    expect(choiceIds).toEqual(['choice:a', 'choice:b'])
  })

  it('rejects unknown propagation vectors and domain mismatches', () => {
    const unknown = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:bad-vec',
            propagationVectorId: 'vec:missing',
          }),
        ],
      })
    )
    expect(unknown.ok).toBe(false)
    if (unknown.ok) return
    expect(unknown.reasonCode).toBe('propagation_rejected')

    const mismatch = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:mismatch',
            targetDomain: 'staff',
            propagationVectorId: 'vec:infra-to-civilians',
          }),
        ],
        propagationVectors: [
          {
            vectorId: 'vec:infra-to-civilians',
            fromDomain: 'infrastructure',
            toDomain: 'civilians',
            maxScaleBand: 'adjacent',
          },
        ],
      })
    )
    expect(mismatch.ok).toBe(false)
    if (mismatch.ok) return
    expect(mismatch.reasonCode).toBe('propagation_rejected')
  })

  it('does not invent mission success, defeat, or domain recovery inside the router', () => {
    const result = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({ intentId: 'intent:partial', family: 'partial_action' as never }),
        ],
      })
    )
    // Unknown family is rejected — recovery/defeat are not families here.
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reasonCode).toBe('unknown_family')

    const ok = routeActionConsequences(baseInput())
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    const serialized = JSON.stringify(ok)
    expect(serialized).not.toMatch(/mission_success|campaign_defeat|domain_recovery/i)
  })

  it('clamps mismatched or narrowing escalation to local and never leaks requested campaign scale', () => {
    const narrowing = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:narrow',
            requestedScaleBand: 'campaign',
            escalationRuleId: 'esc:campaign-to-site',
          }),
        ],
        escalationRules: [
          { ruleId: 'esc:campaign-to-site', fromScale: 'campaign', toScale: 'site' },
        ],
      })
    )
    // Narrowing rules are rejected at input validation.
    expect(narrowing.ok).toBe(false)
    if (narrowing.ok) return
    expect(narrowing.reasonCode).toBe('escalation_rejected')

    const fromAbove = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:from-above',
            requestedScaleBand: 'adjacent',
            escalationRuleId: 'esc:site-to-campaign',
          }),
        ],
        escalationRules: [
          { ruleId: 'esc:site-to-campaign', fromScale: 'site', toScale: 'campaign' },
        ],
      })
    )
    expect(fromAbove.ok).toBe(true)
    if (!fromAbove.ok) return
    expect(fromAbove.consequences[0]?.scaleBand).toBe('local')
    expect(fromAbove.consequences[0]?.reasonCode).toBe('local_scale_preserved')

    const mismatch = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:mismatch-esc',
            requestedScaleBand: 'campaign',
            escalationRuleId: 'esc:site-to-campaign',
          }),
        ],
        escalationRules: [
          { ruleId: 'esc:site-to-campaign', fromScale: 'site', toScale: 'campaign' },
        ],
      })
    )
    expect(mismatch.ok).toBe(true)
    if (!mismatch.ok) return
    expect(mismatch.consequences[0]?.scaleBand).toBe('local')
    expect(mismatch.consequences[0]?.reasonCode).toBe('local_scale_preserved')
  })

  it('rejects unknown escalation rule ids and malformed escalation rule records', () => {
    const unknown = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:missing-esc',
            escalationRuleId: 'esc:missing',
          }),
        ],
      })
    )
    expect(unknown.ok).toBe(false)
    if (unknown.ok) return
    expect(unknown.reasonCode).toBe('escalation_rejected')

    const malformed = routeActionConsequences(
      baseInput({
        escalationRules: [{ ruleId: '', fromScale: 'local', toScale: 'site' }],
      })
    )
    expect(malformed.ok).toBe(false)
    if (malformed.ok) return
    expect(malformed.reasonCode).toBe('escalation_rejected')
  })

  it('clamps propagated scale to vector maxScaleBand', () => {
    const result = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:clamp-prop',
            family: 'infrastructure_damage',
            targetDomain: 'infrastructure',
            targetId: 'infra:pump',
            requestedScaleBand: 'local',
            escalationRuleId: 'esc:local-to-site',
            propagationVectorId: 'vec:infra-to-civilians',
          }),
        ],
        escalationRules: [
          { ruleId: 'esc:local-to-site', fromScale: 'local', toScale: 'site' },
        ],
        propagationVectors: [
          {
            vectorId: 'vec:infra-to-civilians',
            fromDomain: 'infrastructure',
            toDomain: 'civilians',
            maxScaleBand: 'adjacent',
          },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const direct = result.consequences.find((c) => c.disposition === 'direct')
    const propagated = result.consequences.find((c) => c.disposition === 'propagated')
    expect(direct?.scaleBand).toBe('site')
    expect(propagated?.scaleBand).toBe('adjacent')
  })

  it('rejects duplicate intentIds and does not propagate from denied or unresolved', () => {
    const dup = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({ intentId: 'intent:same' }),
          baseIntent({ intentId: 'intent:same', family: 'exposure' }),
        ],
      })
    )
    expect(dup.ok).toBe(false)
    if (dup.ok) return
    expect(dup.reasonCode).toBe('duplicate_intent')

    const deniedNoProp = routeActionConsequences(
      baseInput({
        intents: [
          baseIntent({
            intentId: 'intent:denied-prop',
            family: 'denied_asset',
            targetDomain: 'evidence',
            targetId: 'asset:x',
            forcedDisposition: 'denied',
            propagationVectorId: 'vec:evidence-to-public',
          }),
        ],
        propagationVectors: [
          {
            vectorId: 'vec:evidence-to-public',
            fromDomain: 'evidence',
            toDomain: 'public_state',
            maxScaleBand: 'local',
          },
        ],
      })
    )
    expect(deniedNoProp.ok).toBe(true)
    if (!deniedNoProp.ok) return
    expect(deniedNoProp.consequences).toHaveLength(1)
    expect(deniedNoProp.consequences[0]?.disposition).toBe('denied')
  })
})
