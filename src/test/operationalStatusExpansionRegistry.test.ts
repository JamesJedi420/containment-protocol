import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_OPERATIONAL_STATUS_EXPANSION_REGISTRY,
  EFFECT_DURATION_MODE_OWNER,
  EFFECT_STACK_POLICY_OWNER,
  OPERATIONAL_STATUS_DOMAINS,
  OPERATIONAL_STATUS_EXPANSION_OWNER,
  OPERATIONAL_STATUS_LABEL_TONES,
  OPERATIONAL_STATUS_OWNER_REFERENCES,
  STATUS_EFFECT_REGISTRY_OWNER,
  TRIGGER_COUNTED_DURATION_OWNER,
  projectOperationalStatusExpansionRegistry,
  projectOperationalStatusRecord,
  validateOperationalStatusExpansionRegistry,
  validateOperationalStatusRecord,
  type OperationalStatusExpansionRegistry,
  type OperationalStatusRecord,
} from '../domain/operationalStatusExpansionRegistry'

function baseRecord(overrides: Partial<OperationalStatusRecord> = {}): OperationalStatusRecord {
  const fixture = DEFAULT_OPERATIONAL_STATUS_EXPANSION_REGISTRY.entries[0]!
  return {
    ...fixture,
    id: 'operational-status:test:bounded-record',
    stackPolicy: { ...fixture.stackPolicy },
    label: { ...fixture.label },
    owners: { ...fixture.owners },
    ...overrides,
  }
}

function issueCodes(record: OperationalStatusRecord) {
  return validateOperationalStatusRecord(record).issues.map((issue) => issue.code)
}

