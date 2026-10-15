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

  it('repeats validation and projection byte-stably without mutating the packet', () => {
    const input = packet({ containmentRole: 'secured', phase: 'extraction' })
    const snapshot = JSON.stringify(input)
    expect(JSON.stringify(validate(input))).toBe(JSON.stringify(validate(input)))
    expect(JSON.stringify(project(input))).toBe(JSON.stringify(project(input)))
    expect(JSON.stringify(input)).toBe(snapshot)
    expect(validate(input).request).toEqual(input)
  })
})
