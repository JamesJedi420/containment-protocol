import { describe, expect, it } from 'vitest'
import {
  CRITICAL_SUPPORTABILITY_ASSET_ID,
  resolveCriticalAssetSupportability,
  type CriticalAssetSupportabilityRequest,
} from '../domain/criticalAssetSupportability'

function baseRequest(
  overrides?: Partial<CriticalAssetSupportabilityRequest>
): CriticalAssetSupportabilityRequest {
  return {
    assetId: CRITICAL_SUPPORTABILITY_ASSET_ID,
    integrityCondition: 'healthy',
    spareAvailable: true,
    supplierDisrupted: false,
    qualifiedMaintainerAvailable: true,
    documentationFresh: true,
    toolingAvailable: true,
    compatibilityOk: true,
    replacementPathViable: true,
    ...overrides,
  }
}

describe('SPE-3153 critical asset supportability', () => {
  it('supports a healthy asset when all support inputs are adequate', () => {
    const result = resolveCriticalAssetSupportability(baseRequest())
    expect(result).toMatchObject({
      assetId: CRITICAL_SUPPORTABILITY_ASSET_ID,
      state: 'supported',
      reasons: ['ok'],
      integrityCondition: 'healthy',
      sourceAuthoritiesUnchanged: true,
    })
  })

  it('marks a healthy asset at_risk when soft support inputs are inadequate', () => {
    const result = resolveCriticalAssetSupportability(
      baseRequest({
        integrityCondition: 'healthy',
        supplierDisrupted: true,
        documentationFresh: false,
      })
    )
    expect(result.state).toBe('at_risk')
    expect(result.reasons).toEqual(['supplier_disrupted', 'documentation_stale'])
    expect(result.provenance).toEqual(['supplier', 'documentation'])
    expect(result.integrityCondition).toBe('healthy')
  })

  it('marks a healthy asset unsustainable when hard support inputs fail', () => {
    const result = resolveCriticalAssetSupportability(
      baseRequest({
        integrityCondition: 'healthy',
        spareAvailable: false,
      })
    )
    expect(result).toMatchObject({
      state: 'unsustainable',
      reasons: ['spare_unavailable'],
      provenance: ['spare_stock'],
      integrityCondition: 'healthy',
    })
  })

  it('keeps a degraded asset supported when repair/support prerequisites remain available', () => {
    const result = resolveCriticalAssetSupportability(
      baseRequest({
        integrityCondition: 'degraded',
      })
    )
    expect(result).toMatchObject({
      state: 'supported',
      reasons: ['ok'],
      integrityCondition: 'degraded',
      sourceAuthoritiesUnchanged: true,
    })
  })

  it('changes supportability deterministically when authoritative inputs change', () => {
    const supported = resolveCriticalAssetSupportability(baseRequest())
    expect(supported.state).toBe('supported')

    const afterStock = resolveCriticalAssetSupportability(
      baseRequest({ spareAvailable: false })
    )
    expect(afterStock.state).toBe('unsustainable')
    expect(afterStock.reasons).toContain('spare_unavailable')

    const afterMaintainer = resolveCriticalAssetSupportability(
      baseRequest({ qualifiedMaintainerAvailable: false })
    )
    expect(afterMaintainer.state).toBe('at_risk')
    expect(afterMaintainer.reasons).toContain('maintainer_unavailable')

    const afterCompat = resolveCriticalAssetSupportability(
      baseRequest({ compatibilityOk: false })
    )
    expect(afterCompat.state).toBe('unsustainable')
    expect(afterCompat.provenance).toContain('compatibility')
  })

  it('proves integrity is orthogonal to supportability', () => {
    const healthyUnsustainable = resolveCriticalAssetSupportability(
      baseRequest({
        integrityCondition: 'healthy',
        replacementPathViable: false,
      })
    )
    const degradedSupported = resolveCriticalAssetSupportability(
      baseRequest({
        integrityCondition: 'degraded',
      })
    )
    expect(healthyUnsustainable.state).toBe('unsustainable')
    expect(healthyUnsustainable.integrityCondition).toBe('healthy')
    expect(degradedSupported.state).toBe('supported')
    expect(degradedSupported.integrityCondition).toBe('degraded')
  })

  it('fail-closes malformed requests without claiming source authority mutation', () => {
    expect(resolveCriticalAssetSupportability(baseRequest({ assetId: '' })).reasons).toContain(
      'malformed_request'
    )
    expect(
      resolveCriticalAssetSupportability({
        ...baseRequest(),
        // @ts-expect-error intentional malformed integrity
        integrityCondition: 'broken',
      }).reasons
    ).toContain('malformed_request')
  })

  it('is deterministic across repeated evaluation of unchanged inputs', () => {
    const request = baseRequest({ toolingAvailable: false })
    const first = resolveCriticalAssetSupportability(request)
    const second = resolveCriticalAssetSupportability(request)
    expect(second).toEqual(first)
  })
})
