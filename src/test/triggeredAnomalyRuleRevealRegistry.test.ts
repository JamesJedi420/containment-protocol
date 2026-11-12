import { describe, expect, it } from 'vitest'
import {
  ANOMALY_INTERACTION_MAGNITUDE_TIERS,
  DEFAULT_TRIGGERED_ANOMALY_RULE_REVEAL_REGISTRY,
  evaluateTriggeredAnomalyRuleReveal,
  validateTriggeredAnomalyRuleRevealRecord,
  validateTriggeredAnomalyRuleRevealRegistry,
  type TriggeredAnomalyRuleRevealEvaluationInput,
  type TriggeredAnomalyRuleRevealRecord,
} from '../domain/triggeredAnomalyRuleRevealRegistry'

const rule = DEFAULT_TRIGGERED_ANOMALY_RULE_REVEAL_REGISTRY.entries[0]!

function input(
  overrides: Partial<TriggeredAnomalyRuleRevealEvaluationInput> = {}
): TriggeredAnomalyRuleRevealEvaluationInput {
  return {
    anomalyRef: rule.anomalyRef,
    actionRef: rule.trigger.actionRef,
    completedSetupRefs: [...rule.trigger.requiredSetupRefs],
    magnitudeTier: 'site',
    acknowledgedRuleIds: [],
    ...overrides,
  }
}

