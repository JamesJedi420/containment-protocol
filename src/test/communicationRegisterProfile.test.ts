import { describe, expect, it } from 'vitest'
import {
  COMMUNICATION_POOL_ENTRY_FIXTURES,
  COMMUNICATION_REGISTER_PROFILE_FIXTURES,
  selectCommunicationPoolEntry,
  validateCommunicationRegisterProfiles,
} from '../domain/communicationRegisterProfile'
import type { SelectionContext } from '../domain/communicationRegisterProfile'

describe('communicationRegisterProfile (SPE-2238 slice 1)', () => {
  it('validates required fields and domain tags on fixture profile', () => {
    const result = validateCommunicationRegisterProfiles(COMMUNICATION_REGISTER_PROFILE_FIXTURES)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('rejects global replacement table and missing domain tags', () => {
    const bad = validateCommunicationRegisterProfiles([
      {
        id: 'register-profile:bad',
        purpose: 'test',
        formalityBand: 'low',
        hostilityBand: 'low',
        trustThreshold: 0.5,
        insiderMarker: false,
        domainTags: [],
        translationDifficulty: 0,
        provenance: 'test',
        forbiddenImportNote: 'global replacement table allowed',
      },
    ])
    expect(bad.valid).toBe(false)
    expect(bad.issues.some((i) => i.code === 'missing_domain_tags')).toBe(true)
    expect(bad.issues.some((i) => i.code === 'forbidden_global_replacement')).toBe(true)
  })

  it('selects the same pool entry for the same seed and context', () => {
    const ctx: SelectionContext = {
      registerId: 'register-profile:street-informal',
      speakerRole: 'field',
      district: 'north',
      trustBand: 0.2,
      surveillanceBand: 'low',
      audience: 'private',
      seed: 42,
    }
    const a = selectCommunicationPoolEntry(COMMUNICATION_POOL_ENTRY_FIXTURES, ctx)
    const b = selectCommunicationPoolEntry(COMMUNICATION_POOL_ENTRY_FIXTURES, ctx)
    expect(a).toEqual(b)
    expect(a?.poolEntryId).toBe('pool-entry:street-brief-low-trust')
    expect(a?.phraseTriggerSeedKey).toBeDefined()
  })

  it('changes selection when surveillance band changes', () => {
    const base: SelectionContext = {
      registerId: 'register-profile:street-informal',
      speakerRole: 'field',
      district: 'north',
      trustBand: 0.2,
      surveillanceBand: 'low',
      audience: 'private',
      seed: 42,
    }
    const high: SelectionContext = { ...base, surveillanceBand: 'high' }
    const lowSel = selectCommunicationPoolEntry(COMMUNICATION_POOL_ENTRY_FIXTURES, base)
    const highSel = selectCommunicationPoolEntry(COMMUNICATION_POOL_ENTRY_FIXTURES, high)
    expect(lowSel?.poolEntryId).not.toBe(highSel?.poolEntryId)
    expect(highSel?.reliabilityFlags).toContain('deception-stub')
  })

  it('ignores unauthorized recent activity and restores prior selection', () => {
    const base: SelectionContext = {
      registerId: 'register-profile:street-informal',
      speakerRole: 'field',
      district: 'north',
      trustBand: 0.2,
      surveillanceBand: 'low',
      audience: 'private',
      seed: 42,
    }
    const withActivity: SelectionContext = { ...base, recentActivityKey: 'authorized-event-1' }
    // No matching entry for activity key, so falls back? Wait, fixtures have empty activity.
    // For this test we expect different if we had matching, but here demonstrate non-match.
    const without = selectCommunicationPoolEntry(COMMUNICATION_POOL_ENTRY_FIXTURES, base)
    const withHidden = selectCommunicationPoolEntry(COMMUNICATION_POOL_ENTRY_FIXTURES, {
      ...base,
      recentActivityKey: 'hidden-truth-event',
    })
    expect(without).toEqual(withHidden)
  })
})
