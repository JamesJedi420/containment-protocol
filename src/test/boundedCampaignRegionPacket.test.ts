import { describe, expect, it } from 'vitest'
import {
  BOUNDED_CAMPAIGN_REGION_PACKET_FIXTURES,
  lookupBoundedCampaignRegionPacket,
  normalizeBoundedCampaignRegionPackets,
  validateBoundedCampaignRegionPackets,
} from '../domain/boundedCampaignRegionPacket'
import type { BoundedCampaignRegionPacket } from '../domain/boundedCampaignRegionPacket'

const fixtures = BOUNDED_CAMPAIGN_REGION_PACKET_FIXTURES

describe('boundedCampaignRegionPacket (SPE-2227 slice 1)', () => {
  it('accepts a fixture packet with legal boundaries, hooks, and operational dossier fields', () => {
    expect(validateBoundedCampaignRegionPackets(fixtures)).toEqual({ valid: true, issues: [] })
    const district = fixtures[0]!
    expect(district.premise).toBeDefined()
    expect(district.authorityStructure).toBeDefined()
    expect(district.recurringIncidentPressure).toBeDefined()
    expect(lookupBoundedCampaignRegionPacket(fixtures, district.id)).toEqual({
      status: 'found',
      packet: district,
    })
  })

  it('rejects packets with missing boundary refs or unknown instability hook ids', () => {
    const missingBoundaries: BoundedCampaignRegionPacket = {
      id: 'region-packet:empty-bounds',
      regionKind: 'facility',
      boundaryRefs: [],
      instabilityHookIds: ['resource_scarcity'],
    }
    const missing = validateBoundedCampaignRegionPackets([missingBoundaries])
    expect(missing.valid).toBe(false)
    expect(missing.issues.some((issue) => issue.code === 'missing_boundary_refs')).toBe(true)

    const unknownHook = validateBoundedCampaignRegionPackets([
      {
        id: 'region-packet:bad-hook',
        regionKind: 'campus',
        boundaryRefs: ['boundary:campus-edge'],
        instabilityHookIds: ['unknown_hook'],
      },
    ])
    expect(unknownHook.valid).toBe(false)
    expect(unknownHook.issues.some((issue) => issue.code === 'unknown_instability_hook_id')).toBe(
      true
    )
  })

  it('looks up packets deterministically without live map traversal or input mutation', () => {
    const reversed = [...fixtures].reverse()
    const snapshot = JSON.stringify(reversed)
    const forward = normalizeBoundedCampaignRegionPackets(fixtures)
    const backward = normalizeBoundedCampaignRegionPackets(reversed)
    expect(forward).toEqual(backward)
    expect(forward?.map((packet) => packet.id)).toEqual([
      'region-packet:north-district',
      'region-packet:service-corridor',
    ])
    expect(lookupBoundedCampaignRegionPacket(reversed, 'region-packet:north-district').status).toBe(
      'found'
    )
    expect(JSON.stringify(reversed)).toBe(snapshot)
    expect(normalizeBoundedCampaignRegionPackets([])).toEqual([])
    expect(lookupBoundedCampaignRegionPacket(fixtures, 'region-packet:missing').status).toBe(
      'unknown_packet_id'
    )
    expect(lookupBoundedCampaignRegionPacket(fixtures, 'not-a-packet').status).toBe(
      'invalid_packet_id'
    )
  })

  it('normalizes all approved dossier fields and canonical tokens before lookup', () => {
    const packet: BoundedCampaignRegionPacket = {
      id: ' region-packet:full-dossier ',
      regionKind: 'facility',
      boundaryRefs: [' boundary:outer-edge '],
      instabilityHookIds: ['social_pressure'],
      premise: ' Bounded operational theater ',
      authorityStructure: ' Local liaison ',
      recurringIncidentPressure: ' Recurring disturbances ',
      resourceScarcity: ' Limited resupply ',
      socialPressure: ' Disputed jurisdiction ',
      entryState: ' Checkpoint open ',
      exitState: ' Clearance required ',
      ecology: ' Contaminated wetland ',
      history: ' Former depot ',
      lifecycle: ' Stabilizing ',
      sites: [' Depot '],
      unsafeRoutes: [' River crossing '],
      localHazards: [' Flooding '],
      hostileActors: [' Unidentified intruders '],
      unresolvedContradictions: [' Conflicting occupancy reports '],
      operatingLaws: [' Escort required '],
    }
    const snapshot = JSON.stringify(packet)
    expect(validateBoundedCampaignRegionPackets([packet]).valid).toBe(true)
    const normalized = normalizeBoundedCampaignRegionPackets([packet])!
    const result = normalized[0]!
    expect(result).toEqual(
      Object.fromEntries(
        Object.entries(packet).map(([key, value]) => [
          key,
          Array.isArray(value) ? value.map((entry) => entry.trim()) : value.trim(),
        ])
      )
    )
    expect(lookupBoundedCampaignRegionPacket(normalized, 'region-packet:full-dossier')).toEqual({
      status: 'found',
      packet: result,
    })
    expect(Object.isFrozen(result)).toBe(true)
    for (const value of Object.values(result)) {
      if (Array.isArray(value)) expect(Object.isFrozen(value)).toBe(true)
    }
    expect(JSON.stringify(packet)).toBe(snapshot)
    expect(result.sites).not.toBe(packet.sites)
  })

  it.each([
    'premise',
    'authorityStructure',
    'recurringIncidentPressure',
    'resourceScarcity',
    'socialPressure',
    'entryState',
    'exitState',
    'ecology',
    'history',
    'lifecycle',
  ])('rejects blank and malformed %s instead of silently dropping it', (field) => {
    for (const value of ['   ', 42, null]) {
      const packet = { ...fixtures[0]!, [field]: value }
      expect(validateBoundedCampaignRegionPackets([packet])).toMatchObject({
        valid: false,
        issues: [{ code: 'invalid_dossier_field', field: `packets[0].${field}` }],
      })
      expect(normalizeBoundedCampaignRegionPackets([packet])).toBeNull()
    }
  })

  it.each([
    'sites',
    'unsafeRoutes',
    'localHazards',
    'hostileActors',
    'unresolvedContradictions',
    'operatingLaws',
  ])('validates optional %s lists and preserves explicit empty lists', (field) => {
    for (const value of ['invalid', [' '], [null], [7], Array(1)]) {
      expect(
        validateBoundedCampaignRegionPackets([{ ...fixtures[0]!, [field]: value }]).valid
      ).toBe(false)
    }
    const normalized = normalizeBoundedCampaignRegionPackets([{ ...fixtures[1]!, [field]: [] }])!
    expect(normalized[0]).toHaveProperty(field, [])
    expect(normalized[0]).not.toHaveProperty('premise')
  })

  it('rejects duplicate ids after trimming and fails closed on invalid registry inputs', () => {
    const duplicate = { ...fixtures[0]!, id: ` ${fixtures[0]!.id} ` }
    expect(
      validateBoundedCampaignRegionPackets([...fixtures, duplicate]).issues.map(
        (issue) => issue.code
      )
    ).toContain('duplicate_packet_id')
    expect(normalizeBoundedCampaignRegionPackets([...fixtures, duplicate])).toBeNull()
    expect(validateBoundedCampaignRegionPackets(null).valid).toBe(false)
  })
})
