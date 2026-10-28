import { describe, expect, it } from 'vitest'
import {
  ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
  ACTION_OUTPUT_DERIVED_RECOVERY_SCHEMA_VERSION,
  convertActionOutputToRecoveryAmount,
  KILL_TRIGGER_RECOVERY_OWNER,
  resolveActionOutputDerivedRecovery,
  validateActionOutputDerivedRecoveryEffect,
  type ActionOutputDerivedRecoveryEffect,
  type ResolveActionOutputDerivedRecoveryInput,
} from './actionOutputDerivedRecovery'

const baseEffect = (): ActionOutputDerivedRecoveryEffect =>
  Object.freeze({
    effectId: 'effect:output-recovery-stamina',
    qualifyingOutputChannel: 'resolved_success_magnitude',
    targetResourceKind: 'stamina',
    conversionNumerator: 1,
    conversionDenominator: 2,
    hardCap: 20,
    contextPolicy: Object.freeze({
      allowedContextIds: Object.freeze(['context:field_ops', 'context:containment']),
      excludedContextIds: Object.freeze(['context:ethics_hold']),
    }),
    allowRecursiveSelfTrigger: false,
  })

const baseInput = (
  overrides: Partial<ResolveActionOutputDerivedRecoveryInput> = {}
): ResolveActionOutputDerivedRecoveryInput => {
  const effect = overrides.effect ?? baseEffect()
  return {
    effect,
    actorId: 'actor:alpha',
    actionId: 'action:resolve-1',
    sourceEffectId: effect.effectId,
    triggerKind: 'action_output',
    success: true,
    outputChannel: 'resolved_success_magnitude',
    outputMagnitude: 40,
    activeContextIds: ['context:field_ops'],
    targetActorId: 'actor:alpha',
    targetResource: {
      kind: 'stamina',
      current: 30,
      maximum: 100,
      recoverable: true,
    },
    previouslyAppliedActionIds: [],
    ...overrides,
  }
}

