import { describe, expect, it } from 'vitest'
import {
  ACTIVATION_PREREQUISITE_FIXTURES,
  evaluateActivationEligibility,
  validateActivationPrerequisites,
} from '../domain/activationPrerequisite'
import type { ActivationContext } from '../domain/activationPrerequisite'

const fixtures = ACTIVATION_PREREQUISITE_FIXTURES

const safeContext: ActivationContext = {
  freeHands: true,
  exposedSkin: true,
  role: 'medic',
  environment: 'clear-line-of-sight',
  formationMaintained: true,
  pairedContact: true,
}

describe('activationPrerequisite (SPE-714 slice 1)', () => {
  it('validates fixtures and rejects malformed or duplicate records', () => {
    expect(validateActivationPrerequisites(fixtures)).toEqual({ valid: true, issues: [] })

    const duplicate = [...fixtures, fixtures[0]]
    const result = validateActivationPrerequisites(duplicate)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.code)).toContain('duplicate_prerequisite_id')

    const bad = validateActivationPrerequisites([
      { id: 'bad', itemRef: 'item:medkit', actionRef: 'action:stabilize', kind: 'free_hands' },
    ])
    expect(bad.valid).toBe(false)
    expect(bad.issues.some((i) => i.code === 'invalid_prerequisite_id')).toBe(true)
  })

  it('fails activation when a prerequisite is missing', () => {
    const noHands: ActivationContext = { ...safeContext, freeHands: false }
    const eligibility = evaluateActivationEligibility(
      fixtures,
      'item:medkit',
      'action:stabilize',
      noHands
    )
    expect(eligibility.eligible).toBe(false)
    expect(eligibility.reasons).toContain('missing_free_hands')
  })

  it('changes activation legality via role or environment compatibility', () => {
    const wrongRole: ActivationContext = { ...safeContext, role: 'technician' }
    const roleFail = evaluateActivationEligibility(
      fixtures,
      'item:medkit',
      'action:stabilize',
      wrongRole
    )
    expect(roleFail.eligible).toBe(false)
    expect(roleFail.reasons).toContain('role_incompatible')

    const badEnv: ActivationContext = { ...safeContext, environment: 'obscured' }
    const envFail = evaluateActivationEligibility(fixtures, 'item:scanner', 'action:scan', badEnv)
    expect(envFail.eligible).toBe(false)
    expect(envFail.reasons).toContain('environment_not_ready')

    const good = evaluateActivationEligibility(
      fixtures,
      'item:medkit',
      'action:stabilize',
      safeContext
    )
    expect(good.eligible).toBe(true)
    expect(good.reasons).toEqual([])
  })

  it('evaluates action independently and returns inspectable reasons deterministically', () => {
    const mixed: ActivationContext = {
      ...safeContext,
      freeHands: false,
      role: 'technician',
    }
    const a = evaluateActivationEligibility(fixtures, 'item:medkit', 'action:stabilize', mixed)
    const b = evaluateActivationEligibility(fixtures, 'item:medkit', 'action:stabilize', mixed)
    expect(a).toEqual(b)
    expect(a.reasons).toEqual(['missing_free_hands', 'role_incompatible'])

    // Sibling action on same item with no matching prereq is eligible
    const other = evaluateActivationEligibility(
      fixtures,
      'item:medkit',
      'action:other',
      mixed
    )
    expect(other.eligible).toBe(true)
  })
})
