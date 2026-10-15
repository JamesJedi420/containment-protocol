import { describe, expect, it } from 'vitest'
import { project, validate } from '../domain/siteNativeObjectRemoval'

function packet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'removal-1',
    origin: 'site_native_artifact',
    provenance: 'contained_record',
    phase: 'ingress',
    ...overrides,
  }
}

describe('SPE-1667 site-native object removal', () => {
  it('uses the closed ingress base for every native origin', () => {
    const bases = [
      [
        'gifted_object',
        { attention: 1, instability: 0, factionResponse: 0, environmentalShift: 0 },
      ],
      [
        'local_evidence',
        { attention: 1, instability: 1, factionResponse: 0, environmentalShift: 0 },
      ],
      [
        'transformed_personal_item',
        { attention: 1, instability: 2, factionResponse: 0, environmentalShift: 0 },
      ],
      [
        'site_native_artifact',
        { attention: 2, instability: 2, factionResponse: 1, environmentalShift: 1 },
      ],
      [
        'protected_relic',
        { attention: 3, instability: 2, factionResponse: 2, environmentalShift: 2 },
      ],
    ] as const
    for (const [origin, severity] of bases) {
      expect(project(packet({ origin }))).toMatchObject({
        origin,
        phase: 'ingress',
        escalates: true,
        routeRisk: 0,
        pursuitPressure: 0,
        ...severity,
      })
    }
  })

  it('escalates when a site-native artifact is removed', () => {
    const escalation = project(packet())
    expect(escalation).toMatchObject({
      recordId: 'removal-1',
      origin: 'site_native_artifact',
      phase: 'ingress',
      escalates: true,
      attention: 2,
      instability: 2,
      factionResponse: 1,
      environmentalShift: 1,
      routeRisk: 0,
      pursuitPressure: 0,
    })
  })

  it('does not escalate an authorized external tool on ingress or extraction', () => {
    const ingress = project(
      packet({ origin: 'authorized_external_tool', provenance: 'unrecorded_origin' })
    )
    const extraction = project(
      packet({
        origin: 'authorized_external_tool',
        phase: 'extraction',
        containmentRole: 'exposed',
      })
    )
    expect(ingress).toMatchObject({
      escalates: false,
      attention: 0,
      instability: 0,
      factionResponse: 0,
      environmentalShift: 0,
      routeRisk: 0,
      pursuitPressure: 0,
    })
    expect(extraction).toEqual(ingress && { ...ingress, phase: 'extraction' })
  })

  it('raises removal risk when provenance is an unrecorded origin', () => {
    const catalogued = project(packet())
    const unrecorded = project(packet({ provenance: 'unrecorded_origin' }))
    expect(unrecorded?.attention).toBe((catalogued?.attention ?? 0) + 1)
    expect(unrecorded?.instability).toBe((catalogued?.instability ?? 0) + 1)
    expect(unrecorded?.factionResponse).toBe(catalogued?.factionResponse)
  })

  it('changes severity with the current containment role', () => {
    const baseline = project(packet())
    const secured = project(packet({ containmentRole: 'secured' }))
    const exposed = project(packet({ containmentRole: 'exposed' }))
    expect(secured?.instability).toBe((baseline?.instability ?? 0) + 1)
    expect(secured?.attention).toBe(baseline?.attention)
    expect(exposed?.attention).toBe((baseline?.attention ?? 0) + 1)
    expect(exposed?.instability).toBe(baseline?.instability)
  })

  it('adds return-traversal pressure only on native extraction carry-out', () => {
    const ingress = project(packet({ id: 'carry-in', phase: 'ingress' }))
    const extraction = project(packet({ id: 'carry-out', phase: 'extraction' }))
    expect(ingress).toMatchObject({ routeRisk: 0, pursuitPressure: 0 })
    expect(extraction).toMatchObject({
      escalates: true,
      routeRisk: 1,
      pursuitPressure: 1,
      attention: ingress?.attention,
      instability: ingress?.instability,
    })
  })

  it('fails closed on malformed packets and does not escalate them', () => {
    expect(validate(null).findings).toEqual([{ code: 'malformed', severity: 'error' }])
    expect(project(null)).toBeUndefined()
    expect(validate(packet({ id: '  ' })).findings).toEqual([
      { code: 'malformed', severity: 'error' },
    ])
    expect(validate(packet({ id: 'bad\0id' })).findings[0]?.code).toBe('malformed')
    expect(validate(packet({ extra: true })).findings).toEqual([
      { code: 'malformed', severity: 'error', recordId: 'removal-1' },
    ])
    expect(validate(packet({ origin: 'loot' })).findings).toEqual([
      { code: 'unknown_origin', severity: 'error', recordId: 'removal-1' },
    ])
    expect(
      validate({ id: 'removal-1', origin: 'site_native_artifact', phase: 'ingress' }).findings.map(
        (item) => item.code
      )
    ).toEqual(['missing_provenance'])
    expect(validate(packet({ provenance: '' })).findings[0]?.code).toBe('missing_provenance')
    expect(validate(packet({ provenance: undefined })).findings[0]?.code).toBe('missing_provenance')
    const inherited = Object.create({
      id: 'inherited',
      origin: 'authorized_external_tool',
      phase: 'ingress',
    }) as Record<string, unknown>
    inherited.provenance = 'contained_record'
    expect(validate(inherited).findings).toEqual([{ code: 'malformed', severity: 'error' }])
    expect(project(inherited)).toBeUndefined()
    expect(validate(packet({ provenance: 'rumor' })).findings[0]?.code).toBe('unknown_provenance')
    expect(validate(packet({ phase: 'chase' })).findings[0]?.code).toBe('unknown_phase')
    expect(validate(packet({ containmentRole: 'cursed' })).findings[0]?.code).toBe(
      'unknown_containment_role'
    )
    expect(project(packet({ origin: 'loot' }))).toBeUndefined()
  })

  it('rejects hidden or accessor-backed packet state and ignores inherited optional roles', () => {
    const hidden = packet()
    Object.defineProperty(hidden, 'extra', { value: true, enumerable: false })
    expect(validate(hidden).findings[0]?.code).toBe('malformed')
    expect(project(hidden)).toBeUndefined()

    const symbolBacked = packet()
    Object.defineProperty(symbolBacked, Symbol('extra'), { value: true })
    expect(validate(symbolBacked).findings[0]?.code).toBe('malformed')
    expect(project(symbolBacked)).toBeUndefined()

    let getterReads = 0
    const accessorBacked = packet()
    Object.defineProperty(accessorBacked, 'origin', {
      configurable: true,
      enumerable: true,
      get() {
        getterReads += 1
        return 'site_native_artifact'
      },
    })
    expect(validate(accessorBacked).findings[0]?.code).toBe('malformed')
    expect(project(accessorBacked)).toBeUndefined()
    expect(getterReads).toBe(0)

    const originalRole = Object.getOwnPropertyDescriptor(Object.prototype, 'containmentRole')
    try {
      Object.defineProperty(Object.prototype, 'containmentRole', {
        configurable: true,
        value: 'exposed',
      })
      const ordinary = packet()
      expect(validate(ordinary).request).not.toHaveProperty('containmentRole')
      expect(project(ordinary)?.attention).toBe(2)
    } finally {
      if (originalRole) {
        Object.defineProperty(Object.prototype, 'containmentRole', originalRole)
      } else {
        Reflect.deleteProperty(Object.prototype, 'containmentRole')
      }
    }
  })

  it('repeats validation and projection byte-stably without mutating the packet', () => {
    const input = packet({ containmentRole: 'secured', phase: 'extraction' })
    const snapshot = JSON.stringify(input)
    expect(JSON.stringify(validate(input))).toBe(JSON.stringify(validate(input)))
    expect(JSON.stringify(project(input))).toBe(JSON.stringify(project(input)))
    expect(JSON.stringify(input)).toBe(snapshot)
    expect(validate(input).request).toEqual(input)
  })
  it('rejects a non-enumerable allowlisted field and an inherited required origin', () => {
    const hiddenOrigin = packet()
    Object.defineProperty(hiddenOrigin, 'origin', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: 'site_native_artifact',
    })
    expect(validate(hiddenOrigin).findings).toEqual([
      { code: 'malformed', severity: 'error', recordId: 'removal-1' },
    ])
    expect(project(hiddenOrigin)).toBeUndefined()

    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'origin')
    try {
      Object.defineProperty(Object.prototype, 'origin', {
        configurable: true,
        value: 'authorized_external_tool',
      })
      const omitted = {
        id: 'removal-1',
        provenance: 'contained_record',
        phase: 'ingress',
      }
      expect(validate(omitted).findings[0]?.code).toBe('unknown_origin')
      expect(project(omitted)).toBeUndefined()
    } finally {
      if (previous) Object.defineProperty(Object.prototype, 'origin', previous)
      else Reflect.deleteProperty(Object.prototype, 'origin')
    }
  })

  it('rejects a packet whose own-key trap disagrees with its descriptor snapshot', () => {
    let calls = 0
    const proxy = new Proxy(packet(), {
      ownKeys() {
        calls += 1
        return calls === 1
          ? ['id', 'origin', 'provenance', 'phase']
          : ['id', 'origin', 'provenance', 'phase', 'extra']
      },
      getOwnPropertyDescriptor(target, key) {
        if (key === 'extra') {
          return { configurable: true, enumerable: true, writable: true, value: true }
        }
        return Object.getOwnPropertyDescriptor(target, key)
      },
    })
    expect(validate(proxy).findings[0]?.code).toBe('malformed')
    expect(project(proxy)).toBeUndefined()
  })

  it('rejects non-enumerable and symbol keys', () => {
    const hidden = packet()
    Object.defineProperty(hidden, 'hidden', { value: 1, enumerable: false })
    const symbol = packet()
    Object.defineProperty(symbol, Symbol('hidden'), { value: 1 })
    for (const input of [hidden, symbol]) {
      expect(validate(input).findings[0]?.code).toBe('malformed')
      expect(project(input)).toBeUndefined()
    }
  })

  it('rejects getters without reading them or throwing', () => {
    const input = packet()
    let reads = 0
    Object.defineProperty(input, 'origin', {
      enumerable: true,
      get() {
        reads++
        throw new Error('must not execute')
      },
    })
    expect(validate(input).findings[0]?.code).toBe('malformed')
    expect(project(input)).toBeUndefined()
    expect(reads).toBe(0)
  })

  it('ignores an inherited optional role without ambient escalation', () => {
    const input = packet()
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'containmentRole')
    try {
      Object.defineProperty(Object.prototype, 'containmentRole', {
        configurable: true,
        value: 'exposed',
      })
      expect(validate(input).request).toEqual(input)
      expect(project(input)?.attention).toBe(2)
    } finally {
      if (previous) Object.defineProperty(Object.prototype, 'containmentRole', previous)
      else delete (Object.prototype as { containmentRole?: unknown }).containmentRole
    }
  })
})