describe('SPE-3120 action-output-derived recovery', () => {
  describe('convertActionOutputToRecoveryAmount', () => {
    it('applies proportional floor conversion without importing source percentages', () => {
      expect(convertActionOutputToRecoveryAmount(40, 1, 2)).toBe(20)
      expect(convertActionOutputToRecoveryAmount(41, 1, 2)).toBe(20)
      expect(convertActionOutputToRecoveryAmount(10, 3, 4)).toBe(7)
    })

    it('honors hardCap and never returns negative amounts', () => {
      expect(convertActionOutputToRecoveryAmount(100, 1, 1, 15)).toBe(15)
      expect(convertActionOutputToRecoveryAmount(0, 1, 1)).toBe(0)
      expect(convertActionOutputToRecoveryAmount(-1 as unknown as number, 1, 1)).toBe(0)
      expect(convertActionOutputToRecoveryAmount(10, 1, 0)).toBe(0)
    })
  })

  describe('validateActionOutputDerivedRecoveryEffect', () => {
    it('accepts a well-formed effect and rejects malformed tuning', () => {
      expect(validateActionOutputDerivedRecoveryEffect(baseEffect())).toBe(true)
      expect(
        validateActionOutputDerivedRecoveryEffect({
          ...baseEffect(),
          conversionDenominator: 0,
        })
      ).toBe(false)
      expect(
        validateActionOutputDerivedRecoveryEffect({
          ...baseEffect(),
          qualifyingOutputChannel: 'tournament_mode_x',
        })
      ).toBe(false)
    })
  })

  describe('resolveActionOutputDerivedRecovery', () => {
    it('applies deterministic secondary recovery from qualifying successful output', () => {
      const result = resolveActionOutputDerivedRecovery(baseInput())
      expect(result.status).toBe('applied')
      expect(result.reasonCode).toBe('applied')
      expect(result.owner).toBe(ACTION_OUTPUT_DERIVED_RECOVERY_OWNER)
      // floor(40 * 1/2) = 20, hardCap 20 → 20; 30+20=50
      expect(result.provenance.convertedAmount).toBe(20)
      expect(result.provenance.appliedAmount).toBe(20)
      expect(result.provenance.previousValue).toBe(30)
      expect(result.provenance.nextValue).toBe(50)
      expect(result.provenance.clamped).toBe(false)
    })

    it('suppresses an otherwise identical action under explicit context exclusion', () => {
      const eligible = resolveActionOutputDerivedRecovery(baseInput())
      const suppressed = resolveActionOutputDerivedRecovery(
        baseInput({ activeContextIds: ['context:field_ops', 'context:ethics_hold'] })
      )
      expect(eligible.status).toBe('applied')
      expect(suppressed.status).toBe('suppressed')
      expect(suppressed.reasonCode).toBe('context_excluded')
      expect(suppressed.provenance.appliedAmount).toBe(0)
      expect(suppressed.provenance.nextValue).toBe(30)
    })

    it('suppresses when allowlist context policy is unmet', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({ activeContextIds: ['context:other'] })
      )
      expect(result.status).toBe('suppressed')
      expect(result.reasonCode).toBe('context_not_allowed')
    })

    it('treats an explicit empty allowlist as fail-closed', () => {
      const effect = Object.freeze({
        ...baseEffect(),
        contextPolicy: Object.freeze({
          allowedContextIds: Object.freeze([] as string[]),
        }),
      })
      const result = resolveActionOutputDerivedRecovery(
        baseInput({ effect, activeContextIds: ['context:field_ops'] })
      )
      expect(result.status).toBe('suppressed')
      expect(result.reasonCode).toBe('context_not_allowed')
    })

    it('allows unrestricted contexts when allowlist property is omitted', () => {
      const effect = Object.freeze({
        ...baseEffect(),
        contextPolicy: Object.freeze({
          excludedContextIds: Object.freeze(['context:ethics_hold']),
        }),
      })
      const result = resolveActionOutputDerivedRecovery(
        baseInput({ effect, activeContextIds: ['context:other'] })
      )
      expect(result.status).toBe('applied')
      expect(result.provenance.appliedAmount).toBe(20)
    })

    it('clamps at the authoritative resource maximum without overflow', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({
          outputMagnitude: 40,
          targetResource: {
            kind: 'stamina',
            current: 95,
            maximum: 100,
            recoverable: true,
          },
        })
      )
      expect(result.status).toBe('applied')
      expect(result.reasonCode).toBe('clamped_at_maximum')
      expect(result.provenance.convertedAmount).toBe(20)
      expect(result.provenance.appliedAmount).toBe(5)
      expect(result.provenance.nextValue).toBe(100)
      expect(result.provenance.clamped).toBe(true)
    })

    it('suppresses when already at maximum (zero room, no negative recovery)', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({
          targetResource: {
            kind: 'stamina',
            current: 100,
            maximum: 100,
            recoverable: true,
          },
        })
      )
      expect(result.status).toBe('suppressed')
      expect(result.reasonCode).toBe('clamped_at_maximum')
      expect(result.provenance.appliedAmount).toBe(0)
      expect(result.provenance.nextValue).toBe(100)
    })

    it('records provenance for actor, action/effect, target, and applied amount', () => {
      const result = resolveActionOutputDerivedRecovery(baseInput())
      expect(result.provenance).toMatchObject({
        actorId: 'actor:alpha',
        actionId: 'action:resolve-1',
        sourceEffectId: 'effect:output-recovery-stamina',
        effectId: 'effect:output-recovery-stamina',
        targetActorId: 'actor:alpha',
        resourceKind: 'stamina',
        appliedAmount: 20,
        outputChannel: 'resolved_success_magnitude',
        outputMagnitude: 40,
      })
    })

    it('does not duplicate recovery on repeated processing of the same action id', () => {
      const first = resolveActionOutputDerivedRecovery(baseInput())
      expect(first.status).toBe('applied')
      const second = resolveActionOutputDerivedRecovery(
        baseInput({
          previouslyAppliedActionIds: ['action:resolve-1'],
          targetResource: {
            kind: 'stamina',
            current: first.provenance.nextValue,
            maximum: 100,
            recoverable: true,
          },
        })
      )
      expect(second.status).toBe('suppressed')
      expect(second.reasonCode).toBe('idempotent_replay')
      expect(second.provenance.appliedAmount).toBe(0)
      expect(second.provenance.nextValue).toBe(50)
    })

    it('routes kill-trigger recovery to SPE-1405 rather than this contract', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({ triggerKind: 'kill_trigger' })
      )
      expect(result.status).toBe('rejected')
      expect(result.reasonCode).toBe('kill_trigger_routed_to_spe_1405')
      expect(result.owner).toBe(KILL_TRIGGER_RECOVERY_OWNER)
      expect(result.provenance.appliedAmount).toBe(0)
      expect(result.reportAttribution.owner).toBe(KILL_TRIGGER_RECOVERY_OWNER)
    })

    it('emits report attribution consumable without reverse-engineering state', () => {
      const result = resolveActionOutputDerivedRecovery(baseInput())
      expect(result.reportAttribution).toEqual({
        kind: 'action_output_derived_recovery',
        schemaVersion: ACTION_OUTPUT_DERIVED_RECOVERY_SCHEMA_VERSION,
        owner: ACTION_OUTPUT_DERIVED_RECOVERY_OWNER,
        effectId: 'effect:output-recovery-stamina',
        status: 'applied',
        reasonCode: 'applied',
        appliedAmount: 20,
        actorId: 'actor:alpha',
        actionId: 'action:resolve-1',
        sourceEffectId: 'effect:output-recovery-stamina',
        targetActorId: 'actor:alpha',
        resourceKind: 'stamina',
      })
    })

    it('blocks recursive self-trigger by default', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({
          originatingFromRecoveryEffectId: 'effect:output-recovery-stamina',
        })
      )
      expect(result.status).toBe('suppressed')
      expect(result.reasonCode).toBe('recursive_self_trigger_blocked')
      expect(result.provenance.appliedAmount).toBe(0)
    })

    it('allows recursive self-trigger only when explicitly authored', () => {
      const effect = Object.freeze({
        ...baseEffect(),
        allowRecursiveSelfTrigger: true,
      })
      const result = resolveActionOutputDerivedRecovery(
        baseInput({
          effect,
          originatingFromRecoveryEffectId: effect.effectId,
        })
      )
      expect(result.status).toBe('applied')
      expect(result.provenance.appliedAmount).toBe(20)
    })

    it('rejects invalid target resource shapes and nonrecoverable targets safely', () => {
      const invalid = resolveActionOutputDerivedRecovery(
        baseInput({
          targetResource: {
            kind: 'stamina',
            current: 120,
            maximum: 100,
            recoverable: true,
          },
        })
      )
      expect(invalid.status).toBe('rejected')
      expect(invalid.reasonCode).toBe('invalid_target')

      const blocked = resolveActionOutputDerivedRecovery(
        baseInput({
          targetResource: {
            kind: 'stamina',
            current: 30,
            maximum: 100,
            recoverable: false,
          },
        })
      )
      expect(blocked.status).toBe('suppressed')
      expect(blocked.reasonCode).toBe('nonrecoverable_resource')
    })

    it('suppresses channel mismatch and unsuccessful actions', () => {
      expect(
        resolveActionOutputDerivedRecovery(
          baseInput({ outputChannel: 'stabilization_output' })
        ).reasonCode
      ).toBe('channel_mismatch')
      expect(
        resolveActionOutputDerivedRecovery(baseInput({ success: false })).reasonCode
      ).toBe('action_not_successful')
    })

    it('reports action_not_successful before channel_mismatch when both apply', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({
          success: false,
          outputChannel: 'stabilization_output',
        })
      )
      expect(result.status).toBe('suppressed')
      expect(result.reasonCode).toBe('action_not_successful')
    })

    it('routes kill_trigger to SPE-1405 even when the effect is malformed', () => {
      const result = resolveActionOutputDerivedRecovery(
        baseInput({
          triggerKind: 'kill_trigger',
          effect: {
            ...baseEffect(),
            conversionDenominator: 0,
          } as ActionOutputDerivedRecoveryEffect,
        })
      )
      expect(result.status).toBe('rejected')
      expect(result.reasonCode).toBe('kill_trigger_routed_to_spe_1405')
      expect(result.owner).toBe(KILL_TRIGGER_RECOVERY_OWNER)
    })

    it('is deterministic and replay-stable for identical inputs', () => {
      const a = resolveActionOutputDerivedRecovery(baseInput())
      const b = resolveActionOutputDerivedRecovery(baseInput())
      expect(a).toEqual(b)
      expect(a.provenance.nextValue).toBe(50)
    })

    it('rejects malformed null/undefined input fail-closed without inventing a resource kind', () => {
      const nullResult = resolveActionOutputDerivedRecovery(null)
      expect(nullResult.reasonCode).toBe('malformed_input')
      expect(nullResult.provenance.resourceKind).toBeNull()
      expect(nullResult.reportAttribution.resourceKind).toBeNull()
      expect(resolveActionOutputDerivedRecovery(undefined).reasonCode).toBe('malformed_input')
    })
  })
})