describe('operationalStatusExpansionRegistry (SPE-2166 slice 1)', () => {
  it('defines one valid fixture for every required operational domain', () => {
    const registry = DEFAULT_OPERATIONAL_STATUS_EXPANSION_REGISTRY
    const validation = validateOperationalStatusExpansionRegistry(registry)

    expect(validation).toEqual({ valid: true, issues: [] })
    expect(registry.entries.map((entry) => entry.domain)).toEqual(OPERATIONAL_STATUS_DOMAINS)
    expect(registry.entries).toHaveLength(7)
    for (const entry of registry.entries) {
      expect(entry.severityTier).toBeTruthy()
      expect(entry.stackPolicy.policyRef).toMatch(/^stack-policy:/)
      expect(entry.durationModeRef).toBeTruthy()
      expect(entry.reportingCategory).toBeTruthy()
      expect(entry.label.careReviewed).toBe(true)
      expect(entry.label.personFirst).toBe(true)
    }
  })

  it('preserves explicit status, stacking, and duration ownership references', () => {
    expect(OPERATIONAL_STATUS_OWNER_REFERENCES).toEqual({
      statusRegistryOwner: STATUS_EFFECT_REGISTRY_OWNER,
      stackPolicyOwner: EFFECT_STACK_POLICY_OWNER,
      durationModeOwner: EFFECT_DURATION_MODE_OWNER,
      triggerCountedDurationOwner: TRIGGER_COUNTED_DURATION_OWNER,
    })
    expect(OPERATIONAL_STATUS_EXPANSION_OWNER).toBe('SPE-2166')
    expect(STATUS_EFFECT_REGISTRY_OWNER).toBe('SPE-1365')
    expect(EFFECT_STACK_POLICY_OWNER).toBe('SPE-780')
    expect(EFFECT_DURATION_MODE_OWNER).toBe('SPE-2191')
    expect(TRIGGER_COUNTED_DURATION_OWNER).toBe('SPE-1369')
    expect(OPERATIONAL_STATUS_LABEL_TONES).toEqual(['neutral', 'supportive', 'procedural'])
  })

  it('rejects unknown domains and severity tiers', () => {
    const result = issueCodes(
      baseRecord({
        domain: 'combat_only' as OperationalStatusRecord['domain'],
        severityTier: 'overwhelming' as OperationalStatusRecord['severityTier'],
      })
    )

    expect(result).toEqual(expect.arrayContaining(['invalid_domain', 'invalid_severity_tier']))
    expect(result).toHaveLength(2)
  })

  it('rejects contradictory or malformed stack-policy references', () => {
    expect(
      issueCodes(
        baseRecord({
          stackPolicy: { policyRef: 'stack-policy:bounded-additive' },
        })
      )
    ).toContain('contradictory_stack_policy')
    expect(
      issueCodes(
        baseRecord({
          stackPolicy: { policyRef: 'stack-policy:replace', maxInstances: 3 },
        })
      )
    ).toContain('contradictory_stack_policy')
    expect(
      issueCodes(
        baseRecord({
          stackPolicy: { policyRef: 'stack-policy:bounded-additive', maxInstances: 1 },
        })
      )
    ).toContain('contradictory_stack_policy')
    expect(
      issueCodes(
        baseRecord({
          stackPolicy: {
            policyRef:
              'stack-policy:unbounded' as OperationalStatusRecord['stackPolicy']['policyRef'],
          },
        })
      )
    ).toContain('invalid_stack_policy_ref')
  })

  it('validates duration modes through the SPE-2191 registry vocabulary', () => {
    expect(
      issueCodes(
        baseRecord({
          durationModeRef: 'trigger_counted' as OperationalStatusRecord['durationModeRef'],
        })
      )
    ).toContain('invalid_duration_mode_ref')
    expect(validateOperationalStatusRecord(baseRecord({ durationModeRef: 'timed' })).valid).toBe(
      true
    )
  })

  it('rejects unsafe or incomplete care-aware label metadata', () => {
    expect(
      issueCodes(
        baseRecord({
          label: {
            displayLabel: 'Support review requested',
            tone: 'supportive',
            personFirst: false,
            careReviewed: false,
          } as unknown as OperationalStatusRecord['label'],
        })
      )
    ).toContain('unsafe_label_metadata')
    expect(
      issueCodes(
        baseRecord({
          label: {
            displayLabel: ' ',
            tone: 'neutral',
            personFirst: true,
            careReviewed: true,
          },
        })
      )
    ).toContain('missing_label')
  })

  it('rejects missing, untrimmed, and non-namespaced references', () => {
    const missing = issueCodes(baseRecord({ id: '', removalPathRef: '' }))
    expect(missing).toEqual(expect.arrayContaining(['missing_id', 'missing_removal_path_ref']))

    const malformed = issueCodes(
      baseRecord({
        id: ' operational-status:test:padded ',
        removalPathRef: 'manual-review',
      })
    )
    expect(malformed).toEqual(
      expect.arrayContaining(['untrimmed_reference', 'invalid_removal_path_ref'])
    )
    expect(issueCodes(baseRecord({ removalPathRef: 'removal-path:' }))).toContain(
      'invalid_removal_path_ref'
    )
  })

  it('rejects missing owner references and duplicate registry ids', () => {
    expect(
      issueCodes(
        baseRecord({
          owners: {
            ...OPERATIONAL_STATUS_OWNER_REFERENCES,
            stackPolicyOwner: 'SPE-2166',
          } as unknown as OperationalStatusRecord['owners'],
        })
      )
    ).toContain('invalid_owner_references')

    const duplicate = baseRecord()
    const validation = validateOperationalStatusExpansionRegistry({
      entries: [duplicate, { ...duplicate }],
    })
    expect(validation.issues.map((issue) => issue.code)).toContain('duplicate_id')

    const canonicalCollision = validateOperationalStatusExpansionRegistry({
      entries: [
        baseRecord({ id: ' operational-status:test:canonical-collision ' }),
        baseRecord({ id: 'operational-status:test:canonical-collision' }),
      ],
    })
    expect(canonicalCollision.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['untrimmed_reference', 'duplicate_id'])
    )
  })

  it('projects stable immutable rows without mutating the source record', () => {
    const source = baseRecord()
    const before = JSON.stringify(source)
    const first = projectOperationalStatusRecord(source)
    const second = projectOperationalStatusRecord(source)

    expect(first).toEqual(second)
    expect(JSON.stringify(source)).toBe(before)
    expect(Object.isFrozen(first)).toBe(true)
    expect(Object.keys(first)).toEqual([
      'id',
      'domain',
      'severityTier',
      'displayLabel',
      'stackPolicyRef',
      'stackMaxInstances',
      'durationModeRef',
      'visibility',
      'removalPathRef',
      'reportingCategory',
      'owner',
      'statusRegistryOwner',
      'stackPolicyOwner',
      'durationModeOwner',
      'triggerCountedDurationOwner',
    ])
  })

  it('keeps legal, social, and memory projections distinct from physical status', () => {
    const projections = projectOperationalStatusExpansionRegistry(
      DEFAULT_OPERATIONAL_STATUS_EXPANSION_REGISTRY
    )
    const byDomain = new Map(projections.map((projection) => [projection.domain, projection]))

    expect(Object.isFrozen(projections)).toBe(true)
    expect(byDomain.get('physical')?.reportingCategory).toBe('wellbeing')
    expect(byDomain.get('physical')?.visibility).toBe('restricted')
    expect(byDomain.get('cognitive')?.visibility).toBe('private')
    expect(byDomain.get('legal')?.reportingCategory).toBe('compliance')
    expect(byDomain.get('social')?.reportingCategory).toBe('relationship')
    expect(byDomain.get('memory')?.reportingCategory).toBe('knowledge_integrity')
    expect(byDomain.get('memory')?.stackMaxInstances).toBe(3)
  })

  it('fails closed when asked to project an invalid record or registry', () => {
    expect(
      validateOperationalStatusRecord(null as unknown as OperationalStatusRecord).issues.map(
        (issue) => issue.code
      )
    ).toEqual(['invalid_record'])
    expect(
      validateOperationalStatusExpansionRegistry(
        null as unknown as OperationalStatusExpansionRegistry
      ).issues.map((issue) => issue.code)
    ).toEqual(['invalid_registry'])
    expect(() =>
      projectOperationalStatusRecord(
        baseRecord({ domain: 'unknown' as OperationalStatusRecord['domain'] })
      )
    ).toThrow('invalid operational status record: invalid_domain')
    expect(() =>
      projectOperationalStatusExpansionRegistry({
        entries: [baseRecord(), baseRecord()],
      })
    ).toThrow('invalid operational status registry: duplicate_id')
  })

  it('stays a pure domain registry without runtime, store, projection, or UI imports', () => {
    const source = readFileSync(
      path.join(__dirname, '../domain/operationalStatusExpansionRegistry.ts'),
      'utf8'
    )

    expect(source).not.toMatch(/from ['"].*app\//)
    expect(source).not.toMatch(/from ['"].*components\//)
    expect(source).not.toMatch(/from ['"].*features/)
    expect(source).not.toMatch(/from ['"]react/)
    expect(source).not.toContain('GameState')
    expect(source).not.toContain('advanceWeek')
    expect(source).not.toContain('Math.random')
    expect(source).not.toContain('Date.now')
  })
})