describe('triggeredAnomalyRuleRevealRegistry (SPE-2172 slice 1)', () => {
  it('validates the default setup-gated high-impact rule registry', () => {
    expect(ANOMALY_INTERACTION_MAGNITUDE_TIERS).toEqual([
      'trivial',
      'local',
      'site',
      'regional',
      'civic_scale',
    ])
    expect(
      validateTriggeredAnomalyRuleRevealRegistry(DEFAULT_TRIGGERED_ANOMALY_RULE_REVEAL_REGISTRY)
    ).toEqual({ valid: true, issues: [] })
  })

  it('keeps the anomaly rule and procedures hidden for an unrelated action', () => {
    const result = evaluateTriggeredAnomalyRuleReveal(
      rule,
      input({ actionRef: 'action:resonant-lattice:passive-scan' })
    )

    expect(result).toEqual({
      status: 'hidden',
      reason: 'action_not_applicable',
      canProceed: true,
      allowedResponseScale: 'specialist',
      missingSetupRefs: [],
      owner: 'SPE-2172',
      magnitudeOwner: 'SPE-1033',
    })
    expect('procedureRefs' in result).toBe(false)
    expect('hiddenRuleRef' in result).toBe(false)
    expect('ruleId' in result).toBe(false)
  })

  it('blocks a matching high-impact action without leaking the rule when setup is incomplete', () => {
    const result = evaluateTriggeredAnomalyRuleReveal(
      rule,
      input({ completedSetupRefs: [rule.trigger.requiredSetupRefs[0]!] })
    )

    expect(result).toMatchObject({
      status: 'hidden',
      reason: 'setup_incomplete',
      canProceed: false,
      allowedResponseScale: 'specialist',
      missingSetupRefs: ['setup:resonant-lattice:remote-cutoff-staffed'],
    })
    expect('procedureRefs' in result).toBe(false)
  })

  it('does not reveal the high-impact rule below its SPE-1033 magnitude threshold', () => {
    const result = evaluateTriggeredAnomalyRuleReveal(rule, input({ magnitudeTier: 'local' }))

    expect(result).toMatchObject({
      status: 'hidden',
      reason: 'magnitude_below_trigger',
      canProceed: true,
      allowedResponseScale: 'specialist',
      magnitudeOwner: 'SPE-1033',
    })
  })

  it('reveals the procedure constraint and changes allowed response scale at the threshold', () => {
    const result = evaluateTriggeredAnomalyRuleReveal(rule, input())

    expect(result).toMatchObject({
      status: 'revealed',
      reason: 'acknowledgement_required',
      canProceed: false,
      allowedResponseScale: 'site_wide',
      hiddenRuleRef: 'anomaly-rule:resonant-lattice:overload-feedback',
      procedureRefs: [
        'procedure:resonant-lattice:distributed-grounding',
        'procedure:resonant-lattice:evacuation-perimeter',
      ],
      acknowledgementRequired: true,
    })
  })

  it('allows the revealed action only after the player acknowledgement is recorded', () => {
    const result = evaluateTriggeredAnomalyRuleReveal(
      rule,
      input({ acknowledgedRuleIds: [rule.id] })
    )

    expect(result).toMatchObject({
      status: 'acknowledged',
      reason: 'acknowledged',
      canProceed: true,
      allowedResponseScale: 'site_wide',
      acknowledgementRequired: true,
    })
  })

  it('allows a revealed rule that does not require acknowledgement to proceed immediately', () => {
    const noAcknowledgementRule: TriggeredAnomalyRuleRevealRecord = {
      ...rule,
      id: 'rule-reveal:resonant-lattice-advisory',
      acknowledgementRequired: false,
      acknowledgementPrompt: undefined,
    }

    expect(evaluateTriggeredAnomalyRuleReveal(noAcknowledgementRule, input())).toMatchObject({
      status: 'revealed',
      reason: 'revealed',
      canProceed: true,
      acknowledgementRequired: false,
      allowedResponseScale: 'site_wide',
    })
  })

  it('is deterministic, frozen, and does not mutate caller-owned input or records', () => {
    const evaluationInput = input()
    const inputSnapshot = structuredClone(evaluationInput)
    const ruleSnapshot = structuredClone(rule)

    const first = evaluateTriggeredAnomalyRuleReveal(rule, evaluationInput)
    const second = evaluateTriggeredAnomalyRuleReveal(rule, evaluationInput)

    expect(first).toEqual(second)
    expect(evaluationInput).toEqual(inputSnapshot)
    expect(rule).toEqual(ruleSnapshot)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.isFrozen(first.missingSetupRefs)).toBe(true)
    if (first.status !== 'hidden') expect(Object.isFrozen(first.procedureRefs)).toBe(true)
  })

  it('rejects malformed record combinations and duplicate registry ids', () => {
    const malformed = {
      ...rule,
      trigger: {
        ...rule.trigger,
        requiredSetupRefs: ['', 'setup:duplicate', 'setup:duplicate'],
        minimumMagnitudeTier: 'unbounded',
      },
      procedureRefs: ['procedure:duplicate', 'procedure:duplicate'],
      acknowledgementPrompt: ' ',
      responseScaleAfterReveal: rule.responseScaleBeforeReveal,
    } as unknown as TriggeredAnomalyRuleRevealRecord

    const malformedIssues = validateTriggeredAnomalyRuleRevealRecord(malformed).issues
    expect(malformedIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'missing_setup_ref',
        'duplicate_setup_ref',
        'duplicate_procedure_ref',
        'invalid_magnitude_tier',
        'unchanged_response_scale',
        'missing_acknowledgement_prompt',
      ])
    )
    expect(malformedIssues).toHaveLength(6)

    const duplicateRegistry = validateTriggeredAnomalyRuleRevealRegistry({
      entries: [rule, { ...rule }],
    })
    expect(duplicateRegistry.issues.map((issue) => issue.code)).toContain('duplicate_id')
  })

  it('rejects padded authored refs before evaluation can compare normalized caller input', () => {
    const paddedRecord: TriggeredAnomalyRuleRevealRecord = {
      ...rule,
      anomalyRef: `${rule.anomalyRef} `,
    }

    expect(
      validateTriggeredAnomalyRuleRevealRecord(paddedRecord).issues.map((issue) => issue.code)
    ).toContain('untrimmed_reference')
    expect(() => evaluateTriggeredAnomalyRuleReveal(paddedRecord, input())).toThrow(
      'untrimmed_reference'
    )
  })

  it('fails closed for malformed evaluation inputs', () => {
    expect(() =>
      evaluateTriggeredAnomalyRuleReveal(rule, input({ completedSetupRefs: [''] }))
    ).toThrow('completedSetupRefs[0] is required')
    expect(() =>
      evaluateTriggeredAnomalyRuleReveal(
        rule,
        input({
          magnitudeTier: 'unbounded' as TriggeredAnomalyRuleRevealEvaluationInput['magnitudeTier'],
        })
      )
    ).toThrow('magnitudeTier is invalid')
  })
})
