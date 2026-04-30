import { describe, expect, it } from 'vitest'
import {
  countFalseClaims,
  countMechanicallyTrueClaims,
  deriveFolkloreOperationalResponse,
  deriveTruthProfilePressureSurface,
  hasDirectionallyUsefulTiming,
  resolveFolklorePacket,
  type FolklorePacketInput,
} from '../domain/folkloreTruthProfiles'

function makeFolklorePacket(): FolklorePacketInput {
  return {
    packetId: 'folklore:estuary-night-rules',
    label: 'Estuary Night Rules',
    localCulture: {
      nameSensitiveEvil: true,
      publicDisclosureNorm: 'guarded',
    },
    claims: [
      {
        claimId: 'claim:salt-threshold',
        label: 'Salt lines keep the river thing from crossing the sill.',
        category: 'hard_counter',
        baseConfidence: 0.62,
        profileTruth: {
          skeptical_modern: 'false',
          veiled_intrusion: 'partial',
          active_folklore: 'mechanically_true',
        },
        guidanceTags: ['counter:salt', 'surface:threshold'],
      },
      {
        claimId: 'claim:bell-appeasement',
        label: 'A chapel bell rung before dawn buys one safe crossing.',
        category: 'appeasement_rite',
        baseConfidence: 0.58,
        profileTruth: {
          skeptical_modern: 'false',
          veiled_intrusion: 'mechanically_true',
          active_folklore: 'mechanically_true',
        },
        guidanceTags: ['rite:appeasement', 'timing:predawn'],
      },
      {
        claimId: 'claim:full-moon-window',
        label: 'The estuary hunts only on the full moon.',
        category: 'timing_rule',
        baseConfidence: 0.66,
        profileTruth: {
          skeptical_modern: 'false',
          veiled_intrusion: 'partial',
          active_folklore: 'partial',
        },
        timingPrecisionByProfile: {
          skeptical_modern: 'inexact',
          veiled_intrusion: 'directional',
          active_folklore: 'directional',
        },
        guidanceTags: ['timing:lunar', 'risk:cycle'],
      },
      {
        claimId: 'claim:rowan-charm',
        label: 'Carry rowan and never say its true name near the quay.',
        category: 'survival_test',
        baseConfidence: 0.6,
        profileTruth: {
          skeptical_modern: 'false',
          veiled_intrusion: 'partial',
          active_folklore: 'mechanically_true',
        },
        guidanceTags: ['counter:rowan', 'culture:name-sensitive'],
      },
    ],
  }
}

describe('folkloreTruthProfiles', () => {
  it('makes most folklore reports false in one profile and mechanically true in another', () => {
    const skeptical = resolveFolklorePacket(makeFolklorePacket(), 'skeptical_modern')
    const active = resolveFolklorePacket(makeFolklorePacket(), 'active_folklore')

    expect(countFalseClaims(skeptical)).toBe(4)
    expect(countMechanicallyTrueClaims(active)).toBe(3)
    expect(active.claims.find((claim) => claim.claimId === 'claim:salt-threshold')?.truthState).toBe(
      'mechanically_true'
    )
  })

  it('switches folklore packet behavior by truth profile with deterministic confidence variation', () => {
    const skeptical = resolveFolklorePacket(makeFolklorePacket(), 'skeptical_modern')
    const veiled = resolveFolklorePacket(makeFolklorePacket(), 'veiled_intrusion')
    const skepticalResponse = deriveFolkloreOperationalResponse(skeptical)
    const veiledResponse = deriveFolkloreOperationalResponse(veiled)

    expect(
      skeptical.claims.find((claim) => claim.claimId === 'claim:bell-appeasement')
    ).toEqual({
      claimId: 'claim:bell-appeasement',
      label: 'A chapel bell rung before dawn buys one safe crossing.',
      category: 'appeasement_rite',
      truthState: 'false',
      confidence: 0.36,
      guidanceTags: ['rite:appeasement', 'timing:predawn'],
    })
    expect(
      veiled.claims.find((claim) => claim.claimId === 'claim:bell-appeasement')?.truthState
    ).toBe('mechanically_true')
    expect(
      veiled.claims.find((claim) => claim.claimId === 'claim:bell-appeasement')?.confidence
    ).toBe(0.76)
    expect(skepticalResponse.briefingDisposition).toBe('dismiss_as_noise')
    expect(veiledResponse.briefingDisposition).toBe('verify_selectively')
    expect(veiledResponse.requiredCounterTags).toEqual(['rite:appeasement', 'timing:predawn'])
  })

  it('changes anomaly pressure and institutional response by prevalence setting', () => {
    const skeptical = deriveTruthProfilePressureSurface('skeptical_modern')
    const active = deriveTruthProfilePressureSurface('active_folklore')

    expect(skeptical).toEqual({
      profileId: 'skeptical_modern',
      anomalyEncounterPressure: 0.24,
      institutionalResponsePosture: 'dismissive',
      witnessReliability: 0.31,
      publicLegibility: 'denied',
    })
    expect(active).toEqual({
      profileId: 'active_folklore',
      anomalyEncounterPressure: 0.85,
      institutionalResponsePosture: 'mobilized',
      witnessReliability: 0.78,
      publicLegibility: 'accepted',
    })
  })

  it('supports mixed true and false survival folklore with directionally useful cyclical timing', () => {
    const veiled = resolveFolklorePacket(makeFolklorePacket(), 'veiled_intrusion')

    expect(veiled.claims.filter((claim) => claim.truthState === 'mechanically_true')).toHaveLength(1)
    expect(veiled.claims.filter((claim) => claim.truthState === 'partial')).toHaveLength(3)
    expect(
      veiled.claims.find((claim) => claim.claimId === 'claim:bell-appeasement')?.truthState
    ).toBe('mechanically_true')
    expect(hasDirectionallyUsefulTiming(veiled)).toBe(true)
    expect(
      veiled.claims.find((claim) => claim.claimId === 'claim:full-moon-window')?.timingPrecision
    ).toBe('directional')
  })

  it('remains repeatable for identical profile and folklore inputs', () => {
    const firstPacket = resolveFolklorePacket(makeFolklorePacket(), 'veiled_intrusion')
    const secondPacket = resolveFolklorePacket(makeFolklorePacket(), 'veiled_intrusion')
    const firstPressure = deriveTruthProfilePressureSurface('veiled_intrusion')
    const secondPressure = deriveTruthProfilePressureSurface('veiled_intrusion')

    expect(secondPacket).toEqual(firstPacket)
    expect(secondPressure).toEqual(firstPressure)
  })
})
