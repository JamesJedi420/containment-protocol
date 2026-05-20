import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
  STEALTH_LEAVE_BEHIND_KINDS,
  getStealthLeaveBehindById,
  isStealthLeaveBehindKind,
  validateStealthLeaveBehindDefinition,
  validateStealthLeaveBehindRegistry,
  type StealthLeaveBehindDefinition,
} from '../domain/stealthLeaveBehindRegistry'

function baseDefinition(
  overrides: Partial<StealthLeaveBehindDefinition> = {}
): StealthLeaveBehindDefinition {
  return {
    id: 'leave-behind:abandon-evidence',
    kind: 'abandon_evidence',
    label: 'Abandon compromised evidence',
    discoveryRisk: 0.35,
    custodyLossRefs: ['custody:packet-alpha'],
    ...overrides,
  }
}

describe('stealthLeaveBehindRegistry (SPE-2163 slice 1)', () => {
  it('exposes the five canonical leave-behind kinds', () => {
    expect(STEALTH_LEAVE_BEHIND_KINDS).toEqual([
      'abandon_evidence',
      'burn_tool',
      'expose_witness',
      'leave_trace',
      'risk_discovery',
    ])
    expect(isStealthLeaveBehindKind('abandon_evidence')).toBe(true)
    expect(isStealthLeaveBehindKind('unknown_kind')).toBe(false)
  })

  it('validates a well-formed definition', () => {
    const result = validateStealthLeaveBehindDefinition(baseDefinition())

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('allows empty custodyLossRefs for score-only leave-behind tradeoffs', () => {
    const result = validateStealthLeaveBehindDefinition(
      baseDefinition({ custodyLossRefs: [] })
    )

    expect(result.valid).toBe(true)
    expect(getStealthLeaveBehindById(DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY, 'leave-behind:burn-tool')
      ?.custodyLossRefs).toEqual([])
  })

  it('rejects custody refs that collide on investigation flag suffixes', () => {
    const result = validateStealthLeaveBehindDefinition(
      baseDefinition({
        custodyLossRefs: ['custody:packet-alpha', 'custody/packet/alpha'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('colliding_custody_loss_ref')
  })

  it('rejects invalid discovery risk, ids, kinds, and custody refs', () => {
    const result = validateStealthLeaveBehindDefinition(
      baseDefinition({
        id: '',
        kind: 'not_a_kind' as StealthLeaveBehindDefinition['kind'],
        label: '   ',
        discoveryRisk: 1.5,
        custodyLossRefs: ['', 'custody:ok', 'custody:ok'],
      })
    )

    expect(result.valid).toBe(false)
    expect(result.issues.map((issue) => issue.code).sort()).toEqual(
      [
        'duplicate_custody_loss_ref',
        'empty_custody_loss_ref',
        'invalid_discovery_risk',
        'invalid_kind',
        'missing_id',
        'missing_label',
      ].sort()
    )
  })

  it('validates the default registry with one entry per kind and unique ids', () => {
    const result = validateStealthLeaveBehindRegistry(DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY)

    expect(result.valid).toBe(true)
    expect(DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY.entries).toHaveLength(
      STEALTH_LEAVE_BEHIND_KINDS.length
    )

    for (const kind of STEALTH_LEAVE_BEHIND_KINDS) {
      const matches = DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY.entries.filter(
        (entry) => entry.kind === kind
      )
      expect(matches).toHaveLength(1)
    }
  })

  it('rejects duplicate ids across registry entries', () => {
    const duplicate = baseDefinition({ id: 'leave-behind:dup' })
    const result = validateStealthLeaveBehindRegistry({
      entries: [duplicate, { ...duplicate, label: 'Second copy' }],
    })

    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'duplicate_id')).toBe(true)
  })

  it('looks up entries by id', () => {
    const entry = getStealthLeaveBehindById(
      DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
      'leave-behind:risk-discovery'
    )

    expect(entry?.kind).toBe('risk_discovery')
    expect(entry?.discoveryRisk).toBeGreaterThan(0)
    expect(getStealthLeaveBehindById(DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY, 'missing')).toBe(
      undefined
    )
  })
})
