/**
 * SPE-2098 — focused tests for world-law domain profile.
 */

import { describe, expect, it } from 'vitest'
import {
  validateCapabilityAgainstDomain,
  validateWorldLawProfile,
  type WorldLawDomainProfile,
  type CapabilityRequest,
} from '../domain/worldLawDomainProfile'

const baseParams = {
  gravityBand: 'standard',
  transitLogic: 'euclidean',
  paradoxTolerance: 40,
} as const

function makeProfile(
  overrides: Partial<WorldLawDomainProfile> = {},
): WorldLawDomainProfile {
  return {
    schemaVersion: 'spe-2098.v1',
    domainId: 'hub-alpha',
    supportedFamilies: ['technological', 'mundane_public'],
    suppressedFamilies: ['occult_technique'],
    parameters: baseParams,
    provenance: 'test-fixture',
    ...overrides,
  }
}

describe('SPE-2098 world-law domain profile', () => {
  it('two domain profiles reject different capability families deterministically', () => {
    const techDomain = makeProfile({
      domainId: 'tech-domain',
      supportedFamilies: ['technological'],
      suppressedFamilies: ['occult_technique'],
    })
    const occultDomain = makeProfile({
      domainId: 'occult-domain',
      supportedFamilies: ['occult_technique'],
      suppressedFamilies: ['technological'],
    })

    const techReq: CapabilityRequest = {
      requestId: 'r1',
      family: 'occult_technique',
    }
    const occultReq: CapabilityRequest = {
      requestId: 'r1',
      family: 'technological',
    }

    const techResult = validateCapabilityAgainstDomain(techDomain, techReq)
    const occultResult = validateCapabilityAgainstDomain(occultDomain, occultReq)

    expect(techResult.ok).toBe(false)
    expect(occultResult.ok).toBe(false)
    if (!techResult.ok) {
      expect(techResult.contradiction.reasonCode).toBe('family_suppressed')
    }
    if (!occultResult.ok) {
      expect(occultResult.contradiction.reasonCode).toBe('family_suppressed')
    }
  })

  it('unsupported action yields WorldLawContradictionEvent not silent pass', () => {
    const profile = makeProfile({
      supportedFamilies: ['technological'],
      suppressedFamilies: [],
    })
    const request: CapabilityRequest = {
      requestId: 'unsupported',
      family: 'occult_technique',
    }
    const result = validateCapabilityAgainstDomain(profile, request)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.contradiction.hooks).toContain('suppression')
      expect(result.contradiction.reasonCode).toBe('family_not_supported')
    }
  })

  it('selective suppression: family A allowed, family B blocked on same domain', () => {
    const profile = makeProfile({
      supportedFamilies: ['technological'],
      suppressedFamilies: ['occult_technique'],
    })
    const allowed = validateCapabilityAgainstDomain(profile, {
      requestId: 'a',
      family: 'technological',
    })
    const blocked = validateCapabilityAgainstDomain(profile, {
      requestId: 'b',
      family: 'occult_technique',
    })
    expect(allowed.ok).toBe(true)
    expect(blocked.ok).toBe(false)
  })

  it('explicit parameter (paradox tolerance) changes validation outcome', () => {
    const strict = makeProfile({
      parameters: { ...baseParams, paradoxTolerance: 10 },
    })
    const loose = makeProfile({
      parameters: { ...baseParams, paradoxTolerance: 80 },
    })
    const request: CapabilityRequest = {
      requestId: 'paradox',
      family: 'technological',
      paradoxDemand: 50,
    }
    const strictResult = validateCapabilityAgainstDomain(strict, request)
    const looseResult = validateCapabilityAgainstDomain(loose, request)
    expect(strictResult.ok).toBe(false)
    expect(looseResult.ok).toBe(true)
    if (!strictResult.ok) {
      expect(strictResult.contradiction.reasonCode).toBe(
        'paradox_tolerance_exceeded',
      )
    }
  })

  it('negative: only mundane_public used to authorize occult_technique → capability_family_collapse', () => {
    const profile = makeProfile({
      supportedFamilies: ['mundane_public'],
      suppressedFamilies: [],
    })
    const lint = validateWorldLawProfile(profile)
    expect(lint.some((d) => d.code === 'capability_family_collapse')).toBe(true)
  })

  it('negative: custom domain without validationHookIds → error', () => {
    const profile = makeProfile({
      domainId: 'custom-domain',
      validationHookIds: [],
    })
    const lint = validateWorldLawProfile(profile)
    expect(lint.some((d) => d.code === 'missing_validation_hooks')).toBe(true)
  })

  it('repeated validation runs are byte-stable', () => {
    const profile = makeProfile()
    const request: CapabilityRequest = {
      requestId: 'stable',
      family: 'technological',
    }
    const first = JSON.stringify(
      validateCapabilityAgainstDomain(profile, request),
    )
    const second = JSON.stringify(
      validateCapabilityAgainstDomain(profile, request),
    )
    expect(first).toBe(second)
  })
})
