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
})
